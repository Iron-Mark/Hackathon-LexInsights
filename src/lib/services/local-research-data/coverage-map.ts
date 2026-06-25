import { COMPLIANCE_FRAMEWORKS } from './compliance-frameworks'
import { LEGAL_CORPUS } from './corpus'
import type { LocalAuthorityCoverage, LocalCoverageStatus } from './types'

const GOLDEN_AUTHORITY_IDS = new Set([
  'ra-10173',
  'npc-circular-16-03',
  'npc-advisory-2026-02',
  'npc-circular-2023-06',
  'npc-circular-2023-04',
  'npc-circular-2022-04',
  'npc-circular-2020-03',
  'npc-advisory-2025-02',
  'ra-11898',
  'ra-8792',
  'ra-8293',
  'ra-8799',
  'ra-7653',
  'ra-11127',
  'ra-8791',
  'ra-10607',
  'ra-12009',
  'ra-11966',
  'ra-11032',
  'ra-9155',
  'ra-10157',
  'ra-12199',
  'ra-10650',
  'ra-11650',
  'pd-807',
  'eo-292-1987',
  'ra-7160',
  'ra-9048',
  'ra-10172',
  'ra-10932',
  'ra-8344',
  'ra-9439',
  'ra-4226',
  'ra-11930',
  'ra-9775',
  'ra-7394',
  'ra-11967',
  'dti-jao-24-03-2024',
  'ra-11765',
  'bsp-circular-1160-2022',
  'bsp-circular-1169-2023',
  'ra-12010',
  'bsp-circular-1140-2022',
  'bsp-circular-1108-2021',
  'ra-10168',
  'ra-11479',
  'ra-8424',
  'ra-11976',
  'ra-12023',
  'bir-rr-2025-03',
  'bir-rmc-2025-47',
  'ra-10963',
  'ra-11534',
  'ra-12066',
  'pd-1586',
  'ra-9147',
  'pd-705',
  'ra-9593',
  'ra-4136',
  'ra-10586',
  'ra-10913',
  'ra-11229',
  'pd-1096',
  'ra-4566',
  'ra-9266',
  'ra-544',
  'ra-7920',
  'ra-8495',
  'ra-1378',
  'pd-856',
  'bp-344',
  'ra-9994',
  'ra-7277',
  'ra-9442',
  'ra-10070',
  'ra-10524',
  'ra-10754',
  'ra-11659',
  'ra-9136',
  'ra-7638',
  'ra-8479',
  'ra-11592',
  'ra-9367',
  'ra-7925',
  'pd-198-water-districts',
  'ra-9295',
  'ra-10635',
  'ra-9993',
  'ra-12021',
  'ra-9497',
  'pd-857',
  'ra-11573',
  'ra-10023',
  'ra-11231',
  'ra-6657',
  'ra-9700',
  'ra-11953',
  'ra-10066',
  'ra-10410',
  'dole-do-147-15',
  'dole-do-174-17',
  'dole-do-198-18',
  'sec-mc-28-2020',
  'ra-4726',
  'bp-220',
  'ra-8981',
  'ra-10912',
  'ra-10918',
  'ra-9502',
  'ra-10643',
  'ra-12022',
  'ra-11642',
  'ra-11222',
  'ra-11767',
  'ra-8435',
  'ra-10068',
  'ra-10611',
  'ra-11321',
  'sc-ai-governance-framework-2026',
  'npc-advisory-2024-04',
])

const DRAFT_CHECK_AUTHORITY_IDS = new Set([
  'ra-9003',
  'ra-11898',
  'ra-10173',
  'npc-circular-16-03',
  'npc-advisory-2026-02',
  'npc-circular-2023-06',
  'npc-circular-2023-04',
  'npc-circular-2022-04',
  'npc-circular-2020-03',
  'npc-advisory-2025-02',
  'ra-11058',
  'ra-9514',
  'ra-7160',
  'ra-10932',
  'pd-1586',
  'ra-9147',
  'pd-705',
  'ra-9593',
  'ra-9295',
  'ra-10635',
  'ra-9993',
  'ra-12021',
  'ra-9497',
  'pd-857',
  'ra-11127',
  'ra-9160',
  'ra-10168',
  'ra-11479',
  'ra-7638',
  'ra-8479',
  'ra-11592',
  'ra-9367',
  'ra-11573',
  'ra-10023',
  'ra-11231',
  'ra-6657',
  'ra-9700',
  'ra-11953',
  'ra-11642',
  'ra-11222',
  'ra-11767',
  'ra-9994',
  'ra-7277',
  'ra-9442',
  'ra-10070',
  'ra-10524',
  'ra-10754',
  'ra-12023',
  'bir-rr-2025-03',
])

const FRAMEWORK_IDS_BY_AUTHORITY_ID = COMPLIANCE_FRAMEWORKS.reduce((index, framework) => {
  for (const lawId of framework.lawIds) {
    const frameworkIds = index.get(lawId) || []
    frameworkIds.push(framework.id)
    index.set(lawId, frameworkIds)
  }

  return index
}, new Map<string, string[]>())

function getCoverageStatus(authorityId: string): LocalCoverageStatus {
  if (GOLDEN_AUTHORITY_IDS.has(authorityId)) {
    return 'golden'
  }

  if (DRAFT_CHECK_AUTHORITY_IDS.has(authorityId)) {
    return 'draft'
  }

  if ((FRAMEWORK_IDS_BY_AUTHORITY_ID.get(authorityId) || []).length > 0) {
    return 'framework'
  }

  return 'seeded'
}

export const AUTHORITY_COVERAGE: LocalAuthorityCoverage[] = LEGAL_CORPUS.map((document) => {
  const frameworkIds = FRAMEWORK_IDS_BY_AUTHORITY_ID.get(document.id) || []
  const coverageStatus = getCoverageStatus(document.id)

  return {
    authorityId: document.id,
    coverageStatus,
    goldenQueryLabels: GOLDEN_AUTHORITY_IDS.has(document.id) ? ['local-rag-golden'] : [],
    draftCheckCovered: DRAFT_CHECK_AUTHORITY_IDS.has(document.id),
    frameworkIds,
    notes: coverageStatus === 'seeded'
      ? 'Seeded corpus record; add a direct golden query when this authority becomes a primary retrieval target.'
      : undefined,
  }
})
