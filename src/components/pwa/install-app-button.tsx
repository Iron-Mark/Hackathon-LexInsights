'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandaloneDisplay() {
  if (typeof window === 'undefined') {
    return false
  }

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }

  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isPrompting, setIsPrompting] = useState(false)

  useEffect(() => {
    setIsInstalled(isStandaloneDisplay())

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setInstallPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!installPrompt || isPrompting) {
      return
    }

    setIsPrompting(true)

    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice

      if (choice.outcome === 'accepted') {
        setInstallPrompt(null)
      }
    } finally {
      setIsPrompting(false)
    }
  }, [installPrompt, isPrompting])

  if (isInstalled || !installPrompt) {
    return null
  }

  return (
    <button
      onClick={handleInstall}
      disabled={isPrompting}
      className="flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-iris-100 bg-white/85 px-2 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-iris-950/5 transition-all hover:border-iris-300 hover:bg-iris-50 hover:text-iris-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 disabled:cursor-wait disabled:opacity-70 dark:border-iris-300/15 dark:bg-[#241f32]/80 dark:text-iris-100/75 dark:hover:border-iris-300/40 dark:hover:bg-iris-300/12 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#171322]"
      aria-label={isPrompting ? 'Opening install prompt' : 'Install LexInsights'}
      type="button"
    >
      <Download className="h-5 w-5 text-iris-700 dark:text-iris-200" aria-hidden="true" />
      <span className="truncate">{isPrompting ? 'Install...' : 'Install'}</span>
    </button>
  )
}
