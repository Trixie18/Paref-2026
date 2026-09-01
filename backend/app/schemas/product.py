from datetime import datetime

from pydantic import BaseModel


class ProductVariantResponse(BaseModel):
    variant: str
    stock: int


class ProductResponse(BaseModel):
    product_id: str
    name: str
    description: str
    category: str
    price: float
    stock: int
    active: bool
    image_url: str
    variant_required: bool
    variants: list[ProductVariantResponse] = []


class ProductCreateRequest(BaseModel):
    product_id: str
    name: str
    description: str = ""
    category: str
    price: float
    stock: int = 0
    image_url: str = ""
    variant_required: bool = False
    variants: list[ProductVariantResponse] = []


class ProductUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    price: float | None = None
    stock: int | None = None
    active: bool | None = None
    image_url: str | None = None
    variant_required: bool | None = None


class VariantUpsertRequest(BaseModel):
    variant: str
    stock: int
