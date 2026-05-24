import { Plane, Bus, Car } from "lucide-react";
import type { TranslationKey } from "../../../hooks/useLanguage";

interface Props {
  t: (key: TranslationKey) => string;
  value: string;
  onChange: (value: string) => void;
}

const TRANSPORT_ICONS: Record<string, typeof Plane> = {
  plane: Plane,
  bus: Bus,
  car: Car,
};

export function TransportFilter({ t, value, onChange }: Props) {
  const options = [
    { value: "plane", label: t("sTransportPlane") },
    { value: "bus", label: t("sTransportBus") },
    { value: "car", label: t("sTransportCar") },
  ];

  return (
    <div className="filter-btn-list transport-filter">
      <button
        type="button"
        className={`transport-filter__btn${!value ? " is-active" : ""}`}
        onClick={() => onChange("")}
      >
        {t("sFilterAll")}
      </button>
      {options.map((o) => {
        const Icon = TRANSPORT_ICONS[o.value] ?? Plane;
        const isActive = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            className={`transport-filter__btn${isActive ? " is-active" : ""}`}
            onClick={() => onChange(isActive ? "" : o.value)}
            title={o.label}
          >
            <Icon size={16} aria-hidden="true" />
            <span className="transport-filter__label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
