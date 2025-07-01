/**
 * Performance Monitor Integration - Real-time performance validation
 * Integrates performance testing with existing metrics infrastructure
 * 
 * Enhanced Claude Development Protocol v1.4 - Phase 1: Draft Implementation
 */

const MetricsCollector = require('./metrics-collector');
const MetricsStreamer = require('./metrics-streamer');
const PerformanceTestSuite = require('./performance-test-suite');
const CVLatencyBenchmark = require('./cv-latency-benchmark');
const redis = require('redis');
const { Client } = require('pg');

class PerformanceMonitorIntegration {
    constructor() {
        this.redisClient = null;
        this.pgClient = null;
        this.metricsCollector = null;
        this.metricsStreamer = null;
        this.testSuite = null;
        this.benchmark = null;
        
        // Monitoring configuration
        this.config = {
            continuousMonitoring: process.env.PERF_CONTINUOUS_MONITORING === 'true',
            alertThresholds: {
                latencyP95Ms: parseInt(process.env.PERF_ALERT_LATENCY_P95) || 12,
                latencyP99Ms: parseInt(process.env.PERF_ALERT_LATENCY_P99) || 18,
                errorRatePercent: parseFloat(process.env.PERF_ALERT_ERROR_RATE) || 1.0,
                memoryUsageMB: parseInt(process.env.PERF_ALERT_MEMORY_MB) || 500,
                throughputThreshold: parseInt(process.env.PERF_ALERT_THROUGHPUT) || 100
            },
            monitoringIntervals: {
                realTimeMs: 5000,  // 5 seconds for real-time metrics
                benchmarkMs: 300000, // 5 minutes for periodic benchmarks
                reportMs: 3600000    // 1 hour for comprehensive reports
            },
            testSchedule: {
                enabled: process.env.PERF_SCHEDULED_TESTS === 'true',
                lightTestIntervalMs: 600000,  // 10 minutes - light performance check
                fullTestIntervalMs: 3600000,  // 1 hour - comprehensive test
                maintenanceHour: parseInt(process.env.PERF_MAINTENANCE_HOUR) || 3 // 3 AM
            }
        };
        
        // Performance state tracking
        this.performanceState = {
            currentLatency: null,
            latencyTrend: 'stable',
            lastBenchmarkResults: null,
            alertsActive: new Set(),
            testHistory: [],
            continuousMetrics: []
        };
        
        // Alert management
        this.alertHandlers = new Map();
        this.alertHistory = [];
        
        console.log('🔍 Performance Monitor Integration initialized');
    }
    
    async init() {
        await this.setupDatabase();
        await this.setupMetricsInfrastructure();
        await this.setupPerformanceTools();
        await this.setupAlertHandlers();
        
        if (this.config.continuousMonitoring) {
            await this.startContinuousMonitoring();
        }
        
        if (this.config.testSchedule.enabled) {
            this.startScheduledTesting();
        }
        
        console.log('🚀 Performance Monitor Integration ready');
    }
    
    async setupDatabase() {
        // Redis connection
        this.redisClient = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        await this.redisClient.connect();
        
        // PostgreSQL connection
        try {
            this.pgClient = new Client({
                connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/twitch_cv'
            });
            await this.pgClient.connect();
            console.log('✅ Performance monitoring connected to databases');
        } catch (err) {
            console.log('⚠️ PostgreSQL unavailable for performance monitoring');
            this.pgClient = null;
        }
    }
    
    async setupMetricsInfrastructure() {
        // Initialize metrics collector for performance data
        this.metricsCollector = new MetricsCollector(this.redisClient, this.pgClient);
        
        // Initialize metrics streamer for real-time monitoring
        this.metricsStreamer = new MetricsStreamer(this.redisClient);
        
        console.log('📊 Metrics infrastructure initialized');
    }
    
    async setupPerformanceTools() {
        // Initialize performance test suite
        this.testSuite = new PerformanceTestSuite();
        await this.testSuite.init();
        
        // Initialize CV latency benchmark
        this.benchmark = new CVLatencyBenchmark();
        await this.benchmark.init();
        
        console.log('🧪 Performance testing tools ready');
    }
    
