#!/usr/bin/env node

/**
 * Medical Documentation Demo
 * Interactive demonstration of clinical documentation enhancement workflows
 */

const axios = require('axios');
const readline = require('readline');

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

class MedicalDocumentationDemo {
  constructor() {
    this.apiUrl = process.env.PORTABLELLM_API || 'http://localhost:8080/api/v1';
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.scenarios = [
      {
        id: 'clinical_note_enhancement',
        title: 'Clinical Note Enhancement',
        description: 'Transform brief notes into comprehensive SOAP format',
        rawNote: `45F presents c/o fatigue x 6mo, weight gain 15lbs, cold intolerance. 
FH: thyroid disease (mother). PE: bradycardia 55, dry skin, delayed reflexes. 
Thyroid slightly enlarged. Labs: TSH pending.`
      },
      {
        id: 'differential_diagnosis',
        title: 'Differential Diagnosis Support',
        description: 'Generate differential diagnosis with clinical reasoning',
        clinicalCase: {
          patient: '67M',
          chiefComplaint: 'Chest pain x 2 hours',
          history: 'Crushing substernal pain, radiating to left arm, diaphoresis, nausea',
          physicalExam: 'BP 160/90, HR 95, irregular, S1S2 + S4 gallop, crackles bilateral bases',
          risk_factors: 'HTN, DM, smoking history, family history of MI'
        }
      },
      {
        id: 'patient_education',
        title: 'Patient Education Materials',
        description: 'Generate patient-friendly educational content',
        condition: 'Type 2 Diabetes',
        patientProfile: {
          age: 52,
          education: 'high school',
          concerns: ['diet changes', 'medication side effects', 'complications']
        }
      },
      {
        id: 'quality_metrics',
        title: 'Quality Metrics Documentation',
        description: 'Ensure documentation meets quality indicators',
        scenario: 'Diabetes management visit with HbA1c results'
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
      const response = await axios.get(`${this.apiUrl}/`);
      this.success('Connected to PortableLLM API');
      return true;
    } catch (error) {
      this.error('Could not connect to PortableLLM API');
      this.info('Please ensure PortableLLM is running on http://localhost:8080');
      return false;
    }
  }

  async callLLM(prompt, context = {}) {
    try {
      const response = await axios.post(`${this.apiUrl}/generate`, {
        model: 'llama3.1:8b-instruct',
        prompt,
        options: {
          temperature: 0.3,
          top_p: 0.8,
          stream: false
        },
        ...context
      });
      
      return response.data.response;
    } catch (error) {
      this.error(`API call failed: ${error.message}`);
      throw error;
    }
  }

  showBanner() {
    this.log('\n🏥 PortableLLM Medical Documentation Demo', colors.cyan);
    this.log('='.repeat(55), colors.cyan);
    this.log('Clinical documentation enhancement with AI assistance', colors.blue);
    this.log('Privacy-First • Local Processing • HIPAA Compliant\n', colors.green);
  }

  showMenu() {
    this.log('\n📋 Documentation Scenarios:', colors.cyan);
    this.log('='.repeat(30), colors.cyan);
    
    this.scenarios.forEach((scenario, index) => {
      this.log(`${index + 1}. ${scenario.title}`, colors.yellow);
      this.log(`   ${scenario.description}`, colors.reset);
    });
    
    this.log('\n0. Exit Demo', colors.red);
  }

  async runClinicalNoteEnhancement() {
    const scenario = this.scenarios[0];
    
    this.log(`\n${colors.bold}Scenario: ${scenario.title}${colors.reset}`, colors.cyan);
    this.log('='.repeat(50), colors.cyan);
    
    this.log('\n📝 Raw Clinical Note:', colors.yellow);
    this.log(`"${scenario.rawNote}"`, colors.reset);
    
    this.info('\nEnhancing clinical note with PortableLLM...');
    
    const enhancementPrompt = `Enhance the following clinical note into a comprehensive SOAP format suitable for medical documentation:

Raw Note: "${scenario.rawNote}"

Please provide:

**ENHANCED CLINICAL NOTE**

**PATIENT:** 45-year-old female

**SUBJECTIVE:**
- Chief complaint and history of present illness
- Review of systems (relevant positives and negatives)
- Past medical history, family history, social history

**OBJECTIVE:**
- Vital signs and physical examination findings
- Laboratory and diagnostic test results

**ASSESSMENT:**
- Primary diagnosis with differential considerations
- Clinical reasoning and supporting evidence

**PLAN:**
- Diagnostic workup
- Treatment recommendations  
- Follow-up instructions
- Patient education provided

**ICD-10 CODING SUGGESTIONS:**
- Appropriate diagnostic codes

**QUALITY MEASURES:**
- Clinical quality indicators met
- Documentation completeness score

Ensure the note meets medical documentation standards and includes all relevant clinical information.`;

    try {
      const enhancedNote = await this.callLLM(enhancementPrompt);
      
      this.log('\n📋 Enhanced Clinical Note:', colors.green);
      this.log('='.repeat(35), colors.green);
      console.log(enhancedNote);
      
      const showComparison = await this.question('\nWould you like to see a quality comparison? (y/n): ');
      
      if (showComparison.toLowerCase() === 'y' || showComparison.toLowerCase() === 'yes') {
        this.info('\nAnalyzing documentation quality improvements...');
        
        const comparisonPrompt = `Compare the original note with the enhanced version and provide a quality assessment:

Original: "${scenario.rawNote}"

Enhanced: [The enhanced version generated above]

Provide analysis of:
1. **COMPLETENESS IMPROVEMENT**
   - Elements added to meet documentation standards
   - Missing information that was addressed

2. **CLINICAL QUALITY**
   - Diagnostic accuracy improvements
   - Clinical reasoning enhancement
   - Risk stratification

3. **BILLING AND CODING**
   - ICD-10 coding opportunities
   - Documentation to support appropriate billing levels
   - Quality measure compliance

4. **LEGAL PROTECTION**
   - Medicolegal documentation improvements
   - Risk mitigation through better documentation

5. **EFFICIENCY METRICS**
   - Time saved vs manual documentation
   - Consistency improvements
   - Standardization benefits

Format as a quality improvement report.`;
        
        const comparison = await this.callLLM(comparisonPrompt);
        
        this.log('\n📊 Quality Improvement Analysis:', colors.green);
        this.log('='.repeat(40), colors.green);
        console.log(comparison);
      }
      
    } catch (error) {
      this.error('Failed to enhance clinical note');
    }
  }

  async runDifferentialDiagnosis() {
    const scenario = this.scenarios[1];
    
    this.log(`\n${colors.bold}Scenario: ${scenario.title}${colors.reset}`, colors.cyan);
    this.log('='.repeat(50), colors.cyan);
    
    this.log('\n🩺 Clinical Case:', colors.yellow);
    Object.entries(scenario.clinicalCase).forEach(([key, value]) => {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      this.log(`${label}: ${value}`, colors.reset);
    });
    
    this.info('\nGenerating differential diagnosis with clinical reasoning...');
    
    const diagnosisPrompt = `Based on this clinical presentation, provide a comprehensive differential diagnosis with clinical reasoning:

**PATIENT:** ${scenario.clinicalCase.patient}
**CHIEF COMPLAINT:** ${scenario.clinicalCase.chiefComplaint}
**HISTORY:** ${scenario.clinicalCase.history}
**PHYSICAL EXAM:** ${scenario.clinicalCase.physicalExam}
**RISK FACTORS:** ${scenario.clinicalCase.risk_factors}

Provide:

**DIFFERENTIAL DIAGNOSIS (in order of likelihood):**

**1. MOST LIKELY DIAGNOSIS**
- Diagnosis name
- Supporting evidence from history and physical
- Pathophysiology explanation
- Typical presentation pattern

**2. SECOND MOST LIKELY**
- Diagnosis name
- Clinical reasoning
- Distinguishing features

**3. OTHER CONSIDERATIONS**
- Additional differential diagnoses
- Less likely but important not to miss

**CLINICAL REASONING:**
- Key discriminating features
- Risk stratification
- Red flags present/absent

**RECOMMENDED WORKUP:**
- Immediate diagnostic tests
- Laboratory studies
- Imaging studies
- Specialist consultation needs

**TREATMENT PRIORITIES:**
- Emergency interventions if needed
- Initial management approach
- Monitoring parameters

**PROGNOSIS AND COMPLICATIONS:**
- Expected course
- Potential complications
- Factors affecting prognosis

Ensure clinical accuracy and evidence-based recommendations.`;

    try {
      const diagnosis = await this.callLLM(diagnosisPrompt);
      
      this.log('\n🔍 Differential Diagnosis Analysis:', colors.green);
      this.log('='.repeat(45), colors.green);
      console.log(diagnosis);
      
    } catch (error) {
      this.error('Failed to generate differential diagnosis');
    }
  }

  async runPatientEducation() {
    const scenario = this.scenarios[2];
    
    this.log(`\n${colors.bold}Scenario: ${scenario.title}${colors.reset}`, colors.cyan);
    this.log('='.repeat(50), colors.cyan);
    
    this.log('\n👤 Patient Profile:', colors.yellow);
    this.log(`Condition: ${scenario.condition}`, colors.reset);
    this.log(`Age: ${scenario.patientProfile.age}`, colors.reset);
    this.log(`Education Level: ${scenario.patientProfile.education}`, colors.reset);
    this.log(`Main Concerns: ${scenario.patientProfile.concerns.join(', ')}`, colors.reset);
    
    this.info('\nGenerating personalized patient education materials...');
    
    const educationPrompt = `Create comprehensive patient education materials for ${scenario.condition} tailored to this patient profile:

**PATIENT:** ${scenario.patientProfile.age}-year-old
**EDUCATION LEVEL:** ${scenario.patientProfile.education}
**MAIN CONCERNS:** ${scenario.patientProfile.concerns.join(', ')}

Create patient-friendly educational content:

**UNDERSTANDING YOUR CONDITION**
- What is ${scenario.condition}? (in simple terms)
- Why did this happen to me?
- What does this mean for my health?

**MANAGING YOUR CONDITION**
- Daily management strategies
- Lifestyle changes needed
- Medication information (if applicable)

**ADDRESSING YOUR CONCERNS**
${scenario.patientProfile.concerns.map(concern => `- ${concern.charAt(0).toUpperCase() + concern.slice(1)}`).join('\n')}

**DIET AND LIFESTYLE**
- Specific dietary recommendations
- Exercise guidelines
- Daily routine modifications

**MONITORING YOUR HEALTH**
- What symptoms to watch for
- When to call your doctor
- How to track your progress

**PREVENTING COMPLICATIONS**
- Warning signs to recognize
- Regular screening recommendations
- Long-term health protection

**RESOURCES AND SUPPORT**
- Where to get more information
- Support groups and communities
- Tools and apps that can help

**FREQUENTLY ASKED QUESTIONS**
- Common questions patients ask
- Evidence-based answers

Use language appropriate for ${scenario.patientProfile.education} education level. Be encouraging and practical.`;

    try {
      const education = await this.callLLM(educationPrompt);
      
      this.log('\n📚 Patient Education Materials:', colors.green);
      this.log('='.repeat(40), colors.green);
      console.log(education);
      
      const generateHandout = await this.question('\nWould you like me to create a take-home handout? (y/n): ');
      
      if (generateHandout.toLowerCase() === 'y' || generateHandout.toLowerCase() === 'yes') {
        this.info('\nCreating take-home handout...');
        
        const handoutPrompt = `Create a concise, printer-friendly take-home handout for ${scenario.condition} that includes:

**[PRACTICE NAME] PATIENT EDUCATION**
**${scenario.condition.toUpperCase()} - KEY INFORMATION**

**WHAT YOU NEED TO KNOW:**
- 3-4 most important points about the condition

**DAILY CHECKLIST:**
- Simple daily actions the patient should take

**RED FLAGS - CALL YOUR DOCTOR IF:**
- Warning signs that require immediate medical attention

**YOUR MEDICATIONS:** (if applicable)
- Space for writing medication names and instructions

**YOUR NEXT APPOINTMENTS:**
- Follow-up schedule template

**QUESTIONS FOR YOUR NEXT VISIT:**
- Space for patient to write questions

**EMERGENCY CONTACT:**
- Practice contact information template

Format as a single-page handout that's easy to read and reference.`;
        
        const handout = await this.callLLM(handoutPrompt);
        
        this.log('\n📄 Take-Home Handout:', colors.green);
        this.log('='.repeat(25), colors.green);
        console.log(handout);
      }
      
    } catch (error) {
      this.error('Failed to generate patient education materials');
    }
  }

  async runQualityMetrics() {
    const scenario = this.scenarios[3];
    
    this.log(`\n${colors.bold}Scenario: ${scenario.title}${colors.reset}`, colors.cyan);
    this.log('='.repeat(50), colors.cyan);
    
    this.log('\n📊 Scenario:', colors.yellow);
    this.log(scenario.scenario, colors.reset);
    
    this.info('\nAnalyzing quality metrics and documentation requirements...');
    
    const qualityPrompt = `For a ${scenario.scenario}, provide comprehensive quality metrics documentation:

**QUALITY MEASURES CHECKLIST**

**1. CLINICAL QUALITY MEASURES**
   - Diabetes care quality indicators
   - HbA1c documentation and targets
   - Blood pressure monitoring
   - Lipid management
   - Eye exam recommendations
   - Foot exam documentation

**2. DOCUMENTATION REQUIREMENTS**
   - Required elements for complete documentation
   - ICD-10 coding requirements
   - CPT coding considerations
   - Billing level justification

**3. PATIENT SAFETY INDICATORS**
   - Medication reconciliation
   - Allergy documentation
   - Drug interaction screening
   - Contraindication checks

**4. PREVENTIVE CARE MEASURES**
   - Screening recommendations due
   - Immunization status
   - Health maintenance reminders

**5. PERFORMANCE METRICS**
   - HEDIS measures applicable
   - MIPS quality measures
   - Value-based care indicators

**6. DOCUMENTATION TEMPLATE**
   - Sample note structure that meets all requirements
   - Key phrases for quality measure compliance
   - Documentation shortcuts

**7. COMMON DOCUMENTATION GAPS**
   - Frequently missed elements
   - How to avoid documentation deficiencies
   - Quality improvement opportunities

**8. AUDIT PROTECTION**
   - Legal documentation standards
   - Risk mitigation through proper documentation
   - Compliance requirements

Provide actionable guidance for healthcare providers.`;

    try {
      const qualityAnalysis = await this.callLLM(qualityPrompt);
      
      this.log('\n📋 Quality Metrics Analysis:', colors.green);
      this.log('='.repeat(35), colors.green);
      console.log(qualityAnalysis);
      
      const generateTemplate = await this.question('\nWould you like me to create a documentation template? (y/n): ');
      
      if (generateTemplate.toLowerCase() === 'y' || generateTemplate.toLowerCase() === 'yes') {
        this.info('\nCreating quality-compliant documentation template...');
        
        const templatePrompt = `Create a documentation template for diabetes management visits that ensures all quality measures are met:

Create a structured template that includes:
1. **REQUIRED DATA FIELDS** with prompts
2. **QUALITY MEASURE CHECKPOINTS** 
3. **CLINICAL DECISION SUPPORT** reminders
4. **CODING ASSISTANCE** built-in
5. **PATIENT SAFETY** checks
6. **EFFICIENCY FEATURES** for quick documentation

Format as a practical template that can be used during patient visits.`;
        
        const template = await this.callLLM(templatePrompt);
        
        this.log('\n📋 Documentation Template:', colors.green);
        this.log('='.repeat(30), colors.green);
        console.log(template);
      }
      
    } catch (error) {
      this.error('Failed to generate quality metrics analysis');
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
    this.log('All processing is performed locally. No patient data leaves your system.', colors.magenta);
    this.log('This demo uses de-identified sample cases for demonstration only.', colors.magenta);

    while (true) {
      this.showMenu();
      
      const choice = await this.question('\nSelect a scenario (0-4): ');
      const scenarioIndex = parseInt(choice) - 1;
      
      if (choice === '0') {
        this.log('\n👋 Thank you for trying the Medical Documentation Demo!', colors.cyan);
        this.log('For more information, visit: https://github.com/YourUsername/PortableLLM', colors.blue);
        break;
      }
      
      if (scenarioIndex >= 0 && scenarioIndex < this.scenarios.length) {
        switch (scenarioIndex) {
          case 0:
            await this.runClinicalNoteEnhancement();
            break;
          case 1:
            await this.runDifferentialDiagnosis();
            break;
          case 2:
            await this.runPatientEducation();
            break;
          case 3:
            await this.runQualityMetrics();
            break;
        }
        
        await this.question('\nPress Enter to continue...');
      } else {
        this.warning('Invalid selection. Please choose 0-4.');
      }
    }
    
    this.rl.close();
  }
}

// Run demo if called directly
if (require.main === module) {
  const demo = new MedicalDocumentationDemo();
  demo.runDemo().catch(error => {
    console.error(`${colors.red}Demo failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = MedicalDocumentationDemo;