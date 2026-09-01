from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import get_current_admin
from app.models import Admin
from app.repositories import Repository, get_repository
from app.schemas.admin import AdminOrderListItem, OrderStatusUpdateRequest
from app.schemas.order import OrderResponse
from app.services import admin_service

router = APIRouter(prefix="/api/admin/orders", tags=["admin"])


@router.get("", response_model=list[AdminOrderListItem])
def list_orders(
    _admin: Annotated[Admin, Depends(get_current_admin)],
    repo: Annotated[Repository, Depends(get_repository)],
    payment_status: Optional[str] = Query(default=None),
    fulfillment_status: Optional[str] = Query(default=None),
):
    return admin_service.list_orders(repo, payment_status=payment_status, fulfillment_status=fulfillment_status)


@router.get("/search", response_model=list[OrderResponse])
def search_orders(
    _admin: Annotated[Admin, Depends(get_current_admin)],
    repo: Annotated[Repository, Depends(get_repository)],
    q: str = Query(..., min_length=1, description="Order ID, parent name, email, or mobile number"),
):
    return admin_service.search_orders(repo, q)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: str,
    _admin: Annotated[Admin, Depends(get_current_admin)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    return admin_service.get_order_detail(repo, order_id)


@router.put("/{order_id}", response_model=OrderResponse)
def update_order_status(
    order_id: str,
    req: OrderStatusUpdateRequest,
    admin: Annotated[Admin, Depends(get_current_admin)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    """Both ADMIN and STAFF may call this — payment/fulfillment status
    updates and marking orders READY/CLAIMED are explicitly permitted for
    STAFF. Product and bundle management are the only ADMIN-only areas."""
    return admin_service.update_order_status(repo, admin, order_id, req.payment_status, req.fulfillment_status)
