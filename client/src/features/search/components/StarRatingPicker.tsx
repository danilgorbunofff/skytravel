import { Star } from "lucide-react";
import type { TranslationKey } from "../../../hooks/useLanguage";

interface Props {
  t: (key: TranslationKey) => string;
  value: string;
  onChange: (value: string) => void;
}

const STAR_VALUES = ["", "3", "4", "5"] as const;

export function StarRatingPicker({ t, value, onChange }: Props) {
  return (
    <div className="star-rating-picker" role="radiogroup" aria-label={t("sFilterStars")}>
      {STAR_VALUES.map((v) => {
        const isActive = value === v;
        const starCount = v === "" ? 0 : Number(v);
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`star-rating-picker__btn${isActive ? " is-active" : ""}`}
            onClick={() => onChange(v)}
          >
            {v === "" ? (
              <span className="star-rating-picker__any">{t("sFilterAll")}</span>
            ) : (
              <span className="star-rating-picker__stars">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={i < starCount ? "star-filled" : "star-empty"}
                    aria-hidden="true"
                  />
                ))}
                <span className="star-rating-picker__label">{v}+</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
