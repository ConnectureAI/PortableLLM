#!/usr/bin/env node

/**
 * List Models Script
 * Lists available and installed AI models for PortableLLM
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
};

class ModelLister {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.modelsConfig = this.loadModelsConfig();
  }

  log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  success(message) {
    this.log(`✓ ${message}`, colors.green);
  }

  error(message) {
    this.log(`✗ ${message}`, colors.red);
  }

  warning(message) {
    this.log(`⚠ ${message}`, colors.yellow);
  }

  info(message) {
    this.log(`ℹ ${message}`, colors.blue);
  }

  loadModelsConfig() {
    const configPath = path.join(__dirname, '..', 'config', 'models.json');
    
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    return { models: {} };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    
    return date.toLocaleDateString();
  }

  async checkOllamaStatus() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/version`, {
        timeout: 5000
      });
      
      return {
        running: true,
        version: response.data.version || 'unknown'
      };
    } catch (error) {
      return {
        running: false,
        error: error.message
      };
    }
  }

  async getInstalledModels() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`);
      return response.data.models || [];
    } catch (error) {
      return [];
    }
  }

  async getModelInfo(modelName) {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/show`, {
        name: modelName
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  getAvailableModels() {
    return Object.entries(this.modelsConfig.models || {}).map(([name, config]) => ({
      name,
      ...config
    }));
  }

  printModelTable(models, title) {
    if (models.length === 0) {
      this.warning(`No ${title.toLowerCase()} found`);
      return;
    }

    this.log(`\n${colors.bold}${title}${colors.reset}`, colors.cyan);
    this.log('='.repeat(80), colors.cyan);

    // Table headers
    const headers = ['Model Name', 'Size', 'Modified', 'Status'];
    this.log(
      `${colors.bold}${headers[0].padEnd(35)} ${headers[1].padEnd(10)} ${headers[2].padEnd(15)} ${headers[3]}${colors.reset}`,
      colors.blue
    );
    this.log('-'.repeat(80), colors.blue);

    // Table rows
    models.forEach(model => {
      const name = model.name.padEnd(35);
      const size = (model.size ? this.formatBytes(model.size) : 'Unknown').padEnd(10);
      const modified = this.formatDate(model.modified_at || model.modified).padEnd(15);
      
      let status = '';
      let statusColor = colors.reset;
      
      if (model.status === 'installed') {
        status = '✓ Installed';
        statusColor = colors.green;
      } else if (model.healthcare_optimized) {
        status = '🏥 Healthcare';
        statusColor = colors.magenta;
      } else {
        status = 'Available';
        statusColor = colors.yellow;
      }
      
      console.log(`${name} ${size} ${modified} ${statusColor}${status}${colors.reset}`);
    });
  }

  printDetailedModel(model, info = null) {
    this.log(`\n${colors.bold}Model Details: ${model.name}${colors.reset}`, colors.cyan);
    this.log('='.repeat(50), colors.cyan);
    
    // Basic information
    if (model.description) {
      this.log(`Description: ${model.description}`);
    }
    
    if (model.size || (info && info.size)) {
      const size = model.size ? this.formatBytes(model.size) : this.formatBytes(info.size);
      this.log(`Size: ${size}`);
    }
    
    if (model.parameters) {
      this.log(`Parameters: ${model.parameters}`);
    }
    
    if (model.quantization) {
      this.log(`Quantization: ${model.quantization}`);
    }
    
    if (model.modified_at || model.modified) {
      const date = this.formatDate(model.modified_at || model.modified);
      this.log(`Modified: ${date}`);
    }
    
    // Healthcare optimization
    if (model.healthcare_optimized) {
      this.log(`Healthcare Optimized: ${colors.green}Yes${colors.reset}`);
    }
    
    // Use cases
    if (model.use_cases && model.use_cases.length > 0) {
      this.log(`Use Cases:`);
      model.use_cases.forEach(useCase => {
        this.log(`  • ${useCase.replace(/_/g, ' ')}`);
      });
    }
    
    // Performance metrics
    if (model.performance) {
      this.log(`Performance:`);
      if (model.performance.tokens_per_second) {
        this.log(`  • Speed: ${model.performance.tokens_per_second} tokens/sec`);
      }
      if (model.performance.memory_usage) {
        this.log(`  • Memory: ${model.performance.memory_usage}`);
      }
      if (model.performance.latency_ms) {
        this.log(`  • Latency: ${model.performance.latency_ms}ms`);
      }
    }
    
    // Tags
    if (model.tags && model.tags.length > 0) {
      this.log(`Tags: ${model.tags.join(', ')}`);
    }
    
    // Technical details from Ollama
    if (info) {
      if (info.details) {
        this.log(`\nTechnical Details:`);
        if (info.details.format) {
          this.log(`  • Format: ${info.details.format}`);
        }
        if (info.details.family) {
          this.log(`  • Family: ${info.details.family}`);
        }
        if (info.details.families) {
          this.log(`  • Families: ${info.details.families.join(', ')}`);
        }
        if (info.details.parameter_size) {
          this.log(`  • Parameter Size: ${info.details.parameter_size}`);
        }
        if (info.details.quantization_level) {
          this.log(`  • Quantization Level: ${info.details.quantization_level}`);
        }
      }
      
      if (info.model_info && Object.keys(info.model_info).length > 0) {
        this.log(`\nModel Info:`);
        for (const [key, value] of Object.entries(info.model_info)) {
          if (typeof value === 'string' && value.length < 100) {
            this.log(`  • ${key}: ${value}`);
          }
        }
      }
    }
  }

  async run(options = {}) {
    const {
      detailed = false,
      healthcare = false,
      installed = false,
      available = false,
      model = null
    } = options;

    this.log('🤖 PortableLLM Model Listing', colors.cyan);
    this.log('='.repeat(50), colors.cyan);

    // Check Ollama status
    const ollamaStatus = await this.checkOllamaStatus();
    
    if (ollamaStatus.running) {
      this.success(`Ollama is running (${ollamaStatus.version})`);
    } else {
      this.error(`Ollama is not running: ${ollamaStatus.error}`);
      this.warning('Some information may not be available');
    }

    // Get model data
    const installedModels = ollamaStatus.running ? await this.getInstalledModels() : [];
    const availableModels = this.getAvailableModels();
    const installedNames = installedModels.map(m => m.name);

    // Mark available models as installed
    availableModels.forEach(model => {
      if (installedNames.includes(model.name)) {
        model.status = 'installed';
        const installed = installedModels.find(m => m.name === model.name);
        if (installed) {
          model.size = installed.size;
          model.modified_at = installed.modified_at;
        }
      }
    });

    // Handle specific model request
    if (model) {
      const modelData = availableModels.find(m => m.name === model) || 
                       installedModels.find(m => m.name === model);
      
      if (!modelData) {
        this.error(`Model '${model}' not found`);
        return;
      }

      const modelInfo = ollamaStatus.running ? await this.getModelInfo(model) : null;
      this.printDetailedModel(modelData, modelInfo);
      return;
    }

    // Show installed models
    if (installed || (!healthcare && !available)) {
      this.printModelTable(installedModels, 'Installed Models');
      
      if (detailed && installedModels.length > 0) {
        for (const model of installedModels) {
          const modelInfo = await this.getModelInfo(model.name);
          const configData = availableModels.find(m => m.name === model.name);
          this.printDetailedModel({ ...model, ...(configData || {}) }, modelInfo);
        }
      }
    }

    // Show available models
    if (available || (!installed && !healthcare)) {
      let modelsToShow = availableModels;
      
      if (healthcare) {
        modelsToShow = availableModels.filter(m => m.healthcare_optimized);
      }
      
      this.printModelTable(modelsToShow, healthcare ? 'Healthcare Models' : 'Available Models');
      
      if (detailed && modelsToShow.length > 0) {
        for (const model of modelsToShow) {
          const modelInfo = ollamaStatus.running && model.status === 'installed' 
            ? await this.getModelInfo(model.name) 
            : null;
          this.printDetailedModel(model, modelInfo);
        }
      }
    }

    // Show healthcare models specifically
    if (healthcare && !available) {
      const healthcareModels = availableModels.filter(m => m.healthcare_optimized);
      this.printModelTable(healthcareModels, 'Healthcare-Optimized Models');
      
      if (detailed && healthcareModels.length > 0) {
        for (const model of healthcareModels) {
          const modelInfo = ollamaStatus.running && model.status === 'installed' 
            ? await this.getModelInfo(model.name) 
            : null;
          this.printDetailedModel(model, modelInfo);
        }
      }
    }

    // Summary statistics
    const totalInstalled = installedModels.length;
    const totalAvailable = availableModels.length;
    const healthcareInstalled = installedModels.filter(m => {
      const config = availableModels.find(a => a.name === m.name);
      return config && config.healthcare_optimized;
    }).length;
    
    this.log(`\n📊 Summary`, colors.cyan);
    this.log('='.repeat(30), colors.cyan);
    this.info(`Total available models: ${totalAvailable}`);
    this.info(`Total installed models: ${totalInstalled}`);
    this.info(`Healthcare models installed: ${healthcareInstalled}`);
    
    if (totalInstalled > 0) {
      const totalSize = installedModels
        .filter(m => m.size)
        .reduce((sum, m) => sum + m.size, 0);
      
      if (totalSize > 0) {
        this.info(`Total disk usage: ${this.formatBytes(totalSize)}`);
      }
    }

    // Recommendations
    if (!healthcare && totalInstalled === 0) {
      this.log(`\n💡 Getting Started`, colors.yellow);
      this.log('='.repeat(30), colors.yellow);
      this.info('To download healthcare-optimized models, run:');
      console.log('  node scripts/download-models.js --healthcare');
      this.info('To download a specific model, run:');
      console.log('  node scripts/download-models.js --model deepseek-coder:6.7b-instruct');
    }
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    detailed: false,
    healthcare: false,
    installed: false,
    available: false,
    model: null
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--detailed':
      case '-d':
        options.detailed = true;
        break;
      case '--healthcare':
        options.healthcare = true;
        break;
      case '--installed':
        options.installed = true;
        break;
      case '--available':
        options.available = true;
        break;
      case '--model':
      case '-m':
        if (i + 1 < args.length) {
          options.model = args[i + 1];
          i++;
        }
        break;
      case '--help':
      case '-h':
        console.log(`
PortableLLM Model Listing Tool

Usage: node list-models.js [OPTIONS]

Options:
  --detailed, -d     Show detailed information for each model
  --healthcare       Show only healthcare-optimized models
  --installed        Show only installed models
  --available        Show only available (not installed) models
  --model <name>     Show detailed info for specific model
  --help, -h         Show this help message

Examples:
  node list-models.js                    # Show all installed models
  node list-models.js --healthcare       # Show healthcare models
  node list-models.js --detailed         # Show detailed information
  node list-models.js -m llama3.1:8b-instruct  # Show specific model
  node list-models.js --available --detailed    # Show available models with details
`);
        process.exit(0);
        break;
      default:
        if (!arg.startsWith('--') && !arg.startsWith('-')) {
          options.model = arg;
        }
        break;
    }
  }

  const lister = new ModelLister();
  lister.run(options).catch(error => {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = ModelLister;