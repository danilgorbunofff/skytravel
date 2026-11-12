import type { TranslationKey } from "../../hooks/useLanguage";
import type { FilterOption, PresetOption } from "./types";

export const VIEW_MODE_KEY = "skytravel:viewMode";
export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PUBLIC_PAGE_SIZE = 60;
export const DEFAULT_ADULTS = 2;
export const DEFAULT_CHILDREN = 0;

// Mobile accumulates pages into one growing list. Past this many pages the
// "load more" button switches to real pagination, otherwise the DOM would grow
// without bound (no virtualization on this list).
export const MAX_MOBILE_PAGES = 5;

// Upper bound for a URL-supplied page. The server accepts up to 10_000, but
// `perProviderLimit = min(1_000, page * limit)` means a large page makes every
// provider fetch 1 000 rows just to return an empty slice.
export const MAX_PAGE = 500;
// Must match the server's MAX_QUERY_LENGTH, otherwise a long query 400s.
export const MAX_QUERY_LENGTH = 120;
// Mirror the bounds already enforced by the hero steppers.
export const MIN_ADULTS = 1;
export const MAX_ADULTS = 9;
export const MIN_CHILDREN = 0;
export const MAX_CHILDREN = 6;

export function getTransportOptions(t: (key: TranslationKey) => string): FilterOption[] {
  return [
    { value: "plane", label: t("sTransportPlane") },
    { value: "bus", label: t("sTransportBus") },
    { value: "car", label: t("sTransportCar") },
  ];
}

export function getNightsOptions(t: (key: TranslationKey) => string): FilterOption[] {
  return [
    { value: "", label: t("sNightsAny") },
    { value: "1-6", label: t("sNightsShort") },
    { value: "7-9", label: t("sNights79") },
    { value: "10-13", label: t("sNights1013") },
    { value: "14-99", label: t("sNights14") },
  ];
}

export function getBoardOptions(t: (key: TranslationKey) => string): FilterOption[] {
  return [
    { value: "AI", label: t("sBoardAI") },
    { value: "UAI", label: t("sBoardUAI") },
    { value: "FB", label: t("sBoardFB") },
    { value: "HB", label: t("sBoardHB") },
    { value: "BB", label: t("sBoardBB") },
    { value: "RO", label: t("sBoardRO") },
  ];
}

export function getPresets(t: (key: TranslationKey) => string): PresetOption[] {
  return [
    {
      label: t("sPresetLastMin"),
      params: {
        dateStart: new Date().toISOString().slice(0, 10),
        dateEnd: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      },
    },
    { label: t("sPresetAllInc"), params: { board: "AI,UAI" } },
    { label: t("sPresetFamily"), params: { board: "AI,UAI", nights: "7-13" } },
    { label: t("sPresetShort"), params: { nights: "1-6" } },
  ];
}

export function getTransportLabel(t: (key: TranslationKey) => string): Record<string, string> {
  return {
    plane: t("sTransportPlane"),
    bus: t("sTransportBus"),
    train: t("train"),
    car: t("sTransportCar"),
    boat: t("boat"),
  };
}

export function getBoardLabel(t: (key: TranslationKey) => string): Record<string, string> {
  return {
    AI: t("boardAI"),
    UAI: t("boardUAI"),
    FB: t("boardFB"),
    HB: t("boardHB"),
    BB: t("boardBB"),
    RO: t("boardRO"),
    SC: t("boardRO"),
  };
}

export const fallbackDestinationAliases: Record<string, string> = {
  bulgaria: "bulharsko",
  greece: "recko",
  turkey: "turecko",
};
