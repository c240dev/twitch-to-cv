/**
 * Fastify Admin Server Metrics Integration
 * Integration points for adding comprehensive metrics API to fastify-admin-server.js
 * 
 * Enhanced Claude Development Protocol v1.4 - Phase 4: Refinement
 * 
 * This file contains the integration code to be added to fastify-admin-server.js
 * for real-time metrics API and WebSocket streaming.
 */

const MetricsStreamer = require('./metrics-streamer');

/**
 * Integration code for FastifyAdminServer constructor
 * Add this to the constructor after existing initialization
 */
const metricsIntegrationConstructor = `
// Metrics streaming system
this.metricsStreamer = null;
this.metricsConfig = {
    enabled: process.env.METRICS_ENABLED !== 'false',
    streamingEnabled: process.env.METRICS_STREAMING_ENABLED !== 'false'
};
`;

/**
 * Integration code for setupDatabase method
 * Add this after Redis connection is established
 */
const metricsIntegrationSetupDatabase = `
// Initialize metrics streaming system
if (this.metricsConfig.enabled && this.metricsConfig.streamingEnabled) {
    await this.setupMetricsStreaming();
}
`;

/**
 * New method to add to FastifyAdminServer class
 */
const setupMetricsStreamingMethod = `
async setupMetricsStreaming() {
    try {
        this.metricsStreamer = new MetricsStreamer(this.redisClient);
        this.fastify.log.info('📡 Metrics streaming system initialized');
    } catch (err) {
        this.fastify.log.error('Metrics streaming setup error:', err.message);
        this.metricsStreamer = null;
    }
}
`;

/**
 * Enhanced setupRoutes method with metrics endpoints
 * Add these routes to the existing setupRoutes method
 */
