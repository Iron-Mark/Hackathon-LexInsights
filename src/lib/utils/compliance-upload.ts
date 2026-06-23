import {
  MAX_BROWSER_TEXT_DOCUMENT_BYTES,
  isSupportedComplianceDocument,
} from '@/lib/utils/document-text'

export const COMPLIANCE_DOCUMENT_ACCEPT = '.pdf,.md,.txt,.doc,.docx'

export function getComplianceDocumentRejection(file: File, canAddMore: boolean) {
  if (!canAddMore) {
    return 'Maximum 3 documents allowed'
  }

  if (file.size > MAX_BROWSER_TEXT_DOCUMENT_BYTES) {
    return 'Maximum file size is 5MB'
  }

  if (!isSupportedComplianceDocument(file)) {
    return 'Please upload a valid file: PDF, MD, TXT, or Word document'
  }

  return null
}

export function getValidComplianceDocuments(files: File[], availableSlots: number) {
  const acceptedFiles: File[] = []
  const rejectedFiles: Array<{ file: File; reason: string }> = []

  for (const file of files) {
    if (acceptedFiles.length >= availableSlots) {
      rejectedFiles.push({ file, reason: 'Maximum 3 documents allowed' })
      continue
    }

    const rejection = getComplianceDocumentRejection(file, true)

    if (rejection) {
      rejectedFiles.push({ file, reason: rejection })
      continue
    }

    acceptedFiles.push(file)
  }

  return { acceptedFiles, rejectedFiles }
}
