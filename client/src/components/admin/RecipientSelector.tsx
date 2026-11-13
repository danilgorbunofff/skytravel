import type { Lead } from "../../features/admin/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Download, Search } from "lucide-react";
import LeadsTable from "./LeadsTable";

export type LeadCounts = { all: number; consented: number; pending: number };

type Props = {
  /** Rows loaded for the table (capped by the list limit). */
  leads: Lead[];
  /** Server total for the current table filter (segment + search). */
  listTotal: number;
  /** Server totals per segment, independent of the search box. */
  counts: LeadCounts | null;
  loading: boolean;
  error: string | null;
  segment: "all" | "consented" | "pending";
  searchQuery: string;
  onSegmentChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onDelete: (id: number) => void;
  onExportCsv: () => void;
  onRetry: () => void;
};

export default function RecipientSelector({
  leads,
  listTotal,
  counts,
  loading,
  error,
  segment,
  searchQuery,
  onSegmentChange,
  onSearchChange,
  onDelete,
  onExportCsv,
  onRetry,
}: Props) {
  const fmt = (value: number | undefined) => (value === undefined ? "…" : value);
  const truncated = !loading && !error && listTotal > leads.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Správa kontaktů</CardTitle>
            <CardDescription>Filtrace, správa a export poptávek od návštěvníků.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            disabled={loading || leads.length === 0}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV ({leads.length})
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Tabs value={segment} onValueChange={onSegmentChange} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="all">Vše ({fmt(counts?.all)})</TabsTrigger>
              <TabsTrigger value="consented">Souhlas ({fmt(counts?.consented)})</TabsTrigger>
              <TabsTrigger value="pending">Bez souhlasu ({fmt(counts?.pending)})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Hledat e-mail nebo destinaci…"
              aria-label="Hledat v kontaktech"
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {truncated && (
          <p className="mb-3 text-xs text-muted-foreground">
            Zobrazeno prvních {leads.length} z {listTotal} kontaktů. Upřesněte hledání.
          </p>
        )}
        <LeadsTable
          leads={leads}
          loading={loading}
          error={error}
          searchQuery={searchQuery}
          onDelete={onDelete}
          onRetry={onRetry}
        />
      </CardContent>
    </Card>
  );
}
