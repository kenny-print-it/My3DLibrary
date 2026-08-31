# My3DLibrary v1.3 Beta Portable

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

## Library Browsing

Choose the layout that works best for your collection:

- **Collections** keeps the original expandable category sections.
- **Tabs** puts every category in a horizontal tab bar, so you can switch collections without scrolling through the full library.
- **Compact List** shows a dense row for each model with its thumbnail, collection, tags, file count, and render count. Sort it by model name, collection, tags, or files.

The app remembers your chosen layout, selected tab, Compact List sorting, and Recently Added visibility on that computer. Owners can also pin favorite collections so they stay first. Category sections and selected Tabs use a model’s existing hero image as a cover banner when one is available.

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
1. Uses a classic 3/4 hero angle if you have not manually rotated the viewer
2. Captures the visible Three.js canvas as a **512×512 PNG**
3. Saves the PNG directly into the model's folder
4. Sets it as the hero image on the library card — no rescan needed

If you rotate the model yourself first, the app captures your current angle. If you have multiple 3D files, select the one you want in the file selector strip first, then click Generate Thumbnail.

---

## AI Auto-Tagging (Optional)

AI tagging automatically describes and tags your 3D models by analysing their thumbnail images. It is completely optional — the library works fully without it.

| Option | Cost | GPU Required | Best For |
|--------|------|-------------|---------|
| **Ollama (local)** ⭐ Best for privacy | Free after download | Optional | Full text + image AI, offline, private |
| **Google Gemini** ⭐ Best online option | User's free tier, subject to quota | No | Online text + image AI, no model download |
| **Groq** | Provider-controlled quota/pricing | No | Legacy text-only tags only |
| **OpenAI** | ~$0.01/model | No | Highest quality |
| **LM Studio** | Free | Recommended | Local, any OpenAI-compatible model |

### Using the AI Setup Guide

In **Settings → AI / LLM Configuration**, click **"AI Setup Guide"** to open the interactive setup wizard.

Each option is a collapsible card. Click any card to expand it and read the instructions. At the bottom of each card is a **"Use This Option — Auto-fill Settings"** button that:
- Fills in the API URL, text model, and vision model fields automatically
- Opens the settings form in edit mode so you can review the values
- Leaves the API key blank for options that need one (Gemini, Groq, OpenAI)

### Option A — Ollama (Free Local AI, Offline)

1. **Run `Download-AI-Model.bat`** (included in the app folder)
   - Downloads and installs Ollama if needed
   - Asks whether you want **GPU mode** (~5.3 GB) or **CPU mode** (~3.7 GB)
   - Downloads the correct models and configures the app automatically
2. **Restart `My3DLibrary.exe`**
3. Go to **Settings → AI Status** and click **Check Again** to confirm both models are green

> **Tip:** The models are stored inside the app folder — move the entire folder to another PC or USB drive and it works without re-downloading.

### Option B — Google Gemini (Recommended Online AI)

Gemini is the recommended online option when you do not want to download local AI models. It supports both name/file tag suggestions and hero-image selection with one user-owned Gemini API key.

1. Visit [Google AI Studio](https://aistudio.google.com/apikey), sign in, and create a Gemini API key.
2. Open **Settings → AI / LLM Configuration → AI Setup Guide** and choose **Google Gemini (online, free tier)**.
3. Read and confirm the privacy/free-tier notice, then use the auto-fill button.
4. Paste your Gemini API key, choose **Save & Lock**, then choose **Check Again** under AI Status.

> **Privacy and quota:** Gemini sends the render thumbnails selected for AI analysis to Google. Its free tier has quotas and availability can change. Use local Ollama instead if you do not want images to leave your computer.

### Option C — Groq (Legacy Text-Only Cloud AI)

Groq is no longer recommended for the complete AI workflow. The models previously suggested by My3DLibrary are being retired, and Groq's suggested replacement, `openai/gpt-oss-20b`, does not analyse images. It can provide text-only suggestions from model names and filenames, but not image-based tags or hero-image selection.

Choose **Gemini** for online text-and-image AI, or **Ollama** for free private offline AI. Choose Groq only if you intentionally want legacy cloud text tagging.

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

**AI tagging not working:** Open the AI Setup Guide and confirm the provider setup. For Ollama, make sure `ollama.exe` is in the `ollama\` subfolder and is running. For Gemini, confirm that your API key is pasted and your free-tier quota is available. Groq is available only for legacy text-only tagging.

**3D viewer shows a blank screen:** The model file may be very large or use an unusual format. Try a different file in the same model folder using the file selector strip.

**Generate Thumbnail button not visible:** The button only appears when a model has no render images and at least one STL or 3MF file. It is only visible to the library owner (logged-in user).

---

Created by Kenny Print It? — https://github.com/kenny-print-it/My3DLibrary
