import { useState } from "react";

export type CookiePrefs = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

const CONSENT_STORAGE_KEY = "cookieConsentGiven";

function readStoredConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function useCookieConsent() {
  const [showCookies, setShowCookies] = useState(() => !readStoredConsent());
  const [cookieSettingsOpen, setCookieSettingsOpen] = useState(false);
  const [cookiePrefs, setCookiePrefs] = useState<CookiePrefs>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  function applyCookiePrefs(prefs: CookiePrefs) {
    setCookiePrefs(prefs);
    setShowCookies(false);
    setCookieSettingsOpen(false);
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, "true");
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
