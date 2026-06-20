# Chat Sidebar Design Document

## Overview

The chat sidebar feature adds a persistent left-side navigation panel to the chat interface, enabling users to view, navigate, and manage their chat conversations. The design follows modern chat application patterns (ChatGPT, Gemini) with a collapsible sidebar, responsive behavior, and smooth transitions.

## Architecture

### Component Hierarchy

```
ChatPage
├── ChatSidebar (new)
│   ├── SidebarHeader (new)
│   │   ├── NewChatButton
│   │   └── SidebarToggle
│   ├── ChatList (new)
│   │   └── ChatListItem[] (new)
│   └── SidebarFooter (new)
├── ChatContainer (existing)
│   ├── ChatHeader (existing)
│   ├── ChatMessages (existing)
│   └── ChatInput (existing)
└── MobileOverlay (new)
```

### State Management

We'll use Zustand for managing sidebar and chat state:

- **Chat Store**: Manages chat conversations, active chat, and CRUD operations
- **Sidebar Store**: Manages sidebar visibility and collapse state

### Layout Strategy

- **Desktop (≥768px)**: Sidebar pushes content, fixed width (280px)
- **Mobile (<768px)**: Sidebar overlays content with backdrop
- **Transitions**: CSS transitions for smooth open/close animations

## Components and Interfaces

### 1. ChatSidebar Component

**Location**: `components/chat/chat-sidebar.tsx`

**Props**:
```typescript
interface ChatSidebarProps {
  className?: string
}
```

**Responsibilities**:
- Render sidebar container with proper positioning
- Handle responsive behavior (fixed vs overlay)
- Manage open/close animations
- Coordinate with sidebar store for visibility state

**Key Features**:
- Fixed positioning on desktop
- Overlay positioning on mobile
- Smooth slide-in/out transitions
- Backdrop click handling on mobile

### 2. SidebarHeader Component

**Location**: `components/chat/sidebar-header.tsx`

**Props**:
```typescript
interface SidebarHeaderProps {
  onNewChat: () => void
  onToggle: () => void
}
```

**Responsibilities**:
- Display app branding/logo
- Render "New Chat" button
- Render sidebar toggle button
- Handle user interactions

### 3. ChatList Component

**Location**: `components/chat/chat-list.tsx`

**Props**:
```typescript
interface ChatListProps {
  chats: Chat[]
  activeId?: string
  onSelectChat: (id: string) => void
}
```

**Responsibilities**:
- Render scrollable list of chat items
- Handle empty state
- Manage list virtualization (future optimization)

### 4. ChatListItem Component

**Location**: `components/chat/chat-list-item.tsx`

**Props**:
```typescript
interface ChatListItemProps {
  chat: Chat
  isActive: boolean
  onClick: () => void
}
```

**Responsibilities**:
- Display chat title and metadata
- Show active state styling
- Handle click interactions
- Display hover actions (delete, rename - future)

**Visual Design**:
- Truncated title with ellipsis
- Timestamp or message preview
- Active state: highlighted background
- Hover state: show action buttons

### 5. MobileOverlay Component

**Location**: `components/chat/mobile-overlay.tsx`

**Props**:
```typescript
interface MobileOverlayProps {
  isVisible: boolean
  onClick: () => void
}
```

**Responsibilities**:
- Render semi-transparent backdrop on mobile
- Handle click to close sidebar
- Fade in/out animations

## Data Models

### Chat Interface

**Location**: `types/index.ts`

```typescript
export interface Chat {
  id: string
  title: string
  created_at: string
  updated_at: string
  user_id: string
  message_count?: number
  last_message_preview?: string
}
```

### Chat Store

**Location**: `lib/store/chat-store.ts`

```typescript
interface ChatStore {
  // State
  chats: Chat[]
  activeChat: Chat | null
  loading: boolean
  
  // Actions
  fetchChats: () => Promise<void>
  createChat: (title?: string) => Promise<Chat>
  selectChat: (id: string) => void
  deleteChat: (id: string) => Promise<void>
  updateChatTitle: (id: string, title: string) => Promise<void>
}
```

### Sidebar Store

**Location**: `lib/store/sidebar-store.ts`

```typescript
interface SidebarStore {
  // State
  isOpen: boolean
  isMobile: boolean
  
  // Actions
  toggle: () => void
  open: () => void
  close: () => void
  setIsMobile: (isMobile: boolean) => void
}
```

## Styling and Responsive Design

### Breakpoints

- **Mobile**: < 768px
- **Desktop**: ≥ 768px

### Sidebar Dimensions

- **Width**: 280px (desktop), 80% max-width (mobile)
- **Height**: 100vh
- **Z-index**: 40 (sidebar), 30 (overlay)

### Color Scheme

