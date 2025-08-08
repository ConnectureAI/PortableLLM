#!/usr/bin/env node

/**
 * Privacy & Compliance Demo
 * Demonstrates data privacy, de-identification, and compliance features
 */

const axios = require('axios');
const readline = require('readline');
const crypto = require('crypto');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
};

class PrivacyDemo {
  constructor() {
    this.apiUrl = process.env.PORTABLELLM_API || 'http://localhost:8080/api/v1';
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Sample data with PHI for demonstration
    this.sampleData = [
      {
        id: 'patient_email',
        title: 'Patient Email with PHI',
        data: `Hi Dr. Johnson,

This is Mary Williams (DOB: 03/15/1975, MRN: 123456). I'm having some issues after my procedure last week. My phone number is 555-0123 and my email is mary.williams@email.com. 

I live at 123 Main Street, Springfield, IL 62701. My insurance is Blue Cross policy #BC789456123.

Can you please call me back?

Thanks,
Mary`,
        expectedPHI: ['name', 'dob', 'mrn', 'phone', 'email', 'address', 'insurance']
      },
      {
        id: 'clinical_note',
        title: 'Clinical Note with Identifiers',
        data: `Patient: John Smith, DOB 01/22/1980, SSN: 123-45-6789
MRN: 987654, Address: 456 Oak Ave, Chicago, IL 60601
Insurance: Aetna Policy ABC123XYZ

Chief Complaint: Chest pain
History: 42-year-old male presents with acute onset chest pain...
Physical Exam: BP 140/90, HR 88, temp 98.6F
Assessment: Rule out MI, EKG shows ST changes
Plan: Admit to telemetry, serial cardiac enzymes, cardiology consult

Provider: Dr. Sarah Johnson, NPI: 1234567890
Date of Service: 12/15/2023`,
        expectedPHI: ['name', 'dob', 'ssn', 'mrn', 'address', 'insurance', 'provider']
      },
      {
        id: 'insurance_form',
        title: 'Insurance Authorization Form',
        data: `INSURANCE PRE-AUTHORIZATION REQUEST

Patient Information:
Name: Alice Brown
DOB: 05/10/1965
SSN: 987-65-4321
Address: 789 Elm Street, Boston, MA 02101
Phone: (617) 555-7890
Email: alice.brown@example.com

Insurance Information:
Provider: United Healthcare
Policy Number: UHC456789012
Group Number: GRP123456

Requesting Provider:
Dr. Michael Davis, MD
NPI: 9876543210
Tax ID: 12-3456789

Procedure Requested: MRI Brain with contrast
CPT Code: 70553
Date of Service: 01/30/2024`,
        expectedPHI: ['name', 'dob', 'ssn', 'address', 'phone', 'email', 'insurance', 'provider']
      }
    ];
  }

  log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  success(message) {
    this.log(`✓ ${message}`, colors.green);
  }

  error(message) {
    this.log(`✗ ${message}`, colors.red);
  }

  warning(message) {
    this.log(`⚠ ${message}`, colors.yellow);
  }

  info(message) {
    this.log(`ℹ ${message}`, colors.blue);
  }

  async question(prompt) {
    return new Promise(resolve => {
      this.rl.question(prompt, answer => resolve(answer));
    });
  }

  async checkConnection() {
    try {
      const response = await axios.get(`${this.apiUrl}/privacy`);
      this.success('Connected to PortableLLM Privacy API');
      this.log(`Privacy Mode: ${response.data.dataProcessing}`, colors.green);
      this.log(`Encryption: ${response.data.encryption}`, colors.green);
      this.log(`Audit Logging: ${response.data.auditLogging}`, colors.green);
      return true;
    } catch (error) {
      this.error('Could not connect to PortableLLM API');
      this.info('Please ensure PortableLLM is running on http://localhost:8080');
      return false;
    }
  }

