/**
 * package-mac.mjs
 * Builds My3DLibrary-Mac-v1.2-Beta.zip using:
 * - New dist/ (freshly built frontend + server bundle)
 * - Existing MacOS launcher, AppIcon, runtime (node-x64 + node-arm64), node_modules_arm64
 */
import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync, cpSync } from "fs";

const PORTABLE = "/home/ubuntu/printlib-portable";
const MAC_EXTRAS = "/tmp/mac-extras";
const STAGING = "/tmp/mac-staging";
const OUT = "/home/ubuntu/My3DLibrary-Mac-v1.2-Beta.zip";

console.log("📦 Packaging Mac ZIP...");

// Clean and create staging dir
if (existsSync(STAGING)) rmSync(STAGING, { recursive: true });
const APP = `${STAGING}/My3DLibrary.app/Contents`;
mkdirSync(`${APP}/MacOS`, { recursive: true });
mkdirSync(`${APP}/Resources/dist`, { recursive: true });
mkdirSync(`${APP}/Frameworks`, { recursive: true });

// 1. MacOS launcher script
cpSync(`${MAC_EXTRAS}/My3DLibrary.app/Contents/MacOS/My3DLibrary`, `${APP}/MacOS/My3DLibrary`);
execSync(`chmod +x "${APP}/MacOS/My3DLibrary"`);

// 2. Info.plist
cpSync(`${MAC_EXTRAS}/My3DLibrary.app/Contents/Info.plist`, `${APP}/Info.plist`);

// 3. AppIcon
cpSync(`${MAC_EXTRAS}/My3DLibrary.app/Contents/Resources/AppIcon.icns`, `${APP}/Resources/AppIcon.icns`);

// 4. Runtime (node-x64 + node-arm64)
cpSync(`${MAC_EXTRAS}/My3DLibrary.app/Contents/Resources/runtime`, `${APP}/Resources/runtime`, { recursive: true });

// 5. node_modules_arm64 (ARM64 native better-sqlite3 + archiver)
cpSync(`${MAC_EXTRAS}/My3DLibrary.app/Contents/Resources/dist/node_modules_arm64`, `${APP}/Resources/dist/node_modules_arm64`, { recursive: true });

// 6. NEW dist/ (freshly built frontend + server bundle)
cpSync(`${PORTABLE}/dist`, `${APP}/Resources/dist`, { recursive: true });

// 7. README-Mac.txt (root level)
cpSync(`${MAC_EXTRAS}/README-Mac.txt`, `${STAGING}/README-Mac.txt`);

// 8. Create the ZIP
if (existsSync(OUT)) rmSync(OUT);
console.log("🗜️  Creating ZIP (this may take a minute)...");
execSync(`cd "${STAGING}" && zip -r "${OUT}" . -x "*.DS_Store" -x "__MACOSX/*"`, { stdio: "inherit" });

// Cleanup
rmSync(STAGING, { recursive: true });

console.log(`✅ Mac ZIP created: ${OUT}`);
execSync(`ls -lh "${OUT}"`);
