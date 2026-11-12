import { useEffect, useState } from "react";
import { setAnalyticsConsent } from "../lib/analytics";

export type CookiePrefs = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

const PREFS_STORAGE_KEY = "skytravel:cookie-prefs";
/** Older flag (before prefs were stored) — still honoured so nobody sees the banner twice. */
const CONSENT_STORAGE_KEY = "cookieConsentGiven";

export function useCookieConsent() {
  // Always start visible so server-rendered and hydrated markup match;
  // a stored choice hides the banner right after hydration.
  const [showCookies, setShowCookies] = useState(true);
  const [cookieSettingsOpen, setCookieSettingsOpen] = useState(false);
  const [cookiePrefs, setCookiePrefs] = useState<CookiePrefs>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    try {
      // Disabled in dev so the banner never interrupts local design review; prod unaffected.
      if (import.meta.env.DEV) {
        setShowCookies(false);
        return;
      }
      const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as CookiePrefs;
        setCookiePrefs({ ...stored, necessary: true });
        setShowCookies(false);
        return;
      }
      if (window.localStorage.getItem(CONSENT_STORAGE_KEY) === "true") setShowCookies(false);
    } catch {
      // ignore malformed / unavailable storage
    }
  }, []);

  function applyCookiePrefs(prefs: CookiePrefs) {
    setCookiePrefs(prefs);
    setShowCookies(false);
    setCookieSettingsOpen(false);
    setAnalyticsConsent(prefs.analytics);
    try {
      window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
      window.localStorage.setItem(CONSENT_STORAGE_KEY, "true");
    } catch {
      // storage unavailable (private mode) — banner simply reappears next visit
    }
  }

  return {
    showCookies,
    cookieSettingsOpen,
    setCookieSettingsOpen,
    cookiePrefs,
    setCookiePrefs,
    applyCookiePrefs,
  };
}
