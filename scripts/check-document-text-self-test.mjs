#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import ts from 'typescript'

const rootDir = process.cwd()
const sourcePath = path.join(rootDir, 'src/lib/utils/document-text.ts')

async function loadDocumentTextModule() {
  assert.equal(existsSync(sourcePath), true, 'document-text.ts is missing')

  const source = readFileSync(sourcePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true,
    },
    fileName: sourcePath,
  })
  const tempDir = mkdtempSync(path.join(tmpdir(), 'lexinsights-document-text-'))
  const tempModulePath = path.join(tempDir, 'document-text.mjs')

  writeFileSync(tempModulePath, transpiled.outputText, 'utf8')

  try {
    return {
      module: await import(pathToFileURL(tempModulePath).href),
      cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true })
    throw error
  }
}

function fakeFile({ name, type = '', size = 64, text = 'Sample text' }) {
  return {
    name,
    type,
    size,
    text: async () => text,
  }
}

const { module: documentText, cleanup } = await loadDocumentTextModule()

try {
  const {
    MAX_BROWSER_TEXT_DOCUMENT_BYTES,
    getComplianceDocumentSupport,
    getDocumentExtension,
    extractComplianceDocumentText,
    isBrowserReadableTextDocument,
    isSupportedComplianceDocument,
    normalizeBrowserDocumentText,
    readBrowserTextDocument,
  } = documentText

  assert.equal(getDocumentExtension('draft.MARKDOWN'), '.markdown', 'Extensions should normalize to lowercase')
  assert.equal(getDocumentExtension('no-extension'), '', 'Files without extensions should return empty extension')

  assert.equal(
    getComplianceDocumentSupport(fakeFile({ name: 'ordinance.md', type: '' })),
    'browser-text',
    'Markdown extension should be browser-readable'
  )
  assert.equal(
    getComplianceDocumentSupport(fakeFile({ name: 'ordinance.bin', type: 'text/plain; charset=utf-8' })),
    'browser-text',
    'Plain text MIME type with charset should be browser-readable'
  )
  assert.equal(
    getComplianceDocumentSupport(fakeFile({ name: 'contract.docx', type: '' })),
    'backend-extraction',
    'Word extension should require backend extraction'
  )
  assert.equal(
    getComplianceDocumentSupport(fakeFile({ name: 'scan.pdf', type: 'application/pdf' })),
    'backend-extraction',
    'PDF MIME type should require backend extraction'
  )
  assert.equal(
    getComplianceDocumentSupport(fakeFile({ name: 'image.png', type: 'image/png' })),
    'unsupported',
    'Images should not be compliance documents'
  )

  assert.equal(isBrowserReadableTextDocument(fakeFile({ name: 'notes.txt' })), true)
  assert.equal(isBrowserReadableTextDocument(fakeFile({ name: 'notes.pdf' })), false)
  assert.equal(isSupportedComplianceDocument(fakeFile({ name: 'notes.pdf' })), true)
  assert.equal(isSupportedComplianceDocument(fakeFile({ name: 'notes.exe' })), false)

  assert.equal(
    normalizeBrowserDocumentText('\uFEFFLine 1\r\nLine 2\rLine 3\u0000'),
    'Line 1\nLine 2\nLine 3',
    'Text normalization should remove BOM, normalize newlines, and strip null bytes'
  )

  assert.equal(
    await readBrowserTextDocument(fakeFile({ name: 'draft.text', text: '\uFEFFSection 1\r\nSection 2\u0000' })),
    'Section 1\nSection 2',
    'Browser text reader should normalize readable documents'
  )

  assert.deepEqual(
    await extractComplianceDocumentText(fakeFile({ name: 'draft.md', type: 'text/markdown', text: 'Policy text' })),
    {
      text: 'Policy text',
      extractionMode: 'browser-text',
      fileName: 'draft.md',
      warnings: [],
    },
    'Top-level extraction should handle browser-readable documents without calling the API route'
  )

  await assert.rejects(
    () => readBrowserTextDocument(fakeFile({ name: 'empty.txt', text: ' \n\t ' })),
    /does not contain readable text/,
    'Empty text files should be rejected'
  )

  await assert.rejects(
    () => readBrowserTextDocument(fakeFile({ name: 'large.txt', size: MAX_BROWSER_TEXT_DOCUMENT_BYTES + 1 })),
    /Maximum browser-readable document size is 5MB/,
    'Oversized text files should be rejected'
  )

  await assert.rejects(
    () => readBrowserTextDocument(fakeFile({ name: 'draft.docx' })),
    /backend-side text extraction/,
    'Word documents should not be read in the browser'
  )

  await assert.rejects(
    () => readBrowserTextDocument(fakeFile({ name: 'archive.zip' })),
    /Unsupported compliance document type/,
    'Unsupported documents should be rejected'
  )

  console.log('Document text self-test passed.')
} finally {
  cleanup()
}
