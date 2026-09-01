export interface BundleItem {
  product_id: string;
  product_name: string;
  quantity: number;
}

export interface Bundle {
  bundle_id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
  items: BundleItem[];
  individual_total: number | null;
  savings: number | null;
}

export interface BundleItemInput {
  product_id: string;
  quantity: number;
}

export interface BundleCreateRequest {
  bundle_id: string;
  name: string;
  description?: string;
  price: number;
  items: BundleItemInput[];
}

export interface BundleUpdateRequest {
  name?: string;
  description?: string;
  price?: number;
  active?: boolean;
  items?: BundleItemInput[];
}
