# Changelog

All notable changes to My3DLibrary are documented here.

---

## [v1.2.0-beta] — 2026-07-31

### New Features

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
