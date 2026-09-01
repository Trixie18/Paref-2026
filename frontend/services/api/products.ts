import { apiFetch } from "./http";
import { Product } from "@/types";

export function listProducts(): Promise<Product[]> {
  return apiFetch<Product[]>("/api/products");
}

export function getProduct(productId: string): Promise<Product> {
  return apiFetch<Product>(`/api/products/${encodeURIComponent(productId)}`);
}
