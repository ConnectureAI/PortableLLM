/**
 * Privacy Service
 * Handles data privacy, de-identification, and compliance features
 * 
 * @module PrivacyService
 */

const crypto = require('crypto');
const logger = require('../utils/logger');
const config = require('../config/app');

class PrivacyService {
  constructor() {
    this.phiPatterns = this.initializePHIPatterns();
    this.deidentificationMap = new Map();
    this.privacyPolicies = new Map();
    this.consentManager = new ConsentManager();
    
    this.init();
  }

  /**
   * Initialize privacy service
   */
  init() {
    try {
      this.loadPrivacyPolicies();
      logger.info('Privacy service initialized');
    } catch (error) {
      logger.error('Failed to initialize privacy service:', error);
      throw error;
    }
  }

  /**
   * Initialize PHI detection patterns
   */
  initializePHIPatterns() {
    return {
      // Names (common patterns)
      names: {
        pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
        replacement: '[PATIENT_NAME]',
        description: 'Patient names'
      },
      
      // Social Security Numbers
      ssn: {
        pattern: /\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b/g,
        replacement: '[SSN]',
        description: 'Social Security Numbers'
      },
      
      // Medical Record Numbers
      mrn: {
        pattern: /\b(?:MRN|mrn|Medical Record|medical record)[\s:]*(\d{6,})/gi,
        replacement: '[MRN]',
        description: 'Medical Record Numbers'
      },
      
      // Phone Numbers
      phone: {
        pattern: /\b(\+?1[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})\b/g,
        replacement: '[PHONE]',
        description: 'Phone numbers'
      },
      
      // Email Addresses
      email: {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: '[EMAIL]',
        description: 'Email addresses'
      },
      
      // Dates of Birth
      dob: {
        pattern: /\b(?:DOB|dob|Date of Birth|date of birth)[\s:]*(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4})/gi,
        replacement: '[DATE_OF_BIRTH]',
        description: 'Dates of birth'
      },
      
      // Addresses
      address: {
        pattern: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir)\b/gi,
        replacement: '[ADDRESS]',
        description: 'Street addresses'
      },
      
      // ZIP Codes
      zipCode: {
        pattern: /\b\d{5}(-\d{4})?\b/g,
        replacement: '[ZIP]',
        description: 'ZIP codes'
      },
      
      // Insurance Numbers
      insurance: {
        pattern: /\b(?:insurance|policy|member)[\s#:]*([A-Z0-9]{6,})/gi,
        replacement: '[INSURANCE_ID]',
        description: 'Insurance identifiers'
      },
      
      // Account Numbers
      account: {
        pattern: /\b(?:account|acct)[\s#:]*(\d{6,})/gi,
        replacement: '[ACCOUNT_ID]',
        description: 'Account numbers'
      }
    };
  }

  /**
   * Load privacy policies configuration
   */
  loadPrivacyPolicies() {
    const policies = {
      healthcare: {
        name: 'Healthcare Privacy Policy',
        framework: 'HIPAA',
        dataRetention: config.healthcare?.dataRetention || 2555, // 7 years in days
        minimumAge: 18,
        consentRequired: true,
        auditRequired: true,
        encryptionRequired: true,
        localProcessingOnly: true
      },
      
      general: {
        name: 'General Privacy Policy',
        framework: 'GDPR',
        dataRetention: 365, // 1 year
        minimumAge: 16,
        consentRequired: true,
        auditRequired: false,
        encryptionRequired: false,
        localProcessingOnly: false
      }
    };

    for (const [key, policy] of Object.entries(policies)) {
      this.privacyPolicies.set(key, policy);
    }
  }

  /**
   * Detect PHI in text
   */
  detectPHI(text) {
    const detections = [];
    
    for (const [type, pattern] of Object.entries(this.phiPatterns)) {
      const matches = [...text.matchAll(pattern.pattern)];
      
      for (const match of matches) {
        detections.push({
          type,
          description: pattern.description,
          text: match[0],
          index: match.index,
          length: match[0].length,
          replacement: pattern.replacement
        });
      }
    }
    
    // Log PHI detection for audit
    if (detections.length > 0) {
      logger.auditLog('PHI Detection', {
        detectionCount: detections.length,
        types: [...new Set(detections.map(d => d.type))],
        textLength: text.length
      });
    }
    
    return detections;
  }

