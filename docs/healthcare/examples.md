# Healthcare Examples and Use Cases

## Table of Contents

- [Real-World Examples](#real-world-examples)
- [Prompt Templates](#prompt-templates)
- [Sample Workflows](#sample-workflows)
- [Integration Examples](#integration-examples)
- [Compliance Examples](#compliance-examples)

## Real-World Examples

### Example 1: Dental Practice Patient Communication

**Scenario**: A dental practice receives various patient communications daily and wants to improve response quality and identify patients who may need additional support.

**Input Example**:
```
Patient Email Subject: Worried about upcoming root canal
Message: "Hi Dr. Smith, I have my root canal scheduled for next Tuesday and I'm really nervous. 
I've been reading online and some people say it's really painful. I also wanted to ask about 
the cost because my insurance said they might not cover all of it. Should I be worried? 
Also, I'm diabetic - does that change anything? Thanks, Sarah"
```

**PortableLLM Analysis**:
```json
{
  "patient_sentiment": {
    "overall": "anxious",
    "confidence": 0.85,
    "emotional_indicators": [
      "really nervous",
      "worried", 
      "should I be worried"
    ]
  },
  "concerns_identified": [
    {
      "category": "medical_anxiety",
      "concern": "Fear of pain during root canal procedure",
      "priority": "high"
    },
    {
      "category": "financial",
      "concern": "Insurance coverage uncertainty",
      "priority": "high"
    },
    {
      "category": "medical_complication",
      "concern": "Diabetes impact on treatment",
      "priority": "medium"
    }
  ],
  "recommended_response_approach": {
    "tone": "empathetic_and_reassuring",
    "structure": [
      "Acknowledge anxiety with empathy",
      "Provide factual pain management information", 
      "Address insurance coverage specifically",
      "Explain diabetes considerations",
      "Offer pre-treatment consultation"
    ]
  },
  "follow_up_actions": [
    "Schedule pre-treatment consultation call",
    "Verify insurance coverage details",
    "Review diabetic patient protocols",
    "Prepare patient education materials"
  ]
}
```

**Generated Response Template**:
```
Subject: Re: Worried about upcoming root canal - Let's address your concerns

Dear Sarah,

Thank you for reaching out with your concerns about Tuesday's root canal procedure. 
It's completely normal to feel nervous, and I appreciate you sharing your worries so 
we can address them properly.

Pain Management:
Modern root canal procedures are much more comfortable than you might expect. We use:
- Local anesthetic to ensure you feel no pain during the procedure
- Advanced techniques that minimize discomfort
- Post-treatment pain medication recommendations
Most patients report the procedure feels similar to having a large filling placed.

Insurance Coverage:
I understand your concern about costs. Let me have our insurance coordinator:
- Call your insurance company to verify exact coverage
- Provide you with a detailed cost breakdown before Tuesday
- Discuss payment plan options if needed
We'll ensure you have complete financial clarity before proceeding.

Diabetes Considerations:
Your diabetes requires some additional precautions, but doesn't prevent treatment:
- Please maintain normal blood sugar levels before your appointment
- Take your regular medications as prescribed
- We may prescribe antibiotics as a precaution
- We'll monitor your healing more closely than usual

Next Steps:
I'd like to offer you a brief consultation call before Tuesday to:
- Walk through the procedure step-by-step
- Answer any remaining questions
- Ensure you feel confident and prepared

Please call our office at (555) 123-4567 to schedule a 15-minute consultation call 
at your convenience.

You're in good hands, Sarah. We've successfully performed hundreds of root canals, 
and we'll take excellent care of you.

Best regards,
Dr. Smith
```

### Example 2: Medical Practice Clinical Documentation

**Scenario**: A family medicine practice wants to improve clinical note quality and ensure comprehensive documentation.

**Input Example**:
```
Patient: 67M, c/o SOB x3 weeks, worse with exertion. 
Hx: HTN, DM2, former smoker (quit 2y ago, 40 pack-years). 
PE: RR 22, sat 94% RA, bilateral crackles, JVD, pedal edema.
EKG: afib RVR. BNP pending.
```

**Enhanced Clinical Note**:
```
PATIENT: 67-year-old male

CHIEF COMPLAINT: 
Shortness of breath for 3 weeks

HISTORY OF PRESENT ILLNESS:
The patient presents with a 3-week history of progressive dyspnea, particularly with exertion. 
The symptom has been gradually worsening and now affects his ability to perform activities 
of daily living.

Associated symptoms to assess:
- Orthopnea (sleeping with elevated head)
- Paroxysmal nocturnal dyspnea
- Chest pain or pressure
- Palpitations
- Recent weight gain
- Lower extremity swelling

PAST MEDICAL HISTORY:
- Hypertension (duration, control status, current medications)
- Type 2 Diabetes Mellitus (duration, HbA1c, complications)
- Former tobacco use: 40 pack-year history, quit 2 years ago

PHYSICAL EXAMINATION:
Vital Signs:
- Respiratory rate: 22/min (elevated, normal 12-20)
- Oxygen saturation: 94% on room air (mildly decreased)
- Blood pressure: [obtain and document]
- Heart rate: [obtain and document - likely elevated given afib RVR]

Cardiovascular:
- Jugular venous distention present (suggests right heart failure)
- Heart rhythm: Irregular (atrial fibrillation with rapid ventricular response)

Pulmonary:
- Bilateral crackles (suggests pulmonary edema)

Extremities:
- Bilateral pedal edema (suggests fluid retention)

DIAGNOSTIC STUDIES:
- ECG: Atrial fibrillation with rapid ventricular response
- BNP: Pending (expect elevation if heart failure)

ASSESSMENT AND PLAN:

Primary Diagnosis: Acute on chronic systolic heart failure with atrial fibrillation
- Clinical presentation consistent with decompensated heart failure
- New atrial fibrillation requiring rate and rhythm management
- Risk factors: HTN, DM, tobacco history

Differential Diagnoses:
1. Heart failure with preserved ejection fraction
2. Pulmonary embolism (consider in setting of afib)
3. Pneumonia with secondary cardiac stress

PLAN:
1. Heart Failure Management:
   - Obtain echocardiogram to assess left ventricular function
   - Chest X-ray to assess pulmonary edema
   - Complete metabolic panel, troponin
   - Daily weights, strict I/O monitoring
   - Diuretic therapy (furosemide 40mg IV/PO)

2. Atrial Fibrillation Management:
   - Rate control with metoprolol (if not contraindicated)
   - Anticoagulation assessment (CHA2DS2-VASc score = 4, recommend anticoagulation)
   - Consider cardiology consultation

3. Monitoring:
   - Telemetry monitoring
   - Follow BNP result
   - Reassess in 24-48 hours

ICD-10 Codes:
- I50.9 Heart failure, unspecified
- I48.91 Unspecified atrial fibrillation
- I11.0 Hypertensive heart disease with heart failure

Follow-up:
- Cardiology referral within 1-2 weeks
- Primary care follow-up in 1 week
- Patient education on heart failure management provided
```

## Prompt Templates

### 1. Patient Communication Analysis

```
TEMPLATE: Patient Communication Analysis

Context: {practice_type} practice
Task: Analyze patient communication for sentiment, concerns, and response strategy
Input: {patient_message}

Analysis Framework:
1. Sentiment Analysis:
   - Overall emotional tone (positive/neutral/negative)
   - Specific emotional indicators
   - Urgency level (low/medium/high)

2. Concern Identification:
   - Medical concerns
   - Financial concerns  
   - Procedural concerns
   - Communication needs

3. Response Strategy:
   - Recommended tone and approach
   - Key points to address
   - Follow-up actions needed
   - Priority level for response

Output Format: Structured JSON with specific recommendations

Compliance Notes: 
- Maintain patient confidentiality
- Follow professional communication standards
- Document analysis for quality improvement
```

### 2. Clinical Note Enhancement

```
TEMPLATE: Clinical Note Enhancement

Context: {specialty} practice clinical documentation
Task: Enhance clinical note for completeness, clarity, and coding accuracy
Input: {raw_clinical_note}

Enhancement Areas:
1. SOAP Format Standardization:
   - Subjective: Complete history taking
   - Objective: Comprehensive examination findings
   - Assessment: Differential diagnosis and clinical reasoning
   - Plan: Evidence-based treatment approach

2. Documentation Completeness:
   - Missing elements identification
   - Clinical decision-making rationale
   - Risk factors and contraindications
   - Patient education provided

3. Quality Measures:
   - ICD-10 coding suggestions
   - Clinical quality indicators
   - Billing optimization opportunities
   - Legal defensibility

Output Format: Enhanced structured clinical note

Professional Standards:
- Maintain medical accuracy
- Follow specialty guidelines
- Ensure regulatory compliance
- Support clinical decision-making
```

### 3. Treatment Plan Communication

```
TEMPLATE: Treatment Plan Patient Communication

Context: {treatment_type} for {patient_demographics}
Task: Create patient-friendly treatment explanation
Input: {clinical_treatment_plan}

Communication Elements:
1. Plain Language Explanation:
   - Medical terms in simple language
   - Visual aids or analogies when helpful
   - Step-by-step process overview

2. Benefits and Risks:
   - Why treatment is necessary
   - Expected outcomes
   - Potential complications or side effects
   - Alternative options

3. Practical Information:
   - Timeline and scheduling
   - Cost breakdown and insurance
   - Pre/post-treatment instructions
   - When to seek help

4. Patient Engagement:
   - Questions to ask at next visit
   - How to prepare for treatment
   - Lifestyle modifications needed
   - Support resources available

Output Format: Patient education document

Quality Standards:
- Age and education appropriate language
- Culturally sensitive communication
- Actionable information
- Professional medical accuracy
```

## Sample Workflows

### Workflow 1: Daily Patient Communication Review

**Morning Communication Review Process**:

```python
# Pseudo-code for daily workflow
def daily_communication_review():
    # Step 1: Collect overnight communications
    emails = get_patient_emails(since="last_review")
    messages = get_patient_portal_messages(since="last_review")
    
    # Step 2: Analyze each communication
    for communication in emails + messages:
        analysis = portablellm.analyze_communication(
            text=communication.content,
            context="dental_practice",
            priority_flags=["emergency", "pain", "anxiety", "financial"]
        )
        
        # Step 3: Prioritize responses
        if analysis.urgency == "high":
            add_to_priority_queue(communication, analysis)
        elif analysis.sentiment == "negative":
            add_to_attention_queue(communication, analysis)
        else:
            add_to_standard_queue(communication, analysis)
    
    # Step 4: Generate response templates
    for item in priority_queue:
        response_template = portablellm.generate_response(
            original=item.communication,
            analysis=item.analysis,
            tone="empathetic_professional",
            include=["acknowledgment", "solution", "next_steps"]
        )
        item.suggested_response = response_template
    
    return prioritized_communications_with_responses
```

### Workflow 2: Clinical Note Quality Improvement

**End-of-Day Documentation Review**:

```python
def clinical_note_review():
    # Step 1: Get today's clinical notes
    notes = get_clinical_notes(date="today", status="draft")
    
    # Step 2: Enhance each note
    for note in notes:
        enhanced_note = portablellm.enhance_clinical_note(
            original=note.content,
            specialty="family_medicine",
            requirements=["soap_format", "icd10_codes", "quality_measures"]
        )
        
        # Step 3: Quality check
        quality_score = assess_note_quality(enhanced_note)
        
        if quality_score < 0.8:
            flag_for_physician_review(note, enhanced_note)
        else:
            suggest_enhancements(note, enhanced_note)
    
    # Step 4: Generate quality metrics
    quality_report = generate_quality_report(notes)
    return enhanced_notes, quality_report
```

### Workflow 3: Patient Education Material Generation

**Treatment-Specific Education**:

```python
def generate_patient_education():
    # Step 1: Identify treatments scheduled
    upcoming_treatments = get_scheduled_treatments(timeframe="next_week")
    
    # Step 2: Generate personalized materials
    for treatment in upcoming_treatments:
        patient_profile = get_patient_profile(treatment.patient_id)
        
        education_material = portablellm.create_education_material(
            treatment_type=treatment.procedure,
            patient_age=patient_profile.age,
            medical_history=patient_profile.relevant_history,
            language_level=patient_profile.preferred_language,
            concerns=patient_profile.expressed_concerns
        )
        
        # Step 3: Customize for delivery method
        formats = create_multiple_formats(
            content=education_material,
            formats=["printable_pdf", "email_friendly", "verbal_talking_points"]
        )
        
        # Step 4: Schedule delivery
        schedule_education_delivery(
            patient=treatment.patient_id,
            materials=formats,
            delivery_date=treatment.date - timedelta(days=2)
        )
    
    return education_materials
```

## Integration Examples

### EMR Integration Example

**Integration with Electronic Medical Records**:

```javascript
// Example API integration with EMR system
class PortableLLMEMRIntegration {
    constructor(emrSystem, portablellmAPI) {
        this.emr = emrSystem;
        this.llm = portablellmAPI;
    }

    async enhanceAllClinicalNotes() {
        // Get today's notes from EMR
        const notes = await this.emr.getClinicalNotes({
            date: new Date(),
            status: 'draft'
        });

        // Enhance each note with PortableLLM
        for (const note of notes) {
            const enhancement = await this.llm.enhanceNote({
                content: note.content,
                specialty: note.specialty,
                template: 'soap_format'
            });

            // Update EMR with enhanced note
            await this.emr.updateNote(note.id, {
                enhanced_content: enhancement.enhanced_note,
                quality_score: enhancement.quality_metrics,
                suggestions: enhancement.recommendations
            });
        }
    }

    async generatePatientSummary(patientId) {
        // Get patient data from EMR
        const patientData = await this.emr.getPatientData(patientId);
        
        // Generate summary with PortableLLM
        const summary = await this.llm.generateSummary({
            patient_history: patientData.history,
            recent_visits: patientData.recentVisits,
            current_medications: patientData.medications,
            format: 'physician_handoff'
        });

        return summary;
    }
}
```

### Practice Management Integration

**Integration with Practice Management Systems**:

```python
class PracticeManagementIntegration:
    def __init__(self, pm_system, portablellm):
        self.pm = pm_system
        self.llm = portablellm

    def analyze_patient_communications(self):
        """Analyze all patient communications from PM system"""
        
        # Get communications from PM system
        communications = self.pm.get_patient_communications(
            types=['email', 'portal_message', 'phone_note'],
            since=datetime.now() - timedelta(days=1)
        )
        
        analyzed_communications = []
        
        for comm in communications:
            # Analyze with PortableLLM
            analysis = self.llm.analyze_communication(
                content=comm.content,
                context={
                    'practice_type': 'dental',
                    'patient_history': comm.patient_history,
                    'communication_type': comm.type
                }
            )
            
            # Update PM system with analysis
            self.pm.update_communication(comm.id, {
                'sentiment': analysis.sentiment,
                'priority': analysis.priority,
                'concerns': analysis.concerns,
                'suggested_response': analysis.response_template
            })
            
            analyzed_communications.append({
                'communication': comm,
                'analysis': analysis
            })
        
        return analyzed_communications

    def generate_treatment_explanations(self, appointment_id):
        """Generate patient-friendly treatment explanations"""
        
        appointment = self.pm.get_appointment(appointment_id)
        patient = self.pm.get_patient(appointment.patient_id)
        
        explanation = self.llm.generate_treatment_explanation(
            treatment=appointment.planned_procedures,
            patient_profile={
                'age': patient.age,
                'education_level': patient.education_level,
                'primary_language': patient.language,
                'anxiety_level': patient.anxiety_indicators
            },
            insurance_info=appointment.insurance_details
        )
        
        # Save explanation to PM system
        self.pm.save_patient_document(
            patient_id=patient.id,
            document_type='treatment_explanation',
            content=explanation
        )
        
        return explanation
```

## Compliance Examples

### HIPAA Audit Trail Example

```python
class HIPAAAuditLogger:
    def __init__(self, portablellm_api):
        self.llm = portablellm_api
        self.audit_logger = self.setup_audit_logging()

    def log_phi_access(self, user_id, action, data_type, record_count):
        """Log PHI access for HIPAA compliance"""
        
        audit_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'action': action,
            'data_type': data_type,
            'record_count': record_count,
            'system': 'PortableLLM',
            'compliance_framework': 'HIPAA',
            'retention_period': '7_years',
            'encrypted': True
        }
        
        # Log to secure audit trail
        self.audit_logger.info(json.dumps(audit_entry))
        
        # Also store in compliance database
        self.store_audit_entry(audit_entry)

    def generate_compliance_report(self, start_date, end_date):
        """Generate HIPAA compliance report"""
        
        audit_entries = self.get_audit_entries(start_date, end_date)
        
        report = self.llm.generate_compliance_report(
            audit_data=audit_entries,
            framework='HIPAA',
            report_type='monthly_summary',
            include_metrics=[
                'user_access_patterns',
                'data_access_frequency',
                'security_events',
                'training_compliance'
            ]
        )
        
        return report

# Usage example
audit_logger = HIPAAAuditLogger(portablellm_api)

# Log when user accesses patient data for analysis
audit_logger.log_phi_access(
    user_id='dr.smith@clinic.com',
    action='analyze_patient_communication',
    data_type='patient_email',
    record_count=1
)
```

### De-identification Example

```python
def safe_data_processing_example():
    """Example of safe PHI handling with de-identification"""
    
    # Original patient communication (contains PHI)
    original_message = """
    Hi Dr. Johnson,
    This is Mary Williams (DOB: 03/15/1975, MRN: 123456). 
    I'm having pain in my tooth after the filling you did last Tuesday.
    My phone number is 555-0123. Can you call me back?
    """
    
    # De-identify before processing
    de_identified_message = de_identify_text(original_message)
    # Result: "Hi Dr. [PROVIDER], This is [PATIENT] (DOB: [DATE], MRN: [ID]). 
    # I'm having pain in my tooth after the filling you did last [DATE].
    # My phone number is [PHONE]. Can you call me back?"
    
    # Process de-identified data with PortableLLM
    analysis = portablellm.analyze_communication(
        content=de_identified_message,
        context='dental_practice_followup',
        focus_areas=['symptom_identification', 'urgency_assessment']
    )
    
    # Analysis results don't contain PHI
    return {
        'sentiment': analysis.sentiment,
        'urgency': analysis.urgency,
        'symptoms_reported': analysis.symptoms,
        'recommended_action': analysis.next_steps,
        'phi_detected': False  # Confirmed safe for storage/sharing
    }
```

---

These examples demonstrate how PortableLLM can be safely and effectively integrated into healthcare workflows while maintaining the highest standards of privacy and compliance. All examples prioritize local data processing and include appropriate safeguards for handling protected health information.

For additional examples or specific use case assistance, please contact our healthcare solutions team at healthcare@portablellm.com.