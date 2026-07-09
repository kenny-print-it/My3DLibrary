@echo off
title My3DLibrary Portable
echo ============================================
echo   My3DLibrary Portable - Starting...
echo ============================================
echo.
REM Get the folder where this bat file lives
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
REM -------------------------------------------------------
REM  SINGLE-INSTANCE GUARD
REM  If the server is already running on port 3000, just
REM  open the browser and exit - no new windows.
REM -------------------------------------------------------
curl -s -o nul -w "%%{http_code}" http://localhost:3000/api/health 2>nul | findstr /r "^[23]" >nul 2>&1
if %ERRORLEVEL%==0 (
    echo My3DLibrary is already running - opening browser...
    start http://localhost:3000
    exit /b 0
)
REM Check that runtime\node.exe exists
if not exist "%ROOT%\runtime\node.exe" (
    echo.
    echo ERROR: runtime\node.exe not found.
    echo Make sure all files are extracted from the ZIP.
    echo.
    pause
    exit /b 1
)
REM Create data folder if it doesn't exist
if not exist "%ROOT%\data" mkdir "%ROOT%\data"
REM Create placeholder library folder (hint for users - NOT auto-configured)
if not exist "%ROOT%\library" mkdir "%ROOT%\library"
REM Generate a JWT secret on first run
if not exist "%ROOT%\data\.jwt_secret" (
    powershell -Command "[System.Guid]::NewGuid().ToString('N') + [System.Guid]::NewGuid().ToString('N')" > "%ROOT%\data\.jwt_secret"
)
set /p JWT_SECRET=<"%ROOT%\data\.jwt_secret"
REM Start Ollama if it exists (minimized)
if exist "%ROOT%\ollama\ollama.exe" (
    echo Starting AI engine...
    if not exist "%ROOT%\ollama\models" mkdir "%ROOT%\ollama\models"
    set "OLLAMA_MODELS=%ROOT%\ollama\models"
    start /min "Ollama" "%ROOT%\ollama\ollama.exe" serve
    timeout /t 3 /nobreak >nul
    echo AI engine started.
) else (
    echo AI engine not found - AI tagging disabled.
)
REM Set environment variables
REM NOTE: LIBRARY_PATH is intentionally NOT set here.
REM       Users configure their library folder via the Settings page on first run.
set "NODE_ENV=production"
set "PORT=3000"
set "DB_PATH=%ROOT%\data\library.db"
set "OLLAMA_HOST=http://localhost:11434"
set "PORTABLE_ROOT=%ROOT%"
set "NODE_PATH=%ROOT%\node_modules"
REM Start the server - log output to data\server.log for debugging
echo Starting server...
if not exist "%ROOT%\data" mkdir "%ROOT%\data"
start "My3DLibrary Server" cmd /c ""%ROOT%\runtime\node.exe" "%ROOT%\dist\index.js" > "%ROOT%\data\server.log" 2>&1"
REM Wait for the server to respond - use curl (built into Windows 10/11) for fast polling
echo Waiting for server to be ready...
set TRIES=0
:WAIT_LOOP
timeout /t 1 /nobreak >nul
set /a TRIES=%TRIES%+1
curl -s -o nul -w "%%{http_code}" http://localhost:3000/api/health 2>nul | findstr /r "^[23]" >nul 2>&1
if %ERRORLEVEL%==0 goto SERVER_READY
if %TRIES% LSS 45 goto WAIT_LOOP
echo Server did not respond in 45 seconds - opening browser anyway...
goto OPEN_BROWSER
:SERVER_READY
echo Server is ready!
:OPEN_BROWSER
echo.
echo ============================================
echo   My3DLibrary is running!
echo   Open: http://localhost:3000
echo ============================================
echo.
start http://localhost:3000
echo.
echo This window must stay open while using My3DLibrary.
echo Press any key to STOP My3DLibrary and close.
echo.
pause >nul
echo.
echo Stopping My3DLibrary...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im ollama.exe >nul 2>&1
echo Done. Goodbye!
timeout /t 2 /nobreak >nul
