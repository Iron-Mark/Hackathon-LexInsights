#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import ts from 'typescript'

const require = createRequire(import.meta.url)
const { Document, Packer, Paragraph } = require('docx')

const rootDir = process.cwd()
const documentTextSourcePath = path.join(rootDir, 'src/lib/utils/document-text.ts')
const serverExtractionSourcePath = path.join(rootDir, 'src/lib/utils/server-document-extraction.ts')

function transpileTs(sourcePath, replacements = []) {
  assert.equal(existsSync(sourcePath), true, `${path.basename(sourcePath)} is missing`)

  const source = readFileSync(sourcePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true,
    },
    fileName: sourcePath,
  })

  return replacements.reduce(
    (output, [pattern, replacement]) => output.replace(pattern, replacement),
    transpiled.outputText
  )
}

async function loadServerExtractionModule() {
  const tempDir = mkdtempSync(path.join(rootDir, '.document-extraction-test-'))
  const documentTextModulePath = path.join(tempDir, 'document-text.mjs')
  const serverExtractionModulePath = path.join(tempDir, 'server-document-extraction.mjs')

  writeFileSync(documentTextModulePath, transpileTs(documentTextSourcePath), 'utf8')
  writeFileSync(
    serverExtractionModulePath,
    transpileTs(serverExtractionSourcePath, [
      ["from './document-text'", "from './document-text.mjs'"],
    ]),
    'utf8'
  )

  try {
    return {
      module: await import(pathToFileURL(serverExtractionModulePath).href),
      cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true })
    throw error
  }
}

function escapePdfText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function createSimplePdf(text) {
  const stream = [
    'BT',
    '/F1 18 Tf',
    '72 720 Td',
    `(${escapePdfText(text)}) Tj`,
    'ET',
  ].join('\n')
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += object
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer\n<< /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  return Buffer.from(pdf, 'utf8')
}

async function createDocxBuffer(text) {
  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph(text),
        ],
      },
    ],
  })

  return Packer.toBuffer(document)
}

const { module: serverExtraction, cleanup } = await loadServerExtractionModule()

try {
  const { extractServerDocumentText } = serverExtraction
  const { getServerDocumentSignatureMode, MAX_EXTRACTED_DOCUMENT_TEXT_CHARS } = serverExtraction

  const pdfText = 'Barangay procurement RA 12009 compliance test'
  const pdfBuffer = createSimplePdf(pdfText)
  assert.equal(
    getServerDocumentSignatureMode({
      name: 'sample.pdf',
      type: 'application/pdf',
      buffer: pdfBuffer,
    }),
    'server-pdf'
  )
  const pdfResult = await extractServerDocumentText({
    name: 'sample.pdf',
    type: 'application/pdf',
    buffer: pdfBuffer,
  })

  assert.equal(pdfResult.extractionMode, 'server-pdf')
  assert.match(pdfResult.text, new RegExp(pdfText), 'PDF extraction should return readable text')
  assert.deepEqual(pdfResult.warnings, [])

  const docxText = 'Data Privacy Act retention schedule compliance test'
  const docxResult = await extractServerDocumentText({
    name: 'sample.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: await createDocxBuffer(docxText),
  })

  assert.equal(docxResult.extractionMode, 'server-docx')
  assert.match(docxResult.text, new RegExp(docxText), 'DOCX extraction should return readable text')
  assert.ok(Array.isArray(docxResult.warnings), 'DOCX extraction should return a warnings array')

  await assert.rejects(
    () => extractServerDocumentText({
      name: 'notes.txt',
      type: 'text/plain',
      buffer: Buffer.from('Readable text'),
    }),
    /only supports PDF and Word/,
    'Server extraction should reject browser-readable text documents'
  )

  await assert.rejects(
    () => extractServerDocumentText({
      name: 'spoofed.pdf',
      type: 'application/pdf',
      buffer: Buffer.from('this is not a pdf'),
    }),
    /signature does not match/,
    'Server extraction should reject extension and MIME spoofing'
  )

  assert.equal(MAX_EXTRACTED_DOCUMENT_TEXT_CHARS, 250000)

  console.log('Document extraction self-test passed.')
} finally {
  cleanup()
}
