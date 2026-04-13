import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { importAlexandria, fetchAdminTours } from "../services/adminApi";
import type { OwnTour } from "../types";
import { Download } from "lucide-react";

type Props = {
  onToursRefreshed: (tours: OwnTour[]) => void;
};

export default function AdminAlexandriaImport({ onToursRefreshed }: Props) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleImport() {
    setImporting(true);
    setResult(null);
    try {
      const data = await importAlexandria();
      if (data.ok && data.total !== undefined) {
        setResult(
          `Import dokončen: ${data.created ?? 0} nových, ${data.updated ?? 0} aktualizovaných (celkem ${data.total}).`,
        );
        const refreshed = await fetchAdminTours();
        onToursRefreshed(refreshed);
      } else {
        setResult(data.message ?? "Import se nezdařil – zkontrolujte strukturu XML.");
      }
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Chyba při importu.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <Button onClick={handleImport} disabled={importing}>
        <Download className="mr-2 h-4 w-4" />
        {importing ? "Importuji…" : "Importovat nabídky z Alexandrie"}
      </Button>
      {result && <p className="mt-3 text-sm text-muted-foreground">{result}</p>}
    </>
  );
}
