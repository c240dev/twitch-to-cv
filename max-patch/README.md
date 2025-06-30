# Twitch-to-CV Max/MSP Patches

Max/MSP patches for receiving OSC messages from the Twitch bot and routing CV signals to Expert Sleepers hardware.

## 🎛️ System Architecture

```
Twitch Bot (Node.js) → OSC → Max/MSP → Expert Sleepers Hardware → LZX Modules
```

## 📁 Patch Files

### Main Patches
- **`twitch-to-cv-main.maxpat`** - Main routing system patch
- **`osc_message_parser.maxpat`** - OSC message parsing and validation
- **`routing_table_manager.maxpat`** - Hardware output assignment management
- **`routing_command_handler.maxpat`** - Admin routing command processor
- **`cv_output_router.maxpat`** - CV signal routing to 56 hardware outputs
- **`hardware_mapping_init.maxpat`** - Expert Sleepers hardware initialization

## ⚙️ Setup Instructions

### 1. Hardware Requirements
- **Expert Sleepers ES-9** - USB audio interface (8 CV outputs: channels 1-8)
- **Expert Sleepers ESX-8CV** (x6) - CV expanders (48 CV outputs: channels 9-56)
- **Computer** - Running Max/MSP 9.0.7+ with audio interface drivers

### 2. Max/MSP Configuration

1. **Audio Setup**:
   - Open Max/MSP → Options → Audio Status
   - Select "USBStreamer" or "ES-9" as audio driver
   - Set sample rate to 44.1kHz or 48kHz
   - Enable 56 output channels

2. **Load Main Patch**:
   ```
   Open twitch-to-cv-main.maxpat
   ```

3. **Start Audio**:
   - Click the speaker icon in main patch
   - Verify all 56 CV outputs are enabled

### 3. OSC Communication Setup

- **Port**: 7400 (matches Twitch bot configuration)
- **Protocol**: UDP
- **CV Format**: `/cv route cvVoltage moduleName instanceIndex cvInput value`
- **Routing Format**: `/routing add/remove hardwareOutput lzxVariable`

### 4. Testing

1. **Start Twitch Bot** (see bot documentation)
2. **Load Max patch** and enable audio
3. **Send test OSC message**:
   ```
   /cv es9out#1 0.5 oscillator 0 frequency 440
   ```
4. **Monitor CV output** on ES-9 channel 1

## 🔧 Patch Details

### OSC Message Parser
- **Input**: Raw OSC messages from Twitch bot
- **Processing**: Validates format and extracts dot notation parameters
- **Output**: Structured routing data

**Message Format**:
```
/cv route cvVoltage moduleName instanceIndex cvInput value
```

**CV Example**:
```
/cv es9out#1 0.5 oscillator 0 frequency 440
```

**Routing Examples**:
```
/routing add es9out#1 doorway#1.threshold
/routing remove es9out#1
```

### Routing Table Manager
- **Function**: Maps LZX variables to hardware outputs
- **Storage**: Uses `dict` objects for persistent routing tables
- **Scaling**: Converts 0-127 input to 0-1V CV output
- **Admin**: Supports dynamic routing assignments

### Routing Command Handler
- **Function**: Processes admin routing commands from Twitch bot
- **Commands**: Add/remove hardware output assignments
- **Real-time**: Updates routing table immediately
- **Integration**: Syncs with bot routing table automatically

### CV Output Router
- **Outputs**: 56 CV channels to Expert Sleepers hardware
- **Smoothing**: 10ms `line~` objects prevent CV glitches
- **Range**: 0.0 to 1.0V (Expert Sleepers standard)
- **Routing**: Dynamic assignment based on routing table

### Hardware Mapping
- **ES-9**: Channels 1-8 (`es9out#1` through `es9out#8`)
- **ESX-8CV #1**: Channels 9-16 (`esx8cv#1.out#1` through `esx8cv#1.out#8`)
- **ESX-8CV #2**: Channels 17-24 (`esx8cv#2.out#1` through `esx8cv#2.out#8`)
- **ESX-8CV #3**: Channels 25-32 (`esx8cv#3.out#1` through `esx8cv#3.out#8`)
- **ESX-8CV #4**: Channels 33-40 (`esx8cv#4.out#1` through `esx8cv#4.out#8`)
- **ESX-8CV #5**: Channels 41-48 (`esx8cv#5.out#1` through `esx8cv#5.out#8`)
- **ESX-8CV #6**: Channels 49-56 (`esx8cv#6.out#1` through `esx8cv#6.out#8`)

## 🎯 Usage Examples

### Basic CV Control
```
User types in Twitch chat: "oscillator#1.frequency: 64"
→ Bot sends: /cv es9out#1 0.503937 oscillator 1 frequency 64
→ Max routes to ES-9 output 1 at ~0.5V
```

### Multiple Instance Control
```
User types: "filter#2.cutoff: 100"
→ Bot sends: /cv esx8cv#1.out#3 0.787402 filter 2 cutoff 100
→ Max routes to ESX-8CV #1 output 3 at ~0.79V
```

### Admin Routing Commands
```
Admin types: "es9out#5 to doorway#3.threshold"
→ Bot sends: /routing add es9out#5 doorway#3.threshold
→ Max updates routing table immediately
→ Future doorway#3.threshold commands route to ES-9 output 5
```

## 🔍 Debugging

### Debug Messages
Enable debug output by sending to these receive objects:
- `debug_parser` - OSC parsing debug
- `debug_routing` - Routing table debug  
- `debug_cv_output` - CV output debug

### Troubleshooting

**No OSC reception**:
- Check port 7400 is not blocked by firewall
- Verify Twitch bot is sending to correct IP/port
- Check Max console for UDP errors

**No CV output**:
- Verify audio is enabled in Max
- Check Expert Sleepers driver installation
- Monitor `dac~` object connections
- Verify hardware output assignments

**Wrong CV values**:
- Check voltage scaling (0-127 → 0-1V)
- Verify `line~` smoothing is working
- Monitor routing table assignments

## 📊 Performance Notes

- **Latency**: ~10ms CV smoothing prevents glitches
- **CPU Usage**: Optimized for real-time performance
- **Memory**: Routing tables stored in `dict` objects
- **Bandwidth**: UDP OSC messaging minimal overhead

## 🔗 Integration

This Max patch integrates with:
- **Twitch-to-CV Bot** (Node.js) - OSC message source
- **Expert Sleepers Hardware** - CV output interface
- **LZX Modules** - Final CV destinations
- **Reaper + Silent Way** (alternative routing method)

## 📝 Development Notes

- Built for Max/MSP 9.0.7+
- Uses standard Max objects (no externals required)
- Modular design for easy customization
- Comprehensive error handling and validation
- Real-time optimized for live performance

## 🆘 Support

For issues with Max patches:
1. Check Max console for error messages
2. Verify OSC message format and timing
3. Monitor routing table assignments
4. Test hardware outputs individually
5. Review debug message output