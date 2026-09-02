import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCookieConsent } from "./useCookieConsent";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("useCookieConsent", () => {
  it("starts with cookies shown", () => {
    // DEV would auto-hide the banner — stub prod behaviour for this test.
    vi.stubEnv("DEV", false);
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.showCookies).toBe(true);
  });

  it("never shows the banner in dev", () => {
    localStorage.clear();
    vi.stubEnv("DEV", true);
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.showCookies).toBe(false);
  });

  it("starts with settings closed", () => {
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.cookieSettingsOpen).toBe(false);
  });

  it("has necessary cookies enabled by default", () => {
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.cookiePrefs.necessary).toBe(true);
  });

  it("has analytics and marketing disabled by default", () => {
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.cookiePrefs.analytics).toBe(false);
    expect(result.current.cookiePrefs.marketing).toBe(false);
  });

  it("applyCookiePrefs hides banner and saves prefs", () => {
    const { result } = renderHook(() => useCookieConsent());
    act(() => {
      result.current.applyCookiePrefs({
        necessary: true,
        analytics: true,
        marketing: false,
      });
    });
    expect(result.current.showCookies).toBe(false);
    expect(result.current.cookiePrefs.analytics).toBe(true);
  });

  it("applyCookiePrefs closes settings modal", () => {
    const { result } = renderHook(() => useCookieConsent());
    act(() => result.current.setCookieSettingsOpen(true));
    act(() => {
      result.current.applyCookiePrefs({
        necessary: true,
        analytics: false,
        marketing: false,
      });
    });
    expect(result.current.cookieSettingsOpen).toBe(false);
  });
});
