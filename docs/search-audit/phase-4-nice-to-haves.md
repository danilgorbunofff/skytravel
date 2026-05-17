# Phase 4 — Enhancements & Nice-to-Haves

> Phase 4 is **opt-in**. Tackle items only after Phases 1–3 have shipped and stabilised in production for at least one week. Each item below is independent and can ship on its own.

**Files in scope (per item — see below)**

- [client/src/pages/SearchPage.tsx](../../client/src/pages/SearchPage.tsx)
- [client/src/components/TourCard.tsx](../../client/src/components/TourCard.tsx)
- Backend (item 24 only): [server/src/providers/](../../server/src/providers/) + relevant route under `server/src/routes/`.

**Decision gate before starting Phase 4**

Confirm:

1. No Phase 1–3 regressions reported in the last 7 days.
2. Telemetry / analytics show meaningful usage of search pagination, filters, and modal.
3. Product/design has reviewed and prioritised the items below; this list is a menu, not a queue.

---

## 21. "Share this search" button

### Why

Users frequently want to send a tour shortlist to a partner ("look at *these* results"). Today they have to copy the URL manually.

### Approach

A tiny button in the toolbar next to the sort controls that copies `window.location.href` to the clipboard and shows a toast/inline confirmation.

### Implementation

1. Add a `Share2` icon button (Lucide) into the results toolbar:
   ```tsx
   <button
     type="button"
     onClick={handleShare}
     aria-label={t("searchShareLabel")}
     className={cn(toolbarButtonBase)}
   >
     <Share2 className="h-4 w-4" aria-hidden="true" />
   </button>
   ```
2. `handleShare`:
   ```ts
   async function handleShare() {
     try {
       if (navigator.share) {
         await navigator.share({ url: window.location.href, title: document.title });
         return;
       }
       await navigator.clipboard.writeText(window.location.href);
       setShareConfirmation(true);
       window.setTimeout(() => setShareConfirmation(false), 2500);
     } catch (err) {
       if ((err as Error)?.name === "AbortError") return; // user dismissed share sheet
       console.warn("share failed", err);
     }
   }
   ```
3. Render a small inline pill `{shareConfirmation && <span role="status">{t("searchShareCopied")}</span>}`.
4. Add translation keys `searchShareLabel`, `searchShareCopied` in all four locales.

### Verification

- Desktop Chrome: click → "Zkopírováno" pill appears for 2.5 s; URL in clipboard.
- iOS Safari: native share sheet opens.
- Disable clipboard permission via DevTools — graceful fallback (warning logged, no crash).

### Risks

- **Clipboard API requires HTTPS in production** — already satisfied (`sky-travel.tours`).
- Long URLs with all filters set can exceed some chat clients' inline preview length; acceptable trade-off.

---

## 22. Responsive tour-card images

### Why

`TourCard.tsx` currently emits a single `<img src>` regardless of viewport. Mobile users download desktop-sized images (commonly ~200 KB each × 24 tours = ~5 MB on a results page). Massive low-effort win for LCP and bandwidth.

### Approach

1. Add `loading="lazy"` and `decoding="async"` to every tour card image.
2. Add `srcSet`/`sizes` if the provider images come with a CDN that supports query-string resizing (Unsplash, Cloudinary, Imgix). For provider-supplied URLs without resize support, leave `srcSet` out and rely on `loading="lazy"` alone.
3. Add `width` / `height` attributes (matching the card aspect ratio) to reserve layout space and eliminate CLS.

### Implementation

```tsx
<img
  src={image}
  srcSet={isUnsplash(image)
    ? `${withWidth(image, 480)} 480w, ${withWidth(image, 768)} 768w, ${withWidth(image, 1200)} 1200w`
    : undefined}
  sizes="(max-width: 768px) 100vw, 33vw"
  alt={tour.title}
  loading="lazy"
  decoding="async"
  width={640}
  height={400}
  className="aspect-[16/10] w-full object-cover"
/>
```

Helpers:
```ts
function isUnsplash(url: string): boolean {
  return url.includes("images.unsplash.com");
}
function withWidth(url: string, w: number): string {
  const u = new URL(url);
  u.searchParams.set("w", String(w));
  u.searchParams.set("q", "75");
  return u.toString();
}
```

