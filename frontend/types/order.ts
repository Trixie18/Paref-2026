import { CartLineInput } from "./cart";

export type PaymentMethod = "GCASH" | "BANK_TRANSFER" | "CASH_AT_EVENT";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED";
export type FulfillmentStatus = "PENDING" | "READY" | "CLAIMED" | "CANCELLED";

export interface OrderItem {
  order_item_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  variant: string;
  bundle_id: string;
}

export interface Order {
  order_id: string;
  user_id: string;
  parent_name: string;
  order_date: string;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  claimed_at: string | null;
  claimed_by: string;
  items: OrderItem[];
}

export interface CheckoutRequest {
  items: CartLineInput[];
  parent_name: string;
  contact_number: string;
  payment_method: PaymentMethod;
  notes?: string;
  idempotency_key?: string;
}
