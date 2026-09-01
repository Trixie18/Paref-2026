"use client";

import { FormEvent, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { deleteProductVariant, upsertProductVariant } from "@/services/api/admin";
import { getErrorMessage } from "@/services/api/http";
import { Product } from "@/types";
import { TrashIcon } from "@/components/icons";

export function VariantEditorModal({
  product,
  onClose,
  onUpdated,
}: {
  product: Product;
  onClose: () => void;
  onUpdated: (product: Product) => void;
}) {
  const [current, setCurrent] = useState(product);
  const [variant, setVariant] = useState("");
  const [stock, setStock] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAddOrUpdate(e: FormEvent) {
    e.preventDefault();
    if (!variant.trim()) {
      setError("Size is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const updated = await upsertProductVariant(current.product_id, {
        variant: variant.trim().toUpperCase(),
        stock: Number(stock),
      });
      setCurrent(updated);
      onUpdated(updated);
      setVariant("");
      setStock("0");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(v: string) {
    setError(null);
    try {
      const updated = await deleteProductVariant(current.product_id, v);
      setCurrent(updated);
      onUpdated(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal title={`Sizes — ${current.name}`} onClose={onClose}>
      <ul className="mb-4 flex flex-col divide-y divide-border rounded-md border border-border">
        {current.variants.length === 0 && (
          <li className="px-3 py-3 text-sm text-muted">No sizes configured yet.</li>
        )}
        {current.variants.map((v) => (
          <li key={v.variant} className="flex items-center justify-between px-3 py-2.5 text-sm">
            <span className="font-medium text-foreground">{v.variant}</span>
            <div className="flex items-center gap-3">
              <span className="text-muted">{v.stock} in stock</span>
              <button onClick={() => handleRemove(v.variant)} aria-label={`Remove size ${v.variant}`} className="p-1 text-muted hover:text-danger">
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAddOrUpdate} noValidate className="flex items-end gap-2">
        <div className="flex-1">
          <Input label="Size" placeholder="e.g. M" value={variant} onChange={(e) => setVariant(e.target.value)} />
        </div>
        <div className="w-24">
          <Input label="Stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
        </div>
        <Button type="submit" disabled={submitting}>
          Save
        </Button>
      </form>

      <ErrorBanner message={error} />

      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}
