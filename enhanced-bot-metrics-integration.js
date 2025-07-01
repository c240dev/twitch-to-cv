/**
 * Enhanced Bot Metrics Integration
 * Integration points for adding metrics collection to enhanced-bot.js
 * 
 * Enhanced Claude Development Protocol v1.4 - Phase 4: Refinement
 * 
 * This file contains the integration code to be added to enhanced-bot.js
 * for comprehensive metrics collection with zero latency impact.
 */

const MetricsCollector = require('./metrics-collector');
const MetricsAggregator = require('./metrics-aggregator');

/**
 * Integration code for enhanced-bot.js constructor
 * Add this to the EnhancedTwitchToCVBot constructor
 */
const metricsIntegrationConstructor = `
// Metrics Collection System (zero latency impact)
this.metricsCollector = null;
this.metricsAggregator = null;
this.metricsInitialized = false;

// Metrics configuration
this.metricsConfig = {
    enabled: process.env.METRICS_ENABLED !== 'false', // Default enabled
    systemMetricsInterval: 30000, // Collect system metrics every 30 seconds
    rateLimitMetricsInterval: 60000 // Collect rate limit metrics every minute
};
`;

/**
 * Integration code for enhanced-bot.js init() method
 * Add this after Redis and PostgreSQL setup
 */
const metricsIntegrationInit = `
// Initialize metrics collection system
if (this.metricsConfig.enabled) {
    await this.setupMetricsCollection();
}
`;

/**
 * New method to add to EnhancedTwitchToCVBot class
 */
const setupMetricsCollectionMethod = `
async setupMetricsCollection() {
    try {
        // Initialize metrics collector
        this.metricsCollector = new MetricsCollector(this.redisClient, this.pgClient);
        
        // Initialize metrics aggregator (only one per instance type)
        if (process.env.ENABLE_METRICS_AGGREGATOR !== 'false') {
            this.metricsAggregator = new MetricsAggregator(this.redisClient);
        }
        
        // Setup periodic system metrics collection
        this.setupPeriodicMetrics();
        
        this.metricsInitialized = true;
        console.log('📊 Metrics collection system initialized');
        
    } catch (err) {
        console.error('Metrics setup error (non-critical):', err.message);
        // Continue without metrics - graceful degradation
        this.metricsCollector = null;
        this.metricsAggregator = null;
    }
}

setupPeriodicMetrics() {
    if (!this.metricsCollector) return;
    
    // Collect system metrics periodically
    setInterval(() => {
        if (this.metricsCollector) {
            this.metricsCollector.recordSystemMetrics();
        }
    }, this.metricsConfig.systemMetricsInterval);
    
    // Collect rate limiting metrics periodically
    setInterval(() => {
        if (this.metricsCollector && this.rateLimiter) {
            const rateLimitStats = this.rateLimiter.getStats();
            this.metricsCollector.recordRateLimitingMetrics(rateLimitStats);
        }
    }, this.metricsConfig.rateLimitMetricsInterval);
}
`;

/**
 * Integration code for handleMessage method
 * Replace the existing handleMessage method with this enhanced version
 */
const enhancedHandleMessageMethod = `
async handleMessage(channel, tags, message) {
    const startTime = process.hrtime.bigint();
    const username = tags.username;
    
    try {
        // Check for routing display commands first
        if (this.isRoutingDisplayCommand(message)) {
            await this.handleRoutingDisplayCommand(username, message);
            
            // Record metrics for routing commands (non-blocking)
            if (this.metricsCollector) {
                setImmediate(() => {
                    this.metricsCollector.recordCVCommand({
                        latency: this.calculateLatency(startTime),
                        user: username,
                        success: true,
                        messageLength: message.length,
                        commandType: 'routing_display'
                    });
                });
            }
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
            console.log(\`🛡️ Rate limited: \${username} - \${rateLimitResult.reason} (tier \${rateLimitResult.tier})\`);
            
            // Record rate limit metrics (non-blocking)
            if (this.metricsCollector) {
                setImmediate(() => {
                    this.metricsCollector.recordCVCommand({
                        latency: this.calculateLatency(startTime),
                        user: username,
                        success: false,
                        messageLength: message.length,
                        commandType: 'rate_limited',
                        rateLimitReason: rateLimitResult.reason,
                        rateLimitTier: rateLimitResult.tier
                    });
                });
            }
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
        
        // Record error metrics (non-blocking)
        if (this.metricsCollector) {
            setImmediate(() => {
                this.metricsCollector.recordCVCommand({
                    latency: this.calculateLatency(startTime),
                    user: username,
                    success: false,
                    messageLength: message.length,
                    commandType: 'error',
                    error: err.message
                });
            });
        }
    }
}
`;

/**
 * Enhanced handleCVCommand method with metrics
 */
const enhancedHandleCVCommandMethod = `
async handleCVCommand(username, message, startTime) {
    const validationResult = this.config.validateLZXVariable(message);
    
    if (!validationResult.isValid) {
        // Record invalid command metrics (non-blocking)
        if (this.metricsCollector) {
            setImmediate(() => {
                this.metricsCollector.recordCVCommand({
                    latency: this.calculateLatency(startTime),
                    user: username,
                    success: false,
                    messageLength: message.length,
                    commandType: 'invalid_format'
                });
            });
        }
        return;
    }
    
    const { variable, value } = validationResult;
    
    try {
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
        const latency = this.calculateLatency(startTime);
        await this.redisClient.hSet('system:state', {
            lastCommand: \`\${variable}: \${value}\`,
            systemLatency: latency.toString()
        });
        
        // Record successful CV command metrics (non-blocking)
        if (this.metricsCollector) {
            setImmediate(() => {
                this.metricsCollector.recordCVCommand({
                    latency: latency,
                    user: username,
                    success: true,
                    messageLength: message.length,
                    commandType: 'cv_command',
                    variable: variable,
                    value: value
                });
            });
        }
        
        // Log successful command
        this.logCVCommand(username, variable, value, startTime, true);
        
        console.log(\`✅ CV: \${username} -> \${variable}: \${value}\`);
        
    } catch (err) {
        console.error('CV command processing error:', err);
        
        // Record error metrics (non-blocking)
        if (this.metricsCollector) {
            setImmediate(() => {
                this.metricsCollector.recordCVCommand({
                    latency: this.calculateLatency(startTime),
                    user: username,
                    success: false,
                    messageLength: message.length,
                    commandType: 'cv_command_error',
                    variable: variable,
                    value: value,
                    error: err.message
                });
            });
        }
        
        // Log failed command
        this.logCVCommand(username, variable, value, startTime, false);
    }
}
`;

