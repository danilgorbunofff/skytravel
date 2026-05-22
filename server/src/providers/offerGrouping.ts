type OfferRow = {
  source: string;
  title: string;
  destination: string;
  price: number;
  startDate: Date | string;
};

export type OfferGroup<T extends OfferRow> = {
  key: string;
  representative: T;
  offers: T[];
};

export const MAX_GROUPED_TOUR_ROWS = 20_000;

export function normalizeOfferText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function buildOfferGroupKey(
  input: Pick<OfferRow, "source" | "title" | "destination">,
): string {
  return [input.source, input.title, input.destination]
    .map((part) => normalizeOfferText(part))
    .join("|");
}

function startTime(value: Date | string): number {
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function shouldReplaceRepresentative<T extends OfferRow>(candidate: T, current: T): boolean {
  if (candidate.price !== current.price) return candidate.price < current.price;
  return startTime(candidate.startDate) < startTime(current.startDate);
}

export function groupOfferRows<T extends OfferRow>(rows: T[]): OfferGroup<T>[] {
  const groups = new Map<string, OfferGroup<T>>();

  for (const row of rows) {
    const key = buildOfferGroupKey(row);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { key, representative: row, offers: [row] });
      continue;
    }

    existing.offers.push(row);
    if (shouldReplaceRepresentative(row, existing.representative)) {
      existing.representative = row;
    }
  }

  return [...groups.values()];
}

export function countOfferGroupsBy<T extends OfferRow>(
  rows: T[],
  getBucketKey: (row: T) => string,
): Map<string, number> {
  const groupKeysByBucket = new Map<string, Set<string>>();

  for (const row of rows) {
    const bucketKey = getBucketKey(row);
    const groupKeys = groupKeysByBucket.get(bucketKey) ?? new Set<string>();
    groupKeys.add(buildOfferGroupKey(row));
    groupKeysByBucket.set(bucketKey, groupKeys);
  }

  return new Map(
    [...groupKeysByBucket.entries()].map(([bucketKey, groupKeys]) => [bucketKey, groupKeys.size]),
  );
}

export function sortOfferGroups<T extends OfferRow>(
  groups: OfferGroup<T>[],
  sortBy: string,
  sortDir: string,
): OfferGroup<T>[] {
  const direction = sortDir === "desc" ? -1 : 1;
  return [...groups].sort((left, right) => {
    const delta =
      sortBy === "date"
        ? startTime(left.representative.startDate) - startTime(right.representative.startDate)
        : left.representative.price - right.representative.price;
    return delta * direction;
  });
}

export function sortOfferRows<T extends OfferRow>(rows: T[], sortBy: string, sortDir: string): T[] {
  const direction = sortDir === "desc" ? -1 : 1;
  return [...rows].sort((left, right) => {
    const delta =
      sortBy === "date"
        ? startTime(left.startDate) - startTime(right.startDate)
        : left.price - right.price;
    return delta * direction;
  });
}
