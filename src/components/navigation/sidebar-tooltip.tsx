'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface SidebarTooltipProps {
  label: string
  children: React.ReactNode
  className?: string
}

export function SidebarTooltip({ label, children, className }: SidebarTooltipProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const [mounted, setMounted] = useState(false)

  const updatePosition = useCallback(() => {
    const trigger = wrapperRef.current
    if (!trigger || typeof window === 'undefined') return

    const rect = trigger.getBoundingClientRect()
    const tooltipWidth = tooltipRef.current?.offsetWidth ?? 260
    const gap = 12
    const viewportPadding = 12
    const availableRight = window.innerWidth - rect.right - gap - viewportPadding
    const left = availableRight >= tooltipWidth
      ? rect.right + gap
      : Math.max(viewportPadding, rect.left - tooltipWidth - gap)

    setPosition({
      left,
      top: Math.min(
        Math.max(rect.top + rect.height / 2, viewportPadding),
        window.innerHeight - viewportPadding
      ),
    })
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, updatePosition])

  return (
    <div
      ref={wrapperRef}
      className={cn('group relative', className)}
      onMouseEnter={() => {
        updatePosition()
        setIsOpen(true)
      }}
      onMouseLeave={() => setIsOpen(false)}
      onFocusCapture={() => {
        updatePosition()
        setIsOpen(true)
      }}
      onBlurCapture={() => setIsOpen(false)}
    >
      {children}
      {mounted && isOpen
        ? createPortal(
            <div
              ref={tooltipRef}
              className="pointer-events-none fixed z-[9999] max-w-[min(20rem,calc(100vw-1.5rem))] -translate-y-1/2 translate-x-0.5 rounded-lg border border-[#8A82DC] bg-[#FBFAFF]/95 px-3 py-2 text-xs font-semibold leading-5 text-slate-900 opacity-100 shadow-lg shadow-iris-950/14 backdrop-blur transition-opacity duration-150 ease-out dark:border-iris-300/15 dark:bg-[#241f32] dark:text-slate-100 dark:shadow-iris-950/30"
              role="tooltip"
              style={{ left: position.left, top: position.top }}
            >
              {label}
              <span className="absolute left-[-5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-l border-[#8A82DC] bg-[#FBFAFF] dark:border-iris-300/15 dark:bg-[#241f32]" />
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
