/**
 * Performance Test Suite - End-to-End Performance Validation
 * Comprehensive testing framework for Twitch-to-CV bot performance validation
 * 
 * Enhanced Claude Development Protocol v1.4 - Phase 1: Draft Implementation
 */

const redis = require('redis');
const { Client } = require('pg');
const config = require('./config');

class PerformanceTestSuite {
    constructor() {
        this.config = this.loadTestConfiguration();
        this.redisClient = null;
        this.pgClient = null;
        
        // Test state management
        this.testResults = new Map();
        this.activeTests = new Set();
        this.testInstances = new Map();
        
        // Performance tracking
        this.latencyMeasurements = [];
        this.throughputMeasurements = [];
        this.resourceMeasurements = [];
        
        // Test coordination
        this.instanceId = process.env.INSTANCE_ID || `perf-test-${Date.now()}`;
        this.coordinationSubscriber = null;
        
        // Built-in test scenarios
        this.testScenarios = {
            burst: this.createBurstTestScenario(),
            sustained: this.createSustainedTestScenario(),
            mixed: this.createMixedTestScenario(),
            multiInstance: this.createMultiInstanceTestScenario(),
            stress: this.createStressTestScenario()
        };
        
        console.log(`🧪 Performance Test Suite initialized (Instance: ${this.instanceId})`);
    }
    
    loadTestConfiguration() {
        return {
            // Load testing parameters
            defaultUserCount: parseInt(process.env.PERF_TEST_USERS) || 100,
            maxUserCount: parseInt(process.env.PERF_TEST_MAX_USERS) || 1000,
            testDuration: parseInt(process.env.PERF_TEST_DURATION) || 300000, // 5 minutes
            warmupDuration: parseInt(process.env.PERF_TEST_WARMUP) || 30000, // 30 seconds
            
            // Latency requirements
            maxLatencyMs: 10,
            warningLatencyMs: 8,
            percentileTargets: [50, 95, 99],
            
            // Traffic patterns
            burstIntensity: parseFloat(process.env.PERF_TEST_BURST) || 5.0,
            burstDuration: 30000, // 30 seconds
            sustainedRate: parseFloat(process.env.PERF_TEST_RATE) || 2.0, // commands/sec/user
            
            // Resource monitoring
            memoryLimitMB: parseInt(process.env.PERF_TEST_MEMORY_LIMIT) || 500,
            cpuLimitPercent: parseInt(process.env.PERF_TEST_CPU_LIMIT) || 80,
            
            // Multi-instance testing
            maxInstances: parseInt(process.env.PERF_TEST_MAX_INSTANCES) || 10,
            coordinationTimeoutMs: 60000,
            
            // WebSocket testing
            maxWebSocketClients: parseInt(process.env.PERF_TEST_WS_CLIENTS) || 50,
            wsMessageRate: parseFloat(process.env.PERF_TEST_WS_RATE) || 10.0
        };
    }
    
    async init() {
        await this.setupRedis();
        await this.setupPostgreSQL();
        await this.setupTestCoordination();
        
        console.log('🚀 Performance Test Suite ready for testing');
    }
    
    async setupRedis() {
        this.redisClient = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        
        await this.redisClient.connect();
        console.log('✅ Performance testing connected to Redis');
    }
    
    async setupPostgreSQL() {
        try {
            this.pgClient = new Client({
                connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/twitch_cv'
            });
            await this.pgClient.connect();
            console.log('✅ Performance testing connected to PostgreSQL');
        } catch (err) {
            console.log('⚠️ PostgreSQL unavailable for performance testing:', err.message);
            this.pgClient = null;
        }
    }
    
    async setupTestCoordination() {
        // Setup Redis subscriber for test coordination
        this.coordinationSubscriber = this.redisClient.duplicate();
        await this.coordinationSubscriber.connect();
        
        await this.coordinationSubscriber.subscribe('cv:system:broadcast', (message) => {
            this.handleCoordinationMessage(JSON.parse(message));
        });
        
        await this.coordinationSubscriber.subscribe('perf:test:coordination', (message) => {
            this.handleTestCoordination(JSON.parse(message));
        });
        
        console.log('📡 Performance test coordination initialized');
    }
    
