import type { TranslationKey } from "../../../hooks/useLanguage";
import { getBoardOptions } from "../constants";

interface Props {
  t: (key: TranslationKey) => string;
  /** Comma-separated active board values, e.g. "AI,UAI" */
  value: string;
  onChange: (value: string) => void;
}

export function BoardMultiSelect({ t, value, onChange }: Props) {
  const options = getBoardOptions(t);
  const activeValues = value ? value.split(",").filter(Boolean) : [];

  function toggle(boardValue: string) {
    if (activeValues.includes(boardValue)) {
      const next = activeValues.filter((v) => v !== boardValue);
      onChange(next.join(","));
    } else {
      onChange([...activeValues, boardValue].join(","));
    }
  }

  function clearAll() {
    onChange("");
  }

  return (
    <div className="filter-btn-list board-multi-select">
      <button
        type="button"
        className={`board-multi-select__btn${activeValues.length === 0 ? " is-active" : ""}`}
        onClick={clearAll}
      >
        {t("sFilterAll")}
      </button>
      {options.map((o) => {
        const isActive = activeValues.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            className={`board-multi-select__btn${isActive ? " is-active" : ""}`}
            onClick={() => toggle(o.value)}
            aria-pressed={isActive}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
