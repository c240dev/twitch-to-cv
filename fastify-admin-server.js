/**
 * Fastify Admin GUI Server
 * High-performance API foundation for admin interface
 */

const fastify = require('fastify')({ 
    logger: {
        level: process.env.LOG_LEVEL || 'info',
        prettyPrint: process.env.NODE_ENV !== 'production'
    }
});

const redis = require('redis');
const { Client } = require('pg');

class FastifyAdminServer {
    constructor() {
        this.fastify = fastify;
        this.redisClient = null;
        this.pgClient = null;
        this.rateLimitStats = new Map();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupDatabase();
        
        // Graceful shutdown
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
    }
    
    async setupDatabase() {
        // Redis connection
        this.redisClient = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        
        await this.redisClient.connect();
        this.fastify.log.info('✅ Admin server connected to Redis');
        
        // PostgreSQL connection
        try {
            this.pgClient = new Client({
                connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/twitch_cv'
            });
            await this.pgClient.connect();
            this.fastify.log.info('✅ Admin server connected to PostgreSQL');
        } catch (err) {
            this.fastify.log.warn('⚠️ PostgreSQL connection failed, analytics disabled');
        }
    }
    
    setupMiddleware() {
        // CORS for admin GUI
        this.fastify.register(require('@fastify/cors'), {
            origin: process.env.ADMIN_GUI_ORIGIN || 'http://localhost:3002',
            credentials: true
        });
        
        // Static file serving for admin GUI
        this.fastify.register(require('@fastify/static'), {
            root: require('path').join(__dirname, 'admin-gui'),
            prefix: '/'
        });
        
        // Rate limiting for API endpoints
        this.fastify.register(require('@fastify/rate-limit'), {
            max: 100,
            timeWindow: '1 minute'
        });
        
        // Authentication middleware (placeholder)
        this.fastify.register(require('@fastify/auth'));
        
        // WebSocket support for real-time admin updates
        this.fastify.register(require('@fastify/websocket'));
        
        // JSON schema validation
        this.fastify.addSchema({
            $id: 'cvCommand',
            type: 'object',
            properties: {
                variable: { type: 'string', pattern: '^[a-zA-Z0-9#.]+$' },
                value: { type: 'integer', minimum: 0, maximum: 127 },
                user: { type: 'string' }
            },
            required: ['variable', 'value', 'user']
        });
    }
    
    setupRoutes() {
        // Health check
        this.fastify.get('/health', async (request, reply) => {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                connections: {
                    redis: this.redisClient?.isOpen || false,
                    postgresql: this.pgClient ? true : false
                }
            };
            
            reply.code(200).send(health);
        });
        
        // System status endpoint
        this.fastify.get('/api/status', async (request, reply) => {
            try {
                const activeVariables = await this.redisClient.hGetAll('active_variables');
                const systemState = await this.redisClient.hGetAll('system:state');
                
                const status = {
                    activeVariableCount: Object.keys(activeVariables).length,
                    activeVariables: Object.entries(activeVariables).map(([key, value]) => ({
                        variable: key,
                        value: parseInt(value)
                    })),
                    overlayEnabled: systemState.overlayEnabled === 'true',
                    lastCommand: systemState.lastCommand || null,
                    systemLatency: parseInt(systemState.systemLatency) || 0,
                    timestamp: Date.now()
                };
                
                reply.send(status);
            } catch (err) {
                this.fastify.log.error('Status endpoint error:', err);
                reply.code(500).send({ error: 'Failed to get system status' });
            }
        });
        
        // Rate limiting statistics
        this.fastify.get('/api/rate-limits', async (request, reply) => {
            try {
                // Get rate limiting stats from Redis
                const stats = await this.getRateLimitStats();
                reply.send(stats);
            } catch (err) {
                this.fastify.log.error('Rate limit stats error:', err);
                reply.code(500).send({ error: 'Failed to get rate limit stats' });
            }
        });
        
        // Active variables management
        this.fastify.get('/api/variables', async (request, reply) => {
            try {
                const activeVariables = await this.redisClient.hGetAll('active_variables');
                const variables = Object.entries(activeVariables).map(([variable, value]) => ({
                    variable,
                    value: parseInt(value),
                    module: this.extractModule(variable)
                }));
                
                // Group by module
                const grouped = variables.reduce((acc, item) => {
                    const module = item.module || 'ungrouped';
                    if (!acc[module]) acc[module] = [];
                    acc[module].push(item);
                    return acc;
                }, {});
                
                reply.send({ variables, grouped });
            } catch (err) {
                this.fastify.log.error('Variables endpoint error:', err);
                reply.code(500).send({ error: 'Failed to get variables' });
            }
        });
        
