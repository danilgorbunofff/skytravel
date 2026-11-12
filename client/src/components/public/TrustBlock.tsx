import type { PublicLocale } from "../../i18n/locales";
import { publicStrings } from "./strings";

/** Trust points + reviews placeholder. TODO: replace placeholder reviews with real ones. */
export function TrustBlock({ lang }: { lang: PublicLocale }) {
  const s = publicStrings(lang);
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

        <h2 className="pub-h2 pub-reviews__title">{s.reviewsTitle}</h2>
        {/* TODO: replace with real client reviews (name, text, destination). */}
        <div className="pub-reviews">
          {[1, 2, 3].map((n) => (
            <figure key={n} className="pub-review pub-review--placeholder">
              <blockquote>{s.reviewsPlaceholder}</blockquote>
              <figcaption>— SkyTravel</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
