const tmi = require('tmi.js');
const WebSocket = require('ws');
const osc = require('node-osc');
const config = require('./config');

class TwitchToCVBot {
    constructor() {
        this.config = config;
        this.twitchClient = null;
        this.overlayWSServer = null;
        this.maxOSCClient = null;
        this.maxWebSocket = null;
        
        // State tracking
        this.overlayEnabled = true;
        this.activeVariables = new Map(); // Track current variable values
        this.lastCommand = null;
        this.systemLatency = 0;
        
        // Input jack tracking for sequential validation
        this.inputJackState = new Map(); // moduleName#instance -> highest jack number used
        
        this.setupTwitchClient();
        this.setupOverlayWebSocket();
        this.setupMaxCommunication();
    }
    
    setupTwitchClient() {
        this.twitchClient = new tmi.Client({
            options: { debug: this.config.debugMode },
            connection: {
                reconnect: true,
                secure: true
            },
            identity: {
                username: this.config.twitchConfig.username,
                password: this.config.twitchConfig.password
            },
            channels: this.config.twitchConfig.channels
        });
        
        this.twitchClient.on('message', (channel, tags, message, self) => {
            if (self) return; // Ignore own messages
            
            this.handleMessage(channel, tags, message);
        });
        
        this.twitchClient.on('connected', (addr, port) => {
            console.log(`✅ Connected to Twitch at ${addr}:${port}`);
        });
        
        this.twitchClient.on('disconnected', (reason) => {
            console.log(`❌ Disconnected from Twitch: ${reason}`);
        });
    }
    
    setupOverlayWebSocket() {
        this.overlayWSServer = new WebSocket.Server({ 
            port: this.config.overlayConfig.websocketPort 
        });
        
        this.overlayWSServer.on('connection', (ws) => {
            console.log('🖼️ Overlay client connected');
            
            // Send current state to new client
            this.sendOverlayUpdate(ws, {
                type: 'full_state',
                activeVariables: Array.from(this.activeVariables.entries()),
                lastCommand: this.lastCommand,
                latency: this.systemLatency,
                overlayEnabled: this.overlayEnabled
            });
            
            ws.on('close', () => {
                console.log('🖼️ Overlay client disconnected');
            });
        });
        
        console.log(`🖼️ Overlay WebSocket server started on port ${this.config.overlayConfig.websocketPort}`);
    }
    
    setupMaxCommunication() {
        // OSC Client for Max/MSP
        this.maxOSCClient = new osc.Client(
            this.config.maxConfig.oscHost, 
            this.config.maxConfig.oscPort
        );
        
        console.log(`🎛️ OSC client configured for Max/MSP at ${this.config.maxConfig.oscHost}:${this.config.maxConfig.oscPort}`);
        
        // WebSocket option for Max/MSP (alternative to OSC)
        // Uncomment if you prefer WebSocket over OSC for Max communication
        /*
        this.maxWebSocket = new WebSocket(`ws://localhost:${this.config.maxConfig.websocketPort}`);
        
        this.maxWebSocket.on('open', () => {
            console.log('🎛️ Connected to Max/MSP via WebSocket');
        });
        
        this.maxWebSocket.on('error', (error) => {
            console.log('🎛️ Max/MSP WebSocket error:', error.message);
        });
        */
    }
    
    handleMessage(channel, tags, message) {
        const username = tags.username;
        const isAdmin = username === this.config.adminUsername;
        
        const startTime = Date.now();
        
        try {
            // Check for admin commands first
            if (isAdmin && this.handleAdminCommand(username, message)) {
                return;
            }
            
            // Check for CV control commands
            if (this.handleCVCommand(username, message)) {
                this.systemLatency = Date.now() - startTime;
                return;
            }
            
        } catch (error) {
            console.error('Error handling message:', error.message);
            if (this.config.debugMode) {
                console.error(error.stack);
            }
        }
    }
    
