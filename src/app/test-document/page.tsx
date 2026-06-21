import { notFound } from 'next/navigation'
import { DocumentTestComponent } from '@/components/test/document-test'
import { areDiagnosticRoutesEnabled } from '@/lib/diagnostic-routes'

export default function TestDocumentPage() {
  if (!areDiagnosticRoutesEnabled()) {
    notFound()
  }

  return <DocumentTestComponent />
}
