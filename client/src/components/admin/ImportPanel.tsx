import type { ImportResult, UnifiedTour } from "../../types/providers";

type Props = {
  selected: Set<string>;
  tours: UnifiedTour[];
  page: number;
  totalPages: number;
  filteredCount: number;
  importing: boolean;
  importResult: ImportResult | null;
  onImportSelected: () => void;
  onImportAll: () => void;
  onExportCsv: () => void;
};

export default function ImportPanel({
  selected,
  tours,
  page,
  totalPages,
  filteredCount,
  importing,
  importResult,
  onImportSelected,
  onImportAll,
  onExportCsv,
}: Props) {
  const importMessage = importResult
    ? importResult.ok
      ? `Import dokončen: ${importResult.created} nových, ${importResult.updated} aktualizovaných (celkem ${importResult.total}).`
      : (importResult.message ?? "Import se nezdařil.")
    : null;

  return (
    <section className="admin-card">
      <div className="alex-import-bar">
        <div className="alex-import-info">
          <span>
            {selected.size > 0
              ? `Vybráno ${selected.size} z ${tours.length}`
              : `Stránka ${page} z ${totalPages} (${filteredCount.toLocaleString("cs")} výsledků)`}
          </span>
          {importMessage && <p className="note">{importMessage}</p>}
        </div>
        <div className="alex-import-actions">
          {selected.size > 0 && (
            <button type="button" onClick={onImportSelected} disabled={importing}>
              {importing ? "Importuji…" : `Importovat vybrané (${selected.size})`}
            </button>
          )}
          <button
            type="button"
            className={selected.size > 0 ? "ghost" : ""}
            onClick={onImportAll}
            disabled={importing || tours.length === 0}
          >
            {importing ? "Importuji…" : "Importovat vše"}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={onExportCsv}
            disabled={tours.length === 0}
          >
            Export CSV
          </button>
        </div>
      </div>
    </section>
  );
}
