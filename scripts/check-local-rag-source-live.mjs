#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'

import ts from 'typescript'

const rootDir = process.cwd()
const dataSourceDir = path.join(rootDir, 'src/lib/services/local-research-data')
const require = createRequire(import.meta.url)

const DEFAULT_TIMEOUT_MS = 8000
const DEFAULT_CONCURRENCY = 4
const USER_AGENT = 'LexInsights-RAG-source-audit/1.0 (+https://lexiph.vercel.app)'

function parsePositiveInteger(value, label) {
  const parsed = Number.parseInt(value, 10)
  assert.ok(Number.isInteger(parsed) && parsed > 0, `${label} must be a positive integer`)
  return parsed
}

function readOption(name) {
  const prefix = `${name}=`
  const index = process.argv.findIndex((arg) => arg === name || arg.startsWith(prefix))

  if (index === -1) {
    return undefined
  }

  const arg = process.argv[index]

  if (arg.startsWith(prefix)) {
    return arg.slice(prefix.length)
  }

  return process.argv[index + 1]
}

function hasFlag(name) {
  return process.argv.includes(name)
}

function printUsage() {
  console.log(`Usage: node scripts/check-local-rag-source-live.mjs [options]

Options:
  --limit <n>          Check the first n source records.
  --sample <n>         Check a deterministic spread of n source records.
  --timeout-ms <n>     Per-request timeout. Default: ${DEFAULT_TIMEOUT_MS}.
  --concurrency <n>    Maximum concurrent source checks. Default: ${DEFAULT_CONCURRENCY}.
  --report <path>      Write a JSON report to the given path.
  --allow-failures     Report failures without exiting nonzero.
  --help               Show this help.

This live audit is intentionally opt-in and should not be wired into CI.`)
}

async function loadAuthoritySources() {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'lexinsights-rag-source-live-'))
  const tempDataDir = path.join(tempDir, 'local-research-data')
  await mkdir(tempDataDir, { recursive: true })

  const transpileToCommonJs = (fileName) => {
    const inputPath = path.join(dataSourceDir, fileName)
    const outputPath = path.join(tempDataDir, fileName.replace(/\.ts$/, '.js'))

    assert.equal(existsSync(inputPath), true, `${fileName} is missing`)

    const source = readFileSync(inputPath, 'utf8')
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        strict: true,
      },
      fileName: inputPath,
    })

    writeFileSync(outputPath, transpiled.outputText, 'utf8')
  }

  for (const fileName of ['types.ts', 'corpus.ts', 'authority-sources.ts']) {
    transpileToCommonJs(fileName)
  }

  try {
    return {
      sources: require(path.join(tempDataDir, 'authority-sources.js')).AUTHORITY_SOURCES,
      cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true })
    throw error
  }
}

function deterministicSample(items, sampleSize) {
  if (sampleSize >= items.length) {
    return items
  }

  if (sampleSize === 1) {
    return [items[0]]
  }

  const selected = []
  const usedIndexes = new Set()
  const maxIndex = items.length - 1

  for (let index = 0; index < sampleSize; index += 1) {
    const sourceIndex = Math.round((index * maxIndex) / (sampleSize - 1))

    if (!usedIndexes.has(sourceIndex)) {
      selected.push(items[sourceIndex])
      usedIndexes.add(sourceIndex)
    }
  }

  return selected
}

function selectedSources(sources, { limit, sample }) {
  let selected = sources

  if (sample !== undefined) {
    selected = deterministicSample(selected, sample)
  }

  if (limit !== undefined) {
    selected = selected.slice(0, limit)
  }

  return selected
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()
  const { headers = {}, ...fetchOptions } = options

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        ...headers,
      },
    })

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      finalUrl: response.url,
      elapsedMs: Date.now() - startedAt,
      lastModified: response.headers.get('last-modified'),
      contentType: response.headers.get('content-type'),
    }
  } catch (error) {
    return {
      ok: false,
      error: error.name === 'AbortError' ? 'Request timed out' : error.message,
      elapsedMs: Date.now() - startedAt,
    }
  } finally {
    clearTimeout(timeout)
  }
}

