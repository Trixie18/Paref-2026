// Logic for orders.html.
import { requireParent } from "../guard.js";
import { listOrders, getErrorMessage } from "../api.js";
import { statusBadge } from "../order-view.js";

await requireParent();

const loading = document.getElementById("loading");
const errorBanner = document.getElementById("error-banner");
const emptyState = document.getElementById("empty-state");
const list = document.getElementById("order-list");

const PAYMENT_TONE = { PENDING: "warning", PAID: "success", FAILED: "danger", CANCELLED: "neutral" };
const FULFILLMENT_TONE = { PENDING: "warning", READY: "info", CLAIMED: "success", CANCELLED: "neutral" };

try {
  const orders = await listOrders();
  loading.hidden = true;

  if (orders.length === 0) {
    emptyState.hidden = false;
  } else {
    list.hidden = false;
    list.innerHTML = orders
      .map(
        (order) => `
      <li>
        <a href="/order.html?id=${encodeURIComponent(order.order_id)}" class="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-background">
          <div class="min-w-0">
            <p class="font-mono text-sm font-medium text-foreground">${order.order_id}</p>
            <p class="text-sm text-muted">${new Date(order.order_date).toLocaleDateString()} &middot; ₱${order.total_amount.toFixed(2)}</p>
            <div class="mt-1 flex gap-1.5">
              ${statusBadge(order.payment_status, PAYMENT_TONE)}
              ${statusBadge(order.fulfillment_status, FULFILLMENT_TONE)}
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="text-muted shrink-0"><path d="m9 5.5 7 6.5-7 6.5" /></svg>
        </a>
      </li>`
      )
      .join("");
  }
} catch (err) {
  loading.hidden = true;
  errorBanner.hidden = false;
  errorBanner.textContent = getErrorMessage(err);
}
