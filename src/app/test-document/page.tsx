import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DocumentTestComponent } from '@/components/test/document-test'
import { areDiagnosticRoutesEnabled } from '@/lib/diagnostic-routes'
import { NO_INDEX_ROBOTS } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Document Diagnostics',
  description: 'Maintainer-only LexInsights document extraction diagnostics.',
  robots: NO_INDEX_ROBOTS,
}

export const dynamic = 'force-dynamic'

export default function TestDocumentPage() {
  if (!areDiagnosticRoutesEnabled()) {
    notFound()
  }

  return <DocumentTestComponent />
}
