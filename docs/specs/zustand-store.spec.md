# Zustand Store Specification

## Store Structure

### AuthStore
```typescript
{
  user: User | null,
  session: Session | null,
  loading: boolean,
  
  // Actions
  setUser: (user: User | null) => void,
  setSession: (session: Session | null) => void,
  signIn: (email: string, password: string) => Promise<void>,
  signUp: (email: string, password: string) => Promise<void>,
  signOut: () => Promise<void>,
  checkSession: () => Promise<void>
}
```

### ChatStore
```typescript
{
  chats: Chat[],
  activeChat: Chat | null,
  messages: Record<string, Message[]>,
  loading: boolean,
  loadingMessages: boolean,
  
  // Actions
  fetchChats: () => Promise<void>,
  fetchMessages: (chatId: string) => Promise<void>,
  createChat: (title?: string) => Promise<Chat>,
  selectChat: (id: string) => void,
  deleteChat: (id: string) => Promise<void>,
  updateChatTitle: (id: string, title: string) => Promise<void>,
  addMessage: (chatId: string, message: Omit<Message, 'id' | 'created_at'>) => Promise<void>
}
```

## Persistence
- AuthStore: No persistence (Supabase handles it)
- ChatStore: Supabase `chats` and `messages` tables

## State Updates
- Optimistic updates for UX
- Error rollback on API failure
- Loading states for all async actions
