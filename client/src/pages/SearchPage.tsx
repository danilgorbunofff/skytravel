import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, ExternalLink, MapPin, Plane, RotateCcw, Search } from "lucide-react";
import {
  fetchPublicProviderRegions,
  fetchPublicProviderTours,
} from "../api/publicProviders";
import { loadBootstrap } from "../api/bootstrapCache";
import type { ProviderMeta, ProviderRegion, ToursResult, UnifiedFilters, UnifiedTour } from "../types/providers";
import { useLanguage } from "../hooks/useLanguage";
import { formatPrice } from "../utils";
import "../site.css";

const TRANSPORT_OPTIONS = [
  { value: "plane", label: "Letecky" },
  { value: "bus", label: "Autobusem" },
  { value: "car", label: "Vlastní" },
];

const transportLabel: Record<string, string> = {
  plane: "Letecky",
  bus: "Autobusem",
  train: "Vlakem",
  car: "Vlastní",
  boat: "Lodí",
};

const boardLabel: Record<string, string> = {
  AI: "All Inclusive",
  UAI: "Ultra AI",
  FB: "Plná penze",
  HB: "Polopenze",
  BB: "Snídaně",
  RO: "Bez stravy",
  SC: "Bez stravy",
};

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function inferSingleLevelRegion(provider: ProviderMeta | null, query: string): string | null {
  if (!provider || !query) return null;
  const regionField = provider.filterFields.find((field) => field.key === "zeme");
  if (!regionField?.options?.length) return null;

  const normalizedQuery = normalizeSearchText(query);
  const match = regionField.options.find((option) => {
    const label = normalizeSearchText(String(option.label));
    return normalizedQuery.includes(label) || label.includes(normalizedQuery);
  });

  return match ? String(match.value) : null;
}

function hasTwoLevelRegions(provider: ProviderMeta | null): boolean {
  return Boolean(provider?.filterFields.some((field) => field.dependsOn != null));
}

function supportsFilter(provider: ProviderMeta | null, key: string): boolean {
  return Boolean(provider?.filterFields.some((field) => field.key === key));
}

function fmtDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("cs-CZ");
}

function starsDisplay(value: string | undefined): string {
  const stars = Number(value);
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) return "";
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

