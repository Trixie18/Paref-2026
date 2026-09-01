"use client";

import { useEffect, useState } from "react";
import { listAdminProducts, updateProduct, deactivateProduct } from "@/services/api/admin";
import { getErrorMessage } from "@/services/api/http";
import { Product } from "@/types";
import { PageHeader } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProductFormModal } from "@/components/admin/ProductFormModal";
import { VariantEditorModal } from "@/components/admin/VariantEditorModal";
import { PlusIcon } from "@/components/icons";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [managingSizes, setManagingSizes] = useState<Product | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Resets loading/error before a real fetch — also used as a manual
  // retry, so it can't be replaced by a lazy initial value.
  function load() {
    setLoading(true);
    listAdminProducts()
      .then(setProducts)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, []);

  function replaceProduct(updated: Product) {
    setProducts((prev) => {
      const exists = prev.some((p) => p.product_id === updated.product_id);
      return exists ? prev.map((p) => (p.product_id === updated.product_id ? updated : p)) : [...prev, updated];
    });
  }

  async function toggleActive(product: Product) {
    setBusyId(product.product_id);
    setError(null);
    try {
      if (product.active) {
        const updated = await deactivateProduct(product.product_id);
        replaceProduct(updated);
      } else {
        const updated = await updateProduct(product.product_id, { active: true });
        replaceProduct(updated);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <PlusIcon className="h-4 w-4" /> New Product
          </Button>
        }
      />

      <ErrorBanner message={error} />

      {loading ? (
        <PageSpinner />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => (
                <tr key={product.product_id}>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{product.product_id}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{product.name}</td>
                  <td className="px-4 py-3 text-muted">{product.category}</td>
                  <td className="px-4 py-3">₱{product.price.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {product.variant_required
                      ? `${product.variants.reduce((s, v) => s + v.stock, 0)} (by size)`
                      : product.stock}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={product.active ? "success" : "neutral"}>{product.active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {product.variant_required && (
                        <Button size="sm" variant="outline" onClick={() => setManagingSizes(product)}>
                          Sizes
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setEditing(product)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={product.active ? "danger" : "secondary"}
                        disabled={busyId === product.product_id}
                        onClick={() => toggleActive(product)}
                      >
                        {product.active ? "Deactivate" : "Reactivate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <ProductFormModal
          product={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={(product) => {
            replaceProduct(product);
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {managingSizes && (
        <VariantEditorModal
          product={managingSizes}
          onClose={() => setManagingSizes(null)}
          onUpdated={(product) => {
            replaceProduct(product);
            setManagingSizes(product);
          }}
        />
      )}
    </div>
  );
}
