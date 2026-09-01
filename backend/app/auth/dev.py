"""Development-only token verifier used when AUTH_BACKEND=dev.

Accepts tokens of the form "dev:<uid>" or "dev:<uid>:<email>" so the
backend and its test suite can be exercised without real Firebase
credentials. main.py refuses to start with this backend unless it also
detects a non-production-looking environment is expected; it is the
operator's responsibility to never set AUTH_BACKEND=dev in production.
"""

from app.auth.verifier import AuthIdentity, TokenVerifier
from app.core.errors import UnauthorizedError


class DevVerifier(TokenVerifier):
    def verify(self, token: str) -> AuthIdentity:
        if not token.startswith("dev:"):
            raise UnauthorizedError("Dev auth tokens must look like 'dev:<uid>'")
        parts = token.split(":")
        uid = parts[1] if len(parts) > 1 and parts[1] else ""
        if not uid:
            raise UnauthorizedError("Dev auth token is missing a uid")
        email = parts[2] if len(parts) > 2 else f"{uid}@example.test"
        return AuthIdentity(uid=uid, email=email, name=uid)
