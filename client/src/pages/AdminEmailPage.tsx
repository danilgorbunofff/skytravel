import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import "../admin.css";
import AdminLayout from "../components/AdminLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import { deleteLead, fetchLeads, sendCampaign, sendTestCampaign, uploadAdminImages } from "../features/admin/services/adminApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { cn } from "../lib/utils";
import {
  Bold, Italic, List, Heading2, Link2, ImageIcon, Upload, Eye, Download, Trash2,
  Search, Users, ShieldCheck, ShieldOff, Mail, SendHorizonal, CheckCircle2, XCircle, AlertTriangle, Loader2,
  Strikethrough, Code, Undo2, Redo2, ListOrdered,
} from "lucide-react";

type Lead = {
  id: number;
  email: string;
  destination?: string | null;
  marketingConsent: boolean;
  gdprConsent: boolean;
  createdAt: string;
};

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
    content: "<h2>Nové termíny pro vaše vysněné destinace</h2><p>Vybrali jsme pro vás nejlepší nabídky týdne. Podívejte se na nová data odletů a stáhněte si bonusový travel guide.</p><p><strong>Tip:</strong> odpovězte nám na tento e-mail a připravíme nabídku na míru.</p>",
    editorProps: {
      attributes: { class: "min-h-[240px] p-4 text-sm outline-none focus:outline-none" },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith("image/"));
        if (files.length === 0) return false;
        event.preventDefault();
        uploadAdminImages(files)
          .then((data) => {
            data.urls.forEach((url) => {
              view.dispatch(view.state.tr.replaceSelectionWith(
                view.state.schema.nodes.image.create({ src: url })
              ));
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

  useEffect(() => {
    fetchLeads()
      .then((data) => {
        setLeads((data.items ?? []) as Lead[]);
        setError("");
      })
      .catch(() => setError("Nepodařilo se načíst e-maily."))
      .finally(() => setLoading(false));
  }, []);

  const consentedCount = useMemo(
    () => leads.filter((lead) => lead.marketingConsent).length,
    [leads]
  );

  const filtered = useMemo(() => {
    let result = leads;
    if (segment === "consented") result = result.filter((l) => l.marketingConsent);
    else if (segment === "pending") result = result.filter((l) => !l.marketingConsent);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (l) => l.email.toLowerCase().includes(q) || (l.destination ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [segment, leads, searchQuery]);

  // ── Validation ──
  const subjectValid = subject.trim().length > 0;
  const fromEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail);
  const testEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail);
  const editorEmpty = !editor || editor.isEmpty;
  const canSend = subjectValid && fromEmailValid && !editorEmpty && consentedCount > 0;
  const canSendTest = subjectValid && fromEmailValid && testEmailValid && !editorEmpty;

  // ── Toolbar helpers ──
  function handleInsertLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL odkazu", prev ?? "https://");
    if (!url) return;
    if (editor.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }

  function handleInsertImageUrl() {
    if (!editor) return;
    const url = window.prompt("URL obrázku");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  }

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
    setSending(true);
    try {
      const result = await sendCampaign({
        subject,
        preheader,
        fromEmail,
        html: editor?.getHTML() ?? "",
        segment: "consented",
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
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
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

  // ── Toolbar button helper ──
  function ToolbarBtn({
    onClick, title, active, children,
  }: { onClick: () => void; title: string; active?: boolean; children: React.ReactNode }) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", active && "bg-accent text-accent-foreground")}
        title={title}
        onClick={onClick}
      >
        {children}
      </Button>
    );
  }

  // ── Skeleton rows ──
  function SkeletonRows() {
    return (
      <>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><div className="h-4 w-36 animate-pulse rounded bg-muted" /><div className="mt-1.5 h-3 w-20 animate-pulse rounded bg-muted" /></TableCell>
            <TableCell><div className="h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
            <TableCell><div className="h-5 w-16 animate-pulse rounded-full bg-muted" /></TableCell>
            <TableCell><div className="h-5 w-14 animate-pulse rounded-full bg-muted" /></TableCell>
            <TableCell><div className="h-8 w-8 animate-pulse rounded bg-muted" /></TableCell>
          </TableRow>
        ))}
      </>
    );
  }

  return (
    <AdminLayout title="E-maily & marketing">
      {/* ── Toast notifications ── */}
      <div className="pointer-events-none fixed right-6 top-20 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm animate-in slide-in-from-right-5 fade-in duration-300",
              toast.type === "success" && "border-success/30 bg-success/10 text-success",
              toast.type === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
              toast.type === "info" && "border-primary/30 bg-primary/10 text-primary"
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
          { label: "Marketing souhlas", value: consentedCount, icon: ShieldCheck, color: "text-success" },
          { label: "Bez souhlasu", value: leads.length - consentedCount, icon: ShieldOff, color: "text-warning" },
          { label: "Aktuální segment", value: filtered.length, icon: Mail, color: "text-primary" },
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

      {/* ── Leads card ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Správa kontaktů</CardTitle>
              <CardDescription>Filtrace, správa a export poptávek od návštěvníků.</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export CSV ({filtered.length})
            </Button>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Tabs value={segment} onValueChange={(v) => setSegment(v as typeof segment)} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="all">Vše ({leads.length})</TabsTrigger>
                <TabsTrigger value="consented">Souhlas ({consentedCount})</TabsTrigger>
                <TabsTrigger value="pending">Bez souhlasu ({leads.length - consentedCount})</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                {!loading && filtered.length === 0 && (
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
                {!loading && filtered.map((lead) => (
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
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handleDelete(lead.id)}
                        title="Smazat kontakt"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Campaign composer card ── */}
      <Card>
        <CardHeader>
          <CardTitle>Nová kampaň</CardTitle>
          <CardDescription>
            Vytvořte a odešlete marketingový e-mail kontaktům se souhlasem ({consentedCount} příjemců).
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
                    className={cn(!fromEmailValid && fromEmail && "border-destructive focus-visible:ring-destructive")}
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
                    className={cn(!subjectValid && "border-destructive focus-visible:ring-destructive")}
                  />
                  {!subjectValid && (
                    <p className="text-xs text-destructive">Předmět je povinný.</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="preheader">
                  Preheader{" "}
                  <span className="font-normal text-muted-foreground">(volitelný)</span>
                </Label>
                <Input
                  id="preheader"
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  placeholder="Krátký text viditelný v náhledu v inboxu"
                />
              </div>

              {/* ── TipTap editor ── */}
              <div className="space-y-1.5">
                <Label>Obsah e-mailu</Label>
                <div className="overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-px border-b border-input bg-muted/60 px-1.5 py-1">
                    {/* History */}
                    <div className="flex items-center gap-px">
                      <ToolbarBtn title="Zpět (Ctrl+Z)" onClick={() => editor?.chain().focus().undo().run()}>
                        <Undo2 className="h-4 w-4" />
                      </ToolbarBtn>
                      <ToolbarBtn title="Znovu (Ctrl+Shift+Z)" onClick={() => editor?.chain().focus().redo().run()}>
                        <Redo2 className="h-4 w-4" />
                      </ToolbarBtn>
                    </div>
                    <Separator orientation="vertical" className="mx-1 h-5" />
                    {/* Text style */}
                    <div className="flex items-center gap-px">
                      <ToolbarBtn
                        title="Tučně (Ctrl+B)"
                        active={editor?.isActive("bold")}
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                      >
                        <Bold className="h-4 w-4" />
                      </ToolbarBtn>
                      <ToolbarBtn
                        title="Kurzíva (Ctrl+I)"
                        active={editor?.isActive("italic")}
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                      >
                        <Italic className="h-4 w-4" />
                      </ToolbarBtn>
                      <ToolbarBtn
                        title="Přeškrtnutí"
                        active={editor?.isActive("strike")}
                        onClick={() => editor?.chain().focus().toggleStrike().run()}
                      >
                        <Strikethrough className="h-4 w-4" />
                      </ToolbarBtn>
                      <ToolbarBtn
                        title="Kód"
                        active={editor?.isActive("code")}
                        onClick={() => editor?.chain().focus().toggleCode().run()}
                      >
                        <Code className="h-4 w-4" />
                      </ToolbarBtn>
                    </div>
                    <Separator orientation="vertical" className="mx-1 h-5" />
                    {/* Structure */}
                    <div className="flex items-center gap-px">
                      <ToolbarBtn
                        title="Nadpis H2"
                        active={editor?.isActive("heading", { level: 2 })}
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                      >
                        <Heading2 className="h-4 w-4" />
                      </ToolbarBtn>
                      <ToolbarBtn
                        title="Odrážkový seznam"
                        active={editor?.isActive("bulletList")}
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                      >
                        <List className="h-4 w-4" />
                      </ToolbarBtn>
                      <ToolbarBtn
                        title="Číslovaný seznam"
                        active={editor?.isActive("orderedList")}
                        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                      >
                        <ListOrdered className="h-4 w-4" />
                      </ToolbarBtn>
                    </div>
                    <Separator orientation="vertical" className="mx-1 h-5" />
                    {/* Media */}
                    <div className="flex items-center gap-px">
                      <ToolbarBtn
                        title="Odkaz (Ctrl+K)"
                        active={editor?.isActive("link")}
                        onClick={handleInsertLink}
                      >
                        <Link2 className="h-4 w-4" />
                      </ToolbarBtn>
                      <ToolbarBtn title="Vložit obrázek (URL)" onClick={handleInsertImageUrl}>
                        <ImageIcon className="h-4 w-4" />
                      </ToolbarBtn>
                      <ToolbarBtn title="Nahrát obrázek" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4" />
                      </ToolbarBtn>
                    </div>
                    <Separator orientation="vertical" className="mx-1 h-5" />
                    {/* Preview */}
                    <ToolbarBtn title="Náhled e-mailu" onClick={() => setPreviewOpen(true)}>
                      <Eye className="h-4 w-4" />
                    </ToolbarBtn>
                    <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleUploadImage} />
                  </div>

                  {/* TipTap content area — drag/drop handled by editor's handleDrop */}
                  <EditorContent editor={editor} className="tiptap-email-editor" />
                </div>
              </div>

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
                      className={cn("w-60", !testEmailValid && testEmail && "border-destructive focus-visible:ring-destructive")}
                    />
                    <Button type="button" variant="outline" onClick={handleSendTest} disabled={!canSendTest || sendingTest}>
                      {sendingTest
                        ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        : <SendHorizonal className="mr-1.5 h-4 w-4" />}
                      Poslat test
                    </Button>
                  </div>
                  {!testEmailValid && testEmail && (
                    <p className="text-xs text-destructive">Neplatný formát e-mailu.</p>
                  )}
                </div>
                {/* Campaign send */}
                <Button
                  type="button"
                  size="lg"
                  onClick={() => setConfirmSendOpen(true)}
                  disabled={!canSend || sending}
                >
                  {sending
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <SendHorizonal className="mr-2 h-4 w-4" />}
                  Odeslat kampaň ({consentedCount})
                </Button>
              </div>
            </div>

            {/* ── Live preview sidebar ── */}
            <div className="hidden xl:block">
              <div className="sticky top-24 space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Živý náhled</h4>
                <div className="overflow-hidden rounded-lg border shadow-sm">
                  <div className="space-y-1 border-b bg-muted/40 px-4 py-3 text-xs">
                    <p><span className="font-semibold text-muted-foreground">Od:</span> {fromEmail || "—"}</p>
                    <p><span className="font-semibold text-muted-foreground">Předmět:</span> {subject || "—"}</p>
                    {preheader && <p className="text-muted-foreground/70">{preheader}</p>}
                  </div>
                  <div
                    className="email-preview-body max-h-[500px] overflow-y-auto p-4"
                    dangerouslySetInnerHTML={{ __html: editorHtml }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Full preview dialog ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Náhled e-mailu</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg border">
            <div className="space-y-1 border-b bg-muted/40 px-4 py-3 text-sm">
              <p><span className="font-semibold text-muted-foreground">Od:</span> {fromEmail || "info@skytravel.cz"}</p>
              <p><span className="font-semibold text-muted-foreground">Předmět:</span> {subject}</p>
              {preheader && <p className="text-xs text-muted-foreground">{preheader}</p>}
            </div>
            <div
              className="email-preview-body max-h-[60vh] overflow-y-auto p-5"
              dangerouslySetInnerHTML={{ __html: editorHtml }}
            />
          </div>
        </DialogContent>
      </Dialog>

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
