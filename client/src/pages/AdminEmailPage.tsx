import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import "../admin.css";
import AdminLayout from "../components/AdminLayout";
import { ErrorBoundary } from "../components/ErrorBoundary";
import ConfirmDialog from "../components/ConfirmDialog";
import { SkipToContent } from "../components/SkipToContent";
import {
  deleteLead,
  fetchLeads,
  sendCampaign,
  sendTestCampaign,
  uploadAdminImages,
} from "../features/admin/services/adminApi";
import type { Lead } from "../features/admin/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { cn } from "../lib/utils";
import {
  Users,
  ShieldCheck,
  ShieldOff,
  Mail,
  SendHorizonal,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import EmailEditor from "../components/admin/EmailEditor";
import RecipientSelector from "../components/admin/RecipientSelector";
import SendPreview from "../components/admin/SendPreview";
import CampaignHistory from "../components/admin/CampaignHistory";

type Toast = {
  id: number;
  type: "success" | "error" | "info";
  message: string;
};

const TOAST_DURATION = 5000;

export default function AdminEmailPage() {
  const [segment, setSegment] = useState<"all" | "consented" | "pending">("consented");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [subject, setSubject] = useState("Exkluzivní nabídky SkyTravel");
  const [preheader, setPreheader] = useState("Bonus travel guide + nové termíny");
  const [fromEmail, setFromEmail] = useState("info@skytravel.cz");
  const [testEmail, setTestEmail] = useState("test@skytravel.cz");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── TipTap editor ──
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: "Začněte psát obsah e-mailu…" }),
    ],
    content:
      "<h2>Nové termíny pro vaše vysněné destinace</h2><p>Vybrali jsme pro vás nejlepší nabídky týdne. Podívejte se na nová data odletů a stáhněte si bonusový travel guide.</p><p><strong>Tip:</strong> odpovězte nám na tento e-mail a připravíme nabídku na míru.</p>",
    editorProps: {
      attributes: { class: "min-h-[240px] p-4 text-sm outline-none focus:outline-none" },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length === 0) return false;
        event.preventDefault();
        uploadAdminImages(files)
          .then((data) => {
            data.urls.forEach((url) => {
              view.dispatch(
                view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.image.create({ src: url }),
                ),
              );
            });
            addToast("success", "Obrázek nahrán.");
          })
          .catch(() => addToast("error", "Nahrání obrázku se nepodařilo."));
        return true;
      },
    },
  });

  const editorHtml = editor?.getHTML() ?? "";

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), TOAST_DURATION);
  }, []);

  const refreshLeads = useCallback(() => {
    setLoading(true);
    fetchLeads({ segment, q: searchQuery.trim() || undefined, limit: 500, offset: 0 })
      .then((res) => {
        const body = res as unknown as { data: { items: Lead[] } };
        setLeads((body.data.items ?? []) as Lead[]);
        setError("");
      })
      .catch(() => setError("Nepodařilo se načíst e-maily."))
      .finally(() => setLoading(false));
  }, [segment, searchQuery]);

  useEffect(() => {
    refreshLeads();
  }, [refreshLeads]);

  const consentedCount = useMemo(() => {
    if (segment === "consented") return leads.length;
    return leads.filter((lead) => lead.marketingConsent).length;
  }, [leads, segment]);

  // Server already filters by segment+q; keep for CSV/export scope
  const filtered = useMemo(() => leads, [leads]);

  // ── Validation ──
  const subjectValid = subject.trim().length > 0;
  const fromEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail);
  const testEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail);
  const editorEmpty = !editor || editor.isEmpty;
  const canSend = subjectValid && fromEmailValid && !editorEmpty && consentedCount > 0;
  const canSendTest = subjectValid && fromEmailValid && testEmailValid && !editorEmpty;

  async function handleUploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    if (!editor) return;
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      const data = await uploadAdminImages(files);
      data.urls.forEach((url) => editor.chain().focus().setImage({ src: url }).run());
      addToast("success", "Obrázek nahrán.");
    } catch {
      addToast("error", "Nahrání obrázku se nepodařilo.");
    } finally {
      event.target.value = "";
    }
  }

  function handleDelete(id: number) {
    setConfirmDeleteId(id);
  }

  async function performDelete() {
    if (!confirmDeleteId) return;
    try {
      await deleteLead(confirmDeleteId);
      setLeads((prev) => prev.filter((lead) => lead.id !== confirmDeleteId));
      setConfirmDeleteId(null);
      addToast("success", "Kontakt smazán.");
    } catch {
      addToast("error", "Nepodařilo se smazat kontakt.");
      setConfirmDeleteId(null);
    }
  }

  async function handleSendCampaign() {
    if (segment !== "consented") {
      addToast(
        "error",
        "Kampaně lze posílat pouze na segment se souhlasem. Přepněte na „Souhlas“.",
      );
      setConfirmSendOpen(false);
      return;
    }
    setSending(true);
    try {
      const result = await sendCampaign({
        subject,
        preheader,
        fromEmail,
        html: editor?.getHTML() ?? "",
        segment,
      });
      addToast("success", `Kampaň odeslána (${result.recipients} příjemců).`);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Odeslání se nepodařilo.");
    } finally {
      setSending(false);
      setConfirmSendOpen(false);
    }
  }

  async function handleSendTest() {
    setSendingTest(true);
    try {
      await sendTestCampaign({
        subject,
        preheader,
        fromEmail,
        html: editor?.getHTML() ?? "",
        testEmail,
      });
      addToast("success", `Testovací e-mail odeslán na ${testEmail}.`);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Test se nepodařilo odeslat.");
    } finally {
      setSendingTest(false);
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
    const csv = `\uFEFF${[header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")}`;
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
      <SkipToContent />
      {/* ── Toast notifications ── */}
      <div className="pointer-events-none fixed right-6 top-20 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm animate-in slide-in-from-right-5 fade-in duration-300",
              toast.type === "success" && "border-success/30 bg-success/10 text-success",
              toast.type === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
              toast.type === "info" && "border-primary/30 bg-primary/10 text-primary",
            )}
          >
            {toast.type === "success" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {toast.type === "error" && <XCircle className="h-4 w-4 shrink-0" />}
            {toast.type === "info" && <AlertTriangle className="h-4 w-4 shrink-0" />}
            {toast.message}
          </div>
        ))}
      </div>

      {/* ── Summary stats bar ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Celkem kontaktů", value: leads.length, icon: Users, color: "text-primary" },
          {
            label: "Marketing souhlas",
            value: consentedCount,
            icon: ShieldCheck,
            color: "text-success",
          },
          {
            label: "Bez souhlasu",
            value: leads.length - consentedCount,
            icon: ShieldOff,
            color: "text-warning",
          },
          {
            label: "Aktuální segment",
            value: filtered.length,
            icon: Mail,
            color: "text-primary",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("rounded-lg bg-muted p-2.5", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{loading ? "—" : stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Leads management ── */}
      <ErrorBoundary key="leads-section" onReset={() => window.location.reload()}>
        <RecipientSelector
          leads={leads}
          loading={loading}
          error={error}
          segment={segment}
          searchQuery={searchQuery}
          filtered={filtered}
          onSegmentChange={(v) => setSegment(v as typeof segment)}
          onSearchChange={setSearchQuery}
          onDelete={handleDelete}
          onExportCsv={exportCsv}
        />
      </ErrorBoundary>

      {/* ── Campaign composer card ── */}
      <ErrorBoundary key="editor-section" onReset={() => window.location.reload()}>
        <Card>
          <CardHeader>
            <CardTitle>Nová kampaň</CardTitle>
            <CardDescription>
              Vytvořte a odešlete marketingový e-mail kontaktům se souhlasem ({consentedCount}{" "}
              příjemců).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
              <div className="space-y-4">
                {/* ── Sender fields ── */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="from-email">Od</Label>
                    <Input
                      id="from-email"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      className={cn(
                        !fromEmailValid &&
                          fromEmail &&
                          "border-destructive focus-visible:ring-destructive",
                      )}
                    />
                    {!fromEmailValid && fromEmail && (
                      <p className="text-xs text-destructive">Neplatný formát e-mailu.</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="subject">Předmět</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className={cn(
                        !subjectValid && "border-destructive focus-visible:ring-destructive",
                      )}
                    />
                    {!subjectValid && (
                      <p className="text-xs text-destructive">Předmět je povinný.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="preheader">
                    Preheader <span className="font-normal text-muted-foreground">(volitelný)</span>
                  </Label>
                  <Input
                    id="preheader"
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    placeholder="Krátký text viditelný v náhledu v inboxu"
                  />
                </div>

                {/* ── TipTap editor ── */}
                <EmailEditor
                  editor={editor}
                  fileInputRef={fileInputRef}
                  onUploadImage={handleUploadImage}
                  onPreviewOpen={() => setPreviewOpen(true)}
                />

                {/* ── Actions ── */}
                <Separator />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  {/* Test send */}
                  <div className="space-y-1.5">
                    <Label htmlFor="test-email">Testovací e-mail</Label>
                    <div className="flex gap-2">
                      <Input
                        id="test-email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="test@skytravel.cz"
                        className={cn(
                          "w-60",
                          !testEmailValid &&
                            testEmail &&
                            "border-destructive focus-visible:ring-destructive",
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSendTest}
                        disabled={!canSendTest || sendingTest}
                      >
                        {sendingTest ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <SendHorizonal className="mr-1.5 h-4 w-4" />
                        )}
                        Poslat test
                      </Button>
                    </div>
                    {!testEmailValid && testEmail && (
                      <p className="text-xs text-destructive">Neplatný formát e-mailu.</p>
                    )}
                  </div>
                  {/* Campaign send */}
                  <div className="space-y-1">
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => setConfirmSendOpen(true)}
                      disabled={!canSend || sending || segment !== "consented"}
                    >
                      {sending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <SendHorizonal className="mr-2 h-4 w-4" />
                      )}
                      Odeslat kampaň ({consentedCount})
                    </Button>
                    {segment !== "consented" && (
                      <p className="text-xs text-amber-600">
                        Přepněte na segment „Souhlas“ pro odeslání kampaně.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Live preview sidebar ── */}
              <SendPreview
                editorHtml={editorHtml}
                fromEmail={fromEmail}
                subject={subject}
                preheader={preheader}
                previewOpen={previewOpen}
                onPreviewOpenChange={setPreviewOpen}
              />
            </div>
          </CardContent>
        </Card>
      </ErrorBoundary>

      {/* ── Campaign history ── */}
      <CampaignHistory />

      {/* ── Send confirmation dialog ── */}
      <ConfirmDialog
        isOpen={confirmSendOpen}
        title="Odeslat kampaň?"
        message={`Opravdu chcete odeslat kampaň „${subject}" na ${consentedCount} příjemců se souhlasem? Tuto akci nelze vzít zpět.`}
        confirmLabel={sending ? "Odesílám…" : "Odeslat"}
        onConfirm={handleSendCampaign}
        onCancel={() => setConfirmSendOpen(false)}
      />

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
