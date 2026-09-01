interface Point {
  date: string;
  value: number;
}

/** A deliberately simple inline-SVG line chart — no charting library, no
 * legend, no tooltip. Enough to show a trend at a glance in an admin
 * dashboard, not a general-purpose visualization component. */
export function SimpleLineChart({ points, height = 140 }: { points: Point[]; height?: number }) {
  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No data yet.</p>;
  }

  const width = 480;
  const padding = 24;
  const maxValue = Math.max(...points.map((p) => p.value), 1);
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (p.value / maxValue) * (height - padding * 2);
    return { x, y, point: p };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[320px]" role="img" aria-label="Trend chart">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--color-border)" />
        <path d={path} fill="none" stroke="var(--color-navy)" strokeWidth={2} />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={2.5} fill="var(--color-accent)" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>{points[0]?.date}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </div>
  );
}
