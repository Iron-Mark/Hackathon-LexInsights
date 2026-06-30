#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const DEFAULT_MAX_AGE_DAYS = 90
const README_FRESHNESS_TOLERANCE_MS = 10 * 60 * 1000
const EXPECTED_SCREENSHOTS = [
  {
    path: 'docs/assets/lexinsights-chat-desktop.png',
    expectedWidth: 1376,
    expectedHeight: 960,
    maxBytes: 750 * 1024,
  },
  {
    path: 'docs/assets/lexinsights-help-mobile.png',
    expectedWidth: 780,
    expectedHeight: 1688,
    maxBytes: 750 * 1024,
  },
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    maxAgeDays: DEFAULT_MAX_AGE_DAYS,
    skipMtime: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--json') {
      args.json = true
      continue
    }

    if (arg === '--skip-mtime') {
      args.skipMtime = true
      continue
    }

    if (arg === '--max-age-days') {
      const value = Number(argv[index + 1])
      args.maxAgeDays = Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_AGE_DAYS
      index += 1
      continue
    }

    if (arg.startsWith('--max-age-days=')) {
      const value = Number(arg.slice('--max-age-days='.length))
      args.maxAgeDays = Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_AGE_DAYS
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function readText(rootDir, relativePath) {
  return readFileSync(path.join(rootDir, relativePath), 'utf8')
}

function productPreviewBlock(readmeText) {
  const match = readmeText.match(/## Product Preview(?<body>[\s\S]*?)(?:\n## |\n# |$)/)
  return match?.groups?.body || ''
}

function readMarkdownImages(markdown) {
  const images = []
  const imagePattern = /!\[(?<alt>[^\]]*)\]\((?<target>[^)]+)\)/g
  let match = imagePattern.exec(markdown)

  while (match) {
    images.push({
      alt: match.groups.alt.trim(),
      target: match.groups.target.trim(),
    })
    match = imagePattern.exec(markdown)
  }

  return images
}

function readPngSize(filePath) {
  const buffer = readFileSync(filePath)

  if (
    buffer.length < 24 ||
    buffer.readUInt8(0) !== 0x89 ||
    buffer.subarray(1, 4).toString('ascii') !== 'PNG'
  ) {
    throw new Error(`${filePath} is not a PNG file`)
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

function makeCheck(name, status, message, details = {}) {
  return { name, status, message, details }
}

function screenshotChecks(rootDir, options) {
  const readmePath = path.join(rootDir, 'README.md')
  const readmeText = readText(rootDir, 'README.md')
  const readmeStat = statSync(readmePath)
  const previewImages = readMarkdownImages(productPreviewBlock(readmeText))
  const expectedPaths = EXPECTED_SCREENSHOTS.map((item) => item.path)
  const referencedPaths = previewImages.map((image) => image.target)
  const checks = [
    makeCheck(
      'readme.product_preview.count',
      previewImages.length === EXPECTED_SCREENSHOTS.length ? 'pass' : 'fail',
      previewImages.length === EXPECTED_SCREENSHOTS.length
        ? 'README Product Preview references the expected number of screenshots.'
        : `README Product Preview references ${previewImages.length} screenshot(s); expected ${EXPECTED_SCREENSHOTS.length}.`,
      {
        expectedPaths,
        referencedPaths,
      }
    ),
  ]

  for (const expected of EXPECTED_SCREENSHOTS) {
    const absolutePath = path.join(rootDir, expected.path)
    const image = previewImages.find((item) => item.target === expected.path)

    checks.push(
      makeCheck(
        `readme.screenshot_reference:${expected.path}`,
        image ? 'pass' : 'fail',
        image
          ? `${expected.path} is referenced from README Product Preview.`
          : `${expected.path} is not referenced from README Product Preview.`,
        {
          alt: image?.alt || null,
        }
      )
    )

    if (!existsSync(absolutePath)) {
      checks.push(
        makeCheck(
          `asset.exists:${expected.path}`,
          'fail',
          `${expected.path} is missing.`,
          { expectedPath: expected.path }
        )
      )
      continue
    }

    const stat = statSync(absolutePath)
    const size = readPngSize(absolutePath)
    const dimensionsMatch = size.width === expected.expectedWidth && size.height === expected.expectedHeight
    const underByteBudget = stat.size <= expected.maxBytes
    const ageDays = (Date.now() - stat.mtimeMs) / 86_400_000
    const freshByAge = ageDays <= options.maxAgeDays
    const freshAgainstReadme =
      options.skipMtime || stat.mtimeMs + README_FRESHNESS_TOLERANCE_MS >= readmeStat.mtimeMs

    checks.push(
      makeCheck(
        `asset.dimensions:${expected.path}`,
        dimensionsMatch ? 'pass' : 'fail',
        dimensionsMatch
          ? `${expected.path} is ${size.width}x${size.height}.`
          : `${expected.path} is ${size.width}x${size.height}; expected ${expected.expectedWidth}x${expected.expectedHeight}.`,
        {
          expectedWidth: expected.expectedWidth,
          expectedHeight: expected.expectedHeight,
          ...size,
        }
      )
    )

    checks.push(
      makeCheck(
        `asset.size:${expected.path}`,
        underByteBudget ? 'pass' : 'fail',
        underByteBudget
          ? `${expected.path} is ${(stat.size / 1024).toFixed(1)} KiB.`
          : `${expected.path} is ${(stat.size / 1024).toFixed(1)} KiB; limit is ${(expected.maxBytes / 1024).toFixed(1)} KiB.`,
        {
          bytes: stat.size,
          maxBytes: expected.maxBytes,
        }
      )
    )

    checks.push(
      makeCheck(
        `asset.freshness:${expected.path}`,
        freshByAge && freshAgainstReadme ? 'pass' : 'fail',
        freshByAge && freshAgainstReadme
          ? `${expected.path} is fresh enough for README preview use.`
          : `${expected.path} may be stale; regenerate the README preview screenshots before release.`,
        {
          maxAgeDays: options.maxAgeDays,
          ageDays: Number(ageDays.toFixed(2)),
          readmeLastModifiedUtc: readmeStat.mtime.toISOString(),
          assetLastModifiedUtc: stat.mtime.toISOString(),
          skipMtime: options.skipMtime,
        }
      )
    )
  }

  return checks
}

function buildReport(rootDir, options) {
  const checks = screenshotChecks(rootDir, options)
  const failedChecks = checks.filter((check) => check.status === 'fail')

  return {
    ok: failedChecks.length === 0,
    summary:
      failedChecks.length === 0
        ? 'README screenshot checks passed.'
        : `${failedChecks.length} README screenshot check(s) failed.`,
    regenerationHint:
      'Regenerate previews from a fresh local build, then replace docs/assets/lexinsights-chat-desktop.png and docs/assets/lexinsights-help-mobile.png.',
    checks,
  }
}

function printReport(report, json) {
  if (json) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log(`LexInsights README screenshots: ${report.ok ? 'pass' : 'fail'}`)
  console.log(report.summary)

  for (const check of report.checks) {
    console.log(`- [${check.status}] ${check.name}: ${check.message}`)
  }

  if (!report.ok) {
    console.log(`Hint: ${report.regenerationHint}`)
  }
}

export {
  EXPECTED_SCREENSHOTS,
  buildReport,
  parseArgs,
  productPreviewBlock,
  readMarkdownImages,
  readPngSize,
  screenshotChecks,
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs()
    const report = buildReport(process.cwd(), options)
    printReport(report, options.json)
    process.exitCode = report.ok ? 0 : 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
