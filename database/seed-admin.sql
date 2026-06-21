-- =====================================================
-- INSERT MOCK DATA FOR ADMIN USER
-- User ID: ea9ec9a7-a714-449e-af57-f88a8f89bc0c
-- Email: admin@baybayinscribe.top
-- =====================================================

DO $$
DECLARE
  v_user_id UUID := 'ea9ec9a7-a714-449e-af57-f88a8f89bc0c';
  v_chat_1 UUID := gen_random_uuid();
  v_chat_2 UUID := gen_random_uuid();
  v_chat_3 UUID := gen_random_uuid();
  v_chat_4 UUID := gen_random_uuid();
  v_chat_5 UUID := gen_random_uuid();
BEGIN
  -- Insert Chats
  INSERT INTO public.chats (id, user_id, title, mode, created_at, updated_at) VALUES
  (v_chat_1, v_user_id, 'System Compliance Overview', 'compliance', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),
  (v_chat_2, v_user_id, 'Legal Framework Analysis', 'general', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  (v_chat_3, v_user_id, 'Regulatory Updates 2024', 'general', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  (v_chat_4, v_user_id, 'Multi-Agency Coordination', 'compliance', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  (v_chat_5, v_user_id, 'Policy Implementation Guide', 'general', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days');

  -- Chat 1: System Compliance Overview
  INSERT INTO public.messages (chat_id, role, content, created_at, metadata) VALUES
  (v_chat_1, 'user', 'Provide an overview of Philippine compliance requirements for government agencies', NOW() - INTERVAL '30 minutes', '{}'),
  (v_chat_1, 'assistant', 'Here''s a comprehensive overview of compliance requirements for Philippine government agencies:

## Key Compliance Areas:

### 1. Administrative Compliance
**Civil Service Commission (CSC)**
- Personnel management standards
- Merit and fitness principles
- Employee performance evaluation
- Disciplinary procedures

**Commission on Audit (COA)**
- Financial reporting requirements
- Audit compliance
- Procurement regulations
- Asset management

### 2. Transparency and Accountability
**Full Disclosure Policy**
- Budget utilization reports
- Public bidding results
- Salary standardization
- Statement of Assets, Liabilities, and Net Worth (SALN)

**Freedom of Information (FOI)**
- Public access to information
- Response within 15 working days
- Exemptions properly documented

### 3. Procurement Compliance
**RA 9184 (Government Procurement Reform Act)**
- Competitive bidding requirements
- Procurement planning
- Bids and Awards Committee (BAC)
- Contract management

### 4. Data Privacy
**RA 10173 (Data Privacy Act)**
- Privacy Impact Assessment
- Data Protection Officer appointment
- Security measures implementation
- Breach notification protocols

### 5. Anti-Corruption
**RA 6713 (Code of Conduct)**
- Ethical standards
- Conflict of interest disclosure
- Gift policy compliance
- Public accountability

**RA 3019 (Anti-Graft and Corrupt Practices Act)**
- Prohibited acts
- Reporting mechanisms
- Investigation procedures

### 6. Environmental Compliance
**Presidential Decree 1586**
- Environmental Impact Assessment
- Environmental Compliance Certificate
- Monitoring and reporting

### 7. Records Management
**National Archives Act**
- Document retention schedules
- Archival procedures
- Digital records management

## Monitoring and Reporting:
- Quarterly compliance reports
- Annual audit submissions
- Performance governance system
- Citizen feedback mechanisms

Would you like detailed guidance on any specific compliance area?', NOW() - INTERVAL '30 minutes' + INTERVAL '1 minute', '{"searchQueries": ["government compliance Philippines", "agency requirements"], "documentCount": 12}');

  -- Chat 2: Legal Framework Analysis
  INSERT INTO public.messages (chat_id, role, content, created_at, metadata) VALUES
  (v_chat_2, 'user', 'What are the recent amendments to Philippine administrative law?', NOW() - INTERVAL '1 day', '{}'),
  (v_chat_2, 'assistant', 'Recent significant amendments and developments in Philippine administrative law:

## Major Legislative Updates (2023-2024):

### 1. Ease of Doing Business Act (RA 11032) - Enhanced Implementation
**Key Provisions:**
- 3-day processing for simple transactions
- 7-day processing for complex transactions
- 20-day maximum for highly technical applications
- Zero contact policy implementation
- Penalties for non-compliance

### 2. Public Service Act (RA 11659) - 2022 Amendment
**Changes:**
- Liberalized foreign ownership in public services
- Removed restrictions on telecommunications
- Updated franchise requirements
- Enhanced regulatory framework

### 3. Financial Products and Services Consumer Protection Act (RA 11765)
**Provisions:**
- Consumer rights protection
- Complaint mechanisms
- Transparency requirements
- Regulatory oversight

### 4. SIM Card Registration Act (RA 11934)
**Requirements:**
- Mandatory registration
- Identity verification
- Data privacy safeguards
- Implementation guidelines

### 5. Internet Transactions Act (RA 11967)
**Coverage:**
- E-commerce regulations
- Digital signatures
- Online dispute resolution
- Consumer protection online

## Administrative Issuances:

### Executive Orders
- EO 170: Institutionalizing Regulatory Management System
- EO 138: Bids and Awards Committee composition
- Various COVID-19 response measures

### Department Circulars
- Updated procurement guidelines
- Enhanced transparency measures
- Digital transformation initiatives

## Judicial Developments:
- Supreme Court rulings on administrative procedures
- Expanded due process requirements
- Enhanced judicial review standards

Would you like analysis of any specific amendment?', NOW() - INTERVAL '1 day' + INTERVAL '1 minute 30 seconds', '{}');

  -- Chat 3: Regulatory Updates 2024
  INSERT INTO public.messages (chat_id, role, content, created_at, metadata) VALUES
  (v_chat_3, 'user', 'What regulatory changes should agencies prepare for in 2024?', NOW() - INTERVAL '3 days', '{}'),
  (v_chat_3, 'assistant', 'Key regulatory changes and preparations for 2024:

## Upcoming Regulatory Changes:

### 1. Digital Governance
**E-Government Master Plan 2.0**
- Cloud-first policy implementation
- Interoperability standards
- Cybersecurity requirements
- Digital identity system

### 2. Data Protection
**NPC Compliance Updates**
- Enhanced security standards
- Mandatory breach reporting (72 hours)
- Privacy by design requirements
- Regular compliance audits

### 3. Procurement Reforms
**PhilGEPS 3.0 Launch**
- Fully electronic procurement
- Real-time monitoring
- Enhanced transparency features
- Automated compliance checks

### 4. Financial Management
**New Government Accounting Manual**
- Updated chart of accounts
- Enhanced reporting requirements
- Performance-based budgeting
- Accrual accounting transition

### 5. Human Resource Management
**CSC Modernization Program**
- Digital HRMS implementation
- Performance management system
- Competency-based assessment
- Career progression framework

### 6. Environmental Compliance
**Updated ECC Guidelines**
- Stricter environmental standards
- Climate change considerations
- Sustainability reporting
- Green procurement requirements

### 7. Anti-Red Tape
**ARTA Implementation Phase 3**
- Citizen''s charter updates
- Service delivery standards
- Complaint mechanisms
- Performance metrics

## Preparation Checklist:

### Q1 2024
✅ Update internal policies
✅ Train personnel on new systems
✅ Conduct compliance gap analysis
✅ Allocate budget for upgrades

### Q2 2024
✅ Implement new systems
✅ Test compliance procedures
✅ Establish monitoring mechanisms
✅ Engage stakeholders

### Q3 2024
✅ Full system deployment
✅ Continuous monitoring
✅ Performance evaluation
✅ Corrective actions

### Q4 2024
✅ Annual compliance review
✅ Lessons learned documentation
✅ Planning for 2025
✅ Stakeholder feedback

Would you like a detailed implementation plan for any area?', NOW() - INTERVAL '3 days' + INTERVAL '2 minutes', '{}');

  -- Chat 4: Multi-Agency Coordination
  INSERT INTO public.messages (chat_id, role, content, created_at, metadata) VALUES
  (v_chat_4, 'user', 'How can we improve inter-agency coordination for compliance?', NOW() - INTERVAL '5 days', '{}'),
  (v_chat_4, 'assistant', 'Strategies for improving inter-agency coordination:

## Inter-Agency Coordination Framework:

### 1. Institutional Mechanisms

**Inter-Agency Committees**
- Regular coordination meetings
- Clear terms of reference
- Defined decision-making processes
- Secretariat support

**Memoranda of Agreement (MOA)**
- Formalized partnerships
- Defined roles and responsibilities
- Resource sharing arrangements
- Dispute resolution mechanisms

### 2. Information Sharing

**Integrated Database Systems**
- Shared data repositories
- Real-time information exchange
- Standardized data formats
- Secure access protocols

**Common Platforms**
- PhilGEPS for procurement
- GPPB portal for policies
- COA portal for audits
- CSC portal for HR

### 3. Process Integration

**One-Stop Shops**
- Business permit processing
- Investment facilitation
- Project approvals
- Citizen services

**Streamlined Procedures**
- Eliminate duplicate requirements
- Harmonized forms
- Concurrent processing
- Shared inspections

### 4. Capacity Building

**Joint Training Programs**
- Cross-agency workshops
- Best practice sharing
- Technical assistance
- Peer learning

**Knowledge Management**
- Centralized resource library
- Case studies database
- Lessons learned repository
- Expert directory

### 5. Technology Solutions

**Government Integration Platform**
- API-based integration
- Single sign-on
- Unified dashboard
- Automated workflows

**Collaboration Tools**
- Secure messaging
- Document sharing
- Video conferencing
- Project management

### 6. Performance Monitoring

**Joint Performance Indicators**
- Shared metrics
- Regular reporting
- Comparative analysis
- Continuous improvement

**Feedback Mechanisms**
- Client satisfaction surveys
- Stakeholder consultations
- Complaint systems
- Performance reviews

## Best Practices:

✅ **Leadership Commitment**
- Executive support
- Clear mandates
- Resource allocation
- Accountability measures

✅ **Clear Communication**
- Regular updates
- Transparent processes
- Accessible information
- Responsive feedback

✅ **Flexibility**
- Adaptive procedures
- Innovative solutions
- Pilot testing
- Scalable approaches

✅ **Sustainability**
- Institutionalized mechanisms
- Adequate resources
- Continuous training
- Regular evaluation

## Success Factors:
1. Political will
2. Clear legal framework
3. Adequate resources
4. Technical capacity
5. Stakeholder engagement
6. Change management
7. Monitoring and evaluation

Would you like specific implementation guidance?', NOW() - INTERVAL '5 days' + INTERVAL '2 minutes 30 seconds', '{}');

  -- Chat 5: Policy Implementation Guide
  INSERT INTO public.messages (chat_id, role, content, created_at, metadata) VALUES
  (v_chat_5, 'user', 'What are best practices for policy implementation in government?', NOW() - INTERVAL '7 days', '{}'),
  (v_chat_5, 'assistant', 'Comprehensive guide for effective policy implementation:

## Policy Implementation Framework:

### Phase 1: Preparation (Months 1-2)

**Policy Analysis**
- Review policy objectives
- Identify stakeholders
- Assess resource requirements
- Conduct risk analysis

**Implementation Planning**
- Develop detailed action plan
- Set timelines and milestones
- Assign responsibilities
- Allocate budget

**Legal Framework**
- Draft implementing rules
- Secure legal clearances
- Publish in Official Gazette
- Conduct public consultations

### Phase 2: Capacity Building (Months 2-3)

**Organizational Readiness**
- Restructure if needed
- Define new roles
- Update job descriptions
- Establish coordination mechanisms

**Personnel Training**
- Orientation programs
- Technical training
- Change management
- Leadership development

**Systems Development**
- IT infrastructure
- Database systems
- Monitoring tools
- Reporting mechanisms

### Phase 3: Pilot Implementation (Months 3-4)

**Pilot Testing**
- Select pilot sites
- Implement on small scale
- Monitor closely
- Document lessons learned

**Adjustments**
- Refine procedures
- Update guidelines
- Address issues
- Improve systems

### Phase 4: Full Rollout (Months 5-6)

**Nationwide Implementation**
- Phased deployment
- Regional coordination
- Technical support
- Resource distribution

**Communication Campaign**
- Public awareness
- Stakeholder engagement
- Media relations
- Feedback channels

### Phase 5: Monitoring and Evaluation (Ongoing)

**Performance Monitoring**
- Track indicators
- Regular reporting
- Data analysis
- Corrective actions

**Impact Evaluation**
- Baseline assessment
- Midterm review
- Final evaluation
- Impact study

## Critical Success Factors:

### 1. Leadership and Governance
✅ Strong political will
✅ Clear accountability
✅ Adequate authority
✅ Sustained commitment

### 2. Resources
✅ Sufficient budget
✅ Qualified personnel
✅ Appropriate technology
✅ Infrastructure support

### 3. Stakeholder Engagement
✅ Early involvement
✅ Regular consultation
✅ Feedback integration
✅ Partnership building

### 4. Communication
✅ Clear messaging
✅ Multiple channels
✅ Timely updates
✅ Two-way dialogue

### 5. Flexibility
✅ Adaptive management
✅ Learning orientation
✅ Innovation encouraged
✅ Problem-solving focus

## Common Pitfalls to Avoid:

❌ Inadequate planning
❌ Insufficient resources
❌ Poor communication
❌ Resistance to change
❌ Weak monitoring
❌ Lack of coordination
❌ Unrealistic timelines
❌ Inadequate training

## Tools and Templates:

1. Implementation Plan Template
2. Gantt Chart
3. Risk Matrix
4. Stakeholder Map
5. Communication Plan
6. Monitoring Framework
7. Evaluation Tools
8. Lessons Learned Log

Would you like specific templates or detailed guidance on any phase?', NOW() - INTERVAL '7 days' + INTERVAL '3 minutes', '{}');

  RAISE NOTICE 'Mock data inserted successfully for Admin: ea9ec9a7-a714-449e-af57-f88a8f89bc0c';
END $$;

-- VERIFICATION
SELECT c.title, c.mode, COUNT(m.id) as messages
FROM public.chats c
LEFT JOIN public.messages m ON c.id = m.chat_id
WHERE c.user_id = 'ea9ec9a7-a714-449e-af57-f88a8f89bc0c'
GROUP BY c.id, c.title, c.mode
ORDER BY c.created_at DESC;
