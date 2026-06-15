import { RotateCcw, X } from "lucide-react";

/**
 * Chip data for an active filter.
 */
export interface ChipData {
  /** Unique key for React reconciliation (falls back to `label`). */
  key?: string;
  /** Display label shown in the chip. */
  label: string;
  /** Called when the chip's clear button is clicked. */
  onClear: () => void;
}

interface Props {
  /** Active filter chips to display. */
  chips: ChipData[];
  /** Called when the "Reset all filters" button is clicked. */
  onResetAll: () => void;
}

/**
 * Displays a row of active filter chips that can be individually dismissed,
 * plus a "Reset all" action.
 *
 * @example
 * ```tsx
 * <ActiveFilterChips
 *   chips={[
 *     { key: "query", label: '"Egypt"', onClear: () => setQuery("") },
 *     { key: "stars", label: "★4+", onClear: () => setStars(null) },
 *   ]}
 *   onResetAll={() => resetFilters()}
 * />
 * ```
 */
export function ActiveFilterChips({ chips, onResetAll }: Props) {
  if (chips.length === 0) return null;

  return (
    <div className="active-chips">
      {chips.map((chip) => (
        <button
          key={chip.key ?? chip.label}
          type="button"
          className="active-chip"
          onClick={chip.onClear}
          aria-label={`Odebrat filtr: ${chip.label}`}
        >
          {chip.label} <X size={12} aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        className="active-chip active-chip--reset"
        onClick={onResetAll}
        aria-label="Resetovat všechny filtry"
      >
        <RotateCcw size={12} aria-hidden="true" />
        Resetovat
      </button>
    </div>
  );
}
