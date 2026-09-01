"use client";

import { useEffect, useState } from "react";
import { getDashboard } from "@/services/api/admin";
import { getErrorMessage } from "@/services/api/http";
import { Dashboard } from "@/types";
import { PageHeader, Card } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { StatCard } from "@/components/admin/StatCard";
import { SimpleLineChart } from "@/components/admin/SimpleLineChart";
import { SimpleBarChart } from "@/components/admin/SimpleBarChart";

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard()
      .then(setDashboard)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!dashboard) return null;

  const currency = (v: number) => `₱${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div>
      <PageHeader title="Dashboard" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Registered Parents" value={dashboard.registered_parents} />
        <StatCard label="Total Players" value={dashboard.total_players} />
        <StatCard label="Total Orders" value={dashboard.total_orders} />
        <StatCard label="Items Sold" value={dashboard.total_items_sold} />
        <StatCard label="Total Revenue" value={currency(dashboard.total_revenue)} />
        <StatCard label="Paid Revenue" value={currency(dashboard.paid_revenue)} />
        <StatCard label="Pending Payments" value={dashboard.pending_payments} />
        <StatCard label="Pending Fulfillment" value={dashboard.pending_fulfillment} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-navy">Revenue Over Time</h2>
          <SimpleLineChart points={dashboard.revenue_over_time} />
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-navy">Orders Over Time</h2>
          <SimpleLineChart points={dashboard.orders_over_time} />
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-navy">Sales by Category</h2>
          <SimpleBarChart
            data={dashboard.sales_by_category.map((c) => ({ label: c.category, value: c.revenue }))}
            formatValue={currency}
          />
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-navy">Top Products</h2>
          <SimpleBarChart
            data={dashboard.top_products.map((p) => ({ label: p.name, value: p.quantity_sold }))}
          />
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-navy">Bundle Sales</h2>
          <SimpleBarChart
            data={dashboard.bundle_sales.map((b) => ({ label: b.name, value: b.quantity_sold }))}
          />
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-navy">Inventory Status</h2>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2">Product</th>
                  <th className="pb-2">Variant</th>
                  <th className="pb-2 text-right">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dashboard.inventory_status.map((item, i) => (
                  <tr key={`${item.product_id}-${item.variant ?? ""}-${i}`}>
                    <td className="py-1.5 text-foreground">{item.name}</td>
                    <td className="py-1.5 text-muted">{item.variant ?? "—"}</td>
                    <td className="py-1.5 text-right font-medium text-foreground">{item.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
