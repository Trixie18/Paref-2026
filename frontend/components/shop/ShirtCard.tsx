"use client";

import { useState } from "react";
import { Product } from "@/types";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { CheckIcon } from "@/components/icons";

export function ShirtCard({ product }: { product: Product }) {
  const availableVariants = product.variants.filter((v) => v.stock > 0);
  const [variant, setVariant] = useState<string>(availableVariants[0]?.variant ?? "");
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const { addItem } = useCart();

  const selectedVariant = product.variants.find((v) => v.variant === variant);
  const soldOut = availableVariants.length === 0;

  function handleAdd() {
    if (!variant) return;
    addItem({ product_id: product.product_id, variant, quantity, name: `${product.name} (${variant})` });
    setJustAdded(true);
    setQuantity(1);
    setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-foreground">{product.name}</h3>
          <p className="mt-0.5 text-sm text-muted">{product.description}</p>
        </div>
        <span className="whitespace-nowrap font-semibold text-navy">₱{product.price.toFixed(2)}</span>
      </div>

      {soldOut ? (
        <p className="text-sm font-medium text-danger">Sold out in all sizes</p>
      ) : (
        <>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Size</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.variant}
                  type="button"
                  disabled={v.stock === 0}
                  onClick={() => setVariant(v.variant)}
                  className={`flex h-10 min-w-11 items-center justify-center rounded-md border px-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                    variant === v.variant ? "border-navy bg-navy text-white" : "border-border text-foreground hover:border-navy"
                  }`}
                >
                  {v.variant}
                </button>
              ))}
            </div>
            {selectedVariant && (
              <p className="mt-1 text-xs text-muted">{selectedVariant.stock} left in size {selectedVariant.variant}</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <QuantityStepper value={quantity} onChange={setQuantity} max={selectedVariant?.stock} />
            <Button onClick={handleAdd} disabled={!variant} className="flex-1 sm:flex-none">
              {justAdded ? (
                <>
                  <CheckIcon className="h-4 w-4" /> Added
                </>
              ) : (
                "Add to Cart"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
