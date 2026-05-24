/**
 * Animation presets for consistent enter/exit transitions.
 * Use with cn() to compose onto elements.
 */

/** Fade in from below — for cards, list items */
export const fadeInUp = "animate-[fadeInUp_0.3s_ease-out_both]";

/** Fade in scale — for modals, popovers */
export const fadeInScale = "animate-[fadeInScale_0.2s_ease-out_both]";

/** Slide in from right — for drawers, side panels */
export const slideInRight = "animate-[slideInRight_0.3s_ease-out_both]";

/** Slide up — for bottom sheets */
export const slideUp = "animate-[slideUp_0.3s_cubic-bezier(0.32,0.72,0,1)_both]";

/** Stagger delay utility — returns inline style for animation-delay */
export function staggerDelay(index: number, baseMs = 50, maxMs = 400): React.CSSProperties {
  return { animationDelay: `${Math.min(index * baseMs, maxMs)}ms` };
}

/**
 * Reduced motion utility classes.
 * Apply to animated elements so they respect user preference.
 */
export const motionSafe = "motion-safe:animate-[var(--animation)]";
export const motionReduce = "motion-reduce:animate-none motion-reduce:transition-none";
