import { NextRequest, NextResponse } from 'next/server'
import {
  MAX_BROWSER_TEXT_DOCUMENT_BYTES,
  getComplianceDocumentSupport,
} from '@/lib/utils/document-text'
import { extractServerDocumentText } from '@/lib/utils/server-document-extraction'
import {
  buildPublicApiErrorBody,
  buildThrottleErrorBody,
  checkPublicApiThrottle,
  createPublicApiRequestContext,
  getThrottleHeaders,
  logPublicApiEvent,
  type PublicApiRequestContext,
  type ThrottleResult,
} from '@/lib/server/request-guardrails'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ExtractionMode = 'server-pdf' | 'server-docx' | 'server-doc'

const DOCUMENT_EXTRACTION_TIMEOUT_MS = 15000

function jsonError(
  status: number,
  error: string,
  context: PublicApiRequestContext,
  type: string,
  details: Record<string, unknown> = {},
  throttle?: ThrottleResult
) {
  const publicError = buildPublicApiErrorBody(context, error, type, details)

  return NextResponse.json(
    {
      error,
      detail: publicError.detail,
      details: publicError.error,
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        ...(throttle ? getThrottleHeaders(throttle, context.requestId) : { 'X-Request-ID': context.requestId }),
      },
    }
  )
}

function jsonSuccess(body: {
  text: string
  extractionMode: ExtractionMode
  fileName: string
  warnings?: string[]
}, context: PublicApiRequestContext, throttle?: ThrottleResult) {
  return NextResponse.json(
    {
      ...body,
      warnings: body.warnings || [],
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        ...(throttle ? getThrottleHeaders(throttle, context.requestId) : { 'X-Request-ID': context.requestId }),
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
  const context = createPublicApiRequestContext(request, '/api/document-text')
  const throttle = checkPublicApiThrottle(context)

  if (!throttle.ok) {
    logPublicApiEvent('warn', 'public_api.rate_limited', context, {
      limit: throttle.limit,
      retryAfterSeconds: throttle.retryAfterSeconds,
      route: context.route,
    })

    return NextResponse.json(
      {
        error: 'Too many requests. Try again shortly.',
        detail: 'Too many requests. Try again shortly.',
        details: buildThrottleErrorBody(context, throttle).error,
      },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          ...getThrottleHeaders(throttle, context.requestId),
        },
      }
    )
  }

  const contentLength = getContentLength(request)

  if (contentLength !== null && contentLength > MAX_BROWSER_TEXT_DOCUMENT_BYTES + 1024 * 1024) {
    return jsonError(413, 'Maximum document size is 5MB.', context, 'payload_too_large', {
      contentLength,
      maxSize: MAX_BROWSER_TEXT_DOCUMENT_BYTES,
    }, throttle)
  }

  const file = await getUploadedFile(request)

  if (!file) {
    return jsonError(400, 'Missing file upload.', context, 'missing_file', {
      expectedField: 'file',
    }, throttle)
  }

  if (file.size > MAX_BROWSER_TEXT_DOCUMENT_BYTES) {
    return jsonError(413, 'Maximum document size is 5MB.', context, 'document_too_large', {
      fileSize: file.size,
      maxSize: MAX_BROWSER_TEXT_DOCUMENT_BYTES,
    }, throttle)
  }

  const support = getComplianceDocumentSupport(file)

  if (support !== 'backend-extraction') {
    return jsonError(415, 'This route only extracts PDF and Word documents.', context, 'unsupported_document_type', {
      fileType: file.type,
      support,
    }, throttle)
  }

  logPublicApiEvent('info', 'document_text.request', context, {
    fileSize: file.size,
    fileType: file.type,
    support,
  })

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
    }, context, throttle)
  } catch (error) {
    logPublicApiEvent('error', 'document_text.extraction_failed', context, {
      errorName: error instanceof Error ? error.name : typeof error,
      fileType: file.type,
    })
    return jsonError(422, 'Document extraction failed. Try a cleaner PDF or Word file, or paste the text directly.', context, 'document_extraction_failed', {
      fileType: file.type,
    }, throttle)
  }
}
