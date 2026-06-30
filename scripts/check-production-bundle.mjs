#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const DEFAULT_BUILD_DIR = '.next'
const DEFAULT_MAX_STATIC_CHUNK_KB = 1250
const DEFAULT_MAX_GENERATED_ASSET_KB = 750
const CLIENT_RAG_MARKERS = [
  'providerless-local-legal-research',
  'local-research-data',
  'LEGAL_CORPUS',
  'runLocalResearch',
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    buildDir: DEFAULT_BUILD_DIR,
    json: false,
    maxGeneratedAssetKb: DEFAULT_MAX_GENERATED_ASSET_KB,
    maxStaticChunkKb: DEFAULT_MAX_STATIC_CHUNK_KB,
    strictClientRag: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--json') {
      args.json = true
      continue
    }

    if (arg === '--strict-client-rag') {
      args.strictClientRag = true
      continue
    }

    if (arg === '--build-dir') {
      args.buildDir = argv[index + 1] || DEFAULT_BUILD_DIR
      index += 1
      continue
    }

    if (arg.startsWith('--build-dir=')) {
      args.buildDir = arg.slice('--build-dir='.length) || DEFAULT_BUILD_DIR
      continue
    }

    if (arg === '--max-static-chunk-kb') {
      const value = Number(argv[index + 1])
      args.maxStaticChunkKb = Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_STATIC_CHUNK_KB
      index += 1
      continue
    }

    if (arg.startsWith('--max-static-chunk-kb=')) {
      const value = Number(arg.slice('--max-static-chunk-kb='.length))
      args.maxStaticChunkKb = Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_STATIC_CHUNK_KB
      continue
    }

    if (arg === '--max-generated-asset-kb') {
      const value = Number(argv[index + 1])
      args.maxGeneratedAssetKb = Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_GENERATED_ASSET_KB
      index += 1
      continue
    }

    if (arg.startsWith('--max-generated-asset-kb=')) {
      const value = Number(arg.slice('--max-generated-asset-kb='.length))
      args.maxGeneratedAssetKb = Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_GENERATED_ASSET_KB
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function walkFiles(rootDir) {
  if (!existsSync(rootDir)) {
    return []
  }

  const files = []
  const entries = readdirSync(rootDir, { withFileTypes: true })

  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name)

    if (entry.isDirectory()) {
      files.push(...walkFiles(absolutePath))
      continue
    }

    if (entry.isFile()) {
      files.push(absolutePath)
    }
  }

  return files
}

function toRelative(rootDir, absolutePath) {
  return path.relative(rootDir, absolutePath).replaceAll(path.sep, '/')
}

function makeCheck(name, status, message, details = {}) {
  return { name, status, message, details }
}

function largestFiles(files, rootDir, limit = 10) {
  return files
    .map((filePath) => {
      const stat = statSync(filePath)
      return {
        path: toRelative(rootDir, filePath),
        bytes: stat.size,
        kb: Number((stat.size / 1024).toFixed(1)),
      }
    })
    .sort((left, right) => right.bytes - left.bytes)
    .slice(0, limit)
}

function staticChunkChecks(rootDir, options) {
  const chunksDir = path.join(rootDir, options.buildDir, 'static', 'chunks')
  const maxBytes = options.maxStaticChunkKb * 1024

  if (!existsSync(chunksDir)) {
    return [
      makeCheck(
        'bundle.static_chunks.present',
        'fail',
        `${options.buildDir}/static/chunks is missing; run npm run build before checking bundle hygiene.`,
        { chunksDir: toRelative(rootDir, chunksDir) }
      ),
    ]
  }

  const chunkFiles = walkFiles(chunksDir).filter((filePath) => filePath.endsWith('.js'))
  const oversized = largestFiles(chunkFiles, rootDir, chunkFiles.length).filter((file) => file.bytes > maxBytes)

  return [
    makeCheck(
      'bundle.static_chunks.present',
      chunkFiles.length > 0 ? 'pass' : 'fail',
      chunkFiles.length > 0
        ? `Found ${chunkFiles.length} production static JS chunk(s).`
        : 'No production static JS chunks were found.',
      { count: chunkFiles.length }
    ),
    makeCheck(
      'bundle.static_chunks.size',
      oversized.length === 0 ? 'pass' : 'fail',
      oversized.length === 0
        ? `No static JS chunk exceeds ${options.maxStaticChunkKb} KiB.`
        : `${oversized.length} static JS chunk(s) exceed ${options.maxStaticChunkKb} KiB.`,
      {
        maxBytes,
        maxKb: options.maxStaticChunkKb,
        largest: largestFiles(chunkFiles, rootDir),
        oversized: oversized.slice(0, 10),
      }
    ),
  ]
}

