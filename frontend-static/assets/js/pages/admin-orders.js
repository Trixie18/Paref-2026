// Logic for admin/orders.html (ADMIN + STAFF).
import { requireAdmin } from "../guard.js";
import { listAdminOrders, searchAdminOrders, getErrorMessage } from "../api.js";
import { statusBadge } from "../order-view.js";

await requireAdmin();

const PAYMENT_TONE = { PENDING: "warning", PAID: "success", FAILED: "danger", CANCELLED: "neutral" };
const FULFILLMENT_TONE = { PENDING: "warning", READY: "info", CLAIMED: "success", CANCELLED: "neutral" };

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "PENDING_PAYMENT", label: "Pending Payment" },
  { key: "PAID", label: "Paid" },
  { key: "FAILED", label: "Failed" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "PENDING_FULFILLMENT", label: "Pending Fulfillment" },
  { key: "READY", label: "Ready" },
  { key: "CLAIMED", label: "Claimed" },
];

function filterToParams(key) {
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

const loading = document.getElementById("loading");
const errorBanner = document.getElementById("error-banner");
const tableWrap = document.getElementById("table-wrap");
const rowsEl = document.getElementById("order-rows");
const noResults = document.getElementById("no-results");
const filterButtonsEl = document.getElementById("filter-buttons");
const searchInput = document.getElementById("search-input");

let currentFilter = "ALL";
let searchTimeout = null;

function renderFilterButtons() {
  filterButtonsEl.innerHTML = FILTERS.map(
    (f) =>
      `<button type="button" data-filter="${f.key}" class="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        currentFilter === f.key && !searchInput.value ? "bg-navy text-white" : "bg-black/5 text-foreground hover:bg-black/10"
      }">${f.label}</button>`
  ).join("");
  filterButtonsEl.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      searchInput.value = "";
      renderFilterButtons();
      load();
    });
  });
}

function renderRows(rows) {
  if (rows.length === 0) {
    tableWrap.hidden = true;
    noResults.hidden = false;
    return;
  }
  noResults.hidden = true;
  tableWrap.hidden = false;
  rowsEl.innerHTML = rows
    .map(
      (o) => `
    <tr class="hover:bg-background">
      <td class="px-4 py-3 font-mono text-xs text-foreground">${o.order_id}</td>
      <td class="px-4 py-3 text-foreground">${o.parent_name}</td>
      <td class="px-4 py-3 text-muted">${new Date(o.order_date).toLocaleDateString()}</td>
      <td class="px-4 py-3">₱${o.total_amount.toFixed(2)}</td>
      <td class="px-4 py-3">${statusBadge(o.payment_status, PAYMENT_TONE)}</td>
      <td class="px-4 py-3">${statusBadge(o.fulfillment_status, FULFILLMENT_TONE)}</td>
      <td class="px-4 py-3 text-right">
        <a href="/admin/order.html?id=${encodeURIComponent(o.order_id)}" class="inline-flex text-navy hover:underline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5.5 7 6.5-7 6.5" /></svg>
        </a>
      </td>
    </tr>`
    )
    .join("");
}

async function load() {
  loading.hidden = false;
  tableWrap.hidden = true;
  noResults.hidden = true;
  errorBanner.hidden = true;

  const query = searchInput.value.trim();
  try {
    const rows = query ? await searchAdminOrders(query) : await listAdminOrders(filterToParams(currentFilter));
    loading.hidden = true;
    renderRows(rows);
  } catch (err) {
    loading.hidden = true;
    errorBanner.hidden = false;
    errorBanner.textContent = getErrorMessage(err);
  }
}

searchInput.addEventListener("input", () => {
  renderFilterButtons();
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(load, 300);
});

renderFilterButtons();
load();
