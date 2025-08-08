/**
 * Application Configuration
 * Central configuration for PortableLLM
 * 
 * @module Config
 */

const path = require('path');

// Environment variables with defaults
const config = {
  // Application settings
  app: {
    name: 'PortableLLM',
    version: process.env.npm_package_version || '1.0.0',
    mode: process.env.PORTABLELLM_MODE || 'healthcare',
    port: parseInt(process.env.PORT) || 8080,
    host: process.env.HOST || 'localhost',
    environment: process.env.NODE_ENV || 'production',
  },

  // Ollama service configuration
  ollama: {
    host: process.env.OLLAMA_HOST || 'localhost',
    port: parseInt(process.env.OLLAMA_PORT) || 11434,
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    timeout: parseInt(process.env.OLLAMA_TIMEOUT) || 120000,
    maxRetries: parseInt(process.env.OLLAMA_MAX_RETRIES) || 3,
    modelsPath: process.env.OLLAMA_MODELS || '/app/models',
  },

  // Model configuration
  models: {
    default: process.env.DEFAULT_MODEL || 'deepseek-coder:6.7b-instruct',
    autoDownload: process.env.AUTO_DOWNLOAD_MODELS !== 'false',
    supported: [
      'deepseek-coder:6.7b-instruct',
      'llama3.1:8b-instruct', 
      'mistral:7b-instruct',
      'codellama:7b-instruct',
      'llama3.1:8b-instruct-q4_0',
      'mistral:7b-instruct-q4_0',
    ],
    healthcare: [
      'deepseek-coder:6.7b-instruct', // Good for medical documentation
      'llama3.1:8b-instruct',         // General medical knowledge
      'mistral:7b-instruct',          // Professional communication
    ],
  },

  // Security and privacy settings
  security: {
    localOnly: process.env.LOCAL_ONLY !== 'false',
    auditLogging: process.env.AUDIT_LOGGING !== 'false',
    encryption: process.env.ENCRYPTION !== 'false',
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 3600000, // 1 hour
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  },

  // Database configuration
  database: {
    type: 'sqlite',
    path: process.env.DATABASE_PATH || '/app/data/portablellm.db',
    backup: {
      enabled: process.env.DB_BACKUP_ENABLED !== 'false',
      interval: parseInt(process.env.DB_BACKUP_INTERVAL) || 86400000, // 24 hours
      retention: parseInt(process.env.DB_BACKUP_RETENTION) || 7, // 7 days
    },
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || '/app/logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    format: process.env.LOG_FORMAT || 'json',
    auditFile: process.env.AUDIT_LOG_FILE || '/app/logs/audit.log',
  },

  // UI configuration
  ui: {
    theme: process.env.UI_THEME || 'healthcare',
    showPrivacyNotice: process.env.SHOW_PRIVACY_NOTICE !== 'false',
    enableTelemetry: process.env.ENABLE_TELEMETRY === 'true',
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
  },

  // Healthcare-specific settings
  healthcare: {
    hipaaMode: process.env.HIPAA_MODE !== 'false',
    dataRetention: parseInt(process.env.DATA_RETENTION_DAYS) || 2555, // 7 years
    auditTrail: process.env.AUDIT_TRAIL !== 'false',
    encryption: {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2',
      iterations: 100000,
    },
    workflows: {
      patientCommunication: true,
      documentSummarization: true,
      treatmentPlanning: true,
      practiceAnalytics: true,
    },
  },

  // API configuration
  api: {
    prefix: '/api/v1',
    cors: {
      enabled: true,
      origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
      credentials: true,
    },
    compression: {
      enabled: true,
      threshold: 1024,
    },
    helmet: {
      enabled: true,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'", "ws:", "wss:"],
        },
      },
    },
  },

  // File storage configuration
  storage: {
    uploads: process.env.UPLOADS_PATH || '/app/data/uploads',
    temp: process.env.TEMP_PATH || '/app/data/temp',
    models: process.env.MODELS_PATH || '/app/models',
    backups: process.env.BACKUPS_PATH || '/app/data/backups',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    allowedTypes: [
      'text/plain',
      'text/csv',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },

  // Performance settings
  performance: {
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 10,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 300000, // 5 minutes
    cacheEnabled: process.env.CACHE_ENABLED !== 'false',
    cacheTTL: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour
  },

  // Monitoring and health checks
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    interval: parseInt(process.env.MONITORING_INTERVAL) || 30000, // 30 seconds
    metrics: {
      system: true,
      ollama: true,
      requests: true,
      errors: true,
    },
    alerts: {
      enabled: process.env.ALERTS_ENABLED === 'true',
      webhook: process.env.ALERTS_WEBHOOK,
      thresholds: {
        memoryUsage: parseFloat(process.env.MEMORY_THRESHOLD) || 0.8, // 80%
        diskUsage: parseFloat(process.env.DISK_THRESHOLD) || 0.9, // 90%
        responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD) || 5000, // 5 seconds
      },
    },
  },

  // Development settings
  development: {
    hotReload: process.env.HOT_RELOAD === 'true',
    debugMode: process.env.DEBUG === 'true',
    mockOllama: process.env.MOCK_OLLAMA === 'true',
    verboseLogging: process.env.VERBOSE_LOGGING === 'true',
  },

  // Paths
  paths: {
    root: process.cwd(),
    src: path.join(process.cwd(), 'src'),
    config: path.join(process.cwd(), 'src', 'config'),
    data: process.env.DATA_PATH || '/app/data',
    logs: process.env.LOGS_PATH || '/app/logs',
    models: process.env.MODELS_PATH || '/app/models',
    uploads: process.env.UPLOADS_PATH || '/app/data/uploads',
    temp: process.env.TEMP_PATH || '/app/data/temp',
  },
};

