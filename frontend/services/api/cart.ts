import { apiFetch } from "./http";
import { CartCalculationResponse, CartLineInput } from "@/types";

export function calculateCart(lines: CartLineInput[]): Promise<CartCalculationResponse> {
  return apiFetch<CartCalculationResponse>("/api/cart/calculate", { method: "POST", body: lines });
}
