'use client'

import { ChevronDown, FileText, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useChatModeStore } from '@/lib/store/chat-mode-store'
import { cn } from '@/lib/utils'

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

interface ChatModeToggleProps {
  showLabelOnMobile?: boolean
}

export function ChatModeToggle({ showLabelOnMobile = false }: ChatModeToggleProps) {
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
          className="min-h-11 shrink-0 gap-2 rounded-lg border border-iris-100 bg-white/80 px-3 text-slate-800 shadow-sm shadow-iris-950/5 transition-all duration-200 hover:border-iris-300 hover:bg-iris-50 hover:text-iris-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:border-iris-300/15 dark:bg-[#171322]/90 dark:text-slate-200 dark:shadow-none dark:hover:border-iris-400/50 dark:hover:bg-iris-400/10 dark:hover:text-iris-200 dark:focus-visible:ring-offset-[#241f32]"
          aria-label={`Mode: ${activeMode.label}`}
        >
          <ActiveIcon className="h-4 w-4 text-iris-600 dark:text-iris-200" aria-hidden="true" />
          <span className={cn('text-sm font-semibold', showLabelOnMobile ? 'inline' : 'hidden min-[430px]:inline')}>
            {activeMode.label}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-iris-400/80 dark:text-iris-200/55" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={10}
        className="w-[min(calc(100vw-2rem),22rem)] rounded-2xl border-iris-100 bg-white/95 p-2.5 shadow-2xl shadow-iris-950/15 backdrop-blur-xl dark:border-iris-300/15 dark:bg-[#171322]/95 dark:shadow-iris-950/40"
      >
        <div className="px-3 pb-2.5 pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Response mode
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
            Choose how the next message should be handled.
          </p>
        </div>
        <DropdownMenuSeparator className="mb-1 bg-slate-200/80 dark:bg-iris-300/15" />
        <DropdownMenuRadioGroup value={mode} onValueChange={handleModeChange}>
          {chatModes.map((item) => {
            const Icon = item.icon
            const isActive = mode === item.value

            return (
              <DropdownMenuRadioItem
                key={item.value}
                value={item.value}
                className="group min-h-16 cursor-pointer items-center gap-3 rounded-xl px-3 py-3 pr-10 text-slate-700 transition-colors focus:bg-iris-50 focus:text-slate-950 data-[state=checked]:bg-iris-50 data-[state=checked]:text-slate-950 dark:text-slate-200 dark:focus:bg-iris-300/12 dark:focus:text-white dark:data-[state=checked]:bg-iris-400/10 dark:data-[state=checked]:text-white [&>span:first-child]:left-auto [&>span:first-child]:right-3 [&>span:first-child]:top-1/2 [&>span:first-child]:-translate-y-1/2 [&>span:first-child]:text-iris-600 dark:[&>span:first-child]:text-iris-300"
              >
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors',
                    isActive
                      ? 'border-iris-200 bg-white text-iris-700 shadow-sm shadow-iris-950/5 dark:border-iris-400/30 dark:bg-iris-400/15 dark:text-iris-200 dark:shadow-none'
                      : 'border-iris-100 bg-iris-50/70 text-iris-500 group-focus:bg-white dark:border-iris-300/15 dark:bg-[#241f32] dark:text-slate-300 dark:group-focus:bg-iris-300/12'
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
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
