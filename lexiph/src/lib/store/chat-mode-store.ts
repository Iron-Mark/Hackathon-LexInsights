'use client'

import { create } from 'zustand'

export type ChatMode = 'general' | 'compliance'

interface ChatModeStore {
  mode: ChatMode
  setMode: (mode: ChatMode) => void
}

export const useChatModeStore = create<ChatModeStore>((set) => ({
  mode: 'general',
  setMode: (mode) => set({ mode }),
}))