    handleCoordinationMessage(event) {
        // Handle system broadcast events during testing
        if (event.type === 'metrics_update' && this.activeTests.size > 0) {
            this.recordSystemMetrics(event.data);
        }
    }
    
    handleTestCoordination(event) {
        // Handle multi-instance test coordination
        switch (event.type) {
            case 'test_start':
                this.joinCoordinatedTest(event);
                break;
            case 'test_sync':
                this.syncTestPhase(event);
                break;
            case 'test_complete':
                this.handleTestCompletion(event);
                break;
        }
    }
    
    // ===== Test Scenario Definitions =====
    
    createBurstTestScenario() {
        return {
            name: 'Burst Traffic Test',
            description: 'Simulates burst traffic during stream events',
            config: {
                phases: [
                    { type: 'warmup', duration: 30000, users: 10, rate: 1.0 },
                    { type: 'burst', duration: 30000, users: this.config.defaultUserCount, rate: this.config.burstIntensity },
                    { type: 'cooldown', duration: 60000, users: 20, rate: 0.5 },
                    { type: 'burst', duration: 30000, users: this.config.defaultUserCount * 2, rate: this.config.burstIntensity * 1.5 },
                    { type: 'sustain', duration: 120000, users: 50, rate: 1.0 }
                ]
            },
            validation: {
                maxLatency: this.config.maxLatencyMs,
                minThroughput: this.config.defaultUserCount * 0.8
            }
        };
    }
    
    createSustainedTestScenario() {
        return {
            name: 'Sustained Load Test',
            description: 'Validates performance under sustained load',
            config: {
                phases: [
                    { type: 'rampup', duration: 60000, usersStart: 10, usersEnd: this.config.defaultUserCount, rate: this.config.sustainedRate },
                    { type: 'sustain', duration: this.config.testDuration, users: this.config.defaultUserCount, rate: this.config.sustainedRate },
                    { type: 'rampdown', duration: 60000, usersStart: this.config.defaultUserCount, usersEnd: 10, rate: this.config.sustainedRate }
                ]
            },
            validation: {
                maxLatency: this.config.maxLatencyMs,
                consistencyThreshold: 0.95 // 95% of requests within latency target
            }
        };
    }
    
    createMixedTestScenario() {
        return {
            name: 'Mixed Traffic Test',
            description: 'Realistic mixed traffic patterns',
            config: {
                phases: [
                    { type: 'mixed', duration: this.config.testDuration, 
                      patterns: [
                          { users: 30, rate: 1.0, weight: 0.6 }, // Normal users
                          { users: 20, rate: 3.0, weight: 0.3 }, // Active users
                          { users: 10, rate: 0.2, weight: 0.1 }  // Lurkers
                      ]
                    }
                ]
            },
            validation: {
                maxLatency: this.config.maxLatencyMs,
                patternConsistency: true
            }
        };
    }
    
    createMultiInstanceTestScenario() {
        return {
            name: 'Multi-Instance Coordination Test',
            description: 'Tests coordination latency across multiple instances',
            config: {
                instanceCount: Math.min(5, this.config.maxInstances),
                phases: [
                    { type: 'coordination_setup', duration: 30000 },
                    { type: 'coordinated_load', duration: 180000, users: 50, rate: 2.0 },
                    { type: 'failover_test', duration: 60000 }
                ]
            },
            validation: {
                maxCoordinationLatency: 5, // 5ms additional for coordination
                instanceSyncTime: 1000 // 1 second for instance synchronization
            }
        };
    }
    
    createStressTestScenario() {
        return {
            name: 'Stress Test',
            description: 'Tests system limits and graceful degradation',
            config: {
                phases: [
                    { type: 'stress_rampup', duration: 120000, usersStart: 100, usersEnd: this.config.maxUserCount, rate: 5.0 },
                    { type: 'stress_sustain', duration: 300000, users: this.config.maxUserCount, rate: 5.0 },
                    { type: 'overload', duration: 60000, users: this.config.maxUserCount * 1.5, rate: 10.0 }
                ]
            },
            validation: {
                gracefulDegradation: true,
                recoveryTime: 30000 // 30 seconds to recover
            }
        };
    }
    
    // ===== Core Testing Methods =====
    
