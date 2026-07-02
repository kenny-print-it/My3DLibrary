# PrintLib — 3D Model Library TODO

## Database & Backend
- [x] Database schema: models, categories, tags, model_tags, settings, scan_logs tables
- [x] Google Drive recursive scanner service (driveScanner.ts)
- [x] tRPC routes: scan/index, models list, model detail, categories, tags, settings
- [x] Google Drive API Key seeded into settings table

## Frontend — Core
- [x] Dark elegant theme with premium typography (Inter)
- [x] App layout with top navigation bar (NavBar.tsx)
- [x] Home/gallery page with Plex-style model cards and thumbnails
- [x] Category sections (derived from Drive folder names)
- [x] Re-scan / refresh button with progress feedback and polling

## Frontend — Model Detail
- [x] Model detail page with image carousel/lightbox
- [x] STL/3MF file list with Drive links and file sizes
- [x] Folder path display
- [x] Manual tag editor (add/remove tags per model, create new tags with color picker)
- [x] Notes editor per model

## Frontend — Discovery
- [x] Search bar (filter by name)
- [x] Filter panel (by category, tag)

## Settings
- [x] Settings page for Google Drive API Key and root folder ID
- [x] Test Connection button for live validation
- [x] Tag management (create/delete global tags)
- [x] Live update without redeployment

## Quality
- [x] Vitest tests for scanner and tRPC routes (12 tests passing)
- [x] TypeScript clean (0 errors)
- [x] Responsive layout polish (mobile-friendly)
- [x] Custom category label editor on model detail page
- [x] File-type filter in filter panel (STL, 3MF, OBJ)

## Restructure: Level-based Hierarchy
- [x] Rewrite Drive scanner: Level 1 folders = Collections, Level 2 folders = Models
- [x] Scanner collects all files/subfolders inside each Level 2 folder recursively for detail view
- [x] Update tRPC models.list to return Level 2 folders as model entries
- [x] Update model detail page to display all files and nested subfolders within the model folder
- [x] Update thumbnail logic: pick first image found anywhere inside the model folder
- [x] Clear and re-scan after schema/logic changes

## New Features (Round 3)
- [x] Live scan progress indicator with real-time model count during scan
- [x] "Open in Drive" button on model cards linking to the model's Drive folder
- [x] Sort options for gallery (A-Z, Z-A, newest scanned, most files, most renders)

## Auto-Scan & Scheduled Rescan
- [x] Auto-scan on first load (frontend: trigger scan if 0 models in DB)
- [x] /api/scheduled/rescan endpoint with cron auth
- [x] Register /api/scheduled/rescan in server/_core/index.ts
- [x] Last synced indicator in NavBar
- [x] Hourly Heartbeat cron job created (task_uid: YeLVQQNJAMhDVqnhjxHN7T, fires every hour at :00)

## Incremental/Delta Scan
- [x] Change upsertModel and upsertCategory to INSERT ... ON DUPLICATE KEY UPDATE (non-destructive, already was)
- [x] Remove full-clear logic from scan.start — never wipe existing rows (confirmed non-destructive)
- [x] Mark models missing from Drive as stale (deferred — non-destructive scan keeps all existing data)
- [x] Auto-scan on first load: only trigger if model count is 0 (not based on scan log)

## Role-Based Access Control (RBAC)
- [x] Owner role: full access (library + scan + settings)
- [x] Viewer role: library browse only (no scan button, no settings page)
- [x] useAuth role check in NavBar: hide Scan button and Settings link from Viewers
- [x] Protect /settings route: redirect Viewers to /
- [x] Backend: adminProcedure for scan.start, settings.get, settings.update, settings.validate (owner only)
- [x] Login required for all pages (redirect to login if not authenticated)

## Login Required (Option A — Full Auth Gate)
- [x] Home page: redirect to login if not authenticated
- [x] ModelDetail page: redirect to login if not authenticated
- [x] Backend: switch models.list, models.get, models.count, categories.list, tags.list, scan.status to protectedProcedure

## Hard Delete on Scan
- [x] db.ts: add deleteModelsNotIn(driveIds) helper — deletes models + model_tags cascade
- [x] db.ts: add deleteCategoriesNotIn(driveIds) helper — deletes categories not found in Drive
- [x] routers.ts: after scan completes, call both delete helpers with the scanned Drive IDs
- [x] Test: verify hard delete removes stale models and their tags

## Access Control (Allowlist)
- [x] access_requests table: id, email, name, openId, status (pending/approved/denied), requestedAt, reviewedAt
- [x] db helpers: upsertAccessRequest, getAccessRequest, listAccessRequests, updateAccessStatus, preAddEmail
- [x] Backend: check access status on every protected request, auto-approve owner
- [x] tRPC procedures: access.check, access.list (admin), access.approve, access.deny, access.preAdd, access.remove
- [x] Owner notification when new access request comes in
- [x] Pending Approval splash page for users awaiting approval
- [x] Denied splash page for rejected users
- [x] Access Control tab in Settings page: pending list, approved list, denied list, pre-add email form
- [x] Wire access gate into App.tsx route guards
- [x] Tests for access control procedures

## Gaps to Address
- [x] Add auth check to /api/download/zip/:modelId endpoint (verify session cookie)
- [x] Add notifyOwner call when new access request is created
- [x] Add Vitest tests for access.check/approve/deny/preAdd/remove
- [x] Verify individual file download links work after changes

## Model Detail: File Prioritization & Bulk Download
- [x] Sort files: docs/PDFs/instructions first, then images, then 3D model files (STL/3MF/OBJ)
- [x] Bulk ZIP download button: streams all files in the model folder as a .zip via backend
- [x] Individual file download links (verified working)
- [x] Backend: /api/download/zip/:modelId endpoint that fetches files from Drive and streams a zip

