# My3DLibrary Portable TODO

- [x] Audit Groq references and current AI setup in the Windows/Mac portable source
- [x] Replace retiring Groq text-model guidance with free local Ollama options and clear fallback behavior
- [x] Explain in-app and in release notes why Groq is no longer a viable default for complete text-and-image AI support
- [x] Update source-controlled Windows and Mac package assets with the revised free local AI instructions
- [x] Update the main GitHub README with current AI guidance and Build 10/Build 18 download links
- [x] Publish source and add Windows Build 10 and Mac Build 18 without removing Build 9 or Build 17
- [x] Build and package updated Windows and Mac test releases for approval before publishing
- [x] Port Collections, Tabs, Compact List, sorting, Recently Added collapse, pinned collections, covers, and saved preferences to the portable source
- [x] Update the portable database schema and additive local migration for persistent collection pinning
- [x] Update in-app and packaged release notes for the v1.3 portable beta version
- [x] Include the current README-PORTABLE.md in both platform ZIPs and correct its thumbnail description
- [x] Build and verify the v1.3 Windows and Mac beta ZIPs before publication
- [x] Publish the v1.3 beta source and new Windows/Mac Build 1 ZIPs while preserving prior v1.2 assets

## Online Vision AI Research
- [x] Evaluate free online vision-AI providers that can select the best existing model render in the Windows and Mac portable apps
- [x] Recommend a safe user-provided-key or limited shared-service configuration for an online image-selection option

## Gemini Online AI Option
- [x] Add a Google Gemini online preset for text and image selection using the user’s own API key
- [x] Add clear in-app confirmation that render images are sent to Google and free-tier availability is quota-limited
- [x] Update the GitHub README, portable readmes, and in-app changelog to recommend Gemini online and limit Groq to legacy text-only use
- [x] Build, verify, and publish refreshed Windows and Mac v1.3 beta packages without removing the original Build 1 assets
## Portable 3MF Preview Repair
- [x] Trace why 3MF model geometry can fail to render in the Windows portable app
- [x] Repair the portable 3MF preview path without affecting STL or multi-file viewing
- [x] Add regression coverage for valid 3MF geometry and clear unsupported-file feedback
- [x] Build and verify the Windows portable app locally without publishing or pushing

## Build 5 Windows Test Release
- [x] Update portable source and release notes for the Build 5 3MF-preview test build
- [x] Build and validate the Windows Build 5 test archive
- [ ] Commit and push the Build 5 source update
- [ ] Upload the Windows Build 5 test archive without removing prior release assets
