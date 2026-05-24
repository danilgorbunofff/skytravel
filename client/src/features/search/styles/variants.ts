import { cva } from "class-variance-authority";

/**
 * Tour card component variants using CVA pattern.
 */
export const tourCardVariants = cva(
  "relative overflow-hidden border border-slate-200 bg-white transition-all duration-200 ease-out",
  {
    variants: {
      viewMode: {
        grid: "rounded-xl flex flex-col",
        list: "rounded-lg flex flex-row",
      },
      interactive: {
        true: "hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 cursor-pointer",
        false: "",
      },
    },
    defaultVariants: {
      viewMode: "grid",
      interactive: true,
    },
  }
);

export const tourCardImageVariants = cva("relative overflow-hidden bg-slate-100", {
  variants: {
    viewMode: {
      grid: "aspect-[4/3] w-full rounded-t-xl",
      list: "w-48 min-h-[160px] flex-shrink-0 rounded-l-lg",
    },
  },
  defaultVariants: {
    viewMode: "grid",
  },
});

/**
 * Badge variants for status indicators, discounts, provider labels.
 */
export const badgeVariants = cva(
  "inline-flex items-center font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-700",
        primary: "bg-sky-100 text-sky-700",
        discount: "bg-red-100 text-red-700",
        success: "bg-emerald-100 text-emerald-700",
        warning: "bg-amber-100 text-amber-700",
        provider: "bg-white/90 text-slate-700 backdrop-blur-sm shadow-sm",
      },
      size: {
        xs: "text-[10px] px-1.5 py-0.5 rounded",
        sm: "text-xs px-2 py-0.5 rounded-md",
        md: "text-sm px-2.5 py-1 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
);

/**
 * Filter button variants for active/inactive states.
 */
export const filterButtonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 border transition-all duration-150 ease-out font-medium cursor-pointer select-none",
  {
    variants: {
      variant: {
        default: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
        active: "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100",
        pill: "border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full",
        pillActive: "border-transparent bg-sky-600 text-white rounded-full",
      },
      size: {
        sm: "text-xs px-2.5 py-1.5 rounded-md min-h-[32px]",
        md: "text-sm px-3 py-2 rounded-lg min-h-[40px]",
        lg: "text-base px-4 py-2.5 rounded-lg min-h-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

/**
 * Button variants for CTAs and actions.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 ease-out cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-sky-600 text-white hover:bg-sky-700 active:bg-sky-800 shadow-sm",
        secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300",
        ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        danger: "bg-red-600 text-white hover:bg-red-700",
      },
      size: {
        sm: "text-sm px-3 py-1.5 rounded-md min-h-[32px]",
        md: "text-sm px-4 py-2 rounded-lg min-h-[40px]",
        lg: "text-base px-6 py-3 rounded-lg min-h-[48px]",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  }
);

/**
 * Skeleton/loading shimmer variant.
 */
export const skeletonVariants = cva("animate-pulse bg-slate-200 rounded", {
  variants: {
    shape: {
      text: "h-4 rounded",
      title: "h-6 rounded",
      circle: "rounded-full",
      card: "rounded-xl",
      image: "aspect-[4/3] rounded-xl",
    },
    width: {
      full: "w-full",
      threequarter: "w-3/4",
      half: "w-1/2",
      third: "w-1/3",
    },
  },
  defaultVariants: {
    shape: "text",
    width: "full",
  },
});

/**
 * Modal/overlay backdrop.
 */
export const overlayVariants = cva("fixed inset-0 z-50", {
  variants: {
    variant: {
      modal: "bg-black/50 backdrop-blur-sm",
      sheet: "bg-black/40 backdrop-blur-[2px]",
      transparent: "bg-transparent",
    },
  },
  defaultVariants: {
    variant: "modal",
  },
});
