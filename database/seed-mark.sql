-- =====================================================
-- INSERT MOCK DATA FOR MARK SIAZON
-- User ID: 878a5353-b8c0-4a8c-b04f-43db9c84dcc4
-- Email: msiazon.k12043276@umak.edu.ph
-- =====================================================

DO $$
DECLARE
  v_user_id UUID := '878a5353-b8c0-4a8c-b04f-43db9c84dcc4';
  v_chat_1 UUID := gen_random_uuid();
  v_chat_2 UUID := gen_random_uuid();
  v_chat_3 UUID := gen_random_uuid();
  v_chat_4 UUID := gen_random_uuid();
  v_chat_5 UUID := gen_random_uuid();
  v_chat_6 UUID := gen_random_uuid();
BEGIN
  -- Insert Chats
  INSERT INTO public.chats (id, user_id, title, mode, created_at, updated_at) VALUES
  (v_chat_1, v_user_id, 'Business Permit Requirements', 'general', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
  (v_chat_2, v_user_id, 'SEC Registration Process', 'compliance', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  (v_chat_3, v_user_id, 'BIR Tax Compliance', 'compliance', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
  (v_chat_4, v_user_id, 'Labor Code Employee Benefits', 'general', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
  (v_chat_5, v_user_id, 'Fire Safety Inspection', 'general', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
  (v_chat_6, v_user_id, 'DOLE Compliance Requirements', 'compliance', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days');

  -- =====================================================
  -- Chat 1: Business Permit Requirements
  -- =====================================================
  INSERT INTO public.messages (chat_id, role, content, created_at, metadata) VALUES
  (v_chat_1, 'user', 'What documents do I need to get a business permit in Manila?', NOW() - INTERVAL '1 hour', '{}'),
  (v_chat_1, 'assistant', 'To obtain a business permit in Manila, you need to prepare the following documents:

## Required Documents:

### 1. Basic Requirements
- DTI Registration (for sole proprietorship) or SEC Registration (for corporation/partnership)
- Barangay Clearance from the barangay where business is located
- Community Tax Certificate (Cedula)
- Valid ID of business owner/authorized representative

### 2. Location Documents
- Contract of Lease (if renting) or Certificate of Land Title (if owned)
- Location Plan/Vicinity Map
- Pictures of business establishment (interior and exterior)

### 3. Business-Specific Documents
- Professional Tax Receipt (for professionals)
- Sanitary Permit from City Health Office
- Fire Safety Inspection Certificate from BFP
- Environmental Clearance (if applicable)

### 4. Tax Documents
- BIR Certificate of Registration (Form 2303)
- Official Receipts and Invoices (BIR registered)
- Books of Accounts

### 5. Additional Requirements (depending on business type)
- FDA License (for food/drug businesses)
- DOLE Certificate (for businesses with employees)
- Special permits for regulated industries

## Processing Steps:
1. Secure Barangay Clearance
2. Get Fire Safety Inspection Certificate
3. Obtain Sanitary Permit
4. Apply for Business Permit at City Hall
5. Pay business taxes and fees

Processing time: 3-7 working days

Would you like specific information about any of these requirements?', NOW() - INTERVAL '1 hour' + INTERVAL '45 seconds', '{"searchQueries": ["Manila business permit requirements", "business permit documents"], "documentCount": 8}'),
  (v_chat_1, 'user', 'How much does it cost?', NOW() - INTERVAL '55 minutes', '{}'),
  (v_chat_1, 'assistant', 'Business permit fees in Manila vary based on several factors:

## Fee Structure:

### 1. Business Tax
Depends on:
- Type of business
- Gross sales/receipts
- Location (zone classification)

**Typical ranges:**
- Small retail: ₱3,000 - ₱10,000
- Medium business: ₱10,000 - ₱50,000
- Large business: ₱50,000+

### 2. Mayor''s Permit Fee
- Base fee: ₱500 - ₱2,000
- Varies by business classification

### 3. Additional Fees
- Sanitary Permit: ₱500 - ₱2,000
- Fire Safety Inspection: ₱500 - ₱3,000
- Barangay Clearance: ₱100 - ₱500
- Garbage Fee: ₱500 - ₱2,000/year
- Signboard Tax: ₱200 - ₱1,000

### 4. Professional Tax (if applicable)
- ₱300 - ₱5,000 depending on profession

## Total Estimated Cost:
- **Small business:** ₱5,000 - ₱15,000
- **Medium business:** ₱15,000 - ₱60,000
- **Large business:** ₱60,000+

**Note:** Fees are subject to change. Visit Manila City Hall or their website for current rates.

**Tip:** New businesses may qualify for discounts or incentives. Ask about available programs!', NOW() - INTERVAL '55 minutes' + INTERVAL '30 seconds', '{}');

  -- =====================================================
  -- Chat 2: SEC Registration Process
  -- =====================================================
  INSERT INTO public.messages (chat_id, role, content, created_at, metadata) VALUES
  (v_chat_2, 'user', 'How do I register a corporation with SEC?', NOW() - INTERVAL '2 days', '{}'),
  (v_chat_2, 'assistant', 'Here''s the complete process for SEC corporation registration:

## SEC Corporation Registration Process:

### Step 1: Name Verification (1-2 days)
1. Search available names on SEC website
2. Reserve your chosen corporate name
3. Fee: ₱40 per name search
4. Name reservation valid for 30 days

### Step 2: Prepare Required Documents
- Articles of Incorporation (notarized)
- Treasurer''s Affidavit (notarized)
- Bank Certificate of Deposit (minimum ₱5,000)
- Valid IDs of incorporators
- Proof of address

### Step 3: Submit Application
**Online via SEC i-Register:**
1. Create account on SEC website
2. Fill out online forms
3. Upload required documents
4. Pay registration fees

**Or visit SEC office:**
- Bring all documents
- Submit at SEC counter
- Pay at cashier

### Step 4: Pay Registration Fees
- Filing fee: 1/5 of 1% of authorized capital stock
- Legal research fee: 1% of filing fee
- Minimum total: ₱2,020

### Step 5: Receive Certificate
- Processing time: 3-5 working days (online)
- 5-10 working days (walk-in)
- Certificate of Incorporation issued

## Post-Registration Requirements:
1. Register with BIR (within 30 days)
2. Register with SSS, PhilHealth, Pag-IBIG
3. Secure Mayor''s Permit
4. Open corporate bank account

Would you like details on any specific step?', NOW() - INTERVAL '2 days' + INTERVAL '1 minute', '{"searchQueries": ["SEC corporation registration", "how to register corporation Philippines"], "documentCount": 6}');

  -- =====================================================
  -- Chat 3: BIR Tax Compliance
  -- =====================================================
  INSERT INTO public.messages (chat_id, role, content, created_at, metadata) VALUES
  (v_chat_3, 'user', 'What are the tax filing requirements for small businesses?', NOW() - INTERVAL '4 days', '{}'),
  (v_chat_3, 'assistant', 'Here are the tax filing requirements for small businesses in the Philippines:

## Regular Tax Filing Requirements:

### Monthly Filings:

**1. Percentage Tax or VAT (by 20th of following month)**
- Form 2551M (Non-VAT) or
- Form 2550M (VAT)
- For businesses with gross sales/receipts

**2. Withholding Tax (by 10th of following month)**
- Form 1601C (Expanded Withholding Tax)
- Form 1601EQ (Quarterly Expanded Withholding)

**3. Monthly Remittance**
- SSS contributions
- PhilHealth contributions
- Pag-IBIG contributions

### Quarterly Filings:

**1. Income Tax (by 60 days after quarter end)**
- Form 1701Q (Quarterly Income Tax)
- Quarters: March 31, May 31, Aug 31, Nov 30

**2. Quarterly Alphalist**
- List of employees and taxes withheld

### Annual Filings:

**1. Annual Income Tax Return (by April 15)**
- Form 1701 (Self-employed/Professional)
- Form 1702 (Corporation)

**2. Annual Information Return**
- Form 1604CF (Annual Information Return)
- Due: April 15

**3. Annual Alphalist of Payees**
- List of all payees and taxes withheld
- Due: April 15

## Penalties for Late Filing:
- 25% surcharge on unpaid tax
- 20% interest per annum
- Compromise penalty: ₱1,000 - ₱25,000

## Tips for Compliance:
✅ Set calendar reminders for deadlines
✅ Keep organized records
✅ Use accounting software
✅ Consider hiring a bookkeeper
✅ File even if no income (zero filing)

Would you like help with any specific tax form?', NOW() - INTERVAL '4 days' + INTERVAL '2 minutes', '{}');

  -- =====================================================
  -- Chat 4: Labor Code Employee Benefits
  -- =====================================================
  INSERT INTO public.messages (chat_id, role, content, created_at, metadata) VALUES
  (v_chat_4, 'user', 'What benefits am I required to give my employees?', NOW() - INTERVAL '6 days', '{}'),
  (v_chat_4, 'assistant', 'Under Philippine Labor Code, here are the mandatory employee benefits:

## Mandatory Employee Benefits:

### 1. Minimum Wage
- Varies by region
- NCR: ₱610/day (as of 2024)
- Must comply with regional wage orders

### 2. 13th Month Pay
- Equivalent to 1/12 of annual basic salary
- Must be paid on or before December 24
- All rank-and-file employees entitled

### 3. Government Contributions
**SSS (Social Security System)**
- Employer: 9.5% of salary
- Employee: 4.5% of salary
- Maximum: ₱30,000 salary ceiling

**PhilHealth**
- Employer: 2.5% of salary
- Employee: 2.5% of salary
- Maximum: ₱80,000 salary ceiling

**Pag-IBIG**
- Employer: 2% of salary
- Employee: 2% of salary
- Maximum: ₱5,000 salary ceiling

### 4. Leave Benefits
**Service Incentive Leave (SIL)**
- 5 days paid leave per year
- After 1 year of service
- Convertible to cash if unused

### 5. Holiday Pay
**Regular Holidays (10 days)**
- 200% of daily rate if worked
- 100% if not worked (if qualified)

**Special Non-Working Days**
- 130% if worked
- No pay if not worked

### 6. Overtime Pay
- 125% of hourly rate (regular days)
- 130% of hourly rate (rest days/special holidays)
- 200% of hourly rate (regular holidays)

### 7. Night Shift Differential
- Additional 10% of regular wage
- For work between 10 PM - 6 AM

### 8. Maternity Leave
- 105 days paid leave (120 for solo parent)
- 15 days for miscarriage
- SSS covers benefit

### 9. Paternity Leave
- 7 days paid leave
- For married male employees

### 10. Parental Leave (Solo Parents)
- 7 days paid leave per year

### 11. VAWC Leave
- 10 days paid leave for victims of violence

## Additional Benefits (Optional but Common):
- Rice subsidy
- Clothing allowance
- Medical/dental benefits
- Transportation allowance
- Performance bonuses

## Penalties for Non-Compliance:
- Fines: ₱25,000 - ₱100,000
- Imprisonment: 2-4 years
- Back pay to employees

Would you like more details on any specific benefit?', NOW() - INTERVAL '6 days' + INTERVAL '2 minutes 30 seconds', '{}');

  -- =====================================================
  -- Chat 5: Fire Safety Inspection
  -- =====================================================
  INSERT INTO public.messages (chat_id, role, content, created_at, metadata) VALUES
  (v_chat_5, 'user', 'What do I need for BFP fire safety inspection?', NOW() - INTERVAL '8 days', '{}'),
  (v_chat_5, 'assistant', 'Here''s what you need for BFP (Bureau of Fire Protection) Fire Safety Inspection:

## Fire Safety Inspection Requirements:

### 1. Documentary Requirements
- Application form (from BFP)
- Building permit or Certificate of Occupancy
- Occupancy permit
- Electrical permit
- Mechanical permit (if applicable)
- Floor plan/layout
- Fire safety and evacuation plan
- Valid ID of owner/representative

### 2. Physical Requirements

**Fire Prevention Equipment:**
- Fire extinguishers (properly maintained)
  - Minimum 2.5 kg capacity
  - Properly mounted and accessible
  - Not expired
- Fire hose and hose reel (for larger establishments)
- Fire alarm system
- Emergency lights
- Exit signs (illuminated)

**Building Features:**
- Fire exits (minimum 2)
  - Clearly marked
  - Unobstructed
  - Opens outward
  - Panic hardware installed
- Fire doors (if required)
- Smoke detectors
- Sprinkler system (for large buildings)

**Safety Measures:**
- No flammable materials blocking exits
- Proper electrical wiring
- No overloaded circuits
- Proper storage of flammable materials
- "No Smoking" signs posted

### 3. Inspection Process
1. Submit application and documents
2. Pay inspection fee (₱200 - ₱2,000)
3. Schedule inspection date
4. BFP inspector visits premises
5. Inspector checks compliance
6. Receive inspection report

### 4. Common Violations
❌ Blocked fire exits
❌ Expired fire extinguishers
❌ No emergency lights
❌ Improper electrical wiring
❌ No fire evacuation plan
❌ Flammable materials near exits

### 5. Fire Safety Inspection Certificate (FSIC)
- Valid for 1 year
- Must be renewed annually
- Required for business permit renewal
- Must be displayed prominently

## Fees:
- Small establishments: ₱200 - ₱500
- Medium establishments: ₱500 - ₱1,500
- Large establishments: ₱1,500 - ₱5,000

## Tips for Passing Inspection:
✅ Conduct self-inspection first
✅ Fix all violations before official inspection
✅ Train staff on fire safety
✅ Maintain fire equipment regularly
✅ Keep fire exits clear at all times
✅ Post emergency numbers

Would you like a fire safety checklist for your business type?', NOW() - INTERVAL '8 days' + INTERVAL '2 minutes', '{}');

  -- =====================================================
  -- Chat 6: DOLE Compliance Requirements
  -- =====================================================
  INSERT INTO public.messages (chat_id, role, content, created_at, metadata) VALUES
  (v_chat_6, 'user', 'What are DOLE compliance requirements for employers?', NOW() - INTERVAL '12 days', '{}'),
  (v_chat_6, 'assistant', 'Here are the DOLE (Department of Labor and Employment) compliance requirements for employers:

## DOLE Compliance Requirements:

### 1. Registration Requirements

**DOLE Registration**
- Register establishment within 30 days of operation
- Submit DOLE Form BWC-1
- Update annually

**Occupational Safety and Health (OSH)**
- Submit OSH Program annually
- Appoint Safety Officer (if 200+ employees)
- Form Safety Committee (if 200+ employees)

### 2. Mandatory Postings
Must display in workplace:
- Summary of Labor Laws
- Work hours and schedules
- Occupational safety and health standards
- List of employees
- Notice of regular payday
- Maternity leave benefits
- Anti-sexual harassment policy

### 3. Employment Records
Must maintain for each employee:
- Employment contract
- Personal data sheet
- Payroll records (3 years)
- Daily time records
- Leave records
- SSS/PhilHealth/Pag-IBIG records

### 4. Payroll Requirements
- Pay at least twice a month
- Issue pay slips
- Maintain payroll register
- Proper deductions only

### 5. Working Hours Compliance
- Maximum 8 hours/day
- 1 hour meal break
- 1 rest day per week
- Overtime pay for excess hours
- Night shift differential (10 PM - 6 AM)

### 6. Leave Administration
- Service Incentive Leave (5 days/year)
- Maternity leave (105 days)
- Paternity leave (7 days)
- Solo parent leave (7 days)
- VAWC leave (10 days)

### 7. Health and Safety
- First aid kit
- Clean drinking water
- Adequate toilets (1:25 for women, 1:50 for men)
- Proper ventilation and lighting
- Safety equipment/PPE

### 8. Reporting Requirements

**Monthly:**
- Accident/illness reports (within 24 hours)
- Work-related deaths (immediate)

**Annually:**
- Annual Medical Report
- Occupational Safety and Health Program
- List of employees

### 9. Inspection Compliance
DOLE may conduct:
- Routine inspections
- Complaint-based inspections
- Accident investigations

**Be ready with:**
- All required documents
- Updated records
- Compliance certificates

### 10. Penalties for Non-Compliance
- Fines: ₱25,000 - ₱100,000
- Imprisonment: 2-4 years
- Closure order (serious violations)
- Back wages to employees

## DOLE Programs to Know:
- DOLE Integrated Livelihood Program (DILP)
- Tulong Panghanapbuhay sa Ating Disadvantaged/Displaced Workers (TUPAD)
- Government Internship Program (GIP)

## Tips for Compliance:
✅ Keep all records organized
✅ Conduct regular self-audits
✅ Train HR staff on labor laws
✅ Update policies regularly
✅ Respond promptly to DOLE notices
✅ Maintain open communication with employees

Would you like specific guidance on any DOLE requirement?', NOW() - INTERVAL '12 days' + INTERVAL '3 minutes', '{}');

  RAISE NOTICE 'Mock data inserted successfully for Mark Siazon: 878a5353-b8c0-4a8c-b04f-43db9c84dcc4';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 
  c.title,
  c.mode,
  COUNT(m.id) as message_count
FROM public.chats c
LEFT JOIN public.messages m ON c.id = m.chat_id
WHERE c.user_id = '878a5353-b8c0-4a8c-b04f-43db9c84dcc4'
GROUP BY c.id, c.title, c.mode
ORDER BY c.created_at DESC;