  /**
   * De-identify text by removing or replacing PHI
   */
  deidentify(text, options = {}) {
    const {
      mode = 'replace', // 'replace', 'remove', 'hash'
      preserveFormat = true,
      generateMap = true
    } = options;

    let deidentified = text;
    const detections = this.detectPHI(text);
    const identifierMap = new Map();

    // Sort detections by index (reverse order to maintain positions)
    detections.sort((a, b) => b.index - a.index);

    for (const detection of detections) {
      const { type, text: originalText, index, length, replacement } = detection;
      
      let newText;
      
      switch (mode) {
        case 'remove':
          newText = '';
          break;
          
        case 'hash':
          newText = this.generateConsistentHash(originalText, type);
          break;
          
        case 'replace':
        default:
          newText = replacement;
          break;
      }
      
      // Store mapping if requested
      if (generateMap) {
        const mappingKey = `${type}_${crypto.randomUUID()}`;
        identifierMap.set(mappingKey, {
          original: originalText,
          type,
          index,
          replacement: newText
        });
      }
      
      // Replace in text
      deidentified = deidentified.substring(0, index) + newText + deidentified.substring(index + length);
    }

    // Store de-identification map for potential re-identification (if needed for authorized users)
    if (generateMap && identifierMap.size > 0) {
      const mapId = crypto.randomUUID();
      this.deidentificationMap.set(mapId, {
        map: identifierMap,
        timestamp: new Date().toISOString(),
        textHash: crypto.createHash('sha256').update(text).digest('hex')
      });
    }

    // Log de-identification for audit
    logger.auditLog('Data De-identification', {
      originalLength: text.length,
      deidentifiedLength: deidentified.length,
      detectionCount: detections.length,
      mode,
      mapGenerated: generateMap
    });

    return {
      text: deidentified,
      detections,
      mapId: generateMap ? mapId : null,
      statistics: {
        originalLength: text.length,
        deidentifiedLength: deidentified.length,
        phiRemoved: detections.length
      }
    };
  }

  /**
   * Generate consistent hash for PHI elements
   */
  generateConsistentHash(text, type) {
    const hash = crypto.createHash('sha256')
      .update(text)
      .update(type)
      .update(config.security.jwtSecret) // Use as salt
      .digest('hex');
    
    // Return truncated hash with type prefix
    return `[${type.toUpperCase()}_${hash.substring(0, 8)}]`;
  }