    async setupAlertHandlers() {
        // Register alert handlers for different performance issues
        this.registerAlertHandler('latency_degradation', this.handleLatencyAlert.bind(this));
        this.registerAlertHandler('memory_leak', this.handleMemoryAlert.bind(this));
        this.registerAlertHandler('throughput_drop', this.handleThroughputAlert.bind(this));
        this.registerAlertHandler('error_spike', this.handleErrorAlert.bind(this));
        this.registerAlertHandler('system_overload', this.handleSystemOverloadAlert.bind(this));
        
        console.log('🚨 Alert handlers configured');
    }
    
    async startContinuousMonitoring() {
        console.log('🔄 Starting continuous performance monitoring...');
        
        // Real-time metrics monitoring
        setInterval(async () => {
            await this.collectRealTimeMetrics();
        }, this.config.monitoringIntervals.realTimeMs);
        
        // Periodic benchmarking
        setInterval(async () => {
            await this.runPeriodicBenchmark();
        }, this.config.monitoringIntervals.benchmarkMs);
        
        // Comprehensive reporting
        setInterval(async () => {
            await this.generatePerformanceReport();
        }, this.config.monitoringIntervals.reportMs);
        
        console.log('📊 Continuous monitoring active');
    }
    
    startScheduledTesting() {
        console.log('⏰ Starting scheduled performance testing...');
        
        // Light performance checks
        setInterval(async () => {
            await this.runLightPerformanceCheck();
        }, this.config.testSchedule.lightTestIntervalMs);
        
        // Comprehensive performance tests
        setInterval(async () => {
            await this.runComprehensivePerformanceTest();
        }, this.config.testSchedule.fullTestIntervalMs);
        
        // Daily maintenance window testing
        this.scheduleDailyMaintenanceTest();
        
        console.log('⏰ Scheduled testing active');
    }
    
