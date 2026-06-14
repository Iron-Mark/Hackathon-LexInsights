'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth-store'
import { verifyProtectedRouteAccess } from '@/lib/auth/route-guards'
import { AppSidebar } from '@/components/navigation/app-sidebar'
import { UserDocumentsList } from '@/components/chat/user-documents-list'
import { FileText } from 'lucide-react'

export default function DocumentsPage() {
  const router = useRouter()
  const { user, loading } = useAuthStore()
  const [checkingVerification, setCheckingVerification] = useState(true)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    let cancelled = false

    const checkAccess = async () => {
      if (loading) {
        return
      }

      if (!user) {
        setRedirecting(true)
        router.push('/auth/login')
        return
      }

      const access = await verifyProtectedRouteAccess(user)

      if (cancelled) {
        return
      }

      if (!access.allowed) {
        setRedirecting(true)
        router.push(access.redirectTo || '/auth/login')
        return
      }

      setRedirecting(false)
      setCheckingVerification(false)
    }

    checkAccess()

    return () => {
      cancelled = true
    }
  }, [user, loading, router])

  if (loading || checkingVerification || redirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
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
