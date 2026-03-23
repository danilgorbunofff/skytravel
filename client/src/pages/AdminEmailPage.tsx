import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import { deleteLead, fetchLeads, sendCampaign, sendTestCampaign, uploadAdminImages } from "../api";
import "../admin.css";

type Lead = {
  id: number;
  email: string;
  destination?: string | null;
  marketingConsent: boolean;
  gdprConsent: boolean;
  createdAt: string;
};

export default function AdminEmailPage() {
  const [segment, setSegment] = useState<"all" | "consented" | "pending">("consented");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subject, setSubject] = useState("Exkluzivní nabídky SkyTravel");
  const [preheader, setPreheader] = useState("Bonus travel guide + nové termíny");
  const [fromEmail, setFromEmail] = useState("info@skytravel.cz");
  const [editorHtml, setEditorHtml] = useState(
    "<h2>Nové termíny pro vaše vysněné destinace</h2><p>Vybrali jsme pro vás nejlepší nabídky týdne. Podívejte se na nová data odletů a stáhněte si bonusový travel guide.</p><p><strong>Tip:</strong> odpovězte nám na tento e-mail a připravíme nabídku na míru.</p>"
  );
  const [sendStatus, setSendStatus] = useState("");
  const [testEmail, setTestEmail] = useState("test@skytravel.cz");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchLeads()
      .then((data) => {
        setLeads(data.items ?? []);
        setError("");
      })
      .catch(() => setError("Nepodařilo se načíst e-maily."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (segment === "all") return leads;
    if (segment === "consented") return leads.filter((lead) => lead.marketingConsent);
    return leads.filter((lead) => !lead.marketingConsent);
  }, [segment, leads]);

  const consentedCount = useMemo(
    () => leads.filter((lead) => lead.marketingConsent).length,
    [leads]
  );

  function applyFormat(command: string, value?: string) {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setEditorHtml(editorRef.current.innerHTML);
    }
  }

  function handleInsertLink() {
    const url = window.prompt("Vložte URL");
    if (!url) return;
    applyFormat("createLink", url);
  }

  function handleInsertImage() {
    const url = window.prompt("URL obrázku");
    if (!url) return;
    applyFormat("insertImage", url);
  }

  async function handleUploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      const data = await uploadAdminImages(files);
      data.urls.forEach((url) => applyFormat("insertImage", url));
    } catch {
      setSendStatus("Nahrání obrázku se nepodařilo.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    const files = Array.from(event.dataTransfer.files || []).filter((file) =>
      file.type.startsWith("image/")
    );
    if (files.length === 0) return;
    try {
      const data = await uploadAdminImages(files);
      data.urls.forEach((url) => applyFormat("insertImage", url));
    } catch {
      setSendStatus("Nahrání obrázku se nepodařilo.");
    }
  }

  async function handleDelete(id: number) {
    setConfirmDeleteId(id);
  }

  async function performDelete() {
    if (!confirmDeleteId) return;
    try {
      await deleteLead(confirmDeleteId);
      setLeads((prev) => prev.filter((lead) => lead.id !== confirmDeleteId));
      setConfirmDeleteId(null);
    } catch {
      setError("Nepodařilo se smazat e-mail.");
      setConfirmDeleteId(null);
    }
  }

  async function handleSendCampaign() {
    setSendStatus("");
    try {
      const result = await sendCampaign({
        subject,
        preheader,
        fromEmail,
        html: editorHtml,
        segment: "consented",
      });
      setSendStatus(`Kampaň byla odeslána (${result.recipients} příjemců).`);
    } catch (err) {
      setSendStatus(err instanceof Error ? err.message : "Odeslání se nepodařilo.");
    }
  }

  async function handleSendTest() {
    setSendStatus("");
    try {
      await sendTestCampaign({
        subject,
        preheader,
        fromEmail,
        html: editorHtml,
        testEmail,
      });
      setSendStatus(`Testovací e-mail odeslán na ${testEmail}.`);
    } catch (err) {
      setSendStatus(err instanceof Error ? err.message : "Test se nepodařilo odeslat.");
    }
  }

  function handlePreview() {
    setPreviewOpen(true);
  }

  function exportCsv() {
    const header = ["email", "destination", "marketingConsent", "gdprConsent", "createdAt"];
    const rows = filtered.map((lead) => [
      lead.email,
      lead.destination || "",
      lead.marketingConsent ? "yes" : "no",
      lead.gdprConsent ? "yes" : "no",
      new Date(lead.createdAt).toISOString(),
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `skytravel-leads-${segment}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminLayout title="E-maily & marketing">
      <section className="admin-card email-card">
        <div className="email-header">
          <div>
            <h2>E-maily od návštěvníků</h2>
            <p className="note">
              Správa poptávek a kontaktů. Marketing odesíláme pouze se souhlasem.
            </p>
          </div>
          <div className="email-segment">
            <button
              type="button"
              className={`chip${segment === "all" ? " is-active" : ""}`}
              onClick={() => setSegment("all")}
            >
              Vše ({leads.length})
            </button>
            <button
              type="button"
              className={`chip${segment === "consented" ? " is-active" : ""}`}
              onClick={() => setSegment("consented")}
            >
              Souhlas ({consentedCount})
            </button>
            <button
              type="button"
              className={`chip${segment === "pending" ? " is-active" : ""}`}
              onClick={() => setSegment("pending")}
            >
              Bez souhlasu ({leads.length - consentedCount})
            </button>
            <button type="button" className="chip chip-outline" onClick={exportCsv}>
              Export CSV
            </button>
          </div>
        </div>

        <div className="email-grid">
          <div className="email-panel">
            <h3>Seznam poptávek</h3>
            {loading && <p className="note">Načítám...</p>}
            {error && <p className="note error">{error}</p>}
            {!loading && !error && (
              <div className="table-wrap">
                <div className="table-header">
                  <span>E-mail</span>
                  <span>Destinace</span>
                  <span>Marketing</span>
                  <span>GDPR</span>
                  <span>Akce</span>
                </div>
                {filtered.map((lead) => (
                  <div key={lead.id} className="table-row">
                    <div className="table-cell">
                      <strong>{lead.email}</strong>
                      <span className="table-meta">
                        {new Date(lead.createdAt).toLocaleDateString("cs-CZ")}
                      </span>
                    </div>
                    <div className="table-cell">
                      <strong>{lead.destination || "—"}</strong>
                    </div>
                    <div className="table-cell">
                      <span className={`pill ${lead.marketingConsent ? "ok" : "warn"}`}>
                        {lead.marketingConsent ? "Souhlas" : "Bez souhlasu"}
                      </span>
                    </div>
                    <div className="table-cell">
                      <span className={`pill ${lead.gdprConsent ? "ok" : "warn"}`}>
                        {lead.gdprConsent ? "Souhlas" : "Ne"}
                      </span>
                    </div>
                    <div className="table-cell table-actions">
                      <button type="button" className="remove" onClick={() => handleDelete(lead.id)}>
                        Smazat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="email-panel">
            <h3>Marketingový e-mail</h3>
            <div className="email-form">
              <label>Od</label>
              <input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
              <label>Předmět</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} />
              <label>Preheader</label>
              <input value={preheader} onChange={(e) => setPreheader(e.target.value)} />
              <label>Obsah</label>
              <div className="email-toolbar">
                <button type="button" onClick={() => applyFormat("bold")}>B</button>
                <button type="button" onClick={() => applyFormat("italic")}>I</button>
                <button type="button" onClick={() => applyFormat("insertUnorderedList")}>•</button>
                <button type="button" onClick={() => applyFormat("formatBlock", "h2")}>H2</button>
                <button type="button" onClick={handleInsertLink}>Link</button>
                <button type="button" onClick={handleInsertImage}>Obrázek</button>
                <button type="button" onClick={() => fileInputRef.current?.click()}>
                  Upload
                </button>
                <button type="button" onClick={handlePreview}>Preview</button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleUploadImage}
                />
              </div>
              <div
                ref={editorRef}
                className={`email-editor${dragOver ? " is-dragover" : ""}`}
                contentEditable
                suppressContentEditableWarning
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onInput={(e) => setEditorHtml((e.target as HTMLDivElement).innerHTML)}
                dangerouslySetInnerHTML={{ __html: editorHtml }}
              />
              <div className="email-actions">
                <button type="button" className="ghost">Uložit šablonu</button>
                <button type="button" className="primary" onClick={handleSendCampaign}>
                  Odeslat kampaň
                </button>
              </div>
              <div className="email-test">
                <label>Testovací e-mail</label>
                <div className="email-test__row">
                  <input
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@skytravel.cz"
                  />
                  <button type="button" className="ghost" onClick={handleSendTest}>
                    Poslat test
                  </button>
                </div>
              </div>
              {sendStatus && <p className="note">{sendStatus}</p>}
              <p className="note">
                Kampaň jde pouze na kontakty se souhlasem ({consentedCount} příjemců).
              </p>
            </div>
          </div>
        </div>
      </section>

      {previewOpen && (
        <div className="email-preview">
          <div className="email-preview__backdrop" onClick={() => setPreviewOpen(false)} />
          <div className="email-preview__card">
            <div className="email-preview__head">
              <strong>Náhled e-mailu</strong>
              <button type="button" onClick={() => setPreviewOpen(false)}>✕</button>
            </div>
            <div className="email-preview__meta">
              <span>Od: {fromEmail || "info@skytravel.cz"}</span>
              <span>Předmět: {subject}</span>
              {preheader && <span>Preheader: {preheader}</span>}
            </div>
            <div className="email-preview__body" dangerouslySetInnerHTML={{ __html: editorHtml }} />
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        title="Smazat kontakt?"
        message="Opravdu chcete tento kontakt smazat? Tato akce je nevratná."
        confirmLabel="Smazat"
        onConfirm={performDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </AdminLayout>
  );
}
