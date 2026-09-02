import { describe, expect, it } from "vitest";
import { getPortableLibraryColumnCount, PORTABLE_LIBRARY_TOOLBAR_CLASS } from "./libraryLayout";

describe("portable library layout", () => {
  it("adds model columns in measured steps for wide and ultra-wide displays", () => {
    expect(getPortableLibraryColumnCount(390)).toBe(2);
    expect(getPortableLibraryColumnCount(1440)).toBe(6);
    expect(getPortableLibraryColumnCount(2560)).toBe(10);
    expect(getPortableLibraryColumnCount(5120)).toBe(12);
  });

  it("keeps the library toolbar below the portable app navigation", () => {
    expect(PORTABLE_LIBRARY_TOOLBAR_CLASS).toContain("sticky top-14");
  });
});
