/**
 * RAG API test utility for the Philippine Legislative Research backend.
 *
 * Run with a TypeScript runner when manual backend diagnostics are needed.
 */

import fs from 'node:fs'

import { healthCheck, ragSummary } from '../src/lib/api/rag-service'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60))
  log(title, 'cyan')
  console.log('='.repeat(60) + '\n')
}

async function testHealthCheck() {
  logSection('TEST 1: Health Check')

  try {
    log('Checking API health...', 'blue')
    const health = await healthCheck()

    log('OK: Health check passed', 'green')
    console.log('Response:', JSON.stringify(health, null, 2))
    return true
  } catch (error) {
    log('FAIL: Health check failed', 'red')
    console.error('Error:', error)
    return false
  }
}

async function testSimpleQuery() {
  logSection('TEST 2: Simple Query - RA 9003')

  const query = 'What is RA 9003 and its main requirements?'

  try {
    log(`Query: "${query}"`, 'blue')
    log('Sending request... (remote RAG may take longer; local fallback is immediate)', 'yellow')

    const startTime = Date.now()
    const response = await ragSummary(query, 'test-user')
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    log(`OK: Query completed in ${duration} seconds`, 'green')
    console.log('\nResponse Status:', response.status)
    console.log('Documents Found:', response.documents_found)
    console.log('Search Queries Used:', response.search_queries_used?.length || 0)

    if (response.processing_stages) {
      console.log('\nProcessing Stages:')
      console.log('  - Query Generator:', response.processing_stages.query_generator)
      console.log('  - Search Executor:', response.processing_stages.search_executor)
      console.log('  - Summarizer:', response.processing_stages.summarizer)
    }

    console.log('\n--- Summary Preview (first 500 chars) ---')
    console.log(response.summary.substring(0, 500) + '...')
    console.log('--- End Preview ---\n')

    return true
  } catch (error) {
    log('FAIL: Query failed', 'red')
    console.error('Error:', error)
    return false
  }
}

async function testComplexQuery() {
  logSection('TEST 3: Complex Query - Multiple Laws')

  const query =
    'What are the workplace safety requirements under Philippine law and what penalties apply for non-compliance?'

  try {
    log(`Query: "${query}"`, 'blue')
    log('Sending request... (remote RAG may take longer; local fallback is immediate)', 'yellow')

    const startTime = Date.now()
    const response = await ragSummary(query, 'test-user')
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    log(`OK: Query completed in ${duration} seconds`, 'green')
    console.log('\nResponse Status:', response.status)
    console.log('Documents Found:', response.documents_found)

    console.log('\n--- Summary Preview (first 500 chars) ---')
    console.log(response.summary.substring(0, 500) + '...')
    console.log('--- End Preview ---\n')

    return true
  } catch (error) {
    log('FAIL: Query failed', 'red')
    console.error('Error:', error)
    return false
  }
}

async function testDataPrivacyQuery() {
  logSection('TEST 4: Data Privacy Act Query')

  const query =
    'What is the Data Privacy Act of 2012 (RA 10173) and what are the requirements for businesses?'

  try {
    log(`Query: "${query}"`, 'blue')
    log('Sending request... (remote RAG may take longer; local fallback is immediate)', 'yellow')

    const startTime = Date.now()
    const response = await ragSummary(query, 'test-user')
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    log(`OK: Query completed in ${duration} seconds`, 'green')
    console.log('\nResponse Status:', response.status)
    console.log('Documents Found:', response.documents_found)

    fs.mkdirSync('./.tmp/test-results', { recursive: true })
    const outputPath = './.tmp/test-results/rag-test-output.txt'
    fs.writeFileSync(outputPath, response.summary)
    log(`\nOK: Full summary saved to: ${outputPath}`, 'green')

    return true
  } catch (error) {
    log('FAIL: Query failed', 'red')
    console.error('Error:', error)
    return false
  }
}

async function testErrorHandling() {
  logSection('TEST 5: Error Handling - Empty Query')

  try {
    log('Testing with empty query...', 'blue')
    await ragSummary('', 'test-user')

    log('FAIL: Should have thrown an error', 'red')
    return false
  } catch (error) {
    log('OK: Error handling works correctly', 'green')
    console.log('Error message:', error instanceof Error ? error.message : error)
    return true
  }
}

async function runAllTests() {
  logSection('RAG API Test Suite - LexInsights')

  log(`API Base URL: ${process.env.NEXT_PUBLIC_RAG_API_URL || 'https://devkada.resqlink.org'}`, 'blue')
  log('Endpoint: POST /api/research/rag-summary', 'blue')
  log('Providerless fallback: enabled through maintained service layer\n', 'blue')

  const results = {
    passed: 0,
    failed: 0,
    total: 0,
  }

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Simple Query', fn: testSimpleQuery },
    { name: 'Complex Query', fn: testComplexQuery },
    { name: 'Data Privacy Query', fn: testDataPrivacyQuery },
    { name: 'Error Handling', fn: testErrorHandling },
  ]

  for (const test of tests) {
    results.total++
    const passed = await test.fn()

    if (passed) {
      results.passed++
    } else {
      results.failed++
    }

    if (test !== tests[tests.length - 1]) {
      log('\nWaiting 2 seconds before next test...', 'yellow')
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  logSection('Test Results Summary')

  log(`Total Tests: ${results.total}`, 'blue')
  log(`Passed: ${results.passed}`, 'green')
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green')

  const successRate = ((results.passed / results.total) * 100).toFixed(1)
  log(`\nSuccess Rate: ${successRate}%`, successRate === '100.0' ? 'green' : 'yellow')

  if (results.failed === 0) {
    log('\nOK: All tests passed.', 'green')
  } else {
    log('\nWARN: Some tests failed. Check the output above for details.', 'yellow')
  }
}

runAllTests().catch((error) => {
  log('\nFAIL: Test suite failed with error:', 'red')
  console.error(error)
  process.exit(1)
})
