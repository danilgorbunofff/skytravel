import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LandingPage from "./pages/LandingPage";
import ScrollToTop from "./components/ScrollToTop";
import { PageLoader } from "./components/PageLoader";
import { LocaleProvider } from "./i18n/LocaleContext";
import type { TranslationDict } from "./i18n/localeContextValue";
import { DEFAULT_LOCALE, isPublicLocale, localePath, type PublicLocale } from "./i18n/locales";

// Server-rendered routes (home + landing pages) are imported eagerly so the
// first client render matches the server HTML. The rest stay lazy.
const SearchPage = lazy(() => import("./pages/SearchPage"));
const GdprPage = lazy(() => import("./pages/GdprPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const AdminRoutes = lazy(() => import("./features/admin/AdminRoutes"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));

interface Props {
  initialDict?: TranslationDict;
  initialDictLang?: PublicLocale;
}

function LocalizedRoutes({ lang, initialDict, initialDictLang }: Props & { lang: PublicLocale }) {
  return (
    <LocaleProvider lang={lang} initialDict={initialDict} initialDictLang={initialDictLang}>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </LocaleProvider>
  );
}

/**
 * "/" — the server answers with a 301 to /cs/ (keeping UTM query params).
 * This client-side fallback only runs when the static index.html is served.
 */
function RootRedirect() {
  const { search } = useLocation();
  let target: PublicLocale = DEFAULT_LOCALE;
  try {
    const saved = window.localStorage.getItem("skytravel-lang");
    if (isPublicLocale(saved)) target = saved;
  } catch {
    // ignore
  }
  return <Navigate to={`${localePath(target)}${search}`} replace />;
}

function LegacyLocalePathFix() {
  // "/cs" → "/cs/" (server does a 301; this covers the static fallback).
  const { pathname, search } = useLocation();
  useEffect(() => {
    if (pathname === "/cs" || pathname === "/ru") window.location.replace(`${pathname}/${search}`);
  }, [pathname, search]);
  return null;
}

export default function AppRoutes(props: Props) {
  return (
    <>
      <ScrollToTop />
      <LegacyLocalePathFix />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/cs/*" element={<LocalizedRoutes lang="cs" {...props} />} />
          <Route path="/ru/*" element={<LocalizedRoutes lang="ru" {...props} />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/gdpr" element={<GdprPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/admin/*" element={<AdminRoutes />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </Suspense>
    </>
  );
}
