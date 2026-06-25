'use client'

import { FileText, Menu } from 'lucide-react'

import { AppSidebar } from '@/components/navigation/app-sidebar'
import { MobileOverlay } from '@/components/chat/mobile-overlay'
import { UserDocumentsList } from '@/components/chat/user-documents-list'
import { LoadingScreen } from '@/components/layout/loading-screen'
import { Button } from '@/components/ui/button'
import { useProtectedRoute } from '@/hooks/use-protected-route'
import { useResponsiveSidebar } from '@/hooks/use-responsive-sidebar'
import { cn } from '@/lib/utils'

export default function DocumentsPage() {
  const { user, loading, checkingAccess, redirecting } = useProtectedRoute()
  const { isOpen, isMobile, open } = useResponsiveSidebar()

  if (loading || checkingAccess || redirecting) {
    return <LoadingScreen />
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 supports-[height:100dvh]:h-dvh dark:bg-[#171322]">
      {(!isMobile || isOpen) && <AppSidebar />}
      <MobileOverlay />
      
      <main
        className={cn(
          'min-w-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(224,222,250,0.56)_0%,rgba(248,250,252,0.98)_18rem,#f8fafc_100%)] transition-all duration-300 dark:bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.12),transparent_28rem),linear-gradient(135deg,#171322_0%,#211a35_48%,#120d1f_100%)]',
          !isMobile && !isOpen && 'ml-16',
          !isMobile && isOpen && 'ml-16'
        )}
      >
        {isMobile && (
          <div className="fixed left-[calc(env(safe-area-inset-left)+1rem)] top-[calc(env(safe-area-inset-top)+0.375rem)] z-20">
            <Button
              onClick={open}
              variant="outline"
              size="icon"
              className="h-11 w-11 border-iris-100 bg-white/90 text-iris-700 shadow-md shadow-iris-950/10 transition-all duration-150 hover:bg-iris-50 hover:text-iris-900 hover:shadow-lg hover:shadow-iris-950/15 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:border-iris-300/15 dark:bg-[#1b1728] dark:text-slate-200 dark:hover:bg-iris-300/12 dark:focus-visible:ring-offset-[#171322]"
              aria-label="Open sidebar menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        )}

        <div className="mx-auto max-w-4xl px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+4.5rem)] sm:p-8 md:pt-8">
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
          <div className="rounded-xl border border-slate-200 bg-white/92 p-4 shadow-sm shadow-iris-950/5 backdrop-blur sm:p-6 dark:border-iris-300/15 dark:bg-[#241f32]/92">
            <UserDocumentsList />
          </div>
        </div>
      </main>
    </div>
  )
}
