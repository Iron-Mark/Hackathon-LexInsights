import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LexInsights',
    short_name: 'LexInsights',
    description: 'Philippine legal compliance assistant for chat, documents, research, and compliance analysis.',
    id: '/',
    lang: 'en-PH',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    orientation: 'portrait-primary',
    background_color: '#FFFFFF',
    theme_color: '#3F33BD',
    categories: ['business', 'productivity', 'utilities'],
    launch_handler: {
      client_mode: 'navigate-existing',
    },
    prefer_related_applications: false,
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/desktop-wide.png',
        sizes: '1440x900',
        type: 'image/png',
        form_factor: 'wide',
        label: 'LexInsights desktop assistant with legal compliance prompt cards',
      },
      {
        src: '/screenshots/mobile-chat.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'LexInsights mobile assistant experience',
      },
    ],
    shortcuts: [
      {
        name: 'Start a legal chat',
        short_name: 'New chat',
        description: 'Open LexInsights and ask a Philippine legal compliance question.',
        url: '/chat',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
    ],
  }
}
