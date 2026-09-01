from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import require_admin_role
from app.models import Admin
from app.repositories import Repository, get_repository
from app.schemas.bundle import BundleCreateRequest, BundleResponse, BundleUpdateRequest
from app.services import audit_service, bundle_service

router = APIRouter(prefix="/api/admin/bundles", tags=["admin"])


@router.get("", response_model=list[BundleResponse])
def list_bundles(_admin: Annotated[Admin, Depends(require_admin_role)], repo: Annotated[Repository, Depends(get_repository)]):
    return bundle_service.list_bundles(repo, include_inactive=True)


@router.post("", response_model=BundleResponse, status_code=201)
def create_bundle(
    req: BundleCreateRequest,
    admin: Annotated[Admin, Depends(require_admin_role)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    bundle = bundle_service.create_bundle(repo, req)
    audit_service.record(repo, admin, "CREATE_BUNDLE", "Bundle", req.bundle_id)
    return bundle


@router.put("/{bundle_id}", response_model=BundleResponse)
def update_bundle(
    bundle_id: str,
    req: BundleUpdateRequest,
    admin: Annotated[Admin, Depends(require_admin_role)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    bundle = bundle_service.update_bundle(repo, bundle_id, req)
    audit_service.record(repo, admin, "UPDATE_BUNDLE", "Bundle", bundle_id, str(req.model_dump(exclude_unset=True)))
    return bundle
