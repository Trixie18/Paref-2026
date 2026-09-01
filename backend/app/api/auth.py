from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import get_auth_identity, get_current_user
from app.auth.verifier import AuthIdentity
from app.models import User
from app.repositories import Repository, get_repository
from app.schemas.auth import ProfileResponse, ProfileUpdateRequest, RegisterRequest
from app.services import user_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _to_profile(user: User) -> ProfileResponse:
    return ProfileResponse(**user.model_dump())


@router.post("/register", response_model=ProfileResponse, status_code=201)
def register(
    req: RegisterRequest,
    identity: Annotated[AuthIdentity, Depends(get_auth_identity)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    """Creates the Users sheet row for a Firebase account the frontend just
    created. Call this immediately after Firebase sign-up succeeds."""
    user = user_service.register(repo, identity, req)
    return _to_profile(user)


@router.get("/profile", response_model=ProfileResponse)
def get_profile(user: Annotated[User, Depends(get_current_user)]):
    return _to_profile(user)


@router.put("/profile", response_model=ProfileResponse)
def update_profile(
    req: ProfileUpdateRequest,
    user: Annotated[User, Depends(get_current_user)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    updated = user_service.update_profile(repo, user, req)
    return _to_profile(updated)
