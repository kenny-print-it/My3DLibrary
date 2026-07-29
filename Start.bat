@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM  My3DLibrary Portable - Start.bat
REM  Re-launches itself silently via wscript.exe so no terminal windows appear.
REM ─────────────────────────────────────────────────────────────────────────────

REM If called with /SILENT we are already in the hidden process - do real work.
if "%~1"=="/SILENT" goto :REAL_START

REM ── Re-launch silently via VBScript ─────────────────────────────────────────
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

if exist "%ROOT%\Start.vbs" (
    wscript.exe //nologo "%ROOT%\Start.vbs"
    exit /b 0
)

REM Fallback: write a tiny inline VBS to temp
set "TMP_VBS=%TEMP%\my3dlib_launch_%RANDOM%.vbs"
(
    echo Set oShell = CreateObject^("WScript.Shell"^)
    echo oShell.Run """" ^& WScript.Arguments^(0^) ^& """ /SILENT", 0, False
) > "%TMP_VBS%"
wscript.exe //nologo "%TMP_VBS%" "%~f0"
del "%TMP_VBS%" >nul 2>&1
exit /b 0

:REAL_START
REM ─────────────────────────────────────────────────────────────────────────────
REM  Real startup (runs hidden - no terminal visible)
REM ─────────────────────────────────────────────────────────────────────────────
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

REM ── Single-instance guard ────────────────────────────────────────────────────
curl -s -o nul -w "%%{http_code}" http://localhost:3000/api/health 2>nul | findstr /r "^[23]" >nul 2>&1
if %ERRORLEVEL%==0 (
    start http://localhost:3000
    exit /b 0
)

REM ── Validate node.exe ────────────────────────────────────────────────────────
if not exist "%ROOT%\runtime\node.exe" (
    powershell -WindowStyle Hidden -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('ERROR: runtime\node.exe not found.`nMake sure all files are extracted from the ZIP.','My3DLibrary')"
    exit /b 1
)

REM ── Create required folders ──────────────────────────────────────────────────
if not exist "%ROOT%\data"    mkdir "%ROOT%\data"
if not exist "%ROOT%\library" mkdir "%ROOT%\library"

REM ── Generate JWT secret on first run ─────────────────────────────────────────
if not exist "%ROOT%\data\.jwt_secret" (
    powershell -WindowStyle Hidden -Command "[System.Guid]::NewGuid().ToString('N') + [System.Guid]::NewGuid().ToString('N') | Set-Content -Path '%ROOT%\data\.jwt_secret'"
)
set /p JWT_SECRET=<"%ROOT%\data\.jwt_secret"

REM ── Start Ollama if present (hidden) ─────────────────────────────────────────
if exist "%ROOT%\ollama\ollama.exe" (
    if not exist "%ROOT%\ollama\models" mkdir "%ROOT%\ollama\models"
    set "OLLAMA_MODELS=%ROOT%\ollama\models"
    powershell -WindowStyle Hidden -Command "Start-Process -FilePath '%ROOT%\ollama\ollama.exe' -ArgumentList 'serve' -WindowStyle Hidden"
    timeout /t 3 /nobreak >nul
)

REM ── Set environment variables ─────────────────────────────────────────────────
set "NODE_ENV=production"
set "PORT=3000"
set "DB_PATH=%ROOT%\data\library.db"
set "OLLAMA_HOST=http://localhost:11434"
set "PORTABLE_ROOT=%ROOT%"
set "NODE_PATH=%ROOT%\node_modules"

REM ── Start the server hidden via PowerShell ────────────────────────────────────
powershell -WindowStyle Hidden -Command "Start-Process -FilePath '%ROOT%\runtime\node.exe' -ArgumentList '%ROOT%\dist\index.js' -WindowStyle Hidden -RedirectStandardOutput '%ROOT%\data\server.log' -RedirectStandardError '%ROOT%\data\server-err.log'"

REM ── Wait for server to be ready (poll up to 45 s) ─────────────────────────────
set TRIES=0
:WAIT_LOOP
timeout /t 1 /nobreak >nul
set /a TRIES=%TRIES%+1
curl -s -o nul -w "%%{http_code}" http://localhost:3000/api/health 2>nul | findstr /r "^[23]" >nul 2>&1
if %ERRORLEVEL%==0 goto SERVER_READY
if %TRIES% LSS 45 goto WAIT_LOOP

:SERVER_READY
REM ── Open the browser ─────────────────────────────────────────────────────────
start http://localhost:3000

REM ── Show a balloon tip notification ──────────────────────────────────────────
powershell -WindowStyle Hidden -Command "Add-Type -AssemblyName System.Windows.Forms; $n = New-Object System.Windows.Forms.NotifyIcon; $n.Icon = [System.Drawing.SystemIcons]::Information; $n.Visible = $true; $n.ShowBalloonTip(5000,'My3DLibrary','Running at http://localhost:3000',[System.Windows.Forms.ToolTipIcon]::Info); Start-Sleep 6; $n.Dispose()"

exit /b 0
