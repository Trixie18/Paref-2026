"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getOrder } from "@/services/api/orders";
import { getErrorMessage } from "@/services/api/http";
import { Order } from "@/types";
import { PageHeader } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { OrderDetailView } from "@/components/orders/OrderDetailView";

export default function OrderDetailPage() {
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
    <div>
      <PageHeader title="Order Detail" />
      <ErrorBanner message={error} />
      {order && <OrderDetailView order={order} />}
    </div>
  );
}
