// Deliberately simple inline-SVG charts - no charting library, no
// legend, no tooltip. Enough to show a trend at a glance in an admin
// dashboard. Ports frontend/components/admin/SimpleLineChart.tsx and
// SimpleBarChart.tsx.

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** points: [{date, value}] */
export function lineChart(points, height = 140) {
  if (!points || points.length === 0) {
    return `<p class="py-8 text-center text-sm text-muted">No data yet.</p>`;
  }

  const width = 480;
  const padding = 24;
  const maxValue = Math.max(...points.map((p) => p.value), 1);
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (p.value / maxValue) * (height - padding * 2);
    return { x, y };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const circles = coords.map((c) => `<circle cx="${c.x}" cy="${c.y}" r="2.5" fill="var(--color-accent)" />`).join("");

  return `
    <div class="overflow-x-auto">
      <svg viewBox="0 0 ${width} ${height}" class="w-full min-w-[320px]" role="img" aria-label="Trend chart">
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="var(--color-border)" />
        <path d="${path}" fill="none" stroke="var(--color-navy)" stroke-width="2" />
        ${circles}
      </svg>
      <div class="mt-1 flex justify-between text-xs text-muted">
        <span>${escapeHtml(points[0]?.date)}</span>
        <span>${escapeHtml(points[points.length - 1]?.date)}</span>
      </div>
    </div>
  `;
}

/** data: [{label, value}] */
export function barChart(data, formatValue = (v) => v.toLocaleString()) {
  if (!data || data.length === 0) {
    return `<p class="py-8 text-center text-sm text-muted">No data yet.</p>`;
  }
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return `
    <div class="flex flex-col gap-2.5">
      ${data
        .map(
          (d) => `
        <div class="flex items-center gap-3">
          <span class="w-28 shrink-0 truncate text-sm text-foreground" title="${escapeHtml(d.label)}">${escapeHtml(d.label)}</span>
          <div class="h-2.5 flex-1 rounded-full bg-black/5">
            <div class="h-2.5 rounded-full bg-navy" style="width: ${Math.max((d.value / maxValue) * 100, 2)}%"></div>
          </div>
          <span class="w-20 shrink-0 text-right text-sm font-medium text-foreground">${escapeHtml(formatValue(d.value))}</span>
        </div>`
        )
        .join("")}
    </div>
  `;
}
