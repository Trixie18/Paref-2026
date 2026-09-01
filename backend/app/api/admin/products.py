from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import require_admin_role
from app.models import Admin
from app.repositories import Repository, get_repository
from app.schemas.product import ProductCreateRequest, ProductResponse, ProductUpdateRequest, VariantUpsertRequest
from app.services import audit_service, product_service

router = APIRouter(prefix="/api/admin/products", tags=["admin"])


@router.get("", response_model=list[ProductResponse])
def list_products(_admin: Annotated[Admin, Depends(require_admin_role)], repo: Annotated[Repository, Depends(get_repository)]):
    """Includes inactive products, unlike the public /api/products list, so
    admins can reactivate or review discontinued items."""
    return product_service.list_products(repo, include_inactive=True)


@router.post("", response_model=ProductResponse, status_code=201)
def create_product(
    req: ProductCreateRequest,
    admin: Annotated[Admin, Depends(require_admin_role)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    product = product_service.create_product(repo, req)
    audit_service.record(repo, admin, "CREATE_PRODUCT", "Product", req.product_id)
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: str,
    req: ProductUpdateRequest,
    admin: Annotated[Admin, Depends(require_admin_role)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    product = product_service.update_product(repo, product_id, req)
    audit_service.record(repo, admin, "UPDATE_PRODUCT", "Product", product_id, str(req.model_dump(exclude_unset=True)))
    return product


@router.delete("/{product_id}", response_model=ProductResponse)
def deactivate_product(
    product_id: str,
    admin: Annotated[Admin, Depends(require_admin_role)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    """Soft-delete only — products with historical orders are never removed."""
    product = product_service.deactivate_product(repo, product_id)
    audit_service.record(repo, admin, "DEACTIVATE_PRODUCT", "Product", product_id)
    return product


@router.put("/{product_id}/variants", response_model=ProductResponse)
def upsert_variant(
    product_id: str,
    req: VariantUpsertRequest,
    admin: Annotated[Admin, Depends(require_admin_role)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    product = product_service.upsert_variant(repo, product_id, req)
    audit_service.record(repo, admin, "UPSERT_VARIANT", "Product", product_id, f"{req.variant} -> stock {req.stock}")
    return product


@router.delete("/{product_id}/variants/{variant}", response_model=ProductResponse)
def delete_variant(
    product_id: str,
    variant: str,
    admin: Annotated[Admin, Depends(require_admin_role)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    product = product_service.delete_variant(repo, product_id, variant)
    audit_service.record(repo, admin, "DELETE_VARIANT", "Product", product_id, variant)
    return product
