#!/usr/bin/env node

/**
 * Simple WebSocket Test Server for Enhanced Overlay Testing
 * Simulates the enhanced-bot.js WebSocket server for testing overlay functionality
 */

const http = require('http');
const url = require('url');
const crypto = require('crypto');

const WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class OverlayTestServer {
    constructor() {
        this.port = 3001;
        this.clients = new Set();
        this.testData = {
            modules: new Map([
                ['oscillator#1', {
                    'frequency': { value: 64, user: 'TestUser1', timestamp: Date.now() },
                    'amplitude': { value: 95, user: 'TestUser2', timestamp: Date.now() - 5000 }
                }],
                ['marbleIndex#1', {
                    'opacityA': { value: 45, user: 'TestUser3', timestamp: Date.now() - 2000 },
                    'opacityB': { value: 127, user: 'TestUser1', timestamp: Date.now() - 8000 }
                }],
                ['doorway#2', {
                    'threshold': { value: 93, user: 'TestUser2', timestamp: Date.now() - 1000 }
                }]
            ]),
            latency: 3,
            lastCommand: 'doorway#2.threshold: 93'
        };
        
        this.init();
    }
    
    init() {
        const server = http.createServer();
        
        server.on('upgrade', (request, socket, head) => {
            this.handleUpgrade(request, socket, head);
        });
        
        server.listen(this.port, () => {
            console.log(`🧪 Overlay Test WebSocket Server running on port ${this.port}`);
            console.log('   Ready to test enhanced overlay functionality');
            
            // Send periodic test updates
            this.startTestSequence();
        });
        
        this.server = server;
    }
    
    handleUpgrade(request, socket, head) {
        const key = request.headers['sec-websocket-key'];
        if (!key) {
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
            return;
        }
        
        const acceptKey = crypto
            .createHash('sha1')
            .update(key + WS_MAGIC)
            .digest('base64');
        
        const responseHeaders = [
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Accept: ${acceptKey}`,
            '',
            ''
        ].join('\r\n');
        
        socket.write(responseHeaders);
        
        const client = {
            socket,
            id: crypto.randomUUID()
        };
        
        this.clients.add(client);
        console.log(`✅ Client connected: ${client.id}`);
        
        // Send initial state
        this.sendFullState(client);
        
        socket.on('data', (buffer) => {
            try {
                const message = this.parseWebSocketFrame(buffer);
                if (message) {
                    this.handleMessage(client, message);
                }
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        });
        
        socket.on('close', () => {
            this.clients.delete(client);
            console.log(`❌ Client disconnected: ${client.id}`);
        });
        
        socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.clients.delete(client);
        });
    }
    
    parseWebSocketFrame(buffer) {
        if (buffer.length < 2) return null;
        
        const firstByte = buffer[0];
        const secondByte = buffer[1];
        
        const opcode = firstByte & 0x0f;
        const masked = (secondByte & 0x80) === 0x80;
        
        // Handle close frame
        if (opcode === 0x08) return null;
        
        // Handle text frame
        if (opcode !== 0x01) return null;
        
        let payloadLength = secondByte & 0x7f;
        let offset = 2;
        
        if (payloadLength === 126) {
            payloadLength = buffer.readUInt16BE(2);
            offset = 4;
        } else if (payloadLength === 127) {
            payloadLength = buffer.readBigUInt64BE(2);
            offset = 10;
        }
        
        let maskKey = null;
        if (masked) {
            maskKey = buffer.slice(offset, offset + 4);
            offset += 4;
        }
        
        const payload = buffer.slice(offset, offset + Number(payloadLength));
        
        if (masked && maskKey) {
            for (let i = 0; i < payload.length; i++) {
                payload[i] ^= maskKey[i % 4];
            }
        }
        
        return payload.toString('utf8');
    }
    
    sendToClient(client, message) {
        const data = JSON.stringify(message);
        const buffer = Buffer.from(data, 'utf8');
        
        const frame = Buffer.allocUnsafe(2 + buffer.length);
        frame[0] = 0x81; // FIN + text frame
        frame[1] = buffer.length; // No mask, payload length
        
        buffer.copy(frame, 2);
        
        try {
            client.socket.write(frame);
        } catch (error) {
            console.error('Error sending message:', error);
            this.clients.delete(client);
        }
    }
    
    broadcast(message) {
        this.clients.forEach(client => {
            this.sendToClient(client, message);
        });
    }
    
    sendFullState(client) {
        // Convert test data to expected format
        const activeVariables = [];
        this.testData.modules.forEach((parameters, moduleName) => {
            Object.entries(parameters).forEach(([paramName, data]) => {
                activeVariables.push([`${moduleName}.${paramName}`, data.value]);
            });
        });
        
        const state = {
            type: 'full_state',
            activeVariables,
            lastCommand: this.testData.lastCommand,
            latency: this.testData.latency,
            overlayEnabled: true
        };
        
        this.sendToClient(client, state);
    }
    
    handleMessage(client, messageStr) {
        try {
            const data = JSON.parse(messageStr);
            console.log('📨 Received message from client:', data);
            
            // Echo back any configuration changes
            if (data.type === 'config_change') {
                console.log('🎛️ Client configuration updated:', data.config);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }
    
    startTestSequence() {
        console.log('🚀 Starting test sequence...');
        
        // Test CV updates every 3 seconds
        let testCounter = 0;
        const testVariables = [
            'oscillator#1.frequency',
            'marbleIndex#1.opacityA', 
            'doorway#2.threshold',
            'oscillator#1.amplitude',
            'marbleIndex#1.opacityB'
        ];
        
        setInterval(() => {
            if (this.clients.size === 0) return;
            
            const variable = testVariables[testCounter % testVariables.length];
            const value = Math.floor(Math.random() * 128);
            const users = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
            const user = users[Math.floor(Math.random() * users.length)];
            
            const update = {
                type: 'cv_update',
                variable,
                value,
                user,
                timestamp: Date.now()
            };
            
            console.log(`📡 Broadcasting CV update: ${variable} = ${value} (by ${user})`);
            this.broadcast(update);
            
            // Update latency occasionally
            if (testCounter % 5 === 0) {
                this.testData.latency = Math.floor(Math.random() * 15) + 1;
            }
            
            testCounter++;
        }, 3000);
        
        // Test overlay toggle every 30 seconds
        setInterval(() => {
            if (this.clients.size === 0) return;
            
            const toggle = {
                type: 'overlay_toggle',
                enabled: Math.random() > 0.3 // 70% chance to be enabled
            };
            
            console.log(`👁️ Broadcasting overlay toggle: ${toggle.enabled ? 'ON' : 'OFF'}`);
            this.broadcast(toggle);
        }, 30000);
        
        // Test clear all every 45 seconds
        setInterval(() => {
            if (this.clients.size === 0) return;
            
            console.log('🧹 Broadcasting clear all command');
            this.broadcast({ type: 'clear_all' });
            
            // Send fresh state after clear
            setTimeout(() => {
                this.clients.forEach(client => this.sendFullState(client));
            }, 1000);
        }, 45000);
    }
}

// Start the test server
const testServer = new OverlayTestServer();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\\n🛑 Shutting down test server...');
    testServer.clients.forEach(client => {
        client.socket.end();
    });
    testServer.server.close(() => {
        console.log('✅ Test server shut down successfully');
        process.exit(0);
    });
});

module.exports = OverlayTestServer;