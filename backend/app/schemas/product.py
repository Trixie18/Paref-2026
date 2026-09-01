from datetime import datetime

from pydantic import BaseModel, Field


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


class VariantInput(BaseModel):
    variant: str
    stock: int = Field(ge=0)


class ProductCreateRequest(BaseModel):
    product_id: str
    name: str
    description: str = ""
    category: str
    price: float = Field(ge=0)
    stock: int = Field(default=0, ge=0)
    image_url: str = ""
    variant_required: bool = False
    variants: list[VariantInput] = []


class ProductUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    price: float | None = Field(default=None, ge=0)
    stock: int | None = Field(default=None, ge=0)
    active: bool | None = None
    image_url: str | None = None
    variant_required: bool | None = None


class VariantUpsertRequest(BaseModel):
    variant: str
    stock: int = Field(ge=0)
