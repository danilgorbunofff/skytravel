import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAdminAuth } from "./useAdminAuth";
import { hasAdminHint, setAdminHint } from "../lib/adminHint";

describe("useAdminAuth", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not call /api/admin/me for ordinary visitors", () => {
    const { result } = renderHook(() => useAdminAuth());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it("checks the session once this browser has signed in as admin", async () => {
    setAdminHint(true);
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const { result } = renderHook(() => useAdminAuth());
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/admin/me"), {
      credentials: "include",
    });
  });

  it("forgets the hint when the session has expired", async () => {
    setAdminHint(true);
    fetchMock.mockResolvedValue({ ok: false, status: 401 });
    const { result } = renderHook(() => useAdminAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
    expect(hasAdminHint()).toBe(false);
  });
});
