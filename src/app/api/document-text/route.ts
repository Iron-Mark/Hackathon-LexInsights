import { NextRequest, NextResponse } from 'next/server'
import {
  MAX_BROWSER_TEXT_DOCUMENT_BYTES,
  getComplianceDocumentSupport,
} from '@/lib/utils/document-text'
import { extractServerDocumentText } from '@/lib/utils/server-document-extraction'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ExtractionMode = 'server-pdf' | 'server-docx' | 'server-doc'

const DOCUMENT_EXTRACTION_TIMEOUT_MS = 15000

function jsonError(status: number, error: string, details: Record<string, unknown> = {}) {
  return NextResponse.json(
    {
      error,
      details,
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}

function jsonSuccess(body: {
  text: string
  extractionMode: ExtractionMode
  fileName: string
  warnings?: string[]
}) {
  return NextResponse.json(
    {
      ...body,
      warnings: body.warnings || [],
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}

async function getUploadedFile(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file')

  if (!file || typeof file !== 'object' || !('arrayBuffer' in file) || !('name' in file)) {
    return null
  }

  return file as File
}

function getContentLength(request: NextRequest) {
  const rawValue = request.headers.get('content-length')

  if (!rawValue) {
    return null
  }

  const parsed = Number(rawValue)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Document extraction timed out.')), timeoutMs)

    promise
      .then((value) => {
        clearTimeout(timeout)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timeout)
        reject(error)
      })
  })
}

export async function POST(request: NextRequest) {
  const contentLength = getContentLength(request)

  if (contentLength !== null && contentLength > MAX_BROWSER_TEXT_DOCUMENT_BYTES + 1024 * 1024) {
    return jsonError(413, 'Maximum document size is 5MB.', {
      contentLength,
      maxSize: MAX_BROWSER_TEXT_DOCUMENT_BYTES,
    })
  }

  const file = await getUploadedFile(request)

  if (!file) {
    return jsonError(400, 'Missing file upload.', {
      expectedField: 'file',
    })
  }

  if (file.size > MAX_BROWSER_TEXT_DOCUMENT_BYTES) {
    return jsonError(413, 'Maximum document size is 5MB.', {
      fileName: file.name,
      fileSize: file.size,
      maxSize: MAX_BROWSER_TEXT_DOCUMENT_BYTES,
    })
  }

  const support = getComplianceDocumentSupport(file)

  if (support !== 'backend-extraction') {
    return jsonError(415, 'This route only extracts PDF and Word documents.', {
      fileName: file.name,
      fileType: file.type,
      support,
    })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const result = await withTimeout(
      extractServerDocumentText({
        name: file.name,
        type: file.type,
        buffer,
      }),
      DOCUMENT_EXTRACTION_TIMEOUT_MS
    )

    return jsonSuccess({
      text: result.text,
      extractionMode: result.extractionMode,
      fileName: file.name,
      warnings: result.warnings,
    })
  } catch (error) {
    console.error('[document-text] Extraction failed.', error)
    return jsonError(422, 'Document extraction failed. Try a cleaner PDF or Word file, or paste the text directly.', {
      fileName: file.name,
      fileType: file.type,
    })
  }
}
