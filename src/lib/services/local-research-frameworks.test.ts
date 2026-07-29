import { describe, expect, it } from 'vitest'

import { COMPLIANCE_FRAMEWORKS } from './local-research-data/compliance-frameworks'
import { runLocalResearch } from './local-legal-research'

const FRAMEWORK_IDS = new Set(COMPLIANCE_FRAMEWORKS.map((framework) => framework.id))

describe('runLocalResearch matched_framework_id (PRD P2-2 follow-up)', () => {
  it('emits a known framework id consistent with the rendered framework section', () => {
    const response = runLocalResearch({
      query: 'data privacy consent and breach notification under RA 10173',
    })

    expect(response.status).toBe('completed')
    expect(response.matched_framework_id).toBeDefined()
    expect(FRAMEWORK_IDS.has(response.matched_framework_id!)).toBe(true)

    // The structured id must agree with the framework section rendered in the
    // report body — that section appears exactly when a framework matched.
    expect(response.summary).toContain('## Local Compliance Framework')

    expect(response.matched_framework_ids).toBeDefined()
    expect(response.matched_framework_ids![0]).toBe(response.matched_framework_id)
    expect(response.matched_framework_ids!.every((id) => FRAMEWORK_IDS.has(id))).toBe(true)
    expect(response.matched_framework_ids!.length).toBeLessThanOrEqual(2)
  })

  it('omits the field when no framework matches', () => {
    const response = runLocalResearch({
      query: 'zzz unmatchable gibberish query with no legal topic',
    })

    expect(response.matched_framework_id).toBeUndefined()
    expect(response.matched_framework_ids).toBeUndefined()
  })
})
