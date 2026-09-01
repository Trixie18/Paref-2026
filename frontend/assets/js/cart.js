// Cart state, kept in localStorage under STORAGE_KEY. Mirrors
// frontend/contexts/CartContext.tsx's add/update/remove/merge behavior.
//
// Every function here reads the full cart from storage, applies one
// change, and writes it back - so the DOM-facing pages (assets/js/pages/
// shop.js, cart.js, checkout.js) never have to manage cart state
// themselves, and this module stays plain and unit-testable (see
// tests/cart.test.js, which stubs `localStorage` with a small in-memory
// object since Node has no native localStorage).
//
// A cart entry looks like:
//   { key, product_id, bundle_id, variant, quantity, name }
// exactly one of product_id/bundle_id is set, mirroring the backend's
// cart line shape (see assets/js/api.js's calculateCart / checkout).

const STORAGE_KEY = "paref_cart";

/** Builds the stable identity key used to merge duplicate cart lines:
 * one bundle -> one line; one product+size combination -> one line. */
export function cartKey({ product_id, bundle_id, variant } = {}) {
  if (bundle_id) return `bundle:${bundle_id}`;
  return `product:${product_id}:${variant || ""}`;
}

export function readCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function writeCart(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors (private browsing, quota, etc.)
  }
}

/** Adds `entry` ({product_id?, bundle_id?, variant?, quantity, name}) to
 * the cart, merging quantity into an existing line with the same key.
 * Returns the updated cart array. */
export function addItem(entry) {
  const items = readCart();
  const key = cartKey(entry);
  const existing = items.find((i) => i.key === key);
  let next;
  if (existing) {
    next = items.map((i) => (i.key === key ? { ...i, quantity: i.quantity + entry.quantity } : i));
  } else {
    next = [...items, { ...entry, key }];
  }
  writeCart(next);
  return next;
}

/** Sets a line's quantity to an absolute value; a quantity <= 0 removes
 * the line entirely. Returns the updated cart array. */
export function updateQuantity(key, quantity) {
  const items = readCart();
  const next = quantity <= 0 ? items.filter((i) => i.key !== key) : items.map((i) => (i.key === key ? { ...i, quantity } : i));
  writeCart(next);
  return next;
}

export function removeItem(key) {
  const items = readCart();
  const next = items.filter((i) => i.key !== key);
  writeCart(next);
  return next;
}

export function clearCart() {
  writeCart([]);
  return [];
}

export function getItemCount(items) {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

/** Converts cart entries into the CartLine shape the backend's
 * /api/cart/calculate and /api/orders endpoints expect. */
export function toCartLineInputs(items) {
  return items.map((item) => ({
    product_id: item.product_id || null,
    bundle_id: item.bundle_id || null,
    quantity: item.quantity,
    variant: item.variant || null,
  }));
}
