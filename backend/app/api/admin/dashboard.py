from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_admin, require_admin_role
from app.models import Admin
from app.repositories import Repository, get_repository
from app.schemas.analytics import DashboardResponse
from app.schemas.auth import AdminProfileResponse
from app.services import analytics_service

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/profile", response_model=AdminProfileResponse)
def get_admin_profile(admin: Annotated[Admin, Depends(get_current_admin)]):
    """The admin-app equivalent of GET /api/auth/profile — lets the
    frontend learn who's signed in and whether they're ADMIN or STAFF in
    one call, instead of inferring role from which other endpoints 403."""
    return AdminProfileResponse(**admin.model_dump())


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    _admin: Annotated[Admin, Depends(require_admin_role)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    return analytics_service.build_dashboard(repo)
