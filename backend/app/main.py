import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from app.api import admin, auth, bundles, cart, orders, players, products
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.rate_limit import RateLimitMiddleware
from app.repositories import get_repository

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("paref")

# This backend has, more than once, ended up started with a system/conda
# Python instead of its own venv (typically: a fresh terminal running
# `uvicorn app.main:app` without `source venv/bin/activate` first). That's
# not just a style issue — it silently swaps in whatever dependency
# versions happen to be installed system-wide, and a mismatched urllib3 in
# particular has caused real, intermittent 500s on Sheets API calls
# ("NoneType has no attribute 'sendall'" from urllib3's experimental HTTP/2
# backend) that were painful to trace back to "wrong interpreter". Fail
# loudly at startup instead of letting that reach a real request.
_expected_venv = (Path(__file__).resolve().parents[1] / "venv").resolve()
if Path(sys.prefix).resolve() != _expected_venv:
    sys.exit(
        "\nRefusing to start: this backend is running under\n"
        f"  {sys.prefix}\n"
        "instead of its own virtual environment at\n"
        f"  {_expected_venv}\n\n"
        "Run it via:\n"
        "  cd backend && source venv/bin/activate && uvicorn app.main:app --reload\n\n"
        "(A mismatched Python environment here has previously caused real, hard-to-"
        "diagnose bugs — a different urllib3 version intermittently crashed Google "
        "Sheets API calls.)\n"
    )

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if settings.REPOSITORY_BACKEND == "google_sheets":
        # Constructing GoogleSheetsRepository does the Google OAuth handshake
        # plus one existence/header check per sheet (10 sheets) — several
        # real seconds the first time it happens. Pay that cost here, at
        # boot, instead of letting it block whichever request happens to
        # arrive first (which in practice was making a user's first admin
        # login of a session look hung).
        logger.info("Warming up Google Sheets connection...")
        get_repository()
        logger.info("Google Sheets connection ready.")

    if settings.SEED_ON_STARTUP and settings.REPOSITORY_BACKEND == "memory":
        from seed.seed_data import seed

        seed(get_repository())
    yield


app = FastAPI(
    title="Paref Football Event API",
    description=(
        "Backend for the football event registration & shop MVP. "
        "Google Sheets is the data store; see /google-sheets/README.md "
        "for the schema and /README.md for local setup."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware, requests_per_minute=settings.RATE_LIMIT_PER_MINUTE)


@app.exception_handler(AppError)
def handle_app_error(_request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.exception_handler(Exception)
def handle_unexpected_error(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error while processing %s %s", _request.method, _request.url.path)
    return JSONResponse(status_code=500, content={"detail": "An unexpected error occurred. Please try again."})


app.include_router(auth.router)
app.include_router(players.router)
app.include_router(products.router)
app.include_router(bundles.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(admin.router)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "repository_backend": settings.REPOSITORY_BACKEND, "auth_backend": settings.AUTH_BACKEND}
