# My3DLibrary Portable

**No installation required.** Extract anywhere — a folder on your PC, an external hard drive, or a USB drive — and double-click `Start.bat`.

---

## Quick Start

1. **Extract** this ZIP to any folder (e.g. `D:\My3DLibrary\` or a USB drive)
2. **Double-click `Start.bat`**
3. Your browser will open to `http://localhost:3000`
4. On first run, create your admin account

That's it. No Docker, no installation, no admin rights needed.

---

## Folder Structure

```
My3DLibrary-Portable/
  Start.bat                ← Double-click to launch
  Stop.bat                 ← Click to stop cleanly
  my3dlibrary-server.exe   ← The app (bundled Node.js server)
  ollama/                  ← Optional: place ollama.exe here for AI tagging
  data/                    ← Created automatically on first run
    library.db             ← Your library database (SQLite)
    ollama-models/         ← AI model files (if Ollama is set up)
  library/                 ← Put your 3D model files here (or point to another folder)
  README-PORTABLE.md       ← This file
```

---

## AI Tagging (Optional)

AI tagging uses Ollama to automatically describe your 3D models. It is optional — the library works fully without it.

**To enable AI tagging:**

1. Download Ollama for Windows from https://ollama.com/download/windows
2. Instead of running the Ollama installer, find `ollama.exe` in:
   `C:\Users\<YourName>\AppData\Local\Programs\Ollama\`
3. Copy `ollama.exe` into the `ollama\` folder inside this portable directory
4. Restart My3DLibrary (Stop.bat then Start.bat)

The first time you use AI tagging, the model (~4 GB) will download automatically.

---

## Moving the Folder

You can move or copy the entire folder to a new location at any time. The database and settings move with it. Just run `Start.bat` from the new location.

---

## Stopping My3DLibrary

Either:
- Press any key in the `Start.bat` console window, or
- Double-click `Stop.bat`

---

## Troubleshooting

**Port 3000 is already in use:** Another app is using port 3000. Stop that app, or edit `Start.bat` and change `PORT=3000` to `PORT=3001` (then open `http://localhost:3001`).

**Antivirus quarantines the exe:** The `.exe` is a bundled Node.js app — it contains no malware. Add the folder to your antivirus exclusions. See your antivirus documentation for how to do this.

**AI tagging not working:** Ensure `ollama.exe` is in the `ollama\` subfolder and Ollama started successfully (check for a minimised "Ollama" window in the taskbar).

---

Created by Kenny Print It? — https://kennyprintit.manus.space