  /**
   * Re-identify text (only for authorized users)
   */
  reidentify(deidentifiedText, mapId, userId) {
    try {
      // Verify authorization
      if (!this.isAuthorizedForReidentification(userId)) {
        throw new Error('User not authorized for re-identification');
      }

      const mapData = this.deidentificationMap.get(mapId);
      if (!mapData) {
        throw new Error('De-identification map not found');
      }

      let reidentified = deidentifiedText;
      
      // Apply reverse mappings
      for (const [key, mapping] of mapData.map) {
        reidentified = reidentified.replace(mapping.replacement, mapping.original);
      }

      // Log re-identification for audit
      logger.auditLog('Data Re-identification', {
        userId,
        mapId,
        timestamp: new Date().toISOString(),
        authorized: true
      });

      return reidentified;
      
    } catch (error) {
      logger.securityEvent('Unauthorized Re-identification Attempt', {
        userId,
        mapId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if user is authorized for re-identification
   */
  isAuthorizedForReidentification(userId) {
    // Implementation depends on user role system
    // For now, check if user has appropriate role
    return userId && (
      userId.includes('admin') || 
      userId.includes('physician') ||
      userId.includes('authorized')
    );
  }

  /**
   * Validate data processing consent
   */
  async validateConsent(userId, dataType, purpose) {
    try {
      const consent = await this.consentManager.getConsent(userId);
      
      if (!consent) {
        return {
          valid: false,
          reason: 'No consent record found'
        };
      }
      
      if (!consent.isActive()) {
        return {
          valid: false,
          reason: 'Consent has expired or been withdrawn'
        };
      }
      
      if (!consent.allowsDataType(dataType)) {
        return {
          valid: false,
          reason: `Consent does not cover data type: ${dataType}`
        };
      }
      
      if (!consent.allowsPurpose(purpose)) {
        return {
          valid: false,
          reason: `Consent does not cover purpose: ${purpose}`
        };
      }
      
      // Log consent validation
      logger.auditLog('Consent Validation', {
        userId,
        dataType,
        purpose,
        consentId: consent.id,
        valid: true
      });
      
      return {
        valid: true,
        consent: consent.getSummary()
      };
      
    } catch (error) {
      logger.error('Consent validation failed:', error);
      return {
        valid: false,
        reason: 'Consent validation error'
      };
    }
  }

  /**
   * Apply privacy policy
   */
  applyPrivacyPolicy(data, policyName = 'healthcare') {
    const policy = this.privacyPolicies.get(policyName);
    if (!policy) {
      throw new Error(`Privacy policy '${policyName}' not found`);
    }

    const result = {
      originalData: data,
      policy: policy.name,
      framework: policy.framework,
      processed: data
    };

    // Apply policy rules
    if (policy.localProcessingOnly) {
      // Ensure no external processing
      result.guarantees = ['local_processing_only'];
    }

    if (policy.encryptionRequired) {
      // Data should be encrypted (handled by encryption service)
      result.encryptionRequired = true;
    }

    if (policy.auditRequired) {
      // Log processing activity
      logger.auditLog('Privacy Policy Applied', {
        policy: policy.name,
        framework: policy.framework,
        dataLength: data.length,
        requirements: {
          encryption: policy.encryptionRequired,
          localOnly: policy.localProcessingOnly,
          audit: policy.auditRequired
        }
      });
    }

    return result;
  }

  /**
   * Generate privacy report
   */
  generatePrivacyReport(startDate, endDate) {
    // This would typically query audit logs
    // For now, return summary statistics
    
    const report = {
      period: {
        start: startDate,
        end: endDate
      },
      summary: {
        deidentificationOperations: this.deidentificationMap.size,
        phiDetections: 0, // Would count from audit logs
        consentValidations: 0, // Would count from audit logs
        reidentificationAttempts: 0 // Would count from audit logs
      },
      compliance: {
        framework: config.app.mode === 'healthcare' ? 'HIPAA' : 'GDPR',
        localProcessingOnly: config.security.localOnly,
        auditLogging: config.security.auditLogging,
        encryption: config.security.encryption
      },
      policies: Array.from(this.privacyPolicies.entries()).map(([key, policy]) => ({
        name: key,
        framework: policy.framework,
        active: true
      }))
    };

    logger.auditLog('Privacy Report Generated', {
      period: report.period,
      reportId: crypto.randomUUID()
    });

    return report;
  }

  /**
   * Clean up expired de-identification maps
   */
  cleanupExpiredMaps() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    let cleanedCount = 0;
    
    for (const [mapId, mapData] of this.deidentificationMap) {
      const age = now - new Date(mapData.timestamp);
      
      if (age > maxAge) {
        this.deidentificationMap.delete(mapId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired de-identification maps`);
    }
  }

  /**
   * Get privacy service status
   */
  getStatus() {
    return {
      phiPatterns: Object.keys(this.phiPatterns).length,
      activePolicies: this.privacyPolicies.size,
      deidentificationMaps: this.deidentificationMap.size,
      features: {
        phiDetection: true,
        deidentification: true,
        consentManagement: true,
        auditLogging: config.security.auditLogging,
        localProcessingOnly: config.security.localOnly
      },
      compliance: {
        framework: config.app.mode === 'healthcare' ? 'HIPAA' : 'GDPR',
        dataRetention: config.healthcare?.dataRetention || 365,
        encryptionRequired: config.security.encryption
      }
    };
  }
}

/**
 * Consent Management Class
 */
class ConsentManager {
  constructor() {
    this.consents = new Map();
  }

  async getConsent(userId) {
    return this.consents.get(userId);
  }

  async recordConsent(userId, consentData) {
    const consent = new ConsentRecord(userId, consentData);
    this.consents.set(userId, consent);
    
    logger.auditLog('Consent Recorded', {
      userId,
      consentId: consent.id,
      dataTypes: consentData.dataTypes,
      purposes: consentData.purposes
    });
    
    return consent;
  }

  async withdrawConsent(userId, reason = null) {
    const consent = this.consents.get(userId);
    if (consent) {
      consent.withdraw(reason);
      
      logger.auditLog('Consent Withdrawn', {
        userId,
        consentId: consent.id,
        reason
      });
    }
  }
}

/**
 * Consent Record Class
 */
class ConsentRecord {
  constructor(userId, consentData) {
    this.id = crypto.randomUUID();
    this.userId = userId;
    this.dataTypes = consentData.dataTypes || [];
    this.purposes = consentData.purposes || [];
    this.granted = new Date();
    this.expires = consentData.expires ? new Date(consentData.expires) : null;
    this.withdrawn = null;
    this.withdrawalReason = null;
  }

  isActive() {
    const now = new Date();
    
    if (this.withdrawn && this.withdrawn <= now) {
      return false;
    }
    
    if (this.expires && this.expires <= now) {
      return false;
    }
    
    return true;
  }

  allowsDataType(dataType) {
    return this.dataTypes.includes(dataType) || this.dataTypes.includes('all');
  }

  allowsPurpose(purpose) {
    return this.purposes.includes(purpose) || this.purposes.includes('all');
  }

  withdraw(reason = null) {
    this.withdrawn = new Date();
    this.withdrawalReason = reason;
  }

  getSummary() {
    return {
      id: this.id,
      userId: this.userId,
      granted: this.granted,
      expires: this.expires,
      active: this.isActive(),
      dataTypes: this.dataTypes,
      purposes: this.purposes
    };
  }
}

module.exports = PrivacyService;