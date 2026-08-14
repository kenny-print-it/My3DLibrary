My3DLibrary v1.2 Beta (Build 18) — macOS Portable
==================================================

GETTING STARTED
---------------
1. Extract the ZIP file completely.
2. Move My3DLibrary.app to Applications or another normal folder.
3. On first launch, Control-click My3DLibrary.app and choose Open if macOS displays a security warning.
4. Your browser opens to the local My3DLibrary app. Add your model folder in Settings.

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

GROQ NOTE
---------
Groq is no longer recommended for the full text-and-image AI workflow. The Groq models previously suggested by My3DLibrary are being retired, and Groq's replacement model is text-only. It can suggest tags from names and filenames but cannot inspect render images or select a hero image.

The built-in STL/3MF thumbnail generator does not require AI. It takes a canvas screenshot from the 3D viewer and works offline.

STOPPING THE APP
----------------
Quit My3DLibrary from the menu bar or close the terminal process if one remains open.
