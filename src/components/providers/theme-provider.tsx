'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { THEME_STORAGE_KEY } from '@/lib/theme'

type ThemePreference = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  setThemePreference: (preference: ThemePreference) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? getSystemTheme() : preference
}

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY)

  if (storedPreference === 'light' || storedPreference === 'dark' || storedPreference === 'system') {
    return storedPreference
  }

  return 'system'
}

function applyTheme(theme: ResolvedTheme) {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.dataset.theme = theme
  root.style.colorScheme = theme
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>('system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')

  useEffect(() => {
    const nextPreference = readStoredPreference()
    const nextTheme = resolveTheme(nextPreference)

    setPreference(nextPreference)
    setResolvedTheme(nextTheme)
    applyTheme(nextTheme)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      if (preference !== 'system') {
        return
      }

      const nextTheme = getSystemTheme()
      setResolvedTheme(nextTheme)
      applyTheme(nextTheme)
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [preference])

  const value = useMemo<ThemeContextValue>(() => ({
    preference,
    resolvedTheme,
    setThemePreference: (nextPreference) => {
      const nextTheme = resolveTheme(nextPreference)

      window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference)
      setPreference(nextPreference)
      setResolvedTheme(nextTheme)
      applyTheme(nextTheme)
    },
    toggleTheme: () => {
      const nextPreference = resolvedTheme === 'dark' ? 'light' : 'dark'
      const nextTheme = resolveTheme(nextPreference)

      window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference)
      setPreference(nextPreference)
      setResolvedTheme(nextTheme)
      applyTheme(nextTheme)
    },
  }), [preference, resolvedTheme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return context
}
