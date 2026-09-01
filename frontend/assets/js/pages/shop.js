// Logic for shop.html: renders shirts (with size selection), individual
// items, and bundles, each with a quantity stepper and an Add to Cart
// button that writes straight into localStorage via cart.js. Nothing
// here computes a price or decides what's in stock - every number comes
// straight from GET /api/products and GET /api/bundles.
import { requireParent } from "../guard.js";
import { listProducts, listBundles, getErrorMessage } from "../api.js";
import { addItem } from "../cart.js";
import { updateCartBadge } from "../nav.js";

await requireParent();

const loading = document.getElementById("loading");
const errorBanner = document.getElementById("error-banner");
const shopContent = document.getElementById("shop-content");

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function money(n) {
  return `₱${Number(n).toFixed(2)}`;
}

function qtyStepper(initial, min, max, onChange) {
  let value = initial;
  const wrap = el("div", "qty-stepper");
  const minusBtn = el("button", "qty-btn");
  minusBtn.type = "button";
  minusBtn.setAttribute("aria-label", "Decrease quantity");
  minusBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /></svg>`;
  const valueSpan = el("span", "qty-value", String(value));
  const plusBtn = el("button", "qty-btn");
  plusBtn.type = "button";
  plusBtn.setAttribute("aria-label", "Increase quantity");
  plusBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>`;

  function refresh() {
    valueSpan.textContent = String(value);
    minusBtn.disabled = value <= min;
    plusBtn.disabled = max !== undefined && max !== null && value >= max;
  }
  minusBtn.addEventListener("click", () => {
    value = Math.max(min, value - 1);
    refresh();
    onChange(value);
  });
  plusBtn.addEventListener("click", () => {
    value = max !== undefined && max !== null ? Math.min(max, value + 1) : value + 1;
    refresh();
    onChange(value);
  });
  refresh();
  wrap.append(minusBtn, valueSpan, plusBtn);
  return { el: wrap, getValue: () => value, setMax: (m) => { max = m; refresh(); } };
}

function addedFlash(button, label) {
  const original = button.textContent;
  button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m4.5 12.8 4.8 4.8L19.5 7.3" /></svg> Added`;
  setTimeout(() => {
    button.textContent = label;
  }, 1500);
}

// Products/bundles with no image_url just get a plain placeholder block -
// the app never requires a local image to function (see
// assets/images/README.md). A set image_url is used exactly as the
// backend returns it, in a normal <img>.
function productImageHtml(product) {
  if (product.image_url) {
    return `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" class="h-32 w-full rounded-md object-cover" />`;
  }
  return `<div class="placeholder-block">No image</div>`;
}

function renderShirtCard(product) {
  const card = el("div", "card flex flex-col gap-3 p-4");
  card.innerHTML = productImageHtml(product);
  const availableVariants = product.variants.filter((v) => v.stock > 0);
  let selectedVariant = availableVariants[0]?.variant || "";

  const head = el(
    "div",
    "flex items-start justify-between gap-2",
    `<div><h3 class="font-medium text-foreground">${escapeHtml(product.name)}</h3><p class="mt-0.5 text-sm text-muted">${escapeHtml(product.description)}</p></div>
     <span class="whitespace-nowrap font-semibold text-navy">${money(product.price)}</span>`
  );
  card.append(head);

  if (availableVariants.length === 0) {
    card.append(el("p", "text-sm font-medium text-danger", "Sold out in all sizes"));
    return card;
  }

  const sizeWrap = el("div");
  sizeWrap.append(el("p", "mb-1.5 text-xs font-medium uppercase tracking-wide text-muted", "Size"));
  const sizeBtns = el("div", "flex flex-wrap gap-2");
  const stockNote = el("p", "mt-1 text-xs text-muted");

  function updateStockNote() {
    const v = product.variants.find((v) => v.variant === selectedVariant);
    stockNote.textContent = v ? `${v.stock} left in size ${v.variant}` : "";
  }

  const buttons = product.variants.map((v) => {
    const btn = el("button", "size-btn", escapeHtml(v.variant));
    btn.type = "button";
    if (v.stock === 0) btn.disabled = true;
    if (v.variant === selectedVariant) btn.classList.add("selected");
    btn.addEventListener("click", () => {
      selectedVariant = v.variant;
      buttons.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      updateStockNote();
      const sv = product.variants.find((x) => x.variant === selectedVariant);
      stepper.setMax(sv ? sv.stock : 1);
    });
    sizeBtns.append(btn);
    return btn;
  });
  updateStockNote();
  sizeWrap.append(sizeBtns, stockNote);
  card.append(sizeWrap);

  const actionRow = el("div", "flex items-center justify-between gap-3 pt-1");
  const initialVariant = product.variants.find((v) => v.variant === selectedVariant);
  const stepper = qtyStepper(1, 1, initialVariant ? initialVariant.stock : 1, () => {});
  const addBtn = el("button", "btn btn-primary btn-md flex-1 sm:flex-none", "Add to Cart");
  addBtn.type = "button";
  addBtn.addEventListener("click", () => {
    if (!selectedVariant) return;
    addItem({
      product_id: product.product_id,
      variant: selectedVariant,
      quantity: stepper.getValue(),
      name: `${product.name} (${selectedVariant})`,
    });
    updateCartBadge();
    addedFlash(addBtn, "Add to Cart");
  });
  actionRow.append(stepper.el, addBtn);
  card.append(actionRow);

  return card;
}

