from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.models import User
from app.repositories import Repository, get_repository
from app.schemas.order import CheckoutRequest, OrderResponse
from app.services import order_service

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("", response_model=OrderResponse, status_code=201)
def checkout(
    req: CheckoutRequest,
    user: Annotated[User, Depends(get_current_user)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    return order_service.checkout(repo, user, req)


@router.get("", response_model=list[OrderResponse])
def list_orders(user: Annotated[User, Depends(get_current_user)], repo: Annotated[Repository, Depends(get_repository)]):
    return order_service.list_orders_for_user(repo, user)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: str,
    user: Annotated[User, Depends(get_current_user)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    return order_service.get_order_for_user(repo, user, order_id)
