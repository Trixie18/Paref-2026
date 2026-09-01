"""Typed application errors and their mapping to HTTP responses.

Business logic raises these instead of HTTPException directly, so services
stay framework-agnostic. main.py registers the handlers that translate them.
"""


class AppError(Exception):
    status_code = 400

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class NotFoundError(AppError):
    status_code = 404


class ValidationError(AppError):
    status_code = 422


class UnauthorizedError(AppError):
    status_code = 401


class ForbiddenError(AppError):
    status_code = 403


class DuplicateError(AppError):
    status_code = 409


class OutOfStockError(AppError):
    status_code = 409


class AlreadyClaimedError(AppError):
    status_code = 409


class ConflictError(AppError):
    status_code = 409
