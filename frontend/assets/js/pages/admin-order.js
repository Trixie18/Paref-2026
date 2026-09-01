// Logic for admin/order.html (ADMIN + STAFF).
import { requireAdmin } from "../guard.js";
import { getAdminOrder, updateOrderStatus, ApiError, getErrorMessage } from "../api.js";
import { renderOrderDetail } from "../order-view.js";

await requireAdmin();

const params = new URLSearchParams(window.location.search);
const orderId = params.get("id");

const loading = document.getElementById("loading");
const errorBanner = document.getElementById("error-banner");
const orderContent = document.getElementById("order-content");
const orderDetailEl = document.getElementById("order-detail");
const claimedBanner = document.getElementById("claimed-banner");
const warningBanner = document.getElementById("warning-banner");
const paymentSelect = document.getElementById("payment-status-select");
const fulfillmentSelect = document.getElementById("fulfillment-status-select");
const updateBtn = document.getElementById("update-btn");

let currentOrder = null;

function renderClaimedBanner(order) {
  if (order.fulfillment_status === "CLAIMED") {
    claimedBanner.hidden = false;
    claimedBanner.textContent = `Already claimed${order.claimed_by ? ` by ${order.claimed_by}` : ""}${
      order.claimed_at ? ` at ${new Date(order.claimed_at).toLocaleString()}` : ""
    }.`;
  } else {
    claimedBanner.hidden = true;
  }
}

async function load() {
  loading.hidden = false;
  errorBanner.hidden = true;
  try {
    const order = await getAdminOrder(orderId);
    currentOrder = order;
    orderDetailEl.innerHTML = renderOrderDetail(order);
    paymentSelect.value = order.payment_status;
    fulfillmentSelect.value = order.fulfillment_status;
    renderClaimedBanner(order);
    loading.hidden = true;
    orderContent.hidden = false;
  } catch (err) {
    loading.hidden = true;
    errorBanner.hidden = false;
    errorBanner.textContent = getErrorMessage(err);
  }
}

updateBtn.addEventListener("click", async () => {
  if (!currentOrder) return;
  errorBanner.hidden = true;
  warningBanner.hidden = true;
  updateBtn.disabled = true;
  updateBtn.textContent = "Updating...";
  try {
    const updated = await updateOrderStatus(currentOrder.order_id, {
      payment_status: paymentSelect.value,
      fulfillment_status: fulfillmentSelect.value,
    });
    currentOrder = updated;
    orderDetailEl.innerHTML = renderOrderDetail(updated);
    renderClaimedBanner(updated);
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      warningBanner.hidden = false;
      warningBanner.textContent = err.message;
      await load();
    } else {
      errorBanner.hidden = false;
      errorBanner.textContent = getErrorMessage(err);
    }
  } finally {
    updateBtn.disabled = false;
    updateBtn.textContent = "Update Status";
  }
});

if (!orderId) {
  loading.hidden = true;
  errorBanner.hidden = false;
  errorBanner.textContent = "No order specified.";
} else {
  load();
}
