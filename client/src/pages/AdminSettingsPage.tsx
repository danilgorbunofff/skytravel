import { useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";

export default function AdminSettingsPage() {
  const [leadPopupEnabled, setLeadPopupEnabled] = useState(() => {
    const raw = localStorage.getItem("leadPopupEnabled");
    return raw === null ? true : raw === "true";
  });

  function handleToggle(checked: boolean) {
    setLeadPopupEnabled(checked);
    localStorage.setItem("leadPopupEnabled", String(checked));
  }

  return (
    <AdminLayout title="Nastavení adminu">
      <Card>
        <CardHeader>
          <CardTitle>Nastavení</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div className="space-y-1">
              <Label htmlFor="lead-popup" className="text-base font-semibold">
                Marketingový popup (travel guide)
              </Label>
              <p className="text-sm text-muted-foreground">
                Zobrazí okno pro sběr e-mailu s bonusovým travel guide.
              </p>
            </div>
            <Switch
              id="lead-popup"
              checked={leadPopupEnabled}
              onCheckedChange={handleToggle}
            />
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