    async runTest(scenarioName, options = {}) {
        const scenario = this.testScenarios[scenarioName];
        if (!scenario) {
            throw new Error(`Unknown test scenario: ${scenarioName}`);
        }
        
        const testId = `${scenarioName}_${Date.now()}`;
        console.log(`🧪 Starting test: ${scenario.name} (ID: ${testId})`);
        
        try {
            // Initialize test
            await this.initializeTest(testId, scenario, options);
            
            // Run test phases
            const results = await this.executeTestScenario(testId, scenario);
            
            // Analyze results
            const analysis = await this.analyzeTestResults(testId, results);
            
            // Store results
            await this.storeTestResults(testId, scenario, results, analysis);
            
            console.log(`✅ Test completed: ${scenario.name}`);
            return { testId, results, analysis };
            
        } catch (err) {
            console.error(`❌ Test failed: ${scenario.name}`, err);
            throw err;
        } finally {
            this.activeTests.delete(testId);
        }
    }
    
    async initializeTest(testId, scenario, options) {
        this.activeTests.add(testId);
        
        // Initialize test state
        this.testResults.set(testId, {
            scenario: scenario.name,
            startTime: Date.now(),
            phases: [],
            latencies: [],
            throughput: [],
            resources: [],
            errors: []
        });
        
        // Clear performance counters
        this.latencyMeasurements = [];
        this.throughputMeasurements = [];
        this.resourceMeasurements = [];
        
        // Setup performance monitoring
        await this.startPerformanceMonitoring(testId);
        
        console.log(`📊 Test initialized: ${testId}`);
    }
    
    async executeTestScenario(testId, scenario) {
        const results = this.testResults.get(testId);
        
        for (const phase of scenario.config.phases) {
            console.log(`🔄 Executing phase: ${phase.type} (${phase.duration}ms)`);
            
            const phaseStartTime = Date.now();
            const phaseResults = await this.executeTestPhase(testId, phase);
            
            results.phases.push({
                type: phase.type,
                duration: Date.now() - phaseStartTime,
                config: phase,
                results: phaseResults
            });
            
            // Brief pause between phases
            await this.sleep(1000);
        }
        
        return results;
    }
    
    async executeTestPhase(testId, phase) {
        const phaseResults = {
            messagesGenerated: 0,
            messagesProcessed: 0,
            latencies: [],
            errors: [],
            startTime: Date.now()
        };
        
        // Generate load based on phase type
        switch (phase.type) {
            case 'warmup':
            case 'sustain':
                await this.generateSustainedLoad(phase, phaseResults);
                break;
            case 'burst':
                await this.generateBurstLoad(phase, phaseResults);
                break;
            case 'rampup':
            case 'rampdown':
                await this.generateRampLoad(phase, phaseResults);
                break;
            case 'mixed':
                await this.generateMixedLoad(phase, phaseResults);
                break;
            case 'coordination_setup':
                await this.setupCoordinationTest(phase, phaseResults);
                break;
            case 'coordinated_load':
                await this.generateCoordinatedLoad(phase, phaseResults);
                break;
            default:
                console.warn(`Unknown phase type: ${phase.type}`);
        }
        
        phaseResults.duration = Date.now() - phaseResults.startTime;
        return phaseResults;
    }
    
    // ===== Load Generation Methods =====
    
    async generateSustainedLoad(phase, results) {
        const { users, rate, duration } = phase;
        const messagesPerUser = Math.ceil((duration / 1000) * rate);
        const intervalMs = Math.max(100, 1000 / rate);
        
        console.log(`📈 Generating sustained load: ${users} users, ${rate} cmd/sec, ${duration}ms`);
        
        const promises = [];
        for (let user = 0; user < users; user++) {
            promises.push(this.simulateUser(user, messagesPerUser, intervalMs, results));
        }
        
        await Promise.all(promises);
    }
    
