import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { SearchResultsSection } from "../SearchResultsSection";

// Identity translator: assertions read translation keys directly.
const t = (key: string) => key;

function renderSection(overrides: Partial<ComponentProps<typeof SearchResultsSection>> = {}) {
  const props: ComponentProps<typeof SearchResultsSection> = {
    t,
    result: null,
    loading: false,
    error: null,
    onRetry: vi.fn(),
    pendingPage: false,
    viewMode: "grid",
    onSetView: vi.fn(),
    page: 1,
    totalPages: 1,
    onPageChange: vi.fn(),
    sortBy: "price",
    sortDir: "asc",
    onToggleSort: vi.fn(),
    totalText: "sStateNoOffers",
    toolbarDescription: "",
    displayedCount: 0,
    totalCount: 0,
    filteredCount: 0,
    toursToRender: [],
    chips: [],
    onResetFilters: vi.fn(),
    shareConfirmation: null,
    onShare: vi.fn(),
    providerLabels: {},
    isFavorite: () => false,
    onToggleFavorite: vi.fn(),
    onOpenDetail: vi.fn(),
    isCompared: () => false,
    onToggleCompare: vi.fn(),
    compareFull: false,
    presets: [{ label: "Last minute", params: { lastMinute: "1" } }],
    onPresetClick: vi.fn(),
    isMobile: false,
    showFavoritesOnly: false,
    onLoadMore: vi.fn(),
    hasUserFilters: false,
    mobileCapped: false,
    onShowAll: vi.fn(),
    mobileShowAll: false,
    inquiryHref: "/cs/#poptavka",
    ...overrides,
  };
  return render(<SearchResultsSection {...props} />);
}

describe("SearchResultsSection empty states", () => {
  it("treats an unfiltered empty result as an empty catalog, not a filter problem", () => {
    renderSection();
    expect(screen.getByText("sCatalogEmptyTitle")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "sInquiryCta" })).toHaveAttribute(
      "href",
      "/cs/#poptavka",
    );
    expect(screen.queryByText("sNoResultsTipReset")).not.toBeInTheDocument();
    // Presets would only lead to more empty results.
    expect(screen.queryByRole("button", { name: "Last minute" })).not.toBeInTheDocument();
  });

  it("offers filter recovery when the visitor's filters are too narrow", () => {
    renderSection({ hasUserFilters: true });
    expect(screen.getByText("sNoResultsTitle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "sNoResultsTipReset" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "sNoResultsTipInquiry" })).toBeInTheDocument();
    expect(screen.queryByText("sCatalogEmptyTitle")).not.toBeInTheDocument();
  });

  it("keeps the favorites-only message for an empty saved list", () => {
    renderSection({ showFavoritesOnly: true, hasUserFilters: true });
    expect(screen.getByText("sNoFavoritesTitle")).toBeInTheDocument();
    expect(screen.queryByText("sNoResultsTipReset")).not.toBeInTheDocument();
  });

  it("shows no empty state while loading", () => {
    renderSection({ loading: true });
    expect(screen.queryByText("sCatalogEmptyTitle")).not.toBeInTheDocument();
  });
});
