#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/
const VERSION_TAG_PATTERN =
  /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    requireCurrentTag: false,
  }

  for (const arg of argv) {
    if (arg === '--json') {
      args.json = true
    } else if (arg === '--require-current-tag') {
      args.requireCurrentTag = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

export function parseSemver(version) {
  if (typeof version !== 'string') {
    return null
  }

  const match = version.match(SEMVER_PATTERN)

  if (!match) {
    return null
  }

  return {
    raw: version,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] || '',
    build: match[5] || '',
  }
}

export function compareSemver(left, right) {
  const leftParsed = typeof left === 'string' ? parseSemver(left) : left
  const rightParsed = typeof right === 'string' ? parseSemver(right) : right

  if (!leftParsed || !rightParsed) {
    throw new Error('Cannot compare invalid SemVer values')
  }

  for (const key of ['major', 'minor', 'patch']) {
    if (leftParsed[key] !== rightParsed[key]) {
      return leftParsed[key] > rightParsed[key] ? 1 : -1
    }
  }

  if (leftParsed.prerelease === rightParsed.prerelease) {
    return 0
  }

  if (!leftParsed.prerelease) {
    return 1
  }

  if (!rightParsed.prerelease) {
    return -1
  }

  return leftParsed.prerelease.localeCompare(rightParsed.prerelease, 'en', { numeric: true })
}

export function versionFromTag(tag) {
  const match = typeof tag === 'string' ? tag.match(VERSION_TAG_PATTERN) : null
  return match ? tag.slice(1) : null
}

function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.status !== 0) {
    return null
  }

  return result.stdout.trim()
}

function splitLines(value) {
  return value ? value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : []
}

function makeCheck(name, status, message, details = {}) {
  return { name, status, message, details }
}

export function packageVersionChecks(packageJson, packageLockJson) {
  const checks = []
  const packageVersion = packageJson.version
  const parsedVersion = parseSemver(packageVersion)

  checks.push(
    makeCheck(
      'package.version_semver',
      parsedVersion ? 'pass' : 'fail',
      parsedVersion
        ? `Package version ${packageVersion} is valid SemVer.`
        : `Package version ${packageVersion || 'missing'} is not valid SemVer.`,
      { packageVersion }
    )
  )

  checks.push(
    makeCheck(
      'package_lock.version_sync',
      packageLockJson.version === packageVersion ? 'pass' : 'fail',
      packageLockJson.version === packageVersion
        ? 'package-lock top-level version matches package.json.'
        : `package-lock top-level version ${packageLockJson.version || 'missing'} does not match package.json ${packageVersion || 'missing'}.`,
      {
        packageVersion,
        lockfileVersion: packageLockJson.version || null,
      }
    )
  )

  const rootPackage = packageLockJson.packages?.['']
  checks.push(
    makeCheck(
      'package_lock.root_version_sync',
      rootPackage?.version === packageVersion ? 'pass' : 'fail',
      rootPackage?.version === packageVersion
        ? 'package-lock root package version matches package.json.'
        : `package-lock root package version ${rootPackage?.version || 'missing'} does not match package.json ${packageVersion || 'missing'}.`,
      {
        packageVersion,
        rootPackageVersion: rootPackage?.version || null,
      }
    )
  )

  return checks
}

