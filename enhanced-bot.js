const tmi = require('tmi.js');
const uWS = require('uws');
const osc = require('node-osc');
const redis = require('redis');
const { Client } = require('pg');
const config = require('./config');
const { HybridRateLimiter } = require('./rate-limiter');

class EnhancedTwitchToCVBot {
    constructor() {
        this.config = config;
        this.twitchClient = null;
        this.overlayWSApp = null;
        this.maxOSCClient = null;
        this.redisClient = null;
        this.pgClient = null;
        
        // State tracking
        this.overlayEnabled = true;
        this.lastCommand = null;
        this.systemLatency = 0;
        
        // Performance tracking
        this.messageProcessingTimes = [];
        this.totalMessagesProcessed = 0;
        
        // TPP Hybrid Rate Limiting System
        this.rateLimiter = null; // Initialized after Redis connection
        this.maxActiveVariables = 100;
        
        this.init();
    }
    
    async init() {
        await this.setupRedis();
        await this.setupPostgreSQL();
        this.setupTwitchClient();
        this.setupOverlayWebSocket();
        this.setupMaxCommunication();
        
        console.log('🚀 Enhanced Twitch-to-CV Bot initialized');
    }
    
    async setupRedis() {
        this.redisClient = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        
        this.redisClient.on('error', (err) => {
            console.error('Redis error:', err);
        });
        
        this.redisClient.on('connect', () => {
            console.log('✅ Connected to Redis');
        });
        
        await this.redisClient.connect();
        
        // Setup Redis pub/sub for event coordination
        await this.setupRedisPubSub();
        
        // Initialize Redis state
        await this.redisClient.hSet('system:state', {
            overlayEnabled: 'true',
            lastCommand: '',
            systemLatency: '0'
        });
        
        // Initialize TPP Hybrid Rate Limiter
        this.rateLimiter = new HybridRateLimiter(this.redisClient, {
            userCooldownMs: 1000,        // 1 second user cooldown
            systemCapacity: 100,         // 100 system tokens
            systemRefillRate: 10,        // 10 tokens/second
            variableCapacity: 20,        // 20 tokens per variable
            variableRefillRate: 2,       // 2 tokens/second per variable
            adminCapacity: 1000,         // 1000 admin tokens
            adminRefillRate: 100         // 100 tokens/second for admins
        });
        
        console.log('🛡️ TPP Hybrid Rate Limiting initialized');
    }
    
    async setupRedisPubSub() {
        // Create subscriber client (Redis requires separate clients for pub/sub)
        this.redisSubscriber = this.redisClient.duplicate();
        await this.redisSubscriber.connect();
        
        // Subscribe to coordination channels
        await this.redisSubscriber.subscribe('cv:parameter:update', (message) => {
            this.handleParameterUpdateEvent(JSON.parse(message));
        });
        
        await this.redisSubscriber.subscribe('cv:routing:change', (message) => {
            this.handleRoutingChangeEvent(JSON.parse(message));
        });
        
        await this.redisSubscriber.subscribe('cv:system:broadcast', (message) => {
            this.handleSystemBroadcastEvent(JSON.parse(message));
        });
        
        await this.redisSubscriber.subscribe('cv:admin:command', (message) => {
            this.handleAdminCommandEvent(JSON.parse(message));
        });
        
        console.log('📡 Redis pub/sub coordination initialized');
    }
    
    async setupPostgreSQL() {
        this.pgClient = new Client({
            connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/twitch_cv'
        });
        
        try {
            await this.pgClient.connect();
            console.log('✅ Connected to PostgreSQL');
            
            // Create tables if they don't exist
            await this.createTables();
        } catch (err) {
            console.log('⚠️ PostgreSQL connection failed, running without analytics:', err.message);
            this.pgClient = null;
        }
    }
    
