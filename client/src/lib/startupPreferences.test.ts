import { describe, expect, it } from "vitest";
import { DEFAULT_STARTUP_PREFERENCES, parseStartupPreferences } from "./startupPreferences";

describe("portable startup preferences", () => {
  it("uses safe defaults for missing or malformed values", () => {
    expect(parseStartupPreferences(null)).toEqual(DEFAULT_STARTUP_PREFERENCES);
    expect(parseStartupPreferences("not-json")).toEqual(DEFAULT_STARTUP_PREFERENCES);
  });

  it("keeps only valid duration and sound settings", () => {
    expect(parseStartupPreferences('{"duration":"leisurely","soundEnabled":true}')).toEqual({ duration: "leisurely", soundEnabled: true });
    expect(parseStartupPreferences('{"duration":"forever","soundEnabled":"yes"}')).toEqual(DEFAULT_STARTUP_PREFERENCES);
  });
});
