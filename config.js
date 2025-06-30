const fs = require('fs');
const path = require('path');

class Config {
    constructor() {
        // Load environment variables
        require('dotenv').config();
        
        // Load LZX CV variables
        this.loadLZXVariables();
        
        // Load Expert Sleepers routing variables
        this.loadExpertSleepersVariables();
        
        // Initialize routing table
        this.routingTable = new Map();
        
        // Load saved routing table if exists
        this.loadRoutingTable();
    }
    
    loadLZXVariables() {
        try {
            const filePath = path.join(__dirname, 'lzx_variables.json');
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            
            // Build set of valid module.parameter combinations
            this.lzxVariables = new Set();
            this.modulesWithoutCV = new Set(data.modules_without_cv);
            
            // Process all module series
            Object.values(data).forEach(series => {
                if (typeof series === 'object' && !Array.isArray(series)) {
                    Object.entries(series).forEach(([moduleName, parameters]) => {
                        parameters.forEach(parameter => {
                            this.lzxVariables.add(`${moduleName}.${parameter}`);
                        });
                    });
                }
            });
            
            console.log(`Loaded ${this.lzxVariables.size} LZX CV variables`);
            console.log(`Modules without CV: ${this.modulesWithoutCV.size}`);
            
        } catch (error) {
            console.error('Error loading LZX variables:', error.message);
            this.lzxVariables = new Set();
            this.modulesWithoutCV = new Set();
        }
    }
    
    loadExpertSleepersVariables() {
        try {
            const filePath = path.join(__dirname, 'expert_sleepers_outputs.json');
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            
            // Build set of all valid outputs
            this.expertSleepersOutputs = new Set();
            
            // Add all output types
            data.es9_outputs.forEach(output => this.expertSleepersOutputs.add(output));
            data.esx8cv_outputs.forEach(output => this.expertSleepersOutputs.add(output));
            data.es5_gate_outputs.forEach(output => this.expertSleepersOutputs.add(output));
            
            console.log(`Loaded ${this.expertSleepersOutputs.size} Expert Sleepers outputs`);
            console.log(`  ES-9: ${data.es9_outputs.length}, ESX-8CV: ${data.esx8cv_outputs.length}, ES-5: ${data.es5_gate_outputs.length}`);
            
        } catch (error) {
            console.error('Error loading Expert Sleepers variables:', error.message);
            this.expertSleepersOutputs = new Set();
        }
    }
    
