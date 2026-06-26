#!/usr/bin/env node
/**
 * My3DLibrary Protocol Handler
 * Registered as my3dlibrary:// URL scheme on Windows.
 *
 * URL formats:
 *   my3dlibrary://open?path=C%3A%5C3DModels%5CBeasts%5CDragon%5Cdragon.stl
 *   my3dlibrary://explore?path=C%3A%5C3DModels%5CBeasts%5CDragon
 *
 * The NSIS installer registers this handler in the Windows registry.
 */

const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

function log(msg) {
  const logFile = path.join(process.env.APPDATA || "C:\\Temp", "My3DLibrary", "protocol-handler.log");
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
}

function parseUrl(rawUrl) {
  try {
    // rawUrl looks like: my3dlibrary://open?path=C%3A%5C...
    const withoutScheme = rawUrl.replace(/^my3dlibrary:\/\//, "");
    const [action, queryString] = withoutScheme.split("?");
    const params = {};
    if (queryString) {
      for (const part of queryString.split("&")) {
        const [k, v] = part.split("=");
        if (k && v) params[decodeURIComponent(k)] = decodeURIComponent(v);
      }
    }
    return { action: action || "open", params };
  } catch (err) {
    log(`Failed to parse URL: ${rawUrl} — ${err.message}`);
    return null;
  }
}

function openFile(filePath) {
  log(`Opening file: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    log(`File not found: ${filePath}`);
    return;
  }
  // Use Windows shell to open with the default application (slicer)
  spawn("cmd.exe", ["/c", "start", "", filePath], {
    detached: true,
    stdio: "ignore",
    shell: false,
  }).unref();
}

function openExplorer(folderPath) {
  log(`Opening Explorer: ${folderPath}`);
  if (!fs.existsSync(folderPath)) {
    log(`Folder not found: ${folderPath}`);
    return;
  }
  spawn("explorer.exe", [folderPath], {
    detached: true,
    stdio: "ignore",
  }).unref();
}

// Main
const rawUrl = process.argv[2];
if (!rawUrl) {
  log("No URL argument provided");
  process.exit(0);
}

log(`Received URL: ${rawUrl}`);
const parsed = parseUrl(rawUrl);
if (!parsed) process.exit(0);

const { action, params } = parsed;
const targetPath = params.path;

if (!targetPath) {
  log(`No path param in URL: ${rawUrl}`);
  process.exit(0);
}

if (action === "open") {
  openFile(targetPath);
} else if (action === "explore") {
  openExplorer(targetPath);
} else {
  log(`Unknown action: ${action}`);
}

process.exit(0);
