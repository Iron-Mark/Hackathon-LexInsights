import { NextRequest, NextResponse } from 'next/server'
import {
  MAX_BROWSER_TEXT_DOCUMENT_BYTES,
  getComplianceDocumentSupport,
} from '@/lib/utils/document-text'
import { extractServerDocumentText } from '@/lib/utils/server-document-extraction'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ExtractionMode = 'server-pdf' | 'server-docx' | 'server-doc'

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

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : 'Document extraction failed.'
}

async function getUploadedFile(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file')

  if (!file || typeof file !== 'object' || !('arrayBuffer' in file) || !('name' in file)) {
    return null
  }

  return file as File
}

export async function POST(request: NextRequest) {
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
    const result = await extractServerDocumentText({
      name: file.name,
      type: file.type,
      buffer,
    })

    return jsonSuccess({
      text: result.text,
      extractionMode: result.extractionMode,
      fileName: file.name,
      warnings: result.warnings,
    })
  } catch (error) {
    return jsonError(422, messageFromError(error), {
      fileName: file.name,
      fileType: file.type,
    })
  }
}
