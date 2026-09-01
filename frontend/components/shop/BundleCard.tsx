"use client";

import { useState } from "react";
import { Bundle } from "@/types";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Badge } from "@/components/ui/Badge";
import { CheckIcon } from "@/components/icons";

export function BundleCard({ bundle }: { bundle: Bundle }) {
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const { addItem } = useCart();

  function handleAdd() {
    addItem({ bundle_id: bundle.bundle_id, quantity, name: bundle.name });
    setJustAdded(true);
    setQuantity(1);
    setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-foreground">{bundle.name}</h3>
          {bundle.description && <p className="mt-0.5 text-sm text-muted">{bundle.description}</p>}
        </div>
        <span className="whitespace-nowrap font-semibold text-navy">₱{bundle.price.toFixed(2)}</span>
      </div>

      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
        {bundle.items.map((item) => (
          <li key={item.product_id}>
            {item.quantity}&times; {item.product_name}
          </li>
        ))}
      </ul>

      {bundle.savings != null && bundle.savings > 0 && (
        <Badge tone="success">You save ₱{bundle.savings.toFixed(2)}</Badge>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <QuantityStepper value={quantity} onChange={setQuantity} />
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
    </div>
  );
}
