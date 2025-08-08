#!/usr/bin/env node

/**
 * Performance Monitor Script
 * Standalone monitoring tool for PortableLLM performance analysis
 */

const axios = require('axios');
const os = require('os');

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

class PerformanceMonitor {
  constructor() {
    this.apiUrl = process.env.PORTABLELLM_API || 'http://localhost:8080/api/v1';
    this.ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.isRunning = false;
    this.interval = null;
    this.stats = {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity
    };
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

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatTime(ms) {
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  async checkSystemResources() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    return {
      cpu: {
        cores: cpus.length,
        model: cpus[0].model,
        speed: cpus[0].speed
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usage: (usedMemory / totalMemory) * 100
      },
      platform: os.platform(),
      arch: os.arch(),
      uptime: os.uptime(),
      loadAverage: os.loadavg()
    };
  }

  async checkAPIHealth() {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${this.apiUrl}/health`, {
        timeout: 10000
      });
      
      const responseTime = Date.now() - startTime;
      this.updateStats(responseTime, false);
      
      return {
        status: 'healthy',
        responseTime,
        statusCode: response.status,
        data: response.data
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateStats(responseTime, true);
      
      return {
        status: 'unhealthy',
        responseTime,
        error: error.message
      };
    }
  }

  async checkOllamaPerformance() {
    const tests = [
      { name: 'Version Check', endpoint: '/api/version' },
      { name: 'List Models', endpoint: '/api/tags' }
    ];

    const results = {};

    for (const test of tests) {
      const startTime = Date.now();
      
      try {
        const response = await axios.get(`${this.ollamaUrl}${test.endpoint}`, {
          timeout: 10000
        });
        
        const responseTime = Date.now() - startTime;
        
        results[test.name] = {
          status: 'success',
          responseTime,
          statusCode: response.status,
          dataSize: JSON.stringify(response.data).length
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        results[test.name] = {
          status: 'error',
          responseTime,
          error: error.message
        };
      }
    }

    return results;
  }

  async benchmarkModelInference() {
    try {
      const models = await this.getAvailableModels();
      
      if (models.length === 0) {
        return {
          status: 'no_models',
          message: 'No models available for benchmarking'
        };
      }

      // Use the first available model
      const model = models[0];
      const testPrompt = 'Hello, this is a test prompt. Please respond briefly.';
      
      this.info(`Benchmarking model: ${model.name}`);
      
      const startTime = Date.now();
      
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: model.name,
        prompt: testPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.8
        }
      }, {
        timeout: 60000 // 60 seconds for inference
      });
      
      const responseTime = Date.now() - startTime;
      const responseText = response.data.response || '';
      const tokensGenerated = responseText.split(' ').length;
      const tokensPerSecond = tokensGenerated / (responseTime / 1000);
      
      return {
        status: 'success',
        model: model.name,
        responseTime,
        tokensGenerated,
        tokensPerSecond: tokensPerSecond.toFixed(2),
        responseLength: responseText.length,
        prompt: testPrompt,
        response: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '')
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  async getAvailableModels() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`);
      return response.data.models || [];
    } catch (error) {
      return [];
    }
  }

  updateStats(responseTime, isError) {
    this.stats.requests++;
    
    if (isError) {
      this.stats.errors++;
    } else {
      this.stats.totalResponseTime += responseTime;
      this.stats.maxResponseTime = Math.max(this.stats.maxResponseTime, responseTime);
      this.stats.minResponseTime = Math.min(this.stats.minResponseTime, responseTime);
    }
  }

  getAverageResponseTime() {
    const successfulRequests = this.stats.requests - this.stats.errors;
    return successfulRequests > 0 ? this.stats.totalResponseTime / successfulRequests : 0;
  }

  async runComprehensiveTest() {
    this.log('\n🔍 PortableLLM Performance Monitor', colors.cyan);
    this.log('='.repeat(60), colors.cyan);
    
    // System resources
    this.info('Checking system resources...');
    const systemInfo = await this.checkSystemResources();
    
    this.log('\n💻 System Information:', colors.yellow);
    this.log(`CPU: ${systemInfo.cpu.cores} cores, ${systemInfo.cpu.model}`);
    this.log(`Memory: ${this.formatBytes(systemInfo.memory.used)}/${this.formatBytes(systemInfo.memory.total)} (${systemInfo.memory.usage.toFixed(1)}%)`);
    this.log(`Platform: ${systemInfo.platform} ${systemInfo.arch}`);
    this.log(`Uptime: ${this.formatTime(systemInfo.uptime * 1000)}`);
    this.log(`Load Average: ${systemInfo.loadAverage.map(l => l.toFixed(2)).join(', ')}`);

    // API health
    this.info('\nChecking API health...');
    const apiHealth = await this.checkAPIHealth();
    
    this.log('\n🌐 API Health:', colors.yellow);
    if (apiHealth.status === 'healthy') {
      this.success(`API is healthy - Response time: ${apiHealth.responseTime}ms`);
    } else {
      this.error(`API is unhealthy - ${apiHealth.error}`);
    }

    // Ollama performance
    this.info('\nTesting Ollama performance...');
    const ollamaResults = await this.checkOllamaPerformance();
    
    this.log('\n🤖 Ollama Performance:', colors.yellow);
    for (const [testName, result] of Object.entries(ollamaResults)) {
      if (result.status === 'success') {
        this.success(`${testName}: ${result.responseTime}ms`);
      } else {
        this.error(`${testName}: ${result.error}`);
      }
    }

    // Model inference benchmark
    this.info('\nBenchmarking model inference...');
    const inferenceResult = await this.benchmarkModelInference();
    
    this.log('\n⚡ Inference Benchmark:', colors.yellow);
    if (inferenceResult.status === 'success') {
      this.success(`Model: ${inferenceResult.model}`);
      this.log(`Response time: ${this.formatTime(inferenceResult.responseTime)}`);
      this.log(`Tokens generated: ${inferenceResult.tokensGenerated}`);
      this.log(`Tokens per second: ${inferenceResult.tokensPerSecond}`);
      this.log(`Response preview: "${inferenceResult.response}"`);
    } else if (inferenceResult.status === 'no_models') {
      this.warning(inferenceResult.message);
    } else {
      this.error(`Inference failed: ${inferenceResult.error}`);
    }

    // Performance summary
    this.log('\n📊 Performance Summary:', colors.cyan);
    this.log('='.repeat(40), colors.cyan);
    
    const avgResponseTime = this.getAverageResponseTime();
    const errorRate = (this.stats.errors / this.stats.requests) * 100;
    
    this.log(`Total requests: ${this.stats.requests}`);
    this.log(`Errors: ${this.stats.errors} (${errorRate.toFixed(1)}%)`);
    
    if (this.stats.requests > this.stats.errors) {
      this.log(`Average response time: ${avgResponseTime.toFixed(1)}ms`);
      this.log(`Min response time: ${this.stats.minResponseTime.toFixed(1)}ms`);
      this.log(`Max response time: ${this.stats.maxResponseTime.toFixed(1)}ms`);
    }

    // Performance recommendations
    this.log('\n💡 Performance Recommendations:', colors.magenta);
    this.log('='.repeat(40), colors.magenta);
    
    if (systemInfo.memory.usage > 80) {
      this.warning('High memory usage detected. Consider reducing model size or increasing RAM.');
    } else {
      this.log('✓ Memory usage is acceptable');
    }
    
    if (avgResponseTime > 5000) {
      this.warning('Slow API response times. Check system resources and model efficiency.');
    } else if (avgResponseTime > 0) {
      this.log('✓ API response times are acceptable');
    }
    
    if (inferenceResult.status === 'success') {
      const tokensPerSec = parseFloat(inferenceResult.tokensPerSecond);
      if (tokensPerSec < 1) {
        this.warning('Slow inference speed. Consider using GPU acceleration or smaller models.');
      } else {
        this.log(`✓ Inference speed is acceptable (${tokensPerSec} tokens/sec)`);
      }
    }
  }

  async runContinuousMonitoring(intervalMs = 30000) {
    this.log('\n🔄 Starting continuous monitoring...', colors.cyan);
    this.log(`Interval: ${intervalMs / 1000} seconds`, colors.blue);
    this.log('Press Ctrl+C to stop\n', colors.yellow);
    
    this.isRunning = true;
    
    const monitoringLoop = async () => {
      if (!this.isRunning) return;
      
      const timestamp = new Date().toISOString();
      process.stdout.write(`\r${colors.cyan}${timestamp}${colors.reset} | `);
      
      // Quick health check
      const apiHealth = await this.checkAPIHealth();
      
      if (apiHealth.status === 'healthy') {
        process.stdout.write(`${colors.green}API: ${apiHealth.responseTime}ms${colors.reset} | `);
      } else {
        process.stdout.write(`${colors.red}API: ERROR${colors.reset} | `);
      }
      
      // System resources
      const systemInfo = await this.checkSystemResources();
      process.stdout.write(`${colors.blue}MEM: ${systemInfo.memory.usage.toFixed(1)}%${colors.reset} | `);
      process.stdout.write(`${colors.yellow}Load: ${systemInfo.loadAverage[0].toFixed(2)}${colors.reset}`);
      
      // Show stats every 10 iterations
      if (this.stats.requests % 10 === 0 && this.stats.requests > 0) {
        const avgResponseTime = this.getAverageResponseTime();
        const errorRate = (this.stats.errors / this.stats.requests) * 100;
        console.log(`\n📊 Stats: ${this.stats.requests} req, ${errorRate.toFixed(1)}% err, ${avgResponseTime.toFixed(1)}ms avg`);
      }
    };
    
    // Initial run
    await monitoringLoop();
    
    // Set up interval
    this.interval = setInterval(monitoringLoop, intervalMs);
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
      this.stopMonitoring();
    });
  }

  stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    this.isRunning = false;
    
    console.log('\n\n🛑 Monitoring stopped');
    
    // Final stats
    if (this.stats.requests > 0) {
      const avgResponseTime = this.getAverageResponseTime();
      const errorRate = (this.stats.errors / this.stats.requests) * 100;
      
      console.log('\n📊 Final Statistics:');
      console.log(`Total requests: ${this.stats.requests}`);
      console.log(`Errors: ${this.stats.errors} (${errorRate.toFixed(1)}%)`);
      
      if (this.stats.requests > this.stats.errors) {
        console.log(`Average response time: ${avgResponseTime.toFixed(1)}ms`);
        console.log(`Min response time: ${this.stats.minResponseTime.toFixed(1)}ms`);
        console.log(`Max response time: ${this.stats.maxResponseTime.toFixed(1)}ms`);
      }
    }
    
    process.exit(0);
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const monitor = new PerformanceMonitor();
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
PortableLLM Performance Monitor

Usage: node performance-monitor.js [OPTIONS]

Options:
  --test, -t          Run comprehensive performance test
  --monitor, -m       Start continuous monitoring
  --interval <ms>     Monitoring interval in milliseconds (default: 30000)
  --help, -h          Show this help message

Examples:
  node performance-monitor.js --test           # Run performance test
  node performance-monitor.js --monitor        # Start monitoring
  node performance-monitor.js -m --interval 10000  # Monitor every 10 seconds
`);
    process.exit(0);
  }
  
  if (args.includes('--test') || args.includes('-t')) {
    monitor.runComprehensiveTest().catch(error => {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      process.exit(1);
    });
  } else if (args.includes('--monitor') || args.includes('-m')) {
    const intervalIndex = args.indexOf('--interval');
    const interval = intervalIndex > -1 && args[intervalIndex + 1] 
      ? parseInt(args[intervalIndex + 1]) 
      : 30000;
    
    monitor.runContinuousMonitoring(interval).catch(error => {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      process.exit(1);
    });
  } else {
    // Default to comprehensive test
    monitor.runComprehensiveTest().catch(error => {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      process.exit(1);
    });
  }
}

module.exports = PerformanceMonitor;