from datetime import datetime, timezone
from typing import Optional

from app.core.errors import AlreadyClaimedError, NotFoundError, ValidationError
from app.models import Admin
from app.repositories import Repository
from app.schemas.admin import AdminOrderListItem, AdminUserDetailResponse, AdminUserListItem
from app.schemas.order import OrderResponse
from app.schemas.player import PlayerResponse
from app.services import audit_service, order_service

PAYMENT_STATUSES = {"PENDING", "PAID", "FAILED", "CANCELLED"}
FULFILLMENT_STATUSES = {"PENDING", "READY", "CLAIMED", "CANCELLED"}


def list_users(repo: Repository) -> list[AdminUserListItem]:
    users = repo.get_users()
    players = repo.get_players()
    orders = repo.get_orders()

    player_counts: dict[str, int] = {}
    for p in players:
        player_counts[p.user_id] = player_counts.get(p.user_id, 0) + 1
    order_counts: dict[str, int] = {}
    for o in orders:
        order_counts[o.user_id] = order_counts.get(o.user_id, 0) + 1

    return [
        AdminUserListItem(
            user_id=u.user_id, name=u.name, email=u.email, phone=u.phone,
            created_at=u.created_at, active=u.active,
            player_count=player_counts.get(u.user_id, 0),
            order_count=order_counts.get(u.user_id, 0),
        )
        for u in users
    ]


def get_user_detail(repo: Repository, user_id: str) -> AdminUserDetailResponse:
    user = repo.get_user(user_id)
    if user is None:
        raise NotFoundError(f"User {user_id} not found")

    players = repo.get_players(user_id=user_id)
    orders = repo.get_orders(user_id=user_id)

    return AdminUserDetailResponse(
        user=AdminUserListItem(
            user_id=user.user_id, name=user.name, email=user.email, phone=user.phone,
            created_at=user.created_at, active=user.active,
            player_count=len(players), order_count=len(orders),
        ),
        players=[PlayerResponse(**p.model_dump()) for p in players],
        orders=[order_service.order_to_response(repo, o) for o in orders],
    )


def list_orders(
    repo: Repository,
    payment_status: Optional[str] = None,
    fulfillment_status: Optional[str] = None,
) -> list[AdminOrderListItem]:
    orders = repo.get_orders()
    if payment_status:
        orders = [o for o in orders if o.payment_status == payment_status]
    if fulfillment_status:
        orders = [o for o in orders if o.fulfillment_status == fulfillment_status]

    users_by_id = {u.user_id: u for u in repo.get_users()}
    return [
        AdminOrderListItem(
            order_id=o.order_id, user_id=o.user_id,
            parent_name=users_by_id[o.user_id].name if o.user_id in users_by_id else "Unknown",
            order_date=o.order_date, total_amount=o.total_amount, payment_method=o.payment_method,
            payment_status=o.payment_status, fulfillment_status=o.fulfillment_status, claimed_by=o.claimed_by,
        )
        for o in orders
    ]


def search_orders(repo: Repository, query: str) -> list[OrderResponse]:
    """Order lookup for fulfillment staff: matches order id exactly, or a
    case-insensitive substring of the parent's name, email, or phone."""
    query = query.strip()
    if not query:
        return []
    query_lower = query.lower()

    users_by_id = {u.user_id: u for u in repo.get_users()}
    matching_user_ids = {
        u.user_id
        for u in users_by_id.values()
        if query_lower in u.name.lower() or query_lower in u.email.lower() or query_lower in u.phone.lower()
    }

    orders = repo.get_orders()
    matches = [o for o in orders if o.order_id == query or o.user_id in matching_user_ids]
    return [order_service.order_to_response(repo, o) for o in matches]


def get_order_detail(repo: Repository, order_id: str) -> OrderResponse:
    order = repo.get_order(order_id)
    if order is None:
        raise NotFoundError(f"Order {order_id} not found")
    return order_service.order_to_response(repo, order)


def update_order_status(
    repo: Repository,
    admin: Admin,
    order_id: str,
    payment_status: Optional[str],
    fulfillment_status: Optional[str],
) -> OrderResponse:
    order = repo.get_order(order_id)
    if order is None:
        raise NotFoundError(f"Order {order_id} not found")

    fields: dict = {}
    details = []

    if payment_status is not None:
        if payment_status not in PAYMENT_STATUSES:
            raise ValidationError(f"payment_status must be one of {sorted(PAYMENT_STATUSES)}")
        fields["payment_status"] = payment_status
        details.append(f"payment_status -> {payment_status}")

    if fulfillment_status is not None:
        if fulfillment_status not in FULFILLMENT_STATUSES:
            raise ValidationError(f"fulfillment_status must be one of {sorted(FULFILLMENT_STATUSES)}")
        if fulfillment_status == "CLAIMED":
            if order.fulfillment_status == "CLAIMED":
                raise AlreadyClaimedError(
                    f"Order {order_id} was already claimed"
                    + (f" by {order.claimed_by}" if order.claimed_by else "")
                )
            fields["claimed_at"] = datetime.now(timezone.utc)
            fields["claimed_by"] = admin.name
        fields["fulfillment_status"] = fulfillment_status
        details.append(f"fulfillment_status -> {fulfillment_status}")

    if not fields:
        return order_service.order_to_response(repo, order)

    updated = repo.update_order(order_id, **fields)
    audit_service.record(repo, admin, "UPDATE_ORDER_STATUS", "Order", order_id, "; ".join(details))
    return order_service.order_to_response(repo, updated)
