interface StarRatingProps {
  rating: number;
  max?: number;
  /** Optional aria-label override. Defaults to Czech "Hodnocení X z Y hvězdiček". */
  ariaLabel?: string;
}

/**
 * Accessible star rating component using inline SVGs.
 * Renders filled/hollow stars with screen-reader text.
 */
export default function StarRating({ rating, max = 5, ariaLabel }: StarRatingProps) {
  const safeRating = Math.min(Math.max(1, Math.round(rating)), max);
  const label = ariaLabel ?? `Hodnocení ${safeRating} z ${max} hvězdiček`;

  return (
    <span
      role="img"
      aria-label={label}
      className="star-rating"
    >
      {Array.from({ length: max }, (_, i) => (
        <svg
          key={i}
          aria-hidden="true"
          className={`star-rating__icon${i < safeRating ? " star-rating__icon--filled" : ""}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={i < safeRating ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />
        </svg>
      ))}
    </span>
  );
}