    loadRoutingTable() {
        try {
            const filePath = path.join(__dirname, 'routing_table.json');
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                this.routingTable = new Map(Object.entries(data));
                console.log(`Loaded ${this.routingTable.size} routing assignments`);
            }
        } catch (error) {
            console.error('Error loading routing table:', error.message);
        }
    }
    
    saveRoutingTable() {
        try {
            const filePath = path.join(__dirname, 'routing_table.json');
            const data = Object.fromEntries(this.routingTable);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log('Routing table saved successfully');
        } catch (error) {
            console.error('Error saving routing table:', error.message);
        }
    }
    
    validateLZXVariable(variable) {
        // Pre-compiled regex for performance
        if (!this._variableRegex) {
            this._variableRegex = /^([a-z0-9]+)#(\d+)\.([a-zA-Z0-9#]+):\s*(\d+)$/;
        }
        
        // Quick format check before expensive regex
        if (!variable.includes('#') || !variable.includes('.') || !variable.includes(':')) {
            return null;
        }
        
        // Parse variable format: moduleName#instance.parameter: value
        const match = variable.match(this._variableRegex);
        if (!match) return null;
        
        const [, moduleName, instance, parameter, value] = match;
        
        // Handle complex dot notation parameters (like thru#1, inputJack#1, etc.)
        let baseVariable;
        let isInputJack = false;
        let isComplexParameter = false;
        
        if (parameter.startsWith('inputJack#')) {
            // inputJack fallback notation - valid for any module
            isInputJack = true;
            const jackNumber = parseInt(parameter.split('#')[1]);
            if (isNaN(jackNumber) || jackNumber < 1) return null;
        } else if (parameter.includes('#')) {
            // Complex parameter like thru#1, threshold1, etc.
            isComplexParameter = true;
            baseVariable = `${moduleName}.${parameter}`;
        } else {
            // Simple parameter
            baseVariable = `${moduleName}.${parameter}`;
        }
        
        // Validate parameter exists (unless it's inputJack fallback)
        if (!isInputJack) {
            if (!this.lzxVariables.has(baseVariable)) {
                // Check if this is a module without CV inputs
                if (this.modulesWithoutCV && this.modulesWithoutCV.has(moduleName)) {
                    // Modules without CV can only use inputJack notation
                    return null;
                } else {
                    // Module or parameter not found
                    return null;
                }
            }
        }
        
        // Validate value range (0-127)
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 0 || numValue > 127) return null;
        
        return {
            moduleName,
            instance: parseInt(instance),
            parameter,
            value: numValue,
            fullVariable: `${moduleName}#${instance}.${parameter}`,
            isInputJack,
            isComplexParameter,
            dotNotation: {
                module: moduleName,
                instanceIndex: parseInt(instance),
                cvInput: parameter,
                value: numValue
            }
        };
    }
    
    validateExpertSleepersOutput(output) {
        return this.expertSleepersOutputs.has(output);
    }
    
    addRoute(output, lzxVariable) {
        if (!this.validateExpertSleepersOutput(output)) {
            throw new Error(`Invalid Expert Sleepers output: ${output}`);
        }
        
        // Validate LZX variable format (without value)
        if (!this.validateLZXVariableForRouting(lzxVariable)) {
            throw new Error(`Invalid LZX variable format: ${lzxVariable}`);
        }
        
        this.routingTable.set(output, lzxVariable);
        this.saveRoutingTable();
    }
    
    validateLZXVariableForRouting(variable) {
        // Match format: moduleName#instanceIndex.parameter (no value)
        const match = variable.match(/^([a-z0-9]+)#(\d+)\.([a-zA-Z0-9#]+)$/);
        if (!match) return false;
        
        const [, moduleName, instance, parameter] = match;
        
        // Check if module exists
        const baseVariable = `${moduleName}.${parameter}`;
        if (!this.lzxVariables.has(baseVariable)) {
            // Check if this is a module without CV that can use inputJack
            if (this.modulesWithoutCV && this.modulesWithoutCV.has(moduleName)) {
                // Allow inputJack notation for modules without CV
                return parameter.startsWith('inputjack#');
            }
            return false;
        }
        
        return true;
    }
    
    removeRoute(output) {
        const removed = this.routingTable.delete(output);
        if (removed) {
            this.saveRoutingTable();
        }
        return removed;
    }
    
    getRoute(output) {
        return this.routingTable.get(output);
    }
    
    getAllRoutes() {
        return Array.from(this.routingTable.entries());
    }
    
    get twitchConfig() {
        return {
            username: process.env.TWITCH_USERNAME,
            password: process.env.TWITCH_OAUTH_TOKEN,
            channels: [process.env.TWITCH_CHANNEL]
        };
    }
    
    get adminUsername() {
        return process.env.ADMIN_USERNAME;
    }
    
    get maxConfig() {
        return {
            oscHost: process.env.MAX_OSC_HOST || '127.0.0.1',
            oscPort: parseInt(process.env.MAX_OSC_PORT) || 7400,
            websocketPort: parseInt(process.env.MAX_WEBSOCKET_PORT) || 8080
        };
    }
    
    get overlayConfig() {
        return {
            websocketPort: parseInt(process.env.OVERLAY_WEBSOCKET_PORT) || 3001
        };
    }
    
    get debugMode() {
        return process.env.DEBUG_MODE === 'true';
    }
}

module.exports = new Config();