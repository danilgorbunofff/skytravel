// Helpers for emitting responsive <img> attributes.
// `srcSet` is only safe for CDNs that honour a `w=` query string param —
// today that means Unsplash. Provider-supplied URLs (Alexandria, Orextravel)
// are returned unchanged.

export function isResizableImage(url: string): boolean {
  return /images\.unsplash\.com/.test(url);
}

const KNOWN_IMAGE_HOSTS = [
  "images.alexandria.cz",
  "images.unsplash.com",
];

export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname;
    if (KNOWN_IMAGE_HOSTS.some((host) => hostname.includes(host))) return true;
  } catch {
    return false;
  }
  return /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(url);
}

export function withWidth(url: string, width: number): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("w", String(width));
    parsed.searchParams.set("q", "75");
    parsed.searchParams.set("auto", "format");
    return parsed.toString();
  } catch {
    return url;
  }
}

export function buildSrcSet(
  url: string,
  widths: readonly number[] = [480, 768, 1200],
): string | undefined {
  if (!isResizableImage(url)) return undefined;
  return widths.map((w) => `${withWidth(url, w)} ${w}w`).join(", ");
}
