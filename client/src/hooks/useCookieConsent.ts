import { useState } from "react";

export type CookiePrefs = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

export function useCookieConsent() {
  const [showCookies, setShowCookies] = useState(true);
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
