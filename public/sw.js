const CACHE_NAME = 'lexinsight-pwa-v2'
const OFFLINE_URL = '/offline'
const APP_SHELL_URLS = [
  '/',
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-192x192.png',
  '/icons/maskable-512x512.png',
  '/icons/apple-touch-icon.png',
  '/logo/LOGO-0.5-woBG.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(APP_SHELL_URLS.map((url) => new Request(url, { cache: 'reload' })))
      )
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.registration.navigationPreload?.enable(),
      caches
        .keys()
        .then((cacheNames) =>
          Promise.all(
            cacheNames
              .filter((cacheName) => cacheName !== CACHE_NAME)
              .map((cacheName) => caches.delete(cacheName))
          )
        ),
    ]).then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

function shouldSkipRequest(request, url) {
  return (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    request.url.includes('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/__clerk/')
  )
}

async function putInCache(request, response) {
  if (!response || !response.ok) {
    return
  }

  const cache = await caches.open(CACHE_NAME)
  await cache.put(request, response)
}

async function networkFirstNavigation(request, event) {
  try {
    const preloadResponse = await event.preloadResponse

    if (preloadResponse) {
      void putInCache(request, preloadResponse.clone())
      return preloadResponse
    }

    const response = await fetch(request)
    void putInCache(request, response.clone())
    return response
  } catch {
    const cachedResponse = await caches.match(request)
    const offlineResponse = await caches.match(OFFLINE_URL)

    return cachedResponse || offlineResponse || new Response('LexInSight is offline.', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}

async function staleWhileRevalidate(request) {
  const cachedResponsePromise = caches.match(request)
  const fetchPromise = fetch(request)
    .then((response) => {
      void putInCache(request, response.clone())
      return response
    })
    .catch(() => null)

  const cachedResponse = await cachedResponsePromise

  if (cachedResponse) {
    return cachedResponse
  }

  return (await fetchPromise) || (await caches.match(OFFLINE_URL)) || new Response('', { status: 504 })
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (shouldSkipRequest(request, url)) {
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request, event))
    return
  }

  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/logo/')
  ) {
    event.respondWith(staleWhileRevalidate(request))
  }
})
