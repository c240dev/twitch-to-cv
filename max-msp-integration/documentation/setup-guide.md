# Max/MSP Testing Interface Setup Guide
## Complete Installation and Configuration

### Table of Contents
1. [Prerequisites](#prerequisites)
2. [Software Installation](#software-installation)
3. [Hardware Setup](#hardware-setup)
4. [Network Configuration](#network-configuration)
5. [Max/MSP Patch Installation](#maxmsp-patch-installation)
6. [Integration Testing](#integration-testing)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

#### Minimum Configuration:
- **Computer**: Mac (Intel/Apple Silicon) or Windows 10+ PC
- **RAM**: 8GB minimum (16GB recommended)
- **CPU**: Intel i5 / AMD Ryzen 5 or equivalent
- **Storage**: 5GB free space for Max/MSP and patches
- **Network**: Ethernet connection recommended for stability

#### Professional Configuration:
- **Computer**: Mac Studio / MacBook Pro 16" or high-end Windows workstation
- **RAM**: 32GB for complex video synthesis setups
- **CPU**: Intel i7 / AMD Ryzen 7 or Apple M1 Pro/Max
- **Storage**: SSD with 20GB+ free space
- **Network**: Gigabit Ethernet with managed switch

### Hardware Requirements

#### Expert Sleepers Device (Choose One):
- **ES-8**: 8 CV outputs via USB/Thunderbolt
- **ESX-8CV**: 8 CV outputs via ADAT (up to 6 units)
- **ES-3**: 8 CV outputs via audio interface
- **ES-6**: 6 CV + 2 gate outputs via USB

#### Audio Interface (if using ES-3 or ESX-8CV):
- **Sample Rate Support**: 96kHz recommended
- **Output Channels**: Minimum 8 for ES-3
- **ADAT Optical**: Required for ESX-8CV
- **Low Latency**: ASIO drivers (Windows) or Core Audio (Mac)

#### Video Synthesis Equipment:
- **LZX Industries Modules**: Any supported modules
- **CV Cables**: 3.5mm TS (mono) patch cables
- **Power Supply**: Adequate power for all modules
- **Case**: Eurorack case with sufficient space

---

## Software Installation

### Step 1: Install Max/MSP

#### macOS Installation:
1. **Download Max/MSP** from Cycling '74 website
2. **Run Installer** and follow prompts
3. **License Activation** with your Cycling '74 account
4. **Launch Max** and verify installation
5. **Update to Latest Version** via Help > Check for Updates

#### Windows Installation:
1. **Download Max/MSP** for Windows
2. **Run as Administrator** during installation
3. **Configure Audio Drivers** (ASIO recommended)
4. **License Activation** with your account
5. **Install Visual C++ Redistributables** if prompted

### Step 2: Install Expert Sleepers Software

#### ES-8 Setup:
1. **Download Drivers** from Expert Sleepers website
2. **Install USB Drivers** for your operating system
3. **Run Expert Sleepers Utility** to verify connection
4. **Configure Sample Rate** to 96kHz
5. **Test CV Outputs** with utility software

#### ESX-8CV Setup:
1. **Install ADAT Drivers** for your audio interface
2. **Configure Interface** for 96kHz operation
3. **Connect ADAT Cables** from interface to ESX-8CV
4. **Verify Channel Count** (8 channels per unit)
5. **Test Synchronization** between units

### Step 3: Install Required Externals

#### Automatic Installation (Recommended):
1. **Open Max/MSP Package Manager**
2. **Search for "Expert Sleepers"** and install
3. **Search for "WebSocket"** and install odot/o.io
4. **Search for "OSC"** and install CNMAT objects
5. **Restart Max/MSP** to load externals

#### Manual Installation:
1. **Download External Files** from project repository
2. **Copy to Max Externals Folder**:
   - macOS: `~/Documents/Max 8/Externals/`
   - Windows: `Documents\Max 8\Externals\`
3. **Restart Max/MSP** and verify in File > Show Package Browser

---

## Hardware Setup

### Step 1: Expert Sleepers Connection

#### ES-8 Connection:
1. **Connect USB Cable** from ES-8 to computer
2. **Power On ES-8** and wait for LED indicators
3. **Open Audio MIDI Setup** (Mac) or Device Manager (Windows)
4. **Verify Device Recognition** in system
5. **Set Sample Rate** to 96kHz in Max/MSP

#### ESX-8CV Connection:
1. **Connect ADAT Cable** from audio interface to ESX-8CV #1
2. **Daisy Chain Additional Units** with ADAT cables
3. **Connect Power** to all ESX-8CV units
4. **Verify Synchronization** LEDs on all units
5. **Test Channel Count** (8 per unit, up to 48 total)

### Step 2: Video Synthesis Equipment

#### CV Connections:
1. **Identify CV Inputs** on LZX modules
2. **Connect CV Cables** from Expert Sleepers outputs
3. **Match Routing Table** (e.g., ES-8 Output 1 → Visual Cortex Keyer)
4. **Verify Connections** are secure and correct
5. **Power On Video Modules** in proper sequence

#### CV Voltage Ranges:
- **ES-8**: 0-10V output range
- **ESX-8CV**: ±5V bipolar or 0-5V unipolar
- **LZX Modules**: Typically expect 0-5V CV input
- **Scaling**: Configure in Max patch for proper voltage

### Step 3: Network Setup

#### Local Network (Single Computer):
1. **Use Localhost**: 127.0.0.1 for OSC communication
2. **Configure Firewall** to allow Max/MSP and bot
3. **Test Connection** with ping command
4. **Verify Ports** 7400 (OSC) and 3001 (WebSocket)

#### Multi-Computer Setup:
1. **Connect to Same Network** via Ethernet
2. **Assign Static IP Addresses** to avoid conflicts
3. **Configure Router/Switch** for low latency
4. **Test Network Latency** with ping -t command
5. **Document IP Addresses** for configuration

---

## Network Configuration

### Step 1: OSC Configuration

#### Max/MSP OSC Settings:
```
Receive Port: 7400
Protocol: UDP
Address Format: /cv/[module]/[instance]/[parameter]
Value Range: 0-127 (integer)
```

#### Bot System OSC Settings:
```javascript
// In config.js
maxConfig: {
    oscHost: '127.0.0.1',     // Max computer IP
    oscPort: 7400,            // Match Max receive port
    websocketPort: 3001       // WebSocket fallback
}
```

### Step 2: WebSocket Configuration

#### WebSocket Settings:
```
URL: ws://[bot-ip]:3001/ws/max
Protocol: WebSocket
Message Format: JSON
Reconnection: Automatic with backoff
```

#### Message Format:
```json
{
  "type": "cv_parameter_update",
  "timestamp": "2025-07-01T12:00:00.000Z",
  "data": {
    "module": "visualcortex",
    "instance": 1,
    "parameter": "keyer",
    "value": 85,
    "routing": "es9out#1"
  }
}
```

### Step 3: Firewall Configuration

#### macOS Firewall:
1. **Open System Preferences** > Security & Privacy
2. **Click Firewall Tab** > Firewall Options
3. **Add Max/MSP** to allowed applications
4. **Enable Incoming Connections** for Max
5. **Test Connectivity** with network tools

#### Windows Firewall:
1. **Open Windows Defender Firewall**
2. **Click "Allow an app through firewall"**
3. **Add Max/MSP** to exceptions list
4. **Configure Ports** 7400 (UDP) and 3001 (TCP)
5. **Test with telnet** or network tools

---

## Max/MSP Patch Installation

### Step 1: Download Patch Files

#### From Repository:
1. **Download Patch Bundle** from project repository
2. **Extract Files** to Max/MSP patches folder
3. **Verify File Structure** matches documentation
4. **Check External Dependencies** are installed

#### File Locations:
```
~/Documents/Max 8/Patches/twitch-cv-tester/
├── twitch-cv-tester.maxpat         # Main patch
├── cv-validator.maxpat              # Validation subpatch
├── es-hardware-interface.maxpat     # Hardware interface
├── osc-websocket-bridge.maxpat      # Network bridge
└── presets/                        # Configuration presets
```

### Step 2: Initial Patch Configuration

#### Open Main Patch:
1. **Launch Max/MSP** and open File menu
2. **Open twitch-cv-tester.maxpat** from patches folder
3. **Check External Loading** in Max window
4. **Verify No Missing Objects** errors
5. **Save Patch** after any modifications

#### Configure Audio Settings:
1. **Open Max Audio Status** (bottom right speaker icon)
2. **Select Expert Sleepers Device** as output
3. **Set Sample Rate** to 96kHz
4. **Configure Buffer Size** (64-128 samples recommended)
5. **Test Audio Output** with DAC test

### Step 3: Parameter Configuration

#### Expert Sleepers Setup:
1. **Select Device Type** (ES-8, ESX-8CV, etc.)
2. **Configure Channel Count** (8, 16, 24, 48)
3. **Set CV Voltage Range** (0-5V or 0-10V)
4. **Load Calibration Data** if available
5. **Test All Outputs** with test signals

#### Network Settings:
1. **Set OSC Receive Port** to 7400
2. **Configure WebSocket URL** to bot system
3. **Test Connection** with ping/telnet
4. **Enable Auto-Reconnect** for reliability
5. **Set Timeout Values** for error handling

---

## Integration Testing

### Step 1: Basic Connectivity Test

#### Test OSC Reception:
1. **Start Max/MSP Patch** and enable OSC receiving
2. **Open OSC Monitor** in patch to view messages
3. **Send Test OSC Message** from terminal:
   ```bash
   oscsend 127.0.0.1 7400 /cv/test/1/value i 64
   ```
4. **Verify Message Reception** in monitor
5. **Check CV Output** with multimeter

#### Test WebSocket Connection:
1. **Start Bot System** with WebSocket enabled
2. **Open WebSocket Monitor** in Max patch
3. **Send Test Command** through bot system
4. **Verify JSON Message Reception**
5. **Check Parameter Processing** in patch

### Step 2: Hardware Validation

#### CV Output Test:
1. **Connect Multimeter** to Expert Sleepers output
2. **Send Parameter Value 0** → Expect 0V
3. **Send Parameter Value 64** → Expect 2.5V (for 0-5V range)
4. **Send Parameter Value 127** → Expect 5V
5. **Verify Linear Response** across full range

#### Multi-Channel Test:
1. **Configure Multiple Outputs** in routing table
2. **Send Different Values** to each channel
3. **Measure All Outputs** simultaneously
4. **Verify No Crosstalk** between channels
5. **Test Channel Isolation** with oscilloscope

### Step 3: Integration with Bot System

#### Start Bot System:
1. **Configure Bot** with Max/MSP OSC settings
2. **Start Enhanced Bot** with proper configuration
3. **Verify Redis Connection** (if using multi-instance)
4. **Check Twitch Connection** and channel join
5. **Test Manual CV Commands** from admin interface

#### End-to-End Test:
1. **Send Twitch Chat Command**: `!cv visualcortex#1.keyer: 85`
2. **Monitor OSC Reception** in Max patch
3. **Verify CV Output** voltage (should be ~3.3V for value 85)
4. **Check Visual Feedback** in video synthesis
5. **Measure Total Latency** from chat to CV output

### Step 4: Performance Testing

#### Latency Test:
1. **Send Rapid Commands** (10Hz rate)
2. **Measure Response Time** with oscilloscope
3. **Verify <10ms Total Latency** requirement
4. **Test Under Load** with multiple parameters
5. **Document Performance Metrics**

#### Stress Test:
1. **Send Updates to All 56 Channels** simultaneously
2. **Monitor CPU Usage** in Max and system
3. **Check Memory Usage** growth over time
4. **Verify No Dropped Messages** in logs
5. **Test Continuous Operation** for 1+ hours

---

## Troubleshooting

### Common Installation Issues

#### Max/MSP Won't Start:
- **Check License**: Verify Max/MSP license is valid
- **Update Software**: Install latest Max/MSP version
- **Clear Preferences**: Delete Max preferences folder
- **Reinstall**: Clean uninstall/reinstall Max/MSP

#### External Objects Missing:
- **Check Installation**: Verify externals in correct folder
- **Restart Max**: Close and reopen Max/MSP
- **Manual Install**: Copy external files manually
- **Version Compatibility**: Check external Max version support

### Hardware Connection Issues

#### Expert Sleepers Not Detected:
- **Check Cables**: Verify USB/ADAT connections
- **Driver Update**: Install latest device drivers
- **Different Port**: Try different USB port
- **System Restart**: Reboot computer and test

#### No CV Output:
- **Check Routing**: Verify parameter to output mapping
- **Test Signals**: Send test values from Max patch
- **Measure Voltage**: Use multimeter to check outputs
- **Cable Testing**: Verify CV cables are working

### Network Communication Issues

#### OSC Messages Not Received:
- **Port Conflicts**: Check if port 7400 is in use
- **Firewall Blocking**: Configure firewall exceptions
- **IP Address**: Verify correct IP in bot configuration
- **Network Tools**: Use OSC monitor utilities

#### WebSocket Connection Failed:
- **Bot Status**: Verify bot system is running
- **Port Availability**: Check WebSocket port 3001
- **Network Connectivity**: Test with ping/telnet
- **Authentication**: Check if WebSocket requires auth

### Performance Issues

#### High Latency (>10ms):
- **Audio Buffer**: Reduce buffer size to 64-128 samples
- **CPU Priority**: Increase Max/MSP process priority
- **Network Latency**: Check network ping times
- **Patch Optimization**: Remove unnecessary GUI updates

#### Dropped Messages:
- **Rate Limiting**: Check bot rate limiting settings
- **Network Congestion**: Monitor network usage
- **Buffer Overflow**: Increase message buffer sizes
- **Error Logging**: Enable debug logging for analysis

### Getting Help

#### Documentation Resources:
- **Max/MSP Manual**: Comprehensive reference
- **Expert Sleepers Docs**: Hardware-specific guides
- **Project Wiki**: Integration-specific help
- **Community Forums**: User discussions and solutions

#### Support Channels:
- **Max/MSP Forums**: General Max questions
- **Expert Sleepers Support**: Hardware issues
- **Project GitHub**: Integration bugs and features
- **LZX Community**: Video synthesis questions

---

**Document Version**: 1.0  
**Last Updated**: July 1, 2025  
**Next Review**: August 1, 2025