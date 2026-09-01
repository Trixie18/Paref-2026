from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import require_admin_role
from app.models import Admin
from app.repositories import Repository, get_repository
from app.schemas.admin import AdminUserDetailResponse, AdminUserListItem
from app.services import admin_service

router = APIRouter(prefix="/api/admin/users", tags=["admin"])


@router.get("", response_model=list[AdminUserListItem])
def list_users(_admin: Annotated[Admin, Depends(require_admin_role)], repo: Annotated[Repository, Depends(get_repository)]):
    return admin_service.list_users(repo)


@router.get("/{user_id}", response_model=AdminUserDetailResponse)
def get_user_detail(
    user_id: str,
    _admin: Annotated[Admin, Depends(require_admin_role)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    return admin_service.get_user_detail(repo, user_id)
