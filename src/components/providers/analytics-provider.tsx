'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { registerChatStartAnalytics, trackPublicPageView } from '@/lib/analytics/events'

export function AnalyticsProvider() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) {
      trackPublicPageView(pathname)
    }
  }, [pathname])

  useEffect(() => registerChatStartAnalytics(), [])

  return null
}
