@echo off
REM Twitch-to-CV Bot Startup Script for Windows

echo 🚀 Starting Twitch-to-CV Bot...
echo ================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ from https://nodejs.org
    pause
    exit /b 1
)

REM Check if npm is available  
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not available. Please ensure npm is installed with Node.js
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️ .env file not found. Creating from template...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo ✅ Created .env file from template
        echo 📝 Please edit .env with your Twitch credentials before continuing
        echo    Required: TWITCH_USERNAME, TWITCH_OAUTH_TOKEN, TWITCH_CHANNEL, ADMIN_USERNAME
        echo.
        pause
    ) else (
        echo ❌ .env.example template not found
        pause
        exit /b 1
    )
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    
    echo ✅ Dependencies installed successfully
)

REM Run configuration test
echo 🧪 Testing configuration...
npm test

if %errorlevel% neq 0 (
    echo ❌ Configuration test failed. Please check your .env file and dependencies
    pause
    exit /b 1
)

echo ✅ Configuration test passed
echo.

REM Start the bot
echo 🎛️ Starting Twitch-to-CV Bot...
echo    Press Ctrl+C to stop the bot
echo.

npm start
pause