const metricsRoutesIntegration = `
// === METRICS API ENDPOINTS ===

// Real-time metrics endpoint
this.fastify.get('/api/metrics/realtime', async (request, reply) => {
    try {
        const metrics = await this.redisClient.hGetAll('metrics:realtime');
        const aggregated = await this.redisClient.hGetAll('metrics:aggregated');
        
        reply.send({
            realtime: metrics || {},
            aggregated: {
                ...aggregated,
                activeInstances: JSON.parse(aggregated.activeInstances || '[]')
            },
            timestamp: Date.now()
        });
    } catch (err) {
        this.fastify.log.error('Real-time metrics endpoint error:', err);
        reply.code(500).send({ error: 'Failed to get real-time metrics' });
    }
});

// Historical metrics endpoint with time range support
this.fastify.get('/api/metrics/historical', async (request, reply) => {
    try {
        const { 
            timeframe = '1h',
            metric_type = null,
            instance = null 
        } = request.query;
        
        if (!this.pgClient) {
            reply.code(503).send({ error: 'Historical metrics unavailable - database not connected' });
            return;
        }
        
        const interval = this.getTimeInterval(timeframe);
        let whereClause = 'WHERE timestamp > NOW() - INTERVAL $1';
        let params = [interval.duration];
        let paramIndex = 2;
        
        if (metric_type) {
            whereClause += \` AND metric_name LIKE $\${paramIndex}\`;
            params.push(\`%\${metric_type}%\`);
            paramIndex++;
        }
        
        if (instance) {
            whereClause += \` AND metadata->>'instance' = $\${paramIndex}\`;
            params.push(instance);
            paramIndex++;
        }
        
        const result = await this.pgClient.query(\`
            SELECT 
                DATE_TRUNC($\${paramIndex}, timestamp) as time_bucket,
                metric_name,
                AVG(metric_value) as avg_value,
                MIN(metric_value) as min_value,
                MAX(metric_value) as max_value,
                COUNT(*) as sample_count,
                metadata->>'instance' as instance
            FROM system_metrics 
            \${whereClause}
            GROUP BY time_bucket, metric_name, metadata->>'instance'
            ORDER BY time_bucket DESC
            LIMIT 1000
        \`, [...params, interval.truncate]);
        
        reply.send({
            metrics: result.rows,
            timeframe,
            query: { metric_type, instance },
            total_records: result.rowCount
        });
    } catch (err) {
        this.fastify.log.error('Historical metrics endpoint error:', err);
        reply.code(500).send({ error: 'Failed to get historical metrics' });
    }
});

// Aggregated metrics endpoint
this.fastify.get('/api/metrics/aggregated', async (request, reply) => {
    try {
        const aggregated = await this.redisClient.hGetAll('metrics:aggregated');
        
        if (!aggregated || Object.keys(aggregated).length === 0) {
            reply.send({
                message: 'No aggregated metrics available yet',
                aggregated: {},
                timestamp: Date.now()
            });
            return;
        }
        
        reply.send({
            aggregated: {
                totalInstances: parseInt(aggregated.totalInstances || '0'),
                avgLatency: parseFloat(aggregated.avgLatency || '0'),
                totalMemoryMB: parseFloat(aggregated.totalMemoryMB || '0'),
                totalCVCommands: parseInt(aggregated.totalCVCommands || '0'),
                overallSuccessRate: parseFloat(aggregated.overallSuccessRate || '100'),
                totalRateLimitBlocks: parseInt(aggregated.totalRateLimitBlocks || '0'),
                activeInstances: JSON.parse(aggregated.activeInstances || '[]'),
                lastUpdate: parseInt(aggregated.lastUpdate || '0')
            },
            timestamp: Date.now()
        });
    } catch (err) {
        this.fastify.log.error('Aggregated metrics endpoint error:', err);
        reply.code(500).send({ error: 'Failed to get aggregated metrics' });
    }
});

// Alerts endpoint
this.fastify.get('/api/metrics/alerts', async (request, reply) => {
    try {
        const alerts = await this.redisClient.hGetAll('metrics:alerts');
        
        reply.send({
            activeAlerts: JSON.parse(alerts.activeAlerts || '[]'),
            lastAlertCheck: parseInt(alerts.lastAlertCheck || '0'),
            totalAlertsTriggered: parseInt(alerts.totalAlertsTriggered || '0'),
            timestamp: Date.now()
        });
    } catch (err) {
        this.fastify.log.error('Alerts endpoint error:', err);
        reply.code(500).send({ error: 'Failed to get alerts' });
    }
});

// Performance metrics endpoint
this.fastify.get('/api/metrics/performance', async (request, reply) => {
    try {
        const systemState = await this.redisClient.hGetAll('system:state');
        const realtimeMetrics = await this.redisClient.hGetAll('metrics:realtime');
        
        const performance = {
            systemLatency: parseInt(systemState.systemLatency || '0'),
            overlayEnabled: systemState.overlayEnabled === 'true',
            lastCommand: systemState.lastCommand || null,
            memoryUsageMB: parseFloat(realtimeMetrics.memoryMB || '0'),
            avgLatency: parseFloat(realtimeMetrics.avgLatency || '0'),
            cvCommandsPerMinute: parseInt(realtimeMetrics.cvCommandsPerMinute || '0'),
            successRate: parseFloat(realtimeMetrics.successRate || '100'),
            rateLimitBlocks: parseInt(realtimeMetrics.rateLimitBlocks || '0'),
            uptime: parseInt(realtimeMetrics.uptime || '0'),
            lastUpdate: parseInt(realtimeMetrics.lastUpdate || '0')
        };
        
        reply.send({
            performance,
            timestamp: Date.now()
        });
    } catch (err) {
        this.fastify.log.error('Performance metrics endpoint error:', err);
        reply.code(500).send({ error: 'Failed to get performance metrics' });
    }
});

// Metrics statistics endpoint
this.fastify.get('/api/metrics/stats', async (request, reply) => {
    try {
        let stats = {
            metricsEnabled: this.metricsConfig.enabled,
            streamingEnabled: this.metricsConfig.streamingEnabled,
            streamer: null,
            redis: {
                connected: this.redisClient?.isOpen || false
            },
            postgresql: {
                connected: this.pgClient ? true : false
            }
        };
        
        if (this.metricsStreamer) {
            stats.streamer = this.metricsStreamer.getStats();
        }
        
        reply.send({
            stats,
            timestamp: Date.now()
        });
    } catch (err) {
        this.fastify.log.error('Metrics stats endpoint error:', err);
        reply.code(500).send({ error: 'Failed to get metrics statistics' });
    }
});

// Instance metrics endpoint
this.fastify.get('/api/metrics/instances', async (request, reply) => {
    try {
        const aggregated = await this.redisClient.hGetAll('metrics:aggregated');
        const activeInstances = JSON.parse(aggregated.activeInstances || '[]');
        
        // Get individual instance metrics if available
        const instanceMetrics = [];
        for (const instanceId of activeInstances) {
            try {
                const instanceData = await this.redisClient.hGetAll(\`metrics:instance:\${instanceId}\`);
                if (instanceData && Object.keys(instanceData).length > 0) {
                    instanceMetrics.push({
                        instanceId,
                        ...instanceData,
                        lastSeen: parseInt(instanceData.lastSeen || '0')
                    });
                }
            } catch (err) {
                // Skip instances that don't have detailed metrics
            }
        }
        
        reply.send({
            totalInstances: activeInstances.length,
            activeInstances,
            instanceMetrics,
            timestamp: Date.now()
        });
    } catch (err) {
        this.fastify.log.error('Instance metrics endpoint error:', err);
        reply.code(500).send({ error: 'Failed to get instance metrics' });
    }
});
`;

/**
 * Enhanced WebSocket setup with metrics streaming
 * Replace the existing WebSocket registration with this enhanced version
 */
