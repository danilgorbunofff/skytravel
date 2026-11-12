import { useEffect, useRef, useState } from "react";
import { localeForText } from "../lib/locale";
import { useLanguage } from "../hooks/useLanguage";

interface Props {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function PriceRangeSlider({ min, max, valueMin, valueMax, onChange }: Props) {
  const { t } = useLanguage();
  const [localMin, setLocalMin] = useState(() => clamp(valueMin, min, max));
  const [localMax, setLocalMax] = useState(() => clamp(valueMax, min, max));
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalMin(clamp(valueMin, min, max));
  }, [valueMin, min, max]);
  useEffect(() => {
    setLocalMax(clamp(valueMax, min, max));
  }, [valueMax, min, max]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function commit(nextMin: number, nextMax: number) {
    if (timer.current) clearTimeout(timer.current);
    setPending(true);
    timer.current = setTimeout(() => {
      onChange(nextMin, nextMax);
      setPending(false);
    }, 150);
  }

  if (min >= max) {
    return (
      <div className="price-slider price-slider--empty" aria-disabled="true">
        <div className="price-slider__labels">
          <span>{Number.isFinite(min) ? min.toLocaleString(localeForText()) : "—"} Kč</span>
        </div>
        <p className="price-slider__empty-note">Cenové rozpětí není dostupné</p>
      </div>
    );
  }

  return (
    <div
      className={`price-slider${pending ? " is-pending" : ""}`}
      aria-busy={pending}
      style={pending ? { opacity: 0.9 } : undefined}
    >
      <div className="price-slider__labels">
        <span>{localMin.toLocaleString(localeForText())} Kč</span>
        <span>{localMax.toLocaleString(localeForText())} Kč</span>
      </div>
      <div className="price-slider__track">
        <input
          type="range"
          min={min}
          max={max}
          step={500}
          value={localMin}
          aria-label={`${t("sAriaPriceFrom")} ${localMin.toLocaleString(localeForText())} Kč`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={localMin}
          onChange={(e) => {
            const upperBound = Math.max(min, localMax - 500);
            const nextMin = clamp(Math.min(Number(e.target.value), upperBound), min, upperBound);
            setLocalMin(nextMin);
            commit(nextMin, localMax);
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={500}
          value={localMax}
          aria-label={`${t("sAriaPriceTo")} ${localMax.toLocaleString(localeForText())} Kč`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={localMax}
          onChange={(e) => {
            const lowerBound = Math.min(max, localMin + 500);
            const nextMax = clamp(Math.max(Number(e.target.value), lowerBound), lowerBound, max);
            setLocalMax(nextMax);
            commit(localMin, nextMax);
          }}
        />
      </div>
    </div>
  );
}
