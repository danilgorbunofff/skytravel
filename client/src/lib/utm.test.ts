import { beforeEach, describe, expect, it } from "vitest";
import { captureUtm, getUtm, parseUtm } from "./utm";

function setUrl(url: string) {
  window.history.replaceState(null, "", url);
}

describe("utm", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setUrl("/");
  });

  it("parses only utm_* params", () => {
    expect(parseUtm("?utm_source=instagram&utm_medium=bio&x=1")).toEqual({
      utm_source: "instagram",
      utm_medium: "bio",
    });
  });

  it("keeps the first touch across later navigation", () => {
    setUrl("/cs/?utm_source=telegram&utm_campaign=nov");
    captureUtm();
    setUrl("/cs/egypt/");
    captureUtm();
    setUrl("/ru/?utm_source=instagram");
    captureUtm(); // second touch does not overwrite the first
    expect(getUtm()).toMatchObject({
      utm_source: "telegram",
      utm_campaign: "nov",
      landingPage: "/cs/",
    });
  });

  it("returns empty object without any UTM", () => {
    captureUtm();
    expect(getUtm()).toEqual({});
  });
});
