import type { Metadata } from 'next'

import { ChatPageShell } from '@/components/chat/chat-page-shell'
import { SITE_DESCRIPTION, SITE_TITLE } from '@/lib/seo'

export const metadata: Metadata = {
  title: {
    absolute: SITE_TITLE,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
}

export default function Home() {
  return <ChatPageShell />
}
