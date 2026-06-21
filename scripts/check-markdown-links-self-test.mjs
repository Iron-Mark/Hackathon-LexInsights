#!/usr/bin/env node

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  cleanTarget,
  collectBrokenLinks,
  collectHtmlAttributeLinks,
  collectInlineLinks,
  collectReferenceLinks,
  findInlineDestinationEnd,
  maskFencedCodeBlocks,
  walkMarkdownFiles,
  withoutAnchor,
} from './check-markdown-links.mjs'

assert.equal(cleanTarget('./docs/SETUP.md'), './docs/SETUP.md')
assert.equal(cleanTarget('./docs/SETUP.md "Setup guide"'), './docs/SETUP.md')
assert.equal(cleanTarget('<./docs/My Guide.md>'), './docs/My Guide.md')
assert.equal(cleanTarget('<./docs/My Guide.md> "Guide title"'), './docs/My Guide.md')
assert.equal(cleanTarget('<./docs/Guide (Draft).md> "Draft guide"'), './docs/Guide (Draft).md')
assert.equal(cleanTarget('https://example.com/docs.md'), null)
assert.equal(cleanTarget('mailto:support@example.com'), null)
assert.equal(cleanTarget('#local-anchor'), null)
assert.equal(withoutAnchor('./docs/SETUP.md#environment'), './docs/SETUP.md')

const markdown = [
  '[Setup](./docs/SETUP.md "Setup guide")',
  '[Spaced](<./docs/My Guide.md> "Spaced guide")',
  '[Parenthesized](<./docs/Guide (Draft).md> "Draft guide")',
  '[Nested](./docs/Guide-(Draft).md)',
  '<a href="./docs/SETUP.md">Setup HTML link</a>',
  '<img src="./docs/My Guide.md" alt="Guide" />',
  '<a href="https://example.com">External HTML link</a>',
  '',
  '```ts',
  'const values = state.messages[chatId] || []',
  'const next = [data, ...values]',
  '```',
  '',
  '[Reference]: <./docs/DEPLOYMENT.md> "Deployment guide"',
].join('\n')

const masked = maskFencedCodeBlocks(markdown)
const nestedStart = masked.indexOf('./docs/Guide-(Draft).md')

assert.equal(findInlineDestinationEnd(masked, nestedStart), nestedStart + './docs/Guide-(Draft).md'.length)

assert.equal(masked.includes('state.messages[chatId]'), false)

const inlineLinks = collectInlineLinks('README.md', masked)
assert.deepEqual(
  inlineLinks.map((link) => ({ line: link.line, target: link.target })),
  [
    { line: 1, target: './docs/SETUP.md' },
    { line: 2, target: './docs/My Guide.md' },
    { line: 3, target: './docs/Guide (Draft).md' },
    { line: 4, target: './docs/Guide-(Draft).md' },
  ]
)

const referenceLinks = collectReferenceLinks('README.md', masked)
assert.deepEqual(
  referenceLinks.map((link) => ({ line: link.line, target: link.target })),
  [{ line: 13, target: './docs/DEPLOYMENT.md' }]
)

const htmlLinks = collectHtmlAttributeLinks('README.md', masked)
assert.deepEqual(
  htmlLinks.map((link) => ({ line: link.line, target: link.target })),
  [
    { line: 5, target: './docs/SETUP.md' },
    { line: 6, target: './docs/My Guide.md' },
  ]
)

const fixtureRoot = mkdtempSync(join(tmpdir(), 'lexinsight-md-links-'))

try {
  mkdirSync(join(fixtureRoot, 'docs'))
  mkdirSync(join(fixtureRoot, 'ignored', 'node_modules'), { recursive: true })
  writeFileSync(join(fixtureRoot, 'docs', 'valid.md'), '# Valid\n')
  writeFileSync(join(fixtureRoot, 'docs', 'Guide (Draft).md'), '# Draft\n')
  writeFileSync(
    join(fixtureRoot, 'README.md'),
    [
      '[Valid](./docs/valid.md)',
      '[Parenthesized](<./docs/Guide (Draft).md> "Draft guide")',
      '<a href="./docs/valid.md">Valid HTML link</a>',
      '<img src="./docs/Guide (Draft).md" alt="Draft" />',
      '[Broken](./docs/missing.md)',
      '<a href="./docs/missing-html.md">Broken HTML link</a>',
      '[Reference]: <./docs/valid.md> "Valid reference"',
      '',
      '```ts',
      'const fake = [broken](./docs/not-real.md)',
      '```',
    ].join('\n')
  )
  writeFileSync(join(fixtureRoot, 'ignored', 'node_modules', 'ignored.md'), '[Broken](./missing.md)')

  const markdownFiles = walkMarkdownFiles(fixtureRoot)
  assert.deepEqual(
    markdownFiles.map((file) => file.slice(fixtureRoot.length + 1).replace(/\\/g, '/')).sort(),
    ['README.md', 'docs/Guide (Draft).md', 'docs/valid.md']
  )

  assert.deepEqual(collectBrokenLinks(markdownFiles, fixtureRoot), [
    {
      file: 'README.md',
      line: 5,
      target: './docs/missing.md',
    },
    {
      file: 'README.md',
      line: 6,
      target: './docs/missing-html.md',
    },
  ])
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true })
}

console.log('Markdown link checker self-test passed.')
