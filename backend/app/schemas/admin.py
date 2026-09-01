from datetime import datetime

from pydantic import BaseModel

from app.schemas.order import OrderResponse
from app.schemas.player import PlayerResponse


class AdminUserListItem(BaseModel):
    user_id: str
    name: str
    email: str
    phone: str
    created_at: datetime
    active: bool
    player_count: int
    order_count: int


class AdminUserDetailResponse(BaseModel):
    user: AdminUserListItem
    players: list[PlayerResponse]
    orders: list[OrderResponse]


class AdminOrderListItem(BaseModel):
    order_id: str
    user_id: str
    parent_name: str
    order_date: datetime
    total_amount: float
    payment_method: str
    payment_status: str
    fulfillment_status: str
    claimed_by: str


class OrderStatusUpdateRequest(BaseModel):
    payment_status: str | None = None
    fulfillment_status: str | None = None


class AuditLogEntryResponse(BaseModel):
    log_id: str
    timestamp: datetime
    admin_id: str
    admin_name: str
    action: str
    entity_type: str
    entity_id: str
    details: str
