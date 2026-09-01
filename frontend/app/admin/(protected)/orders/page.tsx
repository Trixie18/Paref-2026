"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listAdminOrders, searchAdminOrders } from "@/services/api/admin";
import { getErrorMessage } from "@/services/api/http";
import { FulfillmentStatus, PaymentStatus } from "@/types";
import { PageHeader } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PaymentStatusBadge, FulfillmentStatusBadge } from "@/components/ui/Badge";
import { SearchIcon, ChevronRightIcon } from "@/components/icons";

interface OrderRow {
  order_id: string;
  label: string;
  order_date: string;
  total_amount: number;
  payment_method: string;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  claimed_by: string;
}

type FilterKey = "ALL" | "PENDING_PAYMENT" | "PAID" | "FAILED" | "CANCELLED" | "PENDING_FULFILLMENT" | "READY" | "CLAIMED";

const filters: { key: FilterKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING_PAYMENT", label: "Pending Payment" },
  { key: "PAID", label: "Paid" },
  { key: "FAILED", label: "Failed" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "PENDING_FULFILLMENT", label: "Pending Fulfillment" },
  { key: "READY", label: "Ready" },
  { key: "CLAIMED", label: "Claimed" },
];

function filterToParams(key: FilterKey): { payment_status?: PaymentStatus; fulfillment_status?: FulfillmentStatus } {
  switch (key) {
    case "PENDING_PAYMENT":
      return { payment_status: "PENDING" };
    case "PAID":
      return { payment_status: "PAID" };
    case "FAILED":
      return { payment_status: "FAILED" };
    case "CANCELLED":
      return { payment_status: "CANCELLED" };
    case "PENDING_FULFILLMENT":
      return { fulfillment_status: "PENDING" };
    case "READY":
      return { fulfillment_status: "READY" };
    case "CLAIMED":
      return { fulfillment_status: "CLAIMED" };
    default:
      return {};
  }
}

export default function AdminOrdersPage() {
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    // Resets loading/error on every filter/search change before the
    // (possibly debounced) fetch below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    const request = trimmed
      ? searchAdminOrders(trimmed).then((orders) =>
          orders.map<OrderRow>((o) => ({
            order_id: o.order_id,
            label: o.parent_name,
            order_date: o.order_date,
            total_amount: o.total_amount,
            payment_method: o.payment_method,
            payment_status: o.payment_status,
            fulfillment_status: o.fulfillment_status,
            claimed_by: o.claimed_by,
          }))
        )
      : listAdminOrders(filterToParams(filter)).then((orders) =>
          orders.map<OrderRow>((o) => ({
            order_id: o.order_id,
            label: o.parent_name,
            order_date: o.order_date,
            total_amount: o.total_amount,
            payment_method: o.payment_method,
            payment_status: o.payment_status,
            fulfillment_status: o.fulfillment_status,
            claimed_by: o.claimed_by,
          }))
        );

    const timeout = setTimeout(() => {
      request
        .then(setRows)
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setLoading(false));
    }, trimmed ? 300 : 0);

    return () => clearTimeout(timeout);
  }, [filter, query]);

  return (
    <div>
      <PageHeader title="Orders" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-1 flex flex-wrap gap-1.5 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setQuery("");
              }}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key && !query ? "bg-navy text-white" : "bg-black/5 text-foreground hover:bg-black/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order, name, email, phone"
            className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
          />
        </div>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <PageSpinner />
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No orders found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Fulfillment</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.order_id} className="hover:bg-background">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{row.order_id}</td>
                  <td className="px-4 py-3 text-foreground">{row.label}</td>
                  <td className="px-4 py-3 text-muted">{new Date(row.order_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">₱{row.total_amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={row.payment_status} />
                  </td>
                  <td className="px-4 py-3">
                    <FulfillmentStatusBadge status={row.fulfillment_status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/orders/${row.order_id}`} className="inline-flex text-navy hover:underline">
                      <ChevronRightIcon className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