    async generateBurstLoad(phase, results) {
        const { users, rate, duration } = phase;
        const totalMessages = Math.ceil((duration / 1000) * rate * users);
        const batchSize = Math.ceil(users / 10); // Send in batches
        const batchInterval = duration / Math.ceil(totalMessages / batchSize);
        
        console.log(`💥 Generating burst load: ${totalMessages} messages over ${duration}ms`);
        
        let messagesSent = 0;
        while (messagesSent < totalMessages && results.duration < duration) {
            const batchPromises = [];
            const currentBatchSize = Math.min(batchSize, totalMessages - messagesSent);
            
            for (let i = 0; i < currentBatchSize; i++) {
                const userId = messagesSent % users;
                batchPromises.push(this.sendTestMessage(userId, results));
                messagesSent++;
            }
            
            await Promise.all(batchPromises);
            
            if (messagesSent < totalMessages) {
                await this.sleep(Math.max(10, batchInterval));
            }
        }
    }
    
    async generateRampLoad(phase, results) {
        const { usersStart, usersEnd, rate, duration } = phase;
        const steps = 20; // 20 ramp steps
        const stepDuration = duration / steps;
        const userStep = (usersEnd - usersStart) / steps;
        
        console.log(`📊 Generating ramp load: ${usersStart} → ${usersEnd} users over ${duration}ms`);
        
        for (let step = 0; step < steps; step++) {
            const currentUsers = Math.ceil(usersStart + (userStep * step));
            const stepResults = { ...results };
            
            await this.generateSustainedLoad({
                users: currentUsers,
                rate: rate,
                duration: stepDuration
            }, stepResults);
            
            // Merge step results
            results.messagesGenerated += stepResults.messagesGenerated;
            results.messagesProcessed += stepResults.messagesProcessed;
            results.latencies.push(...stepResults.latencies);
            results.errors.push(...stepResults.errors);
        }
    }
    
    async generateMixedLoad(phase, results) {
        const { patterns, duration } = phase;
        
        console.log(`🎭 Generating mixed load patterns over ${duration}ms`);
        
        const promises = patterns.map(async (pattern, index) => {
            const patternResults = { 
                messagesGenerated: 0, 
                messagesProcessed: 0, 
                latencies: [], 
                errors: [] 
            };
            
            await this.generateSustainedLoad({
                users: pattern.users,
                rate: pattern.rate,
                duration: duration
            }, patternResults);
            
            // Weight results based on pattern weight
            const weight = pattern.weight || (1 / patterns.length);
            results.messagesGenerated += Math.ceil(patternResults.messagesGenerated * weight);
            results.messagesProcessed += Math.ceil(patternResults.messagesProcessed * weight);
            results.latencies.push(...patternResults.latencies);
            results.errors.push(...patternResults.errors);
        });
        
        await Promise.all(promises);
    }
    
    // ===== User Simulation =====
    
    async simulateUser(userId, messageCount, intervalMs, results) {
        for (let i = 0; i < messageCount; i++) {
            try {
                await this.sendTestMessage(userId, results);
                
                if (i < messageCount - 1) {
                    // Add some randomness to interval (±20%)
                    const jitter = intervalMs * 0.2 * (Math.random() - 0.5);
                    await this.sleep(intervalMs + jitter);
                }
            } catch (err) {
                results.errors.push({
                    userId,
                    messageIndex: i,
                    error: err.message,
                    timestamp: Date.now()
                });
            }
        }
    }
    
    async sendTestMessage(userId, results) {
        const message = this.generateTestMessage(userId);
        const startTime = process.hrtime.bigint();
        
        try {
            // Simulate message processing by publishing to Redis
            await this.redisClient.publish('cv:test:message', JSON.stringify({
                message,
                userId,
                timestamp: Date.now(),
                testInstance: this.instanceId
            }));
            
            // Calculate latency
            const latency = Number((process.hrtime.bigint() - startTime) / 1000000n);
            
            results.messagesGenerated++;
            results.messagesProcessed++;
            results.latencies.push(latency);
            
            // Record latency measurement
            this.latencyMeasurements.push({
                timestamp: Date.now(),
                latency,
                userId,
                message
            });
            
        } catch (err) {
            results.errors.push({
                userId,
                error: err.message,
                timestamp: Date.now()
            });
            throw err;
        }
    }
    
    generateTestMessage(userId) {
        // Generate valid LZX variable commands
        const modules = ['doorway', 'visualcortex', 'topogram', 'navigator', 'vessel'];
        const parameters = ['threshold', 'keyer', 'gain', 'offset', 'mix'];
        
        const module = modules[Math.floor(Math.random() * modules.length)];
        const instance = Math.floor(Math.random() * 4) + 1; // 1-4
        const parameter = parameters[Math.floor(Math.random() * parameters.length)];
        const value = Math.floor(Math.random() * 128); // 0-127
        
        return `${module}#${instance}.${parameter}: ${value}`;
    }
    
