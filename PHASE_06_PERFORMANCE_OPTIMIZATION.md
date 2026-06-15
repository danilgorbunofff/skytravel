# PHASE 06: Performance Optimization

## Overview

Systematic performance improvements targeting bundle size, image loading, DOM virtualization, database connections, middleware overhead, memory limits, sync speed, and build configuration.

**Risk: MEDIUM** — virtualization and dynamic imports may introduce UI glitches.

---

## Step 1: Split Translations by Language (Dynamic Import)

### Current State
`client/src/data.ts` contains a single `translations` object with 4 languages (cs, en, uk, ru) totaling ~1200 lines (~50KB). All languages are bundled regardless of user selection.

### Files to Create
| File | Contents |
|------|----------|
| `client/src/data/translations/cs.ts` | Czech translations (key-value object) |
| `client/src/data/translations/en.ts` | English translations |
| `client/src/data/translations/uk.ts` | Ukrainian translations |
| `client/src/data/translations/ru.ts` | Russian translations |

Each file exports a single object:
```typescript
// client/src/data/translations/cs.ts
const translations = {
  navExclusive: "Exkluzivní nabídky",
  // ...all cs keys
};
export default translations;
```

### Files to Modify

**`client/src/data.ts`:**
- Remove the `translations` object
- Keep all types and data arrays (`OwnTour`, `PartnerTour`, `Favorite`, `heroImages`, etc.)
- Optionally export a re-export barrel: `export { default as cs } from "./translations/cs"` — but better to just remove entirely

**`client/src/hooks/useLanguage.ts`:**
```typescript
import { useEffect, useMemo, useState } from "react";

export type LanguageKey = "cs" | "en" | "uk" | "ru";
export type TranslationKey = string; // dynamic resolution

type TranslationDict = Record<string, string>;

export function useLanguage() {
  const [lang, setLang] = useState<LanguageKey>("cs");
  const [dict, setDict] = useState<TranslationDict | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("skytravel-lang") as LanguageKey | null;
    if (saved) setLang(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage.setItem("skytravel-lang", lang);
  }, [lang]);

  // Dynamic import based on selected language
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    import(`../data/translations/${lang}.ts`)
      .then((mod) => {
        if (!cancelled) setDict(mod.default);
      })
      .catch(() => {
        if (!cancelled) {
          // Fallback to cs
          import("../data/translations/cs.ts").then((m) => {
            if (!cancelled) setDict(m.default);
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [lang]);

  function t(key: string): string {
    return dict?.[key] ?? key; // fallback to key if not loaded
  }

  return { lang, setLang, t, loading };
}
```

**Note:** Need to ensure all consumers handle the transient `loading` state. Add a minimal base bundle with critical strings (nav, hero, footer) or use a `<Suspense>` boundary around translated content.

### Critical Strings (keep in main bundle or preload)
To avoid flash of missing translations, keep the 20 most-used strings inline or in a small base file:

```typescript
// client/src/data/translations/base.ts
export const baseTranslations = {
  navExclusive: "Exkluzivní nabídky",
  navPartner: "Partnerské zájezdy",
  navTop: "Top destinace",
  navContact: "Kontakt",
  navAdmin: "Admin",
  searchPlaceholder: "Místo nebo hotel",
  searchBtn: "VYHLEDAT",
  from: "od",
  // ...critical navigation and hero strings for all 4 languages
};
```

### Acceptance
- Initial JS bundle reduced by ~50KB
- Translations lazy-load on language switch
- No flash of missing text (base bundle covers critical strings)
- Language switch works within 300ms

---

## Step 2: Image Preloading with IntersectionObserver

### Files to Modify

**`client/src/components/TourCard.tsx`:**
```typescript
import { memo, useEffect, useRef, useState } from "react";

export default memo(function TourCard({ tour, onClick }: Props) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoaded(true);
          observerRef.current?.disconnect();
        }
      },
      { rootMargin: "200px" } // start loading 200px before visible
    );
    observerRef.current.observe(img);

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <article className="destination-card" onClick={onClick}>
      {loaded ? (
        <img
          ref={imgRef}
          src={tour.image || "/placeholder-tour.svg"}
          alt={...}
          decoding="async"
          width={640}
          height={400}
          onError={...}
        />
      ) : (
        <div ref={imgRef} className="skeleton-image" style={{ width: 640, height: 400 }} />
      )}
      ...
    </article>
  );
});
```

