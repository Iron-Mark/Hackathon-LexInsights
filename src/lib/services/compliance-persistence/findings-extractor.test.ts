import { describe, expect, it } from 'vitest'

import {
  extractFindingSeeds,
  extractFindingSeedsFromAnalysis,
  extractFindingSeedsFromMarkdown,
} from './findings-extractor'

const SAMPLE_ANALYSIS = {
  green_findings: [
    {
      category: 'compliant',
      status: 'green',
      title: 'Consent clause present',
      description: 'The draft collects informed consent.',
      references: ['RA 10173', 'NPC Circular 2023-01'],
      recommendation: 'Keep the clause versioned.',
      severity_score: 1,
    },
  ],
  amber_findings: [
    {
      category: 'gap',
      status: 'amber',
      title: 'Retention period vague',
      description: 'No explicit retention schedule.',
      references: [],
      recommendation: 'State a concrete retention period.',
      severity_score: 5,
    },
  ],
  red_findings: [
    {
      category: 'conflict',
      status: 'red',
      title: 'No breach notification',
      description: 'Missing NPC 72-hour notification.',
      references: ['RA 10173'],
      recommendation: 'Add a breach notification procedure.',
      severity_score: 9,
    },
  ],
}

const SAMPLE_MARKDOWN = `# Compliance Analysis Report

## Overall Assessment

Compliance Score: 74%

## Green Findings

### 1. Consent clause present
- Status: green
- Category: compliant
- Severity Score: 1
- Description: The draft collects informed consent.
- References: RA 10173; NPC Circular 2023-01
- Recommendation: Keep the clause versioned.

## Amber Findings

### 2. Retention period vague
- Status: amber
- Category: gap
- Severity Score: 5
- Description: No explicit retention schedule.
- References: None provided
- Recommendation: State a concrete retention period.

## Red Findings

### 3. No breach notification
- Status: red
- Category: conflict
- Severity Score: 9
- Description: Missing NPC 72-hour notification.
- References: RA 10173
- Recommendation: Add a breach notification procedure.

## Practical Checklist

- Appoint a Data Protection Officer
- [ ] Register processing systems with the NPC

## Legal Disclaimer

This generated analysis is for informational purposes only.
`

describe('extractFindingSeedsFromAnalysis', () => {
  it('flattens green/amber/red findings in report order with positions', () => {
    const seeds = extractFindingSeedsFromAnalysis(SAMPLE_ANALYSIS)

    expect(seeds).toHaveLength(3)
    expect(seeds.map((seed) => seed.severity)).toEqual(['green', 'amber', 'red'])
    expect(seeds.map((seed) => seed.position)).toEqual([0, 1, 2])
    expect(seeds[0].title).toBe('Consent clause present')
    expect(seeds[0].authorityCitation).toBe('RA 10173; NPC Circular 2023-01')
    expect(seeds[0].detail).toContain('The draft collects informed consent.')
    expect(seeds[0].detail).toContain('Recommendation: Keep the clause versioned.')
    expect(seeds[1].authorityCitation).toBeNull()
    expect(seeds.every((seed) => !seed.isChecklist)).toBe(true)
  })

  it('falls back to the group severity when a finding status is unknown', () => {
    const seeds = extractFindingSeedsFromAnalysis({
      red_findings: [{ status: 'critical', title: 'Odd status' }],
    })

    expect(seeds).toHaveLength(1)
    expect(seeds[0].severity).toBe('red')
  })

  it('handles an empty analysis', () => {
    expect(extractFindingSeedsFromAnalysis({})).toEqual([])
  })
})

describe('extractFindingSeedsFromMarkdown', () => {
  it('parses findings sections and checklist bullets from report markdown', () => {
    const seeds = extractFindingSeedsFromMarkdown(SAMPLE_MARKDOWN)

    const findings = seeds.filter((seed) => !seed.isChecklist)
    const checklist = seeds.filter((seed) => seed.isChecklist)

    expect(findings).toHaveLength(3)
    expect(findings.map((seed) => seed.severity)).toEqual(['green', 'amber', 'red'])
    expect(findings[0].title).toBe('Consent clause present')
    expect(findings[0].authorityCitation).toBe('RA 10173; NPC Circular 2023-01')
    // "None provided" must not become a fake citation.
    expect(findings[1].authorityCitation).toBeNull()
    expect(findings[2].detail).toContain('Missing NPC 72-hour notification.')
    expect(findings[2].detail).toContain('Recommendation: Add a breach notification procedure.')

    expect(checklist).toHaveLength(2)
    expect(checklist[0].title).toBe('Appoint a Data Protection Officer')
    expect(checklist[0].checklistItem).toBe('Appoint a Data Protection Officer')
    expect(checklist[0].severity).toBe('amber')
    expect(checklist[1].title).toBe('Register processing systems with the NPC')
    expect(checklist.every((seed) => !seed.isChecked)).toBe(true)

    // Positions stay contiguous across findings + checklist.
    expect(seeds.map((seed) => seed.position)).toEqual([0, 1, 2, 3, 4])
  })

  it('returns an empty array for markdown with no findings sections', () => {
    expect(extractFindingSeedsFromMarkdown('# Deep Search Results\n\nNo findings here.')).toEqual([])
  })

  it('stops checklist collection at the next heading', () => {
    const seeds = extractFindingSeedsFromMarkdown(
      ['## Practical Checklist', '- Item one', '## Legal Disclaimer', '- Not a checklist item'].join(
        '\n'
      )
    )

    expect(seeds).toHaveLength(1)
    expect(seeds[0].title).toBe('Item one')
  })

  it('stops checklist collection at bare research-summary section labels', () => {
    // Research summaries end the checklist with bare labels, not '#' headings
    // (see isChecklistEndHeading in src/lib/utils/practical-checklist.ts).
    const seeds = extractFindingSeedsFromMarkdown(
      [
        'Practical Checklist',
        '- Register with the NPC',
        'Relevant Authorities',
        '- RA 10173 - Data Privacy Act',
      ].join('\n')
    )

    expect(seeds).toHaveLength(1)
    expect(seeds[0].title).toBe('Register with the NPC')
  })

  it('skips deep #####/###### headings inside a findings section', () => {
    const seeds = extractFindingSeedsFromMarkdown(
      [
        '## Red Findings',
        '### 1. Real finding',
        '- Status: red',
        '- Description: Something is missing.',
        '##### Editor note, not a finding',
        '### 2. Second finding',
        '- Status: red',
      ].join('\n')
    )

    expect(seeds).toHaveLength(2)
    expect(seeds.map((seed) => seed.title)).toEqual(['Real finding', 'Second finding'])
  })
})

describe('extractFindingSeeds', () => {
  it('prefers the structured analysis and merges markdown checklist rows', () => {
    const seeds = extractFindingSeeds({ analysis: SAMPLE_ANALYSIS, markdown: SAMPLE_MARKDOWN })

    const findings = seeds.filter((seed) => !seed.isChecklist)
    const checklist = seeds.filter((seed) => seed.isChecklist)

    expect(findings).toHaveLength(3)
    expect(checklist).toHaveLength(2)
    expect(seeds.map((seed) => seed.position)).toEqual([0, 1, 2, 3, 4])
  })

  it('uses markdown alone when no analysis is provided', () => {
    const seeds = extractFindingSeeds({ markdown: SAMPLE_MARKDOWN })
    expect(seeds.filter((seed) => !seed.isChecklist)).toHaveLength(3)
  })

  it('returns an empty array with neither source', () => {
    expect(extractFindingSeeds({})).toEqual([])
  })
})
