import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import { deleteLead, fetchLeads, sendCampaign, sendTestCampaign, uploadAdminImages } from "../features/admin/services/adminApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { cn } from "../lib/utils";
import { Bold, Italic, List, Heading2, Link2, ImageIcon, Upload, Eye, Download, Trash2 } from "lucide-react";

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
        setLeads((data.items ?? []) as Lead[]);
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

  const segments: { value: "all" | "consented" | "pending"; label: string }[] = [
    { value: "all", label: `Vše (${leads.length})` },
    { value: "consented", label: `Souhlas (${consentedCount})` },
    { value: "pending", label: `Bez souhlasu (${leads.length - consentedCount})` },
  ];

  return (
    <AdminLayout title="E-maily & marketing">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>E-maily od návštěvníků</CardTitle>
              <CardDescription>Správa poptávek a kontaktů. Marketing odesíláme pouze se souhlasem.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {segments.map((s) => (
                <Button
                  key={s.value}
                  type="button"
                  variant={segment === s.value ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setSegment(s.value)}
                >
                  {s.label}
                </Button>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
                <Download className="mr-1 h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Leads table ── */}
            <div>
              <h3 className="mb-3 text-lg font-semibold">Seznam poptávek</h3>
              {loading && <p className="text-sm text-muted-foreground">Načítám...</p>}
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              {!loading && !error && (
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
                    {filtered.map((lead) => (
                      <TableRow key={lead.id}>
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
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(lead.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* ── Email composer ── */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Marketingový e-mail</h3>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Od</Label>
                  <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Předmět</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Preheader</Label>
                  <Input value={preheader} onChange={(e) => setPreheader(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Obsah</Label>
                  <div className="flex flex-wrap gap-1 rounded-t-md border border-b-0 border-input bg-muted p-1.5">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat("bold")}><Bold className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat("italic")}><Italic className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat("insertUnorderedList")}><List className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat("formatBlock", "h2")}><Heading2 className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleInsertLink}><Link2 className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleInsertImage}><ImageIcon className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewOpen(true)}><Eye className="h-4 w-4" /></Button>
                    <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleUploadImage} />
                  </div>
                  <div
                    ref={editorRef}
                    className={cn(
                      "min-h-[200px] rounded-b-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring",
                      dragOver && "ring-2 ring-primary"
                    )}
                    contentEditable
                    suppressContentEditableWarning
                    onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onInput={(e) => setEditorHtml((e.target as HTMLDivElement).innerHTML)}
                    dangerouslySetInnerHTML={{ __html: editorHtml }}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline">Uložit šablonu</Button>
                  <Button type="button" onClick={handleSendCampaign}>Odeslat kampaň</Button>
                </div>

                <div className="space-y-1.5">
                  <Label>Testovací e-mail</Label>
                  <div className="flex gap-2">
                    <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@skytravel.cz" />
                    <Button type="button" variant="outline" onClick={handleSendTest}>Poslat test</Button>
                  </div>
                </div>

                {sendStatus && <p className="text-sm text-muted-foreground">{sendStatus}</p>}
                <p className="text-sm text-muted-foreground">
                  Kampaň jde pouze na kontakty se souhlasem ({consentedCount} příjemců).
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Preview dialog ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Náhled e-mailu</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Od: {fromEmail || "info@skytravel.cz"}</p>
            <p>Předmět: {subject}</p>
            {preheader && <p>Preheader: {preheader}</p>}
          </div>
          <div
            className="max-w-none rounded-md border border-border p-4 text-sm"
            dangerouslySetInnerHTML={{ __html: editorHtml }}
          />
        </DialogContent>
      </Dialog>

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
