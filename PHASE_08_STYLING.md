# Phase 8: Styling & Design System Migration

> **Goal:** Migrate from a monolithic 4,635-line global CSS file to component-scoped Tailwind v4 utilities with consistent design tokens, establishing a maintainable design system for the search page.

---

## Problem Statement

Current styling issues:
1. **Monolithic `site.css`** — 4,635 lines of global CSS, all loaded regardless of which page is viewed
2. **No component scoping** — class names like `.search-hero-section`, `.public-tour-card`, `.compare-tray` are global, risking collisions
3. **Inconsistent spacing/colors** — hardcoded pixel values and hex codes scattered throughout
4. **No design tokens** — no centralized source for colors, radii, shadows, typography
5. **No dark mode preparation** — hardcoded light theme colors everywhere
6. **No component variants** — conditional styling done via manual class concatenation, not CVA
7. **Responsive breakpoints are inconsistent** — `767px`, `768px`, `1024px`, `1200px` used interchangeably
8. **No animation system** — inconsistent transitions, manual keyframe definitions
9. **Heavy CSS load** — entire `site.css` loaded on every page (search, home, admin, GDPR)

---

## Deliverables

### 8.1 — Design Token System

**File:** `client/src/features/search/styles/tokens.css` (imported into Tailwind config)

```css
/* Design tokens as CSS custom properties */
:root {
  /* Colors — Semantic */
  --color-primary: #2563eb;          /* brand blue */
  --color-primary-hover: #1d4ed8;
  --color-primary-light: #dbeafe;
  --color-secondary: #f97316;        /* accent orange */
  --color-success: #16a34a;
  --color-error: #dc2626;
  --color-warning: #d97706;
  
  /* Colors — Neutral */
  --color-bg: #ffffff;
  --color-bg-secondary: #f8fafc;
  --color-bg-tertiary: #f1f5f9;
  --color-text: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  --color-border: #e2e8f0;
  --color-border-hover: #cbd5e1;
  
  /* Colors — Tour-specific */
  --color-discount: #dc2626;
  --color-price: #0f172a;
  --color-stars: #f59e0b;
  --color-favorite: #ef4444;
  --color-compare: #2563eb;
  
  /* Spacing scale (4px base) */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  
  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  
  /* Border radius */
  --radius-sm: 0.25rem;   /* 4px */
  --radius-md: 0.5rem;    /* 8px */
  --radius-lg: 0.75rem;   /* 12px */
  --radius-xl: 1rem;      /* 16px */
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  
  /* Transitions */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  
  /* Z-index scale */
  --z-base: 0;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-drawer: 300;
  --z-modal: 400;
  --z-toast: 500;
}
```

---

### 8.2 — Tailwind v4 Integration for Search

**Approach:** Use Tailwind v4 utilities within search feature components while preserving existing `site.css` for non-search pages (gradual migration).

**Strategy:**
- New search components use Tailwind classes directly
- Use the `cn()` helper (already in `lib/utils.ts`) for conditional classes
- Use CVA for component variants (buttons, badges, cards)
- Import search-specific CSS file only in search route (code-split)

**Example — Tour card with Tailwind:**
```tsx
function PublicTourCard({ tour, viewMode }: Props) {
  return (
    <article className={cn(
      "group relative overflow-hidden rounded-lg border border-border bg-white shadow-sm transition-all duration-normal",
      "hover:shadow-lg hover:-translate-y-0.5",
      viewMode === "list" && "flex flex-row"
    )}>
      <div className="relative aspect-[16/10] overflow-hidden">
        <img className="h-full w-full object-cover transition-transform duration-slow group-hover:scale-[1.03]" />
      </div>
      <div className="p-4 flex flex-col gap-2">
        ...
      </div>
    </article>
  );
}
```

---

### 8.3 — CVA Component Variants

**File:** `client/src/features/search/components/ui/variants.ts`

