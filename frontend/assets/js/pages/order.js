// Logic for order.html - doubles as the post-checkout confirmation page
// (when ?confirmed=1 is present, added by checkout.js's redirect) and as
// the plain historical order-detail page reached from orders.html.
import { requireParent } from "../guard.js";
import { getOrder, getErrorMessage } from "../api.js";
import { renderOrderDetail } from "../order-view.js";

await requireParent();

const params = new URLSearchParams(window.location.search);
const orderId = params.get("id");
const confirmed = params.get("confirmed") === "1";

const loading = document.getElementById("loading");
const errorBanner = document.getElementById("error-banner");
const detailEl = document.getElementById("order-detail");
const pageHeading = document.getElementById("page-heading");

if (confirmed) {
  document.getElementById("confirmation-banner").hidden = false;
  pageHeading.hidden = true;
}

if (!orderId) {
  loading.hidden = true;
  errorBanner.hidden = false;
  errorBanner.textContent = "No order specified.";
} else {
  try {
    const order = await getOrder(orderId);
    loading.hidden = true;
    detailEl.hidden = false;
    detailEl.innerHTML = renderOrderDetail(order);
    if (confirmed) document.getElementById("confirmation-actions").hidden = false;
  } catch (err) {
    loading.hidden = true;
    errorBanner.hidden = false;
    errorBanner.textContent = getErrorMessage(err);
  }
}