function getParamNumber(searchParams: URLSearchParams, key: string, fallback: number): number {
  const value = Number(searchParams.get(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export default function SearchPage() {
  const { lang, setLang, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const [providers, setProviders] = useState<ProviderMeta[]>([]);
  const [regions, setRegions] = useState<ProviderRegion[]>([]);
  const [regionsByProvider, setRegionsByProvider] = useState<Record<string, ProviderRegion[]>>({});
  const [providersLoading, setProvidersLoading] = useState(true);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<ToursResult | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [dateStart, setDateStart] = useState(searchParams.get("dateStart") ?? "");
  const [dateEnd, setDateEnd] = useState(searchParams.get("dateEnd") ?? "");
  const [transport, setTransport] = useState(searchParams.get("transport") ?? "");

  const selectedProviderId = searchParams.get("provider") || providers[0]?.id || "";
  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === selectedProviderId) ?? null,
    [providers, selectedProviderId],
  );
  const isTwoLevel = hasTwoLevelRegions(selectedProvider);
  const transportSupported = supportsFilter(selectedProvider, "transport");
  const page = getParamNumber(searchParams, "page", 1);
  const limit = getParamNumber(searchParams, "limit", 24);
  const sortBy = searchParams.get("sortBy") === "date" ? "date" : "price";
  const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";
  const activeQuery = searchParams.get("q")?.trim() ?? "";
  const activeDateStart = searchParams.get("dateStart") ?? "";
  const activeDateEnd = searchParams.get("dateEnd") ?? "";
  const activeTransport = searchParams.get("transport") ?? "";
  const activeZeme = searchParams.get("zeme") ?? "";
  const activeTownFrom = searchParams.get("townFrom") ?? "";
  const activeStateId = searchParams.get("stateId") ?? "";
  const hasActiveSearch = Boolean(
    activeQuery || activeDateStart || activeDateEnd || activeTransport || activeZeme || activeTownFrom || activeStateId,
  );

  const departureCities = useMemo(() => {
    if (!isTwoLevel) return [];
    const map = new Map<number, string>();
    for (const region of regions) {
      const id = region.meta?.departureId as number | undefined;
      const name = region.meta?.departureName as string | undefined;
      if (id != null && name) map.set(id, name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "cs"));
  }, [regions, isTwoLevel]);

  const destinationCountries = useMemo(() => {
    if (!isTwoLevel) return [];
    const townFrom = searchParams.get("townFrom");
    const filtered = townFrom
      ? regions.filter((region) => String(region.meta?.departureId) === townFrom)
      : regions;
    const map = new Map<number, string>();
    for (const region of filtered) map.set(region.id, region.name);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "cs"));
  }, [regions, isTwoLevel, searchParams]);

  useEffect(() => {
    let cancelled = false;
    const { cached, fresh } = loadBootstrap();

    function applyBootstrap(data: { providers: ProviderMeta[]; regionsByProvider: Record<string, ProviderRegion[]> }) {
      if (cancelled) return;
      setProviders(data.providers);
      setRegionsByProvider(data.regionsByProvider);
      const urlProvider = searchParams.get("provider");
      const initial =
        data.providers.find((p) => p.id === urlProvider)?.id ??
        data.providers[0]?.id ??
        "";
      setRegions(data.regionsByProvider[initial] ?? []);
      if (!urlProvider && initial) {
        const next = new URLSearchParams(searchParams);
        next.set("provider", initial);
        setSearchParams(next, { replace: true });
      }
    }

    if (cached) {
      applyBootstrap(cached);
      setProvidersLoading(false);
    }

    fresh
      .then((data) => {
        applyBootstrap(data);
        setProvidersLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!cached) {
          setError(err instanceof Error ? err.message : "Nepodařilo se načíst poskytovatele.");
          setProvidersLoading(false);
        }
        // If we already rendered from cache, swallow the revalidation error.
      });

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setDateStart(searchParams.get("dateStart") ?? "");
    setDateEnd(searchParams.get("dateEnd") ?? "");
    setTransport(searchParams.get("transport") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (!selectedProviderId) return;

    // Fast path: we already have regions for this provider from bootstrap.
    const preloaded = regionsByProvider[selectedProviderId];
    if (preloaded) {
      setRegions(preloaded);
      setRegionsLoading(false);
      return;
    }

    let cancelled = false;
    setRegionsLoading(true);
    fetchPublicProviderRegions(selectedProviderId)
      .then((items) => {
        if (!cancelled) {
          setRegions(items);
          setRegionsByProvider((prev) => ({ ...prev, [selectedProviderId]: items }));
        }
      })
      .catch(() => {
        if (!cancelled) setRegions([]);
      })
      .finally(() => {
        if (!cancelled) setRegionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProviderId, regionsByProvider]);

  useEffect(() => {
    if (!searchParams.get("transport") || transportSupported) return;
    const next = new URLSearchParams(searchParams);
    next.delete("transport");
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  }, [searchParams, transportSupported, setSearchParams]);

  useEffect(() => {
    if (!isTwoLevel) return;
    const stateId = searchParams.get("stateId");
    if (!stateId) return;
    const isValidState = destinationCountries.some((country) => String(country.id) === stateId);
    if (isValidState) return;
    const next = new URLSearchParams(searchParams);
    next.delete("stateId");
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  }, [isTwoLevel, destinationCountries, searchParams, setSearchParams]);

  const buildFilters = useCallback((): UnifiedFilters => {
    const filters: UnifiedFilters = {
      page,
      limit,
      sortBy,
      sortDir,
    };
    const q = searchParams.get("q")?.trim();
    const start = searchParams.get("dateStart");
    const end = searchParams.get("dateEnd");
    const activeTransport = searchParams.get("transport");
    const zeme = searchParams.get("zeme");
    const townFrom = searchParams.get("townFrom");
    const stateId = searchParams.get("stateId");
    const inferredZeme = !isTwoLevel && !zeme && q ? inferSingleLevelRegion(selectedProvider, q) : null;

    if (q) filters.q = q;
    if (start) filters.dateStart = start;
    if (end) filters.dateEnd = end;
    if (transportSupported && activeTransport) filters.transport = activeTransport;
    if (!isTwoLevel && (zeme || inferredZeme)) filters.zeme = zeme || inferredZeme;
    if (isTwoLevel && townFrom) filters.townFrom = townFrom;
    if (isTwoLevel && stateId) filters.stateId = stateId;
    return filters;
  }, [searchParams, page, limit, sortBy, sortDir, transportSupported, isTwoLevel, selectedProvider]);

  useEffect(() => {
    if (!selectedProviderId || !selectedProvider) return;
    if (!hasActiveSearch) {
      setResult(null);
      setError(null);
      setResultsLoading(false);
      return;
    }
    let cancelled = false;
    setResultsLoading(true);
    setError(null);
    fetchPublicProviderTours(selectedProviderId, buildFilters())
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setResult(null);
          setError(err instanceof Error ? err.message : "Vyhledávání se nezdařilo.");
        }
      })
      .finally(() => {
        if (!cancelled) setResultsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProviderId, selectedProvider, buildFilters, hasActiveSearch]);

  function updateParams(patch: Record<string, string | number | null | undefined>, replace = false) {
    setValidationError(null);
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === null || value === "") next.delete(key);
      else next.set(key, String(value));
    }
    setSearchParams(next, { replace });
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    if (dateStart && dateEnd && dateStart > dateEnd) {
      setValidationError("Datum odjezdu nesmí být po datu návratu.");
      return;
    }
    setValidationError(null);
    updateParams({
      provider: selectedProviderId,
      q: query.trim(),
      dateStart,
      dateEnd,
      transport: transportSupported ? transport : null,
      page: 1,
    });
  }

  function changeProvider(providerId: string) {
    setValidationError(null);
    const next = new URLSearchParams(searchParams);
    next.set("provider", providerId);
    next.set("page", "1");
    next.delete("zeme");
    next.delete("townFrom");
    next.delete("stateId");
    const nextProvider = providers.find((provider) => provider.id === providerId) ?? null;
    if (!supportsFilter(nextProvider, "transport")) next.delete("transport");
    setSearchParams(next);
  }

  function resetFilters() {
    const next = new URLSearchParams();
    if (selectedProviderId) next.set("provider", selectedProviderId);
    setSearchParams(next);
    setValidationError(null);
  }

  function toggleSort(nextSortBy: "price" | "date") {
    const nextSortDir = sortBy === nextSortBy && sortDir === "asc" ? "desc" : "asc";
    updateParams({ sortBy: nextSortBy, sortDir: nextSortDir, page: 1 });
  }

  function pageTo(nextPage: number) {
    if (nextPage < 1 || nextPage > (result?.totalPages || 1)) return;
    updateParams({ page: nextPage });
  }

  const totalText = result
    ? `${result.filtered.toLocaleString("cs-CZ")} nabídek`
    : resultsLoading
      ? "Načítání nabídek"
      : hasActiveSearch
        ? "Žádné nabídky"
        : "Začněte vyhledáváním";

  return (
    <div>
      <header className="site-header">
        <div className="container header-top">
          <Link className="logo" to="/">
            <span className="logo__sky">Sky</span>
            <span className="logo__travel">Travel</span>
          </Link>

          <form className="top-search" onSubmit={submitSearch}>
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setValidationError(null);
                setQuery(event.target.value);
              }}
              placeholder={t("searchPlaceholder")}
            />
            <button type="submit" aria-label="Vyhledat">GO</button>
          </form>

          <div className="header-contact-wrap desktop-only">
            <div className="header-contact">
              <a href="tel:+420721163860">+420 721 163 860</a>
              <a href="mailto:info@skytravel.cz">info@skytravel.cz</a>
            </div>
            <div className="lang-toggle" aria-label="Language switcher">
              {([
                { code: "cs", flag: "🇨🇿" },
                { code: "uk", flag: "🇺🇦" },
                { code: "en", flag: "🇬🇧" },
                { code: "ru", flag: "🇷🇺" },
              ] as const).map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className={`lang-btn${lang === item.code ? " is-active" : ""}`}
                  onClick={() => setLang(item.code)}
                >
                  {item.flag}
                </button>
              ))}
            </div>
          </div>

          <div className="mobile-header-actions mobile-only">
            <div className="lang-toggle" aria-label="Language switcher">
              {([
                { code: "cs", flag: "🇨🇿" },
                { code: "uk", flag: "🇺🇦" },
                { code: "en", flag: "🇬🇧" },
                { code: "ru", flag: "🇷🇺" },
              ] as const).map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className={`lang-btn${lang === item.code ? " is-active" : ""}`}
                  onClick={() => setLang(item.code)}
                >
                  {item.flag}
                </button>
              ))}
            </div>
            <button className="hamburger" type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        <div className={`site-nav-wrapper ${mobileMenuOpen ? "is-open" : ""}`}>
          <div className="container site-nav-inner">
            <nav className="main-nav">
              <a href="/#vlastni">{t("navExclusive")}</a>
              <a href="/#allinclusive">{t("navPartner")}</a>
              <a href="/#destinace">{t("navTop")}</a>
              <a href="/#lastminute">Last minute</a>
              <a href="/#sluzby">{t("navServices")}</a>
              <a href="/#kontakt">{t("navContact")}</a>
              <Link to="/admin-login">{t("navAdmin")}</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="search-page">
        <section className="search-hero-section">
          <div className="container search-hero-grid">
            <div>
              <p className="search-eyebrow">SkyTravel search</p>
              <h1>Najděte zájezd podle sebe</h1>
              <p>Vyhledávání pracuje s aktuálně synchronizovanými nabídkami partnerských cestovních kanceláří.</p>
            </div>

            <form className="public-search-panel" onSubmit={submitSearch}>
              <label>
                <span>Kam pojedeme</span>
                <div className="public-search-input">
                  <MapPin size={18} aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setValidationError(null);
                      setQuery(event.target.value);
                    }}
                    placeholder="Místo nebo hotel"
                  />
                </div>
              </label>
              <label>
                <span>Odjezd od</span>
                <div className="public-search-input">
                  <CalendarDays size={18} aria-hidden="true" />
                  <input
                    type="date"
                    max={dateEnd || undefined}
                    value={dateStart}
                    onChange={(event) => {
                      setDateStart(event.target.value);
                      setValidationError(null);
                    }}
                  />
                </div>
              </label>
              <label>
                <span>Návrat do</span>
                <div className="public-search-input">
                  <CalendarDays size={18} aria-hidden="true" />
                  <input
                    type="date"
                    min={dateStart || undefined}
                    value={dateEnd}
                    onChange={(event) => {
                      setDateEnd(event.target.value);
                      setValidationError(null);
                    }}
                  />
                </div>
              </label>
              <label>
                <span>Doprava</span>
                <div className="public-search-input">
                  <Plane size={18} aria-hidden="true" />
                  <select
                    value={transport}
                    disabled={!transportSupported}
                    onChange={(event) => {
                      setValidationError(null);
                      setTransport(event.target.value);
                    }}
                  >
                    <option value="">Nerozhoduje</option>
                    {TRANSPORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </label>
              <button className="public-search-submit" type="submit">
                <Search size={18} aria-hidden="true" />
                Vyhledat
              </button>
            </form>
            {validationError && <p className="search-validation">{validationError}</p>}
          </div>
        </section>

        <section className="search-results-section">
          <div className="container search-results-layout">
            <aside className="search-sidebar">
              <div className="search-filter-block">
                <h2>Partner</h2>
                {providersLoading ? (
                  <p>Načítání partnerů…</p>
                ) : (
                  <div className="search-provider-list">
                    {providers.map((provider) => (
                      <button
                        key={provider.id}
                        type="button"
                        className={provider.id === selectedProviderId ? "is-active" : ""}
                        onClick={() => changeProvider(provider.id)}
                      >
                        {provider.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="search-filter-block">
                <h2>Oblast</h2>
                {regionsLoading ? (
                  <p>Načítání oblastí…</p>
                ) : isTwoLevel ? (
                  <div className="search-stacked-controls">
                    <label>
                      <span>Odjezd z</span>
                      <select
                        value={searchParams.get("townFrom") ?? ""}
                        onChange={(event) => updateParams({ townFrom: event.target.value, stateId: null, page: 1 })}
                      >
                        <option value="">Všechna města</option>
                        {departureCities.map((city) => (
                          <option key={city.id} value={city.id}>{city.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Destinace</span>
                      <select
                        value={searchParams.get("stateId") ?? ""}
                        onChange={(event) => updateParams({ stateId: event.target.value, page: 1 })}
                      >
                        <option value="">Všechny destinace</option>
                        {destinationCountries.map((country) => (
                          <option key={country.id} value={country.id}>{country.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : (
                  <div className="search-region-list">
                    <button
                      type="button"
                      className={!searchParams.get("zeme") ? "is-active" : ""}
                      onClick={() => updateParams({ zeme: null, page: 1 })}
                    >
                      Všechny země
                    </button>
                    {regions.map((region) => (
                      <button
                        key={region.id}
                        type="button"
                        className={searchParams.get("zeme") === String(region.id) ? "is-active" : ""}
                        onClick={() => updateParams({ zeme: region.id, page: 1 })}
                      >
                        {region.name}
                        {region.count != null && <span>{region.count.toLocaleString("cs-CZ")}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button className="search-reset" type="button" onClick={resetFilters}>
                <RotateCcw size={16} aria-hidden="true" />
                Reset filtrů
              </button>
            </aside>

            <section className="search-results-main">
              <div className="search-results-toolbar">
                <div>
                  <h2>{totalText}</h2>
                  <p>{selectedProvider?.label ?? "Partner"}</p>
                </div>
                <div className="search-sort-actions">
                  <button type="button" className={sortBy === "price" ? "is-active" : ""} onClick={() => toggleSort("price")}>
                    Cena {sortBy === "price" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </button>
                  <button type="button" className={sortBy === "date" ? "is-active" : ""} onClick={() => toggleSort("date")}>
                    Datum {sortBy === "date" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </button>
                </div>
              </div>

              {error && <div className="search-error">{error}</div>}
              {resultsLoading && <div className="search-loading">Načítám nabídky…</div>}
              {!resultsLoading && !error && !hasActiveSearch && (
                <div className="search-empty">
                  <h3>Začněte vyhledáváním</h3>
                  <p>Zadejte destinaci, termín nebo vyberte oblast a potom spusťte vyhledávání.</p>
                </div>
              )}
              {!resultsLoading && !error && result?.items.length === 0 && (
                <div className="search-empty">
                  <h3>Nic jsme nenašli</h3>
                  <p>Zkuste upravit destinaci, termín nebo vybrat jiného partnera.</p>
                </div>
              )}

              <div className="public-tour-grid">
                {(result?.items ?? []).map((tour) => (
                  <PublicTourCard key={`${tour.source}-${tour.externalId}`} tour={tour} />
                ))}
              </div>

              {result && result.totalPages > 1 && (
                <div className="search-pagination">
                  <button type="button" onClick={() => pageTo(page - 1)} disabled={page <= 1}>
                    <ArrowLeft size={16} aria-hidden="true" />
                    Předchozí
                  </button>
                  <span>Strana {page} z {result.totalPages}</span>
                  <button type="button" onClick={() => pageTo(page + 1)} disabled={page >= result.totalPages}>
                    Další
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

function PublicTourCard({ tour }: { tour: UnifiedTour }) {
  const stars = starsDisplay(tour.stars);
  return (
    <article className="public-tour-card">
      <div className="public-tour-card__image">
        {tour.image ? <img src={tour.image} alt={tour.title} loading="lazy" /> : <div />}
        <span>{tour.source}</span>
      </div>
      <div className="public-tour-card__body">
        <div className="public-tour-card__meta">
          <span>{boardLabel[tour.board] ?? (tour.board || "Strava dle nabídky")}</span>
          {stars && <span className="public-tour-stars">{stars}</span>}
        </div>
        <h3>{tour.title}</h3>
        <p>{tour.destination}</p>
        <div className="public-tour-facts">
          <span>{fmtDate(tour.startDate)} – {fmtDate(tour.endDate)}</span>
          <span>{transportLabel[tour.transport] ?? tour.transport}</span>
          {tour.nights != null && <span>{tour.nights} nocí</span>}
        </div>
        <div className="public-tour-card__footer">
          <strong>od {formatPrice(tour.price)}</strong>
          <a href={tour.url} target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden="true" />
            Detail
          </a>
        </div>
      </div>
    </article>
  );
}