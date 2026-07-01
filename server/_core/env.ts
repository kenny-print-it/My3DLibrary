import path from "path";

export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "my3dlibrary-portable-secret",
  isProduction: process.env.NODE_ENV === "production",
  // SQLite database path (portable: lives in data/ next to the app)
  dbPath: process.env.DB_PATH ?? path.join(process.cwd(), "data", "my3dlibrary.db"),
  // LLM configuration (optional — AI features disabled if not set)
  llmApiUrl: process.env.LLM_API_URL ?? "",
  llmApiKey: process.env.LLM_API_KEY ?? "",
  llmModel: process.env.LLM_MODEL ?? "llava",
  // Local file storage root (where uploaded thumbnails/data are stored)
  dataDir: process.env.DATA_DIR ?? path.join(process.cwd(), "data"),
};
