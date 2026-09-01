"use client";

import { useEffect, useState } from "react";
import { calculateCart } from "@/services/api/cart";
import { getErrorMessage } from "@/services/api/http";
import { CartCalculationResponse, CartEntry, CartLineInput } from "@/types";

const EMPTY_RESULT: CartCalculationResponse = { lines: [], total_amount: 0 };

export function toCartLineInputs(items: CartEntry[]): CartLineInput[] {
  return items.map((item) => ({
    product_id: item.product_id,
    bundle_id: item.bundle_id,
    quantity: item.quantity,
    variant: item.variant,
  }));
}

/** Always re-derives the displayed total from the backend so the frontend
 * never shows a price/total it computed itself. Recomputes whenever the
 * cart's contents change. */
export function useCartCalculation(items: CartEntry[]) {
  const [data, setData] = useState<CartCalculationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(toCartLineInputs(items));
  const isEmpty = items.length === 0;

  useEffect(() => {
    if (isEmpty) return;
    let cancelled = false;
    // Resets loading/error before a real fetch whenever the cart's
    // contents change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    calculateCart(toCartLineInputs(items))
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isEmpty]);

  if (isEmpty) return { data: EMPTY_RESULT, loading: false, error: null };
  return { data, loading, error };
}
