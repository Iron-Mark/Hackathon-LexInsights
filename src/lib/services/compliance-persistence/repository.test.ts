import { describe, expect, it } from 'vitest'

import {
  CompliancePersistenceNotWiredError,
  UnwiredComplianceReportRepository,
  isFindingSeverity,
  mapFindingRow,
  mapReportRow,
  mapVersionRow,
} from './repository'

describe('isFindingSeverity', () => {
  it('accepts the three DB-checked severities and rejects everything else', () => {
    expect(isFindingSeverity('green')).toBe(true)
    expect(isFindingSeverity('amber')).toBe(true)
    expect(isFindingSeverity('red')).toBe(true)
    expect(isFindingSeverity('blue')).toBe(false)
    expect(isFindingSeverity('')).toBe(false)
  })
})

describe('row mappers', () => {
  it('maps a compliance_reports row to camelCase with null metadata defaulted', () => {
    const record = mapReportRow({
      id: 'r1',
      user_id: 'user_123',
      chat_id: null,
      document_id: 'doc_9',
      title: 'Privacy Policy Review',
      content: '# Report',
      compliance_score: 82,
      metadata: null,
      created_at: '2026-07-08T00:00:00Z',
      updated_at: '2026-07-08T01:00:00Z',
    })

    expect(record.userId).toBe('user_123')
    expect(record.chatId).toBeNull()
    expect(record.documentId).toBe('doc_9')
    expect(record.complianceScore).toBe(82)
    expect(record.metadata).toEqual({})
  })

  it('maps a report_versions row', () => {
    const record = mapVersionRow({
      id: 'v1',
      report_id: 'r1',
      user_id: 'user_123',
      version_number: 3,
      label: 'Version 3',
      content: '# v3',
      change_note: null,
      created_at: '2026-07-08T02:00:00Z',
    })

    expect(record.reportId).toBe('r1')
    expect(record.versionNumber).toBe(3)
    expect(record.changeNote).toBeNull()
  })

  it('coerces an unknown finding severity to amber instead of crashing', () => {
    const record = mapFindingRow({
      id: 'f1',
      report_id: 'r1',
      user_id: 'user_123',
      severity: 'purple',
      title: 'Odd severity',
      detail: null,
      authority_citation: null,
      authority_source_url: null,
      checklist_item: null,
      is_checklist: false,
      is_checked: false,
      position: 0,
      created_at: '2026-07-08T03:00:00Z',
      updated_at: '2026-07-08T03:00:00Z',
    })

    expect(record.severity).toBe('amber')
  })
})

describe('UnwiredComplianceReportRepository', () => {
  it('throws CompliancePersistenceNotWiredError from every method', () => {
    const repo = new UnwiredComplianceReportRepository()

    expect(() => repo.createReport()).toThrow(CompliancePersistenceNotWiredError)
    expect(() => repo.getReport()).toThrow(CompliancePersistenceNotWiredError)
    expect(() => repo.listReports()).toThrow(CompliancePersistenceNotWiredError)
    expect(() => repo.updateReport()).toThrow(CompliancePersistenceNotWiredError)
    expect(() => repo.deleteReport()).toThrow(CompliancePersistenceNotWiredError)
    expect(() => repo.appendVersion()).toThrow(CompliancePersistenceNotWiredError)
    expect(() => repo.listVersions()).toThrow(CompliancePersistenceNotWiredError)
    expect(() => repo.deleteVersion()).toThrow(CompliancePersistenceNotWiredError)
    expect(() => repo.replaceFindings()).toThrow(CompliancePersistenceNotWiredError)
    expect(() => repo.listFindings()).toThrow(CompliancePersistenceNotWiredError)
    expect(() => repo.setFindingChecked()).toThrow(CompliancePersistenceNotWiredError)
  })
})