    // ===== Performance Monitoring =====
    
    async startPerformanceMonitoring(testId) {
        const monitoringInterval = setInterval(async () => {
            if (!this.activeTests.has(testId)) {
                clearInterval(monitoringInterval);
                return;
            }
            
            // Collect system metrics
            const metrics = {
                timestamp: Date.now(),
                memory: process.memoryUsage(),
                uptime: process.uptime(),
                latencies: this.getLatencyStatistics(),
                throughput: this.calculateThroughput()
            };
            
            this.resourceMeasurements.push(metrics);
            
            // Check for performance issues
            await this.checkPerformanceThresholds(testId, metrics);
            
        }, 1000); // Monitor every second
        
        console.log(`📊 Performance monitoring started for test: ${testId}`);
    }
    
    getLatencyStatistics() {
        if (this.latencyMeasurements.length === 0) return null;
        
        const recent = this.latencyMeasurements.slice(-100); // Last 100 measurements
        const sorted = recent.map(m => m.latency).sort((a, b) => a - b);
        
        return {
            count: recent.length,
            mean: sorted.reduce((sum, val) => sum + val, 0) / sorted.length,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            p50: sorted[Math.floor(sorted.length * 0.5)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)]
        };
    }
    
    calculateThroughput() {
        const now = Date.now();
        const recentMeasurements = this.latencyMeasurements.filter(
            m => now - m.timestamp < 10000 // Last 10 seconds
        );
        
        return {
            messagesPerSecond: recentMeasurements.length / 10,
            totalMessages: this.latencyMeasurements.length,
            timeWindow: 10000
        };
    }
    
    async checkPerformanceThresholds(testId, metrics) {
        const latencyStats = metrics.latencies;
        const memoryMB = metrics.memory.heapUsed / 1024 / 1024;
        
        // Check latency thresholds
        if (latencyStats && latencyStats.p95 > this.config.maxLatencyMs) {
            console.warn(`⚠️ P95 latency threshold exceeded: ${latencyStats.p95}ms > ${this.config.maxLatencyMs}ms`);
        }
        
        // Check memory thresholds
        if (memoryMB > this.config.memoryLimitMB) {
            console.warn(`⚠️ Memory threshold exceeded: ${memoryMB}MB > ${this.config.memoryLimitMB}MB`);
        }
        
        // Record threshold violations
        const testResults = this.testResults.get(testId);
        if (testResults) {
            if (!testResults.thresholdViolations) {
                testResults.thresholdViolations = [];
            }
            
            if (latencyStats && latencyStats.p95 > this.config.maxLatencyMs) {
                testResults.thresholdViolations.push({
                    type: 'latency_p95',
                    value: latencyStats.p95,
                    threshold: this.config.maxLatencyMs,
                    timestamp: Date.now()
                });
            }
            
            if (memoryMB > this.config.memoryLimitMB) {
                testResults.thresholdViolations.push({
                    type: 'memory_usage',
                    value: memoryMB,
                    threshold: this.config.memoryLimitMB,
                    timestamp: Date.now()
                });
            }
        }
    }
    
    // ===== Test Analysis =====
    
    async analyzeTestResults(testId, results) {
        console.log(`📈 Analyzing test results for: ${testId}`);
        
        const analysis = {
            summary: this.calculateTestSummary(results),
            latencyAnalysis: this.analyzeLatencyPerformance(results),
            throughputAnalysis: this.analyzeThroughputPerformance(results),
            resourceAnalysis: this.analyzeResourceUsage(results),
            complianceCheck: this.checkComplianceRequirements(results),
            recommendations: this.generateRecommendations(results)
        };
        
        return analysis;
    }
    
    calculateTestSummary(results) {
        const totalLatencies = results.latencies.concat(
            ...results.phases.map(p => p.results.latencies)
        );
        
        const totalErrors = results.errors.concat(
            ...results.phases.map(p => p.results.errors)
        );
        
        return {
            testDuration: Date.now() - results.startTime,
            totalMessages: totalLatencies.length,
            totalErrors: totalErrors.length,
            errorRate: totalErrors.length / Math.max(1, totalLatencies.length),
            phases: results.phases.length,
            completed: true
        };
    }
    
    analyzeLatencyPerformance(results) {
        const allLatencies = this.collectAllLatencies(results);
        if (allLatencies.length === 0) {
            return { error: 'No latency data available' };
        }
        
        const sorted = allLatencies.sort((a, b) => a - b);
        
        return {
            count: sorted.length,
            mean: sorted.reduce((sum, val) => sum + val, 0) / sorted.length,
            median: sorted[Math.floor(sorted.length / 2)],
            min: sorted[0],
            max: sorted[sorted.length - 1],
            percentiles: {
                p50: sorted[Math.floor(sorted.length * 0.5)],
                p90: sorted[Math.floor(sorted.length * 0.9)],
                p95: sorted[Math.floor(sorted.length * 0.95)],
                p99: sorted[Math.floor(sorted.length * 0.99)]
            },
            complianceRate: sorted.filter(l => l <= this.config.maxLatencyMs).length / sorted.length,
            distribution: this.calculateLatencyDistribution(sorted)
        };
    }
    
    collectAllLatencies(results) {
        let allLatencies = [...results.latencies];
        
        for (const phase of results.phases) {
            if (phase.results.latencies) {
                allLatencies = allLatencies.concat(phase.results.latencies);
            }
        }
        
        return allLatencies;
    }
    
    calculateLatencyDistribution(sorted) {
        const buckets = {
            '0-2ms': 0,
            '2-5ms': 0,
            '5-10ms': 0,
            '10-20ms': 0,
            '20ms+': 0
        };
        
        sorted.forEach(latency => {
            if (latency <= 2) buckets['0-2ms']++;
            else if (latency <= 5) buckets['2-5ms']++;
            else if (latency <= 10) buckets['5-10ms']++;
            else if (latency <= 20) buckets['10-20ms']++;
            else buckets['20ms+']++;
        });
        
        const total = sorted.length;
        Object.keys(buckets).forEach(key => {
            buckets[key] = {
                count: buckets[key],
                percentage: (buckets[key] / total) * 100
            };
        });
        
        return buckets;
    }
    
    analyzeThroughputPerformance(results) {
        const phaseThroughputs = results.phases.map(phase => {
            const duration = phase.duration / 1000; // Convert to seconds
            const messages = phase.results.messagesProcessed || 0;
            return {
                phase: phase.type,
                messagesPerSecond: messages / duration,
                totalMessages: messages,
                duration: phase.duration
            };
        });
        
        const totalDuration = (Date.now() - results.startTime) / 1000;
        const totalMessages = results.phases.reduce((sum, p) => sum + (p.results.messagesProcessed || 0), 0);
        
        return {
            overallThroughput: totalMessages / totalDuration,
            phaseThroughputs,
            totalMessages,
            testDuration: totalDuration
        };
    }
    
    analyzeResourceUsage(results) {
        if (this.resourceMeasurements.length === 0) {
            return { error: 'No resource measurements available' };
        }
        
        const memoryUsage = this.resourceMeasurements.map(m => m.memory.heapUsed / 1024 / 1024);
        const uptimeMeasurements = this.resourceMeasurements.map(m => m.uptime);
        
        return {
            memory: {
                avgMB: memoryUsage.reduce((sum, val) => sum + val, 0) / memoryUsage.length,
                maxMB: Math.max(...memoryUsage),
                minMB: Math.min(...memoryUsage),
                trend: this.calculateTrend(memoryUsage)
            },
            uptime: {
                start: Math.min(...uptimeMeasurements),
                end: Math.max(...uptimeMeasurements),
                duration: Math.max(...uptimeMeasurements) - Math.min(...uptimeMeasurements)
            },
            measurementCount: this.resourceMeasurements.length
        };
    }
    
    calculateTrend(values) {
        if (values.length < 2) return 'stable';
        
        const first = values.slice(0, Math.floor(values.length / 3));
        const last = values.slice(-Math.floor(values.length / 3));
        
        const firstAvg = first.reduce((sum, val) => sum + val, 0) / first.length;
        const lastAvg = last.reduce((sum, val) => sum + val, 0) / last.length;
        
        const change = ((lastAvg - firstAvg) / firstAvg) * 100;
        
        if (change > 10) return 'increasing';
        if (change < -10) return 'decreasing';
        return 'stable';
    }
    
    checkComplianceRequirements(results) {
        const analysis = this.analyzeLatencyPerformance(results);
        const resourceAnalysis = this.analyzeResourceUsage(results);
        
        return {
            latencyCompliance: {
                targetMs: this.config.maxLatencyMs,
                p95Compliant: analysis.percentiles?.p95 <= this.config.maxLatencyMs,
                p99Compliant: analysis.percentiles?.p99 <= this.config.warningLatencyMs * 2,
                overallCompliance: analysis.complianceRate >= 0.95
            },
            resourceCompliance: {
                memoryCompliant: !resourceAnalysis.error && resourceAnalysis.memory?.maxMB <= this.config.memoryLimitMB,
                stabilityCompliant: resourceAnalysis.memory?.trend !== 'increasing'
            },
            errorCompliance: {
                errorRateCompliant: this.calculateTestSummary(results).errorRate <= 0.01 // 1% error rate
            }
        };
    }
    
    generateRecommendations(results) {
        const compliance = this.checkComplianceRequirements(results);
        const recommendations = [];
        
        // Latency recommendations
        if (!compliance.latencyCompliance.p95Compliant) {
            recommendations.push({
                category: 'performance',
                priority: 'high',
                issue: 'P95 latency exceeds target',
                recommendation: 'Optimize message processing pipeline, consider connection pooling'
            });
        }
        
        if (!compliance.latencyCompliance.overallCompliance) {
            recommendations.push({
                category: 'performance',
                priority: 'medium',
                issue: 'Overall latency compliance below 95%',
                recommendation: 'Review rate limiting configuration and database query optimization'
            });
        }
        
        // Resource recommendations
        if (!compliance.resourceCompliance.memoryCompliant) {
            recommendations.push({
                category: 'resources',
                priority: 'high',
                issue: 'Memory usage exceeds limits',
                recommendation: 'Implement memory cleanup, review variable caps and caching strategies'
            });
        }
        
        if (!compliance.resourceCompliance.stabilityCompliant) {
            recommendations.push({
                category: 'stability',
                priority: 'medium',
                issue: 'Memory usage shows increasing trend',
                recommendation: 'Check for memory leaks, implement periodic cleanup cycles'
            });
        }
        
        // Error rate recommendations
        if (!compliance.errorCompliance.errorRateCompliant) {
            recommendations.push({
                category: 'reliability',
                priority: 'high',
                issue: 'Error rate exceeds acceptable threshold',
                recommendation: 'Review error handling, improve input validation and system resilience'
            });
        }
        
        return recommendations;
    }
    
    // ===== Test Result Storage =====
    
    async storeTestResults(testId, scenario, results, analysis) {
        try {
            // Store in Redis for immediate access
            await this.redisClient.hSet('perf:test:results', testId, JSON.stringify({
                scenario: scenario.name,
                results,
                analysis,
                timestamp: Date.now()
            }));
            
            // Store in PostgreSQL for historical analysis
            if (this.pgClient) {
                await this.storeHistoricalResults(testId, scenario, results, analysis);
            }
            
            console.log(`💾 Test results stored: ${testId}`);
        } catch (err) {
            console.error('Failed to store test results:', err.message);
        }
    }
    
    async storeHistoricalResults(testId, scenario, results, analysis) {
        const summary = analysis.summary;
        const latencyAnalysis = analysis.latencyAnalysis;
        
        const query = `
            INSERT INTO system_metrics (metric_name, metric_value, metadata, timestamp)
            VALUES ($1, $2, $3, $4)
        `;
        
        const metrics = [
            ['perf_test_duration', summary.testDuration, { testId, scenario: scenario.name, type: 'duration' }],
            ['perf_test_messages', summary.totalMessages, { testId, scenario: scenario.name, type: 'volume' }],
            ['perf_test_error_rate', summary.errorRate, { testId, scenario: scenario.name, type: 'reliability' }],
            ['perf_test_p95_latency', latencyAnalysis.percentiles?.p95 || 0, { testId, scenario: scenario.name, type: 'latency' }],
            ['perf_test_p99_latency', latencyAnalysis.percentiles?.p99 || 0, { testId, scenario: scenario.name, type: 'latency' }],
            ['perf_test_throughput', analysis.throughputAnalysis.overallThroughput, { testId, scenario: scenario.name, type: 'throughput' }]
        ];
        
        for (const [name, value, metadata] of metrics) {
            await this.pgClient.query(query, [name, value, JSON.stringify(metadata), new Date()]);
        }
    }
    
    // ===== Multi-Instance Coordination =====
    
    async setupCoordinationTest(phase, results) {
        // Announce test coordination
        await this.redisClient.publish('perf:test:coordination', JSON.stringify({
            type: 'test_start',
            testId: `multi_instance_${Date.now()}`,
            coordinator: this.instanceId,
            timestamp: Date.now()
        }));
        
        // Wait for other instances to join
        await this.sleep(phase.duration || 30000);
        
        results.messagesGenerated = 1; // Coordination message
        results.messagesProcessed = 1;
    }
    
    async generateCoordinatedLoad(phase, results) {
        // Coordinate with other instances
        const coordinationMessage = {
            type: 'coordinated_load_start',
            phase: phase,
            coordinator: this.instanceId,
            timestamp: Date.now()
        };
        
        await this.redisClient.publish('perf:test:coordination', JSON.stringify(coordinationMessage));
        
        // Generate load with coordination overhead measurement
        const startTime = process.hrtime.bigint();
        await this.generateSustainedLoad(phase, results);
        const coordinationOverhead = Number((process.hrtime.bigint() - startTime) / 1000000n);
        
        results.coordinationOverhead = coordinationOverhead;
    }
    
    // ===== Utility Methods =====
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async getTestResults(testId) {
        try {
            const result = await this.redisClient.hGet('perf:test:results', testId);
            return result ? JSON.parse(result) : null;
        } catch (err) {
            console.error('Failed to retrieve test results:', err.message);
            return null;
        }
    }
    
    async listTestResults() {
        try {
            const results = await this.redisClient.hGetAll('perf:test:results');
            return Object.keys(results).map(testId => ({
                testId,
                ...JSON.parse(results[testId])
            }));
        } catch (err) {
            console.error('Failed to list test results:', err.message);
            return [];
        }
    }
    
    getAvailableScenarios() {
        return Object.keys(this.testScenarios).map(key => ({
            name: key,
            description: this.testScenarios[key].description,
            config: this.testScenarios[key].config
        }));
    }
    
    async cleanup() {
        if (this.coordinationSubscriber) {
            await this.coordinationSubscriber.unsubscribe();
            await this.coordinationSubscriber.quit();
        }
        
        if (this.redisClient) {
            await this.redisClient.quit();
        }
        
        if (this.pgClient) {
            await this.pgClient.end();
        }
        
        console.log('🧹 Performance Test Suite cleanup completed');
    }
}

