#!/bin/bash

# Twitch-to-CV Bot Startup Script

echo "🚀 Starting Twitch-to-CV Bot..."
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ from https://nodejs.org"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ required. Current version: $(node -v)"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not available. Please ensure npm is installed with Node.js"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️ .env file not found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env file from template"
        echo "📝 Please edit .env with your Twitch credentials before continuing"
        echo "   Required: TWITCH_USERNAME, TWITCH_OAUTH_TOKEN, TWITCH_CHANNEL, ADMIN_USERNAME"
        echo ""
        read -p "Press Enter after configuring .env file..."
    else
        echo "❌ .env.example template not found"
        exit 1
    fi
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    
    echo "✅ Dependencies installed successfully"
fi

# Run configuration test
echo "🧪 Testing configuration..."
npm test

if [ $? -ne 0 ]; then
    echo "❌ Configuration test failed. Please check your .env file and dependencies"
    exit 1
fi

echo "✅ Configuration test passed"
echo ""

# Start the bot
echo "🎛️ Starting Twitch-to-CV Bot..."
echo "   Press Ctrl+C to stop the bot"
echo ""

npm start