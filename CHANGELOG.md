# Changelog

All notable changes to the Twitch-to-CV Bot will be documented in this file.

## [1.0.0] - 2025-06-30

### Added
- **Initial release** of Twitch-to-CV Bot
- **Real-time Twitch chat parsing** for CV control commands
- **Complete LZX module support** with 87+ CV variables
- **Expert Sleepers integration** supporting 56 CV outputs (ES-9 + 6x ESX-8CV)
- **Admin routing system** for hardware output assignment
- **WebSocket overlay server** for real-time visual feedback
- **OSC communication** to Max/MSP with structured dot notation
- **Sequential inputJack validation** for fallback inputs
- **Persistent routing table** storage and management
- **Comprehensive validation** for commands and hardware outputs
- **Debug logging** and error handling
- **Environment-based configuration** system

### Features
- **User CV Commands**: `moduleName#instance.parameter: value` format
- **Admin Commands**: Routing management, overlay control
- **Dot Notation Support**: Full structured parsing and validation
- **Fallback Inputs**: Sequential inputJack system for modules without CV
- **Multi-format OSC**: Both simple and structured message formats
- **Auto-reconnection**: Robust WebSocket and Twitch connectivity
- **Hot Reloading**: Development mode with auto-restart

### Technical Specifications
- **Node.js 16+** requirement
- **Dependencies**: tmi.js, ws, node-osc, express, cors, dotenv
- **LZX Standard**: 0-1V CV output range
- **Value Range**: 0-127 input scaled to 0-1V
- **System Capacity**: 56 CV outputs total
- **Port Configuration**: Configurable OSC and WebSocket ports

### Documentation
- **Complete README** with setup and usage instructions
- **Installation guide** with troubleshooting
- **Configuration examples** for all environment variables
- **API documentation** for OSC message formats
- **Security guidelines** for safe deployment

### Files Included
- `bot.js` - Main application
- `config.js` - Configuration and validation system
- `package.json` - Dependencies and scripts
- `lzx_variables.json` - LZX module CV specifications
- `expert_sleepers_outputs.json` - Hardware output definitions
- `.env.example` - Environment configuration template
- `test.js` - Configuration validation and testing
- `README.md` - Complete documentation
- `INSTALL.md` - Step-by-step installation guide

### Known Limitations
- **Max/MSP integration** requires separate patch development
- **Overlay display** requires separate web interface
- **Hardware setup** requires Expert Sleepers interfaces and Silent Way
- **Admin permissions** limited to single user configuration

## [Unreleased]

### Planned Features
- **Multi-admin support** for larger installations
- **Command rate limiting** to prevent spam
- **Advanced routing patterns** with wildcards
- **Built-in overlay interface** with web UI
- **Max/MSP patch templates** for common setups
- **REST API** for external control systems
- **Database storage** for routing and user management
- **WebSocket authentication** for secure overlay connections