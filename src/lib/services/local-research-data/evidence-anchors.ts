import { LEGAL_CORPUS } from './corpus'
import type { LocalEvidenceAnchor } from './types'

function shortNote(value: string) {
  const compact = value.replace(/\s+/g, ' ').trim()
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact
}

export const EVIDENCE_ANCHORS: LocalEvidenceAnchor[] = LEGAL_CORPUS.flatMap((document) => {
  const anchors: LocalEvidenceAnchor[] = [
    {
      authorityId: document.id,
      label: `${document.statute} source summary`,
      supports: ['summary', 'source'],
      note: shortNote(document.summary),
    },
  ]

  if (document.obligations[0]) {
    anchors.push({
      authorityId: document.id,
      label: `${document.statute} primary checklist anchor`,
      supports: ['obligation', 'procedure'],
      note: shortNote(document.obligations[0]),
    })
  }

  if (document.commonGaps[0]) {
    anchors.push({
      authorityId: document.id,
      label: `${document.statute} common gap anchor`,
      supports: ['gap'],
      note: shortNote(document.commonGaps[0]),
    })
  }

  return anchors
})
