/**
 * TPP-Inspired Hybrid Rate Limiting System
 * 3-Tier Architecture: User Fairness + System Protection + Chaos Mitigation
 */

class TokenBucket {
    constructor({ capacity, refillRate, refillPeriod = 1000 }) {
        this.capacity = capacity;
        this.tokens = capacity;
        this.refillRate = refillRate;
        this.refillPeriod = refillPeriod;
        this.lastRefill = Date.now();
    }
    
    consume(tokens = 1) {
        this.refill();
        if (this.tokens >= tokens) {
            this.tokens -= tokens;
            return true;
        }
        return false;
    }
    
    refill() {
        const now = Date.now();
        const timePassed = now - this.lastRefill;
        const tokensToAdd = Math.floor((timePassed / this.refillPeriod) * this.refillRate);
        
        this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }
    
    getStatus() {
        this.refill();
        return {
            tokens: this.tokens,
            capacity: this.capacity,
            percentage: (this.tokens / this.capacity) * 100
        };
    }
}

class HybridRateLimiter {
    constructor(redisClient, options = {}) {
        this.redisClient = redisClient;
        
        // Configuration with TPP-inspired defaults
        this.config = {
            // Tier 1: User Fairness (existing cooldown system enhanced)
            userCooldownMs: options.userCooldownMs || 1000,
            
            // Tier 2: System Protection (TPP global rate limiting)
            systemTokens: {
                capacity: options.systemCapacity || 100,
                refillRate: options.systemRefillRate || 10, // tokens per second
                refillPeriod: 1000
            },
            
            // Tier 3: Variable Protection (chaos mitigation)
            variableTokens: {
                capacity: options.variableCapacity || 20,
                refillRate: options.variableRefillRate || 2, // tokens per second
                refillPeriod: 1000
            },
            
            // Admin Override (elevated permissions)
            adminTokens: {
                capacity: options.adminCapacity || 1000,
                refillRate: options.adminRefillRate || 100, // tokens per second
                refillPeriod: 1000
            },
            
            // Performance settings
            maxVariableBuckets: options.maxVariableBuckets || 500,
            cleanupInterval: options.cleanupInterval || 60000 // 1 minute
        };
        
        // Tier 1: User cooldowns (Redis-backed)
        // Managed in Redis with keys: cooldown:username
        
        // Tier 2: Global system protection
        this.systemTokenBucket = new TokenBucket(this.config.systemTokens);
        
        // Tier 3: Per-variable token buckets (chaos mitigation)
        this.variableTokenBuckets = new Map();
        
        // Admin token buckets (elevated access)
        this.adminTokenBuckets = new Map();
        
        // Monitoring and cleanup
        this.stats = {
            userBlocks: 0,
            systemBlocks: 0,
            variableBlocks: 0,
            adminOverrides: 0,
            totalRequests: 0
        };
        
        this.setupCleanup();
    }
    
    /**
     * Main rate limiting check - implements 3-tier TPP architecture
     */
    async checkRateLimit(username, variable, isAdmin = false) {
        this.stats.totalRequests++;
        
        try {
            // Admin fast path with elevated tokens
            if (isAdmin) {
                return await this.checkAdminRateLimit(username, variable);
            }
            
            // Tier 1: User fairness check (Redis-backed cooldown)
            const userAllowed = await this.checkUserCooldown(username);
            if (!userAllowed) {
                this.stats.userBlocks++;
                return {
                    allowed: false,
                    reason: 'user_cooldown',
                    tier: 1,
                    waitTime: this.config.userCooldownMs
                };
            }
            
            // Tier 2: System protection check (global token bucket)
            const systemAllowed = this.systemTokenBucket.consume(1);
            if (!systemAllowed) {
                this.stats.systemBlocks++;
                return {
                    allowed: false,
                    reason: 'system_overload',
                    tier: 2,
                    systemStatus: this.systemTokenBucket.getStatus()
                };
            }
            
            // Tier 3: Variable protection check (chaos mitigation)
            const variableAllowed = this.checkVariableTokenBucket(variable);
            if (!variableAllowed) {
                this.stats.variableBlocks++;
                return {
                    allowed: false,
                    reason: 'variable_spam',
                    tier: 3,
                    variable
                };
            }
            
            // All tiers passed - update user cooldown
            await this.updateUserCooldown(username);
            
            return {
                allowed: true,
                tier: 'all_passed'
            };
            
        } catch (err) {
            console.error('Rate limit check error:', err);
            // Fail open for system resilience
            return { allowed: true, error: err.message };
        }
    }
    
