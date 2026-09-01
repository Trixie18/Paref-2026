"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getUserDetail } from "@/services/api/admin";
import { getErrorMessage } from "@/services/api/http";
import { AdminUserDetail } from "@/types";
import { PageHeader, Card } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Badge } from "@/components/ui/Badge";
import { PaymentStatusBadge, FulfillmentStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChevronRightIcon } from "@/components/icons";

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUserDetail(params.id)
      .then(setDetail)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <PageSpinner />;

  return (
    <div>
      <PageHeader title="Parent Detail" action={<Button variant="ghost" size="sm" onClick={() => router.push("/admin/users")}>Back to Parents</Button>} />
      <ErrorBanner message={error} />

      {detail && (
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-lg font-semibold text-foreground">{detail.user.name}</p>
                <p className="text-sm text-muted">{detail.user.email}</p>
                <p className="text-sm text-muted">{detail.user.phone}</p>
              </div>
              <Badge tone={detail.user.active ? "success" : "neutral"}>{detail.user.active ? "Active" : "Inactive"}</Badge>
            </div>
            <p className="mt-2 text-xs text-muted">
              Registered {new Date(detail.user.created_at).toLocaleDateString()}
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-navy">Players ({detail.players.length})</h2>
            {detail.players.length === 0 ? (
              <p className="text-sm text-muted">No players registered.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {detail.players.map((player) => (
                  <li key={player.player_id} className="py-2 text-sm">
                    <span className="font-medium text-foreground">{player.player_name}</span>{" "}
                    <span className="text-muted">
                      &mdash; {player.age_group} {player.team} &middot; Jersey #{player.jersey_number}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-navy">Orders ({detail.orders.length})</h2>
            {detail.orders.length === 0 ? (
              <p className="text-sm text-muted">No orders yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {detail.orders.map((order) => (
                  <li key={order.order_id}>
                    <Link
                      href={`/admin/orders/${order.order_id}`}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-background"
                    >
                      <div>
                        <p className="font-mono text-xs text-foreground">{order.order_id}</p>
                        <p className="text-muted">
                          {new Date(order.order_date).toLocaleDateString()} &middot; ₱{order.total_amount.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <PaymentStatusBadge status={order.payment_status} />
                        <FulfillmentStatusBadge status={order.fulfillment_status} />
                        <ChevronRightIcon className="h-4 w-4 text-muted" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