    async createTables() {
        if (!this.pgClient) return;
        
        const createTablesSQL = `
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                username VARCHAR(255) NOT NULL,
                channel VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                is_command BOOLEAN DEFAULT FALSE,
                command_type VARCHAR(50),
                processing_time_ms INTEGER
            );
            
            CREATE TABLE IF NOT EXISTS cv_commands (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                username VARCHAR(255) NOT NULL,
                variable_name VARCHAR(255) NOT NULL,
                value INTEGER NOT NULL,
                processing_time_ms INTEGER,
                success BOOLEAN DEFAULT TRUE
            );
            
            CREATE TABLE IF NOT EXISTS system_metrics (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metric_name VARCHAR(100) NOT NULL,
                metric_value FLOAT NOT NULL,
                metadata JSONB
            );
            
            CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON chat_messages(timestamp);
            CREATE INDEX IF NOT EXISTS idx_cv_timestamp ON cv_commands(timestamp);
            CREATE INDEX IF NOT EXISTS idx_metrics_timestamp_name ON system_metrics(timestamp, metric_name);
        `;
        
        await this.pgClient.query(createTablesSQL);
        console.log('📊 Database tables initialized');
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
            if (self) return;
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
        const port = this.config.overlayConfig.websocketPort;
        
        this.overlayWSApp = uWS.App({
            port: port,
            compression: uWS.SHARED_COMPRESSOR,
            maxCompressedSize: 64 * 1024,
            maxBackpressure: 64 * 1024
        }).ws('/*', {
            compression: uWS.DEDICATED_COMPRESSOR,
            maxCompressedSize: 64 * 1024,
            maxBackpressure: 64 * 1024,
            
            open: (ws) => {
                console.log('🖼️ Enhanced overlay client connected');
                ws.isAlive = true;
                this.sendOverlayFullState(ws);
            },
            
            message: (ws, message, opCode) => {
                try {
                    const data = JSON.parse(Buffer.from(message).toString());
                    this.handleOverlayMessage(ws, data);
                } catch (err) {
                    console.error('Invalid overlay message:', err);
                }
            },
            
            close: (ws, code, message) => {
                console.log('🖼️ Enhanced overlay client disconnected');
                ws.isAlive = false;
            },
            
            pong: (ws) => {
                ws.isAlive = true;
            }
        }).listen(port, (token) => {
            if (token) {
                console.log(`🖼️ Enhanced overlay WebSocket server listening on port ${port}`);
            } else {
                console.log(`❌ Failed to listen on port ${port}`);
            }
        });
        
        // Heartbeat to keep connections alive
        setInterval(() => {
            this.overlayWSApp.publish('overlay', JSON.stringify({ type: 'ping' }));
        }, 30000);
    }
    
    async sendOverlayFullState(ws) {
        try {
            const activeVariables = await this.redisClient.hGetAll('active_variables');
            const systemState = await this.redisClient.hGetAll('system:state');
            
            // Get routing table for enhanced overlay
            let routingTable = {};
            try {
                routingTable = await this.redisClient.hGetAll('routing_table');
            } catch (err) {
                console.log('No routing table found in Redis');
            }
            
            const state = {
                type: 'full_state',
                activeVariables: Object.entries(activeVariables).map(([key, value]) => [key, parseInt(value)]),
                routingTable: Object.entries(routingTable),
                lastCommand: systemState.lastCommand || null,
                latency: parseInt(systemState.systemLatency) || 0,
                overlayEnabled: systemState.overlayEnabled === 'true'
            };
            
            ws.send(JSON.stringify(state));
        } catch (err) {
            console.error('Error sending overlay state:', err);
        }
    }
    
    handleOverlayMessage(ws, data) {
        // Handle configuration changes from overlay
        switch (data.type) {
            case 'config_change':
                console.log('🎛️ Overlay configuration changed:', data.config);
                // Could sync configuration changes back to Redis if needed
                break;
            default:
                console.log('Unknown overlay message:', data.type);
        }
    }
    
    setupMaxCommunication() {
        this.maxOSCClient = new osc.Client(
            this.config.maxConfig.oscHost, 
            this.config.maxConfig.oscPort
        );
        
        console.log(`🎛️ Enhanced OSC client configured for Max/MSP at ${this.config.maxConfig.oscHost}:${this.config.maxConfig.oscPort}`);
    }
    
