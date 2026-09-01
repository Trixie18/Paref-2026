import { PaymentStatus, FulfillmentStatus } from "@/types";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-black/5 text-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-accent/15 text-accent-dark",
  danger: "bg-danger/10 text-danger",
  info: "bg-navy/10 text-navy",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

const paymentTone: Record<PaymentStatus, Tone> = {
  PENDING: "warning",
  PAID: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
};

const fulfillmentTone: Record<FulfillmentStatus, Tone> = {
  PENDING: "warning",
  READY: "info",
  CLAIMED: "success",
  CANCELLED: "neutral",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={paymentTone[status]}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}

export function FulfillmentStatusBadge({ status }: { status: FulfillmentStatus }) {
  return <Badge tone={fulfillmentTone[status]}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}
