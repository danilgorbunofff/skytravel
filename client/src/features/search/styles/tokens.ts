/**
 * Design tokens for the search feature.
 * These map to Tailwind classes and provide consistency.
 */

export const spacing = {
  xs: "gap-1 p-1",
  sm: "gap-2 p-2",
  md: "gap-3 p-3",
  lg: "gap-4 p-4",
  xl: "gap-6 p-6",
} as const;

export const radii = {
  sm: "rounded",
  md: "rounded-lg",
  lg: "rounded-xl",
  xl: "rounded-2xl",
  full: "rounded-full",
} as const;

export const shadows = {
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
  card: "shadow-[0_2px_12px_rgba(0,0,0,0.08)]",
  cardHover: "shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
  modal: "shadow-[0_20px_60px_rgba(0,0,0,0.2)]",
} as const;

export const colors = {
  // Primary
  primary: "text-sky-600",
  primaryBg: "bg-sky-50",
  primaryBorder: "border-sky-200",
  primaryHover: "hover:bg-sky-100",
  primarySolid: "bg-sky-600 text-white",
  primarySolidHover: "hover:bg-sky-700",

  // Semantic
  success: "text-emerald-600",
  successBg: "bg-emerald-50",
  warning: "text-amber-600",
  warningBg: "bg-amber-50",
  error: "text-red-600",
  errorBg: "bg-red-50",
  // Neutral
  muted: "text-slate-500",
  mutedBg: "bg-slate-50",
  border: "border-slate-200",
  divider: "border-slate-100",
} as const;

export const typography = {
  heading: "font-semibold text-slate-900",
  subheading: "font-medium text-slate-700",
  body: "text-slate-600",
  caption: "text-sm text-slate-500",
  price: "font-bold text-slate-900",
} as const;

export const transitions = {
  fast: "transition-all duration-150 ease-out",
  normal: "transition-all duration-200 ease-out",
  slow: "transition-all duration-300 ease-out",
  spring: "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
} as const;

export const breakpoints = {
  mobile: 767,
  tablet: 1023,
  desktop: 1024,
} as const;
