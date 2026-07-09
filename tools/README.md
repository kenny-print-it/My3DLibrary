# Build & Packaging Tools

These scripts produce the distributable ZIP files for each platform.
They are intended to be run from the Linux/macOS sandbox after a full build.

## Prerequisites

1. Run `pnpm run build` in the project root to produce a fresh `dist/` folder.
2. Extract the previous release ZIP for each platform into the staging areas
   below (the scripts reuse the bundled runtimes and launcher executables
   from the previous release rather than rebuilding them from scratch).

### Windows staging area

Extract `My3DLibrary-Windows-vX.X-Beta.zip` into `/tmp/win-extras/` so that
the following paths exist:

```
/tmp/win-extras/My3DLibrary-Portable/runtime/node.exe
/tmp/win-extras/My3DLibrary-Portable/node_modules/   (server-side deps)
/tmp/win-extras/My3DLibrary-Portable/kenny-logo.ico
/tmp/win-extras/My3DLibrary-Portable/Stop.bat
/tmp/win-extras/My3DLibrary-Portable/Download-AI-Model.bat
/tmp/win-extras/My3DLibrary.exe                       (NSIS launcher)
```

### macOS staging area

Extract `My3DLibrary-Mac-vX.X-Beta.zip` into `/tmp/mac-extras/` so that
the following paths exist:

```
/tmp/mac-extras/My3DLibrary-Portable/runtime-x64/node
/tmp/mac-extras/My3DLibrary-Portable/runtime-arm64/node
/tmp/mac-extras/My3DLibrary-Portable/node_modules/
/tmp/mac-extras/My3DLibrary-Portable/My3DLibrary.app/
```

## Running the scripts

```bash
# From the repo root (after pnpm run build):
node tools/package-win.mjs   # → ~/My3DLibrary-Windows-vX.X-Beta.zip
node tools/package-mac.mjs   # → ~/My3DLibrary-Mac-vX.X-Beta.zip
```

Update the `OUT` constant near the top of each script to change the output
filename for a new version number.
