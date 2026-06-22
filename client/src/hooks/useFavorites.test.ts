import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFavorites } from "./useFavorites";
import type { UnifiedTour } from "../types/providers";

function makeTour(id: string): UnifiedTour {
  return {
    externalId: id,
    source: "alexandria",
    destination: "Test",
    title: `Tour ${id}`,
    price: 10000,
    originalPrice: 0,
    startDate: "2026-07-01",
    endDate: "2026-07-08",
    transport: "plane",
    image: "",
    description: null,
    photos: [],
    url: "",
    stars: "",
    board: "AI",
  } as UnifiedTour;
}

describe("useFavorites", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with empty favorites", () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
    expect(result.current.favoriteTours).toEqual([]);
  });

  it("toggles a favorite on", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle(makeTour("tour-1")));
    expect(result.current.favorites).toContain("alexandria-tour-1");
    expect(result.current.favoriteTours).toHaveLength(1);
  });

  it("toggles a favorite off", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle(makeTour("tour-1")));
    act(() => result.current.toggle(makeTour("tour-1")));
    expect(result.current.favorites).not.toContain("alexandria-tour-1");
    expect(result.current.favoriteTours).toHaveLength(0);
  });

  it("isFavorite returns correct state", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle(makeTour("tour-1")));
    expect(result.current.isFavorite("alexandria-tour-1")).toBe(true);
    expect(result.current.isFavorite("alexandria-tour-2")).toBe(false);
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle(makeTour("tour-1")));
    const stored = JSON.parse(localStorage.getItem("skytravel:favorites") ?? "{}");
    expect(stored["alexandria-tour-1"]).toBeDefined();
    expect(stored["alexandria-tour-1"].title).toBe("Tour tour-1");
  });

  it("loads from localStorage on mount", () => {
    const tour = makeTour("tour-a");
    localStorage.setItem("skytravel:favorites", JSON.stringify({ "alexandria-tour-a": tour }));
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual(["alexandria-tour-a"]);
    expect(result.current.favoriteTours).toHaveLength(1);
  });
});
