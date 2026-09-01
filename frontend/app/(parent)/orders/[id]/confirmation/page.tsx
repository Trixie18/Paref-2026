"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getOrder } from "@/services/api/orders";
import { getErrorMessage } from "@/services/api/http";
import { Order } from "@/types";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Button } from "@/components/ui/Button";
import { OrderDetailView } from "@/components/orders/OrderDetailView";
import { CheckIcon } from "@/components/icons";

export default function OrderConfirmationPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrder(params.id)
      .then(setOrder)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckIcon className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-semibold text-navy">Order Confirmed</h1>
        <p className="text-sm text-muted">
          Thank you! Show this order to event staff to complete payment and claim your items.
        </p>
      </div>

      <ErrorBanner message={error} />
      {order && <OrderDetailView order={order} />}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/orders" className="flex-1">
          <Button variant="outline" fullWidth>
            View Order History
          </Button>
        </Link>
        <Link href="/shop" className="flex-1">
          <Button fullWidth>Continue Shopping</Button>
        </Link>
      </div>
    </div>
  );
}
