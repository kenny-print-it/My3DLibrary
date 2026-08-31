export type AISetupOption = "A" | "B" | "C" | "D";

export interface AIPreset {
  apiUrl: string;
  apiKey: string;
  textModel: string;
  visionModel: string;
}

export const GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

export const AI_SETUP_PRESETS: Record<AISetupOption, AIPreset> = {
  A: { apiUrl: "http://localhost:11434", apiKey: "", textModel: "llama3.2", visionModel: "gemma3:4b" },
  B: { apiUrl: GEMINI_OPENAI_BASE_URL, apiKey: "", textModel: "gemini-2.5-flash", visionModel: "gemini-2.5-flash" },
  C: { apiUrl: "https://api.openai.com/v1", apiKey: "", textModel: "gpt-4o-mini", visionModel: "gpt-4o-mini" },
  D: { apiUrl: "http://localhost:1234/v1", apiKey: "", textModel: "", visionModel: "" },
};

export function requiresImageUploadConsent(option: AISetupOption): boolean {
  return option === "B";
}
