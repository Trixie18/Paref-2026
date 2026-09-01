from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.models import User
from app.repositories import Repository, get_repository
from app.schemas.product import ProductResponse
from app.services import product_service

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=list[ProductResponse])
def list_products(_user: Annotated[User, Depends(get_current_user)], repo: Annotated[Repository, Depends(get_repository)]):
    return product_service.list_products(repo, include_inactive=False)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: str,
    _user: Annotated[User, Depends(get_current_user)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    return product_service.get_product(repo, product_id)
