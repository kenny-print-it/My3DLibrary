import { describe, expect, it } from "vitest";
import { getPortableDensityColumnCount, normalizeLibraryCardDensity } from "./libraryDensity";

describe("portable library density", () => {
  it("normalizes unknown values to the balanced default", () => {
    expect(normalizeLibraryCardDensity("unknown")).toBe("comfortable");
    expect(normalizeLibraryCardDensity("compact")).toBe("compact");
  });

  it("changes grid density without shrinking phone grids below two columns", () => {
    expect(getPortableDensityColumnCount(390, "compact")).toBe(2);
    expect(getPortableDensityColumnCount(1440, "compact")).toBe(7);
    expect(getPortableDensityColumnCount(1440, "roomy")).toBe(5);
  });
});
