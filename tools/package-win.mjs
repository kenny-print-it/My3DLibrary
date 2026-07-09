/**
 * package-win.mjs
 * Builds My3DLibrary-Windows-v1.1-Beta.zip using the system zip command.
 * Uses new dist/ (freshly built) + existing runtime/node.exe, node_modules, launcher files.
 */
import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync, cpSync } from "fs";

const PORTABLE = "/home/ubuntu/printlib-portable";
const WIN_EXTRAS = "/tmp/win-extras";
const STAGING = "/tmp/win-staging";
const OUT = "/home/ubuntu/My3DLibrary-Windows-v1.1-Beta.zip";

console.log("📦 Packaging Windows ZIP...");

// Clean and create staging dir
if (existsSync(STAGING)) rmSync(STAGING, { recursive: true });
mkdirSync(`${STAGING}/My3DLibrary-Portable/data`, { recursive: true });
mkdirSync(`${STAGING}/My3DLibrary-Portable/library`, { recursive: true });
mkdirSync(`${STAGING}/My3DLibrary-Portable/ollama`, { recursive: true });

// 1. Launcher exe (root level)
cpSync(`${WIN_EXTRAS}/My3DLibrary.exe`, `${STAGING}/My3DLibrary.exe`);

// 2. Portable folder — launcher scripts and icons
for (const f of ["Start.bat", "Stop.bat", "README.txt", "Download-AI-Model.bat", "kenny-logo.ico"]) {
  cpSync(`${WIN_EXTRAS}/My3DLibrary-Portable/${f}`, `${STAGING}/My3DLibrary-Portable/${f}`);
}

// 3. Runtime (node.exe)
cpSync(`${WIN_EXTRAS}/My3DLibrary-Portable/runtime`, `${STAGING}/My3DLibrary-Portable/runtime`, { recursive: true });

// 4. node_modules (better-sqlite3 + archiver — Windows binaries)
cpSync(`${WIN_EXTRAS}/My3DLibrary-Portable/node_modules`, `${STAGING}/My3DLibrary-Portable/node_modules`, { recursive: true });

// 5. NEW dist/ (freshly built frontend + server bundle)
cpSync(`${PORTABLE}/dist`, `${STAGING}/My3DLibrary-Portable/dist`, { recursive: true });

// 6. Create the ZIP
if (existsSync(OUT)) rmSync(OUT);
console.log("🗜️  Creating ZIP (this may take a minute)...");
execSync(`cd "${STAGING}" && zip -r "${OUT}" . -x "*.DS_Store" -x "__MACOSX/*"`, { stdio: "inherit" });

// Cleanup
rmSync(STAGING, { recursive: true });

console.log(`✅ Windows ZIP created: ${OUT}`);
execSync(`ls -lh "${OUT}"`);