    async handleMessage(channel, tags, message) {
        const startTime = process.hrtime.bigint();
        const username = tags.username;
        
        try {
            // Check for routing display commands first
            if (this.isRoutingDisplayCommand(message)) {
                await this.handleRoutingDisplayCommand(username, message);
                return;
            }
            
            // Early filtering - reject messages that can't be CV commands
            if (!this.isValidCVMessage(message)) {
                return;
            }
            
            // TPP Hybrid Rate Limiting check
            const rateLimitResult = await this.checkRateLimit(username, message);
            if (!rateLimitResult.allowed) {
                // Log rate limit for monitoring but don't spam chat
                console.log(`🛡️ Rate limited: ${username} - ${rateLimitResult.reason} (tier ${rateLimitResult.tier})`);
                return;
            }
            
            // Log message to PostgreSQL (async, non-blocking)
            this.logChatMessage(username, channel, message, startTime);
            
            // Process message
            if (message.toLowerCase().startsWith('!admin') && this.config.isAdmin(username)) {
                await this.handleAdminCommand(username, message, startTime);
            } else {
                await this.handleCVCommand(username, message, startTime);
            }
            
        } catch (err) {
            console.error('Error handling message:', err);
        }
    }
    
    isValidCVMessage(message) {
        // Early rejection filters - much faster than regex
        if (message.length < 5 || message.length > 100) return false;
        if (!message.includes('#')) return false;
        if (!message.includes('.')) return false;
        if (!message.includes(':')) return false;
        
        return true;
    }
    
    async checkRateLimit(username, message, isAdmin = false) {
        try {
            // Extract variable from message for variable-specific rate limiting
            let variable = null;
            if (this.isValidCVMessage(message)) {
                const validationResult = this.config.validateLZXVariable(message);
                if (validationResult.isValid) {
                    variable = validationResult.variable;
                }
            }
            
            // Use TPP hybrid rate limiter
            return await this.rateLimiter.checkRateLimit(username, variable, isAdmin);
        } catch (err) {
            console.error('Rate limit check error:', err);
            // Fail open for system resilience
            return { allowed: true, error: err.message };
        }
    }
    
    async handleCVCommand(username, message, startTime) {
        const validationResult = this.config.validateLZXVariable(message);
        
        if (!validationResult.isValid) {
            return;
        }
        
        const { variable, value } = validationResult;
        
        // Store in Redis
        await this.redisClient.hSet('active_variables', variable, value.toString());
        
        // Manage memory cap
        await this.enforceVariableCap();
        
        // Send to Max/MSP
        this.sendToMax(variable, value);
        
        // Publish to Redis pub/sub for coordination
        await this.publishCVUpdate(variable, value, username);
        
        // Update overlay
        this.broadcastOverlayUpdate({
            type: 'cv_update',
            variable,
            value,
            user: username,
            timestamp: Date.now()
        });
        
        // Update system state
        await this.redisClient.hSet('system:state', {
            lastCommand: `${variable}: ${value}`,
            systemLatency: this.calculateLatency(startTime).toString()
        });
        
        // Log successful command
        this.logCVCommand(username, variable, value, startTime, true);
        
        console.log(`✅ CV: ${username} -> ${variable}: ${value}`);
    }
    
    async enforceVariableCap() {
        try {
            const activeCount = await this.redisClient.hLen('active_variables');
            
            if (activeCount > this.maxActiveVariables) {
                // Get oldest entries (this is simplified - in production you'd track timestamps)
                const variables = await this.redisClient.hKeys('active_variables');
                const toRemove = variables.slice(0, activeCount - this.maxActiveVariables);
                
                if (toRemove.length > 0) {
                    await this.redisClient.hDel('active_variables', toRemove);
                    console.log(`🧹 Removed ${toRemove.length} old variables (memory cap)`);
                }
            }
        } catch (err) {
            console.error('Error enforcing variable cap:', err);
        }
    }
    
