import {
  getComplianceDocumentSupport,
  getDocumentExtension,
  normalizeBrowserDocumentText,
} from './document-text'

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

  const extension = getDocumentExtension(input.name)
  let text = ''
  let warnings: string[] = []
  let extractionMode: ServerDocumentExtractionMode

  if (extension === '.pdf' || input.type === 'application/pdf') {
    text = await extractPdfTextFromBuffer(input.buffer)
    extractionMode = 'server-pdf'
  } else if (
    extension === '.docx' ||
    input.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await extractDocxTextFromBuffer(input.buffer)
    text = result.text
    warnings = result.warnings
    extractionMode = 'server-docx'
  } else if (extension === '.doc' || input.type === 'application/msword') {
    text = await extractLegacyDocTextFromBuffer(input.buffer)
    extractionMode = 'server-doc'
  } else {
    throw new Error('Unsupported document extraction type.')
  }

  const normalizedText = normalizeBrowserDocumentText(text)

  if (!normalizedText.trim()) {
    throw new Error('Document extraction did not find readable text.')
  }

  return {
    text: normalizedText,
    extractionMode,
    warnings,
  }
}
