export interface CartLineInput {
  product_id?: string;
  bundle_id?: string;
  quantity: number;
  variant?: string;
}

export interface CartLineResult {
  product_id?: string | null;
  bundle_id?: string | null;
  name: string;
  variant?: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface CartCalculationResponse {
  lines: CartLineResult[];
  total_amount: number;
}

/** One entry kept client-side (in localStorage). Only ids/labels/quantity
 * are persisted — never a price or total. Prices always come fresh from
 * POST /api/cart/calculate. */
export interface CartEntry {
  key: string;
  product_id?: string;
  bundle_id?: string;
  variant?: string;
  quantity: number;
  /** Display-only label kept for instant rendering before the calculate
   * round-trip resolves; never trusted as a price source. */
  name: string;
}
