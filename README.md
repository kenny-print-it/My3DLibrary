# My3DLibrary — Portable 3D Model Library Manager

**A free, self-hosted Plex-style library for your 3D print model collection.**  
No installation required. Runs on any Windows 10/11 PC straight from a folder or USB drive.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.2--Beta-blue.svg)](https://github.com/kenny-print-it/My3DLibrary/releases)
[![Ko-fi](https://img.shields.io/badge/Support-Ko--fi-ff5e5b?logo=ko-fi&logoColor=white)](https://ko-fi.com/kennyprintit)

---

## What is My3DLibrary?

My3DLibrary is a portable Windows app that turns your folders of STL and 3MF files into a browsable, searchable library — like Plex, but for 3D models.

- **Browse** your collection by collection and category with thumbnail previews
- **View** models in a built-in interactive 3D viewer — supports both **STL and 3MF** files
- **Multi-file viewer** — when a model has multiple STL/3MF files, a file selector strip lets you switch between them instantly
- **Generate Thumbnail** — capture a thumbnail from the 3D viewer with one click; auto-orients to a hero angle or captures your current rotation. A bulk ✦ button generates thumbnails for every model missing renders in one pass
- **Auto-tag** models using local AI (Ollama) or free cloud AI (Groq) — no subscription required
- **AI Setup Guide** — interactive wizard with one-click auto-fill for all AI provider settings
- **Search** by name, tag, or collection
- **Manage** multiple library locations across different drives
- **Recycle bin** — soft-delete models with restore and purge options
- **Bulk tag** — apply or remove tags across multiple models at once
- **Portable** — runs from a USB drive, no install, no admin rights needed

> Your files never leave your computer. My3DLibrary is 100% local.

---

## Download

👉 **[Download the latest release](https://github.com/kenny-print-it/My3DLibrary/releases)**

Just unzip and double-click `My3DLibrary.exe`. That's it.

---

## Screenshots

<!-- Add screenshots here once you have them -->

---

## Quick Start

1. Download and unzip `My3DLibrary-Windows-v1.2-Beta-build9.zip`
2. Double-click `My3DLibrary.exe`
3. Your browser opens automatically at `http://localhost:3000`
4. Go to **Settings → Library**, click **Add Folder**, and point it at your models folder
5. Click **Start Scan** — your library populates automatically

See `README-PORTABLE.md` inside the ZIP for full documentation including AI setup, scan depth options, and troubleshooting.

---

## 3D Viewer

My3DLibrary includes a built-in interactive 3D viewer powered by Three.js.

### Supported Formats

| Format | Support |
|--------|---------|
| **STL** (binary + ASCII) | ✅ Full support |
| **3MF** | ✅ Full support (new in v1.2-beta) |

### Multiple Files

If a model folder contains more than one STL or 3MF file, a **file selector strip** appears below the viewer. Each file shows an **STL** (amber) or **3MF** (blue) badge — click any file to switch the preview instantly.

### Generate Thumbnail

When a model has no render images but has an STL or 3MF file, a **"Generate Thumbnail"** button appears below the viewer (owner only).

Clicking it:
1. Snaps the camera to a classic 3/4 front-left elevated hero angle (if you haven't manually rotated the model)
2. Captures the visible Three.js canvas as a **512×512 PNG**
3. Saves the PNG directly into the model's folder on disk
4. Sets it as the hero image on the library card — no rescan needed

> **Tip:** Rotate the model to any angle you prefer before clicking — the button captures exactly what's on screen.

### Bulk Thumbnail Generation

The **✦ (sparkle) button** in the Library toolbar generates thumbnails for every model that has no render images but has at least one STL or 3MF file.

- A progress card in the bottom-right shows which model is being processed
- 3MF files are prioritised over STL when both are present
- A 30-second timeout per model prevents stalling on very large files
- The library refreshes automatically when complete

---

## Using Google Drive

Install [Google Drive for Desktop](https://www.google.com/drive/download/) — it mounts your Drive as a local drive letter (e.g. `G:\`). Then add that drive path in Settings just like any local folder. No API keys needed.

---

## AI Auto-Tagging (Optional)

My3DLibrary can automatically tag your models by looking at their thumbnail images. AI is completely optional — thumbnails and the 3D viewer work without it.

| Option | Cost | GPU Required | Setup |
|--------|------|-------------|-------|
| **Groq** ⭐ Recommended | Free | No | Get a free API key at [console.groq.com](https://console.groq.com) |
| **Ollama (local)** | Free | Recommended | Run `Download-AI-Model.bat` |
| **OpenAI** | ~$0.01/model | No | Enter your API key in Settings |
| **LM Studio** | Free | Recommended | Start the local server, point Settings at `http://localhost:1234/v1` |

### AI Setup Guide (New in v1.2-beta)

In **Settings → AI / LLM Configuration**, click **"AI Setup Guide"** to open the interactive setup wizard.

Each option (A–D) is a collapsible card with step-by-step instructions. At the bottom of each card is a **"Use This Option — Auto-fill Settings"** button that fills in the API URL, text model, and vision model fields automatically. Just paste your API key (if required) and click Save.

### Option A — Groq (Free Cloud AI, No GPU Needed)

Groq is the easiest way to get started. It's free, fast, and works on any PC.

1. Go to [console.groq.com](https://console.groq.com) and create a free account
2. Click **API Keys** → **Create API Key** and copy the key (starts with `gsk_...`)
3. In the AI Setup Guide, click **Option A → Use This Option** — the URL and models fill in automatically
4. Paste your API key, then click **Save & Lock**
5. Click **Check Again** — both models should turn green

> **No GPU needed.** Groq runs in the cloud and is free for personal use.

### Option B — Ollama (Free Local AI, Fully Offline)

Ollama runs entirely on your PC. A GPU is recommended for best performance, but CPU mode is available for PCs without a dedicated GPU.

1. **Run `Download-AI-Model.bat`** (included in the app folder)
   - Automatically downloads and installs Ollama if needed
   - Asks whether you want **GPU mode** (~7 GB download) or **CPU mode** (~3.7 GB download)
   - Downloads the correct models and configures the app automatically
2. **Restart `My3DLibrary.exe`**
3. Go to **Settings → AI Status** and click **Check Again** to confirm both models are green

> **Tip:** The models are stored inside the app folder — move the entire `My3DLibrary-Portable` folder to another PC or USB drive and it works without re-downloading.

---

## Building from Source

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build (frontend + server bundle + sync to printlib-portable)
pnpm run build
```

**Requirements:** Node.js 18+, pnpm

---

## Tech Stack

- **Frontend:** React 19, Tailwind CSS 4, shadcn/ui, tRPC
- **Backend:** Node.js, Express, tRPC, Drizzle ORM
- **Database:** SQLite (via better-sqlite3)
- **3D Viewer:** Three.js (STL binary/ASCII parser + 3MF parser via fflate)
- **AI:** Ollama (llama3.2 + moondream/llava) or any OpenAI-compatible API (Groq, OpenAI, LM Studio)

---

## Contributing

Bug reports and feature requests are welcome via [GitHub Issues](https://github.com/kenny-print-it/My3DLibrary/issues).

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

---

## Support

If My3DLibrary saves you time or brings some order to your collection, consider buying me a coffee!

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/kennyprintit)

---

## License

[MIT](LICENSE) — © 2026 Kenny Print It?

---

## About

Created by **Kenny Print It?** — a dad from Virginia who turned a fascination with 3D printing into a full-blown obsession.

- 📘 Facebook: [Kennyprintit](https://www.facebook.com/Kennyprintit)
- 🎥 YouTube: [@hahakenny](https://www.youtube.com/@hahakenny)
- 🌐 MakerWorld: [@hahakenny](https://makerworld.com/en/@hahakenny)
- ☕ Ko-fi: [kennyprintit](https://ko-fi.com/kennyprintit)
