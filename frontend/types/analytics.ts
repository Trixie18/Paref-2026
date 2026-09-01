export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface CategorySales {
  category: string;
  revenue: number;
}

export interface ProductSales {
  product_id: string;
  name: string;
  quantity_sold: number;
  revenue: number;
}

export interface BundleSales {
  bundle_id: string;
  name: string;
  quantity_sold: number;
  revenue: number;
}

export interface InventoryStatusItem {
  product_id: string;
  name: string;
  variant: string | null;
  stock: number;
}

export interface Dashboard {
  registered_parents: number;
  total_players: number;
  total_orders: number;
  total_revenue: number;
  paid_revenue: number;
  pending_payments: number;
  pending_fulfillment: number;
  total_items_sold: number;
  revenue_over_time: TimeSeriesPoint[];
  orders_over_time: TimeSeriesPoint[];
  sales_by_category: CategorySales[];
  top_products: ProductSales[];
  bundle_sales: BundleSales[];
  inventory_status: InventoryStatusItem[];
}