```typescript
import { cva } from "class-variance-authority";

// Button variants
export const searchButton = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary-hover shadow-sm",
        secondary: "bg-white border border-border text-text hover:bg-bg-secondary",
        ghost: "hover:bg-bg-tertiary text-text-secondary",
        danger: "bg-error text-white hover:bg-red-700",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-base",
        lg: "h-12 px-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

// Badge variants
export const badge = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-bg-tertiary text-text-secondary",
        primary: "bg-primary-light text-primary",
        discount: "bg-red-100 text-discount font-bold",
        provider: "bg-blue-50 text-blue-700 border border-blue-200",
        success: "bg-green-50 text-success",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// Filter button variants
export const filterButton = cva(
  "rounded-md border px-3 py-2 text-sm transition-colors",
  {
    variants: {
      active: {
        true: "border-primary bg-primary-light text-primary font-medium",
        false: "border-border bg-white text-text-secondary hover:border-border-hover hover:bg-bg-secondary",
      },
      disabled: {
        true: "opacity-50 cursor-not-allowed",
        false: "",
      },
    },
    defaultVariants: {
      active: false,
      disabled: false,
    },
  }
);

// Card variants
export const tourCard = cva(
  "overflow-hidden rounded-lg border bg-white transition-all",
  {
    variants: {
      mode: {
        grid: "flex flex-col shadow-sm hover:shadow-lg hover:-translate-y-0.5",
        list: "flex flex-row shadow-sm hover:shadow-md",
      },
      selected: {
        true: "ring-2 ring-primary border-primary",
        false: "border-border",
      },
    },
    defaultVariants: {
      mode: "grid",
      selected: false,
    },
  }
);
```

---

### 8.4 — Extract Search CSS from site.css

**Steps:**
1. Identify all search-related class names in `site.css` (prefixed with `search-`, `public-tour-`, `compare-`, `provider-tour-modal-`, etc.)
2. Move those rules to `client/src/features/search/styles/search.css`
3. Import in search feature root (only loaded when search route active)
4. Keep remaining `site.css` for home page, GDPR, admin login

**Classes to extract (~1,500+ lines):**
- `.search-page`, `.search-hero-*`, `.search-results-*`
- `.public-search-*`, `.public-tour-*`
- `.search-sidebar`, `.search-filter-*`
- `.compare-tray`, `.compare-table*`
- `.provider-tour-modal*`
- `.sticky-search-bar*`
- `.mobile-filter-*`
- `.preset-*`, `.active-chip*`
- `.price-slider*`
- `.dest-thumb*`
- `.trust-bar*`

---

### 8.5 — Animation System

**Standardized animations using Tailwind + custom utilities:**

```css
/* client/src/features/search/styles/animations.css */

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideFromBottom {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes slideToBottom {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Utility classes */
.animate-fade-in { animation: fadeIn var(--duration-normal) var(--ease-default); }
.animate-slide-up { animation: slideUp var(--duration-normal) var(--ease-default); }
.animate-slide-down { animation: slideDown var(--duration-normal) var(--ease-default); }
.animate-scale-in { animation: scaleIn var(--duration-normal) var(--ease-spring); }
.animate-shimmer {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

### 8.6 — Responsive Breakpoint Standardization

**Standardized breakpoints (Tailwind defaults):**

| Token | Value | Use case |
|-------|-------|----------|
| `sm` | 640px | Small phone landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Ultra-wide |

**Migrate from:** `max-width: 767px` → use Tailwind's `md:` prefix for desktop, mobile-first base styles.

**Convention:** Mobile-first — base styles are mobile, progressive enhancement via breakpoint prefixes.

---

### 8.7 — Dark Mode Preparation

**Not implementing dark mode now**, but preparing the token system:

```css
/* Future: swap tokens for dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0f172a;
    --color-bg-secondary: #1e293b;
    --color-text: #f8fafc;
    --color-text-secondary: #94a3b8;
    --color-border: #334155;
    /* ... */
  }
}
```

**Preparation steps:**
- Use semantic token names (not `blue-500` but `primary`)
- Use `bg-[var(--color-bg)]` instead of `bg-white`
- Ensure contrast ratios work in both themes
- Test with `prefers-color-scheme: dark` simulation

---

### 8.8 — Loading State Patterns

**Consistent skeleton/shimmer tokens:**

```tsx
// Skeleton component with consistent styling
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "animate-shimmer rounded-md bg-slate-200",
      className
    )} />
  );
}

