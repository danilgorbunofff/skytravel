export const MIN_PUBLIC_TOUR_PRICE_CZK = 2000;

export function isPlausibleTourPrice(price: number | null | undefined): price is number {
  return typeof price === "number" && Number.isFinite(price) && price >= MIN_PUBLIC_TOUR_PRICE_CZK;
}

/**
 * Discount in whole percent when the provider's original price is meaningfully higher than
 * the current one; null otherwise (no original price, implausible data, or under 3 %).
 */
export function discountPercent(
  price: number,
  originalPrice: number | null | undefined,
): number | null {
  if (!isPlausibleTourPrice(price) || !isPlausibleTourPrice(originalPrice)) return null;
  if (originalPrice <= price) return null;
  const percent = Math.round((1 - price / originalPrice) * 100);
  return percent >= 3 && percent < 90 ? percent : null;
}
