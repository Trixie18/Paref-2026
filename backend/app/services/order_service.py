"""Owns the full checkout flow: validating the cart, resolving bundles,
checking and reserving inventory, calculating the authoritative total, and
persisting the order and its line items. No API route should touch
Products/Bundles/Orders directly — it all goes through here so the rules
in section 17 of the spec (never trust client-submitted price, total,
inventory, or user id) are enforced in exactly one place.
"""

import threading
from datetime import datetime, timezone

from app.core.config import get_settings
from app.core.errors import NotFoundError
from app.models import Order, OrderItem, User
from app.repositories import Repository
from app.services import cart_service, inventory_service
from app.schemas.order import CheckoutRequest, OrderItemResponse, OrderResponse

# Guards the idempotency cache and serializes checkout across requests for
# the same idempotency key. Reserving inventory is already made atomic by
# inventory_service's own lock; this additionally prevents two rapid
# duplicate submits (e.g. a double-tap on "Place order") from both getting
# past the idempotency check before either has written its order.
_checkout_lock = threading.RLock()
_idempotency_cache: dict[str, str] = {}  # f"{user_id}:{key}" -> order_id


def order_to_response(repo: Repository, order: Order) -> OrderResponse:
    items = repo.get_order_items(order.order_id)
    user = repo.get_user(order.user_id)
    return OrderResponse(
        **order.model_dump(),
        parent_name=user.name if user else "Unknown",
        items=[OrderItemResponse(**item.model_dump()) for item in items],
    )


def checkout(repo: Repository, user: User, req: CheckoutRequest) -> OrderResponse:
    settings = get_settings()

    with _checkout_lock:
        if req.idempotency_key:
            cache_key = f"{user.user_id}:{req.idempotency_key}"
            existing_order_id = _idempotency_cache.get(cache_key)
            if existing_order_id:
                existing = repo.get_order(existing_order_id)
                if existing:
                    return order_to_response(repo, existing)

        resolved_lines = cart_service.resolve_cart_lines(repo, req.items)
        requirements = inventory_service.calculate_requirements(resolved_lines)

        # Raises OutOfStockError (no mutation) if anything is short, else
        # decrements stock immediately. See inventory_service for why the
        # decrement happens before the order row is written.
        inventory_service.validate_and_reserve(repo, requirements)

        total_amount = round(sum(line.subtotal for line in resolved_lines), 2)
        now = datetime.now(timezone.utc)
        order_id = repo.next_order_id(settings.EVENT_YEAR)

        order = repo.create_order(
            Order(
                order_id=order_id,
                user_id=user.user_id,
                order_date=now,
                total_amount=total_amount,
                payment_method=req.payment_method,
                payment_status="PENDING",
                fulfillment_status="PENDING",
                notes=req.notes,
                created_at=now,
                updated_at=now,
                claimed_at=None,
                claimed_by="",
            )
        )

        for line in resolved_lines:
            repo.create_order_item(
                OrderItem(
                    order_item_id="",
                    order_id=order.order_id,
                    product_id=line.id,
                    product_name=line.name,
                    quantity=line.quantity,
                    unit_price=line.unit_price,
                    subtotal=line.subtotal,
                    variant=line.variant or "",
                    bundle_id=line.id if line.kind == "bundle" else "",
                )
            )

        if req.idempotency_key:
            _idempotency_cache[f"{user.user_id}:{req.idempotency_key}"] = order.order_id

        return order_to_response(repo, order)


def list_orders_for_user(repo: Repository, user: User) -> list[OrderResponse]:
    return [order_to_response(repo, o) for o in repo.get_orders(user_id=user.user_id)]


def get_order_for_user(repo: Repository, user: User, order_id: str) -> OrderResponse:
    order = repo.get_order(order_id)
    if order is None or order.user_id != user.user_id:
        raise NotFoundError(f"Order {order_id} not found")
    return order_to_response(repo, order)
