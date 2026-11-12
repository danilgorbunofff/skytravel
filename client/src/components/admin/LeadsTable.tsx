import type { Lead } from "../../features/admin/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Mail, RotateCcw, Trash2, XCircle } from "lucide-react";

type Props = {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  onDelete: (id: number) => void;
  onRetry: () => void;
};

// ── Skeleton rows ──
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            <div className="mt-1.5 h-3 w-20 animate-pulse rounded bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-8 w-8 animate-pulse rounded bg-muted" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function LeadsTable({
  leads,
  loading,
  error,
  searchQuery,
  onDelete,
  onRetry,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>E-mail</TableHead>
            <TableHead>Destinace</TableHead>
            <TableHead>Marketing</TableHead>
            <TableHead>GDPR</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && <SkeletonRows />}
          {!loading && error && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center">
                <div role="alert" className="mx-auto max-w-sm space-y-3">
                  <XCircle className="mx-auto h-8 w-8 text-destructive" />
                  <p className="text-sm font-medium text-destructive">{error}</p>
                  <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Zkusit znovu
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
          {!loading && !error && leads.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-12 text-center">
                <div className="mx-auto max-w-xs space-y-2">
                  <Mail className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {searchQuery ? "Žádné výsledky pro tento dotaz." : "Zatím žádné kontakty."}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}
          {!loading &&
            !error &&
            leads.map((lead) => (
              <TableRow key={lead.id} className="group">
                <TableCell>
                  <p className="font-medium">{lead.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(lead.createdAt).toLocaleDateString("cs-CZ")}
                  </p>
                </TableCell>
                <TableCell className="font-medium">{lead.destination || "—"}</TableCell>
                <TableCell>
                  <Badge variant={lead.marketingConsent ? "success" : "warning"}>
                    {lead.marketingConsent ? "Souhlas" : "Bez souhlasu"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={lead.gdprConsent ? "success" : "warning"}>
                    {lead.gdprConsent ? "Souhlas" : "Ne"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="transition-opacity [@media(hover:hover)]:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                    onClick={() => onDelete(lead.id)}
                    title="Smazat kontakt"
                    aria-label={`Smazat kontakt ${lead.email}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
