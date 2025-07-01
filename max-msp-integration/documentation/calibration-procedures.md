# Calibration Procedures
## Expert Sleepers CV Output Calibration for Max/MSP

### Table of Contents
1. [Overview](#overview)
2. [Equipment Required](#equipment-required)
3. [Safety Procedures](#safety-procedures)
4. [ES-8 Calibration](#es-8-calibration)
5. [ESX-8CV Calibration](#esx-8cv-calibration)
6. [ES-3 Calibration](#es-3-calibration)
7. [Verification Procedures](#verification-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Proper calibration ensures accurate CV output voltages from Expert Sleepers devices, critical for precise control of video synthesis equipment. This document provides step-by-step procedures for calibrating each supported device type.

### Calibration Goals:
- **Accuracy**: ±10mV voltage accuracy across full range
- **Linearity**: Linear response from 0-127 parameter values
- **Consistency**: Identical response across all channels
- **Stability**: Stable output over time and temperature

### Parameter to Voltage Mapping:
```
Parameter Value    0-5V Output    0-10V Output
0                 0.000V         0.000V
32                1.250V         2.500V
64                2.500V         5.000V
96                3.750V         7.500V
127               5.000V         10.000V
```

---

## Equipment Required

### Essential Tools:
- **Digital Multimeter**: ±0.1% accuracy minimum
- **Oscilloscope**: 100MHz+ bandwidth (recommended)
- **CV Cables**: High-quality 3.5mm TS patch cables
- **Notebook**: For recording calibration data
- **Computer**: Running Max/MSP with calibration patch

### Recommended Tools:
- **Precision Multimeter**: Fluke 87V or equivalent
- **Calibrated Voltage Source**: For verification
- **Temperature Monitor**: To track thermal stability
- **Function Generator**: For timing tests
- **Spectrum Analyzer**: For noise analysis

### Calibration Standards:
- **5V Reference**: Precision 5.000V ±1mV
- **10V Reference**: Precision 10.000V ±1mV
- **Zero Reference**: True 0V ground reference
- **Calibration Certificate**: Traceable to NIST standards

---

## Safety Procedures

### Electrical Safety:
- **Power Off**: Ensure all equipment powered off before connections
- **Ground Safety**: Verify proper grounding of all equipment
- **Voltage Limits**: Never exceed device specifications
- **ESD Protection**: Use anti-static precautions
- **Emergency Stop**: Know location of emergency power cutoff

### Equipment Protection:
- **Input Limits**: Respect maximum input voltages on modules
- **Current Limits**: Monitor current draw during calibration
- **Temperature**: Avoid overheating during extended calibration
- **Connections**: Double-check all connections before power-on
- **Documentation**: Record all settings before modifications

---

## ES-8 Calibration

### Step 1: Initial Setup

#### Hardware Preparation:
1. **Connect ES-8** via USB to computer
2. **Power On ES-8** and verify LED status
3. **Launch Expert Sleepers Utility** software
4. **Verify Firmware Version** (update if needed)
5. **Set Sample Rate** to 96kHz

#### Max/MSP Setup:
1. **Open Calibration Patch**: `es8-calibration.maxpat`
2. **Select ES-8 Device** in audio preferences
3. **Enable All Outputs** (1-8)
4. **Set Buffer Size** to 64 samples
5. **Test Basic Connectivity** with sine wave

### Step 2: Zero Point Calibration

#### Procedure:
1. **Connect Multimeter** to ES-8 Output 1
2. **Send Parameter Value 0** from Max patch
3. **Measure Output Voltage** (should be close to 0V)
4. **Adjust Zero Offset** in ES-8 utility if needed
5. **Record Actual Voltage** in calibration log

#### Acceptable Range:
- **Target**: 0.000V
- **Tolerance**: ±5mV
- **Action**: Adjust if outside tolerance

#### Repeat for All Channels:
```
Channel 1: 0.000V ± 5mV
Channel 2: 0.000V ± 5mV
Channel 3: 0.000V ± 5mV
Channel 4: 0.000V ± 5mV
Channel 5: 0.000V ± 5mV
Channel 6: 0.000V ± 5mV
Channel 7: 0.000V ± 5mV
Channel 8: 0.000V ± 5mV
```

### Step 3: Full Scale Calibration

#### 10V Range Calibration:
1. **Send Parameter Value 127** from Max patch
2. **Measure Output Voltage** on each channel
3. **Target Voltage**: 10.000V ±10mV
4. **Adjust Gain** in ES-8 utility if needed
5. **Verify Linearity** at 25%, 50%, 75% points

#### 5V Range Calibration (if supported):
1. **Configure ES-8** for 5V range mode
2. **Send Parameter Value 127**
3. **Target Voltage**: 5.000V ±5mV
4. **Record Calibration Values**
5. **Save Configuration** to ES-8 memory

### Step 4: Linearity Verification

#### Test Points:
```
Parameter    Expected (10V)    Expected (5V)    Tolerance
0           0.000V            0.000V           ±5mV
16          1.250V            0.625V           ±10mV
32          2.500V            1.250V           ±10mV
48          3.750V            1.875V           ±10mV
64          5.000V            2.500V           ±10mV
80          6.250V            3.125V           ±10mV
96          7.500V            3.750V           ±10mV
112         8.750V            4.375V           ±10mV
127         10.000V           5.000V           ±10mV
```

#### Measurement Procedure:
1. **Set Parameter Value** in Max patch
2. **Wait 100ms** for settling
3. **Record Voltage** on multimeter
4. **Calculate Error** from expected value
5. **Note Deviations** >±10mV for correction

### Step 5: Channel Matching

#### Cross-Channel Verification:
1. **Set All Channels** to same parameter value
2. **Measure All Outputs** simultaneously
3. **Calculate Deviation** between channels
4. **Target**: <5mV difference between channels
5. **Adjust Individual Gains** if needed

#### Crosstalk Test:
1. **Set Channel 1** to maximum (127)
2. **Set All Others** to zero (0)
3. **Measure All Channels** for interference
4. **Target**: <1mV crosstalk on inactive channels
5. **Check Ground Loops** if crosstalk detected

---

## ESX-8CV Calibration

### Step 1: System Setup

#### ADAT Configuration:
1. **Connect Audio Interface** to computer
2. **Connect ESX-8CV Units** via ADAT optical
3. **Set Interface Sample Rate** to 96kHz
4. **Verify ADAT Sync LEDs** on all units
5. **Test Channel Count** (8 per unit)

#### Max/MSP Configuration:
1. **Select Audio Interface** in preferences
2. **Verify 48 Output Channels** available
3. **Open ESX-8CV Calibration Patch**
4. **Configure Channel Mapping** (1-8, 9-16, etc.)
5. **Test Signal Routing** to each unit

### Step 2: Bipolar Calibration (±5V)

#### Zero Center Calibration:
1. **Set ESX-8CV** to bipolar mode
2. **Send Parameter Value 64** (center)
3. **Measure Output**: Should be 0.000V
4. **Adjust Center Offset** if needed
5. **Verify on All Channels**

#### Positive Full Scale:
1. **Send Parameter Value 127**
2. **Target Voltage**: +5.000V ±5mV
3. **Adjust Positive Gain** if needed
4. **Record Calibration Data**

#### Negative Full Scale:
1. **Send Parameter Value 0**
2. **Target Voltage**: -5.000V ±5mV
3. **Adjust Negative Gain** if needed
4. **Verify Symmetry** with positive scale

### Step 3: Unipolar Calibration (0-5V)

#### Zero Point:
1. **Set ESX-8CV** to unipolar mode
2. **Send Parameter Value 0**
3. **Target**: 0.000V ±2mV
4. **Adjust Zero Offset**

#### Full Scale:
1. **Send Parameter Value 127**
2. **Target**: 5.000V ±5mV
3. **Adjust Gain** for accuracy
4. **Verify Linearity**

### Step 4: Multi-Unit Synchronization

#### Timing Verification:
1. **Send Simultaneous Updates** to all units
2. **Monitor with Oscilloscope** (multi-channel)
3. **Measure Timing Skew** between units
4. **Target**: <1μs between units
5. **Check ADAT Clock Stability**

#### Phase Alignment:
1. **Send 1kHz Test Sine Wave** to all channels
2. **Measure Phase Difference** between units
3. **Verify ADAT Word Clock** synchronization
4. **Document Phase Relationships**

---

## ES-3 Calibration

### Step 1: Audio Interface Setup

#### Interface Configuration:
1. **Select High-Quality Interface** (>110dB SNR)
2. **Set Sample Rate** to 48kHz or 96kHz
3. **Configure Output Levels** to maximum
4. **Disable Limiter/Processing** on outputs
5. **Test Output Impedance** (<75Ω recommended)

#### ES-3 Module Setup:
1. **Install ES-3** in Eurorack case
2. **Connect Audio Cables** from interface
3. **Power On Module** and check LED
4. **Verify Channel Assignment** (1-8)
5. **Set Range Switches** as needed

### Step 2: Audio Interface Calibration

#### Output Level Calibration:
1. **Generate 0dBFS Signal** in Max/MSP
2. **Measure Interface Output** with scope
3. **Calculate Peak Voltage** (typically 2-20V)
4. **Set CV Scaling** in Max patch
5. **Target 5V** for parameter value 127

#### Frequency Response:
1. **Generate DC Signal** (0Hz)
2. **Verify DC Coupling** on interface
3. **Test Low Frequency Response** (0.1Hz)
4. **Check for High-Pass Filtering**
5. **Document Frequency Limits**

### Step 3: ES-3 Module Calibration

#### CV Output Scaling:
1. **Set Parameter Value 127**
2. **Measure ES-3 Output** voltage
3. **Adjust Range Trimmers** on module
4. **Target 5V** or 10V as required
5. **Verify Across All Channels**

#### Offset Adjustment:
1. **Set Parameter Value 0**
2. **Measure ES-3 Output**
3. **Adjust Offset Trimmers** for 0V
4. **Check Temperature Stability**
5. **Document Final Settings**

---

## Verification Procedures

### Daily Verification

#### Quick Check (5 minutes):
1. **Send Value 0** → Verify 0V output
2. **Send Value 127** → Verify full scale
3. **Send Value 64** → Verify mid-scale
4. **Check All Channels** rapidly
5. **Note Any Deviations** >±20mV

### Weekly Verification

#### Comprehensive Check (30 minutes):
1. **Full Linearity Test** all channels
2. **Crosstalk Measurement** between channels
3. **Temperature Stability** test (if possible)
4. **Noise Floor Measurement** with scope
5. **Update Calibration Log**

### Monthly Verification

#### Complete Recalibration (2 hours):
1. **Full Calibration Procedure** all devices
2. **Documentation Update** with new values
3. **Comparison with Previous** calibrations
4. **Trend Analysis** for drift
5. **Preventive Maintenance** if needed

### Calibration Records

#### Required Documentation:
- **Date and Time** of calibration
- **Environmental Conditions** (temperature, humidity)
- **Equipment Used** (model numbers, cal dates)
- **Measured Values** for all test points
- **Deviations** from specification
- **Corrective Actions** taken
- **Next Calibration Due** date

---

## Troubleshooting

### Common Calibration Issues

#### Zero Offset Problems:
- **Symptom**: Output not 0V at parameter value 0
- **Causes**: Ground loops, DC offset in audio chain
- **Solutions**: Check grounding, adjust offset trimmers
- **Prevention**: Use balanced connections where possible

#### Gain Errors:
- **Symptom**: Full scale voltage incorrect
- **Causes**: Audio interface settings, gain trimmers
- **Solutions**: Check interface levels, adjust gain
- **Prevention**: Document all gain settings

#### Non-Linearity:
- **Symptom**: Voltage doesn't scale linearly with parameter
- **Causes**: Audio processing, analog distortion
- **Solutions**: Disable processing, check levels
- **Prevention**: Use linear audio interface settings

#### Channel-to-Channel Variation:
- **Symptom**: Different voltages for same parameter
- **Causes**: Component tolerance, calibration drift
- **Solutions**: Individual channel calibration
- **Prevention**: Regular verification procedures

### Advanced Troubleshooting

#### Noise Issues:
- **Ground Loops**: Use star grounding topology
- **RF Interference**: Shield cables, check grounding
- **Power Supply Noise**: Use clean power, filters
- **Thermal Noise**: Allow warm-up time

#### Stability Problems:
- **Temperature Drift**: Monitor temperature changes
- **Component Aging**: Track calibration over time
- **Mechanical Stress**: Secure all connections
- **EMI Sensitivity**: Check for interference sources

### When to Recalibrate

#### Mandatory Recalibration:
- **Initial Installation** of any device
- **After Firmware Update** on Expert Sleepers devices
- **After Hardware Repair** or modification
- **Annual Recertification** for critical applications
- **When Verification Fails** tolerance requirements

#### Recommended Recalibration:
- **Seasonal Changes** in temperature/humidity
- **After System Relocation** or setup changes
- **Performance Degradation** noticed during use
- **Preparation for Important Events** or recordings

---

**Document Version**: 1.0  
**Last Updated**: July 1, 2025  
**Next Review**: August 1, 2025  
**Calibration Frequency**: Monthly verification, Annual full calibration