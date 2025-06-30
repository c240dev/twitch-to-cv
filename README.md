# Twitch-to-CV Bot

Real-time Twitch chat to CV control system for LZX video synthesis modules via Expert Sleepers interfaces.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Twitch credentials and settings
   ```

3. **Start the bot:**
   ```bash
   npm start
   ```

## ⚙️ Configuration

### Required Environment Variables

```bash
# Twitch Bot Configuration
TWITCH_USERNAME=your_bot_username          # Your bot's Twitch username
TWITCH_OAUTH_TOKEN=oauth:your_token_here   # Get from https://twitchapps.com/tmi/
TWITCH_CHANNEL=your_channel_name           # Channel to monitor (without #)

# Admin User
ADMIN_USERNAME=your_admin_username         # Username with routing permissions

# Max/MSP Communication
MAX_OSC_HOST=127.0.0.1                    # Max/MSP OSC host
MAX_OSC_PORT=7400                         # Max/MSP OSC port
MAX_WEBSOCKET_PORT=8080                   # Alternative WebSocket port

# Overlay System
OVERLAY_WEBSOCKET_PORT=3001               # WebSocket port for overlay updates

# Optional
DEBUG_MODE=true                           # Enable debug logging
LOG_LEVEL=info                           # Logging level
```

## 🎛️ Usage

### User CV Commands

Format: `moduleName#instanceNumber.parameter: value`

**Examples:**
```
doorway#1.threshold: 89
visualcortex#2.keyer: 127
dwo3#1.freqExpA: 64
prismaticray#1.frequency: 100
```

**Fallback inputs:**
```
angles#1.inputJack#1: 50
matte#2.inputJack#3: 75
```

**Value range:** 0-127 (automatically scaled to 0-1V)

### Admin Commands

Only the configured admin user can use these commands:

**Overlay Control:**
```
overlay on          # Enable overlay display
overlay off         # Disable overlay display
```

**Routing Management:**
```
es9out#1 → doorway#1.threshold              # Route ES-9 output 1 to doorway threshold
esx8cv#2.out#5 → topogram#1.gain            # Route ESX-8CV unit 2, output 5 to topogram gain
remove es9out#1                             # Remove routing for ES-9 output 1
routes                                      # List all current routes
```

**Available Hardware Outputs:**
- ES-9: `es9out#1` through `es9out#8` (8 channels)
- ESX-8CV: `esx8cv#1.out#1` through `esx8cv#6.out#8` (48 channels)
- ES-5 Gates: `es5gate#1` through `es5gate#8` (8 channels, optional)

**Total:** 56 CV outputs available

## 🏗️ System Architecture

```
Twitch Chat → Node.js Bot → Max/MSP → Reaper + Silent Way → Expert Sleepers → LZX Modules
                    ↓
               Overlay WebSocket → OBS Browser Source
```

### Communication Flows

1. **Twitch Chat Input:** Bot parses CV commands and validates syntax
2. **Admin Routing:** Maps hardware outputs to LZX module variables
3. **Max/MSP Output:** Sends CV values via OSC to Max patch
4. **Overlay Updates:** Real-time WebSocket updates for visual feedback
5. **CV Generation:** Max → Reaper → Silent Way → ES-9/ESX-8CV → LZX modules

## 🖼️ Overlay Integration

The bot runs a WebSocket server on port 3001 (configurable) that streams real-time data to the overlay system:

**Overlay Data:**
- Active CV variables and their current values
- Most recent chat command with username
- System latency measurements
- Routing status updates

**WebSocket Messages:**
```javascript
{
  "type": "cv_update",
  "variable": "doorway#1.threshold",
  "value": 89,
  "route": "es9out#3",
  "cvVoltage": 0.701,
  "lastCommand": {
    "username": "user123",
    "variable": "doorway#1.threshold",
    "value": 89,
    "timestamp": 1672531200000
  },
  "latency": 23
}
```

## 🔧 Technical Details

### Input Validation

- **CV Variables:** Validates against loaded LZX module specifications
- **Value Range:** 0-127 (scaled to 0-1V for LZX compatibility)
- **Sequential inputJack:** Fallback inputs must be called in order (1, 2, 3...)
- **Routing Validation:** Ensures hardware outputs exist before assignment

### File Dependencies

- `complete_cv_variables.txt` - LZX module CV specifications
- `expert_sleepers_routing_variables.txt` - Hardware output definitions
- `routing_table.json` - Persistent admin routing assignments (auto-created)

### Error Handling

- Invalid commands are silently ignored (no chat spam)
- Admin errors are logged to console
- WebSocket connections auto-reconnect
- Graceful shutdown on SIGINT/SIGTERM

## 🧪 Development

**Development mode with auto-restart:**
```bash
npm run dev
```

**Debug logging:**
```bash
DEBUG_MODE=true npm start
```

**Test configuration:**
```bash
npm test
```

## 🔌 Max/MSP Integration

The bot sends enhanced OSC messages to Max/MSP with full dot notation structure:

### Primary OSC Format:
```
/cv [route] [voltage] [module] [instance] [parameter] [originalValue]
```

**Example OSC message:**
```
/cv "es9out#3" 0.701 "doorway" 1 "threshold" 89
```

### Structured OSC Format (Alternative):
```
/cv/structured {route, voltage, module, instance, parameter, value, fullVariable, isInputJack, timestamp}
```

**Example structured message:**
```json
{
  "route": "es9out#3",
  "voltage": 0.701,
  "module": "doorway", 
  "instance": 1,
  "parameter": "threshold",
  "value": 89,
  "fullVariable": "doorway#1.threshold",
  "isInputJack": false,
  "timestamp": 1672531200000
}
```

Your Max patch can choose either format and has access to the complete dot notation breakdown for advanced routing and processing.

## 📁 Project Structure

```
twitch-to-cv/
├── bot.js                              # Main bot application
├── config.js                          # Configuration and validation
├── package.json                       # Dependencies and scripts
├── .env.example                       # Environment template
├── README.md                          # This file
├── complete_cv_variables.txt           # LZX module specifications
├── expert_sleepers_routing_variables.txt # Hardware output definitions
└── routing_table.json                 # Persistent routing (auto-created)
```

## 🚨 Security Notes

- Keep your `.env` file private (contains OAuth token)
- Only the configured admin can modify routing
- Invalid commands are ignored to prevent chat spam
- WebSocket connections are local-only by default

## 📞 Support

For issues or questions about the Twitch-to-CV system, check:
1. Console logs for detailed error messages
2. Routing table assignments (`routes` admin command)
3. WebSocket connectivity for overlay updates
4. Max/MSP OSC reception on port 7400
