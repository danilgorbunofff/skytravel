import { useCallback, useEffect, useRef, useState } from "react";
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
import AdminToastViewport from "../components/admin/AdminToastViewport";
import {
  deleteLead,
  fetchLeadCount,
  fetchLeads,
  sendCampaign,
  sendTestCampaign,
  uploadAdminImages,
} from "../features/admin/services/adminApi";
import { useAdminToast } from "../features/admin/hooks/useAdminToast";
import { EMAIL_RE, getSendBlockedReason } from "../features/admin/campaign";
import { useDebounce } from "../features/search/hooks/useDebounce";
import type { Lead } from "../features/admin/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { cn } from "../lib/utils";
import { Users, ShieldCheck, ShieldOff, ListFilter, SendHorizonal, Loader2 } from "lucide-react";
import EmailEditor from "../components/admin/EmailEditor";
import RecipientSelector, { type LeadCounts } from "../components/admin/RecipientSelector";
import SendPreview from "../components/admin/SendPreview";

type Segment = "all" | "consented" | "pending";

const LIST_LIMIT = 500;
const SEARCH_DEBOUNCE_MS = 300;

export default function AdminEmailPage() {
  // ── Table filter (does NOT affect who receives a campaign) ──
  const [segment, setSegment] = useState<Segment>("all");
  const [searchInput, setSearchInput] = useState("");
  const searchQuery = useDebounce(searchInput.trim(), SEARCH_DEBOUNCE_MS);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const listRequestRef = useRef(0);

  // ── Server-side segment counts (campaign recipients = counts.consented) ──
  const [counts, setCounts] = useState<LeadCounts | null>(null);
  const [countsError, setCountsError] = useState(false);

  // ── Draft (starts empty so nothing sendable ships pre-filled) ──
  const [subject, setSubject] = useState("");
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [preheader, setPreheader] = useState("");
  const [fromEmail, setFromEmail] = useState("info@skytravel.cz");
  const [testEmail, setTestEmail] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toasts, showToast, dismissToast } = useAdminToast();

  // ── TipTap editor ──
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: "Začněte psát obsah e-mailu…" }),
    ],
    content: "",
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
            showToast("Obrázek nahrán.");
          })
          .catch((err) =>
            showToast(
              err instanceof Error ? err.message : "Nahrání obrázku se nepodařilo.",
              "error",
            ),
          );
        return true;
      },
    },
  });

  const editorHtml = editor?.getHTML() ?? "";

  const refreshLeads = useCallback(() => {
    const requestId = ++listRequestRef.current;
    setLoading(true);
    fetchLeads({ segment, q: searchQuery || undefined, limit: LIST_LIMIT, offset: 0 })
      .then((res) => {
        if (requestId !== listRequestRef.current) return;
        const items = (res.data.items ?? []) as Lead[];
        const total = "total" in res.data ? res.data.total : items.length;
        setLeads(items);
        setListTotal(total);
        setError("");
      })
      .catch((err) => {
        if (requestId !== listRequestRef.current) return;
        setLeads([]);
        setListTotal(0);
        setError(err instanceof Error ? err.message : "Nepodařilo se načíst kontakty.");
      })
      .finally(() => {
        if (requestId === listRequestRef.current) setLoading(false);
      });
  }, [segment, searchQuery]);

  const refreshCounts = useCallback(() => {
    Promise.all([fetchLeadCount("all"), fetchLeadCount("consented")])
      .then(([all, consented]) => {
        setCounts({ all, consented, pending: Math.max(0, all - consented) });
        setCountsError(false);
      })
      .catch(() => setCountsError(true));
  }, []);

  useEffect(() => {
    refreshLeads();
  }, [refreshLeads]);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  const recipientCount = countsError ? null : (counts?.consented ?? null);

  // ── Validation ──
  const subjectValid = subject.trim().length > 0;
  const fromEmailValid = EMAIL_RE.test(fromEmail);
  const testEmailValid = EMAIL_RE.test(testEmail);
  const editorEmpty = !editor || editor.isEmpty;
  const sendBlockedReason = getSendBlockedReason({
    subject,
    fromEmail,
    editorEmpty,
    recipientCount,
    recipientCountError: countsError,
  });
  const canSendTest = subjectValid && fromEmailValid && testEmailValid && !editorEmpty;

  async function handleUploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    if (!editor) return;
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      const data = await uploadAdminImages(files);
      data.urls.forEach((url) => editor.chain().focus().setImage({ src: url }).run());
      showToast("Obrázek nahrán.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Nahrání obrázku se nepodařilo.", "error");
    } finally {
      event.target.value = "";
    }
  }

  async function performDelete() {
    if (confirmDeleteId === null) return;
    const id = confirmDeleteId;
    try {
      await deleteLead(id);
      setLeads((prev) => prev.filter((lead) => lead.id !== id));
      setListTotal((prev) => Math.max(0, prev - 1));
      refreshCounts();
      showToast("Kontakt smazán.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Nepodařilo se smazat kontakt.", "error");
    } finally {
      setConfirmDeleteId(null);
    }
  }

  async function handleSendCampaign() {
    setSending(true);
    try {
      const result = (await sendCampaign({
        subject,
        preheader,
        fromEmail,
        html: editor?.getHTML() ?? "",
        segment: "consented",
      })) as { data?: { recipients?: number } };
      const sent = result.data?.recipients;
      showToast(
        typeof sent === "number" ? `Kampaň odeslána (${sent} příjemců).` : "Kampaň odeslána.",
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Odeslání se nepodařilo.", "error");
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
      showToast(`Testovací e-mail odeslán na ${testEmail}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Test se nepodařilo odeslat.", "error");
    } finally {
      setSendingTest(false);
    }
  }

  function exportCsv() {
    const header = ["email", "destination", "marketingConsent", "gdprConsent", "createdAt"];
    const rows = leads.map((lead) => [
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

  const countLabel = (value: number | undefined) =>
    countsError ? "?" : value === undefined ? "—" : value;

  return (
    <AdminLayout title="E-maily & marketing">
      <SkipToContent />
      <AdminToastViewport toasts={toasts} onDismiss={dismissToast} />

      {/* ── Summary stats bar ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Celkem kontaktů",
            value: countLabel(counts?.all),
            icon: Users,
            color: "text-primary",
          },
          {
            label: "Marketing souhlas",
            value: countLabel(counts?.consented),
            icon: ShieldCheck,
            color: "text-success",
          },
          {
            label: "Bez souhlasu",
            value: countLabel(counts?.pending),
            icon: ShieldOff,
            color: "text-warning",
          },
          {
            label: "Odpovídá filtru tabulky",
            value: loading ? "—" : listTotal,
            icon: ListFilter,
            color: "text-primary",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("rounded-lg bg-muted p-2.5", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
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
          listTotal={listTotal}
          counts={counts}
          loading={loading}
          error={error}
          segment={segment}
          searchQuery={searchInput}
          onSegmentChange={(v) => setSegment(v as Segment)}
          onSearchChange={setSearchInput}
          onDelete={setConfirmDeleteId}
          onExportCsv={exportCsv}
          onRetry={refreshLeads}
        />
      </ErrorBoundary>

      {/* ── Campaign composer card ── */}
      <ErrorBoundary key="editor-section" onReset={() => window.location.reload()}>
        <Card>
          <CardHeader>
            <CardTitle>Nová kampaň</CardTitle>
            <CardDescription>
              Kampaň obdrží všechny kontakty s marketingovým souhlasem
              {recipientCount !== null ? ` (${recipientCount})` : ""}. Filtr a vyhledávání v tabulce
              výše výběr příjemců neovlivňují.
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
                      aria-invalid={!fromEmailValid && !!fromEmail}
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
                      onBlur={() => setSubjectTouched(true)}
                      placeholder="např. Nové termíny na jaro"
                      aria-invalid={subjectTouched && !subjectValid}
                      className={cn(
                        subjectTouched &&
                          !subjectValid &&
                          "border-destructive focus-visible:ring-destructive",
                      )}
                    />
                    {subjectTouched && !subjectValid && (
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
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="vas@email.cz"
                        aria-invalid={!testEmailValid && !!testEmail}
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
                  <div className="space-y-1 sm:text-right">
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => setConfirmSendOpen(true)}
                      disabled={sendBlockedReason !== null || sending}
                      aria-describedby={sendBlockedReason ? "send-blocked-reason" : undefined}
                    >
                      {sending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <SendHorizonal className="mr-2 h-4 w-4" />
                      )}
                      Odeslat kampaň{recipientCount !== null ? ` (${recipientCount})` : ""}
                    </Button>
                    {sendBlockedReason && (
                      <p id="send-blocked-reason" className="text-xs text-muted-foreground">
                        {sendBlockedReason}
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

      {/* ── Send confirmation dialog ── */}
      <ConfirmDialog
        isOpen={confirmSendOpen}
        title="Odeslat kampaň?"
        message={`Kampaň „${subject}" bude odeslána ${recipientCount ?? 0} kontaktům s marketingovým souhlasem. Tuto akci nelze vzít zpět.`}
        confirmLabel={sending ? "Odesílám…" : "Odeslat"}
        tone="default"
        loading={sending}
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