    handleAdminCommand(username, message) {
        const msg = message.trim().toLowerCase();
        
        // Overlay toggle commands
        if (msg === 'overlay on') {
            this.overlayEnabled = true;
            this.broadcastOverlayUpdate({
                type: 'overlay_toggle',
                enabled: true
            });
            console.log(`👑 Admin ${username}: Overlay enabled`);
            return true;
        }
        
        if (msg === 'overlay off') {
            this.overlayEnabled = false;
            this.broadcastOverlayUpdate({
                type: 'overlay_toggle',
                enabled: false
            });
            console.log(`👑 Admin ${username}: Overlay disabled`);
            return true;
        }
        
        // Routing commands: output → lzx_variable OR output to lzx_variable
        const routingMatch = message.match(/^([a-z0-9#.]+)\s*(?:→|to)\s*([a-z0-9#.]+)$/i);
        if (routingMatch) {
            const [, output, lzxVariable] = routingMatch;
            
            try {
                this.config.addRoute(output.trim(), lzxVariable.trim());
                console.log(`👑 Admin ${username}: Added route ${output} → ${lzxVariable}`);
                
                this.broadcastOverlayUpdate({
                    type: 'routing_update',
                    output,
                    lzxVariable,
                    action: 'add'
                });
                
                return true;
            } catch (error) {
                console.error(`❌ Invalid routing command: ${error.message}`);
                return true;
            }
        }
        
        // Remove routing command
        const removeMatch = message.match(/^remove\\s+([a-z0-9#.]+)$/i);
        if (removeMatch) {
            const [, output] = removeMatch;
            
            if (this.config.removeRoute(output.trim())) {
                console.log(`👑 Admin ${username}: Removed route for ${output}`);
                
                this.broadcastOverlayUpdate({
                    type: 'routing_update',
                    output,
                    action: 'remove'
                });
            } else {
                console.log(`❌ No route found for ${output}`);
            }
            return true;
        }
        
        // List routes command
        if (msg === 'routes' || msg === 'list routes') {
            const routes = this.config.getAllRoutes();
            console.log(`👑 Admin ${username}: Current routes (${routes.length}):`);
            routes.forEach(([output, lzxVariable]) => {
                console.log(`  ${output} → ${lzxVariable}`);
            });
            return true;
        }
        
        return false;
    }
    
    handleCVCommand(username, message) {
        // Parse CV command format: moduleName#instance.parameter: value
        const validated = this.config.validateLZXVariable(message.trim());
        
        if (!validated) {
            return false; // Not a valid CV command, ignore silently
        }
        
        // Validate sequential inputJack usage
        if (validated.parameter.startsWith('inputJack#')) {
            if (!this.validateInputJackSequence(validated)) {
                console.log(`❌ ${username}: inputJack must be called sequentially (${message})`);
                return true;
            }
        }
        
        // Check if this variable has a routing assignment
        const route = this.config.getRoute(validated.fullVariable);
        
        if (!route) {
            console.log(`⚠️ No routing for ${validated.fullVariable}, command ignored`);
            return true;
        }
        
        // Execute the CV command
        this.executeCVCommand(validated, route, username, message);
        
        return true;
    }
    
    validateInputJackSequence(validated) {
        const { moduleName, instance, parameter } = validated;
        const moduleInstance = `${moduleName}#${instance}`;
        const jackNumber = parseInt(parameter.split('#')[1]);
        
        const currentMax = this.inputJackState.get(moduleInstance) || 0;
        
        // Allow if it's the next sequential number or if it's already been used
        if (jackNumber <= currentMax + 1) {
            // Update the highest jack number used
            this.inputJackState.set(moduleInstance, Math.max(currentMax, jackNumber));
            return true;
        }
        
        return false;
    }
    
    executeCVCommand(validated, route, username, originalMessage) {
        const { fullVariable, value, dotNotation } = validated;
        
        // Scale value from 0-127 to 0-1V  
        const cvVoltage = value / 127.0;
        
        // Update active variables
        this.activeVariables.set(fullVariable, value);
        
        // Store last command info with dot notation details
        this.lastCommand = {
            username,
            variable: fullVariable,
            value,
            timestamp: Date.now(),
            originalMessage,
            dotNotation: {
                module: dotNotation.module,
                instanceIndex: dotNotation.instanceIndex,
                cvInput: dotNotation.cvInput,
                value: dotNotation.value
            }
        };
        
        // Send to Max/MSP via OSC with dot notation structure
        this.sendToMax(route, cvVoltage, validated);
        
        // Update overlay with enhanced dot notation info
        this.broadcastOverlayUpdate({
            type: 'cv_update',
            variable: fullVariable,
            value,
            route,
            cvVoltage,
            dotNotation: dotNotation,
            isInputJack: validated.isInputJack,
            lastCommand: this.lastCommand,
            latency: this.systemLatency
        });
        
        console.log(`🎛️ ${username}: ${dotNotation.module}#${dotNotation.instanceIndex}.${dotNotation.cvInput}: ${value} (${cvVoltage.toFixed(3)}V) → ${route}`);
    }
    
    sendToMax(route, cvVoltage, validated) {
        try {
            // Send OSC message to Max/MSP with full dot notation structure
            // Format: /cv [route] [voltage] [module] [instance] [parameter] [originalValue]
            this.maxOSCClient.send('/cv', 
                route, 
                cvVoltage, 
                validated.dotNotation.module,
                validated.dotNotation.instanceIndex,
                validated.dotNotation.cvInput,
                validated.dotNotation.value
            );
            
            // Alternative: Send structured OSC message
            this.maxOSCClient.send('/cv/structured', {
                route: route,
                voltage: cvVoltage,
                module: validated.dotNotation.module,
                instance: validated.dotNotation.instanceIndex,
                parameter: validated.dotNotation.cvInput,
                value: validated.dotNotation.value,
                fullVariable: validated.fullVariable,
                isInputJack: validated.isInputJack,
                timestamp: Date.now()
            });
            
            // Alternative WebSocket message (if using WebSocket instead of OSC)
            /*
            if (this.maxWebSocket && this.maxWebSocket.readyState === WebSocket.OPEN) {
                this.maxWebSocket.send(JSON.stringify({
                    type: 'cv_update',
                    route,
                    voltage: cvVoltage,
                    dotNotation: validated.dotNotation,
                    fullVariable: validated.fullVariable,
                    isInputJack: validated.isInputJack,
                    timestamp: Date.now()
                }));
            }
            */
            
        } catch (error) {
            console.error('Error sending to Max/MSP:', error.message);
        }
    }
    
    broadcastOverlayUpdate(data) {
        if (!this.overlayEnabled) return;
        
        const message = JSON.stringify({
            ...data,
            timestamp: Date.now()
        });
        
        this.overlayWSServer.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
    
    sendOverlayUpdate(client, data) {
        if (!this.overlayEnabled) return;
        
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                ...data,
                timestamp: Date.now()
            }));
        }
    }
    
    async start() {
        try {
            await this.twitchClient.connect();
            console.log('🚀 Twitch-to-CV Bot started successfully!');
            console.log(`📺 Listening to channel: ${this.config.twitchConfig.channels[0]}`);
            console.log(`👑 Admin user: ${this.config.adminUsername}`);
            console.log(`🖼️ Overlay WebSocket: ws://localhost:${this.config.overlayConfig.websocketPort}`);
            console.log(`🎛️ Max/MSP OSC: ${this.config.maxConfig.oscHost}:${this.config.maxConfig.oscPort}`);
            
        } catch (error) {
            console.error('❌ Failed to start bot:', error.message);
            process.exit(1);
        }
    }
    
    async stop() {
        console.log('🛑 Shutting down Twitch-to-CV Bot...');
        
        if (this.twitchClient) {
            await this.twitchClient.disconnect();
        }
        
        if (this.overlayWSServer) {
            this.overlayWSServer.close();
        }
        
        if (this.maxOSCClient) {
            this.maxOSCClient.close();
        }
        
        if (this.maxWebSocket) {
            this.maxWebSocket.close();
        }
        
        console.log('✅ Bot stopped successfully');
    }
}

// Handle graceful shutdown
const bot = new TwitchToCVBot();

process.on('SIGINT', async () => {
    await bot.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await bot.stop();
    process.exit(0);
});

// Start the bot
bot.start().catch(console.error);

module.exports = TwitchToCVBot;