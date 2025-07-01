# Max/MSP Integration Files
## Twitch-to-CV Bot Testing Interface

This directory contains all files necessary for implementing the Max/MSP testing interface for the Twitch-to-CV bot system.

## File Structure

```
max-msp-integration/
├── README.md                          # This file
├── patches/
│   ├── twitch-cv-tester.maxpat       # Main testing interface patch
│   ├── cv-validator.maxpat            # Parameter validation subpatch
│   ├── es-hardware-interface.maxpat   # Expert Sleepers communication
│   └── osc-websocket-bridge.maxpat    # Network communication handler
├── externals/
│   ├── es_cv_output~.mxo             # Expert Sleepers CV output external
│   ├── websocket.mxo                 # WebSocket communication external
│   └── json-parser.mxo               # JSON parsing external
├── presets/
│   ├── es8-default.json              # ES-8 default configuration
│   ├── esx8cv-default.json           # ESX-8CV default configuration
│   └── routing-templates.json        # Common routing configurations
├── test-data/
│   ├── parameter-sweep.json          # Full parameter range test
│   ├── multi-channel-test.json       # All 56 channels test
│   └── timing-test.json              # Latency measurement test
└── documentation/
    ├── setup-guide.md                # Step-by-step setup instructions
    ├── calibration-procedures.md     # Hardware calibration guide
    └── troubleshooting.md            # Common issues and solutions
```

## Quick Start

1. **Install Requirements:**
   - Max/MSP 8.0 or later
   - Expert Sleepers device drivers
   - Required externals (see externals/ directory)

2. **Hardware Setup:**
   - Connect Expert Sleepers device to computer
   - Connect CV outputs to video synthesis equipment
   - Configure audio interface settings

3. **Software Configuration:**
   - Open `patches/twitch-cv-tester.maxpat`
   - Configure network settings (OSC port: 7400)
   - Select Expert Sleepers device
   - Run calibration procedure

4. **Integration Test:**
   - Start Twitch-to-CV bot system
   - Press "Start Test" in Max patch
   - Verify parameter reception and CV output

## System Requirements

### Minimum Requirements:
- **Max/MSP**: Version 8.0 or later
- **Operating System**: macOS 10.14+ or Windows 10+
- **RAM**: 8GB minimum, 16GB recommended
- **CPU**: Intel i5 / AMD Ryzen 5 or better
- **Audio Interface**: Expert Sleepers ES-3/ES-6/ES-8/ESX-8CV

### Recommended Setup:
- **Max/MSP**: Latest version (8.5+)
- **Operating System**: macOS 12+ or Windows 11
- **RAM**: 32GB for complex video synthesis rigs
- **CPU**: Intel i7 / AMD Ryzen 7 or better
- **Network**: Gigabit Ethernet for multi-instance setups

## Network Configuration

### OSC Settings:
- **Default Port**: 7400
- **Protocol**: UDP
- **Address Format**: `/cv/[module]/[instance]/[parameter]`
- **Value Range**: 0-127 (integer)