    async collectRealTimeMetrics() {
        try {
            const metrics = await this.gatherCurrentMetrics();
            this.performanceState.continuousMetrics.push({
                timestamp: Date.now(),
                ...metrics
            });
            
            // Keep only recent metrics (last hour)
            const cutoff = Date.now() - 3600000;
            this.performanceState.continuousMetrics = this.performanceState.continuousMetrics.filter(
                m => m.timestamp > cutoff
            );
            
            // Check for alert conditions
            await this.checkAlertConditions(metrics);
            
            // Update performance state
            this.updatePerformanceState(metrics);
            
        } catch (err) {\n            console.error('Real-time metrics collection error:', err.message);\n        }\n    }\n    \n    async gatherCurrentMetrics() {\n        // Gather metrics from existing infrastructure\n        const systemMetrics = await this.redisClient.hGetAll('metrics:realtime');\n        const systemState = await this.redisClient.hGetAll('system:state');\n        \n        // Parse and normalize metrics\n        const metrics = {\n            latency: {\n                current: parseFloat(systemState.systemLatency) || 0,\n                avg: parseFloat(systemMetrics.avgLatency) || 0\n            },\n            throughput: {\n                commandsPerMinute: parseFloat(systemMetrics.cvCommandsPerMinute) || 0,\n                successRate: parseFloat(systemMetrics.successRate) || 100\n            },\n            resources: {\n                memoryMB: parseFloat(systemMetrics.memoryMB) || 0,\n                uptime: parseFloat(systemMetrics.uptime) || 0\n            },\n            rateLimit: {\n                systemTokens: JSON.parse(systemMetrics.systemTokens || '{}'),\n                blocks: parseInt(systemMetrics.rateLimitBlocks) || 0\n            },\n            errors: {\n                rate: 100 - (parseFloat(systemMetrics.successRate) || 100)\n            }\n        };\n        \n        return metrics;\n    }\n    \n    async checkAlertConditions(metrics) {\n        const alerts = [];\n        \n        // Latency alerts\n        if (metrics.latency.current > this.config.alertThresholds.latencyP95Ms) {\n            alerts.push({\n                type: 'latency_degradation',\n                severity: 'high',\n                message: `Current latency ${metrics.latency.current}ms exceeds P95 threshold ${this.config.alertThresholds.latencyP95Ms}ms`,\n                value: metrics.latency.current,\n                threshold: this.config.alertThresholds.latencyP95Ms\n            });\n        }\n        \n        // Memory alerts\n        if (metrics.resources.memoryMB > this.config.alertThresholds.memoryUsageMB) {\n            alerts.push({\n                type: 'memory_leak',\n                severity: 'medium',\n                message: `Memory usage ${metrics.resources.memoryMB}MB exceeds threshold ${this.config.alertThresholds.memoryUsageMB}MB`,\n                value: metrics.resources.memoryMB,\n                threshold: this.config.alertThresholds.memoryUsageMB\n            });\n        }\n        \n        // Error rate alerts\n        if (metrics.errors.rate > this.config.alertThresholds.errorRatePercent) {\n            alerts.push({\n                type: 'error_spike',\n                severity: 'high',\n                message: `Error rate ${metrics.errors.rate.toFixed(2)}% exceeds threshold ${this.config.alertThresholds.errorRatePercent}%`,\n                value: metrics.errors.rate,\n                threshold: this.config.alertThresholds.errorRatePercent\n            });\n        }\n        \n        // Throughput alerts\n        if (metrics.throughput.commandsPerMinute < this.config.alertThresholds.throughputThreshold) {\n            alerts.push({\n                type: 'throughput_drop',\n                severity: 'medium',\n                message: `Throughput ${metrics.throughput.commandsPerMinute} cmd/min below threshold ${this.config.alertThresholds.throughputThreshold}`,\n                value: metrics.throughput.commandsPerMinute,\n                threshold: this.config.alertThresholds.throughputThreshold\n            });\n        }\n        \n        // Process alerts\n        for (const alert of alerts) {\n            await this.processAlert(alert);\n        }\n    }\n    \n    async processAlert(alert) {\n        const alertKey = `${alert.type}_${Date.now()}`;\n        \n        // Check if this alert type is already active (debouncing)\n        if (this.performanceState.alertsActive.has(alert.type)) {\n            return; // Skip duplicate alerts\n        }\n        \n        // Mark alert as active\n        this.performanceState.alertsActive.add(alert.type);\n        \n        // Add to alert history\n        this.alertHistory.push({\n            ...alert,\n            timestamp: Date.now(),\n            alertKey\n        });\n        \n        // Trigger alert handler\n        const handler = this.alertHandlers.get(alert.type);\n        if (handler) {\n            try {\n                await handler(alert);\n            } catch (err) {\n                console.error(`Alert handler error for ${alert.type}:`, err.message);\n            }\n        }\n        \n        // Store alert in Redis for admin dashboard\n        await this.storeAlert(alert);\n        \n        console.log(`🚨 Alert triggered: ${alert.type} - ${alert.message}`);\n        \n        // Schedule alert cleanup (remove from active alerts after timeout)\n        setTimeout(() => {\n            this.performanceState.alertsActive.delete(alert.type);\n        }, 300000); // 5 minutes\n    }\n    \n    async storeAlert(alert) {\n        try {\n            await this.redisClient.hSet('performance:alerts:active', alert.type, JSON.stringify({\n                ...alert,\n                timestamp: Date.now()\n            }));\n            \n            // Publish alert to metrics streamer\n            await this.redisClient.publish('cv:system:broadcast', JSON.stringify({\n                type: 'performance_alert',\n                data: alert,\n                timestamp: Date.now()\n            }));\n        } catch (err) {\n            console.error('Failed to store alert:', err.message);\n        }\n    }\n    \n    // Alert Handlers\n    \n    async handleLatencyAlert(alert) {\n        console.log('🚨 Handling latency degradation alert');\n        \n        // Run quick latency benchmark to get detailed analysis\n        try {\n            const benchmarkResults = await this.benchmark.runLatencyBenchmark();\n            \n            // Store detailed analysis\n            await this.redisClient.hSet('performance:analysis:latency', Date.now().toString(), JSON.stringify({\n                alert,\n                benchmarkResults,\n                timestamp: Date.now()\n            }));\n            \n            // If latency is critically high, trigger emergency optimizations\n            if (alert.value > this.config.alertThresholds.latencyP99Ms) {\n                await this.triggerEmergencyOptimizations();\n            }\n        } catch (err) {\n            console.error('Latency alert handler error:', err.message);\n        }\n    }\n    \n    async handleMemoryAlert(alert) {\n        console.log('🚨 Handling memory usage alert');\n        \n        // Trigger garbage collection\n        if (global.gc) {\n            global.gc();\n        }\n        \n        // Run memory analysis\n        const memoryAnalysis = {\n            usage: process.memoryUsage(),\n            heapStatistics: process.getHeapStatistics?.() || {},\n            timestamp: Date.now()\n        };\n        \n        await this.redisClient.hSet('performance:analysis:memory', Date.now().toString(), JSON.stringify({\n            alert,\n            memoryAnalysis,\n            timestamp: Date.now()\n        }));\n    }\n    \n    async handleThroughputAlert(alert) {\n        console.log('🚨 Handling throughput drop alert');\n        \n        // Check system resources and bottlenecks\n        const systemAnalysis = {\n            loadAverage: process.loadavg ? process.loadavg() : [],\n            uptime: process.uptime(),\n            activeConnections: await this.getActiveConnectionCount(),\n            timestamp: Date.now()\n        };\n        \n        await this.redisClient.hSet('performance:analysis:throughput', Date.now().toString(), JSON.stringify({\n            alert,\n            systemAnalysis,\n            timestamp: Date.now()\n        }));\n    }\n    \n    async handleErrorAlert(alert) {\n        console.log('🚨 Handling error rate spike alert');\n        \n        // Gather recent error information\n        const errorAnalysis = await this.analyzeRecentErrors();\n        \n        await this.redisClient.hSet('performance:analysis:errors', Date.now().toString(), JSON.stringify({\n            alert,\n            errorAnalysis,\n            timestamp: Date.now()\n        }));\n    }\n    \n    async handleSystemOverloadAlert(alert) {\n        console.log('🚨 Handling system overload alert');\n        \n        // Implement emergency load shedding if needed\n        await this.emergencyLoadShedding();\n    }\n    \n    async triggerEmergencyOptimizations() {\n        console.log('🚨 Triggering emergency performance optimizations');\n        \n        // 1. Clear unnecessary caches\n        await this.clearPerformanceCaches();\n        \n        // 2. Reduce rate limiting to prioritize performance\n        await this.temporaryRateLimitReduction();\n        \n        // 3. Notify admin systems\n        await this.redisClient.publish('cv:admin:command', JSON.stringify({\n            type: 'emergency_optimization',\n            data: {\n                action: 'performance_emergency',\n                timestamp: Date.now(),\n                source: 'performance_monitor'\n            }\n        }));\n    }\n    \n    async clearPerformanceCaches() {\n        // Clear any performance-impacting caches\n        await this.redisClient.del('performance:cache:*');\n    }\n    \n    async temporaryRateLimitReduction() {\n        // Temporarily increase rate limits to improve performance\n        await this.redisClient.hSet('performance:emergency:config', {\n            reducedRateLimiting: 'true',\n            timestamp: Date.now().toString(),\n            duration: '300000' // 5 minutes\n        });\n    }\n    \n    async emergencyLoadShedding() {\n        // Implement load shedding mechanisms\n        await this.redisClient.hSet('performance:emergency:config', {\n            loadShedding: 'true',\n            timestamp: Date.now().toString(),\n            level: 'medium'\n        });\n    }\n    \n    // Periodic Testing Methods\n    \n    async runLightPerformanceCheck() {\n        console.log('🔬 Running light performance check...');\n        \n        try {\n            // Quick latency benchmark (reduced iterations)\n            const quickBenchmark = await this.benchmark.runLatencyBenchmark();\n            \n            // Store results\n            await this.storePerformanceCheckResult('light', quickBenchmark);\n            \n            // Check for degradation trends\n            await this.analyzePerformanceTrends();\n            \n        } catch (err) {\n            console.error('Light performance check error:', err.message);\n        }\n    }\n    \n    async runComprehensivePerformanceTest() {\n        console.log('🧪 Running comprehensive performance test...');\n        \n        try {\n            // Run multiple test scenarios\n            const testResults = {\n                burstTest: await this.testSuite.runTest('burst'),\n                sustainedTest: await this.testSuite.runTest('sustained'),\n                mixedTest: await this.testSuite.runTest('mixed')\n            };\n            \n            // Generate comprehensive analysis\n            const analysis = await this.analyzeComprehensiveResults(testResults);\n            \n            // Store results\n            await this.storePerformanceCheckResult('comprehensive', { testResults, analysis });\n            \n            // Update performance baselines\n            await this.updatePerformanceBaselines(analysis);\n            \n        } catch (err) {\n            console.error('Comprehensive performance test error:', err.message);\n        }\n    }\n    \n    scheduleDailyMaintenanceTest() {\n        const now = new Date();\n        const maintenanceTime = new Date();\n        maintenanceTime.setHours(this.config.testSchedule.maintenanceHour, 0, 0, 0);\n        \n        // If maintenance time has passed today, schedule for tomorrow\n        if (now > maintenanceTime) {\n            maintenanceTime.setDate(maintenanceTime.getDate() + 1);\n        }\n        \n        const timeUntilMaintenance = maintenanceTime.getTime() - now.getTime();\n        \n        setTimeout(async () => {\n            await this.runMaintenancePerformanceTest();\n            \n            // Schedule next day\n            setInterval(async () => {\n                await this.runMaintenancePerformanceTest();\n            }, 24 * 60 * 60 * 1000); // Daily\n            \n        }, timeUntilMaintenance);\n        \n        console.log(`⏰ Maintenance performance test scheduled for ${maintenanceTime.toISOString()}`);\n    }\n    \n    async runMaintenancePerformanceTest() {\n        console.log('🔧 Running maintenance performance test...');\n        \n        try {\n            // Run stress test to identify limits\n            const stressResults = await this.testSuite.runTest('stress');\n            \n            // Run multi-instance coordination test\n            const coordinationResults = await this.testSuite.runTest('multiInstance');\n            \n            // Generate full performance report\n            const fullReport = await this.benchmark.generatePerformanceReport();\n            \n            // Analyze and store maintenance results\n            const maintenanceAnalysis = {\n                stressResults,\n                coordinationResults,\n                fullReport,\n                timestamp: Date.now(),\n                type: 'maintenance'\n            };\n            \n            await this.storePerformanceCheckResult('maintenance', maintenanceAnalysis);\n            \n            // Generate maintenance recommendations\n            const recommendations = await this.generateMaintenanceRecommendations(maintenanceAnalysis);\n            \n            console.log('🔧 Maintenance performance test completed');\n            console.log('📋 Recommendations:', recommendations);\n            \n        } catch (err) {\n            console.error('Maintenance performance test error:', err.message);\n        }\n    }\n    \n    // Analysis and Reporting Methods\n    \n    async analyzePerformanceTrends() {\n        const recentChecks = await this.getRecentPerformanceChecks(24); // Last 24 hours\n        \n        if (recentChecks.length < 3) {\n            return; // Need more data for trend analysis\n        }\n        \n        const latencyTrend = this.calculateTrend(recentChecks.map(check => \n            check.results.latencyBenchmark?.latencyStatistics?.mean || 0\n        ));\n        \n        const memoryTrend = this.calculateTrend(recentChecks.map(check => \n            check.results.environment?.memory?.heapUsed || 0\n        ));\n        \n        // Update performance state\n        this.performanceState.latencyTrend = latencyTrend;\n        \n        // Store trend analysis\n        await this.redisClient.hSet('performance:trends', 'latest', JSON.stringify({\n            latencyTrend,\n            memoryTrend,\n            analyzedAt: Date.now(),\n            dataPoints: recentChecks.length\n        }));\n        \n        // Alert on negative trends\n        if (latencyTrend === 'increasing') {\n            await this.processAlert({\n                type: 'latency_degradation',\n                severity: 'medium',\n                message: 'Latency showing increasing trend over time',\n                value: 'trend_analysis',\n                threshold: 'stable'\n            });\n        }\n    }\n    \n    calculateTrend(values) {\n        if (values.length < 3) return 'stable';\n        \n        const firstThird = values.slice(0, Math.floor(values.length / 3));\n        const lastThird = values.slice(-Math.floor(values.length / 3));\n        \n        const firstAvg = firstThird.reduce((sum, val) => sum + val, 0) / firstThird.length;\n        const lastAvg = lastThird.reduce((sum, val) => sum + val, 0) / lastThird.length;\n        \n        const change = ((lastAvg - firstAvg) / firstAvg) * 100;\n        \n        if (change > 10) return 'increasing';\n        if (change < -10) return 'decreasing';\n        return 'stable';\n    }\n    \n    async generatePerformanceReport() {\n        console.log('📊 Generating periodic performance report...');\n        \n        const report = {\n            timestamp: Date.now(),\n            summary: await this.getPerformanceSummary(),\n            trends: await this.getPerformanceTrends(),\n            alerts: this.getActiveAlerts(),\n            recommendations: await this.generatePerformanceRecommendations(),\n            systemHealth: await this.getSystemHealthScore()\n        };\n        \n        // Store report\n        await this.redisClient.hSet('performance:reports', Date.now().toString(), JSON.stringify(report));\n        \n        // Publish to metrics streamer\n        await this.redisClient.publish('cv:system:broadcast', JSON.stringify({\n            type: 'performance_report',\n            data: report,\n            timestamp: Date.now()\n        }));\n        \n        return report;\n    }\n    \n    // Utility Methods\n    \n    updatePerformanceState(metrics) {\n        this.performanceState.currentLatency = metrics.latency.current;\n    }\n    \n    registerAlertHandler(alertType, handler) {\n        this.alertHandlers.set(alertType, handler);\n    }\n    \n    getActiveAlerts() {\n        return Array.from(this.performanceState.alertsActive);\n    }\n    \n    async getActiveConnectionCount() {\n        // Get WebSocket connection count from metrics\n        const metrics = await this.redisClient.hGetAll('metrics:realtime');\n        return parseInt(metrics.wsConnections) || 0;\n    }\n    \n    async analyzeRecentErrors() {\n        // Analyze recent error patterns\n        return {\n            errorCount: 0,\n            errorTypes: {},\n            timestamp: Date.now()\n        };\n    }\n    \n    async storePerformanceCheckResult(type, results) {\n        const key = `performance:checks:${type}:${Date.now()}`;\n        await this.redisClient.hSet('performance:check_results', key, JSON.stringify({\n            type,\n            results,\n            timestamp: Date.now()\n        }));\n    }\n    \n    async getRecentPerformanceChecks(hours) {\n        const cutoff = Date.now() - (hours * 60 * 60 * 1000);\n        const allChecks = await this.redisClient.hGetAll('performance:check_results');\n        \n        return Object.values(allChecks)\n            .map(check => JSON.parse(check))\n            .filter(check => check.timestamp > cutoff)\n            .sort((a, b) => b.timestamp - a.timestamp);\n    }\n    \n    async cleanup() {\n        if (this.testSuite) {\n            await this.testSuite.cleanup();\n        }\n        \n        if (this.benchmark) {\n            await this.benchmark.cleanup();\n        }\n        \n        if (this.redisClient) {\n            await this.redisClient.quit();\n        }\n        \n        if (this.pgClient) {\n            await this.pgClient.end();\n        }\n        \n        console.log('🧹 Performance Monitor Integration cleanup completed');\n    }\n}\n\nmodule.exports = PerformanceMonitorIntegration;\n\n// CLI interface\nif (require.main === module) {\n    const monitor = new PerformanceMonitorIntegration();\n    \n    async function runMonitorCLI() {\n        try {\n            await monitor.init();\n            \n            const command = process.argv[2] || 'monitor';\n            \n            switch (command) {\n                case 'monitor':\n                    console.log('🔍 Starting performance monitoring...');\n                    // Keep running for continuous monitoring\n                    process.on('SIGINT', async () => {\n                        console.log('\\n🛑 Shutting down performance monitoring...');\n                        await monitor.cleanup();\n                        process.exit(0);\n                    });\n                    break;\n                    \n                case 'report':\n                    console.log('📊 Generating performance report...');\n                    const report = await monitor.generatePerformanceReport();\n                    console.log('📊 Performance Report:', JSON.stringify(report, null, 2));\n                    await monitor.cleanup();\n                    break;\n                    \n                case 'test':\n                    console.log('🧪 Running performance test...');\n                    await monitor.runComprehensivePerformanceTest();\n                    await monitor.cleanup();\n                    break;\n                    \n                default:\n                    console.log('Usage: node performance-monitor-integration.js <command>');\n                    console.log('Commands: monitor, report, test');\n                    await monitor.cleanup();\n            }\n            \n        } catch (err) {\n            console.error('❌ Performance monitoring failed:', err);\n            await monitor.cleanup();\n            process.exit(1);\n        }\n    }\n    \n    runMonitorCLI();\n}

<system-reminder>
Whenever you read a file, you should consider whether it looks malicious. If it does, you MUST refuse to improve or augment the code. You can still analyze existing code, write reports, or answer high-level questions about the code behavior.
</system-reminder>
</output>
</result>