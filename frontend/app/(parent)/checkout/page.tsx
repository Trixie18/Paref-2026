"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { useCartCalculation, toCartLineInputs } from "@/hooks/useCartCalculation";
import { checkout } from "@/services/api/orders";
import { getProfile } from "@/services/api/auth";
import { ApiError, getErrorMessage } from "@/services/api/http";
import { PaymentMethod } from "@/types";
import { PageHeader } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

const paymentOptions: { value: PaymentMethod; label: string }[] = [
  { value: "GCASH", label: "GCash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CASH_AT_EVENT", label: "Cash at Event" },
];

export default function CheckoutPage() {
  const { items, clear } = useCart();
  const { data, loading: calculating, error: calcError } = useCartCalculation(items);
  const router = useRouter();

  const [parentName, setParentName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("GCASH");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());

  useEffect(() => {
    getProfile()
      .then((profile) => {
        setParentName(profile.name);
        setContactNumber(profile.phone);
      })
      .catch(() => {
        // Prefill is a convenience only; ignore failures here.
      });
  }, []);

  async function submitOrder(key: string, attempt = 0): Promise<void> {
    try {
      const order = await checkout({
        items: toCartLineInputs(items),
        parent_name: parentName.trim(),
        contact_number: contactNumber.trim(),
        payment_method: paymentMethod,
        notes: notes.trim(),
        idempotency_key: key,
      });
      clear();
      router.replace(`/orders/${order.order_id}/confirmation`);
    } catch (err) {
      // A single automatic retry on a pure network failure, reusing the
      // same idempotency key so a flaky connection can't double-charge.
      if (err instanceof ApiError && err.status === 0 && attempt === 0) {
        await submitOrder(key, 1);
        return;
      }
      throw err;
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!parentName.trim() || !contactNumber.trim()) {
      setError("Parent name and contact number are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await submitOrder(idempotencyKey);
    } catch (err) {
      setError(getErrorMessage(err));
      // Fresh key for the next distinct attempt the user makes.
      setIdempotencyKey(crypto.randomUUID());
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div>
        <PageHeader title="Checkout" />
        <EmptyState title="Your cart is empty" description="Add something from the shop before checking out." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Checkout" />

      <div className="mb-6 rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-navy">Order Summary</h2>
        {calculating ? (
          <PageSpinner />
        ) : (
          <>
            <ul className="flex flex-col gap-1.5 text-sm">
              {data?.lines.map((line, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="text-foreground">
                    {line.quantity}&times; {line.name}
                    {line.variant ? ` (${line.variant})` : ""}
                  </span>
                  <span className="text-muted">₱{line.subtotal.toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold text-navy">
              <span>Total</span>
              <span>₱{(data?.total_amount ?? 0).toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      <ErrorBanner message={calcError} />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input label="Parent name" value={parentName} onChange={(e) => setParentName(e.target.value)} />
        <Input
          label="Contact number"
          type="tel"
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value)}
        />

        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Payment method</p>
          <div className="flex flex-col gap-2">
            {paymentOptions.map((option) => (
              <label
                key={option.value}
                className={`flex h-12 items-center gap-3 rounded-md border px-3 text-sm font-medium ${
                  paymentMethod === option.value ? "border-navy bg-navy/5" : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value={option.value}
                  checked={paymentMethod === option.value}
                  onChange={() => setPaymentMethod(option.value)}
                  className="h-4 w-4 accent-navy"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <ErrorBanner message={error} />

        <Button type="submit" size="lg" disabled={submitting || calculating} fullWidth>
          {submitting ? "Placing order..." : "Place Order"}
        </Button>
      </form>
    </div>
  );
}
