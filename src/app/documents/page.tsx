'use client'

import { FileText } from 'lucide-react'

import { AppSidebar } from '@/components/navigation/app-sidebar'
import { UserDocumentsList } from '@/components/chat/user-documents-list'
import { LoadingScreen } from '@/components/layout/loading-screen'
import { useProtectedRoute } from '@/hooks/use-protected-route'

export default function DocumentsPage() {
  const { user, loading, checkingAccess, redirecting } = useProtectedRoute()

  if (loading || checkingAccess || redirecting) {
    return <LoadingScreen />
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#171322]">
      <AppSidebar />
      
      <main className="flex-1 ml-16 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-8 w-8 text-iris-600 dark:text-iris-200" />
              <h1 className="text-3xl font-bold text-slate-950 dark:text-slate-100">My Documents</h1>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              View and manage your uploaded documents
            </p>
          </div>

          {/* Documents List */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-iris-300/15 dark:bg-[#241f32]">
            <UserDocumentsList />
          </div>
        </div>
      </main>
    </div>
  )
}