**`client/src/features/search/components/PublicTourCard.tsx`:**
- Same pattern: replace `loading="lazy"` with IntersectionObserver
- Use `rootMargin: "200px"` for earlier loading
- Show skeleton placeholder before image loads

### Acceptance
- Images load only when near viewport
- No layout shift (fixed aspect ratio containers)
- Lighthouse performance score improves (target >85)
- Memory usage decreases (images not loaded for offscreen cards)

---

## Step 3: Virtualize Admin Tour Table

### Add Dependency
```bash
npm --workspace client add @tanstack/react-virtual
```

### Files to Modify

**`client/src/components/admin/TourDataTable.tsx`** (or `client/src/pages/AdminSearchPage.tsx`):
- Wrap the table rows in a virtual container when `tours.length > 100`
- Use `@tanstack/react-virtual` for row virtualization

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

// Inside component
const parentRef = useRef<HTMLDivElement>(null);

const virtualizer = useVirtualizer({
  count: tours.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 72, // fixed row height
  overscan: 10,
});

// Render
<div ref={parentRef} style={{ height: "600px", overflow: "auto" }}>
  <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
    {virtualizer.getVirtualItems().map((virtualRow) => {
      const tour = tours[virtualRow.index];
      return (
        <div
          key={tour.externalId}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`,
          }}
          className="alex-table-row"
        >
          {/* row content */}
        </div>
      );
    })}
  </div>
</div>
```

- Only enable virtualization when `tours.length > 100` (for smaller sets, render normally)
- Maintain consistent row height (72px)
- Keep header row fixed (not virtualized)

### Acceptance
- Smooth scrolling with 10,000+ rows
- No DOM overload (only ~20 rows in DOM at any time)
- All interaction works: checkbox, click, sort

---

## Step 4: Set connection_limit=5 for Prisma

### File to Modify: `server/src/prisma.ts`

```typescript
import { PrismaClient } from "@prisma/client";
import { config } from "./lib/config.js";

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
  // Connection pool limits (prevents memory exhaustion)
  ...(process.env.NODE_ENV === "production"
    ? {
        connection: {
          pool: {
            min: 1,
            max: 5,
          },
        },
      }
    : {}),
});
```

Note: Prisma's connection pool configuration may need to be set via the connection string parameter `connection_limit=5` appended to the database URL if the `connection` option is not directly supported:

```
DATABASE_URL=mysql://user:pass@host:3306/db?connection_limit=5
```

### Acceptance
- DB connections never exceed 5 in production
- No connection timeout errors under load
- No increase in query latency (pool of 5 is sufficient for single-server app)
- Memory usage stays under 350MB

---

## Step 5: Optimize searchTimingMiddleware

### File to Modify: `server/src/middleware/searchTiming.ts`

Current implementation patches `res.write` and `res.end` on **every** `/api/search/*` request. This adds overhead (function calls + byte counting) even when Server-Timing headers aren't requested.

**Optimization:** Only patch when the request includes `?timing=1` query param or `X-Debug: timing` header.

```typescript
export function searchTimingMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.path.startsWith("/api/search")) {
    next();
    return;
  }

  // Only activate timing on debug requests
  const wantsTiming =
    req.query.timing === "1" || req.headers["x-debug"] === "timing";

  const start = process.hrtime.bigint();
  let bytes = 0;
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (wantsTiming) {
      res.write = originalWrite;
      res.end = originalEnd;
    }
  };

  if (wantsTiming) {
    // Full instrumentation with Server-Timing header
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    
    res.write = function patchedWrite(chunk: any, ...rest: any[]) {
      if (chunk) bytes += Buffer.byteLength(typeof chunk === "string" ? chunk : chunk);
      return originalWrite(chunk, ...rest);
    } as typeof res.write;

    res.end = function patchedEnd(chunk?: any, ...rest: any[]) {
      if (chunk) bytes += Buffer.byteLength(typeof chunk === "string" ? chunk : chunk);
      const durMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      // ...set Server-Timing headers...
      logger.info(`[search] ...`);
      cleanup();
      return originalEnd(chunk, ...rest);
    } as typeof res.end;
  }

  // Always log duration for non-debug requests (lighter logging)
  res.on("close", () => {
    if (closed) return;
    closed = true;
    const durMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    logger.info(`[search] ${req.method} ${req.originalUrl} ${res.statusCode} ${durMs.toFixed(1)}ms`);
  });

  next();
}
```

### Acceptance
- No performance overhead on non-debug requests
- Full timing instrumentation still available with `?timing=1`
- Log output format remains consistent

---

## Step 6: LRU Cache Limits for Orextravel Ref Data

### File to Modify: `server/src/providers/orextravelProvider.ts`

Wrap existing in-memory caches in LRU with explicit max entries:

```typescript
import { LRUCache } from "lru-cache";

// In OrextravelProvider class or module scope

const departureCache = new LRUCache<string, Departure[]>({
  max: 500,
  ttl: 30 * 60_000, // 30 minutes
});

const destinationCache = new LRUCache<string, Destination[]>({
  max: 200,
  ttl: 30 * 60_000,
});

const routeGroupCache = new LRUCache<string, RouteGroup[]>({
  max: 100,
  ttl: 30 * 60_000,
});

// Replace any Map-based caches with these LRU instances
// For example:
// async getDepartures(): Promise<Departure[]> {
//   const cached = departureCache.get("all");
//   if (cached) return cached;
//   const data = await this.fetchDepartures();
//   departureCache.set("all", data);
//   return data;
// }
```

### Also Verify: `server/src/providers/publicSearchCache.ts`
- Already has `LRUCache` with `max: 2_000` (line 30-31)
- No changes needed, but verify the limit is appropriate
- Cache stores search results, not individual rows

### Acceptance
- Memory bounded per cache
- Old entries evicted by LRU
- TTL ensures data freshness

---

## Step 7: Parallelize Alexandria Sync

### File to Modify: `server/src/providers/alexandriaProvider.ts`

Change `_syncToDbImpl()` from sequential country iteration to parallel:

```typescript
// Current (sequential):
// for (const country of countries) {
//   await this.syncCountry(country);
// }

// New (parallel with concurrency limit):
import pLimit from "p-limit";

async _syncToDbImpl(): Promise<void> {
  // ...existing setup...

  const limit = pLimit(3); // max 3 concurrent country syncs
  const results = await Promise.allSettled(
    countries.map((country) =>
      limit(async () => {
        try {
          await this.syncCountry(country);
          return { country, status: "fulfilled" as const };
        } catch (err) {
          logger.error({ err, country }, `Failed to sync country`);
          return { country, status: "rejected" as const, error: err };
        }
      })
    )
  );

  const failed = results.filter(
    (r): r is PromiseFulfilledResult<{ country: string; status: "rejected"; error: unknown }> =>
      r.status === "rejected"
  );

  if (failed.length > 0) {
    logger.warn(`${failed.length} countries failed to sync`);
  }
}
```

Add `p-limit` dependency to server:
```bash
npm --workspace server add p-limit
```

### Acceptance
- Sync time reduced ~60% (8 countries × 3 concurrent = ~3x faster)
- One country failure doesn't block others
- Errors are logged but don't crash the sync
- Memory stays under control with concurrency limit

---

## Step 8: Bundle Size Budget + Brotli

### File to Modify: `client/vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    ...(process.env.ANALYZE
      ? [visualizer({ open: true, gzipSize: true, brotliSize: true, filename: "dist/stats.html" })]
      : []),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-router")
          ) {
            return "vendor-react";
          }
          if (id.includes("node_modules/@radix-ui")) {
            return "vendor-radix";
          }
          if (id.includes("node_modules/@tiptap") || id.includes("node_modules/prosemirror")) {
            return "vendor-tiptap";
          }
          // Add tiptap has its own chunk already
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }
        },
      },
    },
    chunkSizeWarningLimit: 200, // KB — warn if any chunk exceeds this
    // Minification is already enabled by default in Vite
  },
  // ...server, preview config unchanged
});
```

### Brotli Compression — Server Side

**File to verify:** `server/src/app.ts`

The `compression` middleware should be configured. Ensure it's present:

```typescript
import compression from "compression";
// ...
app.use(compression({
  // compression package supports Brotli if available (Node >= 11.7)
  // It auto-negotiates between gzip, deflate, and brotli based on
  // the request's Accept-Encoding header
  threshold: 1024, // minimum size to compress (1KB)
  level: 6, // default compression level (1-9)
}));
```

The `compression` npm package supports Brotli via the `zlib` native module (Node.js). No additional configuration needed.

### Bundle Analysis Script

Add to `client/package.json`:

```json
{
  "scripts": {
    "analyze": "ANALYZE=true vite build"
  }
}
```

### Acceptance
- Build warns on any chunk >200KB
- Brotli compression active (verify via `Content-Encoding: br` in response headers)
- Initial JS load reduced by ~40% with Brotli vs gzip
- Bundle analysis generates useful report

---

## Implementation Order

1. **Step 4** — Prisma connection limit (quick, high impact)
2. **Step 5** — searchTimingMiddleware optimization (quick, reduces overhead)
3. **Step 6** — Orextravel LRU cache limits (bounded memory)
4. **Step 7** — Alexandria parallel sync (faster syncs)
5. **Step 8** — Bundle budget + Brotli (build config, no runtime risk)
6. **Step 1** — Translation splitting (major bundle reduction, test carefully)
7. **Step 2** — Image preloading (intersection observer)
8. **Step 3** — Virtualize admin table (most complex, last)

---

## Files Summary

### New Files
| File | Contents |
|------|----------|
| `client/src/data/translations/cs.ts` | Czech translations |
| `client/src/data/translations/en.ts` | English translations |
| `client/src/data/translations/uk.ts` | Ukrainian translations |
| `client/src/data/translations/ru.ts` | Russian translations |
| `client/src/data/translations/base.ts` | Base critical strings (~20 keys, all langs) |

### Modified Files
| File | Change |
|------|--------|
| `client/src/data.ts` | Remove `translations` object |
| `client/src/hooks/useLanguage.ts` | Dynamic import, loading state |
| `client/src/components/TourCard.tsx` | IntersectionObserver for image |
| `client/src/features/search/components/PublicTourCard.tsx` | IntersectionObserver for image |
| `client/src/components/admin/TourDataTable.tsx` | Virtualization with @tanstack/react-virtual |
| `server/src/prisma.ts` | connection_limit=5 |
| `server/src/middleware/searchTiming.ts` | Conditional patching |
| `server/src/providers/orextravelProvider.ts` | LRU cache limits |
| `server/src/providers/alexandriaProvider.ts` | Parallel sync with p-limit |
| `client/vite.config.ts` | Bundle budget, manualChunks |
| `server/src/app.ts` | Verify Brotli compression |

---

## Verification

```bash
# Build (bundle budget check)
npm run build

