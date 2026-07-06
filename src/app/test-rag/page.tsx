import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RAGTestComponent } from '@/components/test/rag-test'
import { areDiagnosticRoutesEnabled } from '@/lib/diagnostic-routes'
import { NO_INDEX_ROBOTS } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'RAG Diagnostics',
  description: 'Maintainer-only LexInsights RAG diagnostics.',
  robots: NO_INDEX_ROBOTS,
}

export const dynamic = 'force-dynamic'

export default function TestRAGPage() {
  if (!areDiagnosticRoutesEnabled()) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-slate-50 py-6 dark:bg-[#171322]">
      <RAGTestComponent />
    </main>
  )
}
