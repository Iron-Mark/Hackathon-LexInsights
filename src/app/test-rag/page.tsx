import { notFound } from 'next/navigation'
import { RAGTestComponent } from '@/components/test/rag-test'
import { areDiagnosticRoutesEnabled } from '@/lib/diagnostic-routes'

export default function TestRAGPage() {
  if (!areDiagnosticRoutesEnabled()) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-slate-50 py-6">
      <RAGTestComponent />
    </main>
  )
}
