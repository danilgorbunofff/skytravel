import { useState } from "react";
import type { TranslationKey } from "../../../hooks/useLanguage";

interface Props {
  description?: string;
  offers: React.ReactNode;
  t: (key: TranslationKey) => string;
}

type Tab = "description" | "dates" | "location";

export function TourDetailTabs({ description, offers, t }: Props) {
  const [active, setActive] = useState<Tab>(description ? "description" : "dates");

  const tabs: { id: Tab; label: string }[] = [
    ...(description ? [{ id: "description" as Tab, label: "Popis" }] : []),
    { id: "dates", label: t("sModalAvailableDates") },
    { id: "location", label: "Umístění" },
  ];

  return (
    <div className="tour-detail-tabs">
      <div className="tour-detail-tabs__nav" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            className={`tour-detail-tabs__tab${active === tab.id ? " is-active" : ""}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tour-detail-tabs__panel" role="tabpanel">
        {active === "description" && description && (
          <div className="tour-detail-tabs__description">
            <p>{description}</p>
          </div>
        )}
        {active === "dates" && offers}
        {active === "location" && (
          <div className="tour-detail-tabs__location">
            <p className="tour-detail-tabs__placeholder">
              Informace o umístění hotelu budou brzy k dispozici.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
