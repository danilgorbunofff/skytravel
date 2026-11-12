import { describe, expect, it } from "vitest";
import {
  canShowLeadPopup,
  hasEngaged,
  LEAD_POPUP_MIN_DWELL_MS,
  LEAD_POPUP_SNOOZE_MS,
  type LeadPopupGate,
} from "./useLeadPopup";

const NOW = 1_800_000_000_000;

function gate(overrides: Partial<LeadPopupGate> = {}): LeadPopupGate {
  return {
    now: NOW,
    dismissedAt: null,
    submitted: false,
    cookieBannerVisible: false,
    anotherDialogOpen: false,
    ...overrides,
  };
}

describe("canShowLeadPopup", () => {
  it("allows a first-time visitor with nothing else on screen", () => {
    expect(canShowLeadPopup(gate())).toBe(true);
  });

  it("never stacks on top of the cookie banner", () => {
    expect(canShowLeadPopup(gate({ cookieBannerVisible: true }))).toBe(false);
  });

  it("never opens over another modal (e.g. tour detail)", () => {
    expect(canShowLeadPopup(gate({ anotherDialogOpen: true }))).toBe(false);
  });

  it("stays away after the visitor already submitted", () => {
    expect(canShowLeadPopup(gate({ submitted: true }))).toBe(false);
  });

  it("respects a recent dismissal", () => {
    expect(canShowLeadPopup(gate({ dismissedAt: NOW - 60_000 }))).toBe(false);
    expect(canShowLeadPopup(gate({ dismissedAt: NOW - LEAD_POPUP_SNOOZE_MS + 1 }))).toBe(false);
  });

  it("may return once the snooze window has passed", () => {
    expect(canShowLeadPopup(gate({ dismissedAt: NOW - LEAD_POPUP_SNOOZE_MS }))).toBe(true);
  });
});

describe("hasEngaged", () => {
  it("is false right after landing", () => {
    expect(hasEngaged(5_000, 0.1)).toBe(false);
  });

  it("is true after the dwell threshold", () => {
    expect(hasEngaged(LEAD_POPUP_MIN_DWELL_MS, 0)).toBe(true);
  });

  it("is true once half the page is scrolled", () => {
    expect(hasEngaged(1_000, 0.5)).toBe(true);
  });
});
