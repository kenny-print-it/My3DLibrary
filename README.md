# My3DLibrary — Portable 3D Model Library Manager

**A free, self-hosted Plex-style library for your 3D print model collection.**  
No installation required. Runs on any Windows 10/11 PC straight from a folder or USB drive.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.2--Beta-blue.svg)](https://github.com/kenny-print-it/my3dlibrary/releases)
[![Ko-fi](https://img.shields.io/badge/Support-Ko--fi-ff5e5b?logo=ko-fi&logoColor=white)](https://ko-fi.com/kennyprintit)

---

## What is My3DLibrary?

My3DLibrary is a portable Windows app that turns your folders of STL files into a browsable, searchable library — like Plex, but for 3D models.

- **Browse** your collection by collection and category with thumbnail previews
- **View** models in a built-in interactive 3D STL viewer
- **Auto-tag** models using local AI (Ollama) or free cloud AI (Groq) — no subscription required
- **Search** by name, tag, or collection
- **Manage** multiple library locations across different drives
- **Recycle bin** — soft-delete models with restore and purge options
- **Bulk tag** — apply or remove tags across multiple models at once
- **Portable** — runs from a USB drive, no install, no admin rights needed

> Your files never leave your computer. My3DLibrary is 100% local.

---

## Download

👉 **[Download the latest release](https://github.com/kenny-print-it/my3dlibrary/releases)**

Just unzip and double-click `My3DLibrary.exe`. That's it.

---

## Screenshots

<!-- Add screenshots here once you have them -->

---

## Quick Start

1. Download and unzip `My3DLibrary-Windows-v1.2-Beta.zip`
2. Double-click `My3DLibrary.exe`
3. Your browser opens automatically at `http://localhost:3000`
4. Go to **Settings → Library**, click **Add Folder**, and point it at your models folder
5. Click **Start Scan** — your library populates automatically

See `My3DLibrary-Portable/README.txt` inside the ZIP for full documentation including AI setup, scan depth options, and troubleshooting.

---

## Using Google Drive

Install [Google Drive for Desktop](https://www.google.com/drive/download/) — it mounts your Drive as a local drive letter (e.g. `G:\`). Then add that drive path in Settings just like any local folder. No API keys needed.

---

## AI Auto-Tagging (Optional)

My3DLibrary can automatically tag your models by looking at their thumbnail images. AI is completely optional — thumbnails and the STL viewer work without it.

| Option | Cost | GPU Required | Setup |
|---|---|---|---|
| **Groq** ⭐ Recommended | Free | No | Get a free API key at [console.groq.com](https://console.groq.com) |
| **Ollama (local)** | Free | Recommended | Run `Download-AI-Model.bat` |
| **OpenAI** | ~$0.01/model | No | Enter your API key in Settings |
| **LM Studio** | Free | Recommended | Start the local server, point Settings at `http://localhost:1234/v1` |

### Option A — Groq (Free Cloud AI, No GPU Needed)

Groq is the easiest way to get started. It's free, fast, and works on any PC.

1. Go to [console.groq.com](https://console.groq.com) and create a free account
2. Click **API Keys** in the top menu bar → **Create API Key**
3. Copy the key (starts with `gsk_...`)
4. In My3DLibrary, go to **Settings → AI / LLM Configuration → Edit** and enter:
   - **API URL:** `https://api.groq.com/openai/v1`
   - **API Key:** your `gsk_...` key
   - **Text Model:** `llama-3.1-8b-instant`
   - **Vision Model:** `llama-3.2-11b-vision-preview` *(requires free phone verification on Groq)*
5. Click **Save & Lock**, then **Check Again** — both models should turn green

> **No GPU needed.** Groq runs in the cloud and is free for personal use.

### Option B — Ollama (Free Local AI)

Ollama runs entirely on your PC. A GPU is recommended for best performance, but CPU mode is available for PCs without a dedicated GPU.

1. **Run `Download-AI-Model.bat`** (included in the app folder)
   - It will automatically download and install Ollama if needed
   - It will ask whether you want **GPU mode** (~7 GB download) or **CPU mode** (~3.7 GB download)
   - It downloads the correct models for your choice and configures the app automatically
2. **Close and reopen `My3DLibrary.exe`** — the app restarts with AI ready to use
3. Go to **Settings → AI Status** and click **Check Again** to confirm both models are green

> **Tip:** The models are stored inside the app folder, so you can move the entire `My3DLibrary-Portable` folder to another PC or USB drive and it will work without re-downloading.

---

## Building from Source

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build frontend
npx vite build

# Build server bundle
node build-server.mjs
```

**Requirements:** Node.js 18+, pnpm

---

## Tech Stack

- **Frontend:** React 19, Tailwind CSS 4, shadcn/ui, tRPC
- **Backend:** Node.js, Express, tRPC, Drizzle ORM
- **Database:** SQLite (via better-sqlite3)
- **3D Viewer:** Three.js / STLLoader
- **AI:** Ollama (llama3.2 + moondream/llava) or any OpenAI-compatible API (Groq, OpenAI, LM Studio)

---

## Contributing

Bug reports and feature requests are welcome via [GitHub Issues](https://github.com/kennyprintit/my3dlibrary/issues).

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
