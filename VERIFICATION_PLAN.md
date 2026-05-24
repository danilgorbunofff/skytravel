# Search Upgrade — Verification Plan

> Comprehensive verification checklist for all 10 phases of the /search page upgrade.

---

## Automated Checks (Run Before Manual Review)

```bash
# 1. TypeScript — both workspaces (should show 0 errors excluding pre-existing)
npx --workspace client tsc --noEmit
npx --workspace server tsc --noEmit

# 2. ESLint
npm run lint

# 3. Client tests
npm --workspace client run test

# 4. Server tests
npm --workspace server run test

# 5. Build succeeds
npm run build

# 6. Dev server starts without crash
npm run dev  # verify no runtime errors in console
```

### Known Pre-Existing Errors (Ignore)
- `vitest` / `@testing-library/react` type declarations (test files only)
- `web-vitals` type declarations (main.tsx)
- `pino` / `express-mysql-session` type declarations (server)
- IDE diagnostic for `./PublicTourCard` in barrel file (TS language server cache; `tsc --noEmit` passes)

---

## Phase-by-Phase Verification

### Phase 1: Component Architecture Refactor
| # | Check | How |
|---|-------|-----|
| 1 | SearchPage renders without crash | Dev server → navigate to /search |
| 2 | All barrel exports resolve | `tsc --noEmit` passes |
| 3 | Hooks return correct shapes | Check types in `features/search/index.ts` imports |
| 4 | No duplicate state | SearchPage should NOT have `useState` for filters/results |
| 5 | URL params sync works | Change filters → URL updates; reload → filters restore |

### Phase 2: Search Form & Filters UX
| # | Check | How |
|---|-------|-----|
| 1 | Autocomplete shows suggestions | Type in search input |
| 2 | Multi-select destination works | Select multiple, pills shown |
| 3 | Board multi-select works | Select multiple boards |
| 4 | Date picker opens/closes | Click date field |
| 5 | Recent searches load from localStorage | Make a search, reload, check dropdown |
| 6 | Transport filter renders all options | Verify plane/bus/car |
| 7 | Star rating picker works | Click stars |
| 8 | Nights filter works | Select range |
| 9 | Presets apply correct params | Click a preset → filters update |

### Phase 3: Tour Cards & Results Grid
| # | Check | How |
|---|-------|-----|
| 1 | Grid view shows cards | Default view |
| 2 | List view toggles correctly | Click list icon |
| 3 | Card shows: destination, price, nights, stars, board, transport | Visual check |
| 4 | Discount badge shows for ≥5% discount | Find a discounted tour |
| 5 | Provider badge visible | Check card corner |
| 6 | Staggered animation on load | Scroll results, cards animate in |
| 7 | Favorite toggle works | Click heart → persists |
| 8 | Compare button appears | Hover/tap card |

### Phase 4: Tour Detail Modal
| # | Check | How |
|---|-------|-----|
| 1 | Modal opens on card click | Click a tour card |
| 2 | Gallery shows images with thumbnails | Check image area |
| 3 | Lightbox opens on image click | Click main image |
| 4 | Tabs switch (Popis/Termíny/Umístění) | Click each tab |
| 5 | Offer comparison table renders | Check offers section |
| 6 | Inquiry form submits | Fill & submit (check network) |
| 7 | Phone field present in form | Visual check |
| 8 | Related tours section shows | Scroll to bottom of modal |
| 9 | Deep link works | Copy URL with tourId param → open in new tab |
| 10 | Modal closes on Escape | Press Escape |
| 11 | Modal closes on backdrop click | Click outside |

### Phase 5: Comparison Feature
| # | Check | How |
|---|-------|-----|
| 1 | Compare tray appears after selecting 2+ tours | Click compare on 2 cards |
| 2 | Max 4 tours enforced | Try adding 5th |
| 3 | Tray shows thumbnails + tour names | Visual check |
| 4 | "Porovnat" button opens full view | Click button |
| 5 | Side-by-side comparison renders | Check compare view |
| 6 | Best values highlighted (Trophy icon) | Compare prices/stars |
| 7 | Remove tour from comparison | Click X on tray item |
| 8 | "Smazat vše" clears all | Click clear button |
| 9 | Comparison persists in sessionStorage | Add tours, refresh page |

### Phase 6: Performance
| # | Check | How |
|---|-------|-----|
| 1 | Debounced search (300ms) | Type fast → only 1 request |
| 2 | AbortController cancels old requests | Open Network tab, type fast |
| 3 | Skeleton shows during loading | Throttle network, observe |
| 4 | Image preloading for visible cards | Check Network → images load ahead |
| 5 | LCP/CLS monitoring active | Check console for performance logs |
| 6 | No duplicate API calls on same params | Watch Network tab |

