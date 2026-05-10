import { useState } from "react";
import type { UnifiedTour } from "../types/providers";
import { formatPrice } from "../utils";

interface Props {
  tour: UnifiedTour;
  onClose: () => void;
}

export function PriceAlertModal({ tour, onClose }: Props) {
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Zavřít">
          ✕
        </button>
        <h2>🔔 Upozornit na slevu</h2>
        <p className="modal-subtitle">{tour.title}</p>
        {status === "done" ? (
          <p className="alert-success">
            ✓ Zaregistrováno! Pošleme vám email, jakmile cena klesne pod{" "}
            {formatPrice(priceMax)}.
          </p>
        ) : (
          <form onSubmit={submit}>
            <label>
              Váš email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="vas@email.cz"
              />
            </label>
            <label>
              Upozornit při ceně pod (Kč)
              <input
                type="number"
                min={1}
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                required
              />
            </label>
            {status === "error" && (
              <p className="alert-error">Chyba. Zkuste to prosím znovu.</p>
            )}
            <button type="submit" disabled={status === "loading"} className="btn-primary">
              {status === "loading" ? "Ukládám…" : "Zaregistrovat upozornění"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
