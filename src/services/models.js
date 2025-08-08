/**
 * Model Management Service
 * Handles AI model lifecycle, optimization, and performance management
 * 
 * @module ModelService
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const logger = require('../utils/logger');
const config = require('../config/app');

class ModelService extends EventEmitter {
  constructor(ollamaService) {
    super();
    this.ollamaService = ollamaService;
    
    this.models = new Map();
    this.modelCache = new Map();
    this.performanceMetrics = new Map();
    this.optimizations = new Map();
    this.modelQueue = [];
    
    this.init();
  }

  /**
   * Initialize model service
   */
  async init() {
    try {
      await this.loadModelRegistry();
      await this.initializeHealthcareModels();
      await this.startPerformanceMonitoring();
      
      logger.info('Model service initialized');
    } catch (error) {
      logger.error('Failed to initialize model service:', error);
      throw error;
    }
  }

  /**
   * Load model registry
   */
  async loadModelRegistry() {
    const registryPath = path.join(config.paths.config, 'models.json');
    
    try {
      if (fs.existsSync(registryPath)) {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        this.processModelRegistry(registry);
      } else {
        await this.createDefaultModelRegistry(registryPath);
      }
      
      logger.info('Model registry loaded');
    } catch (error) {
      logger.error('Failed to load model registry:', error);
      throw error;
    }
  }

  /**
   * Create default model registry
   */
  async createDefaultModelRegistry(registryPath) {
    const defaultRegistry = {
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      models: {
        'deepseek-coder:6.7b-instruct': {
          name: 'DeepSeek Coder',
          version: '6.7B Instruct',
          description: 'Code-focused model optimized for software development and technical documentation',
          size: '3.8GB',
          parameters: '6.7B',
          quantization: 'Q4_0',
          use_cases: ['code_analysis', 'technical_documentation', 'medical_coding'],
          healthcare_optimized: true,
          performance: {
            tokens_per_second: 25,
            memory_usage: '8GB',
            latency_ms: 150
          },
          tags: ['code', 'healthcare', 'documentation', 'analysis']
        },
        
        'llama3.1:8b-instruct': {
          name: 'Llama 3.1',
          version: '8B Instruct',
          description: 'General-purpose model with strong reasoning capabilities',
          size: '4.7GB',
          parameters: '8B',
          quantization: 'Q4_0',
          use_cases: ['general_chat', 'medical_knowledge', 'patient_communication'],
          healthcare_optimized: true,
          performance: {
            tokens_per_second: 22,
            memory_usage: '10GB',
            latency_ms: 180
          },
          tags: ['general', 'healthcare', 'reasoning', 'communication']
        },
        
        'mistral:7b-instruct': {
          name: 'Mistral',
          version: '7B Instruct',
          description: 'Efficient model for professional communication and document analysis',
          size: '4.1GB',
          parameters: '7B',
          quantization: 'Q4_0',
          use_cases: ['professional_writing', 'document_analysis', 'patient_education'],
          healthcare_optimized: true,
          performance: {
            tokens_per_second: 28,
            memory_usage: '9GB',
            latency_ms: 140
          },
          tags: ['professional', 'healthcare', 'writing', 'education']
        },
        
        'codellama:7b-instruct': {
          name: 'Code Llama',
          version: '7B Instruct',
          description: 'Specialized model for code generation and analysis',
          size: '3.9GB',
          parameters: '7B',
          quantization: 'Q4_0',
          use_cases: ['code_generation', 'technical_analysis', 'integration_support'],
          healthcare_optimized: false,
          performance: {
            tokens_per_second: 26,
            memory_usage: '8GB',
            latency_ms: 160
          },
          tags: ['code', 'technical', 'development']
        }
      },
      
      healthcare_specializations: {
        'medical-documentation': {
          base_model: 'deepseek-coder:6.7b-instruct',
          fine_tuning: 'medical_terminology',
          description: 'Optimized for clinical documentation and medical coding'
        },
        'patient-communication': {
          base_model: 'llama3.1:8b-instruct',
          fine_tuning: 'healthcare_communication',
          description: 'Optimized for patient-friendly communication and education'
        },
        'clinical-analysis': {
          base_model: 'mistral:7b-instruct',
          fine_tuning: 'clinical_reasoning',
          description: 'Optimized for clinical decision support and analysis'
        }
      },
      
      optimization_profiles: {
        'speed': {
          name: 'Speed Optimized',
          description: 'Prioritizes response time over accuracy',
          parameters: {
            temperature: 0.3,
            top_p: 0.7,
            top_k: 20,
            repeat_penalty: 1.1,
            num_ctx: 2048
          }
        },
        'accuracy': {
          name: 'Accuracy Optimized',
          description: 'Prioritizes accuracy over speed',
          parameters: {
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
            repeat_penalty: 1.05,
            num_ctx: 4096
          }
        },
        'balanced': {
          name: 'Balanced',
          description: 'Balance between speed and accuracy',
          parameters: {
            temperature: 0.5,
            top_p: 0.8,
            top_k: 30,
            repeat_penalty: 1.08,
            num_ctx: 3072
          }
        },
        'healthcare': {
          name: 'Healthcare Optimized',
          description: 'Optimized for healthcare workflows',
          parameters: {
            temperature: 0.4,
            top_p: 0.8,
            top_k: 25,
            repeat_penalty: 1.1,
            num_ctx: 4096
          }
        }
      }
    };

    fs.writeFileSync(registryPath, JSON.stringify(defaultRegistry, null, 2));
    this.processModelRegistry(defaultRegistry);
  }

  /**
   * Process model registry data
   */
  processModelRegistry(registry) {
    // Store model metadata
    for (const [modelId, modelData] of Object.entries(registry.models)) {
      this.models.set(modelId, {
        ...modelData,
        id: modelId,
        status: 'not_installed',
        last_used: null,
        usage_count: 0
      });
    }

    // Store optimization profiles
    this.optimizations = new Map(Object.entries(registry.optimization_profiles));
    
    // Store healthcare specializations
    this.healthcareSpecializations = registry.healthcare_specializations;
  }

  /**
   * Initialize healthcare-optimized models
   */
  async initializeHealthcareModels() {
    if (config.app.mode !== 'healthcare') {
      return;
    }

    try {
      // Get list of currently installed models
      const installedModels = await this.ollamaService.listModels();
      const installedModelNames = installedModels.map(m => m.name);

      // Update model status
      for (const [modelId, model] of this.models) {
        if (installedModelNames.includes(modelId)) {
          model.status = 'installed';
          model.installed_date = new Date().toISOString();
        }
      }

      // Auto-install default healthcare models if configured
      if (config.models.autoDownload) {
        await this.autoInstallHealthcareModels();
      }

      logger.info('Healthcare models initialized');
    } catch (error) {
      logger.error('Failed to initialize healthcare models:', error);
    }
  }

  /**
   * Auto-install healthcare models
   */
  async autoInstallHealthcareModels() {
    const healthcareModels = Array.from(this.models.entries())
      .filter(([_, model]) => model.healthcare_optimized)
      .map(([id]) => id);

    for (const modelId of healthcareModels) {
      const model = this.models.get(modelId);
      
      if (model.status === 'not_installed') {
        try {
          logger.info(`Auto-installing healthcare model: ${modelId}`);
          await this.installModel(modelId);
        } catch (error) {
          logger.warn(`Failed to auto-install model ${modelId}:`, error.message);
        }
      }
    }
  }

  /**
   * Install model
   */
  async installModel(modelId, options = {}) {
    try {
      const model = this.models.get(modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not found in registry`);
      }

      if (model.status === 'installed') {
        logger.info(`Model ${modelId} already installed`);
        return model;
      }

      logger.info(`Installing model: ${modelId}`);
      model.status = 'installing';
      this.emit('model:installing', { modelId, model });

      // Download model using Ollama service
      await this.ollamaService.pullModel(modelId, {
        stream: true,
        ...options
      });

      // Update model status
      model.status = 'installed';
      model.installed_date = new Date().toISOString();
      
      // Initialize performance metrics
      this.initializeModelMetrics(modelId);

      // Log installation
      logger.auditLog('Model Installation', {
        modelId,
        name: model.name,
        size: model.size,
        healthcare_optimized: model.healthcare_optimized
      });

      this.emit('model:installed', { modelId, model });
      
      return model;
      
    } catch (error) {
      const model = this.models.get(modelId);
      if (model) {
        model.status = 'error';
        model.error = error.message;
      }
      
      logger.error(`Failed to install model ${modelId}:`, error);
      this.emit('model:error', { modelId, error });
      throw error;
    }
  }

  /**
   * Uninstall model
   */
  async uninstallModel(modelId) {
    try {
      const model = this.models.get(modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }

      if (model.status !== 'installed') {
        throw new Error(`Model ${modelId} is not installed`);
      }

      logger.info(`Uninstalling model: ${modelId}`);
      
      // Remove model using Ollama service
      await this.ollamaService.deleteModel(modelId);

      // Update model status
      model.status = 'not_installed';
      model.installed_date = null;
      
      // Clean up metrics
      this.performanceMetrics.delete(modelId);
      this.modelCache.delete(modelId);

      // Log uninstallation
      logger.auditLog('Model Uninstallation', {
        modelId,
        name: model.name
      });

      this.emit('model:uninstalled', { modelId, model });
      
      return model;
      
    } catch (error) {
      logger.error(`Failed to uninstall model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Get model recommendations based on use case
   */
  getModelRecommendations(useCase, constraints = {}) {
    const {
      maxMemory = Infinity,
      maxSize = Infinity,
      minSpeed = 0,
      healthcareOnly = config.app.mode === 'healthcare'
    } = constraints;

    const recommendations = [];

    for (const [modelId, model] of this.models) {
      // Filter by use case
      if (!model.use_cases.includes(useCase)) {
        continue;
      }

      // Filter by healthcare requirement
      if (healthcareOnly && !model.healthcare_optimized) {
        continue;
      }

      // Filter by constraints
      const memoryMB = this.parseMemorySize(model.performance.memory_usage);
      const sizeMB = this.parseSize(model.size);
      const speed = model.performance.tokens_per_second;

      if (memoryMB > maxMemory || sizeMB > maxSize || speed < minSpeed) {
        continue;
      }

      // Calculate recommendation score
      const score = this.calculateModelScore(model, useCase, constraints);
      
      recommendations.push({
        modelId,
        model,
        score,
        reasons: this.getRecommendationReasons(model, useCase, constraints)
      });
    }

    // Sort by score (descending)
    recommendations.sort((a, b) => b.score - a.score);

    return recommendations;
  }

  /**
   * Calculate model recommendation score
   */
  calculateModelScore(model, useCase, constraints) {
    let score = 0;

    // Base score for use case match
    score += 100;

    // Healthcare optimization bonus
    if (model.healthcare_optimized && config.app.mode === 'healthcare') {
      score += 50;
    }

    // Performance scoring
    const speed = model.performance.tokens_per_second;
    const latency = model.performance.latency_ms;
    
    score += Math.min(speed * 2, 50); // Speed bonus (up to 50)
    score -= Math.min(latency / 10, 30); // Latency penalty (up to 30)

    // Size penalty (smaller is better for efficiency)
    const sizeMB = this.parseSize(model.size);
    score -= Math.min(sizeMB / 100, 20); // Size penalty (up to 20)

    // Usage count bonus (popular models)
    score += Math.min(model.usage_count / 10, 25);

    return Math.max(score, 0);
  }

  /**
   * Get recommendation reasons
   */
  getRecommendationReasons(model, useCase, constraints) {
    const reasons = [];

    reasons.push(`Optimized for ${useCase}`);

    if (model.healthcare_optimized) {
      reasons.push('Healthcare optimized');
    }

    if (model.performance.tokens_per_second > 25) {
      reasons.push('High performance');
    }

    if (model.performance.latency_ms < 150) {
      reasons.push('Low latency');
    }

    const sizeMB = this.parseSize(model.size);
    if (sizeMB < 4000) {
      reasons.push('Compact size');
    }

    return reasons;
  }

  /**
   * Optimize model parameters for specific use case
   */
  optimizeForUseCase(modelId, useCase, profile = 'balanced') {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const optimizationProfile = this.optimizations.get(profile);
    if (!optimizationProfile) {
      throw new Error(`Optimization profile ${profile} not found`);
    }

    // Create use case specific optimizations
    let optimizedParams = { ...optimizationProfile.parameters };

    switch (useCase) {
      case 'medical_documentation':
        optimizedParams.temperature = 0.3; // More deterministic for medical accuracy
        optimizedParams.repeat_penalty = 1.15; // Reduce repetition
        optimizedParams.num_ctx = 4096; // Larger context for documents
        break;

      case 'patient_communication':
        optimizedParams.temperature = 0.6; // More natural communication
        optimizedParams.top_p = 0.9; // More diverse responses
        optimizedParams.num_ctx = 3072; // Balanced context
        break;

      case 'clinical_analysis':
        optimizedParams.temperature = 0.4; // Balanced accuracy
        optimizedParams.top_k = 30; // Focused responses
        optimizedParams.num_ctx = 4096; // Larger context for analysis
        break;

      case 'code_analysis':
        optimizedParams.temperature = 0.2; // Very deterministic
        optimizedParams.top_p = 0.8; // Focused on likely tokens
        optimizedParams.num_ctx = 4096; // Large context for code
        break;
    }

    // Store optimization
    const optimizationKey = `${modelId}:${useCase}`;
    this.modelCache.set(optimizationKey, {
      modelId,
      useCase,
      profile,
      parameters: optimizedParams,
      created: new Date().toISOString()
    });

    logger.auditLog('Model Optimization', {
      modelId,
      useCase,
      profile,
      parameters: Object.keys(optimizedParams)
    });

    return optimizedParams;
  }

  /**
   * Initialize model performance metrics
   */
  initializeModelMetrics(modelId) {
    this.performanceMetrics.set(modelId, {
      totalRequests: 0,
      totalTokens: 0,
      totalLatency: 0,
      averageTokensPerSecond: 0,
      averageLatency: 0,
      errorCount: 0,
      lastUsed: null,
      dailyUsage: new Map(), // Date -> usage count
      useCaseBreakdown: new Map() // Use case -> usage count
    });
  }

  /**
   * Update model performance metrics
   */
  updateModelMetrics(modelId, metrics) {
    const modelMetrics = this.performanceMetrics.get(modelId);
    if (!modelMetrics) {
      this.initializeModelMetrics(modelId);
      return this.updateModelMetrics(modelId, metrics);
    }

    const {
      tokens = 0,
      latency = 0,
      useCase = 'unknown',
      error = false
    } = metrics;

    // Update counters
    modelMetrics.totalRequests++;
    modelMetrics.totalTokens += tokens;
    modelMetrics.totalLatency += latency;
    modelMetrics.lastUsed = new Date().toISOString();

    if (error) {
      modelMetrics.errorCount++;
    }

    // Calculate averages
    if (tokens > 0 && latency > 0) {
      modelMetrics.averageTokensPerSecond = tokens / (latency / 1000);
    }
    modelMetrics.averageLatency = modelMetrics.totalLatency / modelMetrics.totalRequests;

    // Update daily usage
    const today = new Date().toISOString().split('T')[0];
    const dailyCount = modelMetrics.dailyUsage.get(today) || 0;
    modelMetrics.dailyUsage.set(today, dailyCount + 1);

    // Update use case breakdown
    const useCaseCount = modelMetrics.useCaseBreakdown.get(useCase) || 0;
    modelMetrics.useCaseBreakdown.set(useCase, useCaseCount + 1);

    // Update model usage count
    const model = this.models.get(modelId);
    if (model) {
      model.usage_count++;
      model.last_used = modelMetrics.lastUsed;
    }

    this.emit('model:metrics_updated', { modelId, metrics: modelMetrics });
  }

  /**
   * Get model performance report
   */
  getPerformanceReport(modelId = null, period = 30) {
    const cutoffDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);
    
    if (modelId) {
      return this.getSingleModelReport(modelId, cutoffDate);
    } else {
      return this.getAllModelsReport(cutoffDate);
    }
  }

  /**
   * Get performance report for single model
   */
  getSingleModelReport(modelId, cutoffDate) {
    const model = this.models.get(modelId);
    const metrics = this.performanceMetrics.get(modelId);

    if (!model || !metrics) {
      throw new Error(`Model ${modelId} not found or no metrics available`);
    }

    // Filter daily usage by period
    const recentUsage = new Map();
    for (const [date, count] of metrics.dailyUsage) {
      if (new Date(date) >= cutoffDate) {
        recentUsage.set(date, count);
      }
    }

    return {
      model: {
        id: modelId,
        name: model.name,
        version: model.version,
        status: model.status
      },
      performance: {
        total_requests: metrics.totalRequests,
        total_tokens: metrics.totalTokens,
        average_tokens_per_second: Math.round(metrics.averageTokensPerSecond),
        average_latency_ms: Math.round(metrics.averageLatency),
        error_rate: metrics.totalRequests > 0 ? (metrics.errorCount / metrics.totalRequests) * 100 : 0,
        last_used: metrics.lastUsed
      },
      usage: {
        daily_usage: Object.fromEntries(recentUsage),
        use_case_breakdown: Object.fromEntries(metrics.useCaseBreakdown),
        total_period_requests: Array.from(recentUsage.values()).reduce((a, b) => a + b, 0)
      },
      efficiency: this.calculateModelEfficiency(modelId)
    };
  }

  /**
   * Get performance report for all models
   */
  getAllModelsReport(cutoffDate) {
    const reports = new Map();
    
    for (const [modelId] of this.models) {
      try {
        reports.set(modelId, this.getSingleModelReport(modelId, cutoffDate));
      } catch (error) {
        // Skip models without metrics
        continue;
      }
    }

    // Calculate aggregate statistics
    const totalRequests = Array.from(reports.values())
      .reduce((sum, report) => sum + report.performance.total_requests, 0);
    
    const averageTokensPerSecond = Array.from(reports.values())
      .reduce((sum, report) => sum + report.performance.average_tokens_per_second, 0) / reports.size;

    return {
      summary: {
        total_models: this.models.size,
        active_models: reports.size,
        total_requests: totalRequests,
        average_performance: Math.round(averageTokensPerSecond),
        period_days: Math.round((Date.now() - cutoffDate.getTime()) / (24 * 60 * 60 * 1000))
      },
      models: Object.fromEntries(reports)
    };
  }

  /**
   * Calculate model efficiency score
   */
  calculateModelEfficiency(modelId) {
    const model = this.models.get(modelId);
    const metrics = this.performanceMetrics.get(modelId);

    if (!model || !metrics || metrics.totalRequests === 0) {
      return null;
    }

    // Efficiency factors
    const speedScore = Math.min((metrics.averageTokensPerSecond / 30) * 100, 100);
    const latencyScore = Math.max(100 - (metrics.averageLatency / 200) * 100, 0);
    const reliabilityScore = Math.max(100 - (metrics.errorCount / metrics.totalRequests) * 100, 0);
    
    // Memory efficiency (inverse of memory usage)
    const memoryMB = this.parseMemorySize(model.performance.memory_usage);
    const memoryScore = Math.max(100 - (memoryMB / 16000) * 100, 0);

    const overallScore = (speedScore + latencyScore + reliabilityScore + memoryScore) / 4;

    return {
      overall_score: Math.round(overallScore),
      factors: {
        speed: Math.round(speedScore),
        latency: Math.round(latencyScore),
        reliability: Math.round(reliabilityScore),
        memory: Math.round(memoryScore)
      }
    };
  }

  /**
   * Start performance monitoring
   */
  async startPerformanceMonitoring() {
    // Monitor performance every 5 minutes
    setInterval(() => {
      this.collectPerformanceData();
    }, 5 * 60 * 1000);

    // Clean up old metrics daily
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 24 * 60 * 60 * 1000);

    logger.info('Model performance monitoring started');
  }

  /**
   * Collect performance data
   */
  async collectPerformanceData() {
    try {
      // Get system resource usage
      const memoryUsage = process.memoryUsage();
      
      // Log performance snapshot
      logger.performanceMetric('Model Service Performance', {
        heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        active_models: this.performanceMetrics.size,
        cached_optimizations: this.modelCache.size
      });
      
    } catch (error) {
      logger.error('Performance data collection failed:', error);
    }
  }

  /**
   * Clean up old metrics
   */
  cleanupOldMetrics() {
    const maxAge = 90; // 90 days
    const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
    
    let cleanedMetrics = 0;
    
    for (const [modelId, metrics] of this.performanceMetrics) {
      // Clean old daily usage data
      for (const [date, count] of metrics.dailyUsage) {
        if (new Date(date) < cutoffDate) {
          metrics.dailyUsage.delete(date);
          cleanedMetrics++;
        }
      }
    }
    
    // Clean old cached optimizations
    let cleanedCache = 0;
    for (const [key, optimization] of this.modelCache) {
      if (new Date(optimization.created) < cutoffDate) {
        this.modelCache.delete(key);
        cleanedCache++;
      }
    }
    
    if (cleanedMetrics > 0 || cleanedCache > 0) {
      logger.info(`Cleaned up ${cleanedMetrics} old metrics and ${cleanedCache} cached optimizations`);
    }
  }

  /**
   * Utility function to parse memory size
   */
  parseMemorySize(sizeString) {
    const match = sizeString.match(/(\d+)GB/);
    return match ? parseInt(match[1]) * 1024 : 0; // Convert to MB
  }

  /**
   * Utility function to parse file size
   */
  parseSize(sizeString) {
    const match = sizeString.match(/(\d+\.?\d*)GB/);
    return match ? parseFloat(match[1]) * 1024 : 0; // Convert to MB
  }

  /**
   * Get model service status
   */
  getStatus() {
    const installedModels = Array.from(this.models.values()).filter(m => m.status === 'installed');
    const healthcareModels = installedModels.filter(m => m.healthcare_optimized);
    
    return {
      total_models: this.models.size,
      installed_models: installedModels.length,
      healthcare_models: healthcareModels.length,
      optimization_profiles: this.optimizations.size,
      cached_optimizations: this.modelCache.size,
      performance_metrics: this.performanceMetrics.size,
      queue_size: this.modelQueue.length,
      features: {
        auto_install: config.models.autoDownload,
        performance_monitoring: true,
        optimization: true,
        healthcare_specialization: true
      }
    };
  }

  /**
   * Get detailed model information
   */
  getModelInfo(modelId) {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const metrics = this.performanceMetrics.get(modelId);
    const efficiency = this.calculateModelEfficiency(modelId);

    return {
      ...model,
      metrics: metrics ? {
        total_requests: metrics.totalRequests,
        total_tokens: metrics.totalTokens,
        average_tokens_per_second: Math.round(metrics.averageTokensPerSecond),
        average_latency: Math.round(metrics.averageLatency),
        error_rate: metrics.totalRequests > 0 ? (metrics.errorCount / metrics.totalRequests) * 100 : 0,
        last_used: metrics.lastUsed
      } : null,
      efficiency
    };
  }
}

module.exports = ModelService;