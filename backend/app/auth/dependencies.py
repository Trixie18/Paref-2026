from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.verifier import AuthIdentity, TokenVerifier
from app.core.config import get_settings
from app.core.errors import ForbiddenError, UnauthorizedError
from app.models import Admin, User
from app.repositories import Repository, get_repository

_bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache
def get_token_verifier() -> TokenVerifier:
    settings = get_settings()
    if settings.AUTH_BACKEND == "firebase":
        from app.auth.firebase import FirebaseVerifier

        return FirebaseVerifier(
            settings.FIREBASE_PROJECT_ID, settings.FIREBASE_CLIENT_EMAIL, settings.FIREBASE_PRIVATE_KEY
        )
    from app.auth.dev import DevVerifier

    return DevVerifier()


def get_auth_identity(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
    verifier: Annotated[TokenVerifier, Depends(get_token_verifier)],
) -> AuthIdentity:
    if credentials is None or not credentials.credentials:
        raise UnauthorizedError("Missing Authorization header")
    return verifier.verify(credentials.credentials)


def get_current_user(
    identity: Annotated[AuthIdentity, Depends(get_auth_identity)],
    repo: Annotated[Repository, Depends(get_repository)],
) -> User:
    user = repo.get_user_by_firebase_uid(identity.uid)
    if user is None:
        raise UnauthorizedError("No profile exists for this account yet")
    if not user.active:
        raise ForbiddenError("This account has been deactivated")
    return user


def get_current_admin(
    identity: Annotated[AuthIdentity, Depends(get_auth_identity)],
    repo: Annotated[Repository, Depends(get_repository)],
) -> Admin:
    admin = repo.get_admin_by_firebase_uid(identity.uid)
    if admin is None:
        raise ForbiddenError("This account is not an administrator")
    if not admin.active:
        raise ForbiddenError("This administrator account has been deactivated")
    return admin


def require_admin_role(admin: Annotated[Admin, Depends(get_current_admin)]) -> Admin:
    """Use on routes that ADMIN may access but STAFF may not (product/bundle
    management, analytics). Route-level enforcement — never rely on the
    frontend hiding these routes."""
    if admin.role != "ADMIN":
        raise ForbiddenError("This action requires the ADMIN role")
    return admin
