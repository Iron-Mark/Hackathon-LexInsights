'use client'

import { MessageSquare, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useChatModeStore } from '@/lib/store/chat-mode-store'

export function ChatModeToggle() {
  const { mode, setMode } = useChatModeStore()

  return (
    <div 
      role="group" 
      aria-label="Chat mode selection"
      className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
    >
      {/* General Chat Mode */}
      <Button
        onClick={() => setMode('general')}
        variant="ghost"
        size="sm"
        role="radio"
        aria-checked={mode === 'general'}
        aria-label="Switch to general chat mode"
        className={cn(
          'h-9 gap-2 rounded-md px-3 transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          mode === 'general'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        )}
      >
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        <span className="text-sm font-medium">General</span>
      </Button>

      {/* Compliance/Document Mode */}
      <Button
        onClick={() => setMode('compliance')}
        variant="ghost"
        size="sm"
        role="radio"
        aria-checked={mode === 'compliance'}
        aria-label="Switch to compliance document mode"
        className={cn(
          'h-9 gap-2 rounded-md px-3 transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          mode === 'compliance'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        )}
      >
        <FileText className="h-4 w-4" aria-hidden="true" />
        <span className="text-sm font-medium">Compliance</span>
      </Button>
    </div>
  )
}