function gitVersionChecks(packageVersion, options) {
  const checks = []
  const exactTag = `v${packageVersion}`
  const headSha = runGit(['rev-parse', 'HEAD'])
  const tagsAtHead = splitLines(runGit(['tag', '--points-at', 'HEAD']))
  const versionTagsAtHead = tagsAtHead.filter((tag) => versionFromTag(tag))
  const reachableTags = splitLines(runGit(['tag', '--merged', 'HEAD', '--list', 'v*']))
    .map((tag) => ({ tag, version: versionFromTag(tag) }))
    .filter((item) => item.version && parseSemver(item.version))
    .sort((left, right) => compareSemver(right.version, left.version))
  const latestReachable = reachableTags[0] || null
  const conflictingHeadTags = versionTagsAtHead.filter((tag) => tag !== exactTag)
  const conflictingHeadTagVersions = conflictingHeadTags
    .map((tag) => ({ tag, version: versionFromTag(tag) }))
    .filter((item) => item.version && parseSemver(item.version))
  const hasNewerConflictingHeadTag = conflictingHeadTagVersions.some(
    (item) => compareSemver(item.version, packageVersion) > 0
  )
  const currentVersionTagStatus =
    versionTagsAtHead.length === 0 || versionTagsAtHead.includes(exactTag)
      ? 'pass'
      : options.requireCurrentTag || hasNewerConflictingHeadTag
        ? 'fail'
        : 'warn'

  checks.push(
    makeCheck(
      'git.head_available',
      headSha ? 'pass' : 'warn',
      headSha ? `Git HEAD is ${headSha.slice(0, 12)}.` : 'Git HEAD could not be read; tag checks are limited.',
      { headSha }
    )
  )

  checks.push(
    makeCheck(
      'git.current_version_tag',
      currentVersionTagStatus,
      versionTagsAtHead.length === 0
        ? 'No version tag is attached to HEAD; this is allowed outside final release tagging.'
        : versionTagsAtHead.includes(exactTag)
          ? `HEAD has matching version tag ${exactTag}.`
          : currentVersionTagStatus === 'warn'
            ? `HEAD has older version tag(s) ${versionTagsAtHead.join(', ')} while package version is ${packageVersion}; this is allowed in non-strict development before tagging the release.`
            : `HEAD has version tag(s) ${versionTagsAtHead.join(', ')} but package version is ${packageVersion}.`,
      {
        exactTag,
        tagsAtHead: versionTagsAtHead,
        conflictingHeadTags,
        conflictingHeadTagVersions,
      }
    )
  )

  checks.push(
    makeCheck(
      'git.require_current_tag',
      !options.requireCurrentTag || versionTagsAtHead.includes(exactTag) ? 'pass' : 'fail',
      options.requireCurrentTag
        ? versionTagsAtHead.includes(exactTag)
          ? `Required release tag ${exactTag} is attached to HEAD.`
          : `Required release tag ${exactTag} is not attached to HEAD.`
        : 'Strict current-tag requirement is disabled.',
      {
        required: options.requireCurrentTag,
        exactTag,
        tagsAtHead: versionTagsAtHead,
      }
    )
  )

  const latestComparison = latestReachable ? compareSemver(latestReachable.version, packageVersion) : null
  checks.push(
    makeCheck(
      'git.latest_reachable_tag',
      latestComparison === null || latestComparison <= 0 ? 'pass' : 'fail',
      latestReachable
        ? latestComparison <= 0
          ? `Latest reachable release tag ${latestReachable.tag} is not newer than package version ${packageVersion}.`
          : `Latest reachable release tag ${latestReachable.tag} is newer than package version ${packageVersion}.`
        : 'No reachable release tags found.',
      {
        packageVersion,
        latestReachableTag: latestReachable?.tag || null,
        latestReachableVersion: latestReachable?.version || null,
      }
    )
  )

  return checks
}

export function buildReleaseIntegrityReport({
  packageJson,
  packageLockJson,
  options = { requireCurrentTag: false },
}) {
  const checks = [
    ...packageVersionChecks(packageJson, packageLockJson),
    ...gitVersionChecks(packageJson.version, options),
  ]
  const failedChecks = checks.filter((check) => check.status === 'fail')
  const warningChecks = checks.filter((check) => check.status === 'warn')

  return {
    ok: failedChecks.length === 0,
    summary: failedChecks.length === 0
      ? warningChecks.length === 0
        ? 'Release integrity checks passed.'
        : `Release integrity checks passed with ${warningChecks.length} warning(s).`
      : `${failedChecks.length} release integrity check(s) failed.`,
    checks,
  }
}

function printReport(report, json) {
  if (json) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log(`LexInsights release integrity: ${report.ok ? 'pass' : 'fail'}`)
  console.log(report.summary)

  for (const check of report.checks) {
    console.log(`- [${check.status}] ${check.name}: ${check.message}`)
  }
}

export function loadProjectVersions(rootDir = process.cwd()) {
  const packageJsonPath = path.join(rootDir, 'package.json')
  const packageLockPath = path.join(rootDir, 'package-lock.json')

  if (!existsSync(packageJsonPath)) {
    throw new Error(`Missing package.json at ${packageJsonPath}`)
  }

  if (!existsSync(packageLockPath)) {
    throw new Error(`Missing package-lock.json at ${packageLockPath}`)
  }

  return {
    packageJson: readJsonFile(packageJsonPath),
    packageLockJson: readJsonFile(packageLockPath),
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    const options = parseArgs()
    const versions = loadProjectVersions()
    const report = buildReleaseIntegrityReport({ ...versions, options })
    printReport(report, options.json)
    process.exitCode = report.ok ? 0 : 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
