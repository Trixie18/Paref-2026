// Logic for admin/user.html (ADMIN only).
import { requireAdmin, requireAdminRole } from "../guard.js";
import { getUserDetail, getErrorMessage } from "../api.js";
import { statusBadge } from "../order-view.js";

const { profile } = await requireAdmin();

const PAYMENT_TONE = { PENDING: "warning", PAID: "success", FAILED: "danger", CANCELLED: "neutral" };
const FULFILLMENT_TONE = { PENDING: "warning", READY: "info", CLAIMED: "success", CANCELLED: "neutral" };

if (requireAdminRole(profile)) {
  const userId = new URLSearchParams(window.location.search).get("id");
  const loading = document.getElementById("loading");
  const errorBanner = document.getElementById("error-banner");
  const content = document.getElementById("detail-content");

  if (!userId) {
    loading.hidden = true;
    errorBanner.hidden = false;
    errorBanner.textContent = "No parent specified.";
  } else {
    try {
      const detail = await getUserDetail(userId);
      loading.hidden = true;
      content.hidden = false;

      const playersHtml =
        detail.players.length === 0
          ? `<p class="text-sm text-muted">No players registered.</p>`
          : `<ul class="flex flex-col divide-y divide-border">${detail.players
              .map(
                (p) => `
            <li class="py-2 text-sm">
              <span class="font-medium text-foreground">${p.player_name}</span>
              <span class="text-muted"> &mdash; ${p.age_group} ${p.team} &middot; Jersey #${p.jersey_number}</span>
            </li>`
              )
              .join("")}</ul>`;

      const ordersHtml =
        detail.orders.length === 0
          ? `<p class="text-sm text-muted">No orders yet.</p>`
          : `<ul class="flex flex-col divide-y divide-border">${detail.orders
              .map(
                (o) => `
            <li>
              <a href="/admin/order.html?id=${encodeURIComponent(o.order_id)}" class="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-background">
                <div>
                  <p class="font-mono text-xs text-foreground">${o.order_id}</p>
                  <p class="text-muted">${new Date(o.order_date).toLocaleDateString()} &middot; ₱${o.total_amount.toFixed(2)}</p>
                </div>
                <div class="flex items-center gap-1.5">
                  ${statusBadge(o.payment_status, PAYMENT_TONE)}
                  ${statusBadge(o.fulfillment_status, FULFILLMENT_TONE)}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="text-muted"><path d="m9 5.5 7 6.5-7 6.5" /></svg>
                </div>
              </a>
            </li>`
              )
              .join("")}</ul>`;

      content.innerHTML = `
        <div class="card p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="text-lg font-semibold text-foreground">${detail.user.name}</p>
              <p class="text-sm text-muted">${detail.user.email}</p>
              <p class="text-sm text-muted">${detail.user.phone}</p>
            </div>
            <span class="badge ${detail.user.active ? "badge-success" : "badge-neutral"}">${detail.user.active ? "Active" : "Inactive"}</span>
          </div>
          <p class="mt-2 text-xs text-muted">Registered ${new Date(detail.user.created_at).toLocaleDateString()}</p>
        </div>

        <div class="card p-4">
          <h2 class="mb-3 text-sm font-semibold text-navy">Players (${detail.players.length})</h2>
          ${playersHtml}
        </div>

        <div class="card p-4">
          <h2 class="mb-3 text-sm font-semibold text-navy">Orders (${detail.orders.length})</h2>
          ${ordersHtml}
        </div>
      `;
    } catch (err) {
      loading.hidden = true;
      errorBanner.hidden = false;
      errorBanner.textContent = getErrorMessage(err);
    }
  }
}
