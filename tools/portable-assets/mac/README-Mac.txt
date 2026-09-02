My3DLibrary v1.3 Beta (Build 2) — macOS Portable
==================================================

GETTING STARTED
---------------
1. Extract the ZIP file completely.
2. Move My3DLibrary.app to Applications or another normal folder.
3. On first launch, Control-click My3DLibrary.app and choose Open if macOS displays a security warning.
4. Your browser opens to the local My3DLibrary app. Add your model folder in Settings.

LIBRARY BROWSING
----------------
Choose **Collections**, **Tabs**, or **Compact List** on the Library page. Tabs let you jump between collections without scrolling; Compact List provides sortable model name, collection, tags, and files columns. Owners can pin favorite collections first, and categories use a model’s existing hero image as a cover banner when available.

Recently Added can be hidden, and your library view, active tab, sorting, and visibility choices are remembered on that computer.

BUILD 3: WIDE-SCREEN BROWSING
-----------------------------
The My3DLibrary logo is beside the Library title and model count. The title, search, sort, selection, and filter controls stay visible while you browse. On ultra-wide monitors, the Library uses more of the available width to show additional model cards per row. Phone layouts remain compact.

FREE LOCAL AI (OPTIONAL)
------------------------
My3DLibrary works without AI. For free text tags and image analysis, install Ollama and run the models locally on your Mac:

  ollama pull llama3.2
  ollama pull gemma3:4b

Then open Settings → AI / LLM Configuration and use:

  API URL:      http://localhost:11434
  API Key:      leave blank
  Text Model:   llama3.2
  Vision Model: gemma3:4b

For a smaller vision model on older Macs, use moondream as the Vision Model instead.

GEMINI ONLINE AI
----------------
If you prefer not to download local models, use **Google Gemini** from My3DLibrary's AI Setup Guide. Create your own key at https://aistudio.google.com/apikey, choose **Google Gemini (online, free tier)**, confirm the privacy notice, then paste your key and save the settings.

Gemini supports both text tags and render-image selection. It uses your own Google free-tier quota, which is limited and may change. Selected render thumbnails are sent to Google for AI analysis. Use Ollama instead if you want images to remain on your Mac.

GROQ NOTE
---------
Groq is no longer recommended for the full text-and-image AI workflow. The Groq models previously suggested by My3DLibrary are being retired, and Groq's replacement model is text-only. It can suggest tags from names and filenames but cannot inspect render images or select a hero image.

For online text-and-image AI, use Gemini. For private offline AI, use Ollama.

The built-in STL/3MF thumbnail generator does not require AI. It takes a canvas screenshot from the 3D viewer and works offline.

STOPPING THE APP
----------------
Quit My3DLibrary from the menu bar or close the terminal process if one remains open.
