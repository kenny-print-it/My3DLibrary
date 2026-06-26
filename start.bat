@echo off
title PrintLib Local
echo ============================================
echo  PrintLib Local - Starting...
echo ============================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker Desktop is not running.
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

REM Check if .env exists
if not exist ".env" (
    echo ERROR: .env file not found.
    echo Please copy env-config-template.txt to .env and fill in your settings.
    echo.
    echo   copy env-config-template.txt .env
    echo   notepad .env
    pause
    exit /b 1
)

echo Starting PrintLib...
docker compose up -d

if errorlevel 1 (
    echo.
    echo ERROR: Failed to start PrintLib.
    echo Run "docker compose logs" to see what went wrong.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  PrintLib is running!
echo  Open your browser to: http://localhost:3000
echo ============================================
echo.
echo Press any key to open in browser...
pause >nul
start http://localhost:3000
