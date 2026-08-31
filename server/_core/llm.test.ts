import { describe, expect, it } from "vitest";
import { isGeminiOpenAIEndpoint, resolveChatCompletionsUrl, resolveModelsUrl } from "./llm";

describe("LLM provider URL routing", () => {
  const gemini = "https://generativelanguage.googleapis.com/v1beta/openai/";

  it("uses Gemini's OpenAI-compatible chat completions endpoint without adding a second v1 path", () => {
    expect(isGeminiOpenAIEndpoint(gemini)).toBe(true);
    expect(resolveChatCompletionsUrl(gemini)).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
  });

  it("uses Gemini's native models endpoint for status checks", () => {
    expect(resolveModelsUrl(gemini)).toBe("https://generativelanguage.googleapis.com/v1beta/models");
  });

  it("preserves the standard OpenAI-compatible routing for local and cloud providers", () => {
    expect(resolveChatCompletionsUrl("http://localhost:11434")).toBe("http://localhost:11434/v1/chat/completions");
    expect(resolveModelsUrl("https://api.groq.com/openai/v1")).toBe("https://api.groq.com/openai/v1/models");
  });
});
