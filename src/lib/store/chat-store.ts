'use client'

import { create } from 'zustand'
import { Chat, Message } from '@/types'
import { createClient } from '@/lib/supabase/client'
import type { RAGResponse } from '@/lib/services/rag-api'
import { useAuthStore } from './auth-store'
import { useChatModeStore } from './chat-mode-store'

const GUEST_STORAGE_KEY = 'lexinsight_guest_chats_v1'
const GUEST_USER_ID = 'guest-local'

interface ChatMessagePreview {
  id: string
  content: string
  created_at: string
}

interface ChatRow {
  id: string
  title: string
  mode?: Chat['mode']
  created_at: string
  updated_at: string
  user_id: string
  messages?: ChatMessagePreview[]
}

interface GuestChatStorage {
  version: 1
  chats: Chat[]
  messages: Record<string, Message[]>
}

interface ChatStore {
  chats: Chat[]
  activeChat: Chat | null
  messages: Record<string, Message[]>
  loading: boolean
  loadingMessages: boolean

  fetchChats: () => Promise<void>
  fetchMessages: (chatId: string) => Promise<void>
  createChat: (title?: string, mode?: Chat['mode']) => Promise<Chat>
  selectChat: (id: string) => void
  deleteChat: (id: string) => Promise<void>
  updateChatTitle: (id: string, title: string) => Promise<void>
  addMessage: (chatId: string, message: Omit<Message, 'id' | 'created_at'>) => Promise<void>
  addRAGMessageToChat: (chatId: string, query: string, response: RAGResponse) => Promise<void>
  addRAGMessage: (query: string, response: RAGResponse) => Promise<void>
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function isGuestMode() {
  return !useAuthStore.getState().user
}

function isGuestChatId(id: string) {
  return id.startsWith('guest_')
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function readGuestStorage(): GuestChatStorage {
  if (!isBrowser()) {
    return { version: 1, chats: [], messages: {} }
  }

  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY)
    if (!raw) {
      return { version: 1, chats: [], messages: {} }
    }

    const parsed = JSON.parse(raw) as Partial<GuestChatStorage>

    return {
      version: 1,
      chats: Array.isArray(parsed.chats) ? parsed.chats : [],
      messages: parsed.messages && typeof parsed.messages === 'object' ? parsed.messages : {},
    }
  } catch (error) {
    console.error('Failed to read guest chats:', error)
    return { version: 1, chats: [], messages: {} }
  }
}

function writeGuestStorage(chats: Chat[], messages: Record<string, Message[]>) {
  if (!isBrowser()) {
    return
  }

  try {
    const payload: GuestChatStorage = {
      version: 1,
      chats,
      messages,
    }
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.error('Failed to save guest chats:', error)
  }
}

function makeGuestChat(title?: string, mode?: Chat['mode']): Chat {
  const now = new Date().toISOString()
  return {
    id: createId('guest'),
    title: title || 'New Chat',
    mode: mode || useChatModeStore.getState().mode,
    created_at: now,
    updated_at: now,
    user_id: GUEST_USER_ID,
    message_count: 0,
  }
}

function makeGuestMessage(message: Omit<Message, 'id' | 'created_at'>): Message {
  return {
    ...message,
    id: createId('guest_message'),
    created_at: new Date().toISOString(),
  }
}

