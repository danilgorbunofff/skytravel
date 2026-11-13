import { Skeleton } from "../Skeleton";
import { niceAxisMax, pickLabelIndices } from "../../features/admin/chartScale";

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
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">Žádná data k zobrazení.</p>
    );
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

  // Line chart: the line is drawn in a 0–100 viewBox stretched to the plot area,
  // the dots are HTML so they stay round. Both use the same percentages.
  const axisMax = niceAxisMax(Math.max(...data.map((d) => d.value)));
  const xPct = (i: number) => (data.length === 1 ? 50 : (i / (data.length - 1)) * 100);
  const yPct = (value: number) => 100 - (value / axisMax) * 100;
  const ticks = [axisMax, axisMax / 2, 0];
  const labelIndices = pickLabelIndices(data.length);

  return (
    <div className="pt-2">
      <div className="flex gap-2">
        {/* Y axis */}
        <div
          className="relative h-36 w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground"
          aria-hidden="true"
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${yPct(tick)}%` }}
            >
              {Number.isInteger(tick) ? tick : tick.toFixed(1)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          {/* Plot */}
          <div className="relative h-36" aria-hidden="true">
            {ticks.map((tick) => (
              <div
                key={tick}
                className="absolute inset-x-0 border-t border-dashed border-border"
                style={{ top: `${yPct(tick)}%` }}
              />
            ))}
            <svg
              className="absolute inset-0 h-full w-full overflow-visible text-primary"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <polyline
                points={data.map((d, i) => `${xPct(i)},${yPct(d.value)}`).join(" ")}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {data.map((d, i) => (
              <div
                key={`${d.label}-${i}`}
                className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
                style={{ left: `${xPct(i)}%`, top: `${yPct(d.value)}%` }}
                title={`${d.label}: ${d.value}`}
              />
            ))}
          </div>

          {/* X axis (thinned so labels never overlap) */}
          <div className="relative mt-1 h-4 text-xs text-muted-foreground" aria-hidden="true">
            {labelIndices.map((i) => {
              const isFirst = i === 0 && data.length > 1;
              const isLast = i === data.length - 1 && data.length > 1;
              return (
                <span
                  key={i}
                  className={`absolute whitespace-nowrap ${
                    isFirst ? "" : isLast ? "-translate-x-full" : "-translate-x-1/2"
                  }`}
                  style={{ left: `${xPct(i)}%` }}
                >
                  {data[i].label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Data for screen readers */}
      <table className="sr-only">
        <caption>Hodnoty grafu</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={`${d.label}-${i}`}>
              <th scope="row">{d.label}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
