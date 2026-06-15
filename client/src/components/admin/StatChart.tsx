import { Skeleton } from "../Skeleton";

interface StatChartProps {
  type: "bar" | "line";
  data: { label: string; value: number }[];
  loading?: boolean;
  error?: string;
}

export function StatChart({ type, data, loading, error }: StatChartProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nepodařilo se načíst data: {error}
      </p>
    );
  }

  if (!data || data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Žádná data k zobrazení.</p>;
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  if (type === "bar") {
    return (
      <div className="space-y-3">
        {data.map((d) => (
          <div key={d.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{d.label}</span>
              <strong>{d.value}</strong>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(d.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Simple line chart using CSS
  const points = data.map((d, i) => ({
    x: `${(i / Math.max(data.length - 1, 1)) * 100}%`,
    y: `${100 - (d.value / maxValue) * 80}%`,
    label: d.label,
    value: d.value,
  }));

  return (
    <div className="relative pt-4">
      <div className="relative h-32">
        {points.map((p, i) => (
          <div
            key={i}
            className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
            style={{ left: p.x, top: p.y }}
            title={`${p.label}: ${p.value}`}
          />
        ))}
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
          <polyline
            points={points
              .map((p) => {
                const x = (parseFloat(p.x) / 100) * 100;
                const y = (parseFloat(p.y) / 100) * 128;
                return `${x},${y}`;
              })
              .join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          />
        </svg>
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}
