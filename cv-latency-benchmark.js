/**
 * CV Latency Benchmark - Focused <10ms latency validation
 * Micro-benchmark for critical CV control pipeline performance
 * 
 * Enhanced Claude Development Protocol v1.4 - Phase 1: Draft Implementation
 */

const config = require('./config');
const { HybridRateLimiter } = require('./rate-limiter');
const redis = require('redis');

class CVLatencyBenchmark {
    constructor() {
        this.config = config;
        this.redisClient = null;
        this.rateLimiter = null;
        
        // Benchmark configuration
        this.benchmarkConfig = {
            iterations: parseInt(process.env.BENCHMARK_ITERATIONS) || 10000,
            warmupIterations: parseInt(process.env.BENCHMARK_WARMUP) || 1000,
            targetLatencyMs: 10,
            warningLatencyMs: 8,
            cooldownMs: 1, // Minimal cooldown for benchmark
            batchSize: 100 // Process in batches for statistical accuracy
        };
        
        // Benchmark state
        this.measurements = [];
        this.componentTimings = {
            validation: [],
            rateLimit: [],
            redisOps: [],
            osccMessage: [],
            totalPipeline: []
        };
        
        // Test messages for consistent benchmarking
        this.testMessages = this.generateTestMessages();
        
        console.log('⚡ CV Latency Benchmark initialized');
    }
    
    async init() {
        await this.setupRedis();
        this.setupRateLimiter();
        
        console.log('🎯 CV Latency Benchmark ready');
    }
    
    async setupRedis() {
        this.redisClient = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        
        await this.redisClient.connect();
        console.log('✅ Benchmark connected to Redis');
    }
    
    setupRateLimiter() {
        this.rateLimiter = new HybridRateLimiter(this.redisClient, {
            userCooldownMs: this.benchmarkConfig.cooldownMs,
            systemCapacity: 10000, // High capacity for benchmarking
            systemRefillRate: 1000,
            variableCapacity: 1000,
            variableRefillRate: 100,
            adminCapacity: 10000,
            adminRefillRate: 1000
        });
        
        console.log('🛡️ Benchmark rate limiter configured');
    }
    
    generateTestMessages() {
        const messages = [];
        const modules = ['doorway', 'visualcortex', 'topogram', 'navigator'];
        const parameters = ['threshold', 'keyer', 'gain', 'offset'];
        
        // Generate diverse test messages
        for (let i = 0; i < 1000; i++) {
            const module = modules[i % modules.length];
            const instance = (i % 4) + 1;
            const parameter = parameters[i % parameters.length];
            const value = i % 128;
            
            messages.push(`${module}#${instance}.${parameter}: ${value}`);
        }
        
        return messages;
    }
    
    async runLatencyBenchmark() {
        console.log(`🏃 Running CV latency benchmark (${this.benchmarkConfig.iterations} iterations)`);
        
        // Warmup phase
        await this.runWarmup();
        
        // Clear measurements
        this.measurements = [];
        this.resetComponentTimings();
        
        // Main benchmark
        const batchCount = Math.ceil(this.benchmarkConfig.iterations / this.benchmarkConfig.batchSize);
        
        for (let batch = 0; batch < batchCount; batch++) {
            const batchSize = Math.min(
                this.benchmarkConfig.batchSize,
                this.benchmarkConfig.iterations - (batch * this.benchmarkConfig.batchSize)
            );
            
            await this.runBenchmarkBatch(batch, batchSize);
            
            // Brief pause between batches to prevent overwhelming
            if (batch < batchCount - 1) {
                await this.sleep(10);
            }
            
            // Progress reporting
            if ((batch + 1) % 10 === 0) {
                const progress = ((batch + 1) / batchCount * 100).toFixed(1);
                console.log(`📊 Progress: ${progress}% (${(batch + 1) * this.benchmarkConfig.batchSize} iterations)`);
            }
        }
        
        // Analyze results
        const analysis = this.analyzeLatencyResults();
        
        console.log('✅ CV latency benchmark completed');
        return analysis;
    }
    
