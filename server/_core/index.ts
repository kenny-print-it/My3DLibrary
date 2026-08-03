import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthRoutes } from "./auth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { zipDownloadHandler } from "../zipDownload";
import { localFileHandler } from "../localFileProxy";
import { ENV } from "./env";
import { initDbIfNeeded } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Initialize SQLite database on first run
  await initDbIfNeeded();

  // Load LLM settings from the database into ENV so the LLM client picks them up.
  // process.env takes priority (allows override via .env / Start.bat), but if not set
  // we fall back to whatever the user saved in Settings > AI / LLM Configuration.
  try {
    const { getAllSettings } = await import("../db");
    const dbSettings = await getAllSettings();
    if (!process.env.LLM_API_URL && dbSettings["llm_api_url"]) {
      ENV.llmApiUrl = dbSettings["llm_api_url"];
    }
    if (!process.env.LLM_API_KEY && dbSettings["llm_api_key"]) {
      ENV.llmApiKey = dbSettings["llm_api_key"];
    }
    if (!process.env.LLM_MODEL && dbSettings["llm_model"]) {
      ENV.llmModel = dbSettings["llm_model"];
    }
    if (!process.env.LLM_TEXT_MODEL && dbSettings["llm_text_model"]) {
      ENV.llmTextModel = dbSettings["llm_text_model"];
    }
    if (!process.env.LLM_VISION_MODEL && dbSettings["llm_vision_model"]) {
      ENV.llmVisionModel = dbSettings["llm_vision_model"];
    }

    // Read ollama/model-config.txt written by Download-AI-Model.bat.
    // If the DB still has blank or legacy default values (llava), override them
    // with the models that were actually downloaded.
    try {
      const configPath = path.join(process.cwd(), "ollama", "model-config.txt");
      if (fs.existsSync(configPath)) {
        const cfg: Record<string, string> = {};
        for (const line of fs.readFileSync(configPath, "utf-8").split("\n")) {
          const eq = line.indexOf("=");
          if (eq > 0) cfg[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
        }
        const { setSetting } = await import("../db");
        // Override text model if blank or still the old default
        const isDefaultText = !ENV.llmTextModel || ENV.llmTextModel === "llava" || ENV.llmTextModel === "llama3.2";
        if (cfg.text && isDefaultText) {
          ENV.llmTextModel = cfg.text;
          await setSetting("llm_text_model", cfg.text);
        }
        // Override vision model if blank or still the old default
        const isDefaultVision = !ENV.llmVisionModel || ENV.llmVisionModel === "llava";
        if (cfg.vision && isDefaultVision) {
          ENV.llmVisionModel = cfg.vision;
          await setSetting("llm_vision_model", cfg.vision);
        }
        // Set API URL to localhost:11434 if not yet configured
        if (!ENV.llmApiUrl && (cfg.text || cfg.vision)) {
          ENV.llmApiUrl = "http://localhost:11434";
          await setSetting("llm_api_url", "http://localhost:11434");
        }
        console.log(`[Startup] model-config.txt applied: text=${ENV.llmTextModel}, vision=${ENV.llmVisionModel}`);
      }
    } catch (e) {
      console.warn("[Startup] Could not apply model-config.txt:", e);
    }

    console.log("[Startup] LLM config:", ENV.llmApiUrl ? `URL=${ENV.llmApiUrl}, model=${ENV.llmModel}, text=${ENV.llmTextModel || "(same as model)"}, vision=${ENV.llmVisionModel || "(same as model)"}` : "not configured");
  } catch (e) {
    console.warn("[Startup] Could not load LLM settings from DB:", e);
  }

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Local file storage — serve /local-storage/* from DATA_DIR/storage/
  const storageDir = path.resolve(ENV.dataDir, "storage");
  fs.mkdirSync(storageDir, { recursive: true });
  app.use("/local-storage", express.static(storageDir));

  // Local library files — serve /local-files/* from the configured library path
  app.get("/local-files/*", localFileHandler);

  // Auth routes (login, logout, setup)
  registerAuthRoutes(app);

  // Health check
  app.get("/api/health", (_req, res) => res.json({ ok: true, version: "1.2.0-local" }));

  // ZIP bulk download endpoint
  app.get("/api/download/zip/:modelId", zipDownloadHandler);

  // Open folder in Windows Explorer (server-side spawn avoids Norton-flagged custom protocol handler)
  app.post("/api/open-folder", (req, res) => {
    try {
      const { path: folderPath } = req.body as { path?: string };
      if (!folderPath) {
        res.status(400).json({ error: "path is required" });
        return;
      }
      console.log(`[open-folder] Requested path: ${folderPath}`);
      // Use explorer.exe on Windows, open on macOS, xdg-open on Linux
      const platform = process.platform;
      let cmd: string;
      let args: string[];
      if (platform === "win32") {
        // Open the folder in Explorer. Note: Windows focus-stealing prevention
        // means Explorer may open behind the browser — this is a Windows limitation.
        const winPath = folderPath.replace(/\//g, "\\");
        cmd = "explorer.exe";
        args = [winPath];
      } else if (platform === "darwin") {
        cmd = "open";
        args = [folderPath];
      } else {
        cmd = "xdg-open";
        args = [folderPath];
      }
      console.log(`[open-folder] Spawning: ${cmd} ${args.join(" ")}`);
      const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
      child.on("error", (err) => console.error(`[open-folder] spawn error: ${err.message}`));
      child.unref();
      res.json({ success: true, path: folderPath });
    } catch (err: any) {
      console.error(`[open-folder] exception: ${err?.message}`);
      res.status(500).json({ error: err?.message || "Failed to open folder" });
    }
  });

  // Open a file with its default application (e.g. STL in slicer)
  app.post("/api/open-file", (req, res) => {
    try {
      const { path: filePath } = req.body as { path?: string };
      if (!filePath) {
        res.status(400).json({ error: "path is required" });
        return;
      }
      const platform = process.platform;
      let cmd: string;
      let args: string[];
      if (platform === "win32") {
        // 'start "" "<path>"' opens the file with its default Windows app
        cmd = "cmd.exe";
        args = ["/c", "start", "", filePath];
      } else if (platform === "darwin") {
        cmd = "open";
        args = [filePath];
      } else {
        cmd = "xdg-open";
        args = [filePath];
      }
      const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
      child.unref();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to open file" });
    }
  });

  // Run the AI model download bat file directly
  app.post("/api/run-ai-setup", (req, res) => {
    try {
      const batPath = path.join(process.cwd(), "Download-AI-Model.bat");
      if (!fs.existsSync(batPath)) {
        res.status(404).json({ error: "Download-AI-Model.bat not found in app folder" });
        return;
      }
      // Use cmd.exe /c to run the bat file in a new visible window
      const child = spawn("cmd.exe", ["/c", "start", "", batPath], {
        detached: true,
        stdio: "ignore",
        cwd: process.cwd(),
      });
      child.unref();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to launch AI setup" });
    }
  });

  // Return the app root directory (used by frontend to show path in AI setup banner)
  app.get("/api/app-root", (req, res) => {
    res.json({ appRoot: process.cwd() });
  });

  // Restart endpoint — exits the Node process so launcher.ps1 can restart it fresh
  // Only available in portable/production mode (not in dev server)
  app.post("/api/restart", (_req, res) => {
    res.json({ ok: true, message: "Restarting…" });
    setTimeout(() => process.exit(0), 500);
  });

  // Save generated thumbnail — accepts raw PNG bytes (application/octet-stream)
  // This avoids tRPC's internal body-size limit that truncates large base64 payloads.
  app.post("/api/save-thumbnail", express.raw({ type: "application/octet-stream", limit: "20mb" }), async (req, res) => {
    try {
      const modelId = parseInt((req.query as any).modelId);
      if (!modelId || isNaN(modelId)) {
        res.status(400).json({ error: "modelId query param required" });
        return;
      }
      const pngBuffer = req.body as Buffer;
      if (!pngBuffer || pngBuffer.length < 100) {
        res.status(400).json({ error: "No PNG data received" });
        return;
      }

      const nodePath = require("path") as typeof import("path");
      const { getDb } = await import("../db");
      const { models } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await import("../db");

      const model = await db.getModelById(modelId);
      if (!model) {
        res.status(404).json({ error: "Model not found" });
        return;
      }

      const folderPath = (model as any).rootPath as string | null;
      if (!folderPath) {
        res.status(400).json({ error: "Model has no folder path" });
        return;
      }

      const fileName = `thumbnail_generated_${Date.now()}.png`;
      const absPath = nodePath.join(folderPath, fileName);
      fs.writeFileSync(absPath, pngBuffer);

      // Register in images array
      const imgs: any[] = JSON.parse((model.images as any) ?? "[]");
      const relativePath = nodePath.relative(folderPath, absPath).replace(/\\/g, "/");
      const fileId = `generated_thumb_${Date.now()}`;
      imgs.unshift({
        fileId,
        name: fileName,
        absPath,
        relativePath,
        thumbnailLink: `/local-files/${relativePath}`,
        webContentLink: `/local-files/${relativePath}`,
        mimeType: "image/png",
      });
      const dbConn = await getDb();
      if (dbConn) {
        await dbConn.update(models)
          .set({ images: JSON.stringify(imgs) as any, imageCount: imgs.length })
          .where(eq(models.id, modelId));
      }

      // Set as hero image
      await db.updateModelHeroImage(modelId, `/local-files/${relativePath}`, "manual");

      res.json({ success: true, imageUrl: `/local-files/${relativePath}`, fileName });
    } catch (err: any) {
      console.error("[save-thumbnail] Error:", err);
      res.status(500).json({ error: err?.message || "Failed to save thumbnail" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
