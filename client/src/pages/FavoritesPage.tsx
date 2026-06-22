import { useNavigate } from "react-router-dom";
import { useLanguage } from "../hooks/useLanguage";
import { useFavorites } from "../hooks/useFavorites";
import { usePageTitle } from "../hooks/usePageTitle";
import { PublicTourCard } from "../features/search/components/PublicTourCard";
import "../site.css";

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  usePageTitle(t("favoritesPageTitle"));
  const { favoriteTours, toggle } = useFavorites();

  return (
    <div className="favorites-page">
      <div className="favorites-page__header">
        <h1>{t("favoritesPageTitle")}</h1>
        {favoriteTours.length > 0 && (
          <p className="favorites-page__count">
            {favoriteTours.length} {t("favoritesPageCount")}
          </p>
        )}
      </div>

      {favoriteTours.length === 0 ? (
        <div className="favorites-page__empty">
          <p>{t("favoritesPageEmpty")}</p>
          <button
            type="button"
            className="favorites-page__back-btn"
            onClick={() => navigate("/")}
          >
            {t("favoritesPageBack")}
          </button>
        </div>
      ) : (
        <div className="favorites-page__grid">
          {favoriteTours.map((tour) => {
            const id = `${tour.source}-${tour.externalId}`;
            return (
              <PublicTourCard
                key={id}
                t={t}
                tour={tour}
                viewMode="grid"
                isFavorite={true}
                onToggleFavorite={() => toggle(tour)}
                onOpenDetail={() => navigate(`/search?tourId=${id}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
