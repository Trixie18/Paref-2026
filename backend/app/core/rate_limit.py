"""Minimal in-process rate limiter.

This is a "reasonable safeguard" rather than a production-grade solution:
it tracks request counts per client IP in memory, so it resets on restart
and does not coordinate across multiple backend processes. That is an
acceptable tradeoff for this MVP's single-worker deployment (see README);
a real deployment fronted by multiple workers or instances should use a
shared store (e.g. Redis) instead.
"""

import threading
import time

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 120):
        super().__init__(app)
        self._limit = requests_per_minute
        self._lock = threading.Lock()
        self._window_start: dict[str, float] = {}
        self._counts: dict[str, int] = {}

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time.monotonic()

        with self._lock:
            window_start = self._window_start.get(client_ip, now)
            if now - window_start >= 60:
                window_start = now
                self._counts[client_ip] = 0
            self._counts[client_ip] = self._counts.get(client_ip, 0) + 1
            self._window_start[client_ip] = window_start
            count = self._counts[client_ip]

        if count > self._limit:
            return JSONResponse(status_code=429, content={"detail": "Too many requests, please slow down."})

        return await call_next(request)
