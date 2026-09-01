// Logic for admin/dashboard.html (ADMIN only).
import { requireAdmin, requireAdminRole } from "../guard.js";
import { getDashboard, getErrorMessage } from "../api.js";
import { lineChart, barChart } from "../charts.js";

const { profile } = await requireAdmin();

if (requireAdminRole(profile)) {
  const loading = document.getElementById("loading");
  const errorBanner = document.getElementById("error-banner");
  const content = document.getElementById("dashboard-content");

  const currency = (v) => `₱${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const statCard = (label, value) =>
    `<div class="card p-4"><p class="text-xs font-medium uppercase tracking-wide text-muted">${label}</p><p class="mt-1.5 text-2xl font-semibold text-navy">${value}</p></div>`;

  try {
    const dashboard = await getDashboard();
    loading.hidden = true;
    content.hidden = false;

    document.getElementById("stat-grid").innerHTML = [
      statCard("Registered Parents", dashboard.registered_parents),
      statCard("Total Players", dashboard.total_players),
      statCard("Total Orders", dashboard.total_orders),
      statCard("Items Sold", dashboard.total_items_sold),
      statCard("Total Revenue", currency(dashboard.total_revenue)),
      statCard("Paid Revenue", currency(dashboard.paid_revenue)),
      statCard("Pending Payments", dashboard.pending_payments),
      statCard("Pending Fulfillment", dashboard.pending_fulfillment),
    ].join("");

    document.getElementById("revenue-chart").innerHTML = lineChart(dashboard.revenue_over_time);
    document.getElementById("orders-chart").innerHTML = lineChart(dashboard.orders_over_time);
    document.getElementById("category-chart").innerHTML = barChart(
      dashboard.sales_by_category.map((c) => ({ label: c.category, value: c.revenue })),
      currency
    );
    document.getElementById("top-products-chart").innerHTML = barChart(
      dashboard.top_products.map((p) => ({ label: p.name, value: p.quantity_sold }))
    );
    document.getElementById("bundle-sales-chart").innerHTML = barChart(
      dashboard.bundle_sales.map((b) => ({ label: b.name, value: b.quantity_sold }))
    );

    document.getElementById("inventory-body").innerHTML = dashboard.inventory_status
      .map(
        (item) => `
      <tr>
        <td class="py-1.5 text-foreground">${item.name}</td>
        <td class="py-1.5 text-muted">${item.variant || "—"}</td>
        <td class="py-1.5 text-right font-medium text-foreground">${item.stock}</td>
      </tr>`
      )
      .join("");
  } catch (err) {
    loading.hidden = true;
    errorBanner.hidden = false;
    errorBanner.textContent = getErrorMessage(err);
  }
}
