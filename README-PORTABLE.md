# My3DLibrary Portable

**No installation required.** Extract anywhere — a folder on your PC, an external hard drive, or a USB drive — and double-click `My3DLibrary.exe`.

---

## Quick Start

1. **Extract** this ZIP to any folder (e.g. `D:\My3DLibrary\` or a USB drive)
2. **Double-click `My3DLibrary.exe`**
3. Your browser will open to `http://localhost:3000`
4. Go to **Settings → Library**, click **Add Folder**, and point it at your models folder
5. Click **Start Scan** — your library populates automatically

That's it. No Docker, no installation, no admin rights needed.

---

## Folder Structure

```
My3DLibrary-Portable/
  My3DLibrary.exe            ← Double-click to launch
  Download-AI-Model.bat      ← One-click Ollama setup (optional)
  ollama/                    ← Optional: place ollama.exe here for AI tagging
  data/                      ← Created automatically on first run
    library.db               ← Your library database (SQLite)
    ollama-models/           ← AI model files (if Ollama is set up)
  library/                   ← Put your 3D model files here (or point to another folder)
  README-PORTABLE.md         ← This file
```

---

## 3D Viewer

My3DLibrary includes a built-in interactive 3D viewer for **STL** and **3MF** files — no external software needed.

- **Rotate** — click and drag
- **Zoom** — scroll wheel or pinch on touchscreen
- **Multiple files** — if a model has more than one STL or 3MF file, a file selector strip appears below the viewer so you can switch between them. Each file shows an **STL** (amber) or **3MF** (blue) badge.

### Generate Thumbnail

If a model has no render images but has an STL or 3MF file, a **"Generate Thumbnail"** button appears below the viewer.

Clicking it:
1. Samples **28 camera angles** around the model to find the most informative view
2. Renders a high-quality **512×512 PNG** at the best angle
3. Saves the PNG directly into the model's folder
4. Sets it as the hero image on the library card — no rescan needed

If you have multiple 3D files, select the one you want in the file selector strip first, then click Generate Thumbnail.

---

## AI Auto-Tagging (Optional)

AI tagging automatically describes and tags your 3D models by analysing their thumbnail images. It is completely optional — the library works fully without it.

| Option | Cost | GPU Required | Best For |
|--------|------|-------------|---------|
| **Groq** ⭐ Recommended | Free | No | Quick setup, any PC |
| **Ollama (local)** | Free | Recommended | Full offline, privacy |
| **OpenAI** | ~$0.01/model | No | Highest quality |
| **LM Studio** | Free | Recommended | Local, any OpenAI-compatible model |

### Using the AI Setup Guide

In **Settings → AI / LLM Configuration**, click **"AI Setup Guide"** to open the interactive setup wizard.

Each option (A–D) is a collapsible card. Click any card to expand it and read the instructions. At the bottom of each card is a **"Use This Option — Auto-fill Settings"** button that:
- Fills in the API URL, text model, and vision model fields automatically
- Opens the settings form in edit mode so you can review the values
- Leaves the API key blank for options that need one (Groq, OpenAI)

### Option A — Groq (Free Cloud AI, No GPU Needed)

1. Go to [console.groq.com](https://console.groq.com) and create a free account
2. Click **API Keys → Create API Key** and copy the key (starts with `gsk_...`)
3. In the AI Setup Guide, click **Option A → Use This Option** — the URL and models fill in automatically
4. Paste your API key, then click **Save & Lock**
5. Click **Check Again** — both models should turn green

### Option B — Ollama (Free Local AI, Offline)

1. **Run `Download-AI-Model.bat`** (included in the app folder)
   - Downloads and installs Ollama if needed
   - Asks whether you want **GPU mode** (~7 GB) or **CPU mode** (~3.7 GB)
   - Downloads the correct models and configures the app automatically
2. **Restart `My3DLibrary.exe`**
3. Go to **Settings → AI Status** and click **Check Again** to confirm both models are green

> **Tip:** The models are stored inside the app folder — move the entire folder to another PC or USB drive and it works without re-downloading.

---

## Moving the Folder

You can move or copy the entire folder to a new location at any time. The database, settings, and AI models all move with it. Just run `My3DLibrary.exe` from the new location.

---

## Stopping My3DLibrary

Close the console window that opened when you launched `My3DLibrary.exe`, or press **Ctrl+C** inside it.

---

## Troubleshooting

**Port 3000 is already in use:** Another app is using port 3000. Stop that app, or set the environment variable `PORT=3001` and open `http://localhost:3001`.

**Antivirus quarantines the exe:** The `.exe` is a bundled Node.js app — it contains no malware. Add the folder to your antivirus exclusions.

**AI tagging not working:** Ensure `ollama.exe` is in the `ollama\` subfolder and that Ollama started successfully (check for a minimised "Ollama" window in the taskbar). Or use the AI Setup Guide in Settings to switch to Groq (no GPU needed).

**3D viewer shows a blank screen:** The model file may be very large or use an unusual format. Try a different file in the same model folder using the file selector strip.

**Generate Thumbnail button not visible:** The button only appears when a model has no render images and at least one STL or 3MF file. It is only visible to the library owner (logged-in user).

---

Created by Kenny Print It? — https://github.com/kenny-print-it/My3DLibrary
