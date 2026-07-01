@echo off
title My3DLibrary Portable
setlocal enabledelayedexpansion

echo ============================================
echo   My3DLibrary Portable - Starting...
echo ============================================
echo.

REM ── Locate this script's directory so it works from any drive ──────────────
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

REM ── Set data directory (database + settings live here) ─────────────────────
set "DATA_DIR=%ROOT%\data"
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"

REM ── Set library directory (your 3D model files) ────────────────────────────
set "LIBRARY_DIR=%ROOT%\library"
if not exist "%LIBRARY_DIR%" mkdir "%LIBRARY_DIR%"

REM ── Generate a random JWT secret on first run ──────────────────────────────
set "SECRET_FILE=%DATA_DIR%\.jwt_secret"
if not exist "%SECRET_FILE%" (
    powershell -Command "[System.Guid]::NewGuid().ToString('N') + [System.Guid]::NewGuid().ToString('N')" > "%SECRET_FILE%"
)
set /p JWT_SECRET=<"%SECRET_FILE%"

REM ── Start Ollama (AI engine) if present ────────────────────────────────────
set "OLLAMA_EXE=%ROOT%\ollama\ollama.exe"
if exist "%OLLAMA_EXE%" (
    echo Starting AI engine (Ollama)...
    set "OLLAMA_MODELS=%DATA_DIR%\ollama-models"
    if not exist "!OLLAMA_MODELS!" mkdir "!OLLAMA_MODELS!"
    start /min "Ollama" "%OLLAMA_EXE%" serve
    timeout /t 3 /nobreak >nul
    echo AI engine started.
) else (
    echo [INFO] Ollama not found at %OLLAMA_EXE%
    echo [INFO] AI tagging will be unavailable. See README for setup instructions.
)

REM ── Start the app server ───────────────────────────────────────────────────
echo Starting My3DLibrary server...
set "SERVER_EXE=%ROOT%\my3dlibrary-server.exe"
if not exist "%SERVER_EXE%" (
    echo ERROR: my3dlibrary-server.exe not found.
    echo Please ensure all files are extracted from the ZIP.
    pause
    exit /b 1
)

REM Set environment variables for the server
set "NODE_ENV=production"
set "PORT=3000"
set "DB_PATH=%DATA_DIR%\library.db"
set "LIBRARY_PATH=%LIBRARY_DIR%"
set "OLLAMA_HOST=http://localhost:11434"
set "PORTABLE_ROOT=%ROOT%"

REM Start the server in a minimised window (it stays running in background)
start /min "My3DLibrary Server" "%SERVER_EXE%"

REM ── Wait for server to be ready (up to 30 seconds) ─────────────────────────
echo Waiting for server to start...
set /a TRIES=0
:WAIT_LOOP
timeout /t 2 /nobreak >nul
set /a TRIES+=1
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000/api/health' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto SERVER_READY
if %TRIES% lss 15 goto WAIT_LOOP
echo.
echo [WARN] Server did not respond in 30 seconds. Opening browser anyway...
goto OPEN_BROWSER

:SERVER_READY
echo Server is ready!

:OPEN_BROWSER
echo.
echo ============================================
echo   My3DLibrary is running!
echo   http://localhost:3000
echo ============================================
echo.
echo Opening browser...
start http://localhost:3000
echo.
echo This window can be minimised. Close it to stop My3DLibrary.
echo.
pause
echo.
echo Stopping My3DLibrary...
taskkill /f /im my3dlibrary-server.exe >nul 2>&1
taskkill /f /im ollama.exe >nul 2>&1
echo Done. Goodbye!
