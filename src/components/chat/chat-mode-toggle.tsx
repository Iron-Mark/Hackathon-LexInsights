'use client'

import { ChevronDown, FileText, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useChatModeStore } from '@/lib/store/chat-mode-store'

const chatModes = [
  {
    value: 'general',
    label: 'General',
    description: 'Ask legal research questions',
    icon: MessageSquare,
  },
  {
    value: 'compliance',
    label: 'Compliance',
    description: 'Upload or review documents',
    icon: FileText,
  },
] as const

export function ChatModeToggle() {
  const { mode, setMode } = useChatModeStore()
  const activeMode = chatModes.find((item) => item.value === mode) || chatModes[0]
  const ActiveIcon = activeMode.icon

  const handleModeChange = (nextMode: string) => {
    if (nextMode === 'general' || nextMode === 'compliance') {
      setMode(nextMode)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11 shrink-0 gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-700 shadow-sm transition-all hover:border-iris-300 hover:bg-iris-50 hover:text-iris-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-200 dark:hover:border-iris-400/50 dark:hover:bg-iris-400/10 dark:hover:text-iris-200 dark:focus-visible:ring-offset-neutral-800"
          aria-label={`Mode: ${activeMode.label}`}
        >
          <ActiveIcon className="h-4 w-4" aria-hidden="true" />
          <span className="hidden text-sm font-semibold sm:inline">{activeMode.label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        className="w-60 border-slate-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
      >
        <DropdownMenuRadioGroup value={mode} onValueChange={handleModeChange}>
          {chatModes.map((item) => {
            const Icon = item.icon

            return (
              <DropdownMenuRadioItem
                key={item.value}
                value={item.value}
                className="cursor-pointer items-start gap-3 rounded-lg py-2.5 pr-3 text-slate-700 data-[state=checked]:bg-iris-50 data-[state=checked]:text-iris-800 dark:text-slate-300 dark:data-[state=checked]:bg-iris-400/10 dark:data-[state=checked]:text-iris-100"
              >
                <Icon className="mt-0.5 h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="block text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {item.description}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
