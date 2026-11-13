import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useModalHistory } from "../useModalHistory";

describe("useModalHistory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/search?q=egypt");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("pushes its own entry at the given URL", () => {
    const push = vi.spyOn(window.history, "pushState");
    renderHook(() => useModalHistory(vi.fn(), "/search?q=egypt&tourId=alexandria-1"));
    expect(push).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("?q=egypt&tourId=alexandria-1");
  });

  it("closes the modal when the visitor presses Back", () => {
    const onClose = vi.fn();
    renderHook(() => useModalHistory(onClose));
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("removes its entry when closed another way (✕, Esc)", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    const { unmount } = renderHook(() => useModalHistory(vi.fn()));
    unmount();
    vi.runAllTimers();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("does not go back twice after Back already closed it", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    const { unmount } = renderHook(() => useModalHistory(vi.fn()));
    window.history.replaceState(null, "", "/search?q=egypt");
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    unmount();
    vi.runAllTimers();
    expect(back).not.toHaveBeenCalled();
  });

  it("replaces, not adds, the entry when the shown tour changes", () => {
    const push = vi.spyOn(window.history, "pushState");
    const { rerender } = renderHook(({ url }) => useModalHistory(vi.fn(), url), {
      initialProps: { url: "/search?tourId=a-1" },
    });
    rerender({ url: "/search?tourId=a-2" });
    expect(push).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("?tourId=a-2");
  });
});
