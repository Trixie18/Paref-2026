from datetime import datetime

from pydantic import BaseModel


class Bundle(BaseModel):
    """Mirrors a row in the Bundles sheet."""

    bundle_id: str
    name: str
    description: str
    price: float
    active: bool = True
    created_at: datetime
    updated_at: datetime


class BundleItem(BaseModel):
    """Mirrors a row in the Bundle_Items sheet: one component of a bundle."""

    bundle_id: str
    product_id: str
    quantity: int
