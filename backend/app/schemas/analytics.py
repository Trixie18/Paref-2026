from pydantic import BaseModel


class TimeSeriesPoint(BaseModel):
    date: str
    value: float


class CategorySales(BaseModel):
    category: str
    revenue: float


class ProductSales(BaseModel):
    product_id: str
    name: str
    quantity_sold: int
    revenue: float


class BundleSales(BaseModel):
    bundle_id: str
    name: str
    quantity_sold: int
    revenue: float


class InventoryStatusItem(BaseModel):
    product_id: str
    name: str
    variant: str | None = None
    stock: int


class DashboardResponse(BaseModel):
    registered_parents: int
    total_players: int
    total_orders: int
    total_revenue: float
    paid_revenue: float
    pending_payments: int
    pending_fulfillment: int
    total_items_sold: int
    revenue_over_time: list[TimeSeriesPoint]
    orders_over_time: list[TimeSeriesPoint]
    sales_by_category: list[CategorySales]
    top_products: list[ProductSales]
    bundle_sales: list[BundleSales]
    inventory_status: list[InventoryStatusItem]
