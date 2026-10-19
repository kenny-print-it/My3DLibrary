My3DLibrary v1.3 Beta (Build 5 Test) — Windows Portable
=========================================================

GETTING STARTED
---------------
1. Extract the entire ZIP file to a normal folder. Do not run the app from inside the ZIP.
2. Double-click My3DLibrary.exe.
3. Your browser opens to the local My3DLibrary app.
4. In Settings, add the folder or drive that contains your 3D-model folders.

LIBRARY BROWSING
----------------
Choose **Collections**, **Tabs**, or **Compact List** on the Library page. Tabs let you jump between collections without scrolling; Compact List provides sortable model name, collection, tags, and files columns. Owners can pin favorite collections first, and categories use a model’s existing hero image as a cover banner when available.

Recently Added can be hidden, and your library view, active tab, sorting, and visibility choices are remembered on that computer.

BUILD 4: PERSONALIZE YOUR LIBRARY
---------------------------------
The My3DLibrary logo is beside the Library title and model count. The title, search, sort, selection, and filter controls stay visible while you browse. On ultra-wide monitors, the Library uses more of the available width to show additional model cards per row. Phone layouts remain compact.

In Settings → Appearance, choose My3DLibrary Light, Dark, or High Contrast. You can choose a Quick, Standard, or Leisurely opening screen; its optional sound is off by default. The Library toolbar has Compact, Comfortable, and Roomy card sizes. On a model page, Prefer This Hero locks the image you want to keep. AI hero selection now prefers a clean single-model render over exploded or multi-view sheets.

BUILD 5 TEST: 3MF PREVIEW REPAIR
---------------------------------
This Windows test build improves the built-in 3MF preview for standard multi-part projects and transformed model pieces. If a model already has a regular render image, select View 3D model below it to open the interactive STL or 3MF preview. Generated thumbnails use the same improved reader. The model-folder action continues to bring the selected folder to the front.

AI AUTO-TAGGING (OPTIONAL)
---------------------------
My3DLibrary works without AI. AI can suggest tags from model names, filenames, and existing render images.

The best private/free option is local Ollama. It runs on your computer, keeps your images private, works offline after setup, and supports both text tags and image analysis.

1. Open the My3DLibrary-Portable folder.
2. Run Download-AI-Model.bat.
3. Choose CPU mode for the widest compatibility, or GPU mode if you have a compatible NVIDIA GPU.
4. Restart My3DLibrary.exe and use Settings → AI Status → Check Again.

The included setup selects two models:
- Text model: llama3.2 (or llama3.2:3b in CPU mode)
- Vision model: gemma3:4b in GPU mode, or moondream in CPU mode

GEMINI ONLINE AI
----------------
If you prefer not to download AI models, use **Google Gemini** from the AI Setup Guide. Create your own key at https://aistudio.google.com/apikey, choose **Google Gemini (online, free tier)**, confirm the privacy notice, then paste your key and click Save & Lock.

Gemini supports both text tags and render-image selection. It uses your own Google free-tier quota, which is limited and may change. Selected render thumbnails are sent to Google for AI analysis. Use Ollama instead if you want images to stay on your computer.

GROQ NOTE
---------
Groq is no longer recommended for the complete AI workflow. The Groq models previously suggested by My3DLibrary are being retired. Groq's replacement model is text-only, so it can suggest tags from names and filenames but cannot analyse render images or choose a hero image.

If you use Groq anyway, configure it only for legacy text tagging. For online text-and-image AI, use Gemini; for private offline AI, use the included Ollama setup.

THUMBNAILS
----------
Models without images can generate a thumbnail directly from an STL or 3MF file. This uses the built-in 3D viewer and does not require any AI model, account, or internet connection.

SUPPORT
-------
Open Settings → About for project links and support information.