### Phase 7: Mobile Experience
| # | Check | How |
|---|-------|-----|
| 1 | Bottom sheet opens for filters on mobile | Resize to mobile, tap filter FAB |
| 2 | Drag handle works (snap/dismiss) | Drag sheet down |
| 3 | Infinite scroll loads more | Scroll to bottom on mobile |
| 4 | Pull-to-refresh triggers | Pull down from top |
| 5 | Touch targets ≥ 44px | Inspect buttons on mobile |
| 6 | Horizontal scroll for preset pills | Swipe pills on mobile |
| 7 | Back-to-top button shows on scroll | Scroll down on mobile |

### Phase 8: Styling & Design System
| # | Check | How |
|---|-------|-----|
| 1 | CVA variants compile | `tsc --noEmit` passes |
| 2 | Tokens importable | Import from `features/search/styles` in any component |
| 3 | Animations play on load | Cards fade in, modals scale in |
| 4 | Reduced motion respected | Set OS to reduce motion → no animations |
| 5 | Print styles work | Print preview → no nav/footer/FAB, clean layout |

### Phase 9: Accessibility & SEO
| # | Check | How |
|---|-------|-----|
| 1 | Skip links visible on Tab | Press Tab on page load |
| 2 | Focus trap in modals | Open modal → Tab stays within |
| 3 | Escape closes modals | Press Escape in modal |
| 4 | Screen reader announces result count | Use VoiceOver/NVDA |
| 5 | JSON-LD in page head | Inspect `<head>` → find script type="application/ld+json" |
| 6 | Dynamic title updates | Apply filter → document.title changes |
| 7 | Canonical URL present | Check `<link rel="canonical">` |
| 8 | Color contrast ≥ 4.5:1 | Use axe DevTools or Lighthouse |

### Phase 10: Advanced Features
| # | Check | How |
|---|-------|-----|
| 1 | Recently viewed persists | Open tour, close, check localStorage |
| 2 | Saved searches stores/loads | Save search, reload, verify |
| 3 | Map view hook state works | Integrate hook, toggle map |
| 4 | Inspire me returns random tours | Call hook, verify 6 suggestions |
| 5 | Refresh gives new suggestions | Call refresh(), verify different set |

---

## Integration Smoke Test

1. **Fresh load:** Navigate to `/search` — page renders, no console errors
2. **Filter flow:** Select destination + dates + board → results update
3. **Detail flow:** Click card → modal opens → gallery works → close
4. **Compare flow:** Select 3 tours → tray shows → compare view → remove one
5. **Mobile flow:** Resize to 375px → filter FAB → bottom sheet → scroll results
6. **Deep link:** Share URL with `?tourId=X&providerId=Y` → opens directly to detail
7. **Favorites:** Toggle favorite → reload → still favorite
8. **Recent searches:** Search → reload → recent searches show in dropdown

---

## Tools for Automated A11y/Perf Audit

```bash
# Lighthouse CLI
npx lighthouse http://localhost:5173/search --output html --view

# axe-core (accessibility)
# Install browser extension: axe DevTools

# Bundle size check
npx --workspace client vite build && du -sh client/dist/assets/*.js
```

---

## Status

| Phase | TypeScript | Runtime | Integration |
|-------|-----------|---------|-------------|
| 1 | ✅ Pass | 🔲 Needs manual | 🔲 Needs manual |
| 2 | ✅ Pass | 🔲 Needs manual | 🔲 Needs manual |
| 3 | ✅ Pass | 🔲 Needs manual | 🔲 Needs manual |
| 4 | ✅ Pass | 🔲 Needs manual | 🔲 Needs manual |
| 5 | ✅ Pass | 🔲 Needs manual | 🔲 Needs manual |
| 6 | ✅ Pass | 🔲 Needs manual | 🔲 Needs manual |
| 7 | ✅ Pass | 🔲 Needs manual | 🔲 Needs manual |
| 8 | ✅ Pass | 🔲 Needs manual | 🔲 Needs manual |
| 9 | ✅ Pass | 🔲 Needs manual | 🔲 Needs manual |
| 10 | ✅ Pass | 🔲 Needs manual | 🔲 Needs manual |

**All phases pass TypeScript compilation.** Runtime and integration testing require running the dev server and manually verifying each checklist item above.
