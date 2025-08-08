/**
 * Ollama Integration Service
 * Provides local LLM deployment and management through Ollama
 * 
 * @module OllamaService
 */

const axios = require('axios');
const { EventEmitter } = require('events');
const logger = require('../utils/logger');
const config = require('../config/app');

class OllamaService extends EventEmitter {
  constructor(baseUrl = 'http://localhost:11434') {
    super();
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 120000, // 2 minutes for model operations
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    this.modelCache = new Map();
    this.currentModel = null;
    this.healthCheckInterval = null;
    
    this.init();
  }

  /**
   * Initialize the Ollama service
   */
  async init() {
    try {
      await this.waitForOllama();
      await this.loadDefaultModel();
      this.startHealthCheck();
      logger.info('Ollama service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Ollama service:', error.message);
      throw error;
    }
  }

  /**
   * Wait for Ollama to be available
   */
  async waitForOllama(maxRetries = 30, interval = 2000) {
    logger.info('Waiting for Ollama to be available...');
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.client.get('/api/version');
        logger.info('Ollama is available');
        return true;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error(`Ollama not available after ${maxRetries} attempts`);
        }
        
        logger.debug(`Ollama not ready, attempt ${i + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
  }

  /**
   * Get Ollama version information
   */
  async getVersion() {
    try {
      const response = await this.client.get('/api/version');
      return response.data;
    } catch (error) {
      logger.error('Failed to get Ollama version:', error.message);
      throw error;
    }
  }

  /**
   * List available models
   */
  async listModels() {
    try {
      const response = await this.client.get('/api/tags');
      const models = response.data.models || [];
      
      // Update cache
      models.forEach(model => {
        this.modelCache.set(model.name, model);
      });
      
      return models;
    } catch (error) {
      logger.error('Failed to list models:', error.message);
      throw error;
    }
  }

  /**
   * Download and install a model
   */
  async pullModel(modelName, options = {}) {
    try {
      logger.info(`Starting download of model: ${modelName}`);
      
      const response = await this.client.post('/api/pull', {
        name: modelName,
        stream: options.stream !== false, // Default to streaming
      }, {
        responseType: options.stream !== false ? 'stream' : 'json',
        timeout: 0, // No timeout for downloads
      });

      if (options.stream !== false) {
        return new Promise((resolve, reject) => {
          let downloadProgress = 0;
          
          response.data.on('data', (chunk) => {
            try {
              const lines = chunk.toString().split('\n').filter(line => line.trim());
              
              for (const line of lines) {
                const data = JSON.parse(line);
                
                if (data.status) {
                  logger.debug(`Download progress: ${data.status}`);
                  this.emit('download:progress', {
                    model: modelName,
                    status: data.status,
                    completed: data.completed || 0,
                    total: data.total || 0,
                  });
                }
                
                if (data.status === 'success') {
                  logger.info(`Model ${modelName} downloaded successfully`);
                  this.modelCache.set(modelName, { name: modelName, size: data.total });
                  resolve(data);
                  return;
                }
              }
            } catch (parseError) {
              logger.debug('Failed to parse download progress:', parseError.message);
            }
          });

          response.data.on('end', () => {
            logger.info(`Model download completed: ${modelName}`);
            resolve({ model: modelName, status: 'success' });
          });

          response.data.on('error', (error) => {
            logger.error(`Download error for ${modelName}:`, error.message);
            reject(error);
          });
        });
      } else {
        logger.info(`Model ${modelName} downloaded successfully`);
        return response.data;
      }
    } catch (error) {
      logger.error(`Failed to download model ${modelName}:`, error.message);
      throw error;
    }
  }

  /**
   * Remove a model
   */
  async deleteModel(modelName) {
    try {
      await this.client.delete('/api/delete', {
        data: { name: modelName }
      });
      
      this.modelCache.delete(modelName);
      
      if (this.currentModel === modelName) {
        this.currentModel = null;
      }
      
      logger.info(`Model ${modelName} deleted successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete model ${modelName}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate a response from a model
   */
  async generate(modelName, prompt, options = {}) {
    try {
      const requestData = {
        model: modelName,
        prompt: prompt,
        stream: options.stream !== false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          top_k: options.top_k || 40,
          num_predict: options.max_tokens || -1,
          ...options.modelOptions
        }
      };

      if (options.system) {
        requestData.system = options.system;
      }

      const response = await this.client.post('/api/generate', requestData, {
        responseType: options.stream !== false ? 'stream' : 'json',
        timeout: options.timeout || 120000,
      });

      if (options.stream !== false) {
        return new Promise((resolve, reject) => {
          let fullResponse = '';
          let responseData = null;
          
          response.data.on('data', (chunk) => {
            try {
              const lines = chunk.toString().split('\n').filter(line => line.trim());
              
              for (const line of lines) {
                const data = JSON.parse(line);
                
                if (data.response) {
                  fullResponse += data.response;
                  this.emit('generate:token', {
                    model: modelName,
                    token: data.response,
                    done: data.done || false,
                  });
                }
                
                if (data.done) {
                  responseData = {
                    ...data,
                    response: fullResponse,
                  };
                }
              }
            } catch (parseError) {
              logger.debug('Failed to parse generation response:', parseError.message);
            }
          });

          response.data.on('end', () => {
            if (responseData) {
              resolve(responseData);
            } else {
              resolve({ response: fullResponse, done: true });
            }
          });

          response.data.on('error', (error) => {
            logger.error(`Generation error for ${modelName}:`, error.message);
            reject(error);
          });
        });
      } else {
        return response.data;
      }
    } catch (error) {
      logger.error(`Failed to generate response with ${modelName}:`, error.message);
      throw error;
    }
  }