    /**
     * Admin rate limiting with elevated token allocation
     */
    async checkAdminRateLimit(username, variable) {
        // Get or create admin token bucket
        if (!this.adminTokenBuckets.has(username)) {
            this.adminTokenBuckets.set(username, new TokenBucket(this.config.adminTokens));
        }
        
        const adminBucket = this.adminTokenBuckets.get(username);
        const allowed = adminBucket.consume(1);
        
        if (allowed) {
            this.stats.adminOverrides++;
            // Still update user cooldown for consistency
            await this.updateUserCooldown(username);
            
            return {
                allowed: true,
                tier: 'admin_override',
                adminStatus: adminBucket.getStatus()
            };
        } else {
            return {
                allowed: false,
                reason: 'admin_quota_exceeded',
                tier: 'admin',
                adminStatus: adminBucket.getStatus()
            };
        }
    }
    
    /**
     * Tier 1: User cooldown check (fairness)
     */
    async checkUserCooldown(username) {
        try {
            const lastCommandTime = await this.redisClient.get(`cooldown:${username}`);
            if (!lastCommandTime) return true;
            
            const timeSinceLastCommand = Date.now() - parseInt(lastCommandTime);
            return timeSinceLastCommand >= this.config.userCooldownMs;
        } catch (err) {
            console.error('User cooldown check error:', err);
            return true; // Fail open
        }
    }
    
    /**
     * Update user cooldown timestamp
     */
    async updateUserCooldown(username) {
        try {
            const expiry = Math.ceil(this.config.userCooldownMs / 1000) + 1;
            await this.redisClient.setEx(`cooldown:${username}`, expiry, Date.now().toString());
        } catch (err) {
            console.error('User cooldown update error:', err);
        }
    }
    
    /**
     * Tier 3: Variable-specific token bucket (chaos mitigation)
     */
    checkVariableTokenBucket(variable) {
        // Get or create variable token bucket
        if (!this.variableTokenBuckets.has(variable)) {
            // Limit total variable buckets to prevent memory bloat
            if (this.variableTokenBuckets.size >= this.config.maxVariableBuckets) {
                this.cleanupOldVariableBuckets();
            }
            
            this.variableTokenBuckets.set(variable, {
                bucket: new TokenBucket(this.config.variableTokens),
                lastUsed: Date.now()
            });
        }
        
        const variableData = this.variableTokenBuckets.get(variable);
        variableData.lastUsed = Date.now();
        
        return variableData.bucket.consume(1);
    }
    
    /**
     * Cleanup old variable token buckets (memory management)
     */
    cleanupOldVariableBuckets() {
        const cutoffTime = Date.now() - (this.config.cleanupInterval * 2);
        const toDelete = [];
        
        for (const [variable, data] of this.variableTokenBuckets.entries()) {
            if (data.lastUsed < cutoffTime) {
                toDelete.push(variable);
            }
        }
        
        toDelete.forEach(variable => {
            this.variableTokenBuckets.delete(variable);
        });
        
        if (toDelete.length > 0) {
            console.log(`🧹 Cleaned up ${toDelete.length} old variable token buckets`);
        }
    }
    
    /**
     * Setup periodic cleanup
     */
    setupCleanup() {
        setInterval(() => {
            this.cleanupOldVariableBuckets();
        }, this.config.cleanupInterval);
    }
    
    /**
     * Get comprehensive rate limiting statistics
     */
    getStats() {
        return {
            ...this.stats,
            systemTokens: this.systemTokenBucket.getStatus(),
            variableBuckets: this.variableTokenBuckets.size,
            adminBuckets: this.adminTokenBuckets.size,
            config: this.config
        };
    }
    
    /**
     * Reset statistics (for monitoring)
     */
    resetStats() {
        this.stats = {
            userBlocks: 0,
            systemBlocks: 0,
            variableBlocks: 0,
            adminOverrides: 0,
            totalRequests: 0
        };
    }
    
    /**
     * Emergency override for system maintenance
     */
    emergencyOverride(enabled = true) {
        if (enabled) {
            // Fill all buckets to capacity
            this.systemTokenBucket.tokens = this.systemTokenBucket.capacity;
            
            for (const [variable, data] of this.variableTokenBuckets.entries()) {
                data.bucket.tokens = data.bucket.capacity;
            }
            
            for (const [admin, bucket] of this.adminTokenBuckets.entries()) {
                bucket.tokens = bucket.capacity;
            }
            
            console.log('🚨 Emergency override activated - all rate limits bypassed');
        }
    }
    
    /**
     * Configure rate limiting parameters at runtime
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Update system token bucket if capacity changed
        if (newConfig.systemCapacity || newConfig.systemRefillRate) {
            this.systemTokenBucket = new TokenBucket({
                capacity: this.config.systemTokens.capacity,
                refillRate: this.config.systemTokens.refillRate,
                refillPeriod: this.config.systemTokens.refillPeriod
            });
        }
        
        console.log('⚙️ Rate limiting configuration updated:', newConfig);
    }
}

module.exports = { HybridRateLimiter, TokenBucket };