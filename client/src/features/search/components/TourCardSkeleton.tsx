interface Props {
  count?: number;
  viewMode?: "grid" | "list";
}

export function TourCardSkeleton({ count = 6, viewMode = "grid" }: Props) {
  return (
    <div className={viewMode === "grid" ? "tour-grid" : "tour-list"}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`tour-card-skeleton${viewMode === "list" ? " tour-card-skeleton--list" : ""}`}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="tour-card-skeleton__image shimmer" />
          <div className="tour-card-skeleton__body">
            <div className="tour-card-skeleton__line tour-card-skeleton__line--short shimmer" />
            <div className="tour-card-skeleton__line shimmer" />
            <div className="tour-card-skeleton__line tour-card-skeleton__line--meta shimmer" />
            <div className="tour-card-skeleton__line tour-card-skeleton__line--price shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
