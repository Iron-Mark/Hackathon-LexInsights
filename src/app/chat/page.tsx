import type { Metadata } from 'next'

import { ChatPageShell } from '@/components/chat/chat-page-shell'
import { SITE_OG_IMAGE } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Philippine Legal Chat',
  description:
    'Ask LexInsights about Philippine legal research, compliance checks, citations, and document review workflows.',
  alternates: {
    canonical: '/chat',
  },
  openGraph: {
    title: 'Philippine Legal Chat | LexInsights',
    description:
      'Ask LexInsights about Philippine legal research, compliance checks, citations, and document review workflows.',
    url: '/chat',
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Philippine Legal Chat | LexInsights',
    description:
      'Ask LexInsights about Philippine legal research, compliance checks, citations, and document review workflows.',
    images: [SITE_OG_IMAGE],
  },
}

export default function ChatPage() {
  return <ChatPageShell />
}