    async handleAdminCommand(username, message, startTime) {
        const parts = message.split(' ');
        const command = parts[1]?.toLowerCase();
        
        switch (command) {
            case 'overlay':
                const action = parts[2]?.toLowerCase();
                if (action === 'on' || action === 'off') {
                    this.overlayEnabled = action === 'on';
                    await this.redisClient.hSet('system:state', 'overlayEnabled', this.overlayEnabled.toString());
                    
                    // Broadcast to local overlay
                    this.broadcastOverlayUpdate({
                        type: 'overlay_toggle',
                        enabled: this.overlayEnabled
                    });
                    
                    // Coordinate with other instances
                    await this.publishSystemBroadcast('overlay_toggle', { 
                        enabled: this.overlayEnabled,
                        admin: username
                    });
                    
                    await this.publishAdminCommand('overlay_toggle', username, { enabled: this.overlayEnabled });
                    
                    console.log(`🖼️ Overlay ${action.toUpperCase()} by ${username}`);
                }
                break;
                
            case 'stats':
                await this.sendStatsToChat(username);
                break;
                
            case 'rate':
            case 'ratelimit':
                await this.sendRateLimitStats(username);
                break;
                
            case 'clear':
                await this.redisClient.del('active_variables');
                
                // Broadcast to local overlay
                this.broadcastOverlayUpdate({ type: 'clear_all' });
                
                // Coordinate with other instances
                await this.publishSystemBroadcast('clear_all', { admin: username });
                await this.publishAdminCommand('clear', username);
                
                console.log(`🧹 Variables cleared by ${username}`);
                break;
                
            case 'routes':
            case 'routing':
                await this.handleRoutingDisplayCommand(username, message, true); // Admin version
                break;
                
            case 'emergency':
                const emergencyAction = parts[2]?.toLowerCase();
                if (emergencyAction === 'stop') {
                    // Emergency stop all CV output
                    await this.redisClient.del('active_variables');
                    this.broadcastOverlayUpdate({ type: 'clear_all' });
                    
                    // Broadcast emergency stop to all instances
                    await this.publishSystemBroadcast('emergency_stop', {
                        admin: username,
                        message: 'Emergency stop activated - all CV output halted'
                    });
                    
                    console.log(`🚨 Emergency stop activated by ${username}`);
                }
                break;
                
            case 'instances':
                // Show connected instances (for debugging)
                const instanceInfo = {
                    current: process.env.INSTANCE_ID || 'bot-001',
                    timestamp: Date.now()
                };
                console.log(`🏢 Instance info for ${username}:`, instanceInfo);
                break;
        }
    }
    
    sendToMax(variable, value) {
        try {
            // Single OSC message - optimized format
            this.maxOSCClient.send('/cv', variable, value);
        } catch (err) {
            console.error('OSC send error:', err);
        }
    }
    
    async publishCVUpdate(variable, value, user) {
        try {
            const event = {
                timestamp: Date.now(),
                type: 'parameter_update',
                data: {
                    variable,
                    value,
                    user,
                    source_instance: process.env.INSTANCE_ID || 'bot-001'
                }
            };
            
            await this.redisClient.publish('cv:parameter:update', JSON.stringify(event));
        } catch (err) {
            console.error('Redis pub/sub error:', err);
            // Graceful degradation - continue without Redis coordination
        }
    }
    
    handleParameterUpdateEvent(event) {
        // Skip events from our own instance
        if (event.data.source_instance === (process.env.INSTANCE_ID || 'bot-001')) {
            return;
        }
        
        console.log(`📡 Remote parameter update: ${event.data.variable} = ${event.data.value} by ${event.data.user}`);
        
        // Sync parameter to local overlay
        this.broadcastOverlayUpdate({
            type: 'cv_update',
            variable: event.data.variable,
            value: event.data.value,
            user: event.data.user,
            timestamp: event.timestamp,
            remote: true
        });
    }
    
