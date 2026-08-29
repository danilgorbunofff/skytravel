import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { useSearchFilters } from "../useSearchFilters";

const t = (key: string) => key;

function renderFilters(initialPath: string) {
  let location = { search: "" };
  const { result } = renderHook(
    () => {
      const loc = useLocation();
      location = loc as unknown as { search: string };
      return useSearchFilters(t);
    },
    {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
      ),
    },
  );
  return { result, getLocation: () => location };
}

describe("useSearchFilters — URL parameter hygiene", () => {
  it("clamps an oversized limit to MAX_PUBLIC_PAGE_SIZE (60)", () => {
    const { result } = renderFilters("/search?limit=500000");
    expect(result.current.limit).toBe(60);
  });

  it("falls back to the default limit when it is not a number", () => {
    const { result } = renderFilters("/search?limit=abc");
    expect(result.current.limit).toBe(24);
  });

  it("clamps an out-of-range page", () => {
    const { result } = renderFilters("/search?page=999999");
    expect(result.current.page).toBe(500);
  });

  it("treats a negative page as 1", () => {
    const { result } = renderFilters("/search?page=-5");
    expect(result.current.page).toBe(1);
  });

  it("clamps negative adults instead of forwarding them to the API", () => {
    const { result } = renderFilters("/search?adults=-5");
    expect(result.current.adults).toBe(1);
  });

  it("clamps adults above the maximum", () => {
    const { result } = renderFilters("/search?adults=99");
    expect(result.current.adults).toBe(9);
  });

  it("keeps children at 0 rather than coercing it to the default", () => {
    const { result } = renderFilters("/search?children=0");
    expect(result.current.children).toBe(0);
  });

  it("caps the query at MAX_QUERY_LENGTH", () => {
    const long = "x".repeat(500);
    const { result } = renderFilters(`/search?q=${long}`);
    expect(result.current.activeQuery).toHaveLength(120);
  });
});
