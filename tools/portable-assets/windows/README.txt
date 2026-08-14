My3DLibrary v1.2 Beta (Build 10) — Windows Portable
====================================================

GETTING STARTED
---------------
1. Extract the entire ZIP file to a normal folder. Do not run the app from inside the ZIP.
2. Double-click My3DLibrary.exe.
3. Your browser opens to the local My3DLibrary app.
4. In Settings, add the folder or drive that contains your 3D-model folders.

AI AUTO-TAGGING (OPTIONAL)
---------------------------
My3DLibrary works without AI. AI can suggest tags from model names, filenames, and existing render images.

The recommended free option is local Ollama. It runs on your computer, keeps your images private, works offline after setup, and supports both text tags and image analysis.

1. Open the My3DLibrary-Portable folder.
2. Run Download-AI-Model.bat.
3. Choose CPU mode for the widest compatibility, or GPU mode if you have a compatible NVIDIA GPU.
4. Restart My3DLibrary.exe and use Settings → AI Status → Check Again.

The included setup selects two models:
- Text model: llama3.2 (or llama3.2:3b in CPU mode)
- Vision model: gemma3:4b in GPU mode, or moondream in CPU mode

GROQ NOTE
---------
Groq is no longer recommended for the complete AI workflow. The Groq models previously suggested by My3DLibrary are being retired. Groq's replacement model is text-only, so it can suggest tags from names and filenames but cannot analyse render images or choose a hero image.

If you use Groq anyway, configure it only for text tagging. For free text-and-image AI, use the included Ollama setup.

THUMBNAILS
----------
Models without images can generate a thumbnail directly from an STL or 3MF file. This uses the built-in 3D viewer and does not require any AI model, account, or internet connection.

SUPPORT
-------
Open Settings → About for project links and support information.