Place helpers in `client/src/lib/images.ts`.

### Verification

- Lighthouse on `/search` → LCP and "Properly size images" pass.
- DevTools Network tab on a 360 px viewport: card images served at ≤ 480w variant.
- No CLS regression (layout reserved via width/height).

### Risks

- Provider images may already include `?w=` params; the helper overwrites — verify with Alexandria/Orextravel sample URLs first.

---

## 23. Mobile "Load more" pager alternative

### Why

Numeric pagers (1 / 2 / 3 / … / 12) are awkward on mobile thumbs. Users scroll, tap a number, scroll again. A "Load more" button or sentinel-based infinite scroll feels native.

### Approach

Phase 4a: explicit "Načíst další" button below the grid, visible only on `md:hidden`. Keeps numeric pager on desktop. Click appends the next page to the current list (does not replace).

### Implementation

1. Add state `accumulatedItems: UnifiedTour[]` reset whenever `searchFilterKey` changes.
2. When `result` arrives:
   - If `page === 1`, replace `accumulatedItems` with `result.items`.
   - Else, append (dedupe by `id`).
3. Render the grid from `accumulatedItems` on mobile only:
   ```tsx
   <ul className="tour-grid">
     {(isMobile ? accumulatedItems : result?.items ?? []).map(/* … */)}
   </ul>
   ```
4. Below the grid, on mobile:
   ```tsx
   {isMobile && result && page < result.totalPages && (
     <button onClick={() => updateParams({ page: page + 1 })} disabled={resultsLoading}>
       {resultsLoading ? t("searchLoadingMore") : t("searchLoadMore")}
     </button>
   )}
   ```
5. Detect mobile via `useMediaQuery("(max-width: 767px)")` (one small hook in `client/src/hooks/useMediaQuery.ts`).

### Verification

- Mobile viewport: pager hidden, "Načíst další" visible; tap → 24 more cards appended; URL `?page=2`, then `?page=3`, etc.
- Desktop viewport: pager unchanged.
- Switching filters resets the accumulated list.

### Risks

- Browser back-button after deep load returns the user to page 1 because URL only stores the latest `page`. Acceptable for v1; consider a `pages` URL param later if telemetry shows back-button regressions.

---

## 24. Sort by rating / popularity

### Why

Currently sorting is price/date only. Travellers regularly want "highest rated first" and "most booked".

### Approach (gated on backend support)

This item is **blocked** unless the unified provider contract supports a `rating` or `popularity` sort key. Before starting:

1. Inspect [server/src/providers/types.ts](../../server/src/providers/types.ts) for `sortBy` enum values.
2. Inspect [server/src/providers/registry.ts](../../server/src/providers/registry.ts) and each provider implementation to confirm support.
3. If unsupported, write a small RFC describing the schema/index change needed in the `Tour` / `ProviderTour` model (Prisma) and stop until product agrees.

If supported (or after extending the providers):

### Implementation

1. Extend the sort toolbar in `SearchPage.tsx` with new buttons:
   ```ts
   const SORT_OPTIONS = [
     { key: "price", label: t("sortPrice") },
     { key: "date", label: t("sortDate") },
     { key: "rating", label: t("sortRating") },
   ] as const;
   ```
2. Update `toggleSort` to accept the new keys (no logic change — it already takes `nextSortBy`).
3. Add translation keys.
4. Wire to server: pass `sortBy: "rating"` in `buildFilters`. Confirm server orders by `rating DESC` when `sortDir === "desc"` (or omit `sortDir` and let server pick best default for `rating`).

### Verification

- Sort by rating → results clearly ordered by star/rating field desc/asc.
- Toggle between price/date/rating → URL reflects choice; results refetch.

### Risks

- Provider rating semantics vary (1–5 vs. 1–10 vs. text). Normalise server-side; never in the UI.
- "Popularity" requires booking/lead telemetry — separate, larger workstream. Defer.

---

## Phase 4 exit checklist (per shipped item)

- [ ] Item-specific verification recipe passed.
- [ ] No regression in Phase 1–3 surfaces.
- [ ] Translation keys present in cs/en/uk/ru.
- [ ] `npm --workspace client run lint && npm --workspace client run build` green.
- [ ] PR description includes screenshots/recordings for visual changes.
