// Logic for checkout.html.
import { requireParent } from "../guard.js";
import { calculateCart, checkout, getProfile, ApiError, getErrorMessage } from "../api.js";
import { readCart, toCartLineInputs, clearCart } from "../cart.js";
import { updateCartBadge } from "../nav.js";

await requireParent();

const items = readCart();

const emptyState = document.getElementById("empty-state");
const checkoutContent = document.getElementById("checkout-content");
const summaryLoading = document.getElementById("summary-loading");
const summaryContent = document.getElementById("summary-content");
const summaryLines = document.getElementById("summary-lines");
const summaryTotal = document.getElementById("summary-total");
const calcError = document.getElementById("calc-error");
const form = document.getElementById("checkout-form");
const formError = document.getElementById("form-error");
const submitBtn = document.getElementById("submit-btn");

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

if (items.length === 0) {
  emptyState.hidden = false;
} else {
  checkoutContent.hidden = false;

  // Prefill from the profile as a convenience; failures here are ignored.
  getProfile()
    .then((profile) => {
      form.parentName.value = profile.name || "";
      form.contactNumber.value = profile.phone || "";
    })
    .catch(() => {});

  calculateCart(toCartLineInputs(items))
    .then((data) => {
      summaryLoading.hidden = true;
      summaryContent.hidden = false;
      summaryLines.innerHTML = data.lines
        .map(
          (line) => `<li class="flex justify-between gap-2">
            <span class="text-foreground">${line.quantity}&times; ${escapeHtml(line.name)}${line.variant ? ` (${escapeHtml(line.variant)})` : ""}</span>
            <span class="text-muted">₱${line.subtotal.toFixed(2)}</span>
          </li>`
        )
        .join("");
      summaryTotal.textContent = `₱${data.total_amount.toFixed(2)}`;
    })
    .catch((err) => {
      summaryLoading.hidden = true;
      calcError.hidden = false;
      calcError.textContent = getErrorMessage(err);
      submitBtn.disabled = true;
    });

  document.querySelectorAll('#payment-options input[type="radio"]').forEach((radio) => {
    const label = radio.closest("label");
    if (radio.checked) label.classList.add("selected");
    radio.addEventListener("change", () => {
      document.querySelectorAll("#payment-options label").forEach((l) => l.classList.remove("selected"));
      if (radio.checked) label.classList.add("selected");
    });
  });

  let idempotencyKey = crypto.randomUUID();

  async function submitOrder(key, attempt = 0) {
    try {
      const order = await checkout({
        items: toCartLineInputs(items),
        parent_name: form.parentName.value.trim(),
        contact_number: form.contactNumber.value.trim(),
        payment_method: form.payment_method.value,
        notes: form.notes.value.trim(),
        idempotency_key: key,
      });
      clearCart();
      updateCartBadge();
      window.location.href = `/order.html?id=${encodeURIComponent(order.order_id)}&confirmed=1`;
    } catch (err) {
      // A single automatic retry on a pure network failure, reusing the
      // same idempotency key so a flaky connection can't double-charge.
      if (err instanceof ApiError && err.status === 0 && attempt === 0) {
        await submitOrder(key, 1);
        return;
      }
      throw err;
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.hidden = true;

    if (!form.parentName.value.trim() || !form.contactNumber.value.trim()) {
      formError.hidden = false;
      formError.textContent = "Parent name and contact number are required.";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Placing order...";

    try {
      await submitOrder(idempotencyKey);
    } catch (err) {
      formError.hidden = false;
      formError.textContent = getErrorMessage(err);
      idempotencyKey = crypto.randomUUID();
      submitBtn.disabled = false;
      submitBtn.textContent = "Place Order";
    }
  });
}
