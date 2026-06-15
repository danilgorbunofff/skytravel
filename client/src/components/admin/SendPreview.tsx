import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

type Props = {
  editorHtml: string;
  fromEmail: string;
  subject: string;
  preheader: string;
  previewOpen: boolean;
  onPreviewOpenChange: (open: boolean) => void;
};

export default function SendPreview({
  editorHtml,
  fromEmail,
  subject,
  preheader,
  previewOpen,
  onPreviewOpenChange,
}: Props) {
  return (
    <>
      {/* ── Live preview sidebar ── */}
      <div className="hidden xl:block">
        <div className="sticky top-24 space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Živý náhled</h4>
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <div className="space-y-1 border-b bg-muted/40 px-4 py-3 text-xs">
              <p>
                <span className="font-semibold text-muted-foreground">Od:</span>{" "}
                {fromEmail || "—"}
              </p>
              <p>
                <span className="font-semibold text-muted-foreground">Předmět:</span>{" "}
                {subject || "—"}
              </p>
              {preheader && <p className="text-muted-foreground/70">{preheader}</p>}
            </div>
            <div
              className="email-preview-body max-h-[500px] overflow-y-auto p-4"
              dangerouslySetInnerHTML={{ __html: editorHtml }}
            />
          </div>
        </div>
      </div>

      {/* ── Full preview dialog ── */}
      <Dialog open={previewOpen} onOpenChange={onPreviewOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Náhled e-mailu</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg border">
            <div className="space-y-1 border-b bg-muted/40 px-4 py-3 text-sm">
              <p>
                <span className="font-semibold text-muted-foreground">Od:</span>{" "}
                {fromEmail || "info@skytravel.cz"}
              </p>
              <p>
                <span className="font-semibold text-muted-foreground">Předmět:</span> {subject}
              </p>
              {preheader && <p className="text-xs text-muted-foreground">{preheader}</p>}
            </div>
            <div
              className="email-preview-body max-h-[60vh] overflow-y-auto p-5"
              dangerouslySetInnerHTML={{ __html: editorHtml }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
