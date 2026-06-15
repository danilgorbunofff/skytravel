import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { fetchStatistics, type StatisticsData } from "@/features/admin/services/adminApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { SkipToContent } from "../components/SkipToContent";
import { StatCard } from "../components/admin/StatCard";
import { StatChart } from "../components/admin/StatChart";


const periods: { value: "30" | "90" | "year"; label: string }[] = [
  { value: "30", label: "30 dní" },
  { value: "90", label: "90 dní" },
  { value: "year", label: "Rok" },
];

export default function AdminStatisticsPage() {
  const [period, setPeriod] = useState<"30" | "90" | "year">("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StatisticsData | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchStatistics(period)
      .then((result) => setData(result))
      .catch((err) => setError(err instanceof Error ? err.message : "Neznámá chyba"))
      .finally(() => setLoading(false));
  }, [period]);

  const cardLoading = loading && !data;
  const cardError = error && !data;

  return (
    <AdminLayout title="Statistiky & výkon">
      <SkipToContent />
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Statistiky</CardTitle>
              <CardDescription>
                Google Analytics + ruční metriky k poptávkám a e-mailům.
              </CardDescription>
            </div>
            <div className="flex gap-1">
              {periods.map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  variant={period === p.value ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setPeriod(p.value)}
                  disabled={loading}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error state */}
          {cardError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
              <p className="text-sm font-medium text-destructive">
                Nepodařilo se načíst statistiky: {error}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  fetchStatistics(period)
                    .then((result) => setData(result))
                    .catch((err) => setError(err instanceof Error ? err.message : "Neznámá chyba"))
                    .finally(() => setLoading(false));
                }}
              >
                Zkusit znovu
              </Button>
            </div>
          )}

          {/* KPI tiles */}
          <ErrorBoundary key="kpi-cards" onReset={() => window.location.reload()}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Návštěvy webu"
                value={data ? data.totalVisits.toLocaleString("cs-CZ") : "—"}
                change={loading ? undefined : data ? "+0%" : undefined}
                up
                loading={cardLoading}
              />
              <StatCard
                label="Poptávky odeslané"
                value={data ? data.inquiries.toLocaleString("cs-CZ") : "—"}
                change={loading ? undefined : data ? "+0%" : undefined}
                up
                loading={cardLoading}
              />
              <StatCard
                label="Konverzní poměr"
                value={data ? `${data.conversionRate}%` : "—"}
                change={loading ? undefined : data ? "+0%" : undefined}
                up
                loading={cardLoading}
              />
              <StatCard
                label="Nejžádanější destinace"
                value={data ? data.topDestination : "—"}
                loading={cardLoading}
              />
            </div>
          </ErrorBoundary>

          {/* Charts row */}
          <ErrorBoundary key="charts" onReset={() => window.location.reload()}>
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Trends chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Trendy návštěv</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      Návštěvy
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Poptávky
                    </span>
                  </div>
                  <StatChart
                    type="line"
                    data={data?.visitsTrend || []}
                    loading={loading}
                    error={error || undefined}
                  />
                </CardContent>
              </Card>

              {/* Channels */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Kanály</CardTitle>
                </CardHeader>
                <CardContent>
                  <StatChart
                    type="bar"
                    data={data?.channels.map((ch) => ({ label: ch.label, value: ch.pct })) || []}
                    loading={loading}
                    error={error || undefined}
                  />
                </CardContent>
              </Card>
            </div>
          </ErrorBoundary>

          {/* Destination table */}
          {loading && !data ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/6 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/6 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/6 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinace</TableHead>
                  <TableHead className="text-right">Prohlédnutí</TableHead>
                  <TableHead className="text-right">Poptávky</TableHead>
                  <TableHead className="text-right">E-maily</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.perDestination ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Žádná data k zobrazení.
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.perDestination ?? []).map((row) => (
                    <TableRow key={row.destination}>
                      <TableCell className="font-medium">{row.destination}</TableCell>
                      <TableCell className="text-right font-medium">
                        {row.inquiries}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.inquiries}
                      </TableCell>
                      <TableCell className="text-right font-medium">—</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