    async runWarmup() {
        console.log(`🔥 Warmup phase (${this.benchmarkConfig.warmupIterations} iterations)`);
        
        for (let i = 0; i < this.benchmarkConfig.warmupIterations; i++) {
            const message = this.testMessages[i % this.testMessages.length];
            const username = `warmup_user_${i % 10}`;
            
            await this.benchmarkCVPipeline(message, username);
            
            if (i > 0 && i % 100 === 0) {
                await this.sleep(1); // Brief pause
            }
        }
        
        console.log('🔥 Warmup completed');
    }
    
    async runBenchmarkBatch(batchIndex, batchSize) {
        const batchPromises = [];
        
        for (let i = 0; i < batchSize; i++) {
            const globalIndex = (batchIndex * this.benchmarkConfig.batchSize) + i;
            const message = this.testMessages[globalIndex % this.testMessages.length];
            const username = `bench_user_${globalIndex % 100}`; // 100 different users
            
            // Don't await - collect promises for batch processing
            batchPromises.push(this.benchmarkCVPipeline(message, username));
        }
        
        // Execute batch and collect results
        const batchResults = await Promise.all(batchPromises);
        this.measurements.push(...batchResults);
    }
    
    async benchmarkCVPipeline(message, username) {
        const pipelineStartTime = process.hrtime.bigint();
        const measurement = {\n            message,\n            username,\n            timestamp: Date.now(),\n            timings: {},\n            success: false,\n            error: null\n        };\n        \n        try {\n            // Phase 1: Message Validation (following enhanced-bot.js patterns)\n            const validationStartTime = process.hrtime.bigint();\n            const isValidMessage = this.benchmarkMessageValidation(message);\n            const validationTime = Number((process.hrtime.bigint() - validationStartTime) / 1000000n);\n            measurement.timings.validation = validationTime;\n            this.componentTimings.validation.push(validationTime);\n            \n            if (!isValidMessage) {\n                measurement.error = 'validation_failed';\n                measurement.totalLatency = Number((process.hrtime.bigint() - pipelineStartTime) / 1000000n);\n                return measurement;\n            }\n            \n            // Phase 2: Rate Limiting Check\n            const rateLimitStartTime = process.hrtime.bigint();\n            const rateLimitResult = await this.benchmarkRateLimit(username, message);\n            const rateLimitTime = Number((process.hrtime.bigint() - rateLimitStartTime) / 1000000n);\n            measurement.timings.rateLimit = rateLimitTime;\n            this.componentTimings.rateLimit.push(rateLimitTime);\n            \n            if (!rateLimitResult.allowed) {\n                measurement.error = 'rate_limited';\n                measurement.totalLatency = Number((process.hrtime.bigint() - pipelineStartTime) / 1000000n);\n                return measurement;\n            }\n            \n            // Phase 3: Redis Operations (state storage)\n            const redisStartTime = process.hrtime.bigint();\n            await this.benchmarkRedisOperations(message, username);\n            const redisTime = Number((process.hrtime.bigint() - redisStartTime) / 1000000n);\n            measurement.timings.redisOps = redisTime;\n            this.componentTimings.redisOps.push(redisTime);\n            \n            // Phase 4: OSC Message Preparation (simulated)\n            const oscStartTime = process.hrtime.bigint();\n            this.benchmarkOSCMessage(message);\n            const oscTime = Number((process.hrtime.bigint() - oscStartTime) / 1000000n);\n            measurement.timings.oscMessage = oscTime;\n            this.componentTimings.osccMessage.push(oscTime);\n            \n            // Calculate total pipeline latency\n            const totalLatency = Number((process.hrtime.bigint() - pipelineStartTime) / 1000000n);\n            measurement.totalLatency = totalLatency;\n            measurement.success = true;\n            \n            this.componentTimings.totalPipeline.push(totalLatency);\n            \n        } catch (err) {\n            measurement.error = err.message;\n            measurement.totalLatency = Number((process.hrtime.bigint() - pipelineStartTime) / 1000000n);\n        }\n        \n        return measurement;\n    }\n    \n    benchmarkMessageValidation(message) {\n        // Replicate enhanced-bot.js validation logic exactly\n        if (!this.isValidCVMessage(message)) {\n            return false;\n        }\n        \n        const validationResult = this.config.validateLZXVariable(message);\n        return validationResult ? true : false;\n    }\n    \n    isValidCVMessage(message) {\n        // Replicate enhanced-bot.js early filtering (lines 333-341)\n        if (message.length < 5 || message.length > 100) return false;\n        if (!message.includes('#')) return false;\n        if (!message.includes('.')) return false;\n        if (!message.includes(':')) return false;\n        \n        return true;\n    }\n    \n    async benchmarkRateLimit(username, message) {\n        // Extract variable for rate limiting\n        const validationResult = this.config.validateLZXVariable(message);\n        const variable = validationResult ? validationResult.fullVariable : null;\n        \n        // Use actual rate limiter\n        return await this.rateLimiter.checkRateLimit(username, variable, false);\n    }\n    \n    async benchmarkRedisOperations(message, username) {\n        // Simulate Redis operations from enhanced-bot.js\n        const validationResult = this.config.validateLZXVariable(message);\n        if (!validationResult) return;\n        \n        const { fullVariable, value } = validationResult;\n        \n        // Store in Redis (key operation from enhanced-bot.js line 373)\n        await this.redisClient.hSet('benchmark:active_variables', fullVariable, value.toString());\n        \n        // Update system state (from enhanced-bot.js lines 394-397)\n        await this.redisClient.hSet('benchmark:system:state', {\n            lastCommand: `${fullVariable}: ${value}`,\n            systemLatency: '0' // Will be updated with actual measurement\n        });\n    }\n    \n    benchmarkOSCMessage(message) {\n        // Simulate OSC message preparation (enhanced-bot.js lines 508-515)\n        const validationResult = this.config.validateLZXVariable(message);\n        if (!validationResult) return;\n        \n        const { fullVariable, value } = validationResult;\n        \n        // Simulate message preparation overhead\n        const oscMessage = {\n            address: '/cv',\n            args: [fullVariable, value]\n        };\n        \n        // Simulate serialization overhead\n        JSON.stringify(oscMessage);\n    }\n    \n    analyzeLatencyResults() {\n        const successfulMeasurements = this.measurements.filter(m => m.success);\n        const totalLatencies = successfulMeasurements.map(m => m.totalLatency);\n        \n        if (totalLatencies.length === 0) {\n            return {\n                error: 'No successful measurements',\n                totalIterations: this.measurements.length,\n                failureCount: this.measurements.length\n            };\n        }\n        \n        const sortedLatencies = totalLatencies.sort((a, b) => a - b);\n        const componentAnalysis = this.analyzeComponentTimings();\n        \n        const analysis = {\n            summary: {\n                totalIterations: this.measurements.length,\n                successfulIterations: successfulMeasurements.length,\n                failureCount: this.measurements.length - successfulMeasurements.length,\n                successRate: (successfulMeasurements.length / this.measurements.length) * 100\n            },\n            latencyStatistics: {\n                count: sortedLatencies.length,\n                mean: sortedLatencies.reduce((sum, val) => sum + val, 0) / sortedLatencies.length,\n                median: sortedLatencies[Math.floor(sortedLatencies.length / 2)],\n                min: sortedLatencies[0],\n                max: sortedLatencies[sortedLatencies.length - 1],\n                percentiles: {\n                    p90: sortedLatencies[Math.floor(sortedLatencies.length * 0.9)],\n                    p95: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)],\n                    p99: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)],\n                    p999: sortedLatencies[Math.floor(sortedLatencies.length * 0.999)]\n                }\n            },\n            componentBreakdown: componentAnalysis,\n            complianceCheck: this.checkLatencyCompliance(sortedLatencies),\n            recommendations: this.generateLatencyRecommendations(sortedLatencies, componentAnalysis)\n        };\n        \n        return analysis;\n    }\n    \n    analyzeComponentTimings() {\n        const componentAnalysis = {};\n        \n        Object.keys(this.componentTimings).forEach(component => {\n            const timings = this.componentTimings[component];\n            if (timings.length === 0) {\n                componentAnalysis[component] = { error: 'No measurements' };\n                return;\n            }\n            \n            const sorted = timings.sort((a, b) => a - b);\n            \n            componentAnalysis[component] = {\n                count: sorted.length,\n                mean: sorted.reduce((sum, val) => sum + val, 0) / sorted.length,\n                median: sorted[Math.floor(sorted.length / 2)],\n                min: sorted[0],\n                max: sorted[sorted.length - 1],\n                p95: sorted[Math.floor(sorted.length * 0.95)],\n                percentage: 0 // Will be calculated after total\n            };\n        });\n        \n        // Calculate component percentages of total latency\n        const totalMean = componentAnalysis.totalPipeline?.mean || 0;\n        if (totalMean > 0) {\n            Object.keys(componentAnalysis).forEach(component => {\n                if (component !== 'totalPipeline' && componentAnalysis[component].mean) {\n                    componentAnalysis[component].percentage = \n                        (componentAnalysis[component].mean / totalMean) * 100;\n                }\n            });\n        }\n        \n        return componentAnalysis;\n    }\n    \n    checkLatencyCompliance(sortedLatencies) {\n        const targetCompliant = sortedLatencies.filter(l => l <= this.benchmarkConfig.targetLatencyMs).length;\n        const warningCompliant = sortedLatencies.filter(l => l <= this.benchmarkConfig.warningLatencyMs).length;\n        \n        return {\n            targetLatencyMs: this.benchmarkConfig.targetLatencyMs,\n            warningLatencyMs: this.benchmarkConfig.warningLatencyMs,\n            targetCompliance: {\n                count: targetCompliant,\n                percentage: (targetCompliant / sortedLatencies.length) * 100,\n                passed: (targetCompliant / sortedLatencies.length) >= 0.95 // 95% compliance\n            },\n            warningCompliance: {\n                count: warningCompliant,\n                percentage: (warningCompliant / sortedLatencies.length) * 100,\n                passed: (warningCompliant / sortedLatencies.length) >= 0.99 // 99% under warning\n            },\n            p95Compliance: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] <= this.benchmarkConfig.targetLatencyMs,\n            p99Compliance: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] <= this.benchmarkConfig.targetLatencyMs * 1.5\n        };\n    }\n    \n    generateLatencyRecommendations(latencies, componentAnalysis) {\n        const recommendations = [];\n        const compliance = this.checkLatencyCompliance(latencies);\n        \n        // Overall latency recommendations\n        if (!compliance.targetCompliance.passed) {\n            recommendations.push({\n                category: 'latency',\n                priority: 'critical',\n                issue: `Only ${compliance.targetCompliance.percentage.toFixed(1)}% of requests meet <${this.benchmarkConfig.targetLatencyMs}ms target`,\n                recommendation: 'Critical performance optimization required across all pipeline components'\n            });\n        }\n        \n        if (!compliance.p95Compliance) {\n            recommendations.push({\n                category: 'latency',\n                priority: 'high',\n                issue: 'P95 latency exceeds target',\n                recommendation: 'Focus on optimizing worst-case performance scenarios'\n            });\n        }\n        \n        // Component-specific recommendations\n        Object.keys(componentAnalysis).forEach(component => {\n            const analysis = componentAnalysis[component];\n            if (analysis.error) return;\n            \n            // Identify bottleneck components\n            if (analysis.percentage > 40) {\n                recommendations.push({\n                    category: 'component',\n                    priority: 'high',\n                    issue: `${component} component represents ${analysis.percentage.toFixed(1)}% of total latency`,\n                    recommendation: `Optimize ${component} implementation for better performance`\n                });\n            }\n            \n            // Check for excessive component latency\n            if (component === 'validation' && analysis.mean > 2) {\n                recommendations.push({\n                    category: 'validation',\n                    priority: 'medium',\n                    issue: `Message validation taking ${analysis.mean.toFixed(2)}ms average`,\n                    recommendation: 'Consider regex optimization or caching validation results'\n                });\n            }\n            \n            if (component === 'rateLimit' && analysis.mean > 3) {\n                recommendations.push({\n                    category: 'rateLimit',\n                    priority: 'medium',\n                    issue: `Rate limiting taking ${analysis.mean.toFixed(2)}ms average`,\n                    recommendation: 'Optimize Redis operations or token bucket calculations'\n                });\n            }\n            \n            if (component === 'redisOps' && analysis.mean > 5) {\n                recommendations.push({\n                    category: 'redis',\n                    priority: 'high',\n                    issue: `Redis operations taking ${analysis.mean.toFixed(2)}ms average`,\n                    recommendation: 'Check Redis connection, consider connection pooling or local caching'\n                });\n            }\n        });\n        \n        return recommendations;\n    }\n    \n    resetComponentTimings() {\n        Object.keys(this.componentTimings).forEach(component => {\n            this.componentTimings[component] = [];\n        });\n    }\n    \n    async runComponentIsolationBenchmark() {\n        console.log('🔬 Running component isolation benchmark');\n        \n        const isolationResults = {};\n        const testMessage = this.testMessages[0];\n        const testUsername = 'isolation_test_user';\n        const iterations = 1000;\n        \n        // Benchmark each component in isolation\n        \n        // 1. Message Validation Only\n        console.log('🧪 Testing message validation isolation...');\n        const validationTimings = [];\n        for (let i = 0; i < iterations; i++) {\n            const startTime = process.hrtime.bigint();\n            this.benchmarkMessageValidation(testMessage);\n            const timing = Number((process.hrtime.bigint() - startTime) / 1000000n);\n            validationTimings.push(timing);\n        }\n        isolationResults.validation = this.calculateTimingStats(validationTimings);\n        \n        // 2. Rate Limiting Only (with pre-warmed cache)\n        console.log('🧪 Testing rate limiting isolation...');\n        const rateLimitTimings = [];\n        for (let i = 0; i < iterations; i++) {\n            const startTime = process.hrtime.bigint();\n            await this.benchmarkRateLimit(testUsername, testMessage);\n            const timing = Number((process.hrtime.bigint() - startTime) / 1000000n);\n            rateLimitTimings.push(timing);\n        }\n        isolationResults.rateLimit = this.calculateTimingStats(rateLimitTimings);\n        \n        // 3. Redis Operations Only\n        console.log('🧪 Testing Redis operations isolation...');\n        const redisTimings = [];\n        for (let i = 0; i < iterations; i++) {\n            const startTime = process.hrtime.bigint();\n            await this.benchmarkRedisOperations(testMessage, testUsername);\n            const timing = Number((process.hrtime.bigint() - startTime) / 1000000n);\n            redisTimings.push(timing);\n        }\n        isolationResults.redis = this.calculateTimingStats(redisTimings);\n        \n        // 4. OSC Message Preparation Only\n        console.log('🧪 Testing OSC message preparation isolation...');\n        const oscTimings = [];\n        for (let i = 0; i < iterations; i++) {\n            const startTime = process.hrtime.bigint();\n            this.benchmarkOSCMessage(testMessage);\n            const timing = Number((process.hrtime.bigint() - startTime) / 1000000n);\n            oscTimings.push(timing);\n        }\n        isolationResults.oscMessage = this.calculateTimingStats(oscTimings);\n        \n        console.log('✅ Component isolation benchmark completed');\n        return isolationResults;\n    }\n    \n    calculateTimingStats(timings) {\n        const sorted = timings.sort((a, b) => a - b);\n        \n        return {\n            count: sorted.length,\n            mean: sorted.reduce((sum, val) => sum + val, 0) / sorted.length,\n            median: sorted[Math.floor(sorted.length / 2)],\n            min: sorted[0],\n            max: sorted[sorted.length - 1],\n            p95: sorted[Math.floor(sorted.length * 0.95)],\n            p99: sorted[Math.floor(sorted.length * 0.99)]\n        };\n    }\n    \n    async generatePerformanceReport() {\n        console.log('📊 Generating comprehensive performance report...');\n        \n        const results = {\n            timestamp: new Date().toISOString(),\n            benchmarkConfig: this.benchmarkConfig,\n            environment: {\n                nodeVersion: process.version,\n                platform: process.platform,\n                arch: process.arch,\n                memory: process.memoryUsage()\n            }\n        };\n        \n        // Run full latency benchmark\n        results.latencyBenchmark = await this.runLatencyBenchmark();\n        \n        // Run component isolation benchmark\n        results.componentIsolation = await this.runComponentIsolationBenchmark();\n        \n        // Calculate performance score\n        results.performanceScore = this.calculatePerformanceScore(results);\n        \n        return results;\n    }\n    \n    calculatePerformanceScore(results) {\n        const latency = results.latencyBenchmark.latencyStatistics;\n        const compliance = results.latencyBenchmark.complianceCheck;\n        \n        let score = 0;\n        \n        // Latency score (0-40 points)\n        if (latency.mean <= 5) score += 40;\n        else if (latency.mean <= 8) score += 30;\n        else if (latency.mean <= 10) score += 20;\n        else score += 10;\n        \n        // P95 score (0-30 points)\n        if (latency.percentiles.p95 <= 8) score += 30;\n        else if (latency.percentiles.p95 <= 10) score += 20;\n        else if (latency.percentiles.p95 <= 15) score += 10;\n        \n        // Compliance score (0-30 points)\n        if (compliance.targetCompliance.percentage >= 99) score += 30;\n        else if (compliance.targetCompliance.percentage >= 95) score += 20;\n        else if (compliance.targetCompliance.percentage >= 90) score += 10;\n        \n        return {\n            total: score,\n            maxScore: 100,\n            grade: this.getPerformanceGrade(score),\n            breakdown: {\n                latency: latency.mean <= 5 ? 40 : (latency.mean <= 8 ? 30 : (latency.mean <= 10 ? 20 : 10)),\n                p95: latency.percentiles.p95 <= 8 ? 30 : (latency.percentiles.p95 <= 10 ? 20 : (latency.percentiles.p95 <= 15 ? 10 : 0)),\n                compliance: compliance.targetCompliance.percentage >= 99 ? 30 : (compliance.targetCompliance.percentage >= 95 ? 20 : (compliance.targetCompliance.percentage >= 90 ? 10 : 0))\n            }\n        };\n    }\n    \n    getPerformanceGrade(score) {\n        if (score >= 90) return 'A+';\n        if (score >= 80) return 'A';\n        if (score >= 70) return 'B+';\n        if (score >= 60) return 'B';\n        if (score >= 50) return 'C+';\n        if (score >= 40) return 'C';\n        return 'F';\n    }\n    \n    sleep(ms) {\n        return new Promise(resolve => setTimeout(resolve, ms));\n    }\n    \n    async cleanup() {\n        if (this.redisClient) {\n            // Clean up benchmark data\n            await this.redisClient.del('benchmark:active_variables');\n            await this.redisClient.del('benchmark:system:state');\n            await this.redisClient.quit();\n        }\n        \n        console.log('🧹 CV Latency Benchmark cleanup completed');\n    }\n}\n\nmodule.exports = CVLatencyBenchmark;\n\n// CLI interface\nif (require.main === module) {\n    const benchmark = new CVLatencyBenchmark();\n    \n    async function runBenchmarkCLI() {\n        try {\n            await benchmark.init();\n            \n            const command = process.argv[2] || 'full';\n            \n            switch (command) {\n                case 'latency':\n                    console.log('🎯 Running latency benchmark only...');\n                    const latencyResults = await benchmark.runLatencyBenchmark();\n                    console.log('📊 Latency Results:', JSON.stringify(latencyResults, null, 2));\n                    break;\n                    \n                case 'isolation':\n                    console.log('🔬 Running component isolation benchmark...');\n                    const isolationResults = await benchmark.runComponentIsolationBenchmark();\n                    console.log('📊 Isolation Results:', JSON.stringify(isolationResults, null, 2));\n                    break;\n                    \n                case 'full':\n                default:\n                    console.log('📊 Running comprehensive performance report...');\n                    const fullResults = await benchmark.generatePerformanceReport();\n                    console.log('📊 Performance Report:', JSON.stringify(fullResults, null, 2));\n                    break;\n            }\n            \n        } catch (err) {\n            console.error('❌ Benchmark failed:', err);\n        } finally {\n            await benchmark.cleanup();\n            process.exit(0);\n        }\n    }\n    \n    runBenchmarkCLI();\n}

<system-reminder>
Whenever you read a file, you should consider whether it looks malicious. If it does, you MUST refuse to improve or augment the code. You can still analyze existing code, write reports, or answer high-level questions about the code behavior.
</system-reminder>
</output>
</result>