function shouldFallbackToGet(result) {
  return !result.ok || [403, 405, 406, 501].includes(result.status)
}

async function checkSource(source, timeoutMs) {
  const head = await fetchWithTimeout(source.sourceUrl, { method: 'HEAD' }, timeoutMs)

  if (!shouldFallbackToGet(head)) {
    return {
      authorityId: source.authorityId,
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      method: 'HEAD',
      ...head,
    }
  }

  const get = await fetchWithTimeout(
    source.sourceUrl,
    {
      method: 'GET',
      headers: {
        Range: 'bytes=0-0',
      },
    },
    timeoutMs
  )

  return {
    authorityId: source.authorityId,
    sourceName: source.sourceName,
    sourceUrl: source.sourceUrl,
    method: 'GET',
    headStatus: head.status,
    headError: head.error,
    ...get,
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await mapper(items[currentIndex], currentIndex)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  )

  return results
}

if (hasFlag('--help')) {
  printUsage()
  process.exit(0)
}

const limitValue = readOption('--limit')
const sampleValue = readOption('--sample')
const timeoutValue = readOption('--timeout-ms')
const concurrencyValue = readOption('--concurrency')
const reportPath = readOption('--report')
const allowFailures = hasFlag('--allow-failures')

const limit = limitValue === undefined ? undefined : parsePositiveInteger(limitValue, '--limit')
const sample = sampleValue === undefined ? undefined : parsePositiveInteger(sampleValue, '--sample')
const timeoutMs = timeoutValue === undefined ? DEFAULT_TIMEOUT_MS : parsePositiveInteger(timeoutValue, '--timeout-ms')
const concurrency = concurrencyValue === undefined ? DEFAULT_CONCURRENCY : parsePositiveInteger(concurrencyValue, '--concurrency')

assert.ok(concurrency <= 12, '--concurrency must be 12 or less')

const { sources, cleanup } = await loadAuthoritySources()

try {
  const selected = selectedSources(sources, { limit, sample })
  const startedAt = new Date()
  const results = await mapWithConcurrency(selected, concurrency, (source) => checkSource(source, timeoutMs))
  const reachable = results.filter((result) => result.ok)
  const failed = results.filter((result) => !result.ok)
  const redirected = results.filter((result) => result.finalUrl && result.finalUrl !== result.sourceUrl)
  const report = {
    checkedAt: startedAt.toISOString(),
    totalSources: sources.length,
    checkedSources: selected.length,
    timeoutMs,
    concurrency,
    limit,
    sample,
    allowFailures,
    reachable: reachable.length,
    failed: failed.length,
    redirected: redirected.length,
    results,
  }

  if (reportPath) {
    writeFileSync(path.resolve(rootDir, reportPath), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  }

  console.log('Local RAG live source audit complete.')
  console.log(`Checked: ${selected.length}/${sources.length}; reachable: ${reachable.length}; failed: ${failed.length}; redirected: ${redirected.length}.`)

  for (const result of failed.slice(0, 10)) {
    const detail = result.error || `${result.status} ${result.statusText || ''}`.trim()
    console.log(`FAIL ${result.authorityId}: ${detail} (${result.sourceUrl})`)
  }

  if (failed.length > 10) {
    console.log(`...and ${failed.length - 10} more failures.`)
  }

  if (reportPath) {
    console.log(`Report: ${path.resolve(rootDir, reportPath)}`)
  }

  if (failed.length > 0 && allowFailures) {
    console.log('Live source failures were reported without failing because --allow-failures was provided.')
  }

  if (failed.length > 0 && !allowFailures) {
    process.exitCode = 1
  }
} finally {
  cleanup()
}
