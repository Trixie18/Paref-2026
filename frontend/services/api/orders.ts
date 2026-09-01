import { apiFetch } from "./http";
import { CheckoutRequest, Order } from "@/types";

export function checkout(req: CheckoutRequest): Promise<Order> {
  return apiFetch<Order>("/api/orders", { method: "POST", body: req });
}

export function listOrders(): Promise<Order[]> {
  return apiFetch<Order[]>("/api/orders");
}

export function getOrder(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${encodeURIComponent(orderId)}`);
}
