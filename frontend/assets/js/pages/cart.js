// Logic for cart.html. Renders the cart from localStorage, but always
// re-derives displayed prices/subtotals/total from POST /api/cart/calculate
// - never computed locally - since the backend is the sole source of truth
// for pricing.
import { requireParent } from "../guard.js";
import { calculateCart, getErrorMessage } from "../api.js";
import { readCart, updateQuantity, removeItem, toCartLineInputs } from "../cart.js";
import { updateCartBadge } from "../nav.js";

await requireParent();

const emptyState = document.getElementById("empty-state");
const cartContent = document.getElementById("cart-content");
const errorBanner = document.getElementById("error-banner");
const linesEl = document.getElementById("cart-lines");
const totalEl = document.getElementById("cart-total");
const checkoutLink = document.getElementById("checkout-link");

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function render() {
  const items = readCart();

  if (items.length === 0) {
    emptyState.hidden = false;
    cartContent.hidden = true;
    return;
  }

  emptyState.hidden = true;
  cartContent.hidden = false;
  errorBanner.hidden = true;
  totalEl.innerHTML = `<span class="spinner"></span>`;
  checkoutLink.classList.add("btn-primary");
  checkoutLink.removeAttribute("aria-disabled");

  linesEl.innerHTML = items
    .map(
      (item, i) => `
    <li class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" data-key="${escapeHtml(item.key)}">
      <div class="min-w-0">
        <p class="font-medium text-foreground">${escapeHtml(item.name)}${item.variant ? ` (${escapeHtml(item.variant)})` : ""}</p>
        <p class="text-sm text-muted" data-unit-price>Calculating...</p>
      </div>
      <div class="flex items-center justify-between gap-4 sm:justify-end">
        <div class="qty-stepper">
          <button type="button" class="qty-btn" data-action="decrease" aria-label="Decrease quantity">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /></svg>
          </button>
          <span class="qty-value">${item.quantity}</span>
          <button type="button" class="qty-btn" data-action="increase" aria-label="Increase quantity">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
        <span class="w-20 text-right font-medium text-foreground" data-subtotal>—</span>
        <button type="button" class="p-2 text-muted hover:text-danger" data-action="remove" aria-label="Remove ${escapeHtml(item.name)}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5h15" /><path d="M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5" /><path d="M6.5 6.5 7.3 19a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12.5" /></svg>
        </button>
      </div>
    </li>`
    )
    .join("");

  wireLineActions();

  try {
    const data = await calculateCart(toCartLineInputs(items));
    data.lines.forEach((line, i) => {
      const li = linesEl.children[i];
      if (!li) return;
      const priceEl = li.querySelector("[data-unit-price]");
      const subtotalEl = li.querySelector("[data-subtotal]");
      if (priceEl) priceEl.textContent = `₱${line.unit_price.toFixed(2)} each`;
      if (subtotalEl) subtotalEl.textContent = `₱${line.subtotal.toFixed(2)}`;
    });
    totalEl.textContent = `₱${data.total_amount.toFixed(2)}`;
  } catch (err) {
    errorBanner.hidden = false;
    errorBanner.textContent = getErrorMessage(err);
    totalEl.textContent = "—";
    checkoutLink.setAttribute("aria-disabled", "true");
    checkoutLink.addEventListener(
      "click",
      (e) => {
        if (checkoutLink.getAttribute("aria-disabled") === "true") e.preventDefault();
      },
      { once: true }
    );
  }
}

function wireLineActions() {
  linesEl.querySelectorAll("li[data-key]").forEach((li) => {
    const key = li.dataset.key;
    li.querySelector('[data-action="decrease"]').addEventListener("click", async () => {
      const items = readCart();
      const item = items.find((i) => i.key === key);
      if (!item) return;
      updateQuantity(key, item.quantity - 1);
      updateCartBadge();
      await render();
    });
    li.querySelector('[data-action="increase"]').addEventListener("click", async () => {
      const items = readCart();
      const item = items.find((i) => i.key === key);
      if (!item) return;
      updateQuantity(key, item.quantity + 1);
      updateCartBadge();
      await render();
    });
    li.querySelector('[data-action="remove"]').addEventListener("click", async () => {
      removeItem(key);
      updateCartBadge();
      await render();
    });
  });
}

render();
