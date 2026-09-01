// Backend API client - one function per endpoint. Every function attaches
// the current bearer token (via auth.js's getIdToken) and throws an
// ApiError carrying the backend's own `detail` message on any non-2xx
// response, so pages can show that message directly in an error banner.
//
// This file never computes a price, total, or permission itself - it only
// passes through whatever the backend returns. See the API contract in
// frontend-static/README.md for the full endpoint list.

import { getIdToken } from "./auth.js";

export const API_BASE_URL = "http://localhost:8000";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiFetch(path, opts = {}) {
  const { method = "GET", body, params } = opts;

  let url = `${API_BASE_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") qs.set(key, value);
    }
    const qsStr = qs.toString();
    if (qsStr) url += `?${qsStr}`;
  }

  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = await getIdToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }

  if (res.status === 204) return undefined;

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON body; leave data null.
    }
  }

  if (!res.ok) {
    const detail = data && typeof data === "object" && "detail" in data ? String(data.detail) : `Request failed (${res.status})`;
    throw new ApiError(res.status, detail);
  }

  return data;
}

export function getErrorMessage(err) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

// Exposed for auth.js's registerBackendProfile helper and for the Node
// e2e verification script.
export { apiFetch };

// ---- Auth / profile --------------------------------------------------

export function registerProfile(req) {
  return apiFetch("/api/auth/register", { method: "POST", body: req });
}
export function getProfile() {
  return apiFetch("/api/auth/profile");
}
export function updateProfile(req) {
  return apiFetch("/api/auth/profile", { method: "PUT", body: req });
}

// ---- Players ------------------------------------------------------------

export function listPlayers() {
  return apiFetch("/api/players");
}
export function createPlayer(req) {
  return apiFetch("/api/players", { method: "POST", body: req });
}
export function getPlayer(playerId) {
  return apiFetch(`/api/players/${encodeURIComponent(playerId)}`);
}
export function updatePlayer(playerId, req) {
  return apiFetch(`/api/players/${encodeURIComponent(playerId)}`, { method: "PUT", body: req });
}

// ---- Products / bundles --------------------------------------------------

export function listProducts() {
  return apiFetch("/api/products");
}
export function getProduct(productId) {
  return apiFetch(`/api/products/${encodeURIComponent(productId)}`);
}
export function listBundles() {
  return apiFetch("/api/bundles");
}
export function getBundle(bundleId) {
  return apiFetch(`/api/bundles/${encodeURIComponent(bundleId)}`);
}

// ---- Cart / checkout / orders --------------------------------------------

export function calculateCart(lines) {
  return apiFetch("/api/cart/calculate", { method: "POST", body: lines });
}
export function checkout(req) {
  return apiFetch("/api/orders", { method: "POST", body: req });
}
export function listOrders() {
  return apiFetch("/api/orders");
}
export function getOrder(orderId) {
  return apiFetch(`/api/orders/${encodeURIComponent(orderId)}`);
}

// ---- Admin / staff ---------------------------------------------------------

export function getAdminProfile() {
  return apiFetch("/api/admin/profile");
}
export function getDashboard() {
  return apiFetch("/api/admin/dashboard");
}
export function listUsers() {
  return apiFetch("/api/admin/users");
}
export function getUserDetail(userId) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}`);
}
export function listAdminOrders(filters = {}) {
  return apiFetch("/api/admin/orders", { params: filters });
}
export function searchAdminOrders(q) {
  return apiFetch("/api/admin/orders/search", { params: { q } });
}
export function getAdminOrder(orderId) {
  return apiFetch(`/api/admin/orders/${encodeURIComponent(orderId)}`);
}
export function updateOrderStatus(orderId, req) {
  return apiFetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, { method: "PUT", body: req });
}
export function listAdminProducts() {
  return apiFetch("/api/admin/products");
}
export function createProduct(req) {
  return apiFetch("/api/admin/products", { method: "POST", body: req });
}
export function updateProduct(productId, req) {
  return apiFetch(`/api/admin/products/${encodeURIComponent(productId)}`, { method: "PUT", body: req });
}
export function deactivateProduct(productId) {
  return apiFetch(`/api/admin/products/${encodeURIComponent(productId)}`, { method: "DELETE" });
}
export function upsertProductVariant(productId, req) {
  return apiFetch(`/api/admin/products/${encodeURIComponent(productId)}/variants`, { method: "PUT", body: req });
}
export function deleteProductVariant(productId, variant) {
  return apiFetch(`/api/admin/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variant)}`, {
    method: "DELETE",
  });
}
export function listAdminBundles() {
  return apiFetch("/api/admin/bundles");
}
export function createBundle(req) {
  return apiFetch("/api/admin/bundles", { method: "POST", body: req });
}
export function updateBundle(bundleId, req) {
  return apiFetch(`/api/admin/bundles/${encodeURIComponent(bundleId)}`, { method: "PUT", body: req });
}
export function getAuditLog() {
  return apiFetch("/api/admin/audit-log");
}