// Validate critical configuration
function validateConfig() {
  const errors = [];

  // Check required paths
  const requiredPaths = ['data', 'logs', 'models'];
  requiredPaths.forEach(pathKey => {
    if (!config.paths[pathKey]) {
      errors.push(`Missing required path: ${pathKey}`);
    }
  });

  // Check Ollama configuration
  if (!config.ollama.baseUrl) {
    errors.push('Missing Ollama base URL');
  }

  // Check default model
  if (!config.models.default) {
    errors.push('Missing default model configuration');
  }

  // Check JWT secret in production
  if (config.app.environment === 'production' && 
      config.security.jwtSecret === 'your-secret-key-change-in-production') {
    errors.push('JWT secret must be changed in production');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Healthcare compliance validation
function validateHealthcareCompliance() {
  if (config.app.mode === 'healthcare') {
    const warnings = [];

    if (!config.security.localOnly) {
      warnings.push('Healthcare mode should use local-only processing');
    }

    if (!config.security.encryption) {
      warnings.push('Healthcare mode should enable encryption');
    }

    if (!config.security.auditLogging) {
      warnings.push('Healthcare mode should enable audit logging');
    }

    if (warnings.length > 0) {
      console.warn('Healthcare compliance warnings:\n' + warnings.join('\n'));
    }
  }
}

// Get environment-specific configuration
function getEnvironmentConfig() {
  const env = config.app.environment;
  
  switch (env) {
    case 'development':
      return {
        ...config,
        logging: { ...config.logging, level: 'debug' },
        security: { ...config.security, jwtSecret: 'dev-secret' },
        development: { ...config.development, hotReload: true, debugMode: true },
      };
    
    case 'test':
      return {
        ...config,
        database: { ...config.database, path: ':memory:' },
        logging: { ...config.logging, level: 'error' },
        development: { ...config.development, mockOllama: true },
      };
    
    case 'production':
    default:
      return config;
  }
}

// Export configuration
const finalConfig = getEnvironmentConfig();

// Validate configuration on load
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
  validateHealthcareCompliance();
}

module.exports = finalConfig;