import { Skeleton } from "./Skeleton";

export function TourCardSkeleton() {
  return (
    <div className="public-tour-card" aria-hidden="true">
      <div className="public-tour-card__image">
        <Skeleton className="h-full w-full rounded-none" />
      </div>
      <div className="public-tour-card__body" style={{ padding: "1rem" }}>
        <Skeleton className="mb-2 h-5 w-3/4" />
        <Skeleton className="mb-3 h-4 w-1/2" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}
