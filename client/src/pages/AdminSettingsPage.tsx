import { useState } from "react";
import AdminLayout from "../components/AdminLayout";
import "../admin.css";

export default function AdminSettingsPage() {
  const [leadPopupEnabled, setLeadPopupEnabled] = useState(() => {
    const raw = localStorage.getItem("leadPopupEnabled");
    return raw === null ? true : raw === "true";
  });

  function handleToggle() {
    setLeadPopupEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("leadPopupEnabled", String(next));
      return next;
    });
  }

  return (
    <AdminLayout title="Nastavení adminu">
      <section className="admin-card">
        <h2>Nastavení</h2>
        <div className="settings-row">
          <div>
            <strong>Marketingový popup (travel guide)</strong>
            <p className="note">
              Zobrazí okno pro sběr e-mailu s bonusovým travel guide.
            </p>
          </div>
          <button
            type="button"
            className={`toggle-btn${leadPopupEnabled ? " is-on" : ""}`}
            onClick={handleToggle}
            aria-pressed={leadPopupEnabled}
          >
            <span />
          </button>
        </div>
      </section>
    </AdminLayout>
  );
}
