'use client'

import { useRef, type MouseEvent } from 'react'

const COMPOSER_INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, [role="button"], [role="menuitem"], [role="menuitemradio"]'

export function useComposerTextarea(maxHeightPx: number) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resizeTextarea = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, maxHeightPx)}px`
    element.style.overflowY = element.scrollHeight > maxHeightPx ? 'auto' : 'hidden'
  }

  const resetTextarea = () => {
    if (!textareaRef.current) {
      return
    }

    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.overflowY = 'hidden'
  }

  const focusTextareaFromShellClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof HTMLElement ? event.target : null

    if (!target || target.closest(COMPOSER_INTERACTIVE_SELECTOR)) {
      return
    }

    if (!textareaRef.current?.disabled) {
      textareaRef.current?.focus()
    }
  }

  return {
    textareaRef,
    resizeTextarea,
    resetTextarea,
    focusTextareaFromShellClick,
  }
}
