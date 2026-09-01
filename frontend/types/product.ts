export type ProductCategory = "SHIRT" | "ITEM";

export interface ProductVariant {
  variant: string;
  stock: number;
}

export interface Product {
  product_id: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  stock: number;
  active: boolean;
  image_url: string;
  variant_required: boolean;
  variants: ProductVariant[];
}

export interface ProductCreateRequest {
  product_id: string;
  name: string;
  description?: string;
  category: ProductCategory;
  price: number;
  stock?: number;
  image_url?: string;
  variant_required?: boolean;
  variants?: ProductVariant[];
}

export interface ProductUpdateRequest {
  name?: string;
  description?: string;
  category?: ProductCategory;
  price?: number;
  stock?: number;
  active?: boolean;
  image_url?: string;
  variant_required?: boolean;
}

export interface VariantUpsertRequest {
  variant: string;
  stock: number;
}
