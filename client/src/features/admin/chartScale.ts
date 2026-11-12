/**
 * Indices of x-axis labels to show so they don't overlap: at most `maxLabels`,
 * evenly spaced, always including the first and the last point.
 */
export function pickLabelIndices(count: number, maxLabels = 6): number[] {
  if (count <= 0) return [];
  if (count <= maxLabels) return Array.from({ length: count }, (_, i) => i);
  const last = count - 1;
  const step = Math.ceil(last / (Math.max(maxLabels, 2) - 1));
  const indices: number[] = [];
  for (let i = 0; i < last; i += step) indices.push(i);
  // Drop the label just before the last one if they would sit too close together.
  if (indices.length > 1 && last - indices[indices.length - 1] < step / 2) indices.pop();
  indices.push(last);
  return indices;
}

/** Rounds `max` up to a "nice" axis top (1, 2, 5 × 10^n) so tick labels are round numbers. */
export function niceAxisMax(max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}
