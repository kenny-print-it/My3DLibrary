export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "change-me-in-production-please",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // LLM configuration (optional — AI features disabled if not set)
  llmApiUrl: process.env.LLM_API_URL ?? "",
  llmApiKey: process.env.LLM_API_KEY ?? "",
  llmModel: process.env.LLM_MODEL ?? "gpt-4o",
  // Local file storage root (where uploaded thumbnails/data are stored)
  dataDir: process.env.DATA_DIR ?? "./data",
};
