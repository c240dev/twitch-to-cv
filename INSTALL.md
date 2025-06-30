# Twitch-to-CV Bot Installation Guide

## 📋 Prerequisites

- **Node.js** v16+ (download from https://nodejs.org)
- **npm** (comes with Node.js)
- **Twitch account** for the bot
- **Twitch OAuth token** (get from https://twitchapps.com/tmi/)

## 🚀 Quick Installation

### 1. Clone or Download
```bash
# If using git
git clone <repository-url>
cd twitch-to-cv-bot

# Or extract the downloaded folder and navigate to it
cd twitch-to-cv-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your preferred editor
```

### 4. Required Environment Variables

Edit `.env` file with your information:

```bash
# Twitch Bot Credentials
TWITCH_USERNAME=your_bot_username
TWITCH_OAUTH_TOKEN=oauth:your_oauth_token_here
TWITCH_CHANNEL=your_channel_name

# Admin User (who can modify routing)
ADMIN_USERNAME=your_admin_username

# Max/MSP Communication (optional changes)
MAX_OSC_HOST=127.0.0.1
MAX_OSC_PORT=7400
MAX_WEBSOCKET_PORT=8080

# Overlay WebSocket (optional changes)
OVERLAY_WEBSOCKET_PORT=3001

# Debug (optional)
DEBUG_MODE=true
LOG_LEVEL=info
```

### 5. Get Twitch OAuth Token

1. Go to https://twitchapps.com/tmi/
2. Connect with your bot's Twitch account
3. Copy the OAuth token (starts with `oauth:`)
4. Paste it into your `.env` file

### 6. Test Configuration
```bash
npm test
```

This will verify:
- Environment variables are set
- Variable files load correctly
- Routing system works
- All components are ready

### 7. Start the Bot
```bash
npm start
```

## 🔧 Troubleshooting

### Common Issues

**"Cannot find module" errors:**
```bash
npm install
```

**"TWITCH_USERNAME not set" error:**
- Check your `.env` file exists
- Verify all required variables are set
- Ensure no extra spaces around the `=` sign

**OAuth authentication fails:**
- Regenerate token at https://twitchapps.com/tmi/
- Ensure token starts with `oauth:`
- Check bot username matches the token account

**OSC connection issues:**
- Verify Max/MSP is running and listening on port 7400
- Check firewall settings
- Try changing MAX_OSC_PORT in `.env`

**WebSocket overlay connection fails:**
- Check port 3001 is available
- Try changing OVERLAY_WEBSOCKET_PORT in `.env`
- Verify no other applications are using the port

### Development Mode

For development with auto-restart:
```bash
npm run dev
```

### Debug Logging

Enable detailed logging:
```bash
DEBUG_MODE=true npm start
```

## 📊 System Verification

After starting, you should see:
```
✅ Connected to Twitch at irc-ws.chat.twitch.tv:443
🖼️ Overlay WebSocket server started on port 3001
🎛️ OSC client configured for Max/MSP at 127.0.0.1:7400
🚀 Twitch-to-CV Bot started successfully!
📺 Listening to channel: your_channel_name
👑 Admin user: your_admin_username
Loaded 87 LZX CV variables
Loaded 64 Expert Sleepers outputs
```

## 🎯 Next Steps

1. **Set up Max/MSP patch** to receive OSC messages
2. **Configure overlay system** for OBS integration
3. **Test with admin commands** to set up routing
4. **Verify CV output** reaches your hardware

## 📞 Support

If you encounter issues:

1. Check the console output for error messages
2. Verify your `.env` configuration
3. Run `npm test` to diagnose problems
4. Check that all prerequisite software is installed

## 🔒 Security Notes

- **Never commit your `.env` file** to version control
- **Keep your OAuth token private**
- **Only trusted users should have admin privileges**
- **Run the bot on a secure network**