### WebSocket Settings:
- **Default Port**: 3001 (configurable)
- **Protocol**: WebSocket (ws://)
- **Message Format**: JSON
- **Reconnection**: Automatic with exponential backoff

## Hardware Support

### Expert Sleepers Devices:

#### ES-8 (8 CV Outputs):
- **Connection**: USB/Thunderbolt
- **Sample Rate**: 96kHz recommended
- **CV Range**: 0-10V
- **Channels**: 8 CV outputs

#### ESX-8CV (8 CV Outputs per unit):
- **Connection**: ADAT optical
- **Maximum Units**: 6 (48 total CV outputs)
- **CV Range**: ±5V bipolar or 0-5V unipolar
- **Channels**: Up to 48 CV outputs

#### ES-3 (8 CV Outputs via audio):
- **Connection**: Standard audio interface
- **Sample Rate**: 44.1kHz or 48kHz
- **CV Range**: Depends on audio interface output level
- **Channels**: 8 CV outputs

### Video Synthesis Equipment:

#### LZX Industries Modules:
- **Expedition Orion Series**: Full support for all parameters
- **Gen3 Modules**: Complete parameter mapping
- **Legacy Modules**: Basic support where applicable

#### Parameter Format:
```
Module Instance: modulename#N (e.g., visualcortex#1)
Parameter: module-specific (e.g., keyer, threshold, x, y)
Value Range: 0-127 (mapped to CV voltage range)
```

## Testing Procedures

### Basic Functionality Test:
1. **Connection Verification**: Check all status indicators
2. **Parameter Reception**: Send test commands from bot
3. **CV Output Validation**: Measure voltages with multimeter
4. **Timing Test**: Verify <10ms latency requirement

### Comprehensive Test Suite:
1. **Range Test**: Validate 0-127 parameter range
2. **Multi-channel Test**: All 56 channels simultaneously
3. **Stress Test**: High-frequency parameter updates
4. **Recovery Test**: Network interruption handling

### Calibration Procedure:
1. **Zero Calibration**: Set all outputs to 0V
2. **Full Scale Calibration**: Set all outputs to maximum
3. **Linearity Test**: Verify linear voltage response
4. **Crosstalk Test**: Check channel isolation

## Integration with Twitch-to-CV Bot

### Bot Configuration:
The bot system must be configured to send OSC messages to the Max/MSP interface:

```javascript
// In bot config.js
maxConfig: {
    oscHost: '127.0.0.1',    // Max/MSP computer IP
    oscPort: 7400,           // OSC receive port
    websocketPort: 3001      // WebSocket fallback port
}
```

### Parameter Routing:
The bot's routing table maps LZX parameters to Expert Sleepers outputs:

```json
{
  "es9out#1": "visualcortex#1.keyer",
  "es9out#2": "doorway#1.threshold",
  "esx8cv#1.out#1": "navigator#1.x",
  "esx8cv#1.out#2": "navigator#1.y"
}
```

### Real-time Coordination:
- **Redis PubSub**: Multi-instance coordination
- **WebSocket**: Real-time status updates
- **OSC**: Primary parameter transmission
- **Error Handling**: Graceful degradation on network issues

## Performance Optimization

### Max/MSP Patch Optimization:
- **Efficient Routing**: Use `[route]` objects for parameter distribution
- **GUI Updates**: Throttle visual updates to 30fps
- **Memory Management**: Clear unused buffers regularly
- **CPU Usage**: Monitor with Max's performance tools

### Network Optimization:
- **Message Batching**: Group multiple parameters when possible
- **Compression**: Use compact message formats
- **Error Recovery**: Implement robust reconnection logic
- **Latency Monitoring**: Continuous round-trip time measurement

## Troubleshooting

### Common Issues:

#### No OSC Messages Received:
- Verify IP address and port settings
- Check firewall configuration
- Test with OSC monitoring tools
- Confirm bot system OSC output

#### Expert Sleepers Device Issues:
- Check USB/audio interface connection
- Verify device drivers installation
- Test with Expert Sleepers utilities
- Try different sample rates

#### Incorrect CV Voltages:
- Run calibration procedure
- Check voltage scaling settings
- Verify parameter value mapping
- Measure with accurate multimeter

#### High Latency:
- Reduce audio buffer sizes
- Increase Max scheduler priority
- Check network latency
- Optimize patch efficiency

### Debug Tools:
- **OSC Monitor**: View incoming OSC messages
- **Performance Monitor**: Check CPU and memory usage
- **Network Analyzer**: Monitor WebSocket connections
- **Voltage Meter**: Measure CV output accuracy

## Support and Documentation

### Additional Resources:
- **Setup Guide**: `documentation/setup-guide.md`
- **Calibration Procedures**: `documentation/calibration-procedures.md`
- **Troubleshooting**: `documentation/troubleshooting.md`
- **API Reference**: Main design document

### Community Support:
- Max/MSP forums for general Max questions
- Expert Sleepers support for hardware issues
- LZX Industries documentation for module parameters
- Project GitHub repository for integration issues

---

**Last Updated**: July 1, 2025  
**Version**: 1.0  
**Compatibility**: Max/MSP 8.0+, Expert Sleepers ES-3/ES-6/ES-8/ESX-8CV