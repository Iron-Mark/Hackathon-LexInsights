#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

import ts from 'typescript'

const rootDir = process.cwd()
const sourcePath = path.join(rootDir, 'src/lib/services/local-legal-research.ts')
const dataSourceDir = path.join(rootDir, 'src/lib/services/local-research-data')
const require = createRequire(import.meta.url)

async function loadProviderlessModule() {
  assert.equal(existsSync(sourcePath), true, 'local-legal-research.ts is missing')

  const tempDir = mkdtempSync(path.join(tmpdir(), 'lexinsight-local-rag-performance-'))
  const tempDataDir = path.join(tempDir, 'local-research-data')
  await mkdir(tempDataDir, { recursive: true })

  const transpileToCommonJs = (inputPath, outputPath) => {
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

  for (const fileName of ['types.ts', 'corpus.ts', 'topic-expansions.ts', 'compliance-frameworks.ts']) {
    const inputPath = path.join(dataSourceDir, fileName)
    const outputPath = path.join(tempDataDir, fileName.replace(/\.ts$/, '.js'))

    assert.equal(existsSync(inputPath), true, `${fileName} is missing`)
    transpileToCommonJs(inputPath, outputPath)
  }

  const tempModulePath = path.join(tempDir, 'local-legal-research.js')
  transpileToCommonJs(sourcePath, tempModulePath)

  try {
    return {
      module: require(tempModulePath),
      cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true })
    throw error
  }
}

function percentile(values, ratio) {
  return values[Math.min(values.length - 1, Math.floor(values.length * ratio))]
}

function measure(label, fn, iterations = 180) {
  const times = []

  for (let index = 0; index < iterations; index += 1) {
    const startedAt = performance.now()
    fn(index)
    times.push(performance.now() - startedAt)
  }

  times.sort((left, right) => left - right)

  return {
    label,
    avg: times.reduce((total, value) => total + value, 0) / times.length,
    p50: percentile(times, 0.5),
    p95: percentile(times, 0.95),
    max: times[times.length - 1],
  }
}

function format(value) {
  return `${value.toFixed(2)}ms`
}

const scenarios = [
  {
    label: 'exact citation',
    params: { query: 'What does RA 10173 require for breach response?', user_id: 'performance' },
    p95Limit: 18,
  },
  {
    label: 'AI governance',
    params: {
      query: 'What privacy and governance controls apply to AI chatbots that process personal data in the Philippines?',
      user_id: 'performance',
    },
    p95Limit: 28,
  },
  {
    label: 'deep workflow',
    params: {
      query:
        'What controls apply to BSP supervision, bank loans, lending companies, financing companies, insurance claims, pre-need plans, PDIC deposit insurance, AML, bank secrecy, credit reports, and borrower privacy?',
      user_id: 'performance',
      use_deep_search: true,
    },
    p95Limit: 55,
  },
  {
    label: 'unrelated no-result',
    params: { query: 'How do I bake sourdough bread at high altitude?', user_id: 'performance' },
    p95Limit: 12,
  },
]

const { module: providerless, cleanup } = await loadProviderlessModule()

try {
  const { runLocalResearch } = providerless

  const results = scenarios.map((scenario) => ({
    scenario,
    metrics: measure(
      `${scenario.label} uncached`,
      (index) => runLocalResearch({
        ...scenario.params,
        query: `${scenario.params.query} performance sample ${index}`,
      }),
      90
    ),
  }))

  for (let index = 0; index < 30; index += 1) {
    runLocalResearch(scenarios[1].params)
  }

  const warmCacheMetrics = measure(
    'warm repeated query',
    () => runLocalResearch(scenarios[1].params),
    220
  )

  for (const { scenario, metrics } of results) {
    assert.ok(
      metrics.p95 <= scenario.p95Limit,
      `${scenario.label} p95 ${format(metrics.p95)} exceeded ${format(scenario.p95Limit)}`
    )
  }

  assert.ok(warmCacheMetrics.p95 <= 6, `warm cache p95 ${format(warmCacheMetrics.p95)} exceeded 6.00ms`)

  console.table([
    ...results.map(({ metrics }) => ({
      scenario: metrics.label,
      avg: format(metrics.avg),
      p50: format(metrics.p50),
      p95: format(metrics.p95),
      max: format(metrics.max),
    })),
    {
      scenario: warmCacheMetrics.label,
      avg: format(warmCacheMetrics.avg),
      p50: format(warmCacheMetrics.p50),
      p95: format(warmCacheMetrics.p95),
      max: format(warmCacheMetrics.max),
    },
  ])
  console.log('Local RAG performance self-test passed.')
} finally {
  cleanup()
}