// Usage
<Skeleton className="h-4 w-3/4" />        // text line
<Skeleton className="h-[200px] w-full" />  // image area
<Skeleton className="h-8 w-20" />          // button
```

---

### 8.9 — Icon System Consistency

**Standardize Lucide icon usage:**

| Context | Size | Stroke width |
|---------|------|-------------|
| Inline text | 14px | 2 |
| Button icon | 16px | 2 |
| Card icon | 18px | 1.5 |
| Feature icon | 24px | 1.5 |
| Hero icon | 32px | 1.5 |

```typescript
// Icon size constants
export const ICON_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  '2xl': 32,
} as const;
```

---

### 8.10 — Print Styles

**For comparison view and tour detail:**

```css
@media print {
  /* Hide non-essential elements */
  .search-sidebar,
  .sticky-search-bar,
  .mobile-filter-fab,
  .compare-tray__bar,
  .search-pagination,
  nav, footer, header {
    display: none !important;
  }
  
  /* Force white background */
  body { background: white !important; }
  
  /* Cards in single column for print */
  .tour-grid {
    display: block !important;
  }
  .tour-card {
    break-inside: avoid;
    margin-bottom: 1rem;
    box-shadow: none !important;
    border: 1px solid #ddd !important;
  }
  
  /* Comparison: show full table */
  .compare-view {
    display: block !important;
  }
}
```

---

## Migration Strategy

**Incremental approach — NOT a big bang rewrite:**

1. **Phase 8A** — Set up design tokens + Tailwind config extension
2. **Phase 8B** — Create CVA variants for new components (from Phase 1 refactor)
3. **Phase 8C** — Extract search CSS from `site.css` into feature CSS file
4. **Phase 8D** — Convert extracted CSS classes to Tailwind utilities (component by component)
5. **Phase 8E** — Remove emptied rules from `site.css`
6. **Phase 8F** — Add animation system + print styles

**Each step must be independently deployable with no visual regressions.**

---

## Acceptance Criteria

- [ ] Design tokens defined as CSS custom properties
- [ ] Tailwind v4 config extended with custom tokens
- [ ] CVA variants for: buttons, badges, cards, filter buttons
- [ ] Search CSS extracted from `site.css` (~1,500 lines removed)
- [ ] New search components use Tailwind utilities (not custom classes)
- [ ] `cn()` helper used for all conditional class merging
- [ ] Animation system with consistent keyframes and utility classes
- [ ] `prefers-reduced-motion` respected everywhere
- [ ] Breakpoints standardized to Tailwind defaults
- [ ] Icon sizes consistent per context
- [ ] Print styles produce clean output for comparison/detail
- [ ] Dark mode tokens prepared (not active yet)
- [ ] No visual regressions after migration
- [ ] CSS bundle size reduced (dead rules eliminated)
- [ ] Lighthouse CSS coverage > 80% (less unused CSS)

---

## Files Created/Modified

| Action | Path |
|--------|------|
| Create | `client/src/features/search/styles/tokens.css` |
| Create | `client/src/features/search/styles/animations.css` |
| Create | `client/src/features/search/styles/search.css` (extracted from site.css) |
| Create | `client/src/features/search/styles/print.css` |
| Create | `client/src/features/search/components/ui/variants.ts` |
| Create | `client/src/features/search/components/ui/Skeleton.tsx` |
| Modify | `client/src/site.css` (remove extracted search rules, reduce to ~3,000 lines) |
| Modify | `vite.config.ts` (ensure CSS splitting for search route) |
| Modify | All new Phase 1-7 components (apply Tailwind classes) |

---

## Estimated Effort

- Design tokens setup: ~2 hours
- CVA variants: ~4 hours
- CSS extraction from site.css: ~6 hours
- Tailwind conversion (per-component): ~8 hours
- Animation system: ~3 hours
- Print styles: ~2 hours
- Dark mode token prep: ~2 hours
- Testing + visual regression: ~4 hours
- **Total: ~31 hours**
