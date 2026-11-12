import { useEffect, useState } from "react";
import { setAnalyticsConsent } from "../lib/analytics";

export type CookiePrefs = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

const STORAGE_KEY = "skytravel:cookie-prefs";

export function useCookieConsent() {
  // Always start visible so server and client render the same markup;
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
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as CookiePrefs;
      setCookiePrefs({ ...stored, necessary: true });
      setShowCookies(false);
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
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
