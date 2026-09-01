// Logic for admin/products.html (ADMIN only).
import { requireAdmin, requireAdminRole } from "../guard.js";
import {
  listAdminProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  upsertProductVariant,
  deleteProductVariant,
  getErrorMessage,
} from "../api.js";
import { openModal } from "../modal.js";

const { profile } = await requireAdmin();

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

if (requireAdminRole(profile)) {
  const loading = document.getElementById("loading");
  const errorBanner = document.getElementById("error-banner");
  const tableWrap = document.getElementById("table-wrap");
  const rows = document.getElementById("product-rows");
  const newProductBtn = document.getElementById("new-product-btn");

  let products = [];

  function renderTable() {
    rows.innerHTML = products
      .map((p) => {
        const stockLabel = p.variant_required ? `${p.variants.reduce((s, v) => s + v.stock, 0)} (by size)` : p.stock;
        return `
        <tr data-id="${escapeHtml(p.product_id)}">
          <td class="px-4 py-3 font-mono text-xs text-muted">${escapeHtml(p.product_id)}</td>
          <td class="px-4 py-3 font-medium text-foreground">${escapeHtml(p.name)}</td>
          <td class="px-4 py-3 text-muted">${escapeHtml(p.category)}</td>
          <td class="px-4 py-3">₱${p.price.toFixed(2)}</td>
          <td class="px-4 py-3">${stockLabel}</td>
          <td class="px-4 py-3"><span class="badge ${p.active ? "badge-success" : "badge-neutral"}">${p.active ? "Active" : "Inactive"}</span></td>
          <td class="px-4 py-3">
            <div class="flex justify-end gap-2">
              ${p.variant_required ? `<button type="button" class="btn btn-outline btn-sm" data-action="sizes">Sizes</button>` : ""}
              <button type="button" class="btn btn-outline btn-sm" data-action="edit">Edit</button>
              <button type="button" class="btn ${p.active ? "btn-danger" : "btn-secondary"} btn-sm" data-action="toggle">${p.active ? "Deactivate" : "Reactivate"}</button>
            </div>
          </td>
        </tr>`;
      })
      .join("");

    rows.querySelectorAll("tr[data-id]").forEach((tr) => {
      const id = tr.dataset.id;
      const product = products.find((p) => p.product_id === id);
      const editBtn = tr.querySelector('[data-action="edit"]');
      const sizesBtn = tr.querySelector('[data-action="sizes"]');
      const toggleBtn = tr.querySelector('[data-action="toggle"]');
      if (editBtn) editBtn.addEventListener("click", () => openProductForm(product));
      if (sizesBtn) sizesBtn.addEventListener("click", () => openVariantEditor(product));
      if (toggleBtn) toggleBtn.addEventListener("click", () => toggleActive(product, toggleBtn));
    });
  }

  function replaceProduct(updated) {
    const idx = products.findIndex((p) => p.product_id === updated.product_id);
    if (idx >= 0) products[idx] = updated;
    else products.push(updated);
    renderTable();
  }

  async function toggleActive(product, btn) {
    btn.disabled = true;
    errorBanner.hidden = true;
    try {
      const updated = product.active ? await deactivateProduct(product.product_id) : await updateProduct(product.product_id, { active: true });
      replaceProduct(updated);
    } catch (err) {
      errorBanner.hidden = false;
      errorBanner.textContent = getErrorMessage(err);
      btn.disabled = false;
    }
  }

  function openProductForm(product) {
    const isEdit = Boolean(product);
    const { body, close } = openModal({
      title: isEdit ? "Edit Product" : "New Product",
      bodyHtml: `
        <form id="product-form" novalidate class="flex flex-col gap-4">
          <div class="field-wrapper">
            <label class="field-label">Product ID</label>
            <input name="product_id" class="input-base" value="${isEdit ? escapeHtml(product.product_id) : ""}" ${isEdit ? "disabled" : ""} placeholder="e.g. VINTA" />
          </div>
          <div class="field-wrapper">
            <label class="field-label">Name</label>
            <input name="name" class="input-base" value="${isEdit ? escapeHtml(product.name) : ""}" />
          </div>
          <div class="field-wrapper">
            <label class="field-label">Description</label>
            <textarea name="description" class="textarea-base">${isEdit ? escapeHtml(product.description) : ""}</textarea>
          </div>
          <div class="field-wrapper">
            <label class="field-label">Category</label>
            <select name="category" class="input-base">
              <option value="SHIRT" ${isEdit && product.category === "SHIRT" ? "selected" : ""}>SHIRT</option>
              <option value="ITEM" ${isEdit && product.category === "ITEM" ? "selected" : ""}>ITEM</option>
            </select>
          </div>
          <div class="field-wrapper">
            <label class="field-label">Price</label>
            <input name="price" type="number" step="0.01" min="0" class="input-base" value="${isEdit ? product.price : ""}" />
          </div>
          <div class="field-wrapper" data-stock-field>
            <label class="field-label">Stock</label>
            <input name="stock" type="number" min="0" class="input-base" value="${isEdit ? product.stock : "0"}" />
            <p class="field-hint">Ignored for shirts / size-based products - manage size stock from "Sizes" after saving.</p>
          </div>
          <div class="field-wrapper">
            <label class="field-label">Image URL (optional)</label>
            <input name="image_url" class="input-base" value="${isEdit ? escapeHtml(product.image_url || "") : ""}" placeholder="https://..." />
          </div>
          <label class="flex items-center gap-2 text-sm font-medium text-foreground">
            <input type="checkbox" name="variant_required" class="h-4 w-4 accent-navy" ${isEdit && product.variant_required ? "checked" : ""} />
            This product needs a size (shirt)
          </label>
          <div id="modal-error" class="error-banner" hidden></div>
          <button type="submit" class="btn btn-primary btn-lg btn-full">${isEdit ? "Save Changes" : "Create Product"}</button>
        </form>
      `,
    });

    const form = body.querySelector("#product-form");
    const modalError = body.querySelector("#modal-error");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      modalError.hidden = true;
      const fd = new FormData(form);
      const payload = {
        name: fd.get("name").trim(),
        description: fd.get("description").trim(),
        category: fd.get("category"),
        price: parseFloat(fd.get("price")),
        stock: parseInt(fd.get("stock"), 10) || 0,
        image_url: fd.get("image_url").trim(),
        variant_required: fd.get("variant_required") === "on",
      };
      try {
        let result;
        if (isEdit) {
          result = await updateProduct(product.product_id, payload);
        } else {
          const productId = fd.get("product_id").trim();
          if (!productId) throw new Error("Product ID is required.");
          result = await createProduct({ product_id: productId, ...payload });
        }
        replaceProduct(result);
        close();
      } catch (err) {
        modalError.hidden = false;
        modalError.textContent = getErrorMessage(err);
      }
    });
  }

  function openVariantEditor(product) {
    function bodyFor(p) {
      const rowsHtml = p.variants
        .map(
          (v) => `
        <li class="flex items-center justify-between gap-3 py-2 text-sm">
          <span class="font-medium text-foreground">${escapeHtml(v.variant)}</span>
          <div class="flex items-center gap-2">
            <input type="number" min="0" class="input-base w-24" value="${v.stock}" data-variant-stock="${escapeHtml(v.variant)}" />
            <button type="button" class="btn btn-outline btn-sm" data-variant-save="${escapeHtml(v.variant)}">Save</button>
            <button type="button" class="btn btn-danger btn-sm" data-variant-delete="${escapeHtml(v.variant)}">Remove</button>
          </div>
        </li>`
        )
        .join("");
      return `
        <ul class="flex flex-col divide-y divide-border mb-4">${rowsHtml || '<li class="py-2 text-sm text-muted">No sizes yet.</li>'}</ul>
        <form id="add-variant-form" class="flex items-end gap-2">
          <div class="field-wrapper flex-1">
            <label class="field-label">New size</label>
            <input name="variant" class="input-base" placeholder="e.g. M" />
          </div>
          <div class="field-wrapper w-24">
            <label class="field-label">Stock</label>
            <input name="stock" type="number" min="0" class="input-base" value="0" />
          </div>
          <button type="submit" class="btn btn-secondary btn-md">Add</button>
        </form>
        <div id="variant-error" class="error-banner mt-3" hidden></div>
      `;
    }

    const { body, close } = openModal({ title: `Sizes - ${product.name}`, bodyHtml: bodyFor(product) });

    function wire(currentProduct) {
      const variantError = body.querySelector("#variant-error");
      body.querySelectorAll("[data-variant-save]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const variant = btn.dataset.variantSave;
          const input = body.querySelector(`[data-variant-stock="${CSS.escape(variant)}"]`);
          const stock = parseInt(input.value, 10) || 0;
          try {
            const updated = await upsertProductVariant(currentProduct.product_id, { variant, stock });
            replaceProduct(updated);
            body.innerHTML = bodyFor(updated);
            wire(updated);
          } catch (err) {
            variantError.hidden = false;
            variantError.textContent = getErrorMessage(err);
          }
        });
      });
      body.querySelectorAll("[data-variant-delete]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const variant = btn.dataset.variantDelete;
          try {
            const updated = await deleteProductVariant(currentProduct.product_id, variant);
            replaceProduct(updated);
            body.innerHTML = bodyFor(updated);
            wire(updated);
          } catch (err) {
            variantError.hidden = false;
            variantError.textContent = getErrorMessage(err);
          }
        });
      });
      const addForm = body.querySelector("#add-variant-form");
      addForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(addForm);
        const variant = fd.get("variant").trim();
        const stock = parseInt(fd.get("stock"), 10) || 0;
        if (!variant) return;
        try {
          const updated = await upsertProductVariant(currentProduct.product_id, { variant, stock });
          replaceProduct(updated);
          body.innerHTML = bodyFor(updated);
          wire(updated);
        } catch (err) {
          variantError.hidden = false;
          variantError.textContent = getErrorMessage(err);
        }
      });
    }
    wire(product);
  }

  newProductBtn.addEventListener("click", () => openProductForm(null));

  try {
    products = await listAdminProducts();
    loading.hidden = true;
    tableWrap.hidden = false;
    renderTable();
  } catch (err) {
    loading.hidden = true;
    errorBanner.hidden = false;
    errorBanner.textContent = getErrorMessage(err);
  }
}
