import { WarningIcon } from "@/components/icons";

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
      <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function InfoBanner({ message, tone = "info" }: { message: string; tone?: "info" | "warning" }) {
  const classes =
    tone === "warning"
      ? "border-accent/30 bg-accent/5 text-accent-dark"
      : "border-navy/20 bg-navy/5 text-navy";
  return <div className={`rounded-md border px-3 py-2.5 text-sm ${classes}`}>{message}</div>;
}