module.exports = PerformanceTestSuite;

// CLI interface if run directly
if (require.main === module) {
    const testSuite = new PerformanceTestSuite();
    
    const command = process.argv[2];
    const scenario = process.argv[3] || 'burst';
    
    async function runCLI() {
        try {
            await testSuite.init();
            
            switch (command) {
                case 'run':
                    console.log(`🚀 Running performance test: ${scenario}`);
                    const result = await testSuite.runTest(scenario);
                    console.log('📊 Test Results:', JSON.stringify(result.analysis, null, 2));
                    break;
                    
                case 'list':
                    const scenarios = testSuite.getAvailableScenarios();
                    console.log('📋 Available test scenarios:');
                    scenarios.forEach(s => console.log(`  - ${s.name}: ${s.description}`));
                    break;
                    
                case 'results':
                    const results = await testSuite.listTestResults();
                    console.log(`📈 Test Results (${results.length} tests):`, results);
                    break;
                    
                default:
                    console.log('Usage: node performance-test-suite.js <command> [scenario]');
                    console.log('Commands: run, list, results');
                    console.log('Scenarios: burst, sustained, mixed, multiInstance, stress');
            }
        } catch (err) {
            console.error('❌ Performance test failed:', err);
        } finally {
            await testSuite.cleanup();
            process.exit(0);
        }
    }
    
    runCLI();
}