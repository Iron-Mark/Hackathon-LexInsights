'use client'

import { useSidebarStore } from '@/lib/store/sidebar-store'
import { cn } from '@/lib/utils'

export function MobileOverlay() {
  const { isOpen, isMobile, close } = useSidebarStore()

  // Only render on mobile when sidebar is open
  if (!isMobile || !isOpen) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed inset-0 bg-black/50 z-30',
        'transition-opacity duration-200 ease-out',
        isOpen ? 'opacity-100' : 'opacity-0'
      )}
      onClick={close}
      aria-hidden="true"
      role="button"
      tabIndex={-1}
    />
  )
}
