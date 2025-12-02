@echo off
echo Starting Truth Seeker backend server...
echo.

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Dependencies not found, installing dependencies...
    echo.
    call npm install
    echo.
    echo Dependencies installed successfully!
    echo.
)

REM Start backend server (in new window)
start "Truth Seeker Server" cmd /k "npm run server"

echo.
echo Backend server started!
echo Backend server: http://localhost:3000
echo.
echo Press any key to close this window (server will continue running)...
pause >nul

