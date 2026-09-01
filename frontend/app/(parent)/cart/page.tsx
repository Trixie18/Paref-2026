"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { useCartCalculation } from "@/hooks/useCartCalculation";
import { PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Spinner } from "@/components/ui/Spinner";
import { TrashIcon } from "@/components/icons";

export default function CartPage() {
  const { items, updateQuantity, removeItem } = useCart();
  const { data, loading, error } = useCartCalculation(items);
  const router = useRouter();

  if (items.length === 0) {
    return (
      <div>
        <PageHeader title="Your Cart" />
        <EmptyState
          title="Your cart is empty"
          description="Add shirts, items, or bundles from the shop."
          action={
            <Link href="/shop">
              <Button size="sm">Go to Shop</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Your Cart" />
      <ErrorBanner message={error} />

      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {items.map((item, index) => {
          const line = data?.lines[index];
          return (
            <li key={item.key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {line?.name ?? item.name}
                  {item.variant ? ` (${item.variant})` : ""}
                </p>
                <p className="text-sm text-muted">
                  {loading ? "Calculating..." : line ? `₱${line.unit_price.toFixed(2)} each` : ""}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <QuantityStepper value={item.quantity} onChange={(q) => updateQuantity(item.key, q)} />
                <span className="w-20 text-right font-medium text-foreground">
                  {line ? `₱${line.subtotal.toFixed(2)}` : "—"}
                </span>
                <button
                  onClick={() => removeItem(item.key)}
                  aria-label={`Remove ${item.name}`}
                  className="p-2 text-muted hover:text-danger"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3.5">
        <span className="font-medium text-foreground">Total</span>
        <span className="text-lg font-semibold text-navy">
          {loading ? <Spinner /> : `₱${(data?.total_amount ?? 0).toFixed(2)}`}
        </span>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/shop" className="sm:order-1">
          <Button variant="outline" fullWidth>
            Continue Shopping
          </Button>
        </Link>
        <Button onClick={() => router.push("/checkout")} disabled={loading || !!error} fullWidth className="sm:w-auto">
          Checkout
        </Button>
      </div>
    </div>
  );
}
