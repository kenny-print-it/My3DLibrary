import { describe, expect, it } from "vitest";
import { AI_SETUP_PRESETS, GEMINI_OPENAI_BASE_URL, requiresImageUploadConsent } from "./aiProviderPresets";

describe("portable AI setup presets", () => {
  it("configures Gemini for the official OpenAI-compatible endpoint and the same text/vision model", () => {
    expect(AI_SETUP_PRESETS.B).toEqual({
      apiUrl: GEMINI_OPENAI_BASE_URL,
      apiKey: "",
      textModel: "gemini-2.5-flash",
      visionModel: "gemini-2.5-flash",
    });
  });

  it("requires informed image-upload consent only for the Gemini online preset", () => {
    expect(requiresImageUploadConsent("A")).toBe(false);
    expect(requiresImageUploadConsent("B")).toBe(true);
    expect(requiresImageUploadConsent("C")).toBe(false);
  });
});