Using Tailwind CSS classes:
- **Background**: `bg-slate-50` (light mode)
- **Border**: `border-slate-200`
- **Active item**: `bg-slate-100`
- **Hover**: `hover:bg-slate-50`
- **Text**: `text-slate-900` (primary), `text-slate-600` (secondary)

### Animations

```css
/* Sidebar slide transition */
.sidebar-enter {
  transform: translateX(-100%);
}
.sidebar-enter-active {
  transform: translateX(0);
  transition: transform 300ms ease-out;
}

/* Overlay fade transition */
.overlay-enter {
  opacity: 0;
}
.overlay-enter-active {
  opacity: 1;
  transition: opacity 200ms ease-out;
}
```

## Integration Points

### 1. Chat Page Layout

**File**: `app/chat/page.tsx`

**Changes**:
- Wrap existing content with sidebar layout
- Add sidebar component
- Adjust main content area with dynamic classes based on sidebar state
- Add mobile menu button

**Layout Structure**:
```tsx
<div className="flex h-screen">
  <ChatSidebar />
  <main className={cn(
    "flex-1 transition-all",
    isOpen && !isMobile && "ml-[280px]"
  )}>
    <ChatContainer />
  </main>
  <MobileOverlay />
</div>
```

### 2. Supabase Integration

**Database Schema** (future - for MVP use mock data):

```sql
-- Chats table
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table (existing, add chat_id)
ALTER TABLE messages ADD COLUMN chat_id UUID REFERENCES chats(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_updated_at ON chats(updated_at DESC);
```

### 3. URL Routing

**Pattern**: `/chat/[chatId]`

- Default route `/chat` shows latest or creates new chat
- Specific chat route `/chat/[chatId]` loads that conversation
- Use Next.js dynamic routing with `app/chat/[chatId]/page.tsx`

## Error Handling

### Error Scenarios

1. **Failed to load chats**
   - Display error message in sidebar
   - Provide retry button
   - Log error to console

2. **Failed to create new chat**
   - Show toast notification
   - Keep user on current chat
   - Log error

3. **Failed to navigate to chat**
   - Show error message
   - Fallback to previous chat
   - Log error

### Error UI Components

- Use toast notifications for transient errors
- Display inline error messages for persistent issues
- Provide clear retry mechanisms

## Testing Strategy

### Unit Tests

1. **ChatSidebar Component**
   - Renders correctly with props
   - Handles toggle interactions
   - Responds to store state changes

2. **ChatList Component**
   - Renders empty state
   - Renders list of chats
   - Handles chat selection

3. **Stores**
   - Chat store CRUD operations
   - Sidebar store state management
   - Persistence logic

### Integration Tests

1. **Sidebar Navigation Flow**
   - Create new chat from sidebar
   - Navigate between chats
   - Verify URL updates

2. **Responsive Behavior**
   - Sidebar behavior on mobile
   - Overlay interactions
   - Breakpoint transitions

3. **State Persistence**
   - Sidebar state persists across refreshes
   - Active chat persists

### Manual Testing Checklist

- [ ] Sidebar opens/closes smoothly
- [ ] Chat list displays correctly
- [ ] Active chat is highlighted
- [ ] New chat button works
- [ ] Navigation updates URL
- [ ] Mobile overlay works
- [ ] Responsive breakpoints work
- [ ] Keyboard navigation (accessibility)

## Performance Considerations

### Optimizations

1. **List Virtualization**: For users with many chats (>100), implement virtual scrolling using `react-window` or similar
2. **Lazy Loading**: Load chat messages only when chat is selected
3. **Debounced Search**: If search is added, debounce input
4. **Memoization**: Use React.memo for ChatListItem to prevent unnecessary re-renders

### Bundle Size

- Sidebar components should add minimal bundle size
- Use tree-shaking for icon libraries
- Consider code-splitting for mobile-specific components

## Accessibility

### ARIA Labels

- Sidebar: `role="navigation"`, `aria-label="Chat history"`
- Chat list: `role="list"`
- Chat items: `role="listitem"`, `aria-current="page"` for active
- Toggle button: `aria-label="Toggle sidebar"`, `aria-expanded`

### Keyboard Navigation

- Tab through chat items
- Enter/Space to select chat
- Escape to close sidebar on mobile
- Focus management when opening/closing

### Screen Reader Support

- Announce active chat changes
- Provide descriptive labels for all interactive elements
- Ensure proper heading hierarchy

## Future Enhancements

1. **Search and Filter**: Add search bar to filter chats
2. **Chat Actions**: Rename, delete, archive chats
3. **Folders/Categories**: Organize chats into folders
4. **Pinned Chats**: Pin important conversations to top
5. **Chat Sharing**: Share chat links with others
6. **Export**: Export chat history
7. **Drag and Drop**: Reorder chats manually
