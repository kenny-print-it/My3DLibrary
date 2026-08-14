@echo off
setlocal enabledelayedexpansion
title My3DLibrary - Free Local AI Setup

echo ============================================
echo   My3DLibrary - Free Local AI Setup
echo ============================================
echo.
echo This script installs free local Ollama models for My3DLibrary.
echo They run on your computer and support both text tags and image analysis.
echo No API key or cloud account is required after downloading.
echo.
echo   1. Download and install Ollama if needed
echo   2. Ask whether to use GPU or CPU mode
echo   3. Download a text model for names and filenames
echo   4. Download a vision model for existing render images
echo.

set "ROOT=%~dp0"
if "!ROOT:~-1!"=="\" set "ROOT=!ROOT:~0,-1!"

set "OLLAMA_EXE="
set "PORTABLE_OLLAMA=!ROOT!\ollama\ollama.exe"
set "SYSTEM_OLLAMA=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"

if exist "!PORTABLE_OLLAMA!" (
    set "OLLAMA_EXE=!PORTABLE_OLLAMA!"
    echo Ollama found in portable folder.
) else if exist "!SYSTEM_OLLAMA!" (
    set "OLLAMA_EXE=!SYSTEM_OLLAMA!"
    echo Ollama found in system installation.
) else (
    where ollama >nul 2>&1
    if !ERRORLEVEL!==0 (
        for /f "delims=" %%i in ('where ollama') do set "OLLAMA_EXE=%%i"
        echo Ollama found in PATH.
    )
)

if "!OLLAMA_EXE!"=="" (
    echo Ollama not found. Downloading Ollama installer...
    if not exist "!ROOT!\ollama" mkdir "!ROOT!\ollama"
    curl.exe -L -o "!ROOT!\ollama\OllamaSetup.exe" "https://ollama.com/download/OllamaSetup.exe"
    if !ERRORLEVEL! NEQ 0 (
        echo ERROR: Download failed. Check your internet connection and try again.
        pause
        exit /b 1
    )
    echo Installing Ollama...
    "!ROOT!\ollama\OllamaSetup.exe" /S
    timeout /t 5 /nobreak >nul
    if exist "!SYSTEM_OLLAMA!" (
        set "OLLAMA_EXE=!SYSTEM_OLLAMA!"
        echo Ollama installed successfully.
    ) else (
        echo ERROR: Ollama installation may have failed. Install it from https://ollama.com/download/windows and run this script again.
        pause
        exit /b 1
    )
)

echo.
echo ============================================
echo   GPU or CPU Mode?
echo ============================================
echo.
echo   GPU mode  - Faster on compatible NVIDIA GPUs
echo               Downloads: llama3.2 (~2 GB) + gemma3:4b (~3.3 GB)
echo               Total: about 5.3 GB
echo.
echo   CPU mode  - Works on most Windows computers
echo               Downloads: llama3.2:3b (~2 GB) + moondream (~1.7 GB)
echo               Total: about 3.7 GB
echo.
echo   If GPU mode produces CUDA errors, use CPU mode instead.
echo.

set "WANT_CPU=1"
set /p "GPU_CHOICE=Enter GPU for GPU mode, or CPU for CPU mode (default: CPU): "

if /i "!GPU_CHOICE!"=="GPU" (
    set "WANT_CPU=0"
) else (
    set "WANT_CPU=1"
)

if "!WANT_CPU!"=="0" (
    set "TEXT_MODEL=llama3.2"
    set "VISION_MODEL=gemma3:4b"
    set "GPU_MODE_VALUE=gpu"
) else (
    set "TEXT_MODEL=llama3.2:3b"
    set "VISION_MODEL=moondream"
    set "GPU_MODE_VALUE=cpu"
)

echo.
echo Will download:
echo   Text model:   !TEXT_MODEL!
echo   Vision model: !VISION_MODEL!
echo.
echo Press any key to start downloading, or close this window to cancel.
pause >nul

if not exist "!ROOT!\ollama\models" mkdir "!ROOT!\ollama\models"
set "OLLAMA_MODELS=!ROOT!\ollama\models"

echo Stopping any running Ollama instance...
taskkill /f /im ollama.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Starting Ollama engine...
if "!GPU_MODE_VALUE!"=="cpu" (
    set "OLLAMA_GPU_LAYERS=0"
    set "OLLAMA_NUM_GPU=0"
)
start /min "Ollama-Setup" "!OLLAMA_EXE!" serve
timeout /t 4 /nobreak >nul

echo.
echo [1/2] Downloading text model: !TEXT_MODEL!
"!OLLAMA_EXE!" pull !TEXT_MODEL!
if !ERRORLEVEL! NEQ 0 (
    echo ERROR: Failed to download !TEXT_MODEL!.
    taskkill /f /im ollama.exe >nul 2>&1
    pause
    exit /b 1
)

echo.
echo [2/2] Downloading vision model: !VISION_MODEL!
"!OLLAMA_EXE!" pull !VISION_MODEL!
if !ERRORLEVEL! NEQ 0 (
    echo ERROR: Failed to download !VISION_MODEL!.
    taskkill /f /im ollama.exe >nul 2>&1
    pause
    exit /b 1
)

if not exist "!ROOT!\ollama" mkdir "!ROOT!\ollama"
echo !GPU_MODE_VALUE!> "!ROOT!\ollama\gpu-mode.txt"
(echo text=!TEXT_MODEL!
 echo vision=!VISION_MODEL!) > "!ROOT!\ollama\model-config.txt"

taskkill /f /im ollama.exe >nul 2>&1

echo.
echo ============================================
echo   SUCCESS! Free local AI is ready.
echo ============================================
echo   Text model:   !TEXT_MODEL!
echo   Vision model: !VISION_MODEL!
echo.
echo Restart My3DLibrary.exe, then use Settings ^> AI Status ^> Check Again.
echo You do not need to change any settings manually.
pause
