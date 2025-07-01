/**
 * Metrics Collector - Core monitoring component for Twitch-to-CV bot
 * Provides lightweight, non-blocking metrics collection with zero latency impact
 * 
 * Enhanced Claude Development Protocol v1.4 - Phase 1: Draft Implementation
 */

class MetricsCollector {
    constructor(redisClient, pgClient) {
        this.redisClient = redisClient;
        this.pgClient = pgClient;
        
        // Configuration following existing patterns
        this.config = {
            realTimeRetentionMs: 60 * 60 * 1000, // 1 hour Redis retention
            batchSize: 100, // Batch PostgreSQL inserts for efficiency
            flushIntervalMs: 10000, // Flush metrics every 10 seconds
            instanceId: process.env.INSTANCE_ID || 'bot-001',
            maxMemoryMetrics: 1000 // Prevent memory bloat
        };
        
        // Metrics buffers for efficient batch operations
        this.metricsBuffer = [];
        this.realtimeMetrics = new Map();
        
        // Performance tracking (following existing patterns)
        this.lastFlush = Date.now();
        this.totalMetricsCollected = 0;
        this.metricsOverhead = [];
        
        this.init();
    }
    
    init() {
        // Setup periodic flush (non-blocking)
        setInterval(() => {
            this.flushMetrics();
        }, this.config.flushIntervalMs);
        
        // Setup metrics cleanup
        setInterval(() => {
            this.cleanupOldMetrics();
        }, this.config.realTimeRetentionMs / 4); // Cleanup every 15 minutes
        
        console.log('📊 Metrics Collector initialized');
    }
    
    /**
     * Record CV command metrics (called from handleMessage)
     * Zero latency impact - all operations non-blocking
     */
    recordCVCommand(metrics) {
        const startTime = process.hrtime.bigint();
        
        try {
            // Immediate return to avoid blocking CV processing
            setImmediate(() => {
                this.processCVCommandMetrics(metrics, startTime);
            });
        } catch (err) {
            // Graceful degradation - never block CV processing
            console.error('Metrics collection error (non-blocking):', err.message);
        }
    }
    
    processCVCommandMetrics(metrics, collectionStartTime) {
        const timestamp = Date.now();
        
        // Update real-time metrics (Redis preparation)
        this.updateRealtimeMetrics({
            type: 'cv_command',
            latency: metrics.latency,
            success: metrics.success,
            user: metrics.user,
            messageLength: metrics.messageLength,
            timestamp
        });
        
        // Buffer for PostgreSQL batch insert
        this.bufferHistoricalMetric({
            metric_name: 'cv_command_latency',
            metric_value: metrics.latency,
            metadata: {
                instance: this.config.instanceId,
                user: metrics.user,
                success: metrics.success,
                messageLength: metrics.messageLength
            },
            timestamp
        });
        
        // Track metrics collection overhead
        const overhead = Number((process.hrtime.bigint() - collectionStartTime) / 1000000n);
        this.trackOverhead(overhead);
        
        this.totalMetricsCollected++;
    }
    
