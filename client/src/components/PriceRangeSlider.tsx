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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalMin(valueMin); }, [valueMin]);
  useEffect(() => { setLocalMax(valueMax); }, [valueMax]);

  function commit(nextMin: number, nextMax: number) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(nextMin, nextMax), 400);
  }

  if (min >= max) return null;

  return (
    <div className="price-slider">
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
