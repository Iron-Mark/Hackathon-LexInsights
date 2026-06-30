import {
  MAX_BROWSER_TEXT_DOCUMENT_BYTES,
  getComplianceDocumentSupport,
  getDocumentExtension,
  normalizeBrowserDocumentText,
} from './document-text'

export const MAX_EXTRACTED_DOCUMENT_TEXT_CHARS = 250000

export type ServerDocumentExtractionMode = 'server-pdf' | 'server-docx' | 'server-doc'

export type ServerDocumentExtractionResult = {
  text: string
  extractionMode: ServerDocumentExtractionMode
  warnings: string[]
}

export type ServerDocumentInput = {
  name: string
  type?: string
  buffer: Buffer
}

function hasSignature(buffer: Buffer, signature: number[]) {
  return signature.every((byte, index) => buffer[index] === byte)
}

export function getServerDocumentSignatureMode(input: ServerDocumentInput): ServerDocumentExtractionMode | null {
  const extension = getDocumentExtension(input.name)
  const mimeType = (input.type || '').split(';')[0].trim().toLowerCase()
  const isPdf = extension === '.pdf' || mimeType === 'application/pdf'
  const isDocx = extension === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  const isDoc = extension === '.doc' || mimeType === 'application/msword'

  if (isPdf) {
    return hasSignature(input.buffer, [0x25, 0x50, 0x44, 0x46]) ? 'server-pdf' : null
  }

  if (isDocx) {
    return hasSignature(input.buffer, [0x50, 0x4b, 0x03, 0x04]) ||
      hasSignature(input.buffer, [0x50, 0x4b, 0x05, 0x06]) ||
      hasSignature(input.buffer, [0x50, 0x4b, 0x07, 0x08])
      ? 'server-docx'
      : null
  }

  if (isDoc) {
    return hasSignature(input.buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
      ? 'server-doc'
      : null
  }

  return null
}

export async function extractPdfTextFromBuffer(buffer: Buffer) {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: buffer })

  try {
    const result = await parser.getText()
    return result.text || ''
  } finally {
    await parser.destroy()
  }
}

export async function extractDocxTextFromBuffer(buffer: Buffer) {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })

  return {
    text: result.value || '',
    warnings: result.messages.map((message) => message.message).filter(Boolean),
  }
}

export async function extractLegacyDocTextFromBuffer(buffer: Buffer) {
  const { default: WordExtractor } = await import('word-extractor')
  const extractor = new WordExtractor()
  const document = await extractor.extract(buffer)
  const parts = [
    document.getBody(),
    document.getFootnotes(),
    document.getEndnotes(),
  ].filter((part: string) => part.trim().length > 0)

  return parts.join('\n\n')
}

export async function extractServerDocumentText(input: ServerDocumentInput): Promise<ServerDocumentExtractionResult> {
  const support = getComplianceDocumentSupport(input)

  if (support !== 'backend-extraction') {
    throw new Error('Server extraction only supports PDF and Word documents.')
  }

  if (input.buffer.byteLength > MAX_BROWSER_TEXT_DOCUMENT_BYTES) {
    throw new Error('Server extraction maximum document size is 5MB.')
  }

  const signatureMode = getServerDocumentSignatureMode(input)

  if (!signatureMode) {
    throw new Error('Document signature does not match its declared PDF or Word type.')
  }

  const extension = getDocumentExtension(input.name)
  let text = ''
  let warnings: string[] = []
  let extractionMode: ServerDocumentExtractionMode

  if (signatureMode === 'server-pdf' || extension === '.pdf' || input.type === 'application/pdf') {
    text = await extractPdfTextFromBuffer(input.buffer)
    extractionMode = 'server-pdf'
  } else if (
    signatureMode === 'server-docx' ||
    extension === '.docx' ||
    input.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await extractDocxTextFromBuffer(input.buffer)
    text = result.text
    warnings = result.warnings
    extractionMode = 'server-docx'
  } else if (signatureMode === 'server-doc' || extension === '.doc' || input.type === 'application/msword') {
    text = await extractLegacyDocTextFromBuffer(input.buffer)
    extractionMode = 'server-doc'
  } else {
    throw new Error('Unsupported document extraction type.')
  }

  const normalizedText = normalizeBrowserDocumentText(text)

  if (!normalizedText.trim()) {
    throw new Error('Document extraction did not find readable text.')
  }

  if (normalizedText.length > MAX_EXTRACTED_DOCUMENT_TEXT_CHARS) {
    throw new Error('Document extraction returned more readable text than this route accepts.')
  }

  return {
    text: normalizedText,
    extractionMode,
    warnings,
  }
}
