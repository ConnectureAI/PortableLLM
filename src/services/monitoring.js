/**
 * Monitoring Service
 * Provides system monitoring, performance metrics, and health tracking
 */

const EventEmitter = require('events');
const os = require('os');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class MonitoringService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      metricsInterval: options.metricsInterval || 30000, // 30 seconds
      healthCheckInterval: options.healthCheckInterval || 60000, // 1 minute
      ollamaUrl: options.ollamaUrl || 'http://localhost:11434',
      retentionDays: options.retentionDays || 7,
      alertThresholds: {
        cpuUsage: options.cpuThreshold || 80,
        memoryUsage: options.memoryThreshold || 80,
        diskUsage: options.diskThreshold || 85,
        responseTime: options.responseTimeThreshold || 5000
      },
      ...options
    };

    this.metrics = {
      system: [],
      api: [],
      ollama: [],
      models: []
    };

    this.health = {
      system: 'unknown',
      api: 'unknown',
      ollama: 'unknown',
      database: 'unknown',
      docker: 'unknown'
    };

    this.isMonitoring = false;
    this.intervals = {};
  }

  /**
   * Start monitoring services
   */
  start() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.emit('monitoring:started');

    // Start metrics collection
    this.intervals.metrics = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsInterval);

    // Start health checks
    this.intervals.health = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);

    // Initial data collection
    this.collectMetrics();
    this.performHealthChecks();

    // Start cleanup process (every hour)
    this.intervals.cleanup = setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000);
  }

  /**
   * Stop monitoring services
   */
  stop() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    // Clear all intervals
    Object.values(this.intervals).forEach(interval => {
      if (interval) clearInterval(interval);
    });
    
    this.intervals = {};
    this.emit('monitoring:stopped');
  }

  /**
   * Collect system and application metrics
   */
  async collectMetrics() {
    const timestamp = new Date().toISOString();
    
    try {
      // System metrics
      const systemMetrics = await this.getSystemMetrics();
      this.metrics.system.push({
        timestamp,
        ...systemMetrics
      });

      // API metrics
      const apiMetrics = await this.getAPIMetrics();
      this.metrics.api.push({
        timestamp,
        ...apiMetrics
      });

      // Ollama metrics
      const ollamaMetrics = await this.getOllamaMetrics();
      if (ollamaMetrics) {
        this.metrics.ollama.push({
          timestamp,
          ...ollamaMetrics
        });
      }

      this.emit('metrics:collected', {
        timestamp,
        system: systemMetrics,
        api: apiMetrics,
        ollama: ollamaMetrics
      });

      // Check for alerts
      this.checkAlertThresholds(systemMetrics);

    } catch (error) {
      this.emit('monitoring:error', error);
    }
  }

  /**
   * Get system performance metrics
   */
  async getSystemMetrics() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // CPU usage calculation
    const cpuUsage = await this.getCPUUsage();
    
    // Disk usage
    const diskUsage = await this.getDiskUsage();
    
    return {
      cpu: {
        cores: cpus.length,
        usage: cpuUsage,
        loadAverage: os.loadavg()
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usage: (usedMemory / totalMemory) * 100
      },
      disk: diskUsage,
      uptime: os.uptime(),
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname()
    };
  }

  /**
   * Calculate CPU usage percentage
   */
  async getCPUUsage() {
    return new Promise((resolve) => {
      const startMeasure = this.cpuAverage();
      
      setTimeout(() => {
        const endMeasure = this.cpuAverage();
        const idleDifference = endMeasure.idle - startMeasure.idle;
        const totalDifference = endMeasure.total - startMeasure.total;
        const cpuPercentage = 100 - Math.floor(100 * idleDifference / totalDifference);
        resolve(cpuPercentage);
      }, 100);
    });
  }

  /**
   * Helper function for CPU usage calculation
   */
  cpuAverage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    return {
      idle: totalIdle / cpus.length,
      total: totalTick / cpus.length
    };
  }

  /**
   * Get disk usage information
   */
  async getDiskUsage() {
    try {
      const stats = fs.statSync(process.cwd());
      // This is a simplified disk usage check
      // In production, you might want to use a more sophisticated approach
      return {
        total: 0, // Would need platform-specific implementation
        used: 0,
        free: 0,
        usage: 0
      };
    } catch (error) {
      return {
        total: 0,
        used: 0,
        free: 0,
        usage: 0,
        error: error.message
      };
    }
  }

  /**
   * Get API performance metrics
   */
  async getAPIMetrics() {
    const startTime = Date.now();
    
    try {
      // Test API endpoint
      const response = await axios.get('http://localhost:8080/api/v1/health', {
        timeout: 5000
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        statusCode: response.status,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        activeHandles: process._getActiveHandles ? process._getActiveHandles().length : 0,
        activeRequests: process._getActiveRequests ? process._getActiveRequests().length : 0
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      };
    }
  }

  /**
   * Get Ollama service metrics
   */
  async getOllamaMetrics() {
    try {
      const startTime = Date.now();
      
      // Check Ollama version/status
      const versionResponse = await axios.get(`${this.config.ollamaUrl}/api/version`, {
        timeout: 5000
      });
      
      const versionResponseTime = Date.now() - startTime;

      // Get running models
      const modelsStartTime = Date.now();
      const modelsResponse = await axios.get(`${this.config.ollamaUrl}/api/tags`, {
        timeout: 5000
      });
      
      const modelsResponseTime = Date.now() - modelsStartTime;

      return {
        status: 'healthy',
        version: versionResponse.data.version || 'unknown',
        versionResponseTime,
        modelsResponseTime,
        installedModels: modelsResponse.data.models ? modelsResponse.data.models.length : 0,
        models: modelsResponse.data.models || []
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: null
      };
    }
  }

  /**
   * Perform comprehensive health checks
   */
  async performHealthChecks() {
    const healthResults = {};

    // System health
    healthResults.system = await this.checkSystemHealth();
    
    // API health
    healthResults.api = await this.checkAPIHealth();
    
    // Ollama health
    healthResults.ollama = await this.checkOllamaHealth();
    
    // Docker health
    healthResults.docker = await this.checkDockerHealth();

    // Update health status
    this.health = { ...this.health, ...healthResults };
    
    this.emit('health:checked', this.health);

    return this.health;
  }

  /**
   * Check system health
   */
  async checkSystemHealth() {
    try {
      const metrics = await this.getSystemMetrics();
      
      const issues = [];
      
      if (metrics.cpu.usage > this.config.alertThresholds.cpuUsage) {
        issues.push(`High CPU usage: ${metrics.cpu.usage}%`);
      }
      
      if (metrics.memory.usage > this.config.alertThresholds.memoryUsage) {
        issues.push(`High memory usage: ${metrics.memory.usage.toFixed(1)}%`);
      }
      
      if (metrics.disk.usage > this.config.alertThresholds.diskUsage) {
        issues.push(`High disk usage: ${metrics.disk.usage}%`);
      }

      return {
        status: issues.length === 0 ? 'healthy' : 'warning',
        issues,
        metrics: {
          cpu: metrics.cpu.usage,
          memory: metrics.memory.usage,
          disk: metrics.disk.usage,
          uptime: metrics.uptime
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Check API health
   */
  async checkAPIHealth() {
    try {
      const metrics = await this.getAPIMetrics();
      
      const issues = [];
      
      if (metrics.responseTime > this.config.alertThresholds.responseTime) {
        issues.push(`Slow API response: ${metrics.responseTime}ms`);
      }
      
      if (metrics.status === 'unhealthy') {
        issues.push('API endpoint unreachable');
      }

      return {
        status: metrics.status === 'healthy' && issues.length === 0 ? 'healthy' : 'unhealthy',
        issues,
        responseTime: metrics.responseTime,
        uptime: metrics.uptime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Check Ollama health
   */
  async checkOllamaHealth() {
    try {
      const metrics = await this.getOllamaMetrics();
      
      if (!metrics) {
        return {
          status: 'unhealthy',
          error: 'Unable to get Ollama metrics'
        };
      }

      const issues = [];
      
      if (metrics.status === 'unhealthy') {
        issues.push('Ollama service unreachable');
      }
      
      if (metrics.installedModels === 0) {
        issues.push('No AI models installed');
      }

      return {
        status: metrics.status === 'healthy' && issues.length === 0 ? 'healthy' : 'warning',
        issues,
        version: metrics.version,
        installedModels: metrics.installedModels,
        responseTime: metrics.versionResponseTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Check Docker health
   */
  async checkDockerHealth() {
    try {
      // Simple Docker check - in production you might want more sophisticated checks
      const { spawn } = require('child_process');
      
      return new Promise((resolve) => {
        const dockerProcess = spawn('docker', ['version'], { stdio: 'pipe' });
        
        dockerProcess.on('close', (code) => {
          if (code === 0) {
            resolve({
              status: 'healthy',
              version: 'available'
            });
          } else {
            resolve({
              status: 'unhealthy',
              error: 'Docker not available'
            });
          }
        });
        
        dockerProcess.on('error', (error) => {
          resolve({
            status: 'unhealthy',
            error: error.message
          });
        });
        
        // Timeout after 5 seconds
        setTimeout(() => {
          dockerProcess.kill();
          resolve({
            status: 'unhealthy',
            error: 'Docker check timeout'
          });
        }, 5000);
      });
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Check alert thresholds and emit alerts
   */
  checkAlertThresholds(metrics) {
    const alerts = [];
    
    if (metrics.cpu.usage > this.config.alertThresholds.cpuUsage) {
      alerts.push({
        type: 'cpu_high',
        message: `High CPU usage detected: ${metrics.cpu.usage}%`,
        threshold: this.config.alertThresholds.cpuUsage,
        value: metrics.cpu.usage,
        severity: metrics.cpu.usage > 90 ? 'critical' : 'warning'
      });
    }
    
    if (metrics.memory.usage > this.config.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'memory_high',
        message: `High memory usage detected: ${metrics.memory.usage.toFixed(1)}%`,
        threshold: this.config.alertThresholds.memoryUsage,
        value: metrics.memory.usage,
        severity: metrics.memory.usage > 95 ? 'critical' : 'warning'
      });
    }

    if (alerts.length > 0) {
      this.emit('monitoring:alerts', alerts);
    }
  }

  /**
   * Get current metrics summary
   */
  getMetricsSummary(timeRange = 3600000) { // Default: last hour
    const cutoffTime = Date.now() - timeRange;
    
    const filterMetrics = (metrics) => 
      metrics.filter(m => new Date(m.timestamp).getTime() > cutoffTime);

    return {
      system: filterMetrics(this.metrics.system),
      api: filterMetrics(this.metrics.api),
      ollama: filterMetrics(this.metrics.ollama),
      health: this.health,
      timeRange,
      generated: new Date().toISOString()
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(timeRange = 3600000) {
    const summary = this.getMetricsSummary(timeRange);
    
    const calculateStats = (values) => {
      if (values.length === 0) return null;
      
      const sorted = values.sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      
      return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: sum / values.length,
        median: sorted[Math.floor(sorted.length / 2)],
        count: values.length
      };
    };

    return {
      cpu: calculateStats(summary.system.map(m => m.cpu.usage)),
      memory: calculateStats(summary.system.map(m => m.memory.usage)),
      apiResponseTime: calculateStats(summary.api.map(m => m.responseTime).filter(t => t)),
      ollamaResponseTime: calculateStats(summary.ollama.map(m => m.versionResponseTime).filter(t => t)),
      timeRange,
      generated: new Date().toISOString()
    };
  }

  /**
   * Clean up old metrics data
   */
  cleanupOldMetrics() {
    const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    
    const cleanMetricsArray = (metrics) => 
      metrics.filter(m => new Date(m.timestamp).getTime() > cutoffTime);

    const originalCounts = {
      system: this.metrics.system.length,
      api: this.metrics.api.length,
      ollama: this.metrics.ollama.length
    };

    this.metrics.system = cleanMetricsArray(this.metrics.system);
    this.metrics.api = cleanMetricsArray(this.metrics.api);
    this.metrics.ollama = cleanMetricsArray(this.metrics.ollama);

    const removedCounts = {
      system: originalCounts.system - this.metrics.system.length,
      api: originalCounts.api - this.metrics.api.length,
      ollama: originalCounts.ollama - this.metrics.ollama.length
    };

    this.emit('monitoring:cleanup', { removed: removedCounts, cutoffTime });
  }

  /**
   * Export metrics data
   */
  exportMetrics(format = 'json', timeRange = 86400000) { // Default: last 24 hours
    const summary = this.getMetricsSummary(timeRange);
    const stats = this.getPerformanceStats(timeRange);
    
    const exportData = {
      metadata: {
        exported: new Date().toISOString(),
        timeRange,
        version: '1.0.0'
      },
      health: this.health,
      metrics: summary,
      statistics: stats
    };

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    } else if (format === 'csv') {
      // Simplified CSV export - system metrics only
      const csvHeaders = 'timestamp,cpu_usage,memory_usage,memory_total,memory_used\n';
      const csvRows = summary.system.map(m => 
        `${m.timestamp},${m.cpu.usage},${m.memory.usage},${m.memory.total},${m.memory.used}`
      ).join('\n');
      
      return csvHeaders + csvRows;
    }
    
    return exportData;
  }
}

module.exports = MonitoringService;