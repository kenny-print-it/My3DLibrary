# PrintLib Local — Installation Guide

Self-hosted 3D model library. Runs on your own computer or home network.
No internet required (except for optional AI features).

---

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — free, available for Windows, Mac, and Linux
- Your 3D model library organized like this:

```
Your Library Folder/
  Beasts and Minis/
    Dragon/
      dragon.stl
      render1.jpg
    Goblin/
      goblin.3mf
      photo.png
  Terrain/
    Castle Wall/
      wall.stl
  ...
```

---

## Quick Start (Windows)

1. **Install Docker Desktop** from https://docker.com and start it
2. **Download PrintLib** — unzip this folder anywhere (e.g. `C:\PrintLib`)
3. **Configure** — copy `env-config-template.txt` to `.env` and open it in Notepad:
   - Set `LIBRARY_PATH` to your 3D model folder (e.g. `C:\Users\Kenny\3DModels`)
   - Set `JWT_SECRET` to a long random string (see instructions inside the file)
4. **Start** — double-click `start.bat`
5. **Open** — your browser will open to `http://localhost:3000`
6. **First login** — create your admin account on the setup page
7. **Scan** — go to Settings → Library → Start Scan to import your models

---

## Quick Start (Mac / Linux)

```bash
# 1. Copy and edit the config
cp env-config-template.txt .env
nano .env   # or open in any text editor

# 2. Start
docker compose up -d

# 3. Open in browser
open http://localhost:3000   # Mac
xdg-open http://localhost:3000   # Linux
```

---

## Accessing from Other Devices on Your Network

Once running, other computers and phones on your home network can access PrintLib at:

```
http://<your-computer-ip>:3000
```

To find your computer's IP address:
- **Windows**: Open Command Prompt, type `ipconfig`, look for `IPv4 Address`
- **Mac**: System Settings → Network → your connection → IP Address
- **Linux**: `ip addr show` or `hostname -I`

---

## Optional: AI Auto-Tagging & Thumbnail Picking

PrintLib can automatically tag your models and pick the best thumbnail image using AI.

**Using OpenAI (cloud):**
```
LLM_API_URL=https://api.openai.com/v1
LLM_API_KEY=sk-your-openai-key
LLM_MODEL=gpt-4o-mini
```

**Using Ollama (local, free, no internet):**
1. Install [Ollama](https://ollama.ai) and run `ollama pull llava`
2. Set in `.env`:
```
LLM_API_URL=http://host.docker.internal:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=llava
```

---

## Updating PrintLib

```bash
# Stop the current version
docker compose down

# Pull the new version (or replace the files manually)
# Then rebuild and restart
docker compose up -d --build
```

---

## Stopping PrintLib

- **Windows**: Double-click `stop.bat`
- **Mac/Linux**: `docker compose down`

Your library data is stored in a Docker volume and is preserved between restarts.

---

## Troubleshooting

**"Docker Desktop is not running"** — Start Docker Desktop from the Start Menu and wait for it to fully load (the whale icon in the taskbar should stop animating).

**"Port 3000 is already in use"** — Change the port in `.env`: add `PORT=3001` and update `docker-compose.yml` to `"3001:3000"`.

**Models not showing after scan** — Make sure your `LIBRARY_PATH` points to the folder that *contains* your collection folders (not a collection folder itself).

**Can't access from other devices** — Check your Windows Firewall and allow port 3000 for private networks.