function toChatWithPreview(chat: Chat, messages: Message[]): Chat {
  const lastMessage = messages[messages.length - 1]

  return {
    ...chat,
    message_count: messages.length,
    last_message_preview: lastMessage?.content?.substring(0, 100),
    updated_at: lastMessage?.created_at || chat.updated_at,
  }
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  activeChat: null,
  messages: {},
  loading: false,
  loadingMessages: false,

  fetchChats: async () => {
    set({ loading: true })

    if (isGuestMode()) {
      const guestState = readGuestStorage()
      const chats = guestState.chats
        .map((chat) => toChatWithPreview(chat, guestState.messages[chat.id] || []))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      const activeChat = get().activeChat
      const nextActiveChat = activeChat && isGuestChatId(activeChat.id)
        ? chats.find((chat) => chat.id === activeChat.id) || null
        : null

      set({
        chats,
        messages: guestState.messages,
        activeChat: nextActiveChat,
        loading: false,
      })
      return
    }

    try {
      const supabase = createClient()
      const user = useAuthStore.getState().user

      if (!user) {
        set({ chats: [], activeChat: null, messages: {}, loading: false })
        return
      }

      const { data: chats, error } = await supabase
        .from('chats')
        .select(`
          id,
          title,
          mode,
          created_at,
          updated_at,
          user_id,
          messages (
            id,
            content,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error

      const transformedChats: Chat[] = ((chats || []) as ChatRow[]).map((chat) => {
        const messages = chat.messages || []
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null

        return {
          id: chat.id,
          title: chat.title,
          mode: chat.mode,
          created_at: chat.created_at,
          updated_at: chat.updated_at,
          user_id: chat.user_id,
          message_count: messages.length,
          last_message_preview: lastMessage?.content?.substring(0, 100),
        }
      })
      const activeChat = get().activeChat
      const nextActiveChat = activeChat && !isGuestChatId(activeChat.id)
        ? transformedChats.find((chat) => chat.id === activeChat.id) || null
        : null

      set({
        chats: transformedChats,
        activeChat: nextActiveChat,
        messages: {},
        loading: false,
      })
    } catch (error) {
      console.error('Failed to fetch chats:', error)
      set({ loading: false })
    }
  },

  fetchMessages: async (chatId: string) => {
    set({ loadingMessages: true })

    if (isGuestMode() || isGuestChatId(chatId)) {
      const guestState = readGuestStorage()
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: guestState.messages[chatId] || [],
        },
        loadingMessages: false,
      }))
      return
    }

    try {
      const supabase = createClient()

      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (error) throw error

      set(state => ({
        messages: {
          ...state.messages,
          [chatId]: messages || [],
        },
        loadingMessages: false,
      }))
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      set({ loadingMessages: false })
    }
  },

  createChat: async (title?: string, mode?: Chat['mode']) => {
    if (isGuestMode()) {
      const guestState = readGuestStorage()
      const newChat = makeGuestChat(title, mode)
      const chats = [newChat, ...guestState.chats]
      const messages = {
        ...guestState.messages,
        [newChat.id]: [],
      }

      writeGuestStorage(chats, messages)
      set({
        chats,
        activeChat: newChat,
        messages,
      })

      return newChat
    }

    try {
      const supabase = createClient()
      const user = useAuthStore.getState().user
      const chatMode = mode || useChatModeStore.getState().mode

      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data: newChat, error } = await supabase
        .from('chats')
        .insert({
          title: title || 'New Chat',
          user_id: user.id,
          mode: chatMode,
        } as never)
        .select()
        .single()

      if (error) throw error

      const chatWithCount: Chat = {
        ...(newChat as Chat),
        message_count: 0,
      }

      set(state => ({
        chats: [chatWithCount, ...state.chats],
        activeChat: chatWithCount,
        messages: {
          ...state.messages,
          [chatWithCount.id]: [],
        },
      }))

      return chatWithCount
    } catch (error) {
      console.error('Failed to create chat:', error)
      throw error
    }
  },

  selectChat: (id: string) => {
    const chat = get().chats.find(c => c.id === id)
    if (chat) {
      set({ activeChat: chat })
      useChatModeStore.getState().setMode(chat.mode || 'general')
    }
  },

  deleteChat: async (id: string) => {
    if (isGuestMode() || isGuestChatId(id)) {
      const guestState = readGuestStorage()
      const chats = guestState.chats.filter(c => c.id !== id)
      const messages = { ...guestState.messages }
      delete messages[id]

      writeGuestStorage(chats, messages)
      set(state => ({
        chats,
        activeChat: state.activeChat?.id === id ? null : state.activeChat,
        messages,
      }))
      return
    }

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', id)

      if (error) throw error

      set(state => {
        const newChats = state.chats.filter(c => c.id !== id)
        const newActiveChat = state.activeChat?.id === id ? null : state.activeChat
        const newMessages = { ...state.messages }
        delete newMessages[id]

        return {
          chats: newChats,
          activeChat: newActiveChat,
          messages: newMessages,
        }
      })
    } catch (error) {
      console.error('Failed to delete chat:', error)
      throw error
    }
  },

  updateChatTitle: async (id: string, title: string) => {
    if (isGuestMode() || isGuestChatId(id)) {
      const guestState = readGuestStorage()
      const updatedAt = new Date().toISOString()
      const chats = guestState.chats.map(chat =>
        chat.id === id ? { ...chat, title, updated_at: updatedAt } : chat
      )

      writeGuestStorage(chats, guestState.messages)
      set(state => {
        const updatedChats = state.chats.map(chat =>
          chat.id === id ? { ...chat, title, updated_at: updatedAt } : chat
        )
        const updatedActiveChat = state.activeChat?.id === id
          ? { ...state.activeChat, title, updated_at: updatedAt }
          : state.activeChat

        return {
          chats: updatedChats,
          activeChat: updatedActiveChat,
        }
      })
      return
    }

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('chats')
        .update({ title } as never)
        .eq('id', id)

      if (error) throw error

      set(state => {
        const updatedChats = state.chats.map(chat =>
          chat.id === id
            ? { ...chat, title, updated_at: new Date().toISOString() }
            : chat
        )

        const updatedActiveChat = state.activeChat?.id === id
          ? { ...state.activeChat, title, updated_at: new Date().toISOString() }
          : state.activeChat

        return {
          chats: updatedChats,
          activeChat: updatedActiveChat,
        }
      })
    } catch (error) {
      console.error('Failed to update chat title:', error)
      throw error
    }
  },

  addMessage: async (chatId: string, message: Omit<Message, 'id' | 'created_at'>) => {
    if (isGuestMode() || isGuestChatId(chatId)) {
      const guestState = readGuestStorage()
      const newMessage = makeGuestMessage(message)
      const chatMessages = [...(guestState.messages[chatId] || []), newMessage]
      const messages = {
        ...guestState.messages,
        [chatId]: chatMessages,
      }
      const updatedAt = newMessage.created_at
      const chats = guestState.chats
        .map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                last_message_preview: newMessage.content.substring(0, 100),
                updated_at: updatedAt,
                message_count: chatMessages.length,
              }
            : chat
        )
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

      writeGuestStorage(chats, messages)
      set(state => ({
        messages: {
          ...state.messages,
          [chatId]: chatMessages,
        },
        chats,
        activeChat: state.activeChat?.id === chatId
          ? chats.find(chat => chat.id === chatId) || state.activeChat
          : state.activeChat,
      }))
      return
    }

    try {
      const supabase = createClient()

      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          role: message.role,
          content: message.content,
          metadata: message.metadata || {},
        } as never)
        .select()
        .single()

      if (error) throw error

      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() } as never)
        .eq('id', chatId)

      set(state => {
        const chatMessages = state.messages[chatId] || []

        const updatedChats = state.chats.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                last_message_preview: message.content.substring(0, 100),
                updated_at: new Date().toISOString(),
                message_count: (chat.message_count || 0) + 1,
              }
            : chat
        )

        return {
          messages: {
            ...state.messages,
            [chatId]: [...chatMessages, newMessage as Message],
          },
          chats: updatedChats,
        }
      })
    } catch (error) {
      console.error('Failed to add message:', error)
      throw error
    }
  },

  addRAGMessageToChat: async (chatId: string, query: string, response: RAGResponse) => {
    await get().addMessage(chatId, {
      role: 'user',
      content: query,
    })

    await get().addMessage(chatId, {
      role: 'assistant',
      content: response.summary,
      metadata: {
        ragResponse: {
          status: response.status,
          query: response.query,
          summary: response.summary,
          search_queries_used: response.search_queries_used || [],
          documents_found: response.documents_found || 0,
          provider_mode: response.provider_mode,
          fallback_used: response.fallback_used,
          confidence_score: response.confidence_score,
        },
        searchQueries: response.search_queries_used,
        documentCount: response.documents_found,
        providerMode: response.provider_mode,
        fallbackUsed: response.fallback_used,
      },
    })
  },

  addRAGMessage: async (query: string, response: RAGResponse) => {
    const activeChat = get().activeChat

    if (!activeChat) {
      console.warn('No active chat to add RAG message to')
      return
    }

    await get().addRAGMessageToChat(activeChat.id, query, response)
  },
}))
