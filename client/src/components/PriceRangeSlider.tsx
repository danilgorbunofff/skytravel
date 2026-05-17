import { useEffect, useRef, useState } from "react";

interface Props {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
}

export function PriceRangeSlider({ min, max, valueMin, valueMax, onChange }: Props) {
  const [localMin, setLocalMin] = useState(valueMin);
  const [localMax, setLocalMax] = useState(valueMax);
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalMin(valueMin); }, [valueMin]);
  useEffect(() => { setLocalMax(valueMax); }, [valueMax]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

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
          <span>{Number.isFinite(min) ? min.toLocaleString("cs-CZ") : "—"} Kč</span>
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
        <span>{localMin.toLocaleString("cs-CZ")} Kč</span>
        <span>{localMax.toLocaleString("cs-CZ")} Kč</span>
      </div>
      <div className="price-slider__track">
        <input
          type="range"
          min={min}
          max={max}
          step={500}
          value={localMin}
          aria-label={`Cena od ${localMin.toLocaleString("cs-CZ")} Kč`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={localMin}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), localMax - 500);
            setLocalMin(v);
            commit(v, localMax);
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={500}
          value={localMax}
          aria-label={`Cena do ${localMax.toLocaleString("cs-CZ")} Kč`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={localMax}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), localMin + 500);
            setLocalMax(v);
            commit(localMin, v);
          }}
        />
      </div>
    </div>
  );
}