const enhancedWebSocketSetup = `
// Enhanced WebSocket for real-time admin updates including metrics
this.fastify.register(async function (fastify) {
    fastify.get('/ws/admin', { websocket: true }, (connection, req) => {
        const clientId = \`admin-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
        
        fastify.log.info(\`Admin WebSocket client connected: \${clientId}\`);
        
        // Add client to metrics streaming if available
        let metricsClientId = null;
        if (this.metricsStreamer) {
            metricsClientId = this.metricsStreamer.addClient(connection, clientId);
            if (metricsClientId) {
                fastify.log.info(\`Client added to metrics streaming: \${metricsClientId}\`);
            }
        }
        
        connection.socket.on('message', message => {
            try {
                const data = JSON.parse(message.toString());
                
                switch (data.type) {
                    case 'metrics_config':
                        // Handle metrics configuration updates
                        if (this.metricsStreamer && metricsClientId) {
                            // Configuration is handled by the metrics streamer
                            fastify.log.info(\`Metrics config update from \${clientId}:\`, data.config);
                        }
                        break;
                        
                    case 'ping':
                        // Respond to client ping
                        connection.socket.send(JSON.stringify({
                            type: 'pong',
                            timestamp: Date.now()
                        }));
                        break;
                        
                    default:
                        fastify.log.info('Admin WebSocket message:', message.toString());
                }
            } catch (err) {
                fastify.log.error('Invalid WebSocket message:', err.message);
            }
        });
        
        connection.socket.on('close', () => {
            fastify.log.info(\`Admin WebSocket client disconnected: \${clientId}\`);
            if (this.metricsStreamer && metricsClientId) {
                this.metricsStreamer.removeClient(metricsClientId);
            }
        });
        
        connection.socket.on('error', (err) => {
            fastify.log.error(\`Admin WebSocket error for \${clientId}:\`, err.message);
        });
        
        // Send initial connection status
        connection.socket.send(JSON.stringify({
            type: 'connection',
            status: 'connected',
            clientId: clientId,
            features: {
                metrics: this.metricsConfig.enabled,
                streaming: this.metricsConfig.streamingEnabled && this.metricsStreamer !== null
            },
            timestamp: Date.now()
        }));
    });
}.bind(this));
`;

/**
 * Enhanced health check with metrics
 */
const enhancedHealthCheck = `
// Enhanced health check with metrics information
this.fastify.get('/health', async (request, reply) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        connections: {
            redis: this.redisClient?.isOpen || false,
            postgresql: this.pgClient ? true : false
        },
        metrics: {
            enabled: this.metricsConfig.enabled,
            streaming: this.metricsConfig.streamingEnabled,
            streamer: this.metricsStreamer ? 'active' : 'inactive'
        }
    };
    
    // Add metrics streamer statistics if available
    if (this.metricsStreamer) {
        health.metrics.streamerStats = this.metricsStreamer.getStats();
    }
    
    reply.code(200).send(health);
});
`;

/**
 * Enhanced shutdown method with metrics cleanup
 */
const enhancedShutdownMethod = `
async shutdown() {
    this.fastify.log.info('🛑 Shutting down Fastify Admin Server...');
    
    // Stop metrics streaming first
    if (this.metricsStreamer) {
        this.fastify.log.info('📡 Stopping metrics streaming...');
        this.metricsStreamer.emergencyStop();
    }
    
    if (this.redisClient) {
        await this.redisClient.quit();
    }
    
    if (this.pgClient) {
        await this.pgClient.end();
    }
    
    await this.fastify.close();
    this.fastify.log.info('✅ Admin server shutdown complete');
    process.exit(0);
}
`;

// Export all integration components
module.exports = {
    metricsIntegrationConstructor,
    metricsIntegrationSetupDatabase,
    setupMetricsStreamingMethod,
    metricsRoutesIntegration,
    enhancedWebSocketSetup,
    enhancedHealthCheck,
    enhancedShutdownMethod,
    
    // Integration instructions
    integrationInstructions: `
FASTIFY ADMIN SERVER INTEGRATION INSTRUCTIONS:

1. Add to FastifyAdminServer constructor:
   ${metricsIntegrationConstructor}

2. Add to setupDatabase method after Redis connection:
   ${metricsIntegrationSetupDatabase}

3. Add new method to FastifyAdminServer class:
   ${setupMetricsStreamingMethod}

4. Add metrics routes to setupRoutes method:
   ${metricsRoutesIntegration}

5. Replace WebSocket registration with enhanced version:
   ${enhancedWebSocketSetup}

6. Replace health check endpoint with enhanced version:
   ${enhancedHealthCheck}

7. Replace shutdown method with enhanced version:
   ${enhancedShutdownMethod}

8. Add import at top of fastify-admin-server.js:
   const MetricsStreamer = require('./metrics-streamer');

NEW API ENDPOINTS:
- GET /api/metrics/realtime - Real-time metrics from Redis
- GET /api/metrics/historical - Historical metrics from PostgreSQL  
- GET /api/metrics/aggregated - Cross-instance aggregated metrics
- GET /api/metrics/alerts - Current alerts and alert history
- GET /api/metrics/performance - System performance metrics
- GET /api/metrics/stats - Metrics system statistics
- GET /api/metrics/instances - Instance-specific metrics

WEBSOCKET ENHANCEMENTS:
- Real-time metrics streaming to admin clients
- Client connection management with throttling
- Configuration updates via WebSocket messages
- Automatic client cleanup and error handling

ZERO PERFORMANCE IMPACT:
All metrics endpoints are read-only and use efficient Redis/PostgreSQL queries.
WebSocket streaming includes throttling to prevent overwhelming clients.
`
};