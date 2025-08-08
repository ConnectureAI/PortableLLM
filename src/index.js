/**
 * PortableLLM Main Entry Point
 * Professional-Grade AI for Healthcare & Small Business
 * Privacy-First • Local Processing • HIPAA Ready
 * 
 * @module Main
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const config = require('./config/app');
const logger = require('./utils/logger');
const PortableLLMServer = require('./api/server');
const MonitoringService = require('./services/monitoring');

// ASCII Art Banner
const banner = `
 ____            _        _     _      _     _     __  __ 
|  _ \\ ___  _ __| |_ __ _| |__ | | ___| |   | |   |  \\/  |
| |_) / _ \\| '__| __/ _\` | '_ \\| |/ _ \\ |   | |   | |\\/| |
|  __/ (_) | |  | || (_| | |_) | |  __/ |___| |___| |  | |
|_|   \\___/|_|   \\__\\__,_|____/|_|\\___|_____|_____|_|  |_|

Professional-Grade AI for Healthcare & Small Business
Privacy-First • Local Processing • HIPAA Ready
Version ${config.app.version}
`;

class PortableLLMApplication {
  constructor() {
    this.server = null;
    this.monitoring = null;
    this.isShuttingDown = false;
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log(banner);
      
      logger.info('Starting PortableLLM Application', {
        version: config.app.version,
        mode: config.app.mode,
        environment: config.app.environment,
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
      });

      // Validate environment
      await this.validateEnvironment();
      
      // Initialize directories
      await this.initializeDirectories();
      
      // Check system requirements
      await this.checkSystemRequirements();
      
      logger.info('Application initialization completed');
    } catch (error) {
      logger.error('Application initialization failed:', error);
      throw error;
    }
  }

  /**
   * Validate environment and configuration
   */
  async validateEnvironment() {
    logger.info('Validating environment...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const requiredVersion = '16.0.0';
    if (!this.compareVersions(nodeVersion.slice(1), requiredVersion)) {
      throw new Error(`Node.js ${requiredVersion} or higher is required (current: ${nodeVersion})`);
    }

    // Check critical environment variables
    const requiredVars = ['NODE_ENV'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      logger.warn('Missing environment variables:', missingVars);
    }

    // Validate configuration
    if (config.app.environment === 'production' && 
        config.security.jwtSecret === 'your-secret-key-change-in-production') {
      throw new Error('JWT secret must be changed in production');
    }

    logger.info('Environment validation completed');
  }

  /**
   * Initialize required directories
   */
  async initializeDirectories() {
    logger.info('Initializing directories...');
    
    const directories = [
      config.paths.data,
      config.paths.logs,
      config.paths.models,
      config.storage.uploads,
      config.storage.temp,
      config.storage.backups,
    ];

    for (const dir of directories) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          logger.info(`Created directory: ${dir}`);
        } else {
          logger.debug(`Directory exists: ${dir}`);
        }
        
        // Check write permissions
        fs.accessSync(dir, fs.constants.W_OK);
      } catch (error) {
        throw new Error(`Cannot create or write to directory: ${dir} - ${error.message}`);
      }
    }

    logger.info('Directory initialization completed');
  }

  /**
   * Check system requirements
   */
  async checkSystemRequirements() {
    logger.info('Checking system requirements...');
    
    const os = require('os');
    
    // Memory check
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryGB = Math.round(totalMemory / (1024 ** 3));
    
    logger.info(`System memory: ${memoryGB}GB total, ${Math.round(freeMemory / (1024 ** 3))}GB free`);
    
    if (memoryGB < 8) {
      logger.warn('Low system memory detected. 16GB+ recommended for optimal performance');
    }

    // CPU check
    const cpus = os.cpus();
    logger.info(`CPU: ${cpus[0].model} (${cpus.length} cores)`);
    
    if (cpus.length < 4) {
      logger.warn('Low CPU core count. 4+ cores recommended for optimal performance');
    }

    // Storage check
    try {
      const stats = fs.statSync(config.paths.data);
      // Note: More sophisticated disk space checking would be needed here
      logger.info('Storage check completed');
    } catch (error) {
      throw new Error(`Storage check failed: ${error.message}`);
    }

    // Docker check (if in production)
    if (config.app.environment === 'production') {
      try {
        const { execSync } = require('child_process');
        const dockerVersion = execSync('docker --version', { encoding: 'utf-8' });
        logger.info(`Docker: ${dockerVersion.trim()}`);
      } catch (error) {
        logger.warn('Docker not found. Some features may not work correctly.');
      }
    }

    logger.info('System requirements check completed');
  }

  /**
   * Compare version strings
   */
  compareVersions(version1, version2) {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1 = v1parts[i] || 0;
      const v2 = v2parts[i] || 0;
      
      if (v1 > v2) return true;
      if (v1 < v2) return false;
    }
    
    return true; // Equal
  }

  /**
   * Start the application
   */
  async start() {
    try {
      await this.init();
      
      // Initialize monitoring service
      this.monitoring = new MonitoringService({
        metricsInterval: config.monitoring?.metricsInterval || 30000,
        healthCheckInterval: config.monitoring?.healthCheckInterval || 60000,
        ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
      });
      
      // Create and start server
      this.server = new PortableLLMServer();
      
      // Make monitoring service available to the server
      this.server.app.set('monitoring', this.monitoring);
      
      await this.server.start();
      
      // Start monitoring after server is ready
      if (config.monitoring?.enabled !== false) {
        this.monitoring.start();
        logger.info('Monitoring service started');
      }
      
      logger.systemEvent('Application Started', {
        version: config.app.version,
        mode: config.app.mode,
        port: config.app.port,
        monitoring: config.monitoring?.enabled !== false
      });

      // Log startup summary
      this.logStartupSummary();
      
      return this.server;
    } catch (error) {
      logger.error('Application startup failed:', error);
      process.exit(1);
    }
  }

  /**
   * Log startup summary
   */
  logStartupSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 PortableLLM Started Successfully!');
    console.log('='.repeat(60));
    console.log(`📍 Web Interface: http://localhost:${config.app.port}`);
    console.log(`🔌 API Endpoint: http://localhost:${config.app.port}${config.api.prefix}`);
    console.log(`📊 Health Check: http://localhost:${config.app.port}/health`);
    console.log('='.repeat(60));
    console.log(`🔒 Privacy Mode: ${config.security.localOnly ? 'Local Only' : 'Network Enabled'}`);
    console.log(`🏥 Healthcare Mode: ${config.app.mode === 'healthcare' ? 'Enabled' : 'Disabled'}`);
    console.log(`📝 Audit Logging: ${config.security.auditLogging ? 'Enabled' : 'Disabled'}`);
    console.log(`🔐 Encryption: ${config.security.encryption ? 'Enabled' : 'Disabled'}`);
    console.log('='.repeat(60));
    console.log('📚 Documentation: https://github.com/YourUsername/PortableLLM');
    console.log('❓ Support: https://github.com/YourUsername/PortableLLM/issues');
    console.log('='.repeat(60));
    
    if (config.app.mode === 'healthcare') {
      console.log('\n💊 Healthcare Features:');
      console.log('  • HIPAA-compliant audit logging');
      console.log('  • Local-only data processing');
      console.log('  • Encrypted data storage');
      console.log('  • Patient communication analysis');
      console.log('  • Medical documentation assistance');
    }
    
    console.log('\n✅ Ready for requests!\n');
  }

  /**
   * Graceful shutdown
   */
  async shutdown(signal) {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info(`Application received ${signal}, shutting down...`);

    try {
      // Stop monitoring service first
      if (this.monitoring) {
        this.monitoring.stop();
        logger.info('Monitoring service stopped');
      }
      
      // Stop server
      if (this.server) {
        await this.server.shutdown(signal);
      }
      
      logger.info('Application shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during application shutdown:', error);
      process.exit(1);
    }
  }
}

// Create and start application if this file is run directly
if (require.main === module) {
  const app = new PortableLLMApplication();
  
  // Handle process signals
  process.on('SIGTERM', () => app.shutdown('SIGTERM'));
  process.on('SIGINT', () => app.shutdown('SIGINT'));
  process.on('SIGHUP', () => app.shutdown('SIGHUP'));

  // Handle uncaught exceptions and rejections
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    app.shutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', { reason, promise });
    app.shutdown('UNHANDLED_REJECTION');
  });

  // Start the application
  app.start().catch((error) => {
    logger.error('Failed to start application:', error);
    process.exit(1);
  });
}

module.exports = PortableLLMApplication;