// Logic for admin/bundles.html (ADMIN only).
import { requireAdmin, requireAdminRole } from "../guard.js";
import { listAdminBundles, listAdminProducts, createBundle, updateBundle, getErrorMessage } from "../api.js";
import { openModal } from "../modal.js";
import { wireLiveSearch } from "../search.js";

const { profile } = await requireAdmin();

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

if (requireAdminRole(profile)) {
  const loading = document.getElementById("loading");
  const errorBanner = document.getElementById("error-banner");
  const grid = document.getElementById("bundle-grid");
  const noResults = document.getElementById("no-results");
  const searchInput = document.getElementById("search-input");
  const newBundleBtn = document.getElementById("new-bundle-btn");

  let bundles = [];
  let allProducts = [];

  function renderGrid(list = bundles) {
    grid.hidden = list.length === 0;
    noResults.hidden = list.length !== 0;
    grid.innerHTML = list
      .map(
        (b) => `
      <div class="card flex flex-col gap-2 p-4" data-id="${escapeHtml(b.bundle_id)}">
        <div class="flex items-start justify-between gap-2">
          <div>
            <h3 class="font-medium text-foreground">${escapeHtml(b.name)}</h3>
            <p class="text-xs text-muted">${escapeHtml(b.bundle_id)}</p>
          </div>
          <span class="badge ${b.active ? "badge-success" : "badge-neutral"}">${b.active ? "Active" : "Inactive"}</span>
        </div>
        <p class="text-sm text-muted">${escapeHtml(b.description || "")}</p>
        <ul class="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
          ${b.items.map((i) => `<li>${i.quantity}&times; ${escapeHtml(i.product_name)}</li>`).join("")}
        </ul>
        <div class="flex items-center justify-between pt-1">
          <span class="font-semibold text-navy">₱${b.price.toFixed(2)}</span>
          <div class="flex gap-2">
            <button type="button" class="btn btn-outline btn-sm" data-action="edit">Edit</button>
            <button type="button" class="btn ${b.active ? "btn-danger" : "btn-secondary"} btn-sm" data-action="toggle">${b.active ? "Deactivate" : "Reactivate"}</button>
          </div>
        </div>
      </div>`
      )
      .join("");

    grid.querySelectorAll("[data-id]").forEach((card) => {
      const id = card.dataset.id;
      const bundle = bundles.find((b) => b.bundle_id === id);
      card.querySelector('[data-action="edit"]').addEventListener("click", () => openBundleForm(bundle));
      card.querySelector('[data-action="toggle"]').addEventListener("click", (e) => toggleActive(bundle, e.target));
    });
  }

  function replaceBundle(updated) {
    const idx = bundles.findIndex((b) => b.bundle_id === updated.bundle_id);
    if (idx >= 0) bundles[idx] = updated;
    else bundles.push(updated);
    applySearch();
  }

  const applySearch = wireLiveSearch(searchInput, {
    getItems: () => bundles,
    matches: (b, q) =>
      b.bundle_id.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q) ||
      (b.description || "").toLowerCase().includes(q) ||
      b.items.some((i) => i.product_name.toLowerCase().includes(q)),
    onFilter: (filtered) => renderGrid(filtered),
  });

  async function toggleActive(bundle, btn) {
    btn.disabled = true;
    errorBanner.hidden = true;
    try {
      const updated = await updateBundle(bundle.bundle_id, { active: !bundle.active });
      replaceBundle(updated);
    } catch (err) {
      errorBanner.hidden = false;
      errorBanner.textContent = getErrorMessage(err);
      btn.disabled = false;
    }
  }

  function itemRowHtml(productId, quantity) {
    const options = allProducts
      .map((p) => `<option value="${escapeHtml(p.product_id)}" ${p.product_id === productId ? "selected" : ""}>${escapeHtml(p.name)}</option>`)
      .join("");
    return `
      <li class="flex items-end gap-2" data-item-row>
        <div class="field-wrapper flex-1">
          <label class="field-label">Product</label>
          <select class="input-base" data-item-product>${options}</select>
        </div>
        <div class="field-wrapper w-24">
          <label class="field-label">Qty</label>
          <input type="number" min="1" class="input-base" data-item-qty value="${quantity}" />
        </div>
        <button type="button" class="btn btn-outline btn-sm" data-item-remove>Remove</button>
      </li>`;
  }

  function openBundleForm(bundle) {
    const isEdit = Boolean(bundle);
    const initialItems = isEdit ? bundle.items.map((i) => [i.product_id, i.quantity]) : [];

    const { body, close } = openModal({
      wide: true,
      title: isEdit ? "Edit Bundle" : "New Bundle",
      bodyHtml: `
        <form id="bundle-form" novalidate class="flex flex-col gap-4">
          <div class="field-wrapper">
            <label class="field-label">Bundle ID</label>
            <input name="bundle_id" class="input-base" value="${isEdit ? escapeHtml(bundle.bundle_id) : ""}" ${isEdit ? "disabled" : ""} placeholder="e.g. BUNDLE-5" />
          </div>
          <div class="field-wrapper">
            <label class="field-label">Name</label>
            <input name="name" class="input-base" value="${isEdit ? escapeHtml(bundle.name) : ""}" />
          </div>
          <div class="field-wrapper">
            <label class="field-label">Description</label>
            <textarea name="description" class="textarea-base">${isEdit ? escapeHtml(bundle.description || "") : ""}</textarea>
          </div>
          <div class="field-wrapper">
            <label class="field-label">Price</label>
            <input name="price" type="number" step="0.01" min="0" class="input-base" value="${isEdit ? bundle.price : ""}" />
          </div>
          <div>
            <p class="mb-1.5 text-sm font-medium text-foreground">Items</p>
            <ul id="item-rows" class="flex flex-col gap-2"></ul>
            <button type="button" id="add-item-row" class="btn btn-outline btn-sm mt-2">Add item</button>
          </div>
          <div id="modal-error" class="error-banner" hidden></div>
          <button type="submit" class="btn btn-primary btn-lg btn-full">${isEdit ? "Save Changes" : "Create Bundle"}</button>
        </form>
      `,
    });

    const form = body.querySelector("#bundle-form");
    const itemRows = body.querySelector("#item-rows");
    const modalError = body.querySelector("#modal-error");

    function addRow(productId, quantity) {
      const li = document.createElement("div");
      li.innerHTML = itemRowHtml(productId || allProducts[0]?.product_id || "", quantity || 1);
      const row = li.firstElementChild;
      itemRows.append(row);
      row.querySelector("[data-item-remove]").addEventListener("click", () => row.remove());
    }

    if (initialItems.length > 0) initialItems.forEach(([pid, qty]) => addRow(pid, qty));
    else addRow();

    body.querySelector("#add-item-row").addEventListener("click", () => addRow());

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      modalError.hidden = true;
      const fd = new FormData(form);
      const items = Array.from(itemRows.querySelectorAll("[data-item-row]")).map((row) => ({
        product_id: row.querySelector("[data-item-product]").value,
        quantity: parseInt(row.querySelector("[data-item-qty]").value, 10) || 1,
      }));
      const payload = {
        name: fd.get("name").trim(),
        description: fd.get("description").trim(),
        price: parseFloat(fd.get("price")),
        items,
      };
      try {
        let result;
        if (isEdit) {
          result = await updateBundle(bundle.bundle_id, payload);
        } else {
          const bundleId = fd.get("bundle_id").trim();
          if (!bundleId) throw new Error("Bundle ID is required.");
          result = await createBundle({ bundle_id: bundleId, ...payload });
        }
        replaceBundle(result);
        close();
      } catch (err) {
        modalError.hidden = false;
        modalError.textContent = getErrorMessage(err);
      }
    });
  }

  newBundleBtn.addEventListener("click", () => openBundleForm(null));

  try {
    [bundles, allProducts] = await Promise.all([listAdminBundles(), listAdminProducts()]);
    loading.hidden = true;
    renderGrid();
  } catch (err) {
    loading.hidden = true;
    errorBanner.hidden = false;
    errorBanner.textContent = getErrorMessage(err);
  }
}