function generatedAssetChecks(rootDir, options) {
  const maxBytes = options.maxGeneratedAssetKb * 1024
  const assetRoots = [
    path.join(rootDir, 'docs', 'assets'),
    path.join(rootDir, 'public', 'og'),
    path.join(rootDir, 'public', 'icons'),
    path.join(rootDir, options.buildDir, 'static', 'media'),
  ]
  const assetFiles = assetRoots.flatMap((assetRoot) => walkFiles(assetRoot))
  const oversized = largestFiles(assetFiles, rootDir, assetFiles.length).filter((file) => file.bytes > maxBytes)

  return [
    makeCheck(
      'bundle.generated_assets.size',
      oversized.length === 0 ? 'pass' : 'fail',
      oversized.length === 0
        ? `No generated image/font/media asset exceeds ${options.maxGeneratedAssetKb} KiB.`
        : `${oversized.length} generated image/font/media asset(s) exceed ${options.maxGeneratedAssetKb} KiB.`,
      {
        maxBytes,
        maxKb: options.maxGeneratedAssetKb,
        largest: largestFiles(assetFiles, rootDir),
        oversized: oversized.slice(0, 10),
      }
    ),
  ]
}

function clientRagChecks(rootDir, options) {
  const chunksDir = path.join(rootDir, options.buildDir, 'static', 'chunks')
  const chunkFiles = walkFiles(chunksDir).filter((filePath) => filePath.endsWith('.js'))
  const matches = []

  for (const filePath of chunkFiles) {
    const source = readFileSync(filePath, 'utf8')
    const matchedMarkers = CLIENT_RAG_MARKERS.filter((marker) => source.includes(marker))

    if (matchedMarkers.length > 0) {
      const stat = statSync(filePath)
      matches.push({
        path: toRelative(rootDir, filePath),
        kb: Number((stat.size / 1024).toFixed(1)),
        markers: matchedMarkers,
      })
    }
  }

  const status = matches.length === 0 ? 'pass' : options.strictClientRag ? 'fail' : 'warn'

  return [
    makeCheck(
      'bundle.client_rag_corpus',
      status,
      matches.length === 0
        ? 'No local RAG corpus markers were found in production client chunks.'
        : options.strictClientRag
          ? 'Local RAG corpus markers were found in production client chunks.'
          : 'Local RAG corpus markers were found in production client chunks; tolerated unless --strict-client-rag is used.',
      {
        strict: options.strictClientRag,
        matches: matches.slice(0, 10),
      }
    ),
  ]
}

function buildReport(rootDir, options) {
  const buildPath = path.join(rootDir, options.buildDir)
  const checks = existsSync(buildPath)
    ? [
        ...staticChunkChecks(rootDir, options),
        ...generatedAssetChecks(rootDir, options),
        ...clientRagChecks(rootDir, options),
      ]
    : [
        makeCheck(
          'bundle.build_dir.present',
          'fail',
          `${options.buildDir} is missing; run npm run build before checking bundle hygiene.`,
          { buildDir: options.buildDir }
        ),
      ]
  const failedChecks = checks.filter((check) => check.status === 'fail')
  const warningChecks = checks.filter((check) => check.status === 'warn')

  return {
    ok: failedChecks.length === 0,
    summary:
      failedChecks.length === 0
        ? warningChecks.length === 0
          ? 'Production bundle checks passed.'
          : `Production bundle checks passed with ${warningChecks.length} warning(s).`
        : `${failedChecks.length} production bundle check(s) failed.`,
    checks,
  }
}

function printReport(report, json) {
  if (json) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log(`LexInsights production bundle: ${report.ok ? 'pass' : 'fail'}`)
  console.log(report.summary)

  for (const check of report.checks) {
    console.log(`- [${check.status}] ${check.name}: ${check.message}`)
  }
}

export {
  CLIENT_RAG_MARKERS,
  buildReport,
  clientRagChecks,
  generatedAssetChecks,
  parseArgs,
  staticChunkChecks,
  walkFiles,
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
