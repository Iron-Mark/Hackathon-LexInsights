import { NextRequest, NextResponse } from 'next/server'

import packageJson from '@/package.json'

export const dynamic = 'force-dynamic'

const COMMIT_ENV_KEYS = [
  'COMMIT_SHA',
  'VERCEL_GIT_COMMIT_SHA',
  'GITHUB_SHA',
  'NEXT_PUBLIC_APP_COMMIT_SHA',
]

function firstEnvValue(keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim()

    if (value) {
      return value
    }
  }

  return null
}

function getEnvValue(name: string) {
  return process.env[name]?.trim() || null
}

function compareSha(actualSha: string | null, expectedSha: string | null) {
  if (!expectedSha) {
    return null
  }

  if (!actualSha) {
    return false
  }

  const actual = actualSha.toLowerCase()
  const expected = expectedSha.toLowerCase()

  return actual === expected || actual.startsWith(expected) || expected.startsWith(actual)
}

export async function GET(request: NextRequest) {
  const expectedSha = request.nextUrl.searchParams.get('expectedSha')?.trim() || null
  const commitSha = firstEnvValue(COMMIT_ENV_KEYS)

  return NextResponse.json(
    {
      app: 'LexInSight',
      packageVersion: packageJson.version,
      checkedAt: new Date().toISOString(),
      source: {
        provider: getEnvValue('VERCEL') === '1' ? 'vercel' : 'local',
        environment: getEnvValue('VERCEL_ENV') || process.env.NODE_ENV || 'unknown',
        branch: getEnvValue('VERCEL_GIT_COMMIT_REF') || getEnvValue('GITHUB_REF_NAME'),
        commitSha,
        commitShortSha: commitSha?.slice(0, 7) || null,
        repoOwner: getEnvValue('VERCEL_GIT_REPO_OWNER') || getEnvValue('GITHUB_REPOSITORY_OWNER'),
        repoSlug: getEnvValue('VERCEL_GIT_REPO_SLUG') || getEnvValue('GITHUB_REPOSITORY')?.split('/').at(1) || null,
      },
      deployment: {
        url: getEnvValue('VERCEL_URL'),
        productionUrl: getEnvValue('VERCEL_PROJECT_PRODUCTION_URL'),
      },
      expected: expectedSha
        ? {
            commitSha: expectedSha,
            matches: compareSha(commitSha, expectedSha),
          }
        : null,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
