# Chat Interface Specification

## Design System
**Inspiration**: ChatGPT + Gemini hybrid

### Layout Structure
```
┌─────────────────────────────────────┐
│ Header: [LexInSight Logo] [User Avatar] │
├─────────────────────────────────────┤
│                                     │
│  Chat Messages Area                 │
│  (Scrollable, centered content)     │
│                                     │
├─────────────────────────────────────┤
│ Input: [Type message...] [Send →]  │
└─────────────────────────────────────┘
```

### Colors (Tailwind)
- Background: `bg-slate-50` (light mode)
- Message User: `bg-blue-500 text-white`
- Message AI: `bg-white border border-slate-200`
- Header: `bg-white border-b`
- Input: `bg-white border rounded-lg`

### Components
1. **ChatHeader**: Logo + user menu
2. **ChatMessages**: Scrollable message list
3. **ChatInput**: Text input + send button
4. **MessageBubble**: User vs AI styling

### Typography
- Font: `font-sans` (default)
- Heading: `text-2xl font-bold`
- Body: `text-base`
- Small: `text-sm text-slate-600`

## Canvas Mode (Future)
- Document viewer on right side
- Collapsible panel
- PDF preview integration