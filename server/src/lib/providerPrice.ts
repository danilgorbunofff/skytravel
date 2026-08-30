const DEFAULT_MIN_PROVIDER_TOUR_PRICE_CZK = 2000;

function readMinProviderTourPrice(): number {
  const value = Number(process.env.MIN_PROVIDER_TOUR_PRICE_CZK);
  return Number.isFinite(value) && value > 0
    ? Math.round(value)
    : DEFAULT_MIN_PROVIDER_TOUR_PRICE_CZK;
}

export const MIN_PROVIDER_TOUR_PRICE_CZK = readMinProviderTourPrice();

export function isPlausibleProviderPriceCzk(price: number | null | undefined): price is number {
  return (
    typeof price === "number" && Number.isFinite(price) && price >= MIN_PROVIDER_TOUR_PRICE_CZK
  );
}
