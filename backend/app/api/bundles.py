from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.models import User
from app.repositories import Repository, get_repository
from app.schemas.bundle import BundleResponse
from app.services import bundle_service

router = APIRouter(prefix="/api/bundles", tags=["bundles"])


@router.get("", response_model=list[BundleResponse])
def list_bundles(_user: Annotated[User, Depends(get_current_user)], repo: Annotated[Repository, Depends(get_repository)]):
    return bundle_service.list_bundles(repo, include_inactive=False)


@router.get("/{bundle_id}", response_model=BundleResponse)
def get_bundle(
    bundle_id: str,
    _user: Annotated[User, Depends(get_current_user)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    return bundle_service.get_bundle(repo, bundle_id)