  /**
   * Chat with a model (conversation format)
   */
  async chat(modelName, messages, options = {}) {
    try {
      const requestData = {
        model: modelName,
        messages: messages,
        stream: options.stream !== false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          top_k: options.top_k || 40,
          num_predict: options.max_tokens || -1,
          ...options.modelOptions
        }
      };

      const response = await this.client.post('/api/chat', requestData, {
        responseType: options.stream !== false ? 'stream' : 'json',
        timeout: options.timeout || 120000,
      });

      if (options.stream !== false) {
        return new Promise((resolve, reject) => {
          let fullMessage = { role: 'assistant', content: '' };
          let responseData = null;
          
          response.data.on('data', (chunk) => {
            try {
              const lines = chunk.toString().split('\n').filter(line => line.trim());
              
              for (const line of lines) {
                const data = JSON.parse(line);
                
                if (data.message && data.message.content) {
                  fullMessage.content += data.message.content;
                  this.emit('chat:token', {
                    model: modelName,
                    token: data.message.content,
                    done: data.done || false,
                  });
                }
                
                if (data.done) {
                  responseData = {
                    ...data,
                    message: fullMessage,
                  };
                }
              }
            } catch (parseError) {
              logger.debug('Failed to parse chat response:', parseError.message);
            }
          });

          response.data.on('end', () => {
            if (responseData) {
              resolve(responseData);
            } else {
              resolve({ message: fullMessage, done: true });
            }
          });

          response.data.on('error', (error) => {
            logger.error(`Chat error for ${modelName}:`, error.message);
            reject(error);
          });
        });
      } else {
        return response.data;
      }
    } catch (error) {
      logger.error(`Failed to chat with ${modelName}:`, error.message);
      throw error;
    }
  }

  /**
   * Load the default model
   */
  async loadDefaultModel() {
    try {
      const defaultModel = config.models.default;
      const models = await this.listModels();
      const modelExists = models.some(model => model.name === defaultModel);
      
      if (!modelExists) {
        logger.info(`Default model ${defaultModel} not found. Downloading...`);
        await this.pullModel(defaultModel);
      }
      
      this.currentModel = defaultModel;
      logger.info(`Default model loaded: ${defaultModel}`);
    } catch (error) {
      logger.error('Failed to load default model:', error.message);
      throw error;
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(modelName) {
    try {
      const response = await this.client.post('/api/show', {
        name: modelName
      });
      return response.data;
    } catch (error) {
      logger.error(`Failed to get model info for ${modelName}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if a model exists
   */
  async modelExists(modelName) {
    try {
      const models = await this.listModels();
      return models.some(model => model.name === modelName);
    } catch (error) {
      logger.error(`Failed to check if model exists: ${modelName}`, error.message);
      return false;
    }
  }

  /**
   * Start health check monitoring
   */
  startHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.client.get('/api/version');
        this.emit('health:ok');
      } catch (error) {
        logger.warn('Ollama health check failed:', error.message);
        this.emit('health:error', error);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop health check monitoring
   */
  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Get system resource usage
   */
  async getSystemInfo() {
    try {
      // Note: This is a placeholder as Ollama doesn't have a direct system info endpoint
      // We can implement this by monitoring the models and their resource usage
      const models = await this.listModels();
      const version = await this.getVersion();
      
      return {
        version: version,
        models: models,
        currentModel: this.currentModel,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };
    } catch (error) {
      logger.error('Failed to get system info:', error.message);
      throw error;
    }
  }

  /**
   * Shutdown the service
   */
  async shutdown() {
    logger.info('Shutting down Ollama service...');
    this.stopHealthCheck();
    this.removeAllListeners();
    this.modelCache.clear();
  }
}

module.exports = OllamaService;