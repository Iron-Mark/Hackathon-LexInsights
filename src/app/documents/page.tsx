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
    <div className="flex h-screen bg-slate-50">
      <AppSidebar />
      
      <main className="flex-1 ml-16 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-8 w-8 text-iris-600" />
              <h1 className="text-3xl font-bold text-slate-900">My Documents</h1>
            </div>
            <p className="text-slate-600">
              View and manage your uploaded documents
            </p>
          </div>

          {/* Documents List */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <UserDocumentsList />
          </div>
        </div>
      </main>
    </div>
  )
}
