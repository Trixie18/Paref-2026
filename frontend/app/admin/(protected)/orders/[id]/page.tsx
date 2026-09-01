"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAdminOrder, updateOrderStatus } from "@/services/api/admin";
import { ApiError, getErrorMessage } from "@/services/api/http";
import { FulfillmentStatus, Order, PaymentStatus } from "@/types";
import { PageHeader, Card } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorBanner, InfoBanner } from "@/components/ui/ErrorBanner";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { OrderDetailView } from "@/components/orders/OrderDetailView";

const paymentOptions: PaymentStatus[] = ["PENDING", "PAID", "FAILED", "CANCELLED"];
const fulfillmentOptions: FulfillmentStatus[] = ["PENDING", "READY", "CLAIMED", "CANCELLED"];

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("PENDING");
  const [fulfillmentStatus, setFulfillmentStatus] = useState<FulfillmentStatus>("PENDING");
  const [submitting, setSubmitting] = useState(false);

  // Resets loading/error on every params.id change (including navigating
  // from one order detail page straight to another).
  function load() {
    setLoading(true);
    getAdminOrder(params.id)
      .then((data) => {
        setOrder(data);
        setPaymentStatus(data.payment_status);
        setFulfillmentStatus(data.fulfillment_status);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [params.id]);

  async function handleUpdate() {
    if (!order) return;
    setError(null);
    setWarning(null);
    setSubmitting(true);
    try {
      const updated = await updateOrderStatus(order.order_id, {
        payment_status: paymentStatus,
        fulfillment_status: fulfillmentStatus,
      });
      setOrder(updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setWarning(err.message);
        load();
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <div>
      <PageHeader title="Order Detail" action={<Button variant="ghost" size="sm" onClick={() => router.push("/admin/orders")}>Back to Orders</Button>} />
      <ErrorBanner message={error} />
      {order && (
        <div className="flex flex-col gap-4">
          <OrderDetailView order={order} />

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-navy">Update Status</h2>

            {order.fulfillment_status === "CLAIMED" && (
              <div className="mb-3">
                <InfoBanner
                  tone="warning"
                  message={`Already claimed${order.claimed_by ? ` by ${order.claimed_by}` : ""}${
                    order.claimed_at ? ` at ${new Date(order.claimed_at).toLocaleString()}` : ""
                  }.`}
                />
              </div>
            )}
            {warning && (
              <div className="mb-3">
                <InfoBanner tone="warning" message={warning} />
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select label="Payment status" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}>
                {paymentOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Select
                label="Fulfillment status"
                value={fulfillmentStatus}
                onChange={(e) => setFulfillmentStatus(e.target.value as FulfillmentStatus)}
              >
                {fulfillmentOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>

            <div className="mt-4">
              <Button onClick={handleUpdate} disabled={submitting}>
                {submitting ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
