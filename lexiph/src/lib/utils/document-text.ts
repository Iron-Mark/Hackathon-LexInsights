export const MAX_BROWSER_TEXT_DOCUMENT_BYTES = 5 * 1024 * 1024

const BROWSER_TEXT_EXTENSIONS = new Set(['.md', '.markdown', '.txt', '.text'])
const BROWSER_TEXT_MIME_TYPES = new Set([
  'text/markdown',
  'text/plain',
  'text/x-markdown',
])
const BACKEND_EXTRACTION_EXTENSIONS = new Set(['.pdf', '.doc', '.docx'])
const BACKEND_EXTRACTION_MIME_TYPES = new Set([
  'application/msword',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export type ComplianceDocumentSupport = 'browser-text' | 'backend-extraction' | 'unsupported'

export type BrowserDocumentFile = {
  name: string
  size: number
  type?: string
  text: () => Promise<string>
}

function normalizeMimeType(value?: string) {
  return (value || '').split(';')[0].trim().toLowerCase()
}

export function getDocumentExtension(fileName: string) {
  const normalizedName = fileName.toLowerCase().trim()
  const dotIndex = normalizedName.lastIndexOf('.')

  if (dotIndex <= 0 || dotIndex === normalizedName.length - 1) {
    return ''
  }

  return normalizedName.slice(dotIndex)
}

export function getComplianceDocumentSupport(file: Pick<BrowserDocumentFile, 'name' | 'type'>): ComplianceDocumentSupport {
  const extension = getDocumentExtension(file.name)
  const mimeType = normalizeMimeType(file.type)

  if (BROWSER_TEXT_EXTENSIONS.has(extension) || BROWSER_TEXT_MIME_TYPES.has(mimeType)) {
    return 'browser-text'
  }

  if (BACKEND_EXTRACTION_EXTENSIONS.has(extension) || BACKEND_EXTRACTION_MIME_TYPES.has(mimeType)) {
    return 'backend-extraction'
  }

  return 'unsupported'
}

export function isBrowserReadableTextDocument(file: Pick<BrowserDocumentFile, 'name' | 'type'>) {
  return getComplianceDocumentSupport(file) === 'browser-text'
}

export function isSupportedComplianceDocument(file: Pick<BrowserDocumentFile, 'name' | 'type'>) {
  return getComplianceDocumentSupport(file) !== 'unsupported'
}

export function normalizeBrowserDocumentText(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '')
}

export async function readBrowserTextDocument(file: BrowserDocumentFile) {
  const support = getComplianceDocumentSupport(file)

  if (support === 'backend-extraction') {
    throw new Error('PDF and Word documents require backend-side text extraction before local draft checks can run.')
  }

  if (support === 'unsupported') {
    throw new Error('Unsupported compliance document type. Upload Markdown, plain text, PDF, or Word documents.')
  }

  if (file.size > MAX_BROWSER_TEXT_DOCUMENT_BYTES) {
    throw new Error('Maximum browser-readable document size is 5MB.')
  }

  const text = normalizeBrowserDocumentText(await file.text())

  if (!text.trim()) {
    throw new Error('The selected file does not contain readable text.')
  }

  return text
}
