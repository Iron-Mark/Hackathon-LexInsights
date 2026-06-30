'use client'

import { CHAT_EVENTS, addChatEventListener, type QuerySubmittedEventDetail } from '@/lib/chat/events'

export const ANALYTICS_EVENTS = {
  pageView: 'page_view',
  helpResourcesOpen: 'help_resources_open',
  sourceLinkClick: 'source_link_click',
  chatStart: 'chat_start',
} as const

type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

type AnalyticsMetadata = {
  category?: string
  component?: string
  path?: string
  resourceId?: string
  source?: string
  viewport?: 'mobile' | 'desktop'
}

const PUBLIC_PAGE_PATHS = new Set(['/', '/chat', '/about', '/privacy', '/terms'])
const CHAT_START_STORAGE_KEY = 'lexinsights_analytics_chat_starts_v1'

function hasPrivacyOptOut() {
  if (typeof navigator === 'undefined') {
    return true
  }

  const nav = navigator as Navigator & {
    globalPrivacyControl?: boolean
    msDoNotTrack?: string
  }

  return nav.doNotTrack === '1' || nav.msDoNotTrack === '1' || nav.globalPrivacyControl === true
}

function getSafePath(path: string) {
  if (!path || path.startsWith('/chat/')) {
    return '/chat'
  }

  return PUBLIC_PAGE_PATHS.has(path) ? path : null
}

function getViewportKind(): AnalyticsMetadata['viewport'] {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop'
}

function readTrackedChatStarts() {
  try {
    const stored = window.sessionStorage.getItem(CHAT_START_STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []

    return Array.isArray(parsed)
      ? new Set(parsed.filter((item): item is string => typeof item === 'string').slice(0, 100))
      : new Set<string>()
  } catch {
    return new Set<string>()
  }
}

function writeTrackedChatStarts(values: Set<string>) {
  try {
    window.sessionStorage.setItem(CHAT_START_STORAGE_KEY, JSON.stringify(Array.from(values).slice(-100)))
  } catch {
    // Analytics should never block chat.
  }
}

function postAnalyticsEvent(event: AnalyticsEventName, metadata: AnalyticsMetadata = {}) {
  if (typeof window === 'undefined' || hasPrivacyOptOut()) {
    return
  }

  const body = JSON.stringify({
    event,
    metadata: {
      ...metadata,
      viewport: metadata.viewport || getViewportKind(),
    },
  })

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' })
    navigator.sendBeacon('/api/analytics', blob)
    return
  }

  void fetch('/api/analytics', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
    },
    keepalive: true,
  }).catch(() => undefined)
}

export function trackPublicPageView(path: string) {
  const safePath = getSafePath(path)

  if (!safePath) {
    return
  }

  postAnalyticsEvent(ANALYTICS_EVENTS.pageView, {
    path: safePath,
    source: 'app_router',
  })
}

export function trackHelpResourcesOpen(source: string) {
  postAnalyticsEvent(ANALYTICS_EVENTS.helpResourcesOpen, {
    component: 'help_resources',
    source,
  })
}

export function trackSourceLinkClick(resource: { category: string; id: string }) {
  postAnalyticsEvent(ANALYTICS_EVENTS.sourceLinkClick, {
    category: resource.category,
    component: 'help_resources',
    resourceId: resource.id,
  })
}

export function registerChatStartAnalytics() {
  const removeQueryListener = addChatEventListener<QuerySubmittedEventDetail>(
    CHAT_EVENTS.querySubmitted,
    (event) => {
      const detail = event.detail
      const chatKey = detail?.chatId || 'unsaved-chat'
      const tracked = readTrackedChatStarts()

      if (tracked.has(chatKey)) {
        return
      }

      tracked.add(chatKey)
      writeTrackedChatStarts(tracked)
      postAnalyticsEvent(ANALYTICS_EVENTS.chatStart, {
        path: '/chat',
        source: detail?.chatId ? 'chat_submit' : 'chat_submit_unsaved',
      })
    }
  )

  return () => {
    removeQueryListener()
  }
}