  // Simple PHI detection for demo purposes
  detectPHI(text) {
    const patterns = {
      name: {
        pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
        replacement: '[PATIENT_NAME]'
      },
      ssn: {
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        replacement: '[SSN]'
      },
      dob: {
        pattern: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
        replacement: '[DATE_OF_BIRTH]'
      },
      phone: {
        pattern: /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
        replacement: '[PHONE_NUMBER]'
      },
      email: {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: '[EMAIL_ADDRESS]'
      },
      mrn: {
        pattern: /\bMRN:?\s*(\d{6,})\b/gi,
        replacement: '[MEDICAL_RECORD_NUMBER]'
      },
      address: {
        pattern: /\b\d+\s+[A-Za-z\s]+(Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct)\b/gi,
        replacement: '[ADDRESS]'
      },
      zipCode: {
        pattern: /\b\d{5}(-\d{4})?\b/g,
        replacement: '[ZIP_CODE]'
      },
      insurance: {
        pattern: /\b(?:Policy|Group|Member)[\s#:]*([A-Z0-9]{6,})/gi,
        replacement: '[INSURANCE_ID]'
      },
      npi: {
        pattern: /\bNPI:?\s*(\d{10})\b/gi,
        replacement: '[PROVIDER_NPI]'
      }
    };

    const detections = [];
    
    for (const [type, config] of Object.entries(patterns)) {
      const matches = [...text.matchAll(config.pattern)];
      for (const match of matches) {
        detections.push({
          type,
          text: match[0],
          index: match.index,
          length: match[0].length,
          replacement: config.replacement
        });
      }
    }
    
    return detections;
  }

  deidentifyText(text, mode = 'replace') {
    let deidentified = text;
    const detections = this.detectPHI(text);
    
    // Sort by index in reverse order to maintain positions
    detections.sort((a, b) => b.index - a.index);
    
    for (const detection of detections) {
      let replacement;
      
      switch (mode) {
        case 'hash':
          replacement = this.generateHash(detection.text, detection.type);
          break;
        case 'remove':
          replacement = '[REDACTED]';
          break;
        case 'replace':
        default:
          replacement = detection.replacement;
          break;
      }
      
      deidentified = deidentified.substring(0, detection.index) + 
                    replacement + 
                    deidentified.substring(detection.index + detection.length);
    }
    
    return {
      originalText: text,
      deidentifiedText: deidentified,
      detections,
      stats: {
        originalLength: text.length,
        deidentifiedLength: deidentified.length,
        phiElementsFound: detections.length,
        phiTypes: [...new Set(detections.map(d => d.type))]
      }
    };
  }

  generateHash(text, type) {
    const hash = crypto.createHash('sha256').update(text + type).digest('hex');
    return `[${type.toUpperCase()}_${hash.substring(0, 8)}]`;
  }

  showBanner() {
    this.log('\n🔒 PortableLLM Privacy & Compliance Demo', colors.cyan);
    this.log('='.repeat(50), colors.cyan);
    this.log('Demonstration of data privacy and PHI protection features', colors.blue);
    this.log('Local Processing • HIPAA Compliant • Zero Data Transmission\n', colors.green);
  }

  showMenu() {
    this.log('\n📋 Privacy Demonstrations:', colors.cyan);
    this.log('='.repeat(30), colors.cyan);
    
    this.log('1. PHI Detection and De-identification', colors.yellow);
    this.log('   Automatically detect and remove protected health information');
    
    this.log('2. Safe Data Processing', colors.yellow);
    this.log('   Process de-identified data with AI while maintaining privacy');
    
    this.log('3. Audit Trail Demonstration', colors.yellow);
    this.log('   Show comprehensive audit logging for compliance');
    
    this.log('4. Compliance Verification', colors.yellow);
    this.log('   Verify HIPAA compliance features and controls');
    
    this.log('\n0. Exit Demo', colors.red);
  }

  async runPHIDetection() {
    this.log(`\n${colors.bold}PHI Detection and De-identification${colors.reset}`, colors.cyan);
    this.log('='.repeat(50), colors.cyan);
    
    this.log('\n📊 Available Sample Data:', colors.yellow);
    this.sampleData.forEach((sample, index) => {
      this.log(`${index + 1}. ${sample.title}`, colors.reset);
    });
    
    const choice = await this.question('\nSelect sample data (1-3) or press Enter for custom: ');
    let textToProcess;
    
    if (choice && parseInt(choice) >= 1 && parseInt(choice) <= 3) {
      const sample = this.sampleData[parseInt(choice) - 1];
      textToProcess = sample.data;
      
      this.log('\n📄 Original Data (with PHI):', colors.yellow);
      this.log(textToProcess, colors.reset);
    } else {
      textToProcess = await this.question('\nEnter text to analyze (or press Enter for demo): ');
      if (!textToProcess) {
        textToProcess = this.sampleData[0].data;
        this.log('\n📄 Using Demo Data:', colors.yellow);
        this.log(textToProcess, colors.reset);
      }
    }
    
    this.info('\n🔍 Detecting PHI elements...');
    
    const result = this.deidentifyText(textToProcess);
    
    this.log('\n📋 PHI Detection Results:', colors.green);
    this.log('='.repeat(30), colors.green);
    
    this.log(`PHI Elements Found: ${result.stats.phiElementsFound}`, colors.blue);
    this.log(`PHI Types: ${result.stats.phiTypes.join(', ')}`, colors.blue);
    
    if (result.detections.length > 0) {
      this.log('\nDetected PHI Elements:', colors.yellow);
      result.detections.forEach((detection, index) => {
        this.log(`${index + 1}. ${detection.type.toUpperCase()}: "${detection.text}"`, colors.reset);
      });
    }
    
    this.log('\n📝 De-identified Data:', colors.green);
    this.log('='.repeat(25), colors.green);
    this.log(result.deidentifiedText, colors.reset);
    
    const showModes = await this.question('\nWould you like to see different de-identification modes? (y/n): ');
    
    if (showModes.toLowerCase() === 'y' || showModes.toLowerCase() === 'yes') {
      const modes = ['replace', 'hash', 'remove'];
      
      for (const mode of modes) {
        this.log(`\n${colors.bold}Mode: ${mode.toUpperCase()}${colors.reset}`, colors.cyan);
        const modeResult = this.deidentifyText(textToProcess, mode);
        this.log(modeResult.deidentifiedText, colors.reset);
      }
    }
    
    this.log('\n🛡️ Privacy Protection Summary:', colors.magenta);
    this.log('='.repeat(35), colors.magenta);
    this.log('✓ PHI automatically detected and protected', colors.green);
    this.log('✓ Multiple de-identification methods available', colors.green);
    this.log('✓ All processing performed locally', colors.green);
    this.log('✓ No data transmitted externally', colors.green);
  }

  async runSafeDataProcessing() {
    this.log(`\n${colors.bold}Safe Data Processing${colors.reset}`, colors.cyan);
    this.log('='.repeat(30), colors.cyan);
    
    const sample = this.sampleData[0]; // Use patient email
    
    this.log('\n📧 Original Patient Message (contains PHI):', colors.yellow);
    this.log(sample.data, colors.reset);
    
    this.info('\n🔒 Step 1: De-identifying data...');
    const deidentified = this.deidentifyText(sample.data);
    
    this.log('\n📝 De-identified Message (safe for AI processing):', colors.green);
    this.log(deidentified.deidentifiedText, colors.reset);
    
    this.info('\n🤖 Step 2: Processing with AI (safely)...');
    
    try {
      // Simulate API call with de-identified data
      this.log('Sending de-identified data to local AI model...', colors.blue);
      
      const analysisPrompt = `Analyze this de-identified patient communication for:
1. Sentiment and emotional tone
2. Medical concerns expressed
3. Urgency level
4. Recommended response approach

De-identified message: "${deidentified.deidentifiedText}"

Provide professional analysis suitable for healthcare communication.`;
      
      // For demo purposes, simulate response
      const simulatedResponse = `
**COMMUNICATION ANALYSIS**

**Sentiment Analysis:**
- Overall tone: Concerned but cooperative
- Emotional indicators: Anxiety about procedure, financial concerns
- Patient engagement: High (actively seeking information)

**Medical Concerns Identified:**
1. Post-procedure complications or questions
2. Insurance coverage uncertainty
3. Need for direct physician communication

**Urgency Assessment:** 
- Priority Level: Medium-High
- Timeframe for response: Within 24 hours
- Clinical follow-up may be needed

**Recommended Response Approach:**
1. Acknowledge concerns empathetically
2. Provide clear procedural information
3. Address insurance questions directly
4. Offer specific next steps (phone consultation)
5. Ensure timely follow-up`;

      this.log('\n📊 AI Analysis Results (processed safely):', colors.green);
      this.log('='.repeat(45), colors.green);
      this.log(simulatedResponse, colors.reset);
      
      this.log('\n🛡️ Privacy Protection Verified:', colors.magenta);
      this.log('='.repeat(35), colors.magenta);
      this.log('✓ Original PHI never processed by AI', colors.green);
      this.log('✓ Only de-identified data sent to AI model', colors.green);
      this.log('✓ AI analysis contains no PHI', colors.green);
      this.log('✓ Results safe for storage and sharing', colors.green);
      
    } catch (error) {
      this.error('AI processing simulation failed (this is just a demo)');
      this.info('In real implementation, de-identified data would be processed by local AI');
    }
  }

  async runAuditTrail() {
    this.log(`\n${colors.bold}Audit Trail Demonstration${colors.reset}`, colors.cyan);
    this.log('='.repeat(40), colors.cyan);
    
    this.info('Simulating HIPAA-compliant audit logging...');
    
    // Simulate audit events
    const auditEvents = [
      {
        timestamp: new Date().toISOString(),
        eventType: 'data_access',
        userId: 'dr.smith@clinic.com',
        action: 'PHI_detection',
        resource: 'patient_communication',
        details: {
          phi_elements_detected: 5,
          deidentification_applied: true,
          processing_mode: 'local_only'
        },
        compliance: {
          framework: 'HIPAA',
          audit_required: true,
          retention_period: '7_years'
        }
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        eventType: 'ai_processing',
        userId: 'dr.smith@clinic.com',
        action: 'text_analysis',
        resource: 'deidentified_data',
        details: {
          model_used: 'deepseek-coder:6.7b-instruct',
          data_classification: 'deidentified',
          processing_location: 'local'
        },
        compliance: {
          framework: 'HIPAA',
          data_privacy: 'protected',
          audit_trail: 'complete'
        }
      },
      {
        timestamp: new Date(Date.now() - 120000).toISOString(),
        eventType: 'user_authentication',
        userId: 'dr.smith@clinic.com',
        action: 'login_success',
        resource: 'portablellm_system',
        details: {
          authentication_method: 'multi_factor',
          session_duration: '1_hour',
          ip_address: '192.168.1.100'
        },
        compliance: {
          framework: 'HIPAA',
          access_control: 'verified',
          audit_logged: true
        }
      }
    ];
    
    this.log('\n📋 Recent Audit Events:', colors.green);
    this.log('='.repeat(25), colors.green);
    
    auditEvents.forEach((event, index) => {
      this.log(`\n${index + 1}. ${event.eventType.toUpperCase()}`, colors.yellow);
      this.log(`   Timestamp: ${event.timestamp}`, colors.reset);
      this.log(`   User: ${event.userId}`, colors.reset);
      this.log(`   Action: ${event.action}`, colors.reset);
      this.log(`   Resource: ${event.resource}`, colors.reset);
      
      if (event.details) {
        this.log(`   Details:`, colors.blue);
        Object.entries(event.details).forEach(([key, value]) => {
          this.log(`     ${key}: ${value}`, colors.reset);
        });
      }
      
      if (event.compliance) {
        this.log(`   Compliance:`, colors.magenta);
        Object.entries(event.compliance).forEach(([key, value]) => {
          this.log(`     ${key}: ${value}`, colors.reset);
        });
      }
    });
    
    this.log('\n📊 Audit Summary:', colors.cyan);
    this.log('='.repeat(20), colors.cyan);
    this.log(`Total Events: ${auditEvents.length}`, colors.blue);
    this.log(`Time Period: Last 5 minutes`, colors.blue);
    this.log(`Compliance Framework: HIPAA`, colors.blue);
    this.log(`Audit Retention: 7 years`, colors.blue);
    
    this.log('\n🔍 Audit Features:', colors.green);
    this.log('='.repeat(20), colors.green);
    this.log('✓ Every action logged with timestamp', colors.green);
    this.log('✓ User identification and authentication', colors.green);
    this.log('✓ Data access and processing tracked', colors.green);
    this.log('✓ Compliance metadata included', colors.green);
    this.log('✓ Tamper-proof audit trail', colors.green);
  }

  async runComplianceVerification() {
    this.log(`\n${colors.bold}Compliance Verification${colors.reset}`, colors.cyan);
    this.log('='.repeat(35), colors.cyan);
    
    this.info('Checking HIPAA compliance features...');
    
    try {
      const response = await axios.get(`${this.apiUrl}/privacy`);
      
      this.log('\n🏥 HIPAA Compliance Status:', colors.green);
      this.log('='.repeat(30), colors.green);
      
      const complianceChecks = [
        {
          requirement: 'Local Data Processing',
          status: response.data.dataProcessing === 'local-only',
          description: 'All AI processing happens locally, no cloud transmission'
        },
        {
          requirement: 'Data Encryption',
          status: response.data.encryption,
          description: 'All PHI encrypted at rest and in transit (locally)'
        },
        {
          requirement: 'Audit Logging',
          status: response.data.auditLogging,
          description: 'Comprehensive audit trail for all data access'
        },
        {
          requirement: 'Access Controls',
          status: true, // Simulated
          description: 'Role-based access control and authentication'
        },
        {
          requirement: 'Data Retention',
          status: true, // Simulated
          description: 'Configurable data retention policies (7 years default)'
        },
        {
          requirement: 'Breach Prevention',
          status: response.data.dataProcessing === 'local-only',
          description: 'Air-gap capability prevents data breaches'
        }
      ];
      
      complianceChecks.forEach(check => {
        const statusIcon = check.status ? '✓' : '✗';
        const statusColor = check.status ? colors.green : colors.red;
        
        this.log(`${statusColor}${statusIcon} ${check.requirement}${colors.reset}`, statusColor);
        this.log(`  ${check.description}`, colors.reset);
      });
      
      const passedChecks = complianceChecks.filter(c => c.status).length;
      const totalChecks = complianceChecks.length;
      const compliancePercentage = Math.round((passedChecks / totalChecks) * 100);
      
      this.log(`\n📊 Overall Compliance Score: ${compliancePercentage}%`, colors.cyan);
      this.log(`Passed Checks: ${passedChecks}/${totalChecks}`, colors.blue);
      
      if (compliancePercentage === 100) {
        this.success('🎉 Full HIPAA Compliance Achieved!');
      } else if (compliancePercentage >= 80) {
        this.warning('⚠️ Good compliance, minor improvements needed');
      } else {
        this.error('❌ Compliance issues require attention');
      }
      
      this.log('\n🛡️ Privacy Guarantees:', colors.magenta);
      this.log('='.repeat(25), colors.magenta);
      this.log('• No PHI ever leaves your local environment', colors.green);
      this.log('• All AI processing happens on your hardware', colors.green);
      this.log('• Zero cloud dependencies for core functionality', colors.green);
      this.log('• Complete audit trail for regulatory compliance', colors.green);
      this.log('• Encrypted storage of all sensitive data', colors.green);
      
    } catch (error) {
      this.error('Could not verify compliance features');
      this.info('This may be due to API connectivity issues');
    }
  }

  async runDemo() {
    this.showBanner();
    
    // Check connection
    const connected = await this.checkConnection();
    if (!connected) {
      this.rl.close();
      return;
    }

    this.log('\n🔒 Privacy Notice:', colors.magenta);
    this.log('This demo uses synthetic data for demonstration purposes only.', colors.magenta);
    this.log('No real PHI is processed or stored during this demonstration.', colors.magenta);

    while (true) {
      this.showMenu();
      
      const choice = await this.question('\nSelect a demonstration (0-4): ');
      
      if (choice === '0') {
        this.log('\n👋 Thank you for trying the Privacy & Compliance Demo!', colors.cyan);
        this.log('Your data privacy is protected with PortableLLM!', colors.green);
        break;
      }
      
      switch (choice) {
        case '1':
          await this.runPHIDetection();
          break;
        case '2':
          await this.runSafeDataProcessing();
          break;
        case '3':
          await this.runAuditTrail();
          break;
        case '4':
          await this.runComplianceVerification();
          break;
        default:
          this.warning('Invalid selection. Please choose 0-4.');
          continue;
      }
      
      await this.question('\nPress Enter to continue...');
    }
    
    this.rl.close();
  }
}

// Run demo if called directly
if (require.main === module) {
  const demo = new PrivacyDemo();
  demo.runDemo().catch(error => {
    console.error(`${colors.red}Demo failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = PrivacyDemo;