    handleRoutingChangeEvent(event) {
        console.log(`📡 Routing change event:`, event.data);
        
        // Broadcast routing change to overlay
        this.broadcastOverlayUpdate({
            type: 'routing_change',
            data: event.data,
            timestamp: event.timestamp,
            remote: true
        });
    }
    
    handleSystemBroadcastEvent(event) {
        console.log(`📡 System broadcast:`, event.data);
        
        switch (event.data.action) {
            case 'clear_all':
                this.broadcastOverlayUpdate({ type: 'clear_all', remote: true });
                break;
            case 'overlay_toggle':
                this.broadcastOverlayUpdate({ 
                    type: 'overlay_toggle', 
                    enabled: event.data.enabled,
                    remote: true 
                });
                break;
            case 'emergency_stop':
                console.log('🚨 Emergency stop received from remote instance');
                this.broadcastOverlayUpdate({
                    type: 'emergency_stop',
                    message: event.data.message,
                    remote: true
                });
                break;
        }
    }
    
    handleAdminCommandEvent(event) {
        // Log admin commands from other instances for coordination
        console.log(`📡 Remote admin command: ${event.data.command} by ${event.data.admin}`);
        
        // Sync admin actions that affect global state
        if (event.data.command === 'clear' || event.data.command === 'overlay_toggle') {
            this.broadcastOverlayUpdate({
                type: 'admin_sync',
                command: event.data.command,
                data: event.data,
                remote: true
            });
        }
    }
    
    async publishRoutingChange(routingData, admin) {
        try {
            const event = {
                timestamp: Date.now(),
                type: 'routing_change',
                data: {
                    routingData,
                    admin,
                    source_instance: process.env.INSTANCE_ID || 'bot-001'
                }
            };
            
            await this.redisClient.publish('cv:routing:change', JSON.stringify(event));
        } catch (err) {
            console.error('Routing change publish error:', err);
        }
    }
    
    async publishSystemBroadcast(action, data = {}) {
        try {
            const event = {
                timestamp: Date.now(),
                type: 'system_broadcast',
                data: {
                    action,
                    ...data,
                    source_instance: process.env.INSTANCE_ID || 'bot-001'
                }
            };
            
            await this.redisClient.publish('cv:system:broadcast', JSON.stringify(event));
        } catch (err) {
            console.error('System broadcast publish error:', err);
        }
    }
    
    async publishAdminCommand(command, admin, data = {}) {
        try {
            const event = {
                timestamp: Date.now(),
                type: 'admin_command',
                data: {
                    command,
                    admin,
                    ...data,
                    source_instance: process.env.INSTANCE_ID || 'bot-001'
                }
            };
            
            await this.redisClient.publish('cv:admin:command', JSON.stringify(event));
        } catch (err) {
            console.error('Admin command publish error:', err);
        }
    }
    
    broadcastOverlayUpdate(data) {
        try {
            this.overlayWSApp.publish('overlay', JSON.stringify(data));
        } catch (err) {
            console.error('Overlay broadcast error:', err);
        }
    }
    
    calculateLatency(startTime) {
        const endTime = process.hrtime.bigint();
        return Number((endTime - startTime) / 1000000n); // Convert to milliseconds
    }
    
    async logChatMessage(username, channel, message, startTime) {
        if (!this.pgClient) return;
        
        try {
            const processingTime = this.calculateLatency(startTime);
            const isCommand = this.isValidCVMessage(message);
            
            // Non-blocking insert
            setImmediate(async () => {
                try {
                    await this.pgClient.query(
                        'INSERT INTO chat_messages (username, channel, message, is_command, processing_time_ms) VALUES ($1, $2, $3, $4, $5)',
                        [username, channel, message, isCommand, processingTime]
                    );
                } catch (err) {
                    console.error('Chat message logging error:', err);
                }
            });
        } catch (err) {
            console.error('Chat message log preparation error:', err);
        }
    }
    
