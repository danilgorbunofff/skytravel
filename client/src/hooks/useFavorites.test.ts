import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFavorites } from "./useFavorites";

describe("useFavorites", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with empty favorites", () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
  });

  it("toggles a favorite on", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle("tour-1"));
    expect(result.current.favorites).toContain("tour-1");
  });

  it("toggles a favorite off", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle("tour-1"));
    act(() => result.current.toggle("tour-1"));
    expect(result.current.favorites).not.toContain("tour-1");
  });

  it("isFavorite returns correct state", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle("tour-1"));
    expect(result.current.isFavorite("tour-1")).toBe(true);
    expect(result.current.isFavorite("tour-2")).toBe(false);
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle("tour-1"));
    const stored = JSON.parse(localStorage.getItem("skytravel:favorites") ?? "[]");
    expect(stored).toContain("tour-1");
  });

  it("loads from localStorage on mount", () => {
    localStorage.setItem("skytravel:favorites", JSON.stringify(["tour-a", "tour-b"]));
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual(["tour-a", "tour-b"]);
  });
});
