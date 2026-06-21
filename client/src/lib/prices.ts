export const MIN_PUBLIC_TOUR_PRICE_CZK = 0;

export function isPlausibleTourPrice(price: number | null | undefined): price is number {
  return typeof price === "number" && Number.isFinite(price) && price >= MIN_PUBLIC_TOUR_PRICE_CZK;
}