    async logCVCommand(username, variable, value, startTime, success) {
        if (!this.pgClient) return;
        
        try {
            const processingTime = this.calculateLatency(startTime);
            
            setImmediate(async () => {
                try {
                    await this.pgClient.query(
                        'INSERT INTO cv_commands (username, variable_name, value, processing_time_ms, success) VALUES ($1, $2, $3, $4, $5)',
                        [username, variable, value, processingTime, success]
                    );
                } catch (err) {
                    console.error('CV command logging error:', err);
                }
            });
        } catch (err) {
            console.error('CV command log preparation error:', err);
        }
    }
    
    isRoutingDisplayCommand(message) {
        const lowerMessage = message.toLowerCase().trim();
        return lowerMessage === 'routes' || 
               lowerMessage === 'all active' || 
               lowerMessage === 'routing' ||
               lowerMessage === 'show routes';
    }
    
    async handleRoutingDisplayCommand(username, message, isAdmin = false) {
        try {
            // Get all active variables from Redis
            const activeVariables = await this.redisClient.hGetAll('active_variables');
            
            // Get routing table if available
            let routingTable = {};
            try {
                const routingData = await this.redisClient.hGetAll('routing_table');
                routingTable = routingData;
            } catch (err) {
                console.log('No routing table found in Redis');
            }
            
            // Prepare routing display data
            const routingDisplay = {
                activeVariables: Object.entries(activeVariables),
                routingTable: Object.entries(routingTable),
                requestedBy: username,
                isAdmin,
                timestamp: Date.now()
            };
            
            // Send to overlay with temporary display flag
            this.broadcastOverlayUpdate({
                type: 'routing_display',
                data: routingDisplay,
                temporary: true,
                duration: 10000 // Show for 10 seconds
            });
            
            console.log(`📋 Routing display requested by ${username} (${Object.keys(activeVariables).length} active variables)`);
            
        } catch (err) {
            console.error('Routing display error:', err);
        }
    }
    
    async sendStatsToChat(username) {
        try {
            const activeCount = await this.redisClient.hLen('active_variables');
            const systemState = await this.redisClient.hGetAll('system:state');
            const rateLimitStats = this.rateLimiter.getStats();
            
            console.log(`📊 Stats requested by ${username}: ${activeCount} active variables, ${systemState.systemLatency}ms latency, ${rateLimitStats.totalRequests} requests processed`);
        } catch (err) {
            console.error('Stats error:', err);
        }
    }
    
    async sendRateLimitStats(username) {
        try {
            const stats = this.rateLimiter.getStats();
            console.log(`🛡️ Rate Limit Stats for ${username}:`, {
                totalRequests: stats.totalRequests,
                userBlocks: stats.userBlocks,
                systemBlocks: stats.systemBlocks,
                variableBlocks: stats.variableBlocks,
                adminOverrides: stats.adminOverrides,
                systemTokens: `${stats.systemTokens.tokens}/${stats.systemTokens.capacity} (${stats.systemTokens.percentage.toFixed(1)}%)`,
                variableBuckets: stats.variableBuckets,
                adminBuckets: stats.adminBuckets
            });
        } catch (err) {
            console.error('Rate limit stats error:', err);
        }
    }
    
    async start() {
        try {
            await this.twitchClient.connect();
            console.log('🚀 Enhanced Twitch-to-CV Bot started successfully');
        } catch (err) {
            console.error('❌ Failed to start bot:', err);
        }
    }
    
    async stop() {
        console.log('🛑 Shutting down Enhanced Twitch-to-CV Bot...');
        
        if (this.twitchClient) {
            await this.twitchClient.disconnect();
        }
        
        if (this.redisSubscriber) {
            await this.redisSubscriber.unsubscribe();
            await this.redisSubscriber.quit();
        }
        
        if (this.redisClient) {
            await this.redisClient.quit();
        }
        
        if (this.pgClient) {
            await this.pgClient.end();
        }
        
        console.log('✅ Enhanced bot shutdown complete');
    }
}

// Create and start the enhanced bot
const bot = new EnhancedTwitchToCVBot();

// Graceful shutdown handling
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

module.exports = EnhancedTwitchToCVBot;