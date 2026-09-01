"use client";

import { useState } from "react";
import { Product } from "@/types";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { CheckIcon } from "@/components/icons";

export function ItemCard({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const { addItem } = useCart();
  const soldOut = product.stock <= 0;

  function handleAdd() {
    addItem({ product_id: product.product_id, quantity, name: product.name });
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
        <p className="text-sm font-medium text-danger">Sold out</p>
      ) : (
        <div className="flex items-center justify-between gap-3 pt-1">
          <QuantityStepper value={quantity} onChange={setQuantity} max={product.stock} />
          <Button onClick={handleAdd} className="flex-1 sm:flex-none">
            {justAdded ? (
              <>
                <CheckIcon className="h-4 w-4" /> Added
              </>
            ) : (
              "Add to Cart"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
