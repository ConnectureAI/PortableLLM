#!/usr/bin/env node

/**
 * Model Download Script
 * Downloads and sets up AI models for PortableLLM
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
};

class ModelDownloader {
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
    
    // Default configuration if file doesn't exist
    return {
      models: {
        'deepseek-coder:6.7b-instruct': {
          name: 'DeepSeek Coder',
          description: 'Code-focused model for technical documentation',
          priority: 1,
          healthcare_optimized: true
        },
        'llama3.1:8b-instruct': {
          name: 'Llama 3.1',
          description: 'General-purpose model with strong reasoning',
          priority: 2,
          healthcare_optimized: true
        },
        'mistral:7b-instruct': {
          name: 'Mistral',
          description: 'Efficient model for professional communication',
          priority: 3,
          healthcare_optimized: true
        }
      }
    };
  }

  async checkOllamaStatus() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/version`, {
        timeout: 5000
      });
      
      this.success(`Ollama is running (${response.data.version || 'unknown version'})`);
      return true;
    } catch (error) {
      this.error('Ollama is not running or not accessible');
      this.info('Please ensure Ollama is running and accessible at ' + this.ollamaUrl);
      return false;
    }
  }

  async listInstalledModels() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`);
      return response.data.models || [];
    } catch (error) {
      this.error('Failed to list installed models');
      return [];
    }
  }

  async downloadModel(modelName) {
    try {
      this.info(`Starting download: ${modelName}`);
      
      const response = await axios.post(`${this.ollamaUrl}/api/pull`, {
        name: modelName,
        stream: false
      }, {
        timeout: 0, // No timeout for downloads
      });

      if (response.status === 200) {
        this.success(`Downloaded: ${modelName}`);
        return true;
      } else {
        this.error(`Download failed: ${modelName}`);
        return false;
      }
    } catch (error) {
      this.error(`Download error for ${modelName}: ${error.message}`);
      return false;
    }
  }

  async downloadModelWithProgress(modelName) {
    try {
      this.info(`Starting download: ${modelName}`);
      
      const response = await axios.post(`${this.ollamaUrl}/api/pull`, {
        name: modelName,
        stream: true
      }, {
        responseType: 'stream',
        timeout: 0,
      });

      return new Promise((resolve, reject) => {
        let lastProgress = '';
        let downloadStarted = false;
        
        response.data.on('data', (chunk) => {
          try {
            const lines = chunk.toString().split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              const data = JSON.parse(line);
              
              if (data.status) {
                if (data.status === 'downloading' || data.status === 'pulling') {
                  downloadStarted = true;
                  if (data.completed && data.total) {
                    const percent = Math.round((data.completed / data.total) * 100);
                    const progress = `${modelName}: ${percent}% (${this.formatBytes(data.completed)}/${this.formatBytes(data.total)})`;
                    
                    if (progress !== lastProgress) {
                      process.stdout.write(`\r${colors.cyan}${progress}${colors.reset}`);
                      lastProgress = progress;
                    }
                  } else {
                    process.stdout.write(`\r${colors.cyan}${modelName}: ${data.status}...${colors.reset}`);
                  }
                }
                
                if (data.status === 'success') {
                  process.stdout.write('\n');
                  this.success(`Downloaded: ${modelName}`);
                  resolve(true);
                  return;
                }
              }
            }
          } catch (parseError) {
            // Ignore parsing errors for progress updates
          }
        });

        response.data.on('end', () => {
          process.stdout.write('\n');
          if (downloadStarted) {
            this.success(`Download completed: ${modelName}`);
            resolve(true);
          } else {
            this.error(`Download failed: ${modelName}`);
            resolve(false);
          }
        });

        response.data.on('error', (error) => {
          process.stdout.write('\n');
          this.error(`Download error for ${modelName}: ${error.message}`);
          resolve(false);
        });
      });
      
    } catch (error) {
      this.error(`Download error for ${modelName}: ${error.message}`);
      return false;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async run(options = {}) {
    const {
      models = [],
      healthcare = false,
      skipInstalled = true,
      showProgress = true
    } = options;

    this.log('\n🏥 PortableLLM Model Downloader', colors.cyan);
    this.log('='.repeat(50), colors.cyan);
    
    // Check Ollama status
    const ollamaRunning = await this.checkOllamaStatus();
    if (!ollamaRunning) {
      process.exit(1);
    }

    // Get installed models
    const installedModels = await this.listInstalledModels();
    const installedNames = installedModels.map(m => m.name);
    
    if (installedModels.length > 0) {
      this.info('\nCurrently installed models:');
      installedModels.forEach(model => {
        const size = model.size ? `(${this.formatBytes(model.size)})` : '';
        console.log(`  • ${model.name} ${size}`);
      });
    }

    // Determine which models to download
    let modelsToDownload = [];
    
    if (models.length > 0) {
      // Specific models requested
      modelsToDownload = models;
    } else {
      // Download based on configuration
      const availableModels = Object.entries(this.modelsConfig.models);
      
      if (healthcare) {
        // Only healthcare-optimized models
        modelsToDownload = availableModels
          .filter(([_, config]) => config.healthcare_optimized)
          .sort((a, b) => (a[1].priority || 999) - (b[1].priority || 999))
          .map(([name]) => name);
      } else {
        // All models, sorted by priority
        modelsToDownload = availableModels
          .sort((a, b) => (a[1].priority || 999) - (b[1].priority || 999))
          .map(([name]) => name);
      }
    }

    if (modelsToDownload.length === 0) {
      this.warning('No models to download');
      return;
    }

    // Filter out already installed models if requested
    if (skipInstalled) {
      const toDownload = modelsToDownload.filter(model => !installedNames.includes(model));
      const skipped = modelsToDownload.filter(model => installedNames.includes(model));
      
      if (skipped.length > 0) {
        this.info('\nSkipping already installed models:');
        skipped.forEach(model => console.log(`  • ${model}`));
      }
      
      modelsToDownload = toDownload;
    }

    if (modelsToDownload.length === 0) {
      this.success('\nAll requested models are already installed!');
      return;
    }

    this.info('\nModels to download:');
    modelsToDownload.forEach((model, index) => {
      const config = this.modelsConfig.models[model];
      const description = config ? config.description : 'No description available';
      console.log(`  ${index + 1}. ${model}`);
      console.log(`     ${description}`);
    });

    const totalModels = modelsToDownload.length;
    let successCount = 0;
    let failCount = 0;

    this.log('\n📥 Starting downloads...', colors.cyan);
    this.log('='.repeat(50), colors.cyan);

    for (let i = 0; i < modelsToDownload.length; i++) {
      const model = modelsToDownload[i];
      
      this.log(`\n[${i + 1}/${totalModels}] ${model}`, colors.yellow);
      
      const success = showProgress 
        ? await this.downloadModelWithProgress(model)
        : await this.downloadModel(model);
      
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Small delay between downloads
      if (i < modelsToDownload.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Summary
    this.log('\n📊 Download Summary', colors.cyan);
    this.log('='.repeat(50), colors.cyan);
    this.success(`Successfully downloaded: ${successCount} models`);
    
    if (failCount > 0) {
      this.error(`Failed downloads: ${failCount} models`);
    }
    
    if (successCount > 0) {
      this.info('\nVerifying installations...');
      const newInstalledModels = await this.listInstalledModels();
      const newInstalledNames = newInstalledModels.map(m => m.name);
      
      this.info('Currently installed models:');
      newInstalledModels.forEach(model => {
        const size = model.size ? `(${this.formatBytes(model.size)})` : '';
        const isNew = modelsToDownload.includes(model.name);
        const indicator = isNew ? colors.green + '• NEW' + colors.reset : '•';
        console.log(`  ${indicator} ${model.name} ${size}`);
      });
    }

    if (healthcare && successCount > 0) {
      this.log('\n🏥 Healthcare Setup Complete!', colors.green);
      this.info('Your PortableLLM installation now includes healthcare-optimized models.');
      this.info('These models are designed for:');
      console.log('  • Medical documentation and coding');
      console.log('  • Patient communication analysis');  
      console.log('  • Clinical decision support');
      console.log('  • HIPAA-compliant local processing');
    }
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    models: [],
    healthcare: false,
    skipInstalled: true,
    showProgress: true
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--healthcare':
        options.healthcare = true;
        break;
      case '--all':
        options.skipInstalled = false;
        break;
      case '--no-progress':
        options.showProgress = false;
        break;
      case '--model':
        if (i + 1 < args.length) {
          options.models.push(args[i + 1]);
          i++;
        }
        break;
      case '--help':
        console.log(`
PortableLLM Model Downloader

Usage: node download-models.js [OPTIONS]

Options:
  --healthcare     Download only healthcare-optimized models
  --all            Download all models (don't skip installed)
  --no-progress    Disable progress display
  --model <name>   Download specific model (can be used multiple times)
  --help           Show this help message

Examples:
  node download-models.js --healthcare
  node download-models.js --model deepseek-coder:6.7b-instruct
  node download-models.js --all --no-progress
`);
        process.exit(0);
        break;
      default:
        if (!arg.startsWith('--')) {
          options.models.push(arg);
        }
        break;
    }
  }

  const downloader = new ModelDownloader();
  downloader.run(options).catch(error => {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = ModelDownloader;