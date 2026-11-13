import type { Favorite } from "../../data";
import type { PublicDestinationSummary } from "../../types/providers";
import type { TranslationKey } from "../../hooks/useLanguage";
import { formatPrice } from "../../utils";
import { localeForText } from "../../lib/locale";
import { plural } from "../../lib/plural";

interface Props {
  favorites: Favorite[];
  destinationCounts: Record<string, PublicDestinationSummary>;
  onClick: (item: Favorite) => void;
  t: (key: TranslationKey) => string;
}

export default function FavoriteDestinations({ favorites, destinationCounts, onClick, t }: Props) {
  return (
    <section id="destinace" className="section section-white">
      <div className="container">
        <header className="section-head">
          <h2>{t("sectionFavTitle")}</h2>
        </header>
        <div id="favoriteGrid" className="favorite-grid">
          {favorites.map((item) => {
            const liveDestination = destinationCounts[item.destination];
            const livePrice = liveDestination?.minPrice ?? item.price;
            const liveCount = liveDestination?.count ?? 0;
            return (
              <article
                key={item.destination}
                className="favorite-card"
                role="link"
                tabIndex={0}
                style={{ backgroundImage: `url('${item.image}')` }}
                onClick={() => onClick(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onClick(item);
                }}
              >
                <div className="favorite-card__body">
                  <h3>{item.destination}</h3>
                  <span className="price-pill">
                    {t("from")} {formatPrice(livePrice)}
                  </span>
                  {liveCount > 0 && (
                    <span className="favorite-card__count">
                      {liveCount.toLocaleString(localeForText())} {plural(liveCount, "pTerms", t)}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
