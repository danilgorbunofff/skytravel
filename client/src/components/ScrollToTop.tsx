import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets scroll on route change, but honours `#anchor` links (e.g. `/cs/#poptavka`)
 * by scrolling to the target once it has rendered.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    let attempts = 0;
    let timer: number | undefined;
    const tryScroll = () => {
      const target = document.getElementById(id);
      // Jump instantly: the site sets `scroll-behavior: smooth` on <html>, and a smooth
      // scroll started during the first render gets cancelled by later layout work.
      // Keep re-checking briefly because sections above can still change height.
      if (target) target.scrollIntoView({ block: "start", behavior: "instant" });
      const settled = target != null && Math.abs(target.getBoundingClientRect().top) < 120;
      if (!settled && attempts++ < 20) timer = window.setTimeout(tryScroll, 50);
    };
    tryScroll();
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [pathname, hash]);

  return null;
}
