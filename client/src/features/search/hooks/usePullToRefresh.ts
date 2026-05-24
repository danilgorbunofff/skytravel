import { useCallback, useRef, useState } from "react";

interface PullToRefreshState {
  pulling: boolean;
  pullDistance: number;
  refreshing: boolean;
}

/**
 * Pull-to-refresh: activate when user pulls down from scroll top.
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [state, setState] = useState<PullToRefreshState>({
    pulling: false,
    pullDistance: 0,
    refreshing: false,
  });
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const THRESHOLD = 60;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    setState((prev) => ({ ...prev, pulling: true }));
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!state.pulling) return;
    const deltaY = Math.max(0, e.touches[0].clientY - startY.current);
    setState((prev) => ({ ...prev, pullDistance: Math.min(deltaY, 120) }));
  }, [state.pulling]);

  const handleTouchEnd = useCallback(async () => {
    if (!state.pulling) return;
    if (state.pullDistance >= THRESHOLD) {
      setState({ pulling: false, pullDistance: 0, refreshing: true });
      hapticFeedback("medium");
      await onRefresh();
      setState({ pulling: false, pullDistance: 0, refreshing: false });
    } else {
      setState({ pulling: false, pullDistance: 0, refreshing: false });
    }
  }, [state.pulling, state.pullDistance, onRefresh]);

  return {
    containerRef,
    state,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

/** Trigger haptic vibration if available */
export function hapticFeedback(style: "light" | "medium" | "heavy" = "light") {
  if (!("vibrate" in navigator)) return;
  const patterns: Record<string, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: [30, 10, 30],
  };
  navigator.vibrate(patterns[style]);
}
