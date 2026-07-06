'use client'

import { ChevronDown, FileText, Loader2, MessageSquare, Paperclip, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
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
  compactResearchToggle?: {
    checked: boolean
    disabled: boolean
    isLoading: boolean
    onCheckedChange: (checked: boolean) => void
  }
  compactUploadAction?: {
    disabled: boolean
    onSelect: () => void
  }
}

export function ChatModeToggle({ showLabelOnMobile = false, compactResearchToggle, compactUploadAction }: ChatModeToggleProps) {
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
          className="min-h-11 shrink-0 gap-2 rounded-lg border border-[#8A82DC] bg-[#FBFAFF]/90 px-3 text-slate-900 shadow-sm shadow-iris-950/8 transition-all duration-200 hover:border-iris-600 hover:bg-[#EFECFF] hover:text-iris-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F2FF] dark:border-iris-300/15 dark:bg-[#171322]/90 dark:text-slate-200 dark:shadow-none dark:hover:border-iris-400/50 dark:hover:bg-iris-400/10 dark:hover:text-iris-200 dark:focus-visible:ring-offset-[#241f32]"
          aria-label={`Mode: ${activeMode.label}`}
        >
          <ActiveIcon className="h-4 w-4 text-iris-600 dark:text-iris-200" aria-hidden="true" />
          <span className={cn('text-sm font-semibold', showLabelOnMobile ? 'inline' : 'hidden min-[700px]:inline')}>
            {activeMode.label}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-iris-400/80 dark:text-iris-200/55" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        collisionPadding={8}
        className="max-h-[min(calc(100dvh-9rem),var(--radix-dropdown-menu-content-available-height))] w-[min(calc(100vw-2rem),22rem)] overflow-y-auto overscroll-contain rounded-2xl border-[#8A82DC] bg-[#FBFAFF]/95 p-2.5 shadow-2xl shadow-iris-950/15 backdrop-blur-xl max-[359px]:rounded-xl max-[359px]:p-2 dark:border-iris-300/15 dark:bg-[#171322]/95 dark:shadow-iris-950/40"
      >
        <div className="px-3 pb-2.5 pt-2 max-[359px]:px-2 max-[359px]:pb-2 max-[359px]:pt-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
            Response mode
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-700 max-[359px]:leading-4 dark:text-slate-300">
            Choose how the next message should be handled.
          </p>
        </div>
        <DropdownMenuSeparator className="mb-1 bg-[#8A82DC]/70 dark:bg-iris-300/15" />
        <DropdownMenuRadioGroup value={mode} onValueChange={handleModeChange}>
          {chatModes.map((item) => {
            const Icon = item.icon
            const isActive = mode === item.value

            return (
              <DropdownMenuRadioItem
                key={item.value}
                value={item.value}
                className="group min-h-16 cursor-pointer items-center gap-3 rounded-xl px-3 py-3 pr-10 text-slate-800 transition-colors focus:bg-[#EFECFF] focus:text-slate-950 data-[state=checked]:bg-[#EFECFF] data-[state=checked]:text-slate-950 max-[359px]:min-h-14 max-[359px]:gap-2 max-[359px]:px-2 max-[359px]:py-2.5 max-[359px]:pr-8 dark:text-slate-200 dark:focus:bg-iris-300/12 dark:focus:text-white dark:data-[state=checked]:bg-iris-400/10 dark:data-[state=checked]:text-white [&>span:first-child]:left-auto [&>span:first-child]:right-3 [&>span:first-child]:top-1/2 [&>span:first-child]:-translate-y-1/2 [&>span:first-child]:text-iris-600 max-[359px]:[&>span:first-child]:right-2 dark:[&>span:first-child]:text-iris-300"
              >
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors max-[359px]:h-9 max-[359px]:w-9',
                    isActive
                      ? 'border-[#8A82DC] bg-[#FBFAFF] text-iris-800 shadow-sm shadow-iris-950/8 dark:border-iris-400/30 dark:bg-iris-400/15 dark:text-iris-200 dark:shadow-none'
                      : 'border-[#8A82DC]/70 bg-[#F8F6FF] text-iris-700 group-focus:bg-[#FBFAFF] dark:border-iris-300/15 dark:bg-[#241f32] dark:text-slate-300 dark:group-focus:bg-iris-300/12'
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-semibold">{item.label}</span>
                  <span className="mt-0.5 block break-words text-xs leading-5 text-slate-700 max-[359px]:leading-4 dark:text-slate-400">
                    {item.description}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
        {compactResearchToggle && (
          <>
            <DropdownMenuSeparator className="mb-1 bg-[#8A82DC]/70 dark:bg-iris-300/15" />
            <DropdownMenuCheckboxItem
              checked={compactResearchToggle.checked}
              disabled={compactResearchToggle.disabled}
              onCheckedChange={(checked) => compactResearchToggle.onCheckedChange(checked === true)}
              onSelect={(event) => event.preventDefault()}
              className="flex min-h-14 cursor-pointer items-center gap-2 rounded-xl px-2 py-2.5 pl-2 text-slate-800 transition-colors focus:bg-[#EFECFF] focus:text-slate-950 data-disabled:pointer-events-auto data-disabled:cursor-not-allowed dark:text-slate-200 dark:focus:bg-iris-300/12 dark:focus:text-white [&>span:first-child]:hidden"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#8A82DC] bg-[#EFECFF] text-iris-800 shadow-sm shadow-iris-950/8 dark:border-iris-400/30 dark:bg-iris-400/10 dark:text-iris-200 dark:shadow-none">
                {compactResearchToggle.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-semibold">
                  {compactResearchToggle.isLoading ? 'Researching' : 'Research mode'}
                </span>
                <span className="mt-0.5 block break-words text-xs leading-4 text-slate-700 dark:text-slate-400">
                  {compactResearchToggle.disabled
                    ? 'Unavailable for now.'
                    : compactResearchToggle.checked
                      ? 'On: deep research on send.'
                      : 'Off: standard send.'}
                </span>
              </span>
            </DropdownMenuCheckboxItem>
          </>
        )}
        {compactUploadAction && (
          <>
            <DropdownMenuSeparator className="mb-1 hidden bg-[#8A82DC]/70 max-[699px]:block dark:bg-iris-300/15" />
            <DropdownMenuItem
              disabled={compactUploadAction.disabled}
              onSelect={(event) => {
                if (compactUploadAction.disabled) {
                  event.preventDefault()
                  return
                }

                compactUploadAction.onSelect()
              }}
              className="hidden min-h-14 cursor-pointer items-center gap-2 rounded-xl px-2 py-2.5 pl-2 text-slate-800 transition-colors focus:bg-[#EFECFF] focus:text-slate-950 data-disabled:pointer-events-auto data-disabled:cursor-not-allowed max-[699px]:flex dark:text-slate-200 dark:focus:bg-iris-300/12 dark:focus:text-white"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#8A82DC] bg-[#EFECFF] text-iris-800 shadow-sm shadow-iris-950/8 dark:border-iris-400/30 dark:bg-iris-400/10 dark:text-iris-200 dark:shadow-none">
                <Paperclip className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-semibold">Upload document</span>
                <span className="mt-0.5 block break-words text-xs leading-4 text-slate-700 dark:text-slate-400">
                  Add a file for compliance review.
                </span>
              </span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
