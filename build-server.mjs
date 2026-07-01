/**
 * build-server.mjs  (Portable Version)
 * Bundles the Express/tRPC server into a single dist/index.js file.
 * better-sqlite3 is kept external (native .node binary).
 * archiver is kept external (easier to ship pre-installed).
 * Run via: node build-server.mjs
 */
import { execSync } from "child_process";
import { cpSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;

console.log("📦 Bundling server (Portable)...");
execSync(
  [
    "./node_modules/.bin/esbuild",
    "server/_core/index.ts",
    "--platform=node",
    "--bundle",
    "--format=esm",
    "--outfile=dist/index.js",
    "--external:better-sqlite3",
    "--external:archiver",
    "--external:lightningcss",
    "--external:@tailwindcss/*",
    "--external:@vitejs/*",
    "--external:vite",
    "--external:@babel/*",
    '--banner:js="import { createRequire } from \'module\'; const require = createRequire(import.meta.url);"',
  ].join(" "),
  { stdio: "inherit", cwd: root }
);
console.log("✅ Server bundled to dist/index.js");

// Install slim runtime deps (better-sqlite3 + archiver) into slim-modules/
const slimDir = resolve(root, "slim-modules");
if (!existsSync(slimDir)) {
  console.log("📂 Installing slim runtime dependencies...");
  mkdirSync(slimDir, { recursive: true });
  writeFileSync(
    resolve(slimDir, "package.json"),
    JSON.stringify(
      {
        name: "slim-server-deps-portable",
        version: "1.0.0",
        dependencies: {
          "better-sqlite3": "^9.6.0",
          archiver: "^8.0.0",
        },
      },
      null,
      2
    )
  );
  execSync("npm install --omit=dev", { stdio: "inherit", cwd: slimDir });
  console.log("✅ slim-modules installed");
} else {
  console.log("✅ slim-modules already present");
}

// Copy slim node_modules into node_modules_dist for packaging
const slimSrc = resolve(slimDir, "node_modules");
const slimDst = resolve(root, "node_modules_dist");
console.log("📂 Copying slim node_modules for packaging...");
execSync(`rm -rf "${slimDst}" && cp -r "${slimSrc}" "${slimDst}"`, { stdio: "inherit" });
console.log("✅ node_modules_dist ready");
