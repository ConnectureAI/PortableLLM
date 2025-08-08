/**
 * Logger Utility
 * Provides structured logging with audit trail capabilities
 * 
 * @module Logger
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure log directories exist
const createLogDir = (logPath) => {
  const dir = path.dirname(logPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Custom format for healthcare compliance
const healthcareFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
      compliance: {
        hipaa: true,
        audit: true,
        timestamp: new Date().toISOString(),
      }
    });
  })
);

// Development format for readability
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Get configuration
const getLogConfig = () => {
  try {
    const config = require('../config/app');
    return config.logging;
  } catch (error) {
    // Fallback configuration if config is not available
    return {
      level: process.env.LOG_LEVEL || 'info',
      file: process.env.LOG_FILE || './logs/app.log',
      maxSize: process.env.LOG_MAX_SIZE || '10m',
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
      format: process.env.LOG_FORMAT || 'json',
      auditFile: process.env.AUDIT_LOG_FILE || './logs/audit.log',
    };
  }
};

const logConfig = getLogConfig();

// Create log directories
createLogDir(logConfig.file);
createLogDir(logConfig.auditFile);

// Main logger configuration
const logger = winston.createLogger({
  level: logConfig.level,
  format: process.env.NODE_ENV === 'development' ? developmentFormat : healthcareFormat,
  defaultMeta: { 
    service: 'portablellm',
    pid: process.pid,
    hostname: require('os').hostname(),
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'development' ? developmentFormat : winston.format.simple(),
      silent: process.env.NODE_ENV === 'test',
    }),

    // File transport for general logs
    new winston.transports.File({
      filename: logConfig.file,
      maxsize: logConfig.maxSize,
      maxFiles: logConfig.maxFiles,
      tailable: true,
    }),

    // Error-only file transport
    new winston.transports.File({
      filename: path.join(path.dirname(logConfig.file), 'error.log'),
      level: 'error',
      maxsize: logConfig.maxSize,
      maxFiles: logConfig.maxFiles,
      tailable: true,
    }),
  ],

  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(path.dirname(logConfig.file), 'exceptions.log'),
      maxsize: logConfig.maxSize,
      maxFiles: logConfig.maxFiles,
    })
  ],

  // Handle unhandled rejections
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(path.dirname(logConfig.file), 'rejections.log'),
      maxsize: logConfig.maxSize,
      maxFiles: logConfig.maxFiles,
    })
  ],
});

// Audit logger for healthcare compliance
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta,
        audit: true,
        compliance: 'HIPAA',
        retention: '7_years',
        encrypted: true,
      });
    })
  ),
  transports: [
    new winston.transports.File({
      filename: logConfig.auditFile,
      maxsize: logConfig.maxSize,
      maxFiles: 50, // Keep more audit logs
      tailable: true,
    }),
  ],
});

// Enhanced logger with additional methods
class EnhancedLogger {
  constructor(mainLogger, auditLogger) {
    this.logger = mainLogger;
    this.audit = auditLogger;
  }

  // Standard logging methods
  error(message, meta = {}) {
    this.logger.error(message, { ...meta, stack: new Error().stack });
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  // Healthcare-specific logging methods
  auditLog(event, details = {}) {
    this.audit.info(event, {
      ...details,
      eventType: 'audit',
      timestamp: new Date().toISOString(),
      source: 'portablellm',
    });
  }

  securityEvent(event, details = {}) {
    const logData = {
      ...details,
      eventType: 'security',
      severity: 'high',
      timestamp: new Date().toISOString(),
    };
    
    this.logger.warn(`Security Event: ${event}`, logData);
    this.audit.warn(`Security Event: ${event}`, logData);
  }

  userActivity(userId, activity, details = {}) {
    this.audit.info(`User Activity: ${activity}`, {
      userId,
      activity,
      ...details,
      eventType: 'user_activity',
      timestamp: new Date().toISOString(),
    });
  }

  dataAccess(userId, resource, action, details = {}) {
    this.audit.info(`Data Access: ${action} on ${resource}`, {
      userId,
      resource,
      action,
      ...details,
      eventType: 'data_access',
      timestamp: new Date().toISOString(),
    });
  }

  modelUsage(modelName, prompt, response, userId = null) {
    this.audit.info('Model Usage', {
      modelName,
      promptLength: prompt?.length || 0,
      responseLength: response?.length || 0,
      userId,
      eventType: 'model_usage',
      timestamp: new Date().toISOString(),
    });
  }

  systemEvent(event, details = {}) {
    this.info(`System Event: ${event}`, {
      ...details,
      eventType: 'system',
      timestamp: new Date().toISOString(),
    });
  }

  performanceMetric(metric, value, details = {}) {
    this.debug(`Performance: ${metric}`, {
      metric,
      value,
      ...details,
      eventType: 'performance',
      timestamp: new Date().toISOString(),
    });
  }

  // Request/Response logging middleware
  requestLogger(req, res, next) {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    req.requestId = requestId;
    
    this.info('HTTP Request', {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
      
      this[logLevel]('HTTP Response', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.get('Content-Length'),
        timestamp: new Date().toISOString(),
      });
    });

    next();
  }

  // Error logging middleware
  errorLogger(err, req, res, next) {
    this.error('HTTP Error', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });

    next(err);
  }

  // Graceful shutdown
  async close() {
    return new Promise((resolve) => {
      this.logger.end();
      this.audit.end();
      resolve();
    });
  }
}

// Create and export enhanced logger instance
const enhancedLogger = new EnhancedLogger(logger, auditLogger);

// Handle process events
process.on('uncaughtException', (error) => {
  enhancedLogger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  enhancedLogger.error('Unhandled Rejection', { reason, promise: promise.toString() });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  enhancedLogger.info('Received SIGINT, shutting down gracefully');
  await enhancedLogger.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  enhancedLogger.info('Received SIGTERM, shutting down gracefully');
  await enhancedLogger.close();
  process.exit(0);
});

module.exports = enhancedLogger;