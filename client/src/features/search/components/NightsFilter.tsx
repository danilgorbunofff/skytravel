import type { TranslationKey } from "../../../hooks/useLanguage";
import { getNightsOptions } from "../constants";

interface Props {
  t: (key: TranslationKey) => string;
  value: string;
  onChange: (value: string) => void;
}

export function NightsFilter({ t, value, onChange }: Props) {
  const options = getNightsOptions(t);

  return (
    <div className="filter-btn-list nights-filter">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`nights-filter__btn${value === o.value ? " is-active" : ""}`}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
