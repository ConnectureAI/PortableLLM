/**
 * Main API Server
 * Express.js server with healthcare-grade security and privacy features
 * 
 * @module Server
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('../config/app');
const logger = require('../utils/logger');
const OllamaService = require('../services/ollama');

class PortableLLMServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.ollamaService = null;
    this.isShuttingDown = false;
  }

  /**
   * Initialize the server
   */
  async init() {
    try {
      // Initialize services
      await this.initServices();
      
      // Configure middleware
      this.configureMiddleware();
      
      // Configure routes
      this.configureRoutes();
      
      // Configure error handling
      this.configureErrorHandling();
      
      logger.info('PortableLLM server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize server:', error);
      throw error;
    }
  }

  /**
   * Initialize services
   */
  async initServices() {
    try {
      // Initialize Ollama service
      this.ollamaService = new OllamaService(config.ollama.baseUrl);
      
      // Set up event listeners
      this.ollamaService.on('download:progress', (data) => {
        logger.info('Model download progress', data);
      });
      
      this.ollamaService.on('health:error', (error) => {
        logger.warn('Ollama health check failed', { error: error.message });
      });
      
      logger.info('Services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * Configure middleware
   */
  configureMiddleware() {
    // Security middleware
    if (config.api.helmet.enabled) {
      this.app.use(helmet(config.api.helmet));
    }

    // CORS configuration
    if (config.api.cors.enabled) {
      this.app.use(cors({
        origin: config.api.cors.origin,
        credentials: config.api.cors.credentials,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      }));
    }

    // Compression
    if (config.api.compression.enabled) {
      this.app.use(compression({
        threshold: config.api.compression.threshold,
      }));
    }

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.security.rateLimitWindow,
      max: config.security.rateLimitMax,
      message: {
        error: 'Too many requests, please try again later',
        retryAfter: Math.ceil(config.security.rateLimitWindow / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Request parsing
    this.app.use(express.json({ 
      limit: '50mb',
      verify: (req, res, buf, encoding) => {
        // Log all API requests for audit
        if (req.originalUrl.startsWith('/api/')) {
          logger.auditLog('API Request', {
            method: req.method,
            url: req.originalUrl,
            contentLength: buf.length,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
          });
        }
      }
    }));
    
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Request logging
    this.app.use(logger.requestLogger.bind(logger));

    // Health check endpoint (before other middleware)
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: config.app.version,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    });

    logger.info('Middleware configured successfully');
  }

  /**
   * Configure API routes
   */
  configureRoutes() {
    const apiRouter = express.Router();

    // API version info
    apiRouter.get('/', (req, res) => {
      res.json({
        name: config.app.name,
        version: config.app.version,
        mode: config.app.mode,
        api: {
          version: 'v1',
          endpoints: [
            '/models',
            '/chat',
            '/generate',
            '/system',
          ],
        },
        features: {
          privacy: config.security.localOnly,
          encryption: config.security.encryption,
          audit: config.security.auditLogging,
          healthcare: config.app.mode === 'healthcare',
        },
      });
    });

    // Include monitoring routes
    const monitoringRoutes = require('../routes/monitoring');
    apiRouter.use('/monitoring', monitoringRoutes);

    // Models endpoints
    apiRouter.get('/models', async (req, res) => {
      try {
        const models = await this.ollamaService.listModels();
        logger.auditLog('Models Listed', { count: models.length });
        res.json({ models });
      } catch (error) {
        logger.error('Failed to list models:', error);
        res.status(500).json({ error: 'Failed to list models' });
      }
    });

    apiRouter.post('/models/pull', async (req, res) => {
      try {
        const { model } = req.body;
        
        if (!model) {
          return res.status(400).json({ error: 'Model name is required' });
        }

        logger.auditLog('Model Download Started', { model });
        
        // Start download in background
        this.ollamaService.pullModel(model, { stream: true })
          .then(() => {
            logger.auditLog('Model Download Completed', { model });
          })
          .catch((error) => {
            logger.error('Model download failed:', { model, error: error.message });
          });

        res.json({ message: 'Model download started', model });
      } catch (error) {
        logger.error('Failed to start model download:', error);
        res.status(500).json({ error: 'Failed to start model download' });
      }
    });

    apiRouter.delete('/models/:model', async (req, res) => {
      try {
        const { model } = req.params;
        
        await this.ollamaService.deleteModel(model);
        logger.auditLog('Model Deleted', { model });
        
        res.json({ message: 'Model deleted successfully', model });
      } catch (error) {
        logger.error('Failed to delete model:', error);
        res.status(500).json({ error: 'Failed to delete model' });
      }
    });

    apiRouter.get('/models/:model', async (req, res) => {
      try {
        const { model } = req.params;
        const modelInfo = await this.ollamaService.getModelInfo(model);
        
        res.json({ model, info: modelInfo });
      } catch (error) {
        logger.error('Failed to get model info:', error);
        res.status(500).json({ error: 'Failed to get model info' });
      }
    });

    // Chat endpoint
    apiRouter.post('/chat', async (req, res) => {
      try {
        const { model, messages, options = {} } = req.body;
        
        if (!model || !messages) {
          return res.status(400).json({ 
            error: 'Model and messages are required' 
          });
        }

        const startTime = Date.now();
        logger.auditLog('Chat Request', { 
          model, 
          messageCount: messages.length,
          options: Object.keys(options) 
        });

        // Set up streaming response if requested
        if (options.stream !== false) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          });

          const response = await this.ollamaService.chat(model, messages, {
            ...options,
            stream: true,
          });

          // Note: In a real implementation, you'd handle the streaming response here
          // For now, we'll return the complete response
          res.end(JSON.stringify(response));
        } else {
          const response = await this.ollamaService.chat(model, messages, {
            ...options,
            stream: false,
          });

          const duration = Date.now() - startTime;
          logger.auditLog('Chat Response', { 
            model, 
            duration: `${duration}ms`,
            responseLength: response.message?.content?.length || 0 
          });

          res.json(response);
        }
      } catch (error) {
        logger.error('Chat request failed:', error);
        res.status(500).json({ error: 'Chat request failed' });
      }
    });

    // Generate endpoint
    apiRouter.post('/generate', async (req, res) => {
      try {
        const { model, prompt, options = {} } = req.body;
        
        if (!model || !prompt) {
          return res.status(400).json({ 
            error: 'Model and prompt are required' 
          });
        }

        const startTime = Date.now();
        logger.auditLog('Generate Request', { 
          model, 
          promptLength: prompt.length,
          options: Object.keys(options)
        });

        const response = await this.ollamaService.generate(model, prompt, {
          ...options,
          stream: false,
        });

        const duration = Date.now() - startTime;
        logger.auditLog('Generate Response', { 
          model, 
          duration: `${duration}ms`,
          responseLength: response.response?.length || 0 
        });

        res.json(response);
      } catch (error) {
        logger.error('Generate request failed:', error);
        res.status(500).json({ error: 'Generate request failed' });
      }
    });

    // System information
    apiRouter.get('/system', async (req, res) => {
      try {
        const systemInfo = await this.ollamaService.getSystemInfo();
        
        res.json({
          system: systemInfo,
          config: {
            mode: config.app.mode,
            privacy: {
              localOnly: config.security.localOnly,
              encryption: config.security.encryption,
              audit: config.security.auditLogging,
            },
            healthcare: config.app.mode === 'healthcare' ? {
              hipaa: config.healthcare.hipaaMode,
              dataRetention: config.healthcare.dataRetention,
            } : undefined,
          },
        });
      } catch (error) {
        logger.error('Failed to get system info:', error);
        res.status(500).json({ error: 'Failed to get system info' });
      }
    });

    // Privacy and compliance endpoint
    apiRouter.get('/privacy', (req, res) => {
      res.json({
        dataProcessing: 'local-only',
        encryption: config.security.encryption,
        auditLogging: config.security.auditLogging,
        compliance: config.app.mode === 'healthcare' ? ['HIPAA', 'PIPEDA'] : [],
        dataRetention: config.healthcare.dataRetention,
        privacyPolicy: 'All data is processed locally and never transmitted externally',
      });
    });

    // Mount API router
    this.app.use(config.api.prefix, apiRouter);

    // Serve static files (if needed)
    if (process.env.SERVE_STATIC) {
      this.app.use(express.static(path.join(__dirname, '../../public')));
    }

    // Catch-all route
    this.app.use('*', (req, res) => {
      res.status(404).json({ 
        error: 'Not found',
        path: req.originalUrl,
        available: [
          config.api.prefix,
          '/health',
        ],
      });
    });

    logger.info('Routes configured successfully');
  }

  /**
   * Configure error handling
   */
  configureErrorHandling() {
    // 404 handler
    this.app.use((req, res, next) => {
      const error = new Error(`Not Found - ${req.originalUrl}`);
      error.status = 404;
      next(error);
    });

    // Error logging middleware
    this.app.use(logger.errorLogger.bind(logger));

    // Global error handler
    this.app.use((err, req, res, next) => {
      const status = err.status || 500;
      const message = err.message || 'Internal Server Error';
      
      // Security: Don't expose stack traces in production
      const response = {
        error: message,
        status: status,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      if (config.app.environment === 'development') {
        response.stack = err.stack;
      }

      logger.securityEvent('API Error', {
        status,
        message,
        path: req.originalUrl,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });

      res.status(status).json(response);
    });

    logger.info('Error handling configured successfully');
  }

  /**
   * Start the server
   */
  async start() {
    try {
      await this.init();
      
      const port = config.app.port;
      const host = config.security.localOnly ? 'localhost' : config.app.host;
      
      this.server = this.app.listen(port, host, () => {
        logger.info(`PortableLLM server running on http://${host}:${port}`);
        logger.info(`API available at http://${host}:${port}${config.api.prefix}`);
        logger.systemEvent('Server Started', { host, port, mode: config.app.mode });
      });

      // Handle graceful shutdown
      process.on('SIGTERM', () => this.shutdown('SIGTERM'));
      process.on('SIGINT', () => this.shutdown('SIGINT'));
      
      return this.server;
    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(signal) {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    try {
      // Close HTTP server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        logger.info('HTTP server closed');
      }

      // Shutdown services
      if (this.ollamaService) {
        await this.ollamaService.shutdown();
        logger.info('Ollama service shut down');
      }

      logger.systemEvent('Server Shutdown', { signal });
      logger.info('Graceful shutdown completed');
      
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

module.exports = PortableLLMServer;