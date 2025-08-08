#!/usr/bin/env node

/**
 * Dental Practice Demo
 * Interactive demonstration of PortableLLM for dental healthcare workflows
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

class DentalPracticeDemo {
  constructor() {
    this.apiUrl = process.env.PORTABLELLM_API || 'http://localhost:8080/api/v1';
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.scenarios = [
      {
        id: 'patient_anxiety',
        title: 'Anxious Patient Communication',
        description: 'Analyzing and responding to patient anxiety about procedures',
        patientMessage: `Hi Dr. Smith, I have my root canal scheduled for next Tuesday and I'm really nervous. 
I've been reading online and some people say it's really painful. I also wanted to ask about 
the cost because my insurance said they might not cover all of it. Should I be worried? 
Also, I'm diabetic - does that change anything? Thanks, Sarah`
      },
      {
        id: 'treatment_planning',
        title: 'Treatment Plan Explanation',
        description: 'Generate patient-friendly treatment explanations',
        treatmentInfo: {
          procedure: 'Root canal therapy on tooth #19, followed by crown placement',
          patientConditions: 'Diabetes, mild heart condition',
          insurance: 'Covers 80% major procedures',
          estimatedCost: '$2200 total'
        }
      },
      {
        id: 'insurance_documentation',
        title: 'Insurance Pre-Authorization',
        description: 'Generate insurance documentation for treatments',
        procedure: {
          codes: 'D3330 (Root canal), D2740 (Crown)',
          findings: 'Pulpal necrosis, periapical radiolucency',
          necessity: 'Save natural tooth, eliminate infection'
        }
      },
      {
        id: 'practice_analytics',
        title: 'Practice Communication Analysis',
        description: 'Analyze patient feedback patterns for practice improvement',
        feedback: [
          'The staff was very friendly but the wait time was too long',
          'Dr. Johnson explained everything clearly, very satisfied',
          'Appointment scheduling could be improved',
          'Great experience overall, would recommend',
          'Billing process was confusing'
        ]
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
        model: 'deepseek-coder:6.7b-instruct',
        prompt,
        options: {
          temperature: 0.4,
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
    this.log('\n🦷 PortableLLM Dental Practice Demo', colors.cyan);
    this.log('='.repeat(50), colors.cyan);
    this.log('Interactive demonstration of AI-powered healthcare workflows', colors.blue);
    this.log('Privacy-First • Local Processing • HIPAA Compliant\n', colors.green);
  }

  showMenu() {
    this.log('\n📋 Available Scenarios:', colors.cyan);
    this.log('='.repeat(30), colors.cyan);
    
    this.scenarios.forEach((scenario, index) => {
      this.log(`${index + 1}. ${scenario.title}`, colors.yellow);
      this.log(`   ${scenario.description}`, colors.reset);
    });
    
    this.log('\n0. Exit Demo', colors.red);
  }

  async runScenario1() {
    const scenario = this.scenarios[0];
    
    this.log(`\n${colors.bold}Scenario: ${scenario.title}${colors.reset}`, colors.cyan);
    this.log('='.repeat(50), colors.cyan);
    
    this.log('\n📧 Patient Email:', colors.yellow);
    this.log(`"${scenario.patientMessage}"`, colors.reset);
    
    this.info('\nAnalyzing patient communication with PortableLLM...');
    
    const analysisPrompt = `Analyze the following patient communication for a dental practice:

Patient Message: "${scenario.patientMessage}"

Please provide a structured analysis including:
1. Overall sentiment (positive/neutral/negative/anxious)
2. Specific concerns identified
3. Recommended response approach
4. Priority level for follow-up
5. Key points to address in response

Focus on healthcare communication best practices and patient care.`;

    try {
      const analysis = await this.callLLM(analysisPrompt);
      
      this.log('\n🔍 AI Analysis Results:', colors.green);
      this.log('='.repeat(30), colors.green);
      console.log(analysis);
      
      const generateResponse = await this.question('\nWould you like me to generate a response template? (y/n): ');
      
      if (generateResponse.toLowerCase() === 'y' || generateResponse.toLowerCase() === 'yes') {
        this.info('\nGenerating professional response...');
        
        const responsePrompt = `Based on this patient communication analysis, generate a professional, empathetic email response from Dr. Smith addressing all the patient's concerns:

Patient Concerns:
- Anxiety about root canal pain
- Insurance coverage questions  
- Diabetes considerations

Generate a caring, informative response that:
1. Acknowledges the patient's anxiety empathetically
2. Provides factual information about modern root canal procedures
3. Addresses insurance coverage specifically
4. Explains diabetes considerations for the procedure
5. Offers additional support (pre-treatment consultation)
6. Uses professional but warm tone

Format as a complete email response.`;
        
        const response = await this.callLLM(responsePrompt);
        
        this.log('\n📝 Generated Response:', colors.green);
        this.log('='.repeat(30), colors.green);
        console.log(response);
      }
      
    } catch (error) {
      this.error('Failed to complete analysis');
    }
  }

  async runScenario2() {
    const scenario = this.scenarios[1];
    
    this.log(`\n${colors.bold}Scenario: ${scenario.title}${colors.reset}`, colors.cyan);
    this.log('='.repeat(50), colors.cyan);
    
    this.log('\n🏥 Treatment Information:', colors.yellow);
    Object.entries(scenario.treatmentInfo).forEach(([key, value]) => {
      this.log(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`, colors.reset);
    });
    
    this.info('\nGenerating patient-friendly treatment explanation...');
    
    const explanationPrompt = `Create a patient-friendly treatment explanation for:

Procedure: ${scenario.treatmentInfo.procedure}
Patient Conditions: ${scenario.treatmentInfo.patientConditions}  
Insurance Coverage: ${scenario.treatmentInfo.insurance}
Estimated Cost: ${scenario.treatmentInfo.estimatedCost}

Generate a clear, comprehensive explanation that includes:

1. TREATMENT OVERVIEW
   - What the procedure involves in simple terms
   - Why this treatment is necessary
   - Expected outcomes

2. STEP-BY-STEP PROCESS
   - Timeline and appointment schedule
   - What happens at each visit
   - Recovery expectations

3. SPECIAL CONSIDERATIONS
   - How diabetes affects treatment
   - Pre-treatment preparations
   - Post-treatment care

4. FINANCIAL INFORMATION  
   - Cost breakdown with insurance
   - Payment options available
   - What insurance covers

5. PATIENT PREPARATION
   - What to expect
   - Questions to ask
   - How to prepare

Use clear, non-medical language that a patient can easily understand.`;

    try {
      const explanation = await this.callLLM(explanationPrompt);
      
      this.log('\n📋 Patient Treatment Explanation:', colors.green);
      this.log('='.repeat(40), colors.green);
      console.log(explanation);
      
    } catch (error) {
      this.error('Failed to generate treatment explanation');
    }
  }

  async runScenario3() {
    const scenario = this.scenarios[2];
    
    this.log(`\n${colors.bold}Scenario: ${scenario.title}${colors.reset}`, colors.cyan);
    this.log('='.repeat(50), colors.cyan);
    
    this.log('\n📄 Procedure Information:', colors.yellow);
    Object.entries(scenario.procedure).forEach(([key, value]) => {
      this.log(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`, colors.reset);
    });
    
    this.info('\nGenerating insurance pre-authorization documentation...');
    
    const documentationPrompt = `Generate comprehensive insurance pre-authorization documentation for:

Procedure Codes: ${scenario.procedure.codes}
Clinical Findings: ${scenario.procedure.findings}
Medical Necessity: ${scenario.procedure.necessity}

Create professional insurance documentation including:

1. PRE-AUTHORIZATION LETTER
   - Formal request to insurance company
   - Patient and provider information
   - Clear medical necessity justification

2. CLINICAL DOCUMENTATION
   - Detailed findings and diagnosis
   - Treatment rationale
   - Expected outcomes

3. SUPPORTING EVIDENCE
   - Radiographic findings
   - Clinical examination results  
   - Alternative treatment considerations

4. PROCEDURAL DETAILS
   - Specific codes and descriptions
   - Timeline and follow-up care
   - Cost-effectiveness rationale

Format as professional medical documentation suitable for insurance review.`;

    try {
      const documentation = await this.callLLM(documentationPrompt);
      
      this.log('\n📋 Insurance Documentation:', colors.green);
      this.log('='.repeat(35), colors.green);
      console.log(documentation);
      
    } catch (error) {
      this.error('Failed to generate insurance documentation');
    }
  }

  async runScenario4() {
    const scenario = this.scenarios[3];
    
    this.log(`\n${colors.bold}Scenario: ${scenario.title}${colors.reset}`, colors.cyan);
    this.log('='.repeat(50), colors.cyan);
    
    this.log('\n📊 Patient Feedback Sample:', colors.yellow);
    scenario.feedback.forEach((comment, index) => {
      this.log(`${index + 1}. "${comment}"`, colors.reset);
    });
    
    this.info('\nAnalyzing practice communication patterns...');
    
    const analysisPrompt = `Analyze the following patient feedback for a dental practice to identify patterns and improvement opportunities:

Patient Feedback:
${scenario.feedback.map((comment, index) => `${index + 1}. "${comment}"`).join('\n')}

Provide a comprehensive analysis including:

1. SENTIMENT ANALYSIS
   - Overall satisfaction levels
   - Positive vs negative feedback breakdown
   - Common emotional themes

2. KEY THEMES IDENTIFIED
   - Most frequently mentioned topics
   - Recurring issues or concerns
   - Areas of praise

3. OPERATIONAL INSIGHTS
   - Wait time issues
   - Staff performance feedback
   - Process improvement opportunities

4. RECOMMENDATIONS
   - Immediate actions to address concerns
   - Long-term improvements  
   - Staff training opportunities

5. PRIORITY AREAS
   - Critical issues requiring immediate attention
   - Medium-term improvements
   - Areas of strength to maintain

Format as a practice management report with actionable insights.`;

    try {
      const analysis = await this.callLLM(analysisPrompt);
      
      this.log('\n📈 Practice Analysis Report:', colors.green);
      this.log('='.repeat(35), colors.green);
      console.log(analysis);
      
      const generateAction = await this.question('\nWould you like me to generate an action plan? (y/n): ');
      
      if (generateAction.toLowerCase() === 'y' || generateAction.toLowerCase() === 'yes') {
        this.info('\nGenerating action plan...');
        
        const actionPrompt = `Based on the patient feedback analysis, create a specific 30-day action plan for practice improvement:

Create an actionable plan with:
1. Week 1 priorities (immediate fixes)
2. Week 2-3 implementations (process improvements)  
3. Week 4 evaluation and training
4. Specific assignments for staff roles
5. Measurable success metrics
6. Follow-up procedures

Format as a practical implementation guide for practice management.`;
        
        const actionPlan = await this.callLLM(actionPrompt);
        
        this.log('\n📅 30-Day Action Plan:', colors.green);
        this.log('='.repeat(25), colors.green);
        console.log(actionPlan);
      }
      
    } catch (error) {
      this.error('Failed to complete practice analysis');
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

    while (true) {
      this.showMenu();
      
      const choice = await this.question('\nSelect a scenario (0-4): ');
      const scenarioIndex = parseInt(choice) - 1;
      
      if (choice === '0') {
        this.log('\n👋 Thank you for trying the PortableLLM Dental Practice Demo!', colors.cyan);
        this.log('For more information, visit: https://github.com/YourUsername/PortableLLM', colors.blue);
        break;
      }
      
      if (scenarioIndex >= 0 && scenarioIndex < this.scenarios.length) {
        switch (scenarioIndex) {
          case 0:
            await this.runScenario1();
            break;
          case 1:
            await this.runScenario2();
            break;
          case 2:
            await this.runScenario3();
            break;
          case 3:
            await this.runScenario4();
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
  const demo = new DentalPracticeDemo();
  demo.runDemo().catch(error => {
    console.error(`${colors.red}Demo failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = DentalPracticeDemo;