import { AUTHORITY_RELATIONS } from './authority-relations'
import { AUTHORITY_SOURCES } from './authority-sources'
import { COMPLIANCE_FRAMEWORKS } from './compliance-frameworks'

/**
 * Weight stamped on every framework-derived relation (the dense per-framework
 * cross-product of law pairs). Hand-curated relations always use weights in the
 * 0.75–1.35 range, so this value cleanly separates the two. See
 * `authority-relations.ts` (`FRAMEWORK_RELATIONS`).
 */
const FRAMEWORK_RELATION_WEIGHT = 0.45

export interface SourceFamilyCoverage {
  /** Distinct source-family name as recorded on each authority (e.g. "Lawphil"). */
  sourceName: string
  /** Number of bundled authorities attributed to this source family. */
  authorityCount: number
  /** Most-recent `lastVerified` date (ISO `YYYY-MM-DD`) across the family's authorities. */
  lastVerified: string
}

export interface CoverageSummary {
  /** Total bundled legal authorities in the local corpus. */
  totalAuthorities: number
  /** Distinct source families the authorities are attributed to. */
  sourceFamilyCount: number
  /** Bundled compliance frameworks. */
  frameworkCount: number
  /**
   * Hand-curated authority relations (amends, implements, cross-references,
   * agency guidance, requires, and curated workflow links). Excludes the dense
   * framework-derived cross-product edges so the figure matches what the app
   * advertises elsewhere as "curated authority relations".
   */
  curatedRelationCount: number
  /** Per-source-family breakdown, sorted by authority count (desc), then name. */
  families: SourceFamilyCoverage[]
}

/**
 * Aggregate visible coverage metadata from the bundled local-research-data
 * modules. Pure, dependency-free, and side-effect-free so it can run in the
 * browser and in a Node self-test. Every number is derived from the existing
 * data — nothing here authors or grows the corpus.
 */
export function buildCoverageSummary(): CoverageSummary {
  const familyByName = new Map<string, { authorityCount: number; lastVerified: string }>()

  for (const source of AUTHORITY_SOURCES) {
    const existing = familyByName.get(source.sourceName)

    if (existing) {
      existing.authorityCount += 1
      // ISO `YYYY-MM-DD` dates compare correctly as strings.
      if (source.lastVerified > existing.lastVerified) {
        existing.lastVerified = source.lastVerified
      }
    } else {
      familyByName.set(source.sourceName, {
        authorityCount: 1,
        lastVerified: source.lastVerified,
      })
    }
  }

  const families: SourceFamilyCoverage[] = Array.from(familyByName.entries())
    .map(([sourceName, family]) => ({
      sourceName,
      authorityCount: family.authorityCount,
      lastVerified: family.lastVerified,
    }))
    .sort((a, b) =>
      b.authorityCount - a.authorityCount || a.sourceName.localeCompare(b.sourceName)
    )

  return {
    totalAuthorities: AUTHORITY_SOURCES.length,
    sourceFamilyCount: familyByName.size,
    frameworkCount: COMPLIANCE_FRAMEWORKS.length,
    curatedRelationCount: AUTHORITY_RELATIONS.filter(
      (relation) => relation.weight !== FRAMEWORK_RELATION_WEIGHT
    ).length,
    families,
  }
}
