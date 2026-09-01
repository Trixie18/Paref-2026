"use client";

import { FormEvent, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { createProduct, updateProduct } from "@/services/api/admin";
import { getErrorMessage } from "@/services/api/http";
import { Product, ProductCategory } from "@/types";

export function ProductFormModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: (product: Product) => void;
}) {
  const isEdit = Boolean(product);
  const [productId, setProductId] = useState(product?.product_id ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState<ProductCategory>(product?.category ?? "ITEM");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "0");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [variantRequired, setVariantRequired] = useState(product?.variant_required ?? false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) {
      setError("Name and price are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      let saved: Product;
      if (isEdit && product) {
        saved = await updateProduct(product.product_id, {
          name: name.trim(),
          description: description.trim(),
          category,
          price: Number(price),
          stock: variantRequired ? undefined : Number(stock),
          image_url: imageUrl.trim(),
          variant_required: variantRequired,
        });
      } else {
        if (!productId.trim()) {
          setError("Product ID is required.");
          setSubmitting(false);
          return;
        }
        saved = await createProduct({
          product_id: productId.trim(),
          name: name.trim(),
          description: description.trim(),
          category,
          price: Number(price),
          stock: Number(stock),
          image_url: imageUrl.trim(),
          variant_required: variantRequired,
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
    <Modal title={isEdit ? "Edit Product" : "New Product"} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {!isEdit && (
          <Input
            label="Product ID"
            value={productId}
            onChange={(e) => setProductId(e.target.value.toUpperCase())}
            hint="Unique, uppercase, e.g. MEAL"
          />
        )}
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)}>
          <option value="ITEM">Item</option>
          <option value="SHIRT">Shirt</option>
        </Select>
        <Input label="Price (₱)" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        {!variantRequired && (
          <Input label="Stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
        )}
        <Input label="Image URL (optional)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={variantRequired}
            onChange={(e) => setVariantRequired(e.target.checked)}
            className="h-4 w-4 accent-navy"
          />
          Requires a size (e.g. shirts) — stock is managed per size after saving.
        </label>

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