        // Manual CV command (admin override)
        this.fastify.post('/api/cv-command', {
            schema: {
                body: { $ref: 'cvCommand#' }
            }
        }, async (request, reply) => {
            try {
                const { variable, value, user } = request.body;
                
                // Set in Redis
                await this.redisClient.hSet('active_variables', variable, value.toString());
                
                // Publish event for bot coordination
                const event = {
                    timestamp: Date.now(),
                    type: 'admin_cv_command',
                    data: { variable, value, user, source: 'admin_gui' }
                };
                
                await this.redisClient.publish('cv:parameter:update', JSON.stringify(event));
                
                this.fastify.log.info(`Admin CV command: ${variable} = ${value} by ${user}`);
                reply.send({ success: true, variable, value });
                
            } catch (err) {
                this.fastify.log.error('CV command error:', err);
                reply.code(500).send({ error: 'Failed to process CV command' });
            }
        });
        
        // Clear all variables
        this.fastify.delete('/api/variables', async (request, reply) => {
            try {
                await this.redisClient.del('active_variables');
                
                // Broadcast clear event
                const event = {
                    timestamp: Date.now(),
                    type: 'system_broadcast',
                    data: { action: 'clear_all', source: 'admin_gui' }
                };
                
                await this.redisClient.publish('cv:system:broadcast', JSON.stringify(event));
                
                this.fastify.log.info('Admin cleared all variables');
                reply.send({ success: true, message: 'All variables cleared' });
                
            } catch (err) {
                this.fastify.log.error('Clear variables error:', err);
                reply.code(500).send({ error: 'Failed to clear variables' });
            }
        });
        
        // Analytics endpoints
        if (this.pgClient) {
            this.fastify.get('/api/analytics/commands', async (request, reply) => {
                try {
                    const { timeframe = '24h' } = request.query;
                    const interval = this.getTimeInterval(timeframe);
                    
                    const result = await this.pgClient.query(`
                        SELECT 
                            DATE_TRUNC($1, timestamp) as time_bucket,
                            COUNT(*) as command_count,
                            COUNT(DISTINCT username) as unique_users,
                            AVG(processing_time_ms) as avg_latency
                        FROM cv_commands 
                        WHERE timestamp > NOW() - INTERVAL $2
                        GROUP BY time_bucket
                        ORDER BY time_bucket
                    `, [interval.truncate, interval.duration]);
                    
                    reply.send({ analytics: result.rows, timeframe });
                } catch (err) {
                    this.fastify.log.error('Analytics error:', err);
                    reply.code(500).send({ error: 'Failed to get analytics' });
                }
            });
        }
        
        // WebSocket for real-time admin updates
        this.fastify.register(async function (fastify) {
            fastify.get('/ws/admin', { websocket: true }, (connection, req) => {
                connection.socket.on('message', message => {
                    // Handle admin WebSocket messages
                    fastify.log.info('Admin WebSocket message:', message.toString());
                });
                
                // Send initial status
                connection.socket.send(JSON.stringify({
                    type: 'connection',
                    status: 'connected',
                    timestamp: Date.now()
                }));
            });
        });
    }
    
    extractModule(variable) {
        const match = variable.match(/^([a-zA-Z]+)#(\d+)/);
        return match ? `${match[1]}#${match[2]}` : null;
    }
    
    getTimeInterval(timeframe) {
        const intervals = {
            '1h': { truncate: 'minute', duration: '1 hour' },
            '24h': { truncate: 'hour', duration: '24 hours' },
            '7d': { truncate: 'day', duration: '7 days' },
            '30d': { truncate: 'day', duration: '30 days' }
        };
        return intervals[timeframe] || intervals['24h'];
    }
    
    async getRateLimitStats() {
        // This would integrate with the rate limiter in the main bot
        // For now, return mock data structure
        return {
            systemTokens: { tokens: 85, capacity: 100, percentage: 85 },
            userCooldowns: await this.redisClient.keys('cooldown:*').then(keys => keys.length),
            variableBuckets: 12,
            adminBuckets: 3,
            totalRequests: 1247,
            blockedRequests: 23,
            timestamp: Date.now()
        };
    }
    
    async start(port = 3002) {
        try {
            await this.fastify.listen({ port, host: '0.0.0.0' });
            this.fastify.log.info(`🚀 Fastify Admin Server listening on port ${port}`);
        } catch (err) {
            this.fastify.log.error('Failed to start admin server:', err);
            process.exit(1);
        }
    }
    
    async shutdown() {
        this.fastify.log.info('🛑 Shutting down Fastify Admin Server...');
        
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
}

// Start server if run directly
if (require.main === module) {
    const server = new FastifyAdminServer();
    server.start(process.env.ADMIN_PORT || 3002);
}

module.exports = FastifyAdminServer;