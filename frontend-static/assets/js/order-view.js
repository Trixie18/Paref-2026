// Renders one Order object as HTML. Shared between assets/js/pages/order.js
// (parent order detail/confirmation) and assets/js/pages/admin-order.js
// (admin/staff order detail), mirroring
// frontend/components/orders/OrderDetailView.tsx.

const PAYMENT_METHOD_LABELS = {
  GCASH: "GCash",
  BANK_TRANSFER: "Bank Transfer",
  CASH_AT_EVENT: "Cash at Event",
};

const PAYMENT_TONE = { PENDING: "warning", PAID: "success", FAILED: "danger", CANCELLED: "neutral" };
const FULFILLMENT_TONE = { PENDING: "warning", READY: "info", CLAIMED: "success", CANCELLED: "neutral" };

function titleCase(s) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export function statusBadge(status, tones) {
  const tone = tones[status] || "neutral";
  return `<span class="badge badge-${tone}">${titleCase(status)}</span>`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function renderOrderDetail(order) {
  const itemsHtml = order.items
    .map(
      (item) => `
    <li class="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span class="text-foreground">${item.quantity}&times; ${escapeHtml(item.product_name)}${item.variant ? ` (${escapeHtml(item.variant)})` : ""}</span>
      <span class="font-medium text-foreground">₱${item.subtotal.toFixed(2)}</span>
    </li>`
    )
    .join("");

  return `
    <div class="flex flex-col gap-4">
      <div class="card p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-sm text-muted">Order</p>
            <p class="font-mono text-base font-semibold text-navy">${escapeHtml(order.order_id)}</p>
          </div>
          <p class="text-sm text-muted">${new Date(order.order_date).toLocaleString()}</p>
        </div>
        <div class="mt-4 flex flex-wrap gap-6">
          <div>
            <p class="text-xs uppercase tracking-wide text-muted">Payment</p>
            <div class="mt-1 flex items-center gap-2">
              ${statusBadge(order.payment_status, PAYMENT_TONE)}
              <span class="text-sm text-muted">${PAYMENT_METHOD_LABELS[order.payment_method] || escapeHtml(order.payment_method)}</span>
            </div>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-muted">Fulfillment</p>
            <div class="mt-1">${statusBadge(order.fulfillment_status, FULFILLMENT_TONE)}</div>
          </div>
        </div>
        ${order.notes ? `<p class="mt-3 text-sm text-muted"><span class="font-medium text-foreground">Notes: </span>${escapeHtml(order.notes)}</p>` : ""}
      </div>

      <div class="card p-4">
        <h2 class="mb-3 text-sm font-semibold text-navy">Items</h2>
        <ul class="flex flex-col divide-y divide-border">${itemsHtml}</ul>
        <div class="mt-3 flex justify-between border-t border-border pt-3 font-semibold text-navy">
          <span>Total</span>
          <span>₱${order.total_amount.toFixed(2)}</span>
        </div>
      </div>
    </div>
  `;
}