function renderItemCard(product) {
  const card = el("div", "card flex flex-col gap-3 p-4");
  card.innerHTML = productImageHtml(product);
  const soldOut = product.stock <= 0;
  card.append(
    el(
      "div",
      "flex items-start justify-between gap-2",
      `<div><h3 class="font-medium text-foreground">${escapeHtml(product.name)}</h3><p class="mt-0.5 text-sm text-muted">${escapeHtml(product.description)}</p></div>
       <span class="whitespace-nowrap font-semibold text-navy">${money(product.price)}</span>`
    )
  );

  if (soldOut) {
    card.append(el("p", "text-sm font-medium text-danger", "Sold out"));
    return card;
  }

  const actionRow = el("div", "flex items-center justify-between gap-3 pt-1");
  const stepper = qtyStepper(1, 1, product.stock, () => {});
  const addBtn = el("button", "btn btn-primary btn-md flex-1 sm:flex-none", "Add to Cart");
  addBtn.type = "button";
  addBtn.addEventListener("click", () => {
    addItem({ product_id: product.product_id, quantity: stepper.getValue(), name: product.name });
    updateCartBadge();
    addedFlash(addBtn, "Add to Cart");
  });
  actionRow.append(stepper.el, addBtn);
  card.append(actionRow);
  return card;
}

function renderBundleCard(bundle) {
  const card = el("div", "card flex flex-col gap-3 p-4");
  const itemsList = bundle.items.map((i) => `<li>${i.quantity}&times; ${escapeHtml(i.product_name)}</li>`).join("");
  card.innerHTML = `
    <div class="flex items-start justify-between gap-2">
      <div>
        <h3 class="font-medium text-foreground">${escapeHtml(bundle.name)}</h3>
        ${bundle.description ? `<p class="mt-0.5 text-sm text-muted">${escapeHtml(bundle.description)}</p>` : ""}
      </div>
      <span class="whitespace-nowrap font-semibold text-navy">${money(bundle.price)}</span>
    </div>
    <ul class="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">${itemsList}</ul>
    ${bundle.savings != null && bundle.savings > 0 ? `<span class="badge badge-success w-fit">You save ${money(bundle.savings)}</span>` : ""}
  `;

  const actionRow = el("div", "flex items-center justify-between gap-3 pt-1");
  const stepper = qtyStepper(1, 1, undefined, () => {});
  const addBtn = el("button", "btn btn-primary btn-md flex-1 sm:flex-none", "Add to Cart");
  addBtn.type = "button";
  addBtn.addEventListener("click", () => {
    addItem({ bundle_id: bundle.bundle_id, quantity: stepper.getValue(), name: bundle.name });
    updateCartBadge();
    addedFlash(addBtn, "Add to Cart");
  });
  actionRow.append(stepper.el, addBtn);
  card.append(actionRow);
  return card;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

try {
  const [products, bundles] = await Promise.all([listProducts(), listBundles()]);
  loading.hidden = true;
  shopContent.hidden = false;

  const shirts = products.filter((p) => p.category === "SHIRT");
  const items = products.filter((p) => p.category === "ITEM");

  const shirtsGrid = document.getElementById("shirts-grid");
  const itemsGrid = document.getElementById("items-grid");
  const bundlesGrid = document.getElementById("bundles-grid");

  if (shirts.length === 0) document.getElementById("shirts-empty").hidden = false;
  else shirts.forEach((p) => shirtsGrid.append(renderShirtCard(p)));

  if (items.length === 0) document.getElementById("items-empty").hidden = false;
  else items.forEach((p) => itemsGrid.append(renderItemCard(p)));

  if (bundles.length === 0) document.getElementById("bundles-empty").hidden = false;
  else bundles.forEach((b) => bundlesGrid.append(renderBundleCard(b)));
} catch (err) {
  loading.hidden = true;
  errorBanner.hidden = false;
  errorBanner.textContent = getErrorMessage(err);
}
