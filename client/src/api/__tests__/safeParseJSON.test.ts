import { describe, it, expect } from "vitest";
import { safeParseJSON } from "../safeParseJSON";

describe("safeParseJSON", () => {
  it("parses valid JSON with correct content-type", async () => {
    const res = new Response(JSON.stringify({ items: [1, 2, 3] }), {
      headers: { "content-type": "application/json" },
    });
    const data = await safeParseJSON<{ items: number[] }>(res);
    expect(data.items).toEqual([1, 2, 3]);
  });

  it("parses JSON with charset in content-type", async () => {
    const res = new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
    const data = await safeParseJSON<{ ok: boolean }>(res);
    expect(data.ok).toBe(true);
  });

  it("throws when content-type is text/html (nginx misroute)", async () => {
    const res = new Response("<!doctype html><html>...</html>", {
      headers: { "content-type": "text/html" },
      status: 200,
    });
    await expect(safeParseJSON(res, "destinace")).rejects.toThrow(
      "Server vrátil neočekávanou odpověď (destinace)",
    );
  });

  it("throws when content-type header is missing", async () => {
    const res = new Response('{"key": "val"}');
    await expect(safeParseJSON(res)).rejects.toThrow("neočekávanou odpověď");
  });

  it("throws when body is empty", async () => {
    const res = new Response("", {
      headers: { "content-type": "application/json" },
    });
    await expect(safeParseJSON(res)).rejects.toThrow("Nepodařilo se načíst data");
  });

  it("throws when body is malformed JSON", async () => {
    const res = new Response("{broken json", {
      headers: { "content-type": "application/json" },
    });
    await expect(safeParseJSON(res)).rejects.toThrow("Nepodařilo se načíst data");
  });

  it("includes context in error message when provided", async () => {
    const res = new Response("not json", {
      headers: { "content-type": "text/plain" },
    });
    await expect(safeParseJSON(res, "všechny zájezdy")).rejects.toThrow(
      "Server vrátil neočekávanou odpověď (všechny zájezdy)",
    );
  });

  it("uses generic message when context is omitted", async () => {
    const res = new Response("not json", {
      headers: { "content-type": "text/plain" },
    });
    await expect(safeParseJSON(res)).rejects.toThrow(
      "Server vrátil neočekávanou odpověď. Zkuste to prosím později.",
    );
  });
});
