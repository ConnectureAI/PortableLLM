#!/usr/bin/env node

/**
 * PortableLLM Health Check Script
 * Comprehensive system health monitoring
 */

const axios = require('axios');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  baseUrl: 'http://localhost:8080',
  ollamaUrl: 'http://localhost:11434',
  timeout: 10000,
  retries: 3,
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

class HealthChecker {
  constructor() {
    this.checks = [];
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      total: 0,
    };
  }

  log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  success(message) {
    this.log(`✓ ${message}`, colors.green);
    this.results.passed++;
  }

  error(message) {
    this.log(`✗ ${message}`, colors.red);
    this.results.failed++;
  }

  warning(message) {
    this.log(`⚠ ${message}`, colors.yellow);
    this.results.warnings++;
  }

  info(message) {
    this.log(`ℹ ${message}`, colors.blue);
  }

  async httpCheck(url, description) {
    try {
      const response = await axios.get(url, { 
        timeout: config.timeout,
        validateStatus: (status) => status < 500,
      });
      
      if (response.status === 200) {
        this.success(`${description} - HTTP ${response.status}`);
        return response.data;
      } else {
        this.warning(`${description} - HTTP ${response.status}`);
        return null;
      }
    } catch (error) {
      this.error(`${description} - ${error.message}`);
      return null;
    }
  }

  async checkSystemResources() {
    this.log('\n📊 System Resources:', colors.cyan);
    
    // Memory check
    const totalMem = Math.round(os.totalmem() / (1024 ** 3));
    const freeMem = Math.round(os.freemem() / (1024 ** 3));
    const usedMem = totalMem - freeMem;
    const memUsage = ((usedMem / totalMem) * 100).toFixed(1);
    
    this.info(`Memory: ${usedMem}GB / ${totalMem}GB (${memUsage}% used)`);
    
    if (totalMem < 8) {
      this.warning('Low total memory (< 8GB). Performance may be affected.');
    } else if (memUsage > 85) {
      this.warning('High memory usage (> 85%). Consider restarting services.');
    } else {
      this.success('Memory usage is healthy');
    }
    
    // CPU check
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    this.info(`CPU: ${cpus[0].model} (${cpus.length} cores)`);
    this.info(`Load Average: ${loadAvg.map(l => l.toFixed(2)).join(', ')}`);
    
    if (cpus.length < 4) {
      this.warning('Low CPU core count (< 4). Performance may be affected.');
    } else {
      this.success('CPU resources are adequate');
    }
    
    // Uptime
    const uptime = os.uptime();
    const uptimeHours = (uptime / 3600).toFixed(1);
    this.info(`System uptime: ${uptimeHours} hours`);
    
    this.results.total += 2; // Memory and CPU checks
  }

  async checkFileSystem() {
    this.log('\n📁 File System:', colors.cyan);
    
    const projectRoot = path.join(__dirname, '..');
    const requiredDirs = ['data', 'models', 'logs', 'config'];
    
    for (const dir of requiredDirs) {
      const dirPath = path.join(projectRoot, dir);
      
      try {
        const stats = fs.statSync(dirPath);
        if (stats.isDirectory()) {
          // Check write permissions
          fs.accessSync(dirPath, fs.constants.W_OK);
          this.success(`Directory ${dir} exists and is writable`);
        } else {
          this.error(`${dir} exists but is not a directory`);
        }
      } catch (error) {
        this.error(`Directory ${dir} - ${error.message}`);
      }
    }
    
    // Check disk space
    try {
      const stats = fs.statSync(projectRoot);
      this.success('File system permissions are correct');
    } catch (error) {
      this.error(`File system check failed: ${error.message}`);
    }
    
    this.results.total += requiredDirs.length + 1;
  }

  async checkApplicationServices() {
    this.log('\n🚀 Application Services:', colors.cyan);
    
    // Main application health
    const healthData = await this.httpCheck(`${config.baseUrl}/health`, 'Main Application Health');
    
    if (healthData) {
      this.info(`Application version: ${healthData.version || 'unknown'}`);
      this.info(`Uptime: ${(healthData.uptime / 3600).toFixed(1)} hours`);
      
      if (healthData.memory) {
        const memMB = Math.round(healthData.memory.heapUsed / (1024 * 1024));
        this.info(`App memory usage: ${memMB}MB`);
      }
    }
    
    // API endpoints
    const apiData = await this.httpCheck(`${config.baseUrl}/api/v1/`, 'API Service');
    
    if (apiData) {
      this.info(`API version: ${apiData.api?.version || 'unknown'}`);
      this.info(`API mode: ${apiData.mode || 'unknown'}`);
      
      if (apiData.features) {
        this.info('Features:');
        Object.entries(apiData.features).forEach(([key, value]) => {
          this.info(`  - ${key}: ${value ? 'enabled' : 'disabled'}`);
        });
      }
    }
    
    this.results.total += 2;
  }

  async checkOllamaService() {
    this.log('\n🤖 Ollama Service:', colors.cyan);
    
    // Ollama version check
    const ollamaData = await this.httpCheck(`${config.ollamaUrl}/api/version`, 'Ollama Service');
    
    if (ollamaData) {
      this.info(`Ollama version: ${ollamaData.version || 'unknown'}`);
    }
    
    // Models check
    try {
      const response = await axios.get(`${config.ollamaUrl}/api/tags`, { timeout: config.timeout });
      const models = response.data.models || [];
      
      this.success(`Ollama Models - ${models.length} models available`);
      
      if (models.length === 0) {
        this.warning('No models installed. Run setup script to download default models.');
      } else {
        this.info('Available models:');
        models.forEach(model => {
          const sizeMB = model.size ? Math.round(model.size / (1024 * 1024)) : 'unknown';
          this.info(`  - ${model.name} (${sizeMB}MB)`);
        });
      }
    } catch (error) {
      this.error(`Ollama Models - ${error.message}`);
    }
    
    this.results.total += 2;
  }

  async checkNetworkConnectivity() {
    this.log('\n🌐 Network Connectivity:', colors.cyan);
    
    const endpoints = [
      { url: `${config.baseUrl}/api/v1/privacy`, name: 'Privacy Endpoint' },
      { url: `${config.baseUrl}/api/v1/system`, name: 'System Info Endpoint' },
    ];
    
    for (const endpoint of endpoints) {
      await this.httpCheck(endpoint.url, endpoint.name);
    }
    
    this.results.total += endpoints.length;
  }

  async checkConfiguration() {
    this.log('\n⚙️ Configuration:', colors.cyan);
    
    const configPath = path.join(__dirname, '..', 'config', 'app.json');
    
    try {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      this.success('Configuration file is valid JSON');
      
      // Check important settings
      if (configData.privacy?.local_only) {
        this.success('Privacy: Local-only processing enabled');
      } else {
        this.warning('Privacy: Local-only processing disabled');
      }
      
      if (configData.privacy?.audit_logging) {
        this.success('Privacy: Audit logging enabled');
      } else {
        this.warning('Privacy: Audit logging disabled');
      }
      
      if (configData.privacy?.encryption) {
        this.success('Privacy: Encryption enabled');
      } else {
        this.warning('Privacy: Encryption disabled');
      }
      
      if (configData.setup?.completed) {
        this.success('Setup: Initial setup completed');
      } else {
        this.warning('Setup: Initial setup not completed');
      }
      
    } catch (error) {
      this.error(`Configuration file error: ${error.message}`);
    }
    
    this.results.total += 5;
  }

  async checkDocker() {
    this.log('\n🐳 Docker Services:', colors.cyan);
    
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      // Check Docker status
      try {
        const { stdout } = await execAsync('docker ps --format "table {{.Names}}\t{{.Status}}"');
        const lines = stdout.split('\n').filter(line => line.trim());
        
        if (lines.length > 1) {
          this.success(`Docker: ${lines.length - 1} containers running`);
          
          for (let i = 1; i < lines.length; i++) {
            const [name, status] = lines[i].split('\t');
            if (name && status) {
              if (status.includes('Up')) {
                this.info(`  ✓ ${name}: ${status}`);
              } else {
                this.warning(`  ⚠ ${name}: ${status}`);
              }
            }
          }
        } else {
          this.warning('Docker: No containers running');
        }
      } catch (error) {
        this.error(`Docker status check failed: ${error.message}`);
      }
      
    } catch (error) {
      this.warning('Docker check skipped (not available in this environment)');
    }
    
    this.results.total += 1;
  }

  generateReport() {
    this.log('\n📋 Health Check Summary:', colors.cyan);
    this.log('='.repeat(50), colors.cyan);
    
    this.success(`Passed: ${this.results.passed}/${this.results.total}`);
    
    if (this.results.warnings > 0) {
      this.warning(`Warnings: ${this.results.warnings}`);
    }
    
    if (this.results.failed > 0) {
      this.error(`Failed: ${this.results.failed}`);
    }
    
    const score = ((this.results.passed / this.results.total) * 100).toFixed(1);
    
    if (score >= 90) {
      this.log(`\n🎉 Overall Health: Excellent (${score}%)`, colors.green);
    } else if (score >= 75) {
      this.log(`\n👍 Overall Health: Good (${score}%)`, colors.green);
    } else if (score >= 60) {
      this.log(`\n⚠️  Overall Health: Fair (${score}%)`, colors.yellow);
    } else {
      this.log(`\n❌ Overall Health: Poor (${score}%)`, colors.red);
    }
    
    if (this.results.failed > 0 || this.results.warnings > 0) {
      this.log('\n💡 Recommendations:', colors.cyan);
      
      if (this.results.failed > 0) {
        this.log('- Address failed checks to ensure proper functionality', colors.yellow);
      }
      
      if (this.results.warnings > 0) {
        this.log('- Review warnings for potential performance or security improvements', colors.yellow);
      }
      
      this.log('- Run the setup script if initial setup is not completed', colors.yellow);
      this.log('- Check logs in the logs/ directory for detailed error information', colors.yellow);
    }
    
    return score >= 75;
  }

  async run() {
    this.log('🏥 PortableLLM Health Check', colors.cyan);
    this.log('='.repeat(50), colors.cyan);
    this.log(`Timestamp: ${new Date().toISOString()}`, colors.blue);
    
    await this.checkSystemResources();
    await this.checkFileSystem();
    await this.checkConfiguration();
    await this.checkApplicationServices();
    await this.checkOllamaService();
    await this.checkNetworkConnectivity();
    await this.checkDocker();
    
    const healthy = this.generateReport();
    
    return healthy ? 0 : 1;
  }
}

// Run health check if called directly
if (require.main === module) {
  const checker = new HealthChecker();
  checker.run().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Health check failed:', error);
    process.exit(1);
  });
}

module.exports = HealthChecker;