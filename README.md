# My3DLibrary — Portable 3D Model Library Manager

**A free, self-hosted Plex-style library for your 3D print model collection.**  
No installation required. Runs on any Windows 10/11 PC straight from a folder or USB drive.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0--Beta-blue.svg)](https://github.com/kennyprintit/my3dlibrary/releases)
[![Ko-fi](https://img.shields.io/badge/Support-Ko--fi-ff5e5b?logo=ko-fi&logoColor=white)](https://ko-fi.com/kennyprintit)

---

## What is My3DLibrary?

My3DLibrary is a portable Windows app that turns your folders of STL files into a browsable, searchable library — like Plex, but for 3D models.

- **Browse** your collection by collection and category with thumbnail previews
- **View** models in a built-in interactive 3D STL viewer
- **Auto-tag** models using local AI (Ollama/LLaVA) or OpenAI — no cloud required
- **Search** by name, tag, or collection
- **Manage** multiple library locations across different drives
- **Portable** — runs from a USB drive, no install, no admin rights needed

> Your files never leave your computer. My3DLibrary is 100% local.

---

## Download

👉 **[Download the latest release](https://github.com/kennyprintit/my3dlibrary/releases)**

Just unzip and double-click `My3DLibrary.exe`. That's it.

---

## Screenshots

<!-- Add screenshots here once you have them -->

---

## Quick Start

1. Download and unzip `My3DLibrary-Portable-v1.0-Beta.zip`
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

My3DLibrary can automatically tag your models by looking at their thumbnail images.

| Option | Cost | Setup |
|---|---|---|
| **Ollama + LLaVA** (recommended) | Free | Place `ollama.exe` in the `ollama\` folder, run `Download-AI-Model.bat` |
| **OpenAI GPT-4o** | ~$0.01/model | Enter your API key in Settings |
| **LM Studio** | Free | Start the local server, point Settings at `http://localhost:1234/v1` |

Thumbnails and the STL viewer work **without AI**. AI is completely optional.

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
- **AI:** Ollama (LLaVA / llama3.2-vision) or OpenAI-compatible API

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

### 💻 Downloads
- 🪟 **Windows:** `My3DLibrary-Portable-v1.0-Beta.zip`
- 🍎 **macOS (Intel + Apple Silicon):** `My3DLibrary-Mac-v1.0-Beta.zip`
  > First time: right-click → Open to bypass Gatekeeper

