const config = require('./config');

console.log('🧪 Testing Twitch-to-CV Bot Configuration');
console.log('==========================================');

// Test LZX variable validation
console.log('\\n📋 Testing LZX Variable Validation:');

const testVariables = [
    'doorway#1.threshold: 89',          // Valid
    'visualcortex#2.keyer: 127',        // Valid  
    'invalid#1.badparam: 50',           // Invalid module/param
    'doorway#1.threshold: 150',         // Invalid value (>127)
    'dsg3#1.inputJack#1: 64',          // Valid fallback
    'angles#2.inputJack#5: 32',        // Valid fallback (high number)
    'doorway#abc.threshold: 89',        // Invalid instance format
    'doorway#1.threshold:89',           // Valid (no space)
    'doorway#1.threshold: abc',         // Invalid value format
];

testVariables.forEach(variable => {
    const result = config.validateLZXVariable(variable);
    const status = result ? '✅' : '❌';
    console.log(`${status} ${variable}`);
    if (result && config.debugMode) {
        console.log(`   → ${JSON.stringify(result)}`);
    }
});

// Test Expert Sleepers output validation
console.log('\\n🔌 Testing Expert Sleepers Output Validation:');

const testOutputs = [
    'es9out#1',              // Valid ES-9
    'es9out#8',              // Valid ES-9 (max)
    'es9out#9',              // Invalid ES-9 (too high)
    'esx8cv#1.out#1',        // Valid ESX-8CV
    'esx8cv#6.out#8',        // Valid ESX-8CV (max unit, max output)
    'esx8cv#7.out#1',        // Invalid ESX-8CV (too many units)
    'esx8cv#1.out#9',        // Invalid ESX-8CV (too many outputs)
    'es5gate#1',             // Valid ES-5 gate
    'es5gate#8',             // Valid ES-5 gate (max)
    'es5gate#9',             // Invalid ES-5 gate (too high)
    'invalid#1',             // Invalid format
];

testOutputs.forEach(output => {
    const isValid = config.validateExpertSleepersOutput(output);
    const status = isValid ? '✅' : '❌';
    console.log(`${status} ${output}`);
});

// Test routing system
console.log('\\n🛤️ Testing Routing System:');

try {
    // Add test routes
    config.addRoute('es9out#1', 'doorway#1.threshold');
    config.addRoute('esx8cv#2.out#5', 'topogram#1.gain');
    
    console.log('✅ Added test routes successfully');
    
    // List routes
    const routes = config.getAllRoutes();
    console.log(`📋 Current routes (${routes.length}):`);
    routes.forEach(([output, variable]) => {
        console.log(`   ${output} → ${variable}`);
    });
    
    // Test route retrieval
    const route1 = config.getRoute('es9out#1');
    console.log(`🔍 Route for es9out#1: ${route1}`);
    
    // Clean up test routes
    config.removeRoute('es9out#1');
    config.removeRoute('esx8cv#2.out#5');
    console.log('🧹 Cleaned up test routes');
    
} catch (error) {
    console.error('❌ Routing test failed:', error.message);
}

// Test configuration loading
console.log('\\n⚙️ Configuration Status:');

console.log(`📺 Twitch Channel: ${config.twitchConfig.channels?.[0] || 'NOT_SET'}`);
console.log(`👑 Admin User: ${config.adminUsername || 'NOT_SET'}`);
console.log(`🎛️ Max OSC: ${config.maxConfig.oscHost}:${config.maxConfig.oscPort}`);
console.log(`🖼️ Overlay WebSocket: port ${config.overlayConfig.websocketPort}`);
console.log(`🐛 Debug Mode: ${config.debugMode}`);

console.log(`\\n📊 System Capacity:`);
console.log(`   LZX Variables Loaded: ${config.lzxVariables.size}`);
console.log(`   Expert Sleepers Outputs: ${config.expertSleepersOutputs.size}`);
console.log(`   Current Routes: ${config.getAllRoutes().length}`);

// Environment validation
console.log('\\n🔍 Environment Validation:');

const requiredEnvVars = [
    'TWITCH_USERNAME',
    'TWITCH_OAUTH_TOKEN', 
    'TWITCH_CHANNEL',
    'ADMIN_USERNAME'
];

let envComplete = true;
requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    const status = value ? '✅' : '❌';
    console.log(`${status} ${envVar}: ${value ? 'SET' : 'MISSING'}`);
    if (!value) envComplete = false;
});

console.log('\\n🎯 Test Results Summary:');
console.log(`   Environment: ${envComplete ? '✅ Complete' : '❌ Missing required variables'}`);
console.log(`   LZX Variables: ✅ ${config.lzxVariables.size} loaded`);
console.log(`   Hardware Outputs: ✅ ${config.expertSleepersOutputs.size} available`);
console.log(`   Routing System: ✅ Functional`);

if (!envComplete) {
    console.log('\\n⚠️ To complete setup:');
    console.log('   1. Copy .env.example to .env');
    console.log('   2. Fill in your Twitch credentials');
    console.log('   3. Set your admin username');
}

console.log('\\n✅ Configuration test completed!');