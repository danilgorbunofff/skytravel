import { afterEach, describe, expect, it, vi } from "vitest";
import { getSendBlockedReason } from "../campaign";
import { apiErrorMessage, fetchLeadCount } from "../services/adminApi";

const ready = {
  subject: "Jarní nabídky",
  fromEmail: "info@skytravel.cz",
  editorEmpty: false,
  recipientCount: 12,
  recipientCountError: false,
};

describe("getSendBlockedReason", () => {
  it("allows sending when the draft is complete and there are recipients", () => {
    expect(getSendBlockedReason(ready)).toBeNull();
  });

  it("explains each blocking condition", () => {
    expect(getSendBlockedReason({ ...ready, recipientCount: null })).toMatch(/Načítám/);
    expect(getSendBlockedReason({ ...ready, recipientCountError: true })).toMatch(/počet/);
    expect(getSendBlockedReason({ ...ready, recipientCount: 0 })).toMatch(/souhlas/);
    expect(getSendBlockedReason({ ...ready, subject: "  " })).toMatch(/předmět/);
    expect(getSendBlockedReason({ ...ready, fromEmail: "nope" })).toMatch(/odesílatele/);
    expect(getSendBlockedReason({ ...ready, editorEmpty: true })).toMatch(/obsah/);
  });
});

describe("fetchLeadCount", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("counts the whole segment on the server, ignoring the table search and list cap", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ ok: true, data: { items: [{}], total: 742, limit: 1, offset: 0 } }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchLeadCount("consented")).resolves.toBe(742);

    const url = new URL(String(fetchMock.mock.calls[0][0]), "http://localhost");
    expect(url.pathname).toBe("/api/admin/leads");
    expect(url.searchParams.get("segment")).toBe("consented");
    expect(url.searchParams.has("q")).toBe(false);
    expect(url.searchParams.get("limit")).toBe("1");
  });

  it("rejects when the server does not report a total", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { items: [] } }))),
    );
    await expect(fetchLeadCount("all")).rejects.toThrow();
  });
});

describe("apiErrorMessage", () => {
  it("maps known server error codes to Czech", () => {
    const body = { ok: false, error: { code: "NO_RECIPIENTS", message: "No recipients." } };
    expect(apiErrorMessage(body, "fallback")).toBe("Žádný kontakt nemá marketingový souhlas.");
  });

  it("falls back instead of showing raw server text", () => {
    expect(apiErrorMessage({ error: { code: "WHATEVER", message: "boom" } }, "Chyba.")).toBe(
      "Chyba.",
    );
    expect(apiErrorMessage(null, "Chyba.")).toBe("Chyba.");
  });
});
