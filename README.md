# My3DLibrary
My3DLibrary is a free, portable 3D model library manager for Windows — no install required. Organize your STL collection by folder, browse with a built-in 3D viewer, auto-tag models using local AI, and manage multiple drives. Just unzip and run. Your files stay on your PC. Built by Kenny Print It?

My3DLibrary Portable v1.0 Beta - by Kenny Print It?
=====================================================

QUICK START
-----------
Double-click  My3DLibrary.exe  (in the parent folder, next to this folder)
  OR
Double-click  Start.bat  (inside this folder)

Your browser will open automatically at http://localhost:3000

Keep the black command window open while using My3DLibrary.
Press any key in that window to stop the server.


FOLDER STRUCTURE
----------------
| File / Folder Path | Description |
| :--- | :--- |
| **My3DLibrary.exe** | Double-click this to launch (outside this folder) |
| **My3DLibrary-Portable\\** | |
| &nbsp;&nbsp;└── `Start.bat` | Launcher script |
| &nbsp;&nbsp;└── `Stop.bat` | Stop the server |
| &nbsp;&nbsp;└── `runtime\node.exe` | Portable Node.js runtime (no install needed) |
| &nbsp;&nbsp;└── `dist\index.js` | Application server |
| &nbsp;&nbsp;└── `dist\public\` | Web interface files |
| &nbsp;&nbsp;└── `node_modules\` | Server dependencies |
| &nbsp;&nbsp;└── `data\` | Your database and settings (auto-created) |
| &nbsp;&nbsp;└── `library\` | Your 3D model files (auto-created) |
| &nbsp;&nbsp;└── `ollama\` | Place ollama.exe here for AI tagging (optional) |
| &nbsp;&nbsp;└── `README.txt` | This file |


REQUIREMENTS
------------
- Windows 10 or 11 (64-bit)
- No installation required
- No admin rights needed
- Works from USB drives and external storage


SETTING UP YOUR LIBRARY
-----------------------
1. Open the app and go to Settings > Library
2. Click "Add Folder" and browse to your 3D model folder
3. Choose a scan depth (see below)
4. Click "Start Scan" to import your models

THUMBNAILS: My3DLibrary automatically uses image files found inside each
model folder as thumbnails. Just make sure each model folder contains at
least one .jpg or .png image alongside the model files. No AI required.


USING GOOGLE DRIVE AS YOUR LIBRARY
-----------------------------------
My3DLibrary works with Google Drive by using the free
"Google Drive for Desktop" app from Google. This mounts
your Drive as a local drive letter on your PC (e.g. G:\)
so My3DLibrary can scan it just like any other folder.

Setup steps:
  1. Download and install Google Drive for Desktop:
     https://www.google.com/drive/download/
  2. Sign in with your Google account.
  3. Your Drive will appear as a new drive letter (e.g. G:\)
     in File Explorer.
  4. In My3DLibrary, go to Settings > Library > Add Folder
     and browse to the drive letter Google assigned.
  5. Select your 3D models folder and run a scan.

No API keys or special configuration needed — Google Drive
for Desktop handles the sync automatically in the background.
Files are available offline once synced.


SCAN DEPTH EXPLAINED
--------------------
When adding a library folder, you choose how deep the scanner looks:

  2-LEVEL (default)
  -----------------
> Use this when each subfolder **IS** the model.

  | File / Folder Path | Description |
  | :--- | :--- |
  | **Cosplay\\** | *Root Category Folder* |
  | &nbsp;&nbsp;└── **Helmet\\** | **<- becomes one model tile** |
  | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── `helmet.stl` | 3D Model file |
  | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── `preview.jpg` | Thumbnail preview |
  | &nbsp;&nbsp;└── **Sword\\** | **<- becomes one model tile** |
  | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── `sword.stl` | 3D Model file |
  
  3-LEVEL
  -------
> Use this when you have a category or date folder between your root and the actual model folders.

  | File / Folder Path | Description |
  | :--- | :--- |
  | **Cosplay\\** | *Root Folder* |
  | &nbsp;&nbsp;└── **Armor\\** | **<- becomes the collection label** |
  | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── **Helmet\\** | **<- becomes one model tile** |
  | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── **Gauntlets\\** | **<- becomes one model tile** |
  | &nbsp;&nbsp;└── **Weapons\\** | **<- becomes the collection label** |
  | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── **Sword\\** | **<- becomes one model tile** |

  DATE FOLDERS (3-level only):
  Date-named folders (e.g. "Jan 2024", "2024-01", "January", "2024")
  are used AS the collection label — they are NOT skipped. This means
  your models will be grouped by date, which is the most common use case
  for 3-level libraries organised by month or year.

> Example with date folders:

  | File / Folder Path | Description |
  | :--- | :--- |
  | **Cosplay\\** | *Root Folder* |
  | &nbsp;&nbsp;└── **Jan 2024\\** | **<- used as collection label "Jan 2024"** |
  | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── **Helmet\\** | **<- becomes one model tile under "Jan 2024"** |
  | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── **Sword\\** | **<- becomes one model tile under "Jan 2024"** |
  | &nbsp;&nbsp;└── **Feb 2024\\** | **<- used as collection label "Feb 2024"** |
  | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── **Gauntlets\\** | **<- becomes one model tile under "Feb 2024"** |


AI TAGGING (OPTIONAL)
---------------------
My3DLibrary can automatically tag your 3D models using AI.
Thumbnails work WITHOUT AI - you do not need this to see model images.

To enable AI auto-tagging:

  OPTION A - Ollama (Free, runs locally, no internet after setup)
  ---------------------------------------------------------------
  1. Download Ollama for Windows from: https://ollama.com/download/windows
  2. Do NOT run the installer. Instead, copy ollama.exe into the
     My3DLibrary-Portable\ollama\ folder (create it if needed).
  3. Double-click  Download-AI-Model.bat  to download the LLaVA model
     (~4.7 GB). This only needs to be done ONCE. The model is stored
     inside the app folder (ollama\models\) so it is fully portable.
  4. Start My3DLibrary normally — it detects Ollama automatically.
  5. In the app, go to Settings > AI/LLM Configuration > Edit
  6. Set API URL to:  http://localhost:11434
  7. Set Model to:    llava
  8. Save, then go to Settings > Tags and click "Auto-tag All"

  Note: After the one-time download the app works fully offline.
  The model is stored in ollama\models\ (NOT in data\) so deleting
  the data\ folder to reset the database will NOT re-download the model.

  OPTION B - OpenAI (Paid, cloud-based)
  --------------------------------------
  1. Get an API key from: https://platform.openai.com/api-keys
  2. In Settings > AI/LLM Configuration > Edit:
     API URL:  https://api.openai.com/v1
     API Key:  your OpenAI key
     Model:    gpt-4o
  3. Save and run Auto-tag from Settings > Tags

  OPTION C - LM Studio (Free, local GUI app)
  -------------------------------------------
  1. Download LM Studio from: https://lmstudio.ai
  2. Load a vision model (e.g. LLaVA)
  3. Start the local server in LM Studio
  4. In Settings > AI/LLM Configuration > Edit:
     API URL:  http://localhost:1234/v1
     Model:    the model name shown in LM Studio
  5. Save and run Auto-tag from Settings > Tags


TROUBLESHOOTING
---------------
Q: The browser opens but shows "This site can't be reached"
A: The server is still starting up. Wait 10-15 seconds and refresh the page.

Q: Windows Defender shows a warning when running My3DLibrary.exe
A: Click "More info" then "Run anyway". This is normal for unsigned apps.
   The app does not connect to the internet except for optional AI features.

Q: Thumbnails are not showing
A: Make sure each model folder contains at least one image file (.jpg, .png)
   alongside the model files. Run "Start Scan" again after adding images.
   Thumbnails do NOT require AI to be configured.

Q: Scan finds 0 models
A: Check your scan depth setting. If your folder has models directly inside
   subfolders, use 2-level. If there is an extra category or date folder in
   between, use 3-level. See "SCAN DEPTH EXPLAINED" above.

Q: Old scan results are showing wrong models or wrong structure
A: The database may contain stale data from a previous scan. To reset:
   1. Stop My3DLibrary (press any key in the command window)
   2. Delete the  data\  folder inside My3DLibrary-Portable\
   3. Restart My3DLibrary — the database will be recreated fresh
   4. Go to Settings > Library and run a new scan
   Note: This only deletes scan data. Your 3D model files are NOT affected.

Q: Port 3000 is already in use
A: Another app is using port 3000. Close it, or edit Start.bat and change
   PORT=3000 to PORT=3001, then open http://localhost:3001 instead.

Q: How do I move My3DLibrary to a different folder or USB drive?
A: Just copy the entire My3DLibrary-Portable folder (and My3DLibrary.exe)
   to the new location. Everything is self-contained.

Q: I added a folder on an external drive but it shows as offline
A: Make sure the drive is connected and the folder path is accessible.
   You can toggle folders on/off in Settings > Library without removing them.


ABOUT
-----
My3DLibrary is created by Kenny Print It?
A Plex-style library for organizing your 3D print model collection.

- Facebook:   https://www.facebook.com/Kennyprintit
- YouTube:    https://www.youtube.com/@hahakenny
- Reddit:     https://www.reddit.com/user/hahakenny/
- MakerWorld: https://makerworld.com/en/@hahakenny
