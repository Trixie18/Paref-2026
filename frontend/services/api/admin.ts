import { apiFetch } from "./http";
import {
  AdminOrderListItem,
  AdminProfile,
  AdminUserDetail,
  AdminUserListItem,
  AuditLogEntry,
  Bundle,
  BundleCreateRequest,
  BundleUpdateRequest,
  Dashboard,
  FulfillmentStatus,
  Order,
  OrderStatusUpdateRequest,
  PaymentStatus,
  Product,
  ProductCreateRequest,
  ProductUpdateRequest,
  VariantUpsertRequest,
} from "@/types";

// ---- Profile / Dashboard --------------------------------------------------
export function getAdminProfile(): Promise<AdminProfile> {
  return apiFetch<AdminProfile>("/api/admin/profile");
}

export function getDashboard(): Promise<Dashboard> {
  return apiFetch<Dashboard>("/api/admin/dashboard");
}

// ---- Users --------------------------------------------------------------
export function listUsers(): Promise<AdminUserListItem[]> {
  return apiFetch<AdminUserListItem[]>("/api/admin/users");
}

export function getUserDetail(userId: string): Promise<AdminUserDetail> {
  return apiFetch<AdminUserDetail>(`/api/admin/users/${encodeURIComponent(userId)}`);
}

// ---- Orders --------------------------------------------------------------
export function listAdminOrders(filters: {
  payment_status?: PaymentStatus;
  fulfillment_status?: FulfillmentStatus;
}): Promise<AdminOrderListItem[]> {
  return apiFetch<AdminOrderListItem[]>("/api/admin/orders", { params: filters });
}

export function searchAdminOrders(q: string): Promise<Order[]> {
  return apiFetch<Order[]>("/api/admin/orders/search", { params: { q } });
}

export function getAdminOrder(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/api/admin/orders/${encodeURIComponent(orderId)}`);
}

export function updateOrderStatus(orderId: string, req: OrderStatusUpdateRequest): Promise<Order> {
  return apiFetch<Order>(`/api/admin/orders/${encodeURIComponent(orderId)}`, { method: "PUT", body: req });
}

// ---- Products --------------------------------------------------------------
export function listAdminProducts(): Promise<Product[]> {
  return apiFetch<Product[]>("/api/admin/products");
}

export function createProduct(req: ProductCreateRequest): Promise<Product> {
  return apiFetch<Product>("/api/admin/products", { method: "POST", body: req });
}

export function updateProduct(productId: string, req: ProductUpdateRequest): Promise<Product> {
  return apiFetch<Product>(`/api/admin/products/${encodeURIComponent(productId)}`, { method: "PUT", body: req });
}

export function deactivateProduct(productId: string): Promise<Product> {
  return apiFetch<Product>(`/api/admin/products/${encodeURIComponent(productId)}`, { method: "DELETE" });
}

export function upsertProductVariant(productId: string, req: VariantUpsertRequest): Promise<Product> {
  return apiFetch<Product>(`/api/admin/products/${encodeURIComponent(productId)}/variants`, {
    method: "PUT",
    body: req,
  });
}

export function deleteProductVariant(productId: string, variant: string): Promise<Product> {
  return apiFetch<Product>(
    `/api/admin/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variant)}`,
    { method: "DELETE" }
  );
}

// ---- Bundles --------------------------------------------------------------
export function listAdminBundles(): Promise<Bundle[]> {
  return apiFetch<Bundle[]>("/api/admin/bundles");
}

export function createBundle(req: BundleCreateRequest): Promise<Bundle> {
  return apiFetch<Bundle>("/api/admin/bundles", { method: "POST", body: req });
}

export function updateBundle(bundleId: string, req: BundleUpdateRequest): Promise<Bundle> {
  return apiFetch<Bundle>(`/api/admin/bundles/${encodeURIComponent(bundleId)}`, { method: "PUT", body: req });
}

// ---- Audit log --------------------------------------------------------------
export function getAuditLog(): Promise<AuditLogEntry[]> {
  return apiFetch<AuditLogEntry[]>("/api/admin/audit-log");
}
