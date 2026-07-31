@echo off
:: My3DLibrary v1.2 Beta — Stop Script
title My3DLibrary Portable - Stopping
echo Stopping My3DLibrary...
taskkill /f /im my3dlibrary-server.exe >nul 2>&1
taskkill /f /im ollama.exe >nul 2>&1
echo Done.
timeout /t 2 /nobreak >nul
