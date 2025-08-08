/**
 * Monitoring API Routes
 * Provides endpoints for system monitoring and performance metrics
 */

const express = require('express');
const router = express.Router();

/**
 * Get system health status
 */
router.get('/health', async (req, res) => {
  try {
    const monitoring = req.app.get('monitoring');
    
    if (!monitoring) {
      return res.status(503).json({
        error: 'Monitoring service not available',
        status: 'unhealthy'
      });
    }

    const health = await monitoring.performHealthChecks();
    
    // Determine overall status
    const statuses = Object.values(health).map(h => h.status);
    let overallStatus = 'healthy';
    
    if (statuses.includes('unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (statuses.includes('warning')) {
      overallStatus = 'warning';
    }

    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: health
    });
  } catch (error) {
    res.status(500).json({
      error: 'Health check failed',
      message: error.message,
      status: 'unhealthy'
    });
  }
});

/**
 * Get current system metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const monitoring = req.app.get('monitoring');
    
    if (!monitoring) {
      return res.status(503).json({
        error: 'Monitoring service not available'
      });
    }

    const timeRange = parseInt(req.query.timeRange) || 3600000; // Default: 1 hour
    const summary = monitoring.getMetricsSummary(timeRange);
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get metrics',
      message: error.message
    });
  }
});

/**
 * Get performance statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const monitoring = req.app.get('monitoring');
    
    if (!monitoring) {
      return res.status(503).json({
        error: 'Monitoring service not available'
      });
    }

    const timeRange = parseInt(req.query.timeRange) || 3600000; // Default: 1 hour
    const stats = monitoring.getPerformanceStats(timeRange);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get performance statistics',
      message: error.message
    });
  }
});

/**
 * Get live metrics (current snapshot)
 */
router.get('/live', async (req, res) => {
  try {
    const monitoring = req.app.get('monitoring');
    
    if (!monitoring) {
      return res.status(503).json({
        error: 'Monitoring service not available'
      });
    }

    // Get the most recent metrics
    const latestMetrics = {
      system: monitoring.metrics.system[monitoring.metrics.system.length - 1],
      api: monitoring.metrics.api[monitoring.metrics.api.length - 1],
      ollama: monitoring.metrics.ollama[monitoring.metrics.ollama.length - 1],
      health: monitoring.health,
      timestamp: new Date().toISOString()
    };
    
    res.json(latestMetrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get live metrics',
      message: error.message
    });
  }
});

/**
 * Export metrics data
 */
router.get('/export', async (req, res) => {
  try {
    const monitoring = req.app.get('monitoring');
    
    if (!monitoring) {
      return res.status(503).json({
        error: 'Monitoring service not available'
      });
    }

    const format = req.query.format || 'json';
    const timeRange = parseInt(req.query.timeRange) || 86400000; // Default: 24 hours
    
    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({
        error: 'Invalid format. Supported formats: json, csv'
      });
    }

    const exportData = monitoring.exportMetrics(format, timeRange);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="portablellm-metrics-${Date.now()}.csv"`);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="portablellm-metrics-${Date.now()}.json"`);
    }
    
    res.send(exportData);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to export metrics',
      message: error.message
    });
  }
});

/**
 * Get monitoring configuration
 */
router.get('/config', (req, res) => {
  try {
    const monitoring = req.app.get('monitoring');
    
    if (!monitoring) {
      return res.status(503).json({
        error: 'Monitoring service not available'
      });
    }

    res.json({
      metricsInterval: monitoring.config.metricsInterval,
      healthCheckInterval: monitoring.config.healthCheckInterval,
      retentionDays: monitoring.config.retentionDays,
      alertThresholds: monitoring.config.alertThresholds,
      isMonitoring: monitoring.isMonitoring
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get monitoring configuration',
      message: error.message
    });
  }
});

/**
 * Update monitoring configuration
 */
router.patch('/config', (req, res) => {
  try {
    const monitoring = req.app.get('monitoring');
    
    if (!monitoring) {
      return res.status(503).json({
        error: 'Monitoring service not available'
      });
    }

    const { alertThresholds, metricsInterval, healthCheckInterval } = req.body;
    
    // Update alert thresholds
    if (alertThresholds) {
      monitoring.config.alertThresholds = {
        ...monitoring.config.alertThresholds,
        ...alertThresholds
      };
    }
    
    // Note: Changing intervals requires restart of monitoring service
    if (metricsInterval && metricsInterval !== monitoring.config.metricsInterval) {
      monitoring.config.metricsInterval = metricsInterval;
      // Would need to restart monitoring to take effect
    }
    
    if (healthCheckInterval && healthCheckInterval !== monitoring.config.healthCheckInterval) {
      monitoring.config.healthCheckInterval = healthCheckInterval;
      // Would need to restart monitoring to take effect
    }

    res.json({
      message: 'Configuration updated',
      config: {
        metricsInterval: monitoring.config.metricsInterval,
        healthCheckInterval: monitoring.config.healthCheckInterval,
        alertThresholds: monitoring.config.alertThresholds
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update monitoring configuration',
      message: error.message
    });
  }
});

/**
 * Start monitoring
 */
router.post('/start', (req, res) => {
  try {
    const monitoring = req.app.get('monitoring');
    
    if (!monitoring) {
      return res.status(503).json({
        error: 'Monitoring service not available'
      });
    }

    if (monitoring.isMonitoring) {
      return res.json({
        message: 'Monitoring is already running'
      });
    }

    monitoring.start();
    
    res.json({
      message: 'Monitoring started',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to start monitoring',
      message: error.message
    });
  }
});

/**
 * Stop monitoring
 */
router.post('/stop', (req, res) => {
  try {
    const monitoring = req.app.get('monitoring');
    
    if (!monitoring) {
      return res.status(503).json({
        error: 'Monitoring service not available'
      });
    }

    if (!monitoring.isMonitoring) {
      return res.json({
        message: 'Monitoring is not running'
      });
    }

    monitoring.stop();
    
    res.json({
      message: 'Monitoring stopped',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to stop monitoring',
      message: error.message
    });
  }
});

/**
 * Get alerts history
 */
router.get('/alerts', (req, res) => {
  try {
    const monitoring = req.app.get('monitoring');
    
    if (!monitoring) {
      return res.status(503).json({
        error: 'Monitoring service not available'
      });
    }

    // This would require storing alerts history in the monitoring service
    // For now, return placeholder
    res.json({
      alerts: [],
      message: 'Alerts history not implemented in this version'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get alerts',
      message: error.message
    });
  }
});

/**
 * Clear metrics data
 */
router.delete('/metrics', (req, res) => {
  try {
    const monitoring = req.app.get('monitoring');
    
    if (!monitoring) {
      return res.status(503).json({
        error: 'Monitoring service not available'
      });
    }

    const beforeCounts = {
      system: monitoring.metrics.system.length,
      api: monitoring.metrics.api.length,
      ollama: monitoring.metrics.ollama.length
    };

    // Clear all metrics
    monitoring.metrics.system = [];
    monitoring.metrics.api = [];
    monitoring.metrics.ollama = [];

    res.json({
      message: 'Metrics data cleared',
      cleared: beforeCounts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear metrics',
      message: error.message
    });
  }
});

module.exports = router;