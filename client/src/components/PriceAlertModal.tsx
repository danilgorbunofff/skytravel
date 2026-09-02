import { useState } from "react";
import type { UnifiedTour } from "../types/providers";
import { formatPrice } from "../utils";
import { useLanguage } from "../hooks/useLanguage";

interface Props {
  tour: UnifiedTour;
  onClose: () => void;
}

export function PriceAlertModal({ tour, onClose }: Props) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [priceMax, setPriceMax] = useState(Math.ceil(tour.price * 0.9));
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          providerId: tour.source,
          externalId: tour.externalId,
          tourTitle: tour.title,
          priceMax,
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label={t("sModalClose")}
        >
          ✕
        </button>
        <h2>🔔 {t("sPriceAlertTitle")}</h2>
        <p className="modal-subtitle">{tour.title}</p>
        {status === "done" ? (
          <p className="alert-success">
            ✓ {t("sPriceAlertDone")} {formatPrice(priceMax)}
          </p>
        ) : (
          <form onSubmit={submit}>
            <label>
              {t("sModalEmailLabel")}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="vas@email.cz"
              />
            </label>
            <label>
              {t("sPriceAlertLabel")}
              <input
                type="number"
                min={1}
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                required
              />
            </label>
            {status === "error" && <p className="alert-error">{t("modalError")}</p>}
            <button type="submit" disabled={status === "loading"} className="btn-primary">
              {status === "loading" ? t("sPriceAlertSaving") : t("sPriceAlertSubmit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
