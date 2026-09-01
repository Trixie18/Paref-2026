import { Order, FulfillmentStatus, PaymentMethod, PaymentStatus } from "./order";
import { Player } from "./player";

export type AdminRole = "ADMIN" | "STAFF";

export interface AdminUserListItem {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  active: boolean;
  player_count: number;
  order_count: number;
}

export interface AdminUserDetail {
  user: AdminUserListItem;
  players: Player[];
  orders: Order[];
}

export interface AdminOrderListItem {
  order_id: string;
  user_id: string;
  parent_name: string;
  order_date: string;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  claimed_by: string;
}

export interface OrderStatusUpdateRequest {
  payment_status?: PaymentStatus;
  fulfillment_status?: FulfillmentStatus;
}

export interface AuditLogEntry {
  log_id: string;
  timestamp: string;
  admin_id: string;
  admin_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
}
