/**
 * Skip links for keyboard users to jump to main content sections.
 * Render at the top of the search page layout.
 */
export function SkipLinks() {
  return (
    <nav aria-label="Přeskočit na" className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:top-0 focus-within:left-0 focus-within:z-[9999] focus-within:p-2">
      <a
        href="#search-results"
        className="inline-block rounded bg-sky-600 px-4 py-2 text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-400"
      >
        Přeskočit na výsledky
      </a>
      <a
        href="#search-filters"
        className="ml-2 inline-block rounded bg-sky-600 px-4 py-2 text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-400"
      >
        Přeskočit na filtry
      </a>
    </nav>
  );
}
