from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.models import User
from app.repositories import Repository, get_repository
from app.schemas.cart import CartCalculationResponse, CartLineInput
from app.services import cart_service

router = APIRouter(prefix="/api/cart", tags=["cart"])


@router.post("/calculate", response_model=CartCalculationResponse)
def calculate_cart(
    lines: list[CartLineInput],
    _user: Annotated[User, Depends(get_current_user)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    """Lets the frontend show authoritative prices/line totals in the cart
    without duplicating pricing logic client-side. Checkout re-validates
    everything again regardless — this is a preview only."""
    resolved = cart_service.resolve_cart_lines(repo, lines)
    return cart_service.to_calculation_response(resolved)