    /**
     * Record system performance metrics
     */
    recordSystemMetrics() {
        setImmediate(() => {
            const memoryUsage = process.memoryUsage();
            const timestamp = Date.now();
            
            // System metrics for real-time display
            this.updateRealtimeMetrics({
                type: 'system_performance',
                memoryMB: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 10) / 10,
                memoryTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 10) / 10,
                uptime: process.uptime(),
                timestamp
            });
            
            // Buffer for historical storage
            this.bufferHistoricalMetric({
                metric_name: 'system_memory_mb',
                metric_value: memoryUsage.heapUsed / 1024 / 1024,
                metadata: {
                    instance: this.config.instanceId,
                    total: memoryUsage.heapTotal,
                    external: memoryUsage.external
                },
                timestamp
            });
        });
    }
    
    /**
     * Record rate limiting metrics
     */
    recordRateLimitingMetrics(rateLimitStats) {
        setImmediate(() => {
            const timestamp = Date.now();
            
            this.updateRealtimeMetrics({
                type: 'rate_limiting',
                systemTokens: rateLimitStats.systemTokens,
                userBlocks: rateLimitStats.userBlocks,
                systemBlocks: rateLimitStats.systemBlocks,
                variableBlocks: rateLimitStats.variableBlocks,
                totalRequests: rateLimitStats.totalRequests,
                timestamp
            });
            
            // Buffer key rate limiting metrics
            ['userBlocks', 'systemBlocks', 'variableBlocks'].forEach(metric => {
                this.bufferHistoricalMetric({
                    metric_name: `rate_limit_${metric.toLowerCase()}`,
                    metric_value: rateLimitStats[metric] || 0,
                    metadata: {
                        instance: this.config.instanceId,
                        totalRequests: rateLimitStats.totalRequests
                    },
                    timestamp
                });
            });\n        });\n    }\n    \n    /**\n     * Record WebSocket connection metrics\n     */\n    recordWebSocketMetrics(connectionMetrics) {\n        setImmediate(() => {\n            const timestamp = Date.now();\n            \n            this.updateRealtimeMetrics({\n                type: 'websocket_connections',\n                activeConnections: connectionMetrics.activeConnections,\n                totalConnections: connectionMetrics.totalConnections,\n                messagesPerSecond: connectionMetrics.messagesPerSecond,\n                timestamp\n            });\n            \n            this.bufferHistoricalMetric({\n                metric_name: 'websocket_active_connections',\n                metric_value: connectionMetrics.activeConnections,\n                metadata: {\n                    instance: this.config.instanceId,\n                    total: connectionMetrics.totalConnections\n                },\n                timestamp\n            });\n        });\n    }\n    \n    /**\n     * Update real-time metrics map (for Redis storage)\n     */\n    updateRealtimeMetrics(metric) {\n        const key = `${metric.type}_${this.config.instanceId}`;\n        this.realtimeMetrics.set(key, metric);\n        \n        // Prevent memory bloat\n        if (this.realtimeMetrics.size > this.config.maxMemoryMetrics) {\n            const oldestKey = this.realtimeMetrics.keys().next().value;\n            this.realtimeMetrics.delete(oldestKey);\n        }\n    }\n    \n    /**\n     * Buffer metrics for PostgreSQL batch insert\n     */\n    bufferHistoricalMetric(metric) {\n        this.metricsBuffer.push({\n            ...metric,\n            timestamp: new Date(metric.timestamp || Date.now())\n        });\n        \n        // Auto-flush if buffer is full\n        if (this.metricsBuffer.length >= this.config.batchSize) {\n            this.flushMetrics();\n        }\n    }\n    \n    /**\n     * Flush metrics to Redis and PostgreSQL (non-blocking)\n     */\n    async flushMetrics() {\n        try {\n            // Flush to Redis (real-time metrics)\n            await this.flushToRedis();\n            \n            // Flush to PostgreSQL (historical metrics)\n            await this.flushToPostgreSQL();\n            \n            this.lastFlush = Date.now();\n        } catch (err) {\n            console.error('Metrics flush error (non-critical):', err.message);\n            // Continue operation - metrics failure doesn't stop CV processing\n        }\n    }\n    \n    /**\n     * Flush real-time metrics to Redis\n     */\n    async flushToRedis() {\n        if (this.realtimeMetrics.size === 0) return;\n        \n        try {\n            // Aggregate metrics by type for efficient Redis storage\n            const aggregated = this.aggregateRealtimeMetrics();\n            \n            // Store using existing Redis hash pattern\n            await this.redisClient.hSet('metrics:realtime', {\n                ...aggregated,\n                instance: this.config.instanceId,\n                lastUpdate: Date.now().toString(),\n                totalMetricsCollected: this.totalMetricsCollected.toString()\n            });\n            \n            // Publish metrics update for multi-instance coordination\n            await this.publishMetricsUpdate(aggregated);\n            \n        } catch (err) {\n            console.error('Redis metrics flush error:', err.message);\n        }\n    }\n    \n    /**\n     * Aggregate real-time metrics for Redis storage\n     */\n    aggregateRealtimeMetrics() {\n        const aggregated = {};\n        const now = Date.now();\n        \n        // Calculate averages and latest values\n        const cvMetrics = Array.from(this.realtimeMetrics.values())\n            .filter(m => m.type === 'cv_command' && (now - m.timestamp) < 60000); // Last minute\n            \n        if (cvMetrics.length > 0) {\n            aggregated.avgLatency = (cvMetrics.reduce((sum, m) => sum + m.latency, 0) / cvMetrics.length).toFixed(2);\n            aggregated.cvCommandsPerMinute = cvMetrics.length.toString();\n            aggregated.successRate = ((cvMetrics.filter(m => m.success).length / cvMetrics.length) * 100).toFixed(1);\n        }\n        \n        // Latest system metrics\n        const systemMetrics = Array.from(this.realtimeMetrics.values())\n            .filter(m => m.type === 'system_performance')\n            .sort((a, b) => b.timestamp - a.timestamp)[0];\n            \n        if (systemMetrics) {\n            aggregated.memoryMB = systemMetrics.memoryMB.toString();\n            aggregated.uptime = Math.round(systemMetrics.uptime).toString();\n        }\n        \n        // Latest rate limiting metrics\n        const rateLimitMetrics = Array.from(this.realtimeMetrics.values())\n            .filter(m => m.type === 'rate_limiting')\n            .sort((a, b) => b.timestamp - a.timestamp)[0];\n            \n        if (rateLimitMetrics) {\n            aggregated.systemTokens = JSON.stringify(rateLimitMetrics.systemTokens);\n            aggregated.rateLimitBlocks = (rateLimitMetrics.userBlocks + rateLimitMetrics.systemBlocks + rateLimitMetrics.variableBlocks).toString();\n        }\n        \n        return aggregated;\n    }\n    \n    /**\n     * Flush historical metrics to PostgreSQL\n     */\n    async flushToPostgreSQL() {\n        if (!this.pgClient || this.metricsBuffer.length === 0) return;\n        \n        const batch = this.metricsBuffer.splice(0, this.config.batchSize);\n        \n        try {\n            // Use existing non-blocking pattern\n            setImmediate(async () => {\n                const values = batch.map((metric, index) => {\n                    const offset = index * 4;\n                    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;\n                }).join(', ');\n                \n                const params = batch.flatMap(metric => [\n                    metric.metric_name,\n                    metric.metric_value,\n                    JSON.stringify(metric.metadata),\n                    metric.timestamp\n                ]);\n                \n                const sql = `\n                    INSERT INTO system_metrics (metric_name, metric_value, metadata, timestamp) \n                    VALUES ${values}\n                `;\n                \n                await this.pgClient.query(sql, params);\n            });\n        } catch (err) {\n            console.error('PostgreSQL metrics insert error:', err.message);\n            // Re-buffer failed metrics for retry\n            this.metricsBuffer.unshift(...batch.slice(0, 10)); // Keep only recent failed metrics\n        }\n    }\n    \n    /**\n     * Publish metrics update for multi-instance coordination\n     */\n    async publishMetricsUpdate(metrics) {\n        try {\n            const event = {\n                timestamp: Date.now(),\n                type: 'metrics_update',\n                data: {\n                    metrics,\n                    instance: this.config.instanceId,\n                    overhead: this.getAverageOverhead()\n                }\n            };\n            \n            // Use existing pub/sub channel pattern\n            await this.redisClient.publish('cv:system:broadcast', JSON.stringify(event));\n        } catch (err) {\n            console.error('Metrics publish error:', err.message);\n        }\n    }\n    \n    /**\n     * Track metrics collection overhead\n     */\n    trackOverhead(overhead) {\n        this.metricsOverhead.push(overhead);\n        \n        // Keep only recent overhead measurements\n        if (this.metricsOverhead.length > 100) {\n            this.metricsOverhead.shift();\n        }\n    }\n    \n    /**\n     * Get average metrics collection overhead\n     */\n    getAverageOverhead() {\n        if (this.metricsOverhead.length === 0) return 0;\n        return this.metricsOverhead.reduce((sum, val) => sum + val, 0) / this.metricsOverhead.length;\n    }\n    \n    /**\n     * Cleanup old metrics from memory\n     */\n    cleanupOldMetrics() {\n        const cutoff = Date.now() - this.config.realTimeRetentionMs;\n        \n        for (const [key, metric] of this.realtimeMetrics.entries()) {\n            if (metric.timestamp < cutoff) {\n                this.realtimeMetrics.delete(key);\n            }\n        }\n        \n        console.log(`🧹 Cleaned up old metrics, ${this.realtimeMetrics.size} active metrics in memory`);\n    }\n    \n    /**\n     * Get current metrics statistics\n     */\n    getStats() {\n        return {\n            totalMetricsCollected: this.totalMetricsCollected,\n            activeMetricsInMemory: this.realtimeMetrics.size,\n            pendingHistoricalMetrics: this.metricsBuffer.length,\n            averageOverheadMs: this.getAverageOverhead(),\n            lastFlush: this.lastFlush,\n            instanceId: this.config.instanceId\n        };\n    }\n    \n    /**\n     * Emergency cleanup - clear all buffered metrics\n     */\n    emergencyCleanup() {\n        this.metricsBuffer.length = 0;\n        this.realtimeMetrics.clear();\n        this.metricsOverhead.length = 0;\n        console.log('🚨 Emergency metrics cleanup completed');\n    }\n}\n\nmodule.exports = MetricsCollector;