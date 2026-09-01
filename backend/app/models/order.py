from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

PaymentMethod = Literal["GCASH", "BANK_TRANSFER", "CASH_AT_EVENT"]
PaymentStatus = Literal["PENDING", "PAID", "FAILED", "CANCELLED"]
FulfillmentStatus = Literal["PENDING", "READY", "CLAIMED", "CANCELLED"]


class Order(BaseModel):
    """Mirrors a row in the Orders sheet."""

    order_id: str
    user_id: str
    order_date: datetime
    total_amount: float
    payment_method: PaymentMethod
    payment_status: PaymentStatus = "PENDING"
    fulfillment_status: FulfillmentStatus = "PENDING"
    notes: str = ""
    created_at: datetime
    updated_at: datetime
    claimed_at: Optional[datetime] = None
    claimed_by: str = ""


class OrderItem(BaseModel):
    """Mirrors a row in the Order_Items sheet.

    product_name and unit_price are captured at purchase time so historical
    orders stay accurate even if the product is later renamed or repriced.
    bundle_id is set when this line was generated from resolving a bundle
    into its component products; empty for items purchased directly.
    """

    order_item_id: str
    order_id: str
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    subtotal: float
    variant: str = ""
    bundle_id: str = ""
