"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listOrders } from "@/services/api/orders";
import { getErrorMessage } from "@/services/api/http";
import { Order } from "@/types";
import { PageHeader } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PaymentStatusBadge, FulfillmentStatusBadge } from "@/components/ui/Badge";
import { ChevronRightIcon } from "@/components/icons";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listOrders()
      .then(setOrders)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="My Orders" />
      <ErrorBanner message={error} />

      {loading ? (
        <PageSpinner />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Your placed orders will show up here."
          action={
            <Link href="/shop">
              <Button size="sm">Go to Shop</Button>
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {orders.map((order) => (
            <li key={order.order_id}>
              <Link
                href={`/orders/${order.order_id}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-background"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium text-foreground">{order.order_id}</p>
                  <p className="text-sm text-muted">
                    {new Date(order.order_date).toLocaleDateString()} &middot; ₱{order.total_amount.toFixed(2)}
                  </p>
                  <div className="mt-1 flex gap-1.5">
                    <PaymentStatusBadge status={order.payment_status} />
                    <FulfillmentStatusBadge status={order.fulfillment_status} />
                  </div>
                </div>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