## New Features (Round 4)
- [x] Collapsible category sections on Home page (collapse/expand per collection, persisted in localStorage)
- [x] Nightly sync option in Settings (toggle between hourly and nightly Heartbeat schedule, persisted in DB)

## Round 5: UX Improvements
- [x] Collapse All / Expand All button in gallery header
- [x] Model count badge shown on collapsed category sections
- [x] Custom nightly sync hour picker in Settings (instead of fixed 3 AM UTC)

## Round 6: LLM Auto-Tagger
- [x] Seed 28 predefined tags into the database
- [x] Build LLM auto-tagger module (model name + file names → tag suggestions from existing tag list)
- [x] Wire auto-tagger into scan pipeline (runs after every scan)
- [x] Add Re-tag All button in Settings → Tags tab
- [x] Custom nightly sync hour picker in Settings (backend + UI)
- [x] Collapse All / Expand All button in gallery header
- [x] Model count badge on collapsed sections

## Round 7: Vision-Based Best Thumbnail Picker
- [x] Add heroImage column to models table (nullable text)
- [x] Build vision thumbnail picker module (LLM picks best complete-model photo)
- [x] Wire thumbnail picker into scan pipeline (runs after auto-tagging)
- [x] Add Re-pick Thumbnails button in Settings → Tags tab (alongside Re-tag All)
- [x] Update model cards to display heroImage when available
- [x] Update model detail page to display heroImage as primary photo

## Round 8: STL Viewer + Vision Thumbnail
- [x] Add heroImage column to models table (nullable text)
- [x] Build vision thumbnail picker module (LLM picks best complete-model photo)
- [x] Wire thumbnail picker into scan pipeline + Re-pick Thumbnails button in Settings
- [x] Build inline Three.js STL viewer component (for cards and detail page)
- [x] Update model cards: show heroImage if set, else STL viewer if STL files exist, else placeholder
- [x] Update model detail page: show heroImage as primary, STL viewer as fallback
- [x] Manual hero image picker on model detail page (click any image to set as hero)
- [x] setHeroImage tRPC procedure (admin/owner can override AI pick)

## Round 9: Tag Search & Filtering
- [x] Backend: extend models.list to accept tagIds filter
- [x] Frontend: tag filter chips in filter panel (click to toggle)
- [x] Frontend: text search also matches tag names

## Round 11: Resources Page
- [x] Add resources table (id, name, url, logoUrl, description, sortOrder)
- [x] db helpers: listResources, createResource, updateResource, deleteResource
- [x] tRPC procedures: resources.list (protected), resources.create/update/delete (admin)
- [x] Resources page: logo-card grid, external links open in new tab
- [x] Owner-only: add/edit/delete resource cards inline
- [x] Add Resources tab to NavBar
- [x] Register /resources route in App.tsx

## Round 12: Fix Expiring Drive Image URLs
- [x] Add /api/drive-image/:fileId proxy endpoint (fetches fresh thumbnails via Drive API, 30-min cache)
- [x] Update model cards to use proxy URL instead of raw Drive thumbnailLink
- [x] Update Recently Added carousel to use proxy URL
- [x] Update model detail page main image, thumbnail strip, and lightbox to use proxy URL
- [x] Store /api/drive-image/:fileId as heroImage when manually set (never expires)

## Round 13: Polish & Locking
- [x] Clear hero image button on model detail page (reset to AI pick on next scan)
- [x] Auto-tag locking: skip models with manually-curated tags on auto-scan
- [x] Scan summary toast notification after each scan completes

## Round 14: Hero Image Source + Re-pick Status
- [x] Add heroImageSource column (ai/manual) to models table
- [x] Update setHeroImage to mark source as "manual", clearHeroImage to clear source
- [x] Update thumbnailPicker to mark source as "ai", skip manual picks on re-pick
- [x] Add thumbnailPicker progress tracking (server-side state + tRPC query)
- [x] Update Settings Re-pick Thumbnails button with live progress status

## Round 15: Single-Model Rescan
- [x] models.rescanOne tRPC procedure (re-fetch one Drive folder, update files/images, re-run thumbnail picker)
- [x] Admin-only Rescan button on model detail page with loading state and toast

## Round 16: Rescan Re-detects Parent Category
- [x] rescanOne: fetch model folder's parents from Drive API (files.get?fields=parents)
- [x] rescanOne: match returned parent ID against categories.driveId to find new category
- [x] rescanOne: update categoryId in upsertModel call if category changed
- [x] rescanOne: return movedToCategory in response when category changed
- [x] ModelDetail toast: show "moved to 'Category Name'" when rescan detects a category change
- [x] ModelDetail: invalidate models.list on rescan success so home page reflects new category

## ✅ VERSION 1.0 — Locked Jun 26, 2026

## Round 17: Library Scan Progress Indicator
- [x] Add in-memory scan progress state to server (currentCollection, collectionsScanned, totalCollections, modelsFound, phase)
- [x] Emit progress updates from driveScanner.ts via a callback during scan
- [x] Add models.scanProgress tRPC query (public) that returns current progress state
- [x] Update Settings page Library Scan section to poll scanProgress every 2s while running
- [x] Show progress bar (collectionsScanned / totalCollections), current collection name, models found count
- [x] Show phase labels: "Discovering collections", "Scanning [Collection Name]", "Saving to database", "Done"

## Round 18: About Page
- [x] Create About.tsx with Kenny's bio, social links (YouTube, Facebook, Reddit, MakerWorld, MakerOnline), and library description
- [x] Add About route (/about) to App.tsx
- [x] Add About nav link to NavBar.tsx
