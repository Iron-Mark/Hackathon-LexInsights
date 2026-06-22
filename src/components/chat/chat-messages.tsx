'use client'

import { Fragment } from 'react'
import { Message } from '@/types'
import { MessageBubble } from './message-bubble'
import { TypingIndicator } from './loading-indicator'

export interface PendingChatTurn {
  id: string
  query: string
  createdAt: string
}

interface ChatMessagesProps {
  messages: Message[]
  pendingTurns?: PendingChatTurn[]
}

export function ChatMessages({ messages, pendingTurns = [] }: ChatMessagesProps) {
  const hasVisibleMessages = messages.length > 0 || pendingTurns.length > 0

  return (
    <div className="py-4">
      {!hasVisibleMessages ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-base sm:text-lg text-slate-400 text-center">Start a conversation...</p>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {pendingTurns.map((turn) => (
            <Fragment key={turn.id}>
              <MessageBubble
                message={{
                  id: `${turn.id}-user`,
                  role: 'user',
                  content: turn.query,
                  created_at: turn.createdAt,
                }}
              />
              <div className="mb-4 flex justify-start">
                <TypingIndicator />
              </div>
            </Fragment>
          ))}
        </>
      )}
    </div>
  )
}
