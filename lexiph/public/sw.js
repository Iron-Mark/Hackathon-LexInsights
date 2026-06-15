const CACHE_NAME = 'lexinsight-pwa-v1'
const APP_SHELL_URLS = [
  '/',
  '/offline',
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
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  if (url.origin !== self.location.origin) {
    return
  }

  if (
    request.url.includes('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/__clerk/')
  ) {
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseToCache = response.clone()

          if (response.ok) {
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache))
          }

          return response
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request)
          return cachedResponse || caches.match('/offline')
        })
    )
    return
  }

  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/logo/')
  ) {
    event.respondWith(
      caches.match(request).then(
        (cachedResponse) =>
          cachedResponse ||
          fetch(request).then((response) => {
            const responseToCache = response.clone()

            if (response.ok) {
              void caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache))
            }

            return response
          })
      )
    )
  }
})
