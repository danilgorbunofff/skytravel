import type { Lead } from "../../features/admin/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Download, Search, XCircle } from "lucide-react";
import LeadsTable from "./LeadsTable";

type Props = {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  segment: "all" | "consented" | "pending";
  searchQuery: string;
  filtered: Lead[];
  onSegmentChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onDelete: (id: number) => void;
  onExportCsv: () => void;
};

export default function RecipientSelector({
  leads,
  loading,
  error,
  segment,
  searchQuery,
  filtered,
  onSegmentChange,
  onSearchChange,
  onDelete,
  onExportCsv,
}: Props) {
  const consentedCount = leads.filter((l) => l.marketingConsent).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Správa kontaktů</CardTitle>
            <CardDescription>
              Filtrace, správa a export poptávek od návštěvníků.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onExportCsv}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV ({filtered.length})
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Tabs
            value={segment}
            onValueChange={onSegmentChange}
            className="w-full sm:w-auto"
          >
            <TabsList>
              <TabsTrigger value="all">Vše ({leads.length})</TabsTrigger>
              <TabsTrigger value="consented">Souhlas ({consentedCount})</TabsTrigger>
              <TabsTrigger value="pending">
                Bez souhlasu ({leads.length - consentedCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Hledat e-mail nebo destinaci…"
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
            <XCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        <LeadsTable
          leads={filtered}
          loading={loading}
          error={error}
          searchQuery={searchQuery}
          onDelete={onDelete}
        />
      </CardContent>
    </Card>
  );
}
