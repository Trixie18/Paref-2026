from pydantic import BaseModel


class BundleItemResponse(BaseModel):
    product_id: str
    product_name: str
    quantity: int


class BundleResponse(BaseModel):
    bundle_id: str
    name: str
    description: str
    price: float
    active: bool
    items: list[BundleItemResponse]
    individual_total: float | None = None
    savings: float | None = None


class BundleItemInput(BaseModel):
    product_id: str
    quantity: int


class BundleCreateRequest(BaseModel):
    bundle_id: str
    name: str
    description: str = ""
    price: float
    items: list[BundleItemInput]


class BundleUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    price: float | None = None
    active: bool | None = None
    items: list[BundleItemInput] | None = None
