'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface SidebarStore {
  // State
  isOpen: boolean
  isMobile: boolean
  
  // Actions
  toggle: () => void
  open: () => void
  close: () => void
  setIsMobile: (isMobile: boolean) => void
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isOpen: true,
      isMobile: false,

      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
      
      open: () => set({ isOpen: true }),
      
      close: () => set({ isOpen: false }),
      
      setIsMobile: (isMobile: boolean) => set((state) => {
        if (isMobile && !state.isMobile) {
          return {
            isMobile,
            isOpen: false,
          }
        }

        // Reopen the workspace sidebar when returning to desktop from mobile.
        const shouldAutoOpen = !isMobile && state.isMobile && !state.isOpen
        
        return {
          isMobile,
          isOpen: shouldAutoOpen ? true : state.isOpen
        }
      })
    }),
    {
      name: 'sidebar-storage', // localStorage key
      storage: createJSONStorage(() => window.localStorage),
      partialize: (state) => ({ isOpen: state.isOpen }) // Only persist isOpen state
    }
  )
)
