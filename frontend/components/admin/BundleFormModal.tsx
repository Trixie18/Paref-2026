"use client";

import { FormEvent, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { createBundle, listAdminProducts, updateBundle } from "@/services/api/admin";
import { getErrorMessage } from "@/services/api/http";
import { Bundle, BundleItemInput, Product } from "@/types";
import { PlusIcon, TrashIcon } from "@/components/icons";

export function BundleFormModal({
  bundle,
  onClose,
  onSaved,
}: {
  bundle: Bundle | null;
  onClose: () => void;
  onSaved: (bundle: Bundle) => void;
}) {
  const isEdit = Boolean(bundle);
  const [bundleId, setBundleId] = useState(bundle?.bundle_id ?? "");
  const [name, setName] = useState(bundle?.name ?? "");
  const [description, setDescription] = useState(bundle?.description ?? "");
  const [price, setPrice] = useState(bundle ? String(bundle.price) : "");
  const [items, setItems] = useState<BundleItemInput[]>(
    bundle?.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })) ?? []
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listAdminProducts()
      .then(setProducts)
      .catch((err) => setProductsError(getErrorMessage(err)))
      .finally(() => setProductsLoading(false));
  }, []);

  function addItemRow() {
    if (products.length === 0) return;
    setItems((prev) => [...prev, { product_id: products[0].product_id, quantity: 1 }]);
  }

  function updateItem(index: number, patch: Partial<BundleItemInput>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price || items.length === 0) {
      setError("Name, price, and at least one item are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      let saved: Bundle;
      if (isEdit && bundle) {
        saved = await updateBundle(bundle.bundle_id, {
          name: name.trim(),
          description: description.trim(),
          price: Number(price),
          items,
        });
      } else {
        if (!bundleId.trim()) {
          setError("Bundle ID is required.");
          setSubmitting(false);
          return;
        }
        saved = await createBundle({
          bundle_id: bundleId.trim(),
          name: name.trim(),
          description: description.trim(),
          price: Number(price),
          items,
        });
      }
      onSaved(saved);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Bundle" : "New Bundle"} onClose={onClose} wide>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {!isEdit && (
          <Input
            label="Bundle ID"
            value={bundleId}
            onChange={(e) => setBundleId(e.target.value.toUpperCase())}
            hint="Unique, e.g. BUNDLE-5"
          />
        )}
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input label="Price (₱)" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Included items</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addItemRow}
              disabled={productsLoading || products.length === 0}
            >
              <PlusIcon className="h-4 w-4" /> Add Item
            </Button>
          </div>
          {productsError && (
            <p className="mb-2 text-sm text-danger">Couldn&apos;t load products: {productsError}</p>
          )}
          {!productsLoading && !productsError && products.length === 0 && (
            <p className="mb-2 text-sm text-muted">
              No products exist yet — create one under Products before adding bundle items.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    label="Product"
                    value={item.product_id}
                    onChange={(e) => updateItem(index, { product_id: e.target.value })}
                  >
                    {products.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-24">
                  <Input
                    label="Qty"
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  aria-label="Remove item"
                  className="mb-1.5 p-2 text-muted hover:text-danger"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
            {items.length === 0 && <p className="text-sm text-muted">No items added yet.</p>}
          </div>
        </div>

        <ErrorBanner message={error} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
