import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { makeFakeLocalStorage } from "./helpers/fake-local-storage.js";

// cart.js references the bare `localStorage` global (as it would in a
// browser), so tests stub it on globalThis before importing.
globalThis.localStorage = makeFakeLocalStorage();

const { cartKey, readCart, addItem, updateQuantity, removeItem, clearCart, getItemCount, toCartLineInputs } = await import(
  "../assets/js/cart.js"
);

beforeEach(() => {
  globalThis.localStorage.clear();
});

test("cartKey identifies a bundle line by bundle_id alone", () => {
  assert.equal(cartKey({ bundle_id: "BUNDLE-1" }), "bundle:BUNDLE-1");
});

test("cartKey identifies a product line by product_id + variant", () => {
  assert.equal(cartKey({ product_id: "VINTA", variant: "M" }), "product:VINTA:M");
  assert.equal(cartKey({ product_id: "MEAL" }), "product:MEAL:");
});

test("addItem adds a new line to an empty cart", () => {
  const items = addItem({ product_id: "MEAL", quantity: 2, name: "Meal Stub" });
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 2);
  assert.equal(items[0].key, "product:MEAL:");
});

test("addItem merges quantity into an existing matching line instead of duplicating it", () => {
  addItem({ product_id: "MEAL", quantity: 2, name: "Meal Stub" });
  const items = addItem({ product_id: "MEAL", quantity: 3, name: "Meal Stub" });
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 5);
});

test("addItem keeps different variants of the same product as separate lines", () => {
  addItem({ product_id: "VINTA", variant: "S", quantity: 1, name: "Vinta Shirt (S)" });
  const items = addItem({ product_id: "VINTA", variant: "M", quantity: 1, name: "Vinta Shirt (M)" });
  assert.equal(items.length, 2);
});

test("updateQuantity sets an absolute quantity on the matching line", () => {
  addItem({ product_id: "MEAL", quantity: 1, name: "Meal Stub" });
  const items = updateQuantity("product:MEAL:", 5);
  assert.equal(items[0].quantity, 5);
});

test("updateQuantity to zero or below removes the line", () => {
  addItem({ product_id: "MEAL", quantity: 1, name: "Meal Stub" });
  const items = updateQuantity("product:MEAL:", 0);
  assert.equal(items.length, 0);
});

test("removeItem drops only the matching line", () => {
  addItem({ product_id: "MEAL", quantity: 1, name: "Meal Stub" });
  addItem({ product_id: "WATER", quantity: 1, name: "Water" });
  const items = removeItem("product:MEAL:");
  assert.equal(items.length, 1);
  assert.equal(items[0].product_id, "WATER");
});

test("clearCart empties the cart", () => {
  addItem({ product_id: "MEAL", quantity: 1, name: "Meal Stub" });
  const items = clearCart();
  assert.equal(items.length, 0);
  assert.equal(readCart().length, 0);
});

test("getItemCount sums quantities across all lines", () => {
  const items = [
    { key: "a", quantity: 2 },
    { key: "b", quantity: 3 },
  ];
  assert.equal(getItemCount(items), 5);
});

test("toCartLineInputs converts cart entries into the backend's CartLine shape", () => {
  const items = [{ key: "product:VINTA:M", product_id: "VINTA", variant: "M", quantity: 2, name: "Vinta Shirt (M)" }];
  assert.deepEqual(toCartLineInputs(items), [{ product_id: "VINTA", bundle_id: null, quantity: 2, variant: "M" }]);
});

test("cart state persists across separate reads (via the stubbed localStorage)", () => {
  addItem({ product_id: "MEAL", quantity: 1, name: "Meal Stub" });
  const reread = readCart();
  assert.equal(reread.length, 1);
  assert.equal(reread[0].product_id, "MEAL");
});
