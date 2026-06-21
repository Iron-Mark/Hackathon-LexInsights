-- =====================================================
-- INSERT MOCK DATA FOR TESTING
-- User: kenpatrickgarcia123@gmail.com
-- =====================================================

-- IMPORTANT: Run this AFTER you've signed up with kenpatrickgarcia123@gmail.com
-- This script will fail if the user doesn't exist yet

-- =====================================================
-- STEP 1: Get your user ID
-- =====================================================
-- First, sign up in the app with kenpatrickgarcia123@gmail.com
-- Then run this query to get your user ID:

SELECT id, email FROM auth.users WHERE email = 'kenpatrickgarcia123@gmail.com';

-- Copy the UUID from the result and replace 'YOUR_USER_ID_HERE' below

-- =====================================================
-- STEP 2: Insert Mock Chats
-- =====================================================

-- Replace YOUR_USER_ID_HERE with the actual UUID from Step 1
DO $$
DECLARE
  v_user_id UUID;
  v_chat_1 UUID := '550e8400-e29b-41d4-a716-446655440001';
  v_chat_2 UUID := '550e8400-e29b-41d4-a716-446655440002';
  v_chat_3 UUID := '550e8400-e29b-41d4-a716-446655440003';
  v_chat_4 UUID := '550e8400-e29b-41d4-a716-446655440004';
  v_chat_5 UUID := '550e8400-e29b-41d4-a716-446655440005';
  v_chat_6 UUID := '550e8400-e29b-41d4-a716-446655440006';
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'kenpatrickgarcia123@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Please sign up first with kenpatrickgarcia123@gmail.com';
  END IF;

  -- Insert Chats
  INSERT INTO public.chats (id, user_id, title, mode, created_at, updated_at) VALUES
  (v_chat_1, v_user_id, 'Barangay Disaster Preparedness Plan', 'general', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
  (v_chat_2, v_user_id, 'Waste Management Compliance', 'compliance', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  (v_chat_3, v_user_id, 'Flood Control Project Permits', 'general', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  (v_chat_4, v_user_id, 'Employee Data Privacy Compliance', 'compliance', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  (v_chat_5, v_user_id, 'Environmental Compliance Certificate', 'general', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
  (v_chat_6, v_user_id, 'Workplace Safety Requirements', 'general', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days')
  ON CONFLICT (id) DO NOTHING;

  -- =====================================================
  -- Insert Messages for Chat 1: Barangay Disaster Preparedness Plan
  -- =====================================================
  INSERT INTO public.messages (chat_id, role, content, created_at, metadata) VALUES
  (v_chat_1, 'user', 'What are the required sections for a barangay disaster preparedness plan under RA 10121?', NOW() - INTERVAL '2 hours', '{}'),
  (v_chat_1, 'assistant', 'Based on RA 10121 (Philippine Disaster Risk Reduction and Management Act of 2010), a barangay disaster preparedness plan must include the following key sections:

## Required Sections:

### 1. Risk Assessment and Hazard Mapping
- Identification of hazards specific to the barangay
- Vulnerability assessment of the community
- Capacity assessment of local resources

### 2. Early Warning System
- Communication protocols
- Warning dissemination procedures
- Community alert mechanisms

### 3. Evacuation Plan
- Designated evacuation centers
- Evacuation routes and procedures
- Special provisions for vulnerable groups (PWD, elderly, children)

### 4. Emergency Response Procedures
- Incident command system
- Search and rescue protocols
- Medical emergency response

### 5. Resource Inventory
- Available equipment and supplies
- Human resources (trained personnel)
- Financial resources and budget allocation

### 6. Training and Drills Schedule
- Community awareness programs
- Regular evacuation drills
- Capacity building activities

### 7. Recovery and Rehabilitation Plan
- Post-disaster assessment procedures
- Livelihood restoration programs
- Psychosocial support services

Would you like me to provide more details on any specific section?', NOW() - INTERVAL '2 hours' + INTERVAL '30 seconds', '{"searchQueries": ["RA 10121 barangay disaster plan requirements", "DRRM plan sections"], "documentCount": 5}'),
  (v_chat_1, 'user', 'Can you elaborate on the evacuation plan requirements?', NOW() - INTERVAL '90 minutes', '{}'),
  (v_chat_1, 'assistant', 'Here are the detailed requirements for the Evacuation Plan section:

## Evacuation Plan Requirements

### Evacuation Centers
- Must be structurally sound and safe from identified hazards
- Adequate space (minimum 3.5 sqm per person)
- Access to water, sanitation, and electricity
- Separate areas for families, single men, and single women
- Medical station and isolation area

### Evacuation Routes
- Primary and alternative routes clearly marked
- Accessible to persons with disabilities
- Regular maintenance and clearing
- Signage in Filipino and local dialect
- Lighting for night-time evacuation

### Evacuation Procedures
1. Alert and warning dissemination
2. Assembly points per purok/sitio
3. Accountability system (family counting)
4. Transportation arrangements
5. Security and traffic management

### Special Provisions
- **PWD and Elderly**: Buddy system, priority evacuation
- **Pregnant Women**: Medical support, comfortable areas
- **Children**: Separate play areas, psychosocial support
- **Pets and Livestock**: Designated areas (if applicable)

### Documentation
- Pre-registered evacuee database
- Evacuation center management system
- Daily situation reports
- Resource tracking

This should be reviewed and updated annually, with community consultation.', NOW() - INTERVAL '90 minutes' + INTERVAL '45 seconds', '{}');

  -- =====================================================
  -- Insert Messages for Chat 2: Waste Management Compliance
  -- =====================================================
  INSERT INTO public.messages (chat_id, role, content, created_at, metadata) VALUES
  (v_chat_2, 'user', 'Does our waste management plan comply with RA 9003 requirements?', NOW() - INTERVAL '1 day', '{}'),
  (v_chat_2, 'assistant', 'To assess compliance with RA 9003 (Ecological Solid Waste Management Act), I''ll need to review your plan against the key requirements:

## RA 9003 Key Requirements:

### 1. Waste Segregation at Source
- Biodegradable waste (green bins)
- Non-biodegradable recyclable (blue bins)
- Non-biodegradable non-recyclable (red bins)
- Special waste (yellow bins)

### 2. Collection and Transport
- Separate collection schedules for each waste type
- Proper vehicles and equipment
- Trained collection personnel

### 3. Waste Processing
- Composting facility for biodegradable waste
- Materials Recovery Facility (MRF)
- Recycling programs

### 4. Disposal
- Sanitary landfill (only for residual waste)
- No open dumping
- Proper closure of old dumpsites

### 5. Education and Information
- Community awareness programs
- School-based education
- Public information campaigns

### 6. Monitoring and Enforcement
- Waste audit system
- Penalties for non-compliance
- Regular reporting to DENR

Could you share your current waste management plan so I can provide a detailed compliance assessment?', NOW() - INTERVAL '1 day' + INTERVAL '1 minute', '{}');

  -- =====================================================
  -- Insert Messages for Chat 3: Flood Control Project Permits
  -- =====================================================
  INSERT INTO public.messages (chat_id, role, content, created_at, metadata) VALUES
  (v_chat_3, 'user', 'What permits are needed for flood control projects in Metro Manila?', NOW() - INTERVAL '3 days', '{}'),
  (v_chat_3, 'assistant', 'For flood control projects in Metro Manila, you''ll need to secure the following permits:

## Required Permits and Clearances:

### 1. DPWH Permits
- **Permit to Construct** - From DPWH District Engineering Office
- **Right of Way Permit** - If affecting public roads
- **Hydraulic Permit** - For structures affecting waterways

### 2. MMDA Clearances
- **MMDA Clearance** - For projects affecting Metro Manila drainage
- **Traffic Management Plan Approval** - If affecting traffic flow

### 3. LGU Permits
- **Building Permit** - From City/Municipal Engineering Office
- **Excavation Permit** - For ground works
- **Barangay Clearance** - From affected barangays

### 4. Environmental Permits
- **Environmental Compliance Certificate (ECC)** - From DENR-EMB
- **Tree Cutting Permit** - If trees will be affected
- **Water Permit** - From NWRB if affecting water sources

### 5. Other Clearances
- **MWSS/Maynilad Clearance** - If near water lines
- **Meralco Clearance** - If near power lines
- **PLDT/Telco Clearance** - If near communication lines

### Processing Timeline:
- DPWH permits: 30-45 days
- ECC: 60-90 days (depending on project category)
- LGU permits: 15-30 days

Would you like detailed requirements for any specific permit?', NOW() - INTERVAL '3 days' + INTERVAL '90 seconds', '{}');

  -- =====================================================
  -- Insert Messages for Chat 4: Employee Data Privacy Compliance
  -- =====================================================
  INSERT INTO public.messages (chat_id, role, content, created_at, metadata) VALUES
  (v_chat_4, 'user', 'How do we ensure our employee records comply with RA 10173 (Data Privacy Act)?', NOW() - INTERVAL '5 days', '{}'),
  (v_chat_4, 'assistant', 'To ensure compliance with RA 10173 (Data Privacy Act) for employee records, follow these requirements:

## Data Privacy Compliance Checklist:

### 1. Legal Basis for Processing
- Employment contract (legitimate interest)
- Legal obligation (SSS, PhilHealth, Pag-IBIG, BIR)
- Explicit consent for non-mandatory data

### 2. Data Collection
✅ Collect only necessary information
✅ Inform employees about data collection purpose
✅ Obtain written consent for sensitive personal information
✅ Provide privacy notice

### 3. Data Storage and Security
- Physical security: Locked filing cabinets
- Digital security: Encrypted databases, password protection
- Access control: Role-based access
- Backup and recovery procedures

### 4. Data Retention
- Keep records for duration of employment + 5 years (minimum)
- Dispose securely after retention period
- Document disposal procedures

### 5. Employee Rights
Employees have the right to:
- Access their personal data
- Correct inaccurate data
- Object to processing
- Data portability
- Erasure (with limitations)

### 6. Required Documentation
- Privacy Manual
- Data Processing Agreement (if using third-party HR systems)
- Consent forms
- Data breach response plan
- Employee privacy notices

### 7. NPC Registration
- Register as Personal Information Controller (PIC)
- File annual compliance report
- Pay registration fees

### Sensitive Personal Information (Requires Extra Protection):
- Government IDs
- Health records
- Biometric data
- Criminal records
- Financial information

Would you like a template for any of these documents?', NOW() - INTERVAL '5 days' + INTERVAL '2 minutes', '{}');

  -- =====================================================
  -- Insert Messages for Chat 5: Environmental Compliance Certificate
  -- =====================================================
  INSERT INTO public.messages (chat_id, role, content, created_at, metadata) VALUES
  (v_chat_5, 'user', 'What documents are required for environmental compliance certificate?', NOW() - INTERVAL '7 days', '{}'),
  (v_chat_5, 'assistant', 'Here are the required documents for Environmental Compliance Certificate (ECC) application:

## ECC Application Requirements:

### 1. Basic Documents
- Accomplished ECC Application Form
- Project Description (detailed narrative)
- Location Map and Vicinity Map
- Site Development Plan
- Proof of Land Ownership or Lease Agreement

### 2. Technical Documents
- **Environmental Impact Assessment (EIA)** or
- **Initial Environmental Examination (IEE)** (depending on project category)
- Waste Management Plan
- Pollution Control Measures
- Environmental Monitoring Plan

### 3. Legal Documents
- SEC Registration or DTI Certificate
- Mayor''s Permit / Business Permit
- Barangay Clearance
- Tax Identification Number (TIN)

### 4. Clearances from Other Agencies
- DENR-LMB Clearance (if forestland)
- DENR-BMB Clearance (if in protected area)
- HLURB Clearance (if subdivision/housing)
- DA Clearance (if agricultural land conversion)
- NCIP Clearance (if ancestral domain)

### 5. Public Participation Documents
- Public Scoping Documentation
- Public Hearing Minutes (if required)
- Comments and Responses

## Project Categories:

**Category A (EIA Required):**
- Heavy industries
- Large infrastructure
- Mining operations
- Power plants

**Category B (IEE Required):**
- Medium-scale projects
- Commercial buildings
- Manufacturing facilities

**Category C (No EIA/IEE):**
- Small-scale projects
- Minimal environmental impact

### Processing Time:
- Category A: 90-120 days
- Category B: 60-90 days
- Category C: 30-45 days

What type of project are you applying for?', NOW() - INTERVAL '7 days' + INTERVAL '2 minutes 30 seconds', '{}');

  -- =====================================================
  -- Insert Messages for Chat 6: Workplace Safety Requirements
  -- =====================================================
  INSERT INTO public.messages (chat_id, role, content, created_at, metadata) VALUES
  (v_chat_6, 'user', 'What are the mandatory workplace safety requirements under Philippine law?', NOW() - INTERVAL '10 days', '{}'),
  (v_chat_6, 'assistant', 'Here are the mandatory workplace safety requirements under Philippine Labor Code and DOLE regulations:

## Mandatory Workplace Safety Requirements:

### 1. Occupational Safety and Health (OSH) Program
- Written OSH Policy Statement
- Safety and Health Committee (for 200+ employees)
- Safety Officer (for hazardous workplaces)
- Annual OSH Program submission to DOLE

### 2. Physical Workplace Standards
- Adequate lighting (minimum 200 lux for general work)
- Proper ventilation
- Clean drinking water
- Sanitary toilets (1:25 ratio for women, 1:50 for men)
- First aid facilities

### 3. Fire Safety
- Fire extinguishers (properly maintained)
- Fire exits (clearly marked, unobstructed)
- Emergency evacuation plan
- Fire drill (at least twice a year)
- BFP Fire Safety Inspection Certificate

### 4. Personal Protective Equipment (PPE)
Employer must provide FREE:
- Hard hats (construction)
- Safety shoes
- Gloves
- Goggles/face shields
- Ear protection (if noise > 85 dB)
- Respiratory protection (if needed)

### 5. Hazard Communication
- Safety Data Sheets (SDS) for chemicals
- Proper labeling of hazardous materials
- Employee training on hazards
- Warning signs and symbols

### 6. Medical Services
- Company physician or clinic (for 50+ employees)
- Annual medical examination
- Pre-employment medical exam
- Medical records maintenance

### 7. Training Requirements
- OSH orientation for new employees
- Job-specific safety training
- Emergency response training
- First aid training

### 8. Reporting and Documentation
- Work Accident/Illness Exposure Report (within 24 hours)
- Monthly accident reports to DOLE
- Safety inspection records
- Training records

### 9. Special Requirements for Specific Industries

**Construction:**
- Scaffolding safety
- Fall protection
- Excavation safety

**Manufacturing:**
- Machine guarding
- Lockout/tagout procedures
- Noise control

**Healthcare:**
- Infection control
- Sharps disposal
- Biohazard management

### Penalties for Non-Compliance:
- Fines: ₱10,000 - ₱100,000
- Closure order (for serious violations)
- Criminal liability (for fatal accidents)

Would you like specific guidance for your industry?', NOW() - INTERVAL '10 days' + INTERVAL '3 minutes', '{}');

  RAISE NOTICE 'Mock data inserted successfully for user: %', v_user_id;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check inserted chats
SELECT 
  c.id,
  c.title,
  c.mode,
  c.created_at,
  COUNT(m.id) as message_count
FROM public.chats c
LEFT JOIN public.messages m ON c.id = m.chat_id
WHERE c.user_id = (SELECT id FROM auth.users WHERE email = 'kenpatrickgarcia123@gmail.com')
GROUP BY c.id, c.title, c.mode, c.created_at
ORDER BY c.created_at DESC;

-- Check total messages
SELECT COUNT(*) as total_messages
FROM public.messages m
JOIN public.chats c ON m.chat_id = c.id
WHERE c.user_id = (SELECT id FROM auth.users WHERE email = 'kenpatrickgarcia123@gmail.com');
