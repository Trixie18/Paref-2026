interface BarDatum {
  label: string;
  value: number;
}

/** Simple horizontal bar list — proportional bar widths, value labels.
 * Intentionally minimal for an internal admin dashboard. */
export function SimpleBarChart({
  data,
  formatValue = (v: number) => v.toLocaleString(),
}: {
  data: BarDatum[];
  formatValue?: (value: number) => string;
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No data yet.</p>;
  }
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-sm text-foreground" title={d.label}>
            {d.label}
          </span>
          <div className="h-2.5 flex-1 rounded-full bg-black/5">
            <div
              className="h-2.5 rounded-full bg-navy"
              style={{ width: `${Math.max((d.value / maxValue) * 100, 2)}%` }}
            />
          </div>
          <span className="w-20 shrink-0 text-right text-sm font-medium text-foreground">{formatValue(d.value)}</span>
        </div>
      ))}
    </div>
  );
}
