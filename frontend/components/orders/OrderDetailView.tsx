import { Order } from "@/types";
import { Card } from "@/components/ui/Card";
import { PaymentStatusBadge, FulfillmentStatusBadge } from "@/components/ui/Badge";

const paymentMethodLabels: Record<string, string> = {
  GCASH: "GCash",
  BANK_TRANSFER: "Bank Transfer",
  CASH_AT_EVENT: "Cash at Event",
};

export function OrderDetailView({ order }: { order: Order }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm text-muted">Order</p>
            <p className="font-mono text-base font-semibold text-navy">{order.order_id}</p>
          </div>
          <p className="text-sm text-muted">{new Date(order.order_date).toLocaleString()}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Payment</p>
            <div className="mt-1 flex items-center gap-2">
              <PaymentStatusBadge status={order.payment_status} />
              <span className="text-sm text-muted">{paymentMethodLabels[order.payment_method] ?? order.payment_method}</span>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Fulfillment</p>
            <div className="mt-1">
              <FulfillmentStatusBadge status={order.fulfillment_status} />
            </div>
          </div>
        </div>
        {order.notes && (
          <p className="mt-3 text-sm text-muted">
            <span className="font-medium text-foreground">Notes: </span>
            {order.notes}
          </p>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-navy">Items</h2>
        <ul className="flex flex-col divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.order_item_id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="text-foreground">
                {item.quantity}&times; {item.product_name}
                {item.variant ? ` (${item.variant})` : ""}
              </span>
              <span className="font-medium text-foreground">₱{item.subtotal.toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold text-navy">
          <span>Total</span>
          <span>₱{order.total_amount.toFixed(2)}</span>
        </div>
      </Card>
    </div>
  );
}
