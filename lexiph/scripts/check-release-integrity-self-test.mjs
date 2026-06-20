#!/usr/bin/env node

import assert from 'node:assert/strict'

import {
  buildReleaseIntegrityReport,
  compareSemver,
  loadProjectVersions,
  packageVersionChecks,
  parseArgs,
  parseSemver,
  versionFromTag,
} from './check-release-integrity.mjs'

function getCheck(checks, name) {
  const check = checks.find((item) => item.name === name)
  assert.ok(check, `Expected check ${name} to exist`)
  return check
}

assert.deepEqual(parseArgs([]), {
  json: false,
  requireCurrentTag: false,
})
assert.deepEqual(parseArgs(['--json', '--require-current-tag']), {
  json: true,
  requireCurrentTag: true,
})
assert.throws(() => parseArgs(['--unknown']), /Unknown argument/)

assert.deepEqual(parseSemver('0.3.0'), {
  raw: '0.3.0',
  major: 0,
  minor: 3,
  patch: 0,
  prerelease: '',
  build: '',
})
assert.deepEqual(parseSemver('1.2.3-beta.1+build.5'), {
  raw: '1.2.3-beta.1+build.5',
  major: 1,
  minor: 2,
  patch: 3,
  prerelease: 'beta.1',
  build: 'build.5',
})
assert.equal(parseSemver('01.2.3'), null)
assert.equal(parseSemver('1.2'), null)
assert.equal(parseSemver('latest'), null)

assert.equal(compareSemver('0.3.0', '0.2.9'), 1)
assert.equal(compareSemver('0.3.0', '0.3.0'), 0)
assert.equal(compareSemver('0.3.0-beta.1', '0.3.0'), -1)
assert.equal(compareSemver('1.0.0', '1.0.1'), -1)
assert.throws(() => compareSemver('bad', '1.0.0'), /invalid SemVer/)

assert.equal(versionFromTag('v0.3.0'), '0.3.0')
assert.equal(versionFromTag('v1.2.3-beta.1'), '1.2.3-beta.1')
assert.equal(versionFromTag('0.3.0'), null)
assert.equal(versionFromTag('release-v0.3.0'), null)

const goodPackageJson = {
  name: 'LexInSight',
  version: '0.3.0',
}
const goodPackageLock = {
  name: 'LexInSight',
  version: '0.3.0',
  packages: {
    '': {
      name: 'LexInSight',
      version: '0.3.0',
    },
  },
}
const goodChecks = packageVersionChecks(goodPackageJson, goodPackageLock)
assert.equal(goodChecks.every((check) => check.status === 'pass'), true)

const driftChecks = packageVersionChecks(goodPackageJson, {
  ...goodPackageLock,
  version: '0.2.0',
  packages: {
    '': {
      name: 'LexInSight',
      version: '0.2.0',
    },
  },
})
assert.equal(getCheck(driftChecks, 'package_lock.version_sync').status, 'fail')
assert.equal(getCheck(driftChecks, 'package_lock.root_version_sync').status, 'fail')

const invalidVersionChecks = packageVersionChecks(
  { name: 'LexInSight', version: 'v0.3.0' },
  {
    name: 'LexInSight',
    version: 'v0.3.0',
    packages: {
      '': {
        version: 'v0.3.0',
      },
    },
  }
)
assert.equal(getCheck(invalidVersionChecks, 'package.version_semver').status, 'fail')

const projectVersions = loadProjectVersions()
const projectReport = buildReleaseIntegrityReport({
  ...projectVersions,
  options: { requireCurrentTag: false },
})
assert.equal(projectReport.ok, true, projectReport.summary)
assert.equal(getCheck(projectReport.checks, 'package.version_semver').status, 'pass')
assert.equal(getCheck(projectReport.checks, 'package_lock.version_sync').status, 'pass')
assert.equal(getCheck(projectReport.checks, 'git.latest_reachable_tag').status, 'pass')

console.log('Release integrity self-test passed.')