/**
 * Enhanced setupOverlayWebSocket method with metrics
 */
const enhancedSetupOverlayWebSocketMethod = `
setupOverlayWebSocket() {
    const port = this.config.overlayConfig.websocketPort;
    
    // WebSocket connection tracking for metrics
    this.wsConnectionMetrics = {
        activeConnections: 0,
        totalConnections: 0,
        messagesPerSecond: 0,
        messageCount: 0,
        lastMetricsReset: Date.now()
    };
    
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
            
            // Update connection metrics
            this.wsConnectionMetrics.activeConnections++;
            this.wsConnectionMetrics.totalConnections++;
            
            // Record WebSocket metrics (non-blocking)
            if (this.metricsCollector) {
                setImmediate(() => {
                    this.metricsCollector.recordWebSocketMetrics(this.wsConnectionMetrics);
                });
            }
            
            this.sendOverlayFullState(ws);
        },
        
        message: (ws, message, opCode) => {
            try {
                const data = JSON.parse(Buffer.from(message).toString());
                this.handleOverlayMessage(ws, data);
                
                // Update message metrics
                this.wsConnectionMetrics.messageCount++;
                this.updateWebSocketMessageRate();
                
            } catch (err) {
                console.error('Invalid overlay message:', err);
            }
        },
        
        close: (ws, code, message) => {
            console.log('🖼️ Enhanced overlay client disconnected');
            ws.isAlive = false;
            
            // Update connection metrics
            this.wsConnectionMetrics.activeConnections--;
            
            // Record WebSocket metrics (non-blocking)
            if (this.metricsCollector) {
                setImmediate(() => {
                    this.metricsCollector.recordWebSocketMetrics(this.wsConnectionMetrics);
                });
            }
        },
        
        pong: (ws) => {
            ws.isAlive = true;
        }
    }).listen(port, (token) => {
        if (token) {
            console.log(\`🖼️ Enhanced overlay WebSocket server listening on port \${port}\`);
        } else {
            console.log(\`❌ Failed to listen on port \${port}\`);
        }
    });
    
    // Heartbeat to keep connections alive
    setInterval(() => {
        this.overlayWSApp.publish('overlay', JSON.stringify({ type: 'ping' }));
    }, 30000);
    
    // Reset message rate counter every minute
    setInterval(() => {
        this.updateWebSocketMessageRate();
        this.wsConnectionMetrics.messageCount = 0;
        this.wsConnectionMetrics.lastMetricsReset = Date.now();
    }, 60000);
}

updateWebSocketMessageRate() {
    const now = Date.now();
    const timeDiff = (now - this.wsConnectionMetrics.lastMetricsReset) / 1000;
    this.wsConnectionMetrics.messagesPerSecond = timeDiff > 0 
        ? (this.wsConnectionMetrics.messageCount / timeDiff).toFixed(2)
        : 0;
}
`;

/**
 * Enhanced shutdown method with metrics cleanup
 */
const enhancedStopMethod = `
async stop() {
    console.log('🛑 Shutting down Enhanced Twitch-to-CV Bot...');
    
    // Stop metrics collection first
    if (this.metricsCollector) {
        console.log('📊 Stopping metrics collection...');
        try {
            // Final metrics flush
            await this.metricsCollector.flushMetrics();
            this.metricsCollector.emergencyCleanup();
        } catch (err) {
            console.error('Metrics cleanup error:', err.message);
        }
    }
    
    if (this.metricsAggregator) {
        console.log('📈 Stopping metrics aggregation...');
        // Metrics aggregator cleanup happens automatically
    }
    
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
`;

// Export all integration components
module.exports = {
    metricsIntegrationConstructor,
    metricsIntegrationInit,
    setupMetricsCollectionMethod,
    enhancedHandleMessageMethod,
    enhancedHandleCVCommandMethod,
    enhancedSetupOverlayWebSocketMethod,
    enhancedStopMethod,
    
    // Integration instructions
    integrationInstructions: `
INTEGRATION INSTRUCTIONS:

1. Add to enhanced-bot.js constructor:
   ${metricsIntegrationConstructor}

2. Add to enhanced-bot.js init() method after Redis/PostgreSQL setup:
   ${metricsIntegrationInit}

3. Add new method to EnhancedTwitchToCVBot class:
   ${setupMetricsCollectionMethod}

4. Replace handleMessage method with enhanced version
5. Replace handleCVCommand method with enhanced version  
6. Replace setupOverlayWebSocket method with enhanced version
7. Replace stop method with enhanced version

8. Add imports at top of enhanced-bot.js:
   const MetricsCollector = require('./metrics-collector');
   const MetricsAggregator = require('./metrics-aggregator');

ZERO LATENCY GUARANTEE:
All metrics operations use setImmediate() to ensure zero impact on CV control latency.
System will continue to operate normally even if metrics collection fails.
`
};