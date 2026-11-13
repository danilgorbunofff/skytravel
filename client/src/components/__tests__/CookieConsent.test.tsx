import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CookieConsent from "../CookieConsent";

function renderConsent(settingsOpen = true) {
  const setCookieSettingsOpen = vi.fn();
  const setCookiePrefs = vi.fn();
  render(
    <CookieConsent
      showCookies
      cookieSettingsOpen={settingsOpen}
      setCookieSettingsOpen={setCookieSettingsOpen}
      cookiePrefs={{ necessary: true, analytics: false, marketing: true }}
      setCookiePrefs={setCookiePrefs}
      applyCookiePrefs={vi.fn()}
    />,
  );
  return { setCookieSettingsOpen, setCookiePrefs };
}

describe("CookieConsent", () => {
  it("keeps the banner a non-modal region", () => {
    renderConsent(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("region")).toBeInTheDocument();
  });

  it("exposes each category as a named switch with its state", () => {
    renderConsent();
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(3);
    for (const toggle of switches) expect(toggle).toHaveAccessibleName();
    expect(switches[0]).toHaveAttribute("aria-checked", "true");
    expect(switches[1]).toHaveAttribute("aria-checked", "false");
  });

  it("is a labelled modal dialog that closes on Escape", () => {
    const { setCookieSettingsOpen } = renderConsent();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(setCookieSettingsOpen).toHaveBeenCalledWith(false);
  });

  it("gives the close button a name instead of a bare ✕", () => {
    renderConsent();
    expect(screen.getByRole("button", { name: "Zavřít" })).toBeInTheDocument();
  });
});
