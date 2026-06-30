import type { Metadata } from 'next'

import { ChatPageShell } from '@/components/chat/chat-page-shell'
import { NO_INDEX_ROBOTS } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Private Chat',
  description: 'Private LexInsights chat workspace.',
  alternates: {
    canonical: '/chat',
  },
  robots: NO_INDEX_ROBOTS,
}

interface ChatDetailPageProps {
  params: Promise<{
    chatId: string
  }>
}

export default async function ChatDetailPage({ params }: ChatDetailPageProps) {
  const { chatId } = await params

  return <ChatPageShell chatId={chatId} />
}
