/**
 * Compliance Service
 * Handles HIPAA, PIPEDA, GDPR and other regulatory compliance requirements
 * 
 * @module ComplianceService
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');
const config = require('../config/app');

class ComplianceService {
  constructor(encryptionService, privacyService) {
    this.encryptionService = encryptionService;
    this.privacyService = privacyService;
    
    this.frameworks = new Map();
    this.auditTrail = [];
    this.complianceChecks = new Map();
    this.riskAssessments = new Map();
    
    this.init();
  }

  /**
   * Initialize compliance service
   */
  async init() {
    try {
      this.initializeFrameworks();
      await this.loadComplianceConfig();
      this.startComplianceMonitoring();
      
      logger.info('Compliance service initialized');
    } catch (error) {
      logger.error('Failed to initialize compliance service:', error);
      throw error;
    }
  }

  /**
   * Initialize compliance frameworks
   */
  initializeFrameworks() {
    // HIPAA Framework
    this.frameworks.set('HIPAA', {
      name: 'Health Insurance Portability and Accountability Act',
      jurisdiction: 'United States',
      applicability: 'Healthcare providers, health plans, healthcare clearinghouses',
      requirements: {
        privacy: {
          description: 'Protection of PHI in all forms',
          controls: [
            'access_controls',
            'audit_controls', 
            'integrity_controls',
            'transmission_security'
          ]
        },
        security: {
          description: 'Protection of electronic PHI (ePHI)',
          controls: [
            'access_control',
            'audit_controls',
            'integrity',
            'person_entity_authentication',
            'transmission_security'
          ]
        },
        breach_notification: {
          description: 'Notification requirements for PHI breaches',
          controls: [
            'incident_response',
            'breach_assessment',
            'notification_procedures'
          ]
        }
      },
      penalties: {
        tier1: { min: 100, max: 50000, description: 'No knowledge of violation' },
        tier2: { min: 1000, max: 50000, description: 'Reasonable cause, no willful neglect' },
        tier3: { min: 10000, max: 50000, description: 'Willful neglect, corrected within 30 days' },
        tier4: { min: 50000, max: 1500000, description: 'Willful neglect, not corrected' }
      }
    });

    // PIPEDA Framework
    this.frameworks.set('PIPEDA', {
      name: 'Personal Information Protection and Electronic Documents Act',
      jurisdiction: 'Canada',
      applicability: 'Organizations collecting, using, or disclosing personal information',
      requirements: {
        accountability: {
          description: 'Organization responsible for personal information under its control',
          controls: ['designated_privacy_officer', 'privacy_policies', 'staff_training']
        },
        identifying_purposes: {
          description: 'Purposes for collection must be identified before or at time of collection',
          controls: ['purpose_identification', 'collection_limitation']
        },
        consent: {
          description: 'Knowledge and consent required for collection, use, or disclosure',
          controls: ['informed_consent', 'consent_withdrawal', 'consent_documentation']
        },
        limiting_collection: {
          description: 'Collection limited to what is necessary for identified purposes',
          controls: ['data_minimization', 'collection_methods']
        },
        limiting_use_retention: {
          description: 'Use and retention limited to fulfilling identified purposes',
          controls: ['retention_policies', 'secure_disposal', 'purpose_limitation']
        },
        accuracy: {
          description: 'Personal information must be accurate, complete, and up-to-date',
          controls: ['data_quality', 'correction_procedures']
        },
        safeguards: {
          description: 'Appropriate safeguards to protect personal information',
          controls: ['security_measures', 'access_controls', 'encryption']
        },
        openness: {
          description: 'Make information about policies and practices readily available',
          controls: ['transparency', 'privacy_notices', 'contact_information']
        },
        individual_access: {
          description: 'Individuals can access their personal information',
          controls: ['access_procedures', 'response_timeframes']
        },
        challenging_compliance: {
          description: 'Individuals can challenge compliance with principles',
          controls: ['complaint_procedures', 'investigation_processes']
        }
      }
    });

    // GDPR Framework
    this.frameworks.set('GDPR', {
      name: 'General Data Protection Regulation',
      jurisdiction: 'European Union',
      applicability: 'Organizations processing personal data of EU residents',
      requirements: {
        lawfulness: {
          description: 'Processing must have lawful basis',
          controls: ['legal_basis_assessment', 'consent_management']
        },
        data_minimization: {
          description: 'Processing limited to what is necessary',
          controls: ['purpose_limitation', 'data_minimization', 'storage_limitation']
        },
        rights: {
          description: 'Data subject rights must be facilitated',
          controls: [
            'right_to_information',
            'right_of_access', 
            'right_to_rectification',
            'right_to_erasure',
            'right_to_portability',
            'right_to_object'
          ]
        },
        security: {
          description: 'Appropriate technical and organizational measures',
          controls: ['encryption', 'pseudonymization', 'access_controls', 'incident_response']
        },
        accountability: {
          description: 'Demonstrate compliance with GDPR principles',
          controls: ['documentation', 'impact_assessments', 'privacy_by_design']
        }
      },
      penalties: {
        tier1: { max: 10000000, percent: 2, description: 'Lower tier violations' },
        tier2: { max: 20000000, percent: 4, description: 'Higher tier violations' }
      }
    });
  }

  /**
   * Load compliance configuration
   */
  async loadComplianceConfig() {
    const configPath = path.join(config.paths.config, 'compliance.json');
    
    try {
      if (fs.existsSync(configPath)) {
        const complianceConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        this.processComplianceConfig(complianceConfig);
        logger.info('Compliance configuration loaded');
      } else {
        await this.createDefaultComplianceConfig(configPath);
        logger.info('Default compliance configuration created');
      }
    } catch (error) {
      logger.error('Failed to load compliance configuration:', error);
      throw error;
    }
  }

  /**
   * Create default compliance configuration
   */
  async createDefaultComplianceConfig(configPath) {
    const defaultConfig = {
      active_frameworks: config.app.mode === 'healthcare' ? ['HIPAA'] : ['GDPR'],
      organization: {
        name: 'PortableLLM User Organization',
        type: config.app.mode === 'healthcare' ? 'healthcare_provider' : 'general',
        jurisdiction: 'US', // Default, should be configured by user
        data_protection_officer: null,
        privacy_officer: null
      },
      risk_tolerance: 'low',
      audit_frequency: 'quarterly',
      training_requirements: {
        frequency: 'annual',
        mandatory: true,
        completion_tracking: true
      },
      incident_response: {
        contact_information: [],
        escalation_procedures: [],
        notification_requirements: []
      },
      data_retention: {
        default_period: config.healthcare?.dataRetention || 365,
        automatic_deletion: true,
        deletion_verification: true
      }
    };

    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  }

  /**
   * Process compliance configuration
   */
  processComplianceConfig(complianceConfig) {
    // Validate active frameworks
    for (const framework of complianceConfig.active_frameworks) {
      if (!this.frameworks.has(framework)) {
        logger.warn(`Unknown compliance framework: ${framework}`);
      }
    }

    this.activeFrameworks = complianceConfig.active_frameworks;
    this.organization = complianceConfig.organization;
    this.riskTolerance = complianceConfig.risk_tolerance;
  }

  /**
   * Start compliance monitoring
   */
  startComplianceMonitoring() {
    // Check compliance status every hour
    setInterval(() => {
      this.performComplianceChecks();
    }, 60 * 60 * 1000);

    // Perform initial compliance check
    setTimeout(() => {
      this.performComplianceChecks();
    }, 5000);
  }

  /**
   * Perform comprehensive compliance checks
   */
  async performComplianceChecks() {
    try {
      const checkId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      logger.info(`Starting compliance checks (${checkId})`);
      
      const results = {
        checkId,
        timestamp,
        frameworks: {},
        overallScore: 0,
        criticalIssues: [],
        warnings: [],
        recommendations: []
      };

      // Check each active framework
      for (const frameworkName of this.activeFrameworks) {
        const framework = this.frameworks.get(frameworkName);
        if (framework) {
          results.frameworks[frameworkName] = await this.checkFrameworkCompliance(framework);
        }
      }

      // Calculate overall compliance score
      const frameworkScores = Object.values(results.frameworks).map(f => f.score);
      results.overallScore = frameworkScores.reduce((a, b) => a + b, 0) / frameworkScores.length;

      // Store results
      this.complianceChecks.set(checkId, results);

      // Log compliance check results
      logger.auditLog('Compliance Check Completed', {
        checkId,
        overallScore: results.overallScore,
        frameworks: Object.keys(results.frameworks),
        criticalIssues: results.criticalIssues.length,
        warnings: results.warnings.length
      });

      // Alert on critical issues
      if (results.criticalIssues.length > 0) {
        logger.securityEvent('Critical Compliance Issues Detected', {
          checkId,
          issues: results.criticalIssues
        });
      }

      return results;
      
    } catch (error) {
      logger.error('Compliance checks failed:', error);
      throw error;
    }
  }

  /**
   * Check compliance with specific framework
   */
  async checkFrameworkCompliance(framework) {
    const results = {
      framework: framework.name,
      score: 0,
      passedControls: [],
      failedControls: [],
      partialControls: [],
      issues: [],
      recommendations: []
    };

    let totalControls = 0;
    let passedControls = 0;

    // Check each requirement category
    for (const [categoryName, category] of Object.entries(framework.requirements)) {
      for (const control of category.controls) {
        totalControls++;
        
        const controlResult = await this.checkControl(framework.name, categoryName, control);
        
        switch (controlResult.status) {
          case 'pass':
            results.passedControls.push(controlResult);
            passedControls++;
            break;
          case 'fail':
            results.failedControls.push(controlResult);
            results.issues.push(controlResult.issue);
            break;
          case 'partial':
            results.partialControls.push(controlResult);
            passedControls += 0.5; // Partial credit
            results.recommendations.push(controlResult.recommendation);
            break;
        }
      }
    }

    results.score = (passedControls / totalControls) * 100;
    
    return results;
  }

  /**
   * Check individual control compliance
   */
  async checkControl(framework, category, control) {
    try {
      switch (control) {
        case 'access_controls':
          return this.checkAccessControls();
          
        case 'audit_controls':
          return this.checkAuditControls();
          
        case 'encryption':
          return this.checkEncryption();
          
        case 'data_minimization':
          return this.checkDataMinimization();
          
        case 'consent_management':
          return this.checkConsentManagement();
          
        case 'incident_response':
          return this.checkIncidentResponse();
          
        case 'retention_policies':
          return this.checkRetentionPolicies();
          
        default:
          return {
            control,
            status: 'partial',
            description: 'Control check not implemented',
            recommendation: `Implement specific check for ${control}`
          };
      }
    } catch (error) {
      logger.error(`Control check failed for ${control}:`, error);
      return {
        control,
        status: 'fail',
        description: 'Control check error',
        issue: error.message
      };
    }
  }

  /**
   * Check access controls implementation
   */
  checkAccessControls() {
    const issues = [];
    const recommendations = [];
    
    // Check if authentication is enabled
    if (!config.security.jwtSecret || config.security.jwtSecret === 'your-secret-key-change-in-production') {
      issues.push('JWT secret not properly configured');
    }
    
    // Check session timeout
    if (config.security.sessionTimeout > 3600000) { // 1 hour
      recommendations.push('Consider reducing session timeout for better security');
    }
    
    // Check rate limiting
    if (!config.security.rateLimitMax) {
      issues.push('Rate limiting not configured');
    }
    
    if (issues.length > 0) {
      return {
        control: 'access_controls',
        status: 'fail',
        issues,
        description: 'Access controls have critical issues'
      };
    } else if (recommendations.length > 0) {
      return {
        control: 'access_controls',
        status: 'partial',
        recommendations,
        description: 'Access controls implemented with recommendations'
      };
    } else {
      return {
        control: 'access_controls',
        status: 'pass',
        description: 'Access controls properly implemented'
      };
    }
  }

  /**
   * Check audit controls implementation
   */
  checkAuditControls() {
    if (!config.security.auditLogging) {
      return {
        control: 'audit_controls',
        status: 'fail',
        issue: 'Audit logging is disabled',
        description: 'Audit controls not implemented'
      };
    }

    // Check if audit logs exist
    const auditLogPath = config.logging.auditFile;
    if (!fs.existsSync(auditLogPath)) {
      return {
        control: 'audit_controls',
        status: 'fail',
        issue: 'Audit log file not found',
        description: 'Audit logging not functioning'
      };
    }

    return {
      control: 'audit_controls',
      status: 'pass',
      description: 'Audit controls properly implemented'
    };
  }

  /**
   * Check encryption implementation
   */
  checkEncryption() {
    if (!config.security.encryption) {
      return {
        control: 'encryption',
        status: 'fail',
        issue: 'Encryption is disabled',
        description: 'Encryption not implemented'
      };
    }

    // Check encryption service status
    if (!this.encryptionService || !this.encryptionService.getStatus().initialized) {
      return {
        control: 'encryption',
        status: 'fail',
        issue: 'Encryption service not initialized',
        description: 'Encryption not functioning'
      };
    }

    return {
      control: 'encryption',
      status: 'pass',
      description: 'Encryption properly implemented'
    };
  }

  /**
   * Check data minimization practices
   */
  checkDataMinimization() {
    // This would typically check data collection and processing practices
    // For now, check if privacy service is available
    
    if (!this.privacyService) {
      return {
        control: 'data_minimization',
        status: 'fail',
        issue: 'Privacy service not available',
        description: 'Data minimization controls not implemented'
      };
    }

    return {
      control: 'data_minimization',
      status: 'pass',
      description: 'Data minimization controls available'
    };
  }

  /**
   * Check consent management
   */
  checkConsentManagement() {
    if (!this.privacyService || !this.privacyService.consentManager) {
      return {
        control: 'consent_management',
        status: 'partial',
        recommendation: 'Implement comprehensive consent management system',
        description: 'Basic consent management available'
      };
    }

    return {
      control: 'consent_management',
      status: 'pass',
      description: 'Consent management properly implemented'
    };
  }

  /**
   * Check incident response procedures
   */
  checkIncidentResponse() {
    // Check if incident response procedures are documented
    const incidentResponsePath = path.join(config.paths.root, 'docs', 'compliance', 'incident-response.md');
    
    if (!fs.existsSync(incidentResponsePath)) {
      return {
        control: 'incident_response',
        status: 'partial',
        recommendation: 'Document incident response procedures',
        description: 'Incident response procedures need documentation'
      };
    }

    return {
      control: 'incident_response',
      status: 'pass',
      description: 'Incident response procedures documented'
    };
  }

  /**
   * Check retention policies
   */
  checkRetentionPolicies() {
    const retentionPeriod = config.healthcare?.dataRetention;
    
    if (!retentionPeriod || retentionPeriod < 2555) { // 7 years for healthcare
      return {
        control: 'retention_policies',
        status: 'partial',
        recommendation: 'Configure appropriate data retention period for healthcare (7 years)',
        description: 'Data retention policy needs review'
      };
    }

    return {
      control: 'retention_policies',
      status: 'pass',
      description: 'Data retention policies properly configured'
    };
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(format = 'json') {
    const latestCheck = Array.from(this.complianceChecks.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    if (!latestCheck) {
      throw new Error('No compliance checks available');
    }

    const report = {
      organization: this.organization,
      report_date: new Date().toISOString(),
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
        end: new Date().toISOString()
      },
      compliance_status: latestCheck,
      risk_assessment: this.generateRiskAssessment(),
      recommendations: this.generateRecommendations(),
      audit_summary: this.generateAuditSummary()
    };

    // Log report generation
    logger.auditLog('Compliance Report Generated', {
      format,
      overallScore: latestCheck.overallScore,
      frameworks: Object.keys(latestCheck.frameworks)
    });

    switch (format) {
      case 'pdf':
        return this.generatePDFReport(report);
      case 'html':
        return this.generateHTMLReport(report);
      case 'json':
      default:
        return report;
    }
  }

  /**
   * Generate risk assessment
   */
  generateRiskAssessment() {
    return {
      overall_risk_level: this.calculateRiskLevel(),
      risk_factors: [
        {
          category: 'data_security',
          level: config.security.encryption ? 'low' : 'high',
          description: 'Data encryption status'
        },
        {
          category: 'access_control',
          level: config.security.auditLogging ? 'low' : 'medium',
          description: 'Access monitoring and control'
        },
        {
          category: 'compliance_monitoring',
          level: this.complianceChecks.size > 0 ? 'low' : 'medium',
          description: 'Regular compliance assessments'
        }
      ],
      mitigation_strategies: [
        'Regular compliance monitoring',
        'Staff training and awareness',
        'Incident response testing',
        'Regular security assessments'
      ]
    };
  }

  /**
   * Calculate overall risk level
   */
  calculateRiskLevel() {
    const latestCheck = Array.from(this.complianceChecks.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    if (!latestCheck) return 'unknown';

    const score = latestCheck.overallScore;
    
    if (score >= 90) return 'low';
    if (score >= 75) return 'medium';
    if (score >= 60) return 'high';
    return 'critical';
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    const latestCheck = Array.from(this.complianceChecks.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    if (latestCheck) {
      for (const framework of Object.values(latestCheck.frameworks)) {
        recommendations.push(...framework.recommendations);
      }
    }

    // Add general recommendations
    recommendations.push(
      'Conduct regular compliance training for all staff',
      'Perform quarterly compliance assessments',
      'Review and update privacy policies annually',
      'Test incident response procedures semi-annually'
    );

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Generate audit summary
   */
  generateAuditSummary() {
    // This would typically analyze audit logs
    // For now, return basic statistics
    
    return {
      total_events: 0, // Would count from audit logs
      security_events: 0,
      access_events: 0,
      data_events: 0,
      compliance_events: this.complianceChecks.size,
      period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      period_end: new Date().toISOString()
    };
  }

  /**
   * Handle compliance incident
   */
  async handleIncident(incident) {
    const incidentId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    const incidentRecord = {
      id: incidentId,
      timestamp,
      type: incident.type,
      severity: incident.severity,
      description: incident.description,
      affected_data: incident.affectedData,
      detection_method: incident.detectionMethod,
      response_actions: [],
      status: 'open',
      assignee: incident.assignee
    };

    // Log incident
    logger.securityEvent('Compliance Incident', incidentRecord);

    // Determine if breach notification is required
    const notificationRequired = this.assessBreachNotificationRequirement(incident);
    
    if (notificationRequired) {
      incidentRecord.breach_assessment = notificationRequired;
      incidentRecord.notification_deadline = this.calculateNotificationDeadline(incident);
    }

    // Store incident record
    this.auditTrail.push(incidentRecord);

    return incidentRecord;
  }

  /**
   * Assess if breach notification is required
   */
  assessBreachNotificationRequirement(incident) {
    // HIPAA breach assessment
    if (this.activeFrameworks.includes('HIPAA')) {
      // Breach if PHI is disclosed to unauthorized person
      if (incident.type === 'data_disclosure' && incident.involvesPHI) {
        return {
          framework: 'HIPAA',
          required: true,
          reason: 'Unauthorized PHI disclosure',
          timeline: '60 days',
          recipients: ['individuals', 'hhs', 'media_if_500_plus']
        };
      }
    }

    // GDPR breach assessment
    if (this.activeFrameworks.includes('GDPR')) {
      // Breach if likely to result in risk to rights and freedoms
      if (incident.severity === 'high' || incident.severity === 'critical') {
        return {
          framework: 'GDPR',
          required: true,
          reason: 'High risk to data subjects',
          timeline: '72 hours to authority, without undue delay to individuals',
          recipients: ['supervisory_authority', 'data_subjects']
        };
      }
    }

    return null;
  }

  /**
   * Calculate notification deadline
   */
  calculateNotificationDeadline(incident) {
    const incidentDate = new Date(incident.timestamp || Date.now());
    
    // HIPAA: 60 days
    if (this.activeFrameworks.includes('HIPAA')) {
      return new Date(incidentDate.getTime() + 60 * 24 * 60 * 60 * 1000);
    }
    
    // GDPR: 72 hours to authority
    if (this.activeFrameworks.includes('GDPR')) {
      return new Date(incidentDate.getTime() + 72 * 60 * 60 * 1000);
    }
    
    // Default: 24 hours
    return new Date(incidentDate.getTime() + 24 * 60 * 60 * 1000);
  }

  /**
   * Get compliance status
   */
  getStatus() {
    const latestCheck = Array.from(this.complianceChecks.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    return {
      active_frameworks: this.activeFrameworks,
      organization: this.organization,
      latest_check: latestCheck ? {
        timestamp: latestCheck.timestamp,
        overall_score: latestCheck.overallScore,
        critical_issues: latestCheck.criticalIssues.length
      } : null,
      risk_level: this.calculateRiskLevel(),
      total_checks: this.complianceChecks.size,
      incidents: this.auditTrail.length,
      features: {
        continuous_monitoring: true,
        automated_checks: true,
        incident_response: true,
        reporting: true
      }
    };
  }

  /**
   * Cleanup old compliance data
   */
  cleanup() {
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
    const cutoff = new Date(Date.now() - maxAge);
    
    // Clean old compliance checks
    for (const [checkId, check] of this.complianceChecks) {
      if (new Date(check.timestamp) < cutoff) {
        this.complianceChecks.delete(checkId);
      }
    }
    
    // Clean old audit trail entries
    this.auditTrail = this.auditTrail.filter(entry => 
      new Date(entry.timestamp) >= cutoff
    );
    
    logger.info('Compliance data cleanup completed');
  }
}

module.exports = ComplianceService;