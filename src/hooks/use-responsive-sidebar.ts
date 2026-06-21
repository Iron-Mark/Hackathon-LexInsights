'use client'

import { useEffect, useLayoutEffect } from 'react'

import { useSidebarStore } from '@/lib/store/sidebar-store'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export function useResponsiveSidebar() {
  const { isOpen, isMobile, open, close, setIsMobile } = useSidebarStore()

  useIsomorphicLayoutEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [setIsMobile])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobile && isOpen) {
        close()
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => window.removeEventListener('keydown', handleEscape)
  }, [isMobile, isOpen, close])

  return {
    isOpen,
    isMobile,
    open,
    close,
  }
}
