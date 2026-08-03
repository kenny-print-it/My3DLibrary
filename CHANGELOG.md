# Changelog

All notable changes to My3DLibrary are documented here.

---

## [v1.2.0-beta] — 2026-08-03

### New Features

**3MF 3D viewer support**
The built-in interactive viewer now supports both STL and 3MF files. When a model has no render images, the viewer automatically selects the best available 3D file to display. 3MF files are prioritised over STL files when both are present. The 3MF parser uses fflate to unzip the archive in the browser, parses the XML geometry, and builds a Three.js BufferGeometry with computed normals.

**Multi-file viewer selector**
When a model has more than one viewable STL or 3MF file, a file selector strip appears below the viewer. Each entry shows the filename and a colour-coded badge (amber for STL, blue for 3MF). Clicking any entry instantly swaps the viewer to that file. The selection resets to the first file when navigating to a different model.

**Generate Thumbnail**
A "Generate Thumbnail" button appears below the 3D viewer on model detail pages when the model has no render images (owner only). Clicking it:
1. Snaps the camera to a classic 3/4 front-left elevated hero angle (if you have not manually rotated the model)
2. Captures the visible Three.js canvas as a 512×512 PNG
3. Saves the PNG into the model's folder on disk
4. Registers it as the model's hero image immediately
The library card updates automatically — no rescan needed. If you rotate the model first, the button captures whatever angle is currently shown.

**Bulk thumbnail generation**
A sparkle (✦) button in the Library toolbar (owner only) generates thumbnails for every model that has no render images but has at least one STL or 3MF file. A progress card in the bottom-right shows which model is being processed and the overall count. A 30-second timeout per model prevents the process from stalling on complex files.

**Retake Thumbnail**
Models that already have a generated thumbnail can now have it replaced. When viewing a model that has render images *and* at least one STL or 3MF file, hovering over the image reveals a **"Retake Thumbnail"** button in the bottom-right corner (owner only). Clicking it switches the main display to the interactive 3D viewer, shows a "Retake mode — rotate to desired angle" banner, and replaces the Generate Thumbnail button with **"Capture New Thumbnail"** and **"Cancel"** buttons. The file selector strip also appears so you can switch between STL/3MF files. Clicking Capture saves the current view as the new thumbnail and exits retake mode automatically.

**AI Setup Guide auto-fill**
Each option card in the AI Setup Guide (Settings → AI) is now interactive. Clicking an option expands it to show setup instructions, and a "Use This Option — Auto-fill Settings" button at the bottom closes the guide, fills in the API URL and model fields automatically, and puts the settings form into edit mode. A toast prompts you to add your API key if needed before saving.

**Print Settings card on model detail**
A new "Recommended Print Settings" card has been added to the model detail page, positioned above the Notes section. It lets you record Material, Layer Height, Infill Density, Infill Pattern, and Support recommendation for each model. When Support is set to "No", the Support Spacing and Support Interface Layers fields automatically collapse. Settings are saved per-model and persist across app restarts.

**Sticky model title bar**
When scrolling down a model detail page, a compact title bar slides in just below the navigation bar showing the model name and a quick-access favorite button. It disappears when you scroll back to the top, so it never obscures the full header.

**Model title above image**
The model name and collection label have been moved above the image carousel so the model is immediately identifiable before scrolling.

**"Newest on Drive" sort option**
A new sort option has been added to the library toolbar that orders models by the date their folder was originally created on the local filesystem (falling back to scan date for older entries).

**Persistent sort preference**
The selected sort order is now saved to `localStorage` and restored automatically when navigating back from a model detail page or reopening the app.

### Version

All in-app version references updated from v1.0/v1.1 to **v1.2.0-beta**.

---

## [v1.1.0-beta] — 2026-07-09

### New Features

**Virtual scrolling grid**
The model grid now uses `@tanstack/react-virtual` to render only the rows
currently visible in the viewport. Previously every model card was mounted
at once, which caused sluggish scrolling in large libraries. A new
`VirtualModelGrid` component calculates a responsive column count (2–6
columns depending on screen width) and virtualises rows with a fixed
estimated row height of 220 px and 3 rows of overscan. Applied to both
category rows and the filtered/search results view.

**Favorites filter toggle**
A Heart button has been added to the toolbar. When active it filters results
to `isFavorite` models only. The button highlights in the primary colour when
active. The empty state is context-aware: when the favorites filter is on and
there are no results, it shows "No favorites yet. Open a model and tap the
heart icon to save it here." The result count label also changes to
"N favorites" instead of "N results" when only the favorites filter is active.

**First-run onboarding screen**
When no library paths are configured (fresh install), the home page now shows
a welcome card with an "Open Settings" button instead of the auto-scan
spinner. Previously the app would silently auto-register the empty placeholder
`library\` folder and spin indefinitely.

### Improvements

**Favorites-only query filter (`db.ts`)**
`getAllModels()` accepts a new `favoritesOnly?: boolean` parameter. When true,
results are filtered to `isFavorite === true` rows before being returned.

**`isConfigured` flag on scan status (`routers.ts`)**
`scan.status` now queries enabled library paths and returns
`isConfigured: paths.length > 0` so the frontend can distinguish a
not-yet-configured install from one that is scanning or idle.

**`@tanstack/react-virtual` dependency added**
Virtual row rendering for the model grid (version ^3.14.5).

### Bug Fixes

**`Start.bat` crash on launch (Windows)**
The v1.1 rewrite of `Start.bat` introduced `setlocal enabledelayedexpansion`
and switched to `my3dlibrary-server.exe`, both of which caused a
`... was unexpected at this time.` error in `cmd.exe` on all tested machines.
The script has been rebased on the proven v1.0 structure (uses `node.exe`
from `runtime\`, curl-based health check, no `setlocal`) with only the
necessary change applied: `LIBRARY_PATH` is no longer set as an environment
variable, so the server no longer auto-registers the empty placeholder folder.

**`Start.bat` Unicode characters**
REM comment lines contained Unicode box-drawing characters (U+2500) that
were replaced with plain ASCII hyphens for full `cmd.exe` compatibility.

### Documentation

**README.md — Ollama setup rewritten**
Step-by-step instructions for Windows: install `OllamaSetup.exe`, copy
`ollama.exe` into the app's `ollama\` folder, run `Download-AI-Model.bat`,
then configure the API URL and model name in Settings. Added a note that the
LLaVA model is stored inside the app folder and moves with it.

---

## [v1.0.0-beta] — 2026-06-29

Initial public beta release.

- Full local 3D model library with folder scanning and SQLite storage
- Category-based browsing with drag-and-drop reorder
- Model detail page with tags, notes, favorites, and file info
- AI-powered auto-tagging via local Ollama (LLaVA model)
- Google Drive thumbnail sync
- Search and filter by tag, category, and file type
- Portable Windows build (no install required)
- Portable macOS build (Intel + Apple Silicon)
