import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import AdminToastViewport from "../components/admin/AdminToastViewport";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { fetchSiteSettings, updateSiteSettings } from "../features/admin/services/adminApi";
import { useAdminToast } from "../features/admin/hooks/useAdminToast";

export default function AdminSettingsPage() {
  const [leadPopupEnabled, setLeadPopupEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toasts, showToast, dismissToast } = useAdminToast();

  useEffect(() => {
    fetchSiteSettings()
      .then((settings) => setLeadPopupEnabled(settings.leadPopupEnabled))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Nepodařilo se načíst nastavení."),
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(checked: boolean) {
    setSaving(true);
    setError(null);
    try {
      const settings = await updateSiteSettings({ leadPopupEnabled: checked });
      setLeadPopupEnabled(settings.leadPopupEnabled);
      // Keep localStorage in sync for legacy clients (best-effort)
      try {
        localStorage.setItem("leadPopupEnabled", String(settings.leadPopupEnabled));
      } catch {
        // ignore
      }
      showToast(
        settings.leadPopupEnabled
          ? "Uloženo: marketingový popup je zapnutý."
          : "Uloženo: marketingový popup je vypnutý.",
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Uložení se nezdařilo.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout title="Nastavení adminu">
      <AdminToastViewport toasts={toasts} onDismiss={dismissToast} />
      <Card>
        <CardHeader>
          <CardTitle>Nastavení</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div className="space-y-1">
              <Label htmlFor="lead-popup" className="text-base font-semibold">
                Marketingový popup (travel guide)
              </Label>
              <p className="text-sm text-muted-foreground">
                Globální přepínač — zobrazí okno pro sběr e-mailu všem návštěvníkům.
              </p>
            </div>
            <Switch
              id="lead-popup"
              checked={leadPopupEnabled}
              onCheckedChange={handleToggle}
              disabled={loading || saving}
              aria-busy={loading || saving}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {saving ? "Ukládám…" : "Uložení probíhá okamžitě pro celý web."}
          </p>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
