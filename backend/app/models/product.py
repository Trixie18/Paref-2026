from datetime import datetime
from typing import Literal

from pydantic import BaseModel

ProductCategory = Literal["SHIRT", "ITEM"]


class Product(BaseModel):
    """Mirrors a row in the Products sheet.

    Shirts (variant_required=True) track stock per size in Product_Variants;
    `stock` on the product row itself is unused for those and should be
    ignored in favor of the sum of variant stocks.
    """

    product_id: str
    name: str
    description: str
    category: ProductCategory
    price: float
    stock: int
    active: bool = True
    image_url: str = ""
    variant_required: bool = False
    created_at: datetime
    updated_at: datetime


class ProductVariant(BaseModel):
    """Mirrors a row in the Product_Variants sheet (e.g. a shirt size)."""

    product_id: str
    variant: str
    stock: int
