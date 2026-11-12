import type { PublicLocale } from "../../i18n/locales";
import { publicStrings } from "./strings";

interface ClientReview {
  name: string;
  text: string;
  destination?: string;
}

/**
 * Real client reviews only. The section stays hidden while this is empty —
 * placeholder testimonials damage trust more than having none.
 */
const REVIEWS: Record<PublicLocale, ClientReview[]> = { cs: [], ru: [] };

/** Trust points + client reviews (when there are any). */
export function TrustBlock({ lang }: { lang: PublicLocale }) {
  const s = publicStrings(lang);
  const reviews = REVIEWS[lang];
  const points = [
    { title: s.trust1Title, text: s.trust1Text, icon: "Kč" },
    { title: s.trust2Title, text: s.trust2Text, icon: "✓" },
    { title: s.trust3Title, text: s.trust3Text, icon: "✉" },
  ];
  return (
    <section className="pub-section pub-trust" aria-labelledby="pub-trust-title">
      <div className="container">
        <h2 id="pub-trust-title" className="pub-h2">
          {s.trustTitle}
        </h2>
        <ul className="pub-trust__grid">
          {points.map((point) => (
            <li key={point.title} className="pub-trust__item">
              <span className="pub-trust__icon" aria-hidden="true">
                {point.icon}
              </span>
              <h3>{point.title}</h3>
              <p>{point.text}</p>
            </li>
          ))}
        </ul>

        {reviews.length > 0 && (
          <>
            <h2 className="pub-h2 pub-reviews__title">{s.reviewsTitle}</h2>
            <div className="pub-reviews">
              {reviews.map((review) => (
                <figure key={`${review.name}-${review.text.slice(0, 16)}`} className="pub-review">
                  <blockquote>{review.text}</blockquote>
                  <figcaption>
                    — {review.name}
                    {review.destination ? `, ${review.destination}` : ""}
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
