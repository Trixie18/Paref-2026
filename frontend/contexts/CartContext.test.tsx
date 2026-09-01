import { beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { CartProvider, cartKey, useCart } from "./CartContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("cartKey", () => {
  it("keys a shirt by product id and variant", () => {
    expect(cartKey({ product_id: "VINTA", variant: "M" })).toBe("product:VINTA:M");
  });

  it("keys a bundle by bundle id only", () => {
    expect(cartKey({ bundle_id: "BUNDLE-1" })).toBe("bundle:BUNDLE-1");
  });
});

describe("useCart", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toEqual([]);
    expect(result.current.itemCount).toBe(0);
  });

  it("adds a new item", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem({ product_id: "MEAL", quantity: 2, name: "Meal Stub" });
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toMatchObject({ product_id: "MEAL", quantity: 2, name: "Meal Stub" });
    expect(result.current.itemCount).toBe(2);
  });

  it("merges quantities when the same product+variant is added again", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem({ product_id: "VINTA", variant: "M", quantity: 1, name: "Vinta Shirt (M)" });
    });
    act(() => {
      result.current.addItem({ product_id: "VINTA", variant: "M", quantity: 2, name: "Vinta Shirt (M)" });
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
  });

  it("keeps different variants of the same product as separate lines", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem({ product_id: "VINTA", variant: "M", quantity: 1, name: "Vinta Shirt (M)" });
      result.current.addItem({ product_id: "VINTA", variant: "L", quantity: 1, name: "Vinta Shirt (L)" });
    });
    expect(result.current.items).toHaveLength(2);
  });

  it("updates the quantity of an existing line", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem({ product_id: "WATER", quantity: 1, name: "Water" });
    });
    const key = result.current.items[0].key;
    act(() => {
      result.current.updateQuantity(key, 5);
    });
    expect(result.current.items[0].quantity).toBe(5);
  });

  it("removes a line when its quantity is set to zero", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem({ product_id: "WATER", quantity: 1, name: "Water" });
    });
    const key = result.current.items[0].key;
    act(() => {
      result.current.updateQuantity(key, 0);
    });
    expect(result.current.items).toHaveLength(0);
  });

  it("removes a line via removeItem", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem({ product_id: "WATER", quantity: 1, name: "Water" });
    });
    const key = result.current.items[0].key;
    act(() => {
      result.current.removeItem(key);
    });
    expect(result.current.items).toHaveLength(0);
  });

  it("clears the whole cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem({ product_id: "WATER", quantity: 1, name: "Water" });
      result.current.addItem({ bundle_id: "BUNDLE-1", quantity: 1, name: "Bundle 1" });
    });
    act(() => {
      result.current.clear();
    });
    expect(result.current.items).toHaveLength(0);
  });
});
