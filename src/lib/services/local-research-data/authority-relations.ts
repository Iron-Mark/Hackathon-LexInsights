import { COMPLIANCE_FRAMEWORKS } from './compliance-frameworks'
import type { LocalAuthorityRelation } from './types'

const CURATED_RELATIONS: LocalAuthorityRelation[] = [
  {
    sourceId: 'npc-advisory-2024-04',
    targetId: 'ra-10173',
    type: 'agency_guidance_for',
    label: 'NPC advisory guidance for Data Privacy Act governance',
    weight: 1.2,
  },
  {
    sourceId: 'sc-ai-governance-framework-2026',
    targetId: 'ra-10173',
    type: 'cross_references',
    label: 'AI governance privacy safeguards',
    weight: 1,
  },
  {
    sourceId: 'ra-11930',
    targetId: 'ra-9775',
    type: 'amends',
    label: 'OSAEC/CSAEM amendments to online child-protection framework',
    weight: 1.3,
  },
  {
    sourceId: 'ra-10172',
    targetId: 'ra-9048',
    type: 'amends',
    label: 'Civil registry correction expansion',
    weight: 1.2,
  },
  {
    sourceId: 'ra-10022',
    targetId: 'ra-8042',
    type: 'amends',
    label: 'Migrant worker protection amendments',
    weight: 1.1,
  },
  {
    sourceId: 'ra-11211',
    targetId: 'ra-7653',
    type: 'amends',
    label: 'BSP charter amendments',
    weight: 1.1,
  },
  {
    sourceId: 'ra-11647',
    targetId: 'ra-7042',
    type: 'amends',
    label: 'Foreign investment liberalization amendments',
    weight: 1.1,
  },
  {
    sourceId: 'ra-11595',
    targetId: 'ra-8762',
    type: 'amends',
    label: 'Retail trade liberalization amendments',
    weight: 1.1,
  },
  {
    sourceId: 'ra-12021',
    targetId: 'ra-10635',
    type: 'cross_references',
    label: 'Seafarer welfare and STCW credential relationship',
    weight: 1,
  },
  {
    sourceId: 'ra-9295',
    targetId: 'ra-9993',
    type: 'workflow_related_to',
    label: 'Domestic shipping safety and Coast Guard incident coordination',
    weight: 0.9,
  },
  {
    sourceId: 'ra-9295',
    targetId: 'pd-857',
    type: 'workflow_related_to',
    label: 'Domestic shipping and port-operation coordination',
    weight: 0.9,
  },
  {
    sourceId: 'ra-9369',
    targetId: 'ra-8436',
    type: 'amends',
    label: 'Automated election modernization amendments',
    weight: 1.1,
  },
  {
    sourceId: 'ra-10930',
    targetId: 'ra-4136',
    type: 'amends',
    label: 'Driver license validity amendments',
    weight: 1,
  },
  {
    sourceId: 'ra-11976',
    targetId: 'ra-8424',
    type: 'amends',
    label: 'Ease of Paying Taxes updates to the tax code',
    weight: 1,
  },
  {
    sourceId: 'ra-10963',
    targetId: 'ra-8424',
    type: 'amends',
    label: 'TRAIN tax code amendments',
    weight: 1,
  },
  {
    sourceId: 'ra-11534',
    targetId: 'ra-8424',
    type: 'amends',
    label: 'CREATE tax code amendments',
    weight: 1,
  },
  {
    sourceId: 'ra-12066',
    targetId: 'ra-8424',
    type: 'amends',
    label: 'CREATE MORE tax incentive updates',
    weight: 1,
  },
  {
    sourceId: 'eo-209-1987',
    targetId: 'ra-386',
    type: 'cross_references',
    label: 'Family Code and Civil Code private-law relationship',
    weight: 0.9,
  },
]

const FRAMEWORK_RELATIONS: LocalAuthorityRelation[] = COMPLIANCE_FRAMEWORKS.flatMap((framework) => (
  framework.lawIds.flatMap((sourceId) => (
    framework.lawIds
      .filter((targetId) => targetId !== sourceId)
      .map((targetId) => ({
        sourceId,
        targetId,
        type: 'workflow_related_to' as const,
        label: framework.title,
        weight: 0.45,
      }))
  ))
))

function relationKey(relation: LocalAuthorityRelation) {
  return `${relation.sourceId}:${relation.type}:${relation.targetId}:${relation.label}`
}

export const AUTHORITY_RELATIONS: LocalAuthorityRelation[] = [
  ...CURATED_RELATIONS,
  ...FRAMEWORK_RELATIONS,
].filter((relation, index, relations) => (
  relations.findIndex((candidate) => relationKey(candidate) === relationKey(relation)) === index
))