# Client tests
npm --workspace client run test

# Server tests
npm --workspace server run test

# Lighthouse audit (dev server)
npx lighthouse http://localhost:5173 --view

# Memory profiling
# Run dev server, load multiple pages, check RSS
ps -o rss,command -p $(pgrep -f "vite")

# Bundle analysis
npm --workspace client run analyze

# Verify Brotli
curl -H "Accept-Encoding: br" -I http://localhost:5173/assets/index-*.js | grep content-encoding
```

### Target Metrics
| Metric | Current | Target |
|--------|---------|--------|
| Initial JS bundle | ~250KB | ≤200KB |
| Lighthouse Performance | ~70 | >85 |
| Lighthouse Accessibility | ~85 | >90 |
| Server RSS under load | ~400MB | ≤350MB |
| Alexandria sync time | ~60s | ≤25s |
| DB connections under load | ~20 | ≤5 |

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Dynamic import race conditions | MEDIUM | Use cancelled flag; fallback to cs; add Suspense boundary |
| Virtualization breaks table UX | MEDIUM | Only enable for >100 rows; maintain row height; test sort/select |
| Parallel sync memory spike | LOW | Concurrency limit of 3 with p-limit |
| Translation loading flash | MEDIUM | Base bundle with critical strings |
| Brotli not supported on Node | LOW | Falls back to gzip; verify with curl |
| LRU eviction causes cache miss spike | LOW | TTL of 30min is generous; cold start warmup |
