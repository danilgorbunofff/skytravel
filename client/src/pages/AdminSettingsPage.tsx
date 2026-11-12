import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { csrfFetch } from "../lib/csrf";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function AdminSettingsPage() {
  const [leadPopupEnabled, setLeadPopupEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/admin/site-settings`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((body: { data: { leadPopupEnabled: boolean } }) =>
        setLeadPopupEnabled(body.data.leadPopupEnabled),
      )
      .catch(() => setError("Nepodařilo se načíst nastavení."))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(checked: boolean) {
    setSaving(true);
    setError(null);
    try {
      const r = await csrfFetch(`${API_URL}/api/admin/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadPopupEnabled: checked }),
      });
      if (!r.ok) throw new Error();
      const body = (await r.json()) as { data: { leadPopupEnabled: boolean } };
      setLeadPopupEnabled(body.data.leadPopupEnabled);
      // Keep localStorage in sync for legacy clients (best-effort)
      try {
        localStorage.setItem("leadPopupEnabled", String(body.data.leadPopupEnabled));
      } catch {
        // ignore
      }
    } catch {
      setError("Uložení se nezdařilo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout title="Nastavení adminu">
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
          <p className="text-xs text-muted-foreground">Uložení probíhá okamžitě pro celý web.</p>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
