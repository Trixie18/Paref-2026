"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CartEntry } from "@/types";

const STORAGE_KEY = "paref_cart";

export function cartKey(args: { product_id?: string; bundle_id?: string; variant?: string }): string {
  if (args.bundle_id) return `bundle:${args.bundle_id}`;
  return `product:${args.product_id}:${args.variant ?? ""}`;
}

function readCart(): CartEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartEntry[]) : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartEntry[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors (private browsing, quota, etc.)
  }
}

interface CartContextValue {
  items: CartEntry[];
  itemCount: number;
  addItem(entry: Omit<CartEntry, "key">): void;
  updateQuantity(key: string, quantity: number): void;
  removeItem(key: string): void;
  clear(): void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // localStorage doesn't exist during SSR, so the cart must render empty
    // on the server and hydrate on the client — reading it any earlier
    // than this effect would cause a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeCart(items);
  }, [items, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    function addItem(entry: Omit<CartEntry, "key">): void {
      const key = cartKey(entry);
      setItems((prev) => {
        const existing = prev.find((i) => i.key === key);
        if (existing) {
          return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + entry.quantity } : i));
        }
        return [...prev, { ...entry, key }];
      });
    }

    function updateQuantity(key: string, quantity: number): void {
      setItems((prev) => {
        if (quantity <= 0) return prev.filter((i) => i.key !== key);
        return prev.map((i) => (i.key === key ? { ...i, quantity } : i));
      });
    }

    function removeItem(key: string): void {
      setItems((prev) => prev.filter((i) => i.key !== key));
    }

    function clear(): void {
      setItems([]);
    }

    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

    return { items, itemCount, addItem, updateQuantity, removeItem, clear };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used within a CartProvider");
  return value;
}
