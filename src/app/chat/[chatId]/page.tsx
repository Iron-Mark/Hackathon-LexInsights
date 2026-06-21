'use client'

import { useParams } from 'next/navigation'

import { ChatPageShell } from '@/components/chat/chat-page-shell'

export default function ChatDetailPage() {
  const params = useParams<{ chatId: string | string[] }>()
  const rawChatId = params.chatId
  const chatId = Array.isArray(rawChatId) ? rawChatId[0] : rawChatId

  return <ChatPageShell chatId={chatId} />
}
