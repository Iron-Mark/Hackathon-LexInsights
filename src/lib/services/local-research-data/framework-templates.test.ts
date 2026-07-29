import { describe, expect, it } from 'vitest'

import { COMPLIANCE_FRAMEWORKS } from './compliance-frameworks'
import {
  getFrameworkTemplate,
  selectComplianceFrameworks,
  selectPrimaryFramework,
} from './framework-templates'

// A real framework id/title pair so the tests stay honest against the bundled
// packs without hardcoding a specific framework.
const FRAMEWORK = COMPLIANCE_FRAMEWORKS[0]
const OTHER_FRAMEWORK = COMPLIANCE_FRAMEWORKS[1]

describe('exact matched_framework_id detection (PRD P2-2 follow-up)', () => {
  it('returns the exact framework as a high-confidence primary match', () => {
    const match = selectPrimaryFramework({
      content: '',
      ragResponse: { matched_framework_id: FRAMEWORK.id },
    })

    expect(match).not.toBeNull()
    expect(match!.framework.id).toBe(FRAMEWORK.id)
    expect(match!.confidence).toBe('high')
    expect(match!.signals.exactIdHit).toBe(true)
  })

  it('outranks fuzzy textual signals for a different framework', () => {
    // Title mention of another framework scores 4; the exact id scores 12.
    const match = selectPrimaryFramework({
      content: `This report is about ${OTHER_FRAMEWORK.title}.`,
      ragResponse: { matched_framework_id: FRAMEWORK.id },
    })

    expect(match).not.toBeNull()
    expect(match!.framework.id).toBe(FRAMEWORK.id)
  })

  it('ignores an unknown id and degrades to inference', () => {
    const withUnknownId = selectPrimaryFramework({
      content: `This report is about ${OTHER_FRAMEWORK.title}.`,
      ragResponse: { matched_framework_id: 'renamed-away-framework' },
    })

    expect(withUnknownId).not.toBeNull()
    expect(withUnknownId!.framework.id).toBe(OTHER_FRAMEWORK.id)
    expect(withUnknownId!.signals.exactIdHit).toBe(false)

    // An unknown id with no other signal yields no match, not a crash.
    expect(
      selectComplianceFrameworks({
        ragResponse: { matched_framework_id: 'renamed-away-framework' },
      })
    ).toEqual([])
  })

  it('keeps prior behavior when the field is absent', () => {
    const match = selectPrimaryFramework({
      content: `This report is about ${OTHER_FRAMEWORK.title}.`,
      ragResponse: {},
    })

    expect(match).not.toBeNull()
    expect(match!.framework.id).toBe(OTHER_FRAMEWORK.id)
    expect(match!.signals.exactIdHit).toBe(false)
  })
})

describe('getFrameworkTemplate', () => {
  it('resolves a known id and returns null for unknown ids', () => {
    const template = getFrameworkTemplate(FRAMEWORK.id)
    expect(template).not.toBeNull()
    expect(template!.id).toBe(FRAMEWORK.id)

    expect(getFrameworkTemplate('renamed-away-framework')).toBeNull()
    expect(getFrameworkTemplate(null)).toBeNull()
  })
})
