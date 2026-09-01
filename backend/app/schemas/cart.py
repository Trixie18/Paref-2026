from pydantic import BaseModel, field_validator


class CartLineInput(BaseModel):
    """One requested line: either a product_id (a shirt, an individual item)
    or a bundle_id, never both. `variant` is required for shirts."""

    product_id: str | None = None
    bundle_id: str | None = None
    quantity: int
    variant: str | None = None

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Quantity must be at least 1")
        return v


class CartLineResult(BaseModel):
    product_id: str | None = None
    bundle_id: str | None = None
    name: str
    variant: str | None = None
    quantity: int
    unit_price: float
    subtotal: float


class CartCalculationResponse(BaseModel):
    lines: list[CartLineResult]
    total_amount: float
