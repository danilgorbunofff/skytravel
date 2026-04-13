import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { fetchAdminTours } from "../features/admin/services/adminApi";
import { type OwnTour } from "../data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { cn } from "../lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function AdminStatisticsPage() {
  const [tours, setTours] = useState<OwnTour[]>([]);
  const [period, setPeriod] = useState<"30" | "90" | "year">("30");

  useEffect(() => {
    fetchAdminTours().then((items) => setTours(items)).catch(() => setTours([]));
  }, []);

  const ordered = useMemo(() => [...tours].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)), [tours]);

  const periods: { value: "30" | "90" | "year"; label: string }[] = [
    { value: "30", label: "30 dní" },
    { value: "90", label: "90 dní" },
    { value: "year", label: "Rok" },
  ];

  return (
    <AdminLayout title="Statistiky & výkon">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Statistiky</CardTitle>
              <CardDescription>Google Analytics + ruční metriky k poptávkám a e-mailům.</CardDescription>
            </div>
            <div className="flex gap-1">
              {periods.map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  variant={period === p.value ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setPeriod(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* KPI tiles */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Návštěvy webu", value: "48 920", change: "+12.4%", up: true },
              { label: "Poptávky odeslané", value: "1 284", change: "+7.1%", up: true },
              { label: "Konverzní poměr", value: "2.62%", change: "+0.4%", up: true },
              { label: "Nejžádanější destinace", value: ordered[0]?.destination || "—", change: "-1 pozice", up: false },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-bold">{s.value}</p>
                <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", s.up ? "text-success" : "text-destructive")}>
                  {s.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {s.change}
                </p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Trends chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Trendy návštěv</CardTitle>
              </CardHeader>
              <CardContent>
                <svg className="w-full" viewBox="0 0 360 150" role="img" aria-label="Trendy návštěv">
                  <g className="text-muted-foreground text-[11px]">
                    <line x1="30" y1="16" x2="30" y2="122" stroke="currentColor" strokeOpacity="0.2" />
                    <line x1="30" y1="122" x2="352" y2="122" stroke="currentColor" strokeOpacity="0.2" />
                    <text x="8" y="18" fill="currentColor">100</text>
                    <text x="12" y="72" fill="currentColor">50</text>
                    <text x="16" y="122" fill="currentColor">0</text>
                    <text x="30" y="142" fill="currentColor">Po</text>
                    <text x="82" y="142" fill="currentColor">Út</text>
                    <text x="134" y="142" fill="currentColor">St</text>
                    <text x="186" y="142" fill="currentColor">Čt</text>
                    <text x="238" y="142" fill="currentColor">Pá</text>
                    <text x="290" y="142" fill="currentColor">So</text>
                    <text x="332" y="142" fill="currentColor">Ne</text>
                  </g>
                  <polyline points="30,110 82,90 134,95 186,70 238,78 290,50 332,60" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="30,120 82,105 134,112 186,88 238,92 290,70 332,75" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-600" />Návštěvy</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />Poptávky</span>
                </div>
              </CardContent>
            </Card>

            {/* Channels */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Kanály</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Organické vyhledávání", pct: 42 },
                  { label: "Přímý přístup", pct: 26 },
                  { label: "Sociální sítě", pct: 18 },
                  { label: "Placené kampaně", pct: 14 },
                ].map((ch) => (
                  <div key={ch.label}>
                    <div className="flex justify-between text-sm">
                      <span>{ch.label}</span>
                      <strong>{ch.pct}%</strong>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${ch.pct}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Destination table */}
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
              {ordered.map((tour) => (
                <TableRow key={`stats-${tour.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img src={tour.image} alt={tour.destination} className="h-10 w-10 rounded-md object-cover" />
                      <div>
                        <p className="font-medium">{tour.destination}</p>
                        <p className="text-xs text-muted-foreground">{tour.title}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{Math.floor(1200 + (tour.id ?? 1) * 83)}</TableCell>
                  <TableCell className="text-right font-medium">{Math.floor(60 + (tour.id ?? 1) * 6)}</TableCell>
                  <TableCell className="text-right font-medium">{Math.floor(30 + (tour.id ?? 1) * 4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
