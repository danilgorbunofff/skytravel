/**
 * Lightweight performance monitoring for search UX.
 * Reports Core Web Vitals + custom search timing to console in dev mode.
 */

const IS_DEV = import.meta.env.DEV;

export function initSearchPerformanceMonitoring() {
  if (!("PerformanceObserver" in window)) return;

  // LCP
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lcp = entries[entries.length - 1];
      if (IS_DEV) console.debug("[perf] LCP:", Math.round(lcp.startTime), "ms");
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch { /* unsupported */ }

  // CLS
  try {
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as unknown as { hadRecentInput: boolean }).hadRecentInput) {
          clsValue += (entry as unknown as { value: number }).value;
        }
      }
      if (IS_DEV) console.debug("[perf] CLS:", clsValue.toFixed(4));
    }).observe({ type: "layout-shift", buffered: true });
  } catch { /* unsupported */ }
}

/** Mark the start of a search request */
export function markSearchStart() {
  performance.mark("search-start");
}

/** Mark when results are rendered and measure */
export function markSearchEnd() {
  performance.mark("search-end");
  try {
    const measure = performance.measure("search-response-time", "search-start", "search-end");
    if (IS_DEV) console.debug("[perf] Search response:", Math.round(measure.duration), "ms");
  } catch { /* marks may not exist */ }
}

/** Preload images for next page of results */
export function preloadImages(urls: string[]) {
  urls.slice(0, 6).forEach((url) => {
    if (!url || url.startsWith("/placeholder")) return;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "image";
    link.href = url;
    document.head.appendChild(link);
  });
}
