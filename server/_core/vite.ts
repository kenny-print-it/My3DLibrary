import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import path from "path";

// setupVite is ONLY called in development mode (NODE_ENV=development).
// All vite imports are dynamic so esbuild does not bundle vite or its
// config into the production dist/index.js.
export async function setupVite(app: Express, server: Server) {
  const [{ createServer: createViteServer }, { nanoid }] = await Promise.all([
    import("vite"),
    import("nanoid"),
  ]);

  const vite = await createViteServer({
    configFile: path.resolve(import.meta.dirname, "../../vite.config.ts"),
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Use PORTABLE_ROOT env (set by Start.bat) or process.cwd() so the
  // public/ folder is found relative to the app at runtime.
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(
          process.env.PORTABLE_ROOT ?? process.cwd(),
          "dist",
          "public"
        );

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
