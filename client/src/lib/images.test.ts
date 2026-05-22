import { describe, it, expect } from "vitest";
import { isResizableImage, withWidth, buildSrcSet } from "./images";

describe("isResizableImage", () => {
  it("returns true for Unsplash URLs", () => {
    expect(isResizableImage("https://images.unsplash.com/photo-123?w=800")).toBe(true);
  });

  it("returns false for provider URLs", () => {
    expect(isResizableImage("https://cdn.alexandria.cz/tour.jpg")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isResizableImage("")).toBe(false);
  });
});

describe("withWidth", () => {
  it("adds width and quality params to URL", () => {
    const result = withWidth("https://images.unsplash.com/photo-123", 480);
    expect(result).toContain("w=480");
    expect(result).toContain("q=75");
    expect(result).toContain("auto=format");
  });

  it("overwrites existing w param", () => {
    const result = withWidth("https://images.unsplash.com/photo-123?w=1200", 480);
    expect(result).toContain("w=480");
    expect(result).not.toContain("w=1200");
  });

  it("returns original URL on parse failure", () => {
    const result = withWidth("not-a-url", 480);
    expect(result).toBe("not-a-url");
  });
});

describe("buildSrcSet", () => {
  it("builds srcset for resizable images", () => {
    const result = buildSrcSet("https://images.unsplash.com/photo-123");
    expect(result).toContain("480w");
    expect(result).toContain("768w");
    expect(result).toContain("1200w");
  });

  it("returns undefined for non-resizable images", () => {
    expect(buildSrcSet("https://cdn.provider.com/tour.jpg")).toBeUndefined();
  });

  it("uses custom widths", () => {
    const result = buildSrcSet("https://images.unsplash.com/photo-123", [320, 640]);
    expect(result).toContain("320w");
    expect(result).toContain("640w");
    expect(result).not.toContain("480w");
  });
});
