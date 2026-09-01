from datetime import datetime

from pydantic import BaseModel, field_validator

from app.schemas.cart import CartLineInput

PAYMENT_METHODS = {"GCASH", "BANK_TRANSFER", "CASH_AT_EVENT"}


class CheckoutRequest(BaseModel):
    items: list[CartLineInput]
    parent_name: str
    contact_number: str
    payment_method: str
    notes: str = ""
    idempotency_key: str | None = None

    @field_validator("items")
    @classmethod
    def items_not_empty(cls, v: list[CartLineInput]) -> list[CartLineInput]:
        if not v:
            raise ValueError("Cart is empty")
        return v

    @field_validator("payment_method")
    @classmethod
    def payment_method_valid(cls, v: str) -> str:
        upper = v.strip().upper()
        if upper not in PAYMENT_METHODS:
            raise ValueError(f"Payment method must be one of {sorted(PAYMENT_METHODS)}")
        return upper

    @field_validator("parent_name", "contact_number")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("This field is required")
        return v.strip()


class OrderItemResponse(BaseModel):
    order_item_id: str
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    subtotal: float
    variant: str
    bundle_id: str


class OrderResponse(BaseModel):
    order_id: str
    user_id: str
    parent_name: str
    order_date: datetime
    total_amount: float
    payment_method: str
    payment_status: str
    fulfillment_status: str
    notes: str
    created_at: datetime
    updated_at: datetime
    claimed_at: datetime | None
    claimed_by: str
    items: list[OrderItemResponse]
