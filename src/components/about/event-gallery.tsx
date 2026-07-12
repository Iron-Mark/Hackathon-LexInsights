'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import { EVENT_GALLERY as GALLERY } from '@/lib/event-media'

export function EventGallery() {
  const [index, setIndex] = useState<number | null>(null)
  const isOpen = index !== null
  const current = index === null ? null : GALLERY[index]

  const go = useCallback((delta: number) => {
    setIndex((prev) => {
      if (prev === null) return prev
      return (prev + delta + GALLERY.length) % GALLERY.length
    })
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        go(1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        go(-1)
      }
    },
    [go]
  )

  return (
    <>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {GALLERY.map((image, i) => (
          <li key={image.src}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group relative block aspect-square w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-iris-300/15 dark:bg-iris-300/5 dark:focus-visible:ring-offset-[#171322]"
              aria-label={`Open photo ${i + 1} of ${GALLERY.length}: ${image.caption}`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 640px) 210px, 45vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />
              <span
                className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-slate-950/5 transition-colors group-hover:ring-iris-500/40 dark:ring-white/5"
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ul>

      <DialogPrimitive.Root
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) setIndex(null)
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 dark:bg-[#0d0a16]/92" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            onKeyDown={handleKeyDown}
            className="fixed inset-0 z-[60] flex flex-col outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          >
            <DialogPrimitive.Title className="sr-only">
              CodeKada 2025 event photos
            </DialogPrimitive.Title>

            <div className="flex items-center justify-between px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] text-white">
              <span className="text-xs font-semibold tabular-nums text-white/75">
                {(index ?? 0) + 1} / {GALLERY.length}
              </span>
              <span role="status" aria-live="polite" className="sr-only">
                {current ? `Photo ${(index ?? 0) + 1} of ${GALLERY.length}: ${current.caption}` : ''}
              </span>
              <DialogPrimitive.Close
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Close photo viewer"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </DialogPrimitive.Close>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-4">
              <button
                type="button"
                onClick={() => go(-1)}
                className="group absolute inset-y-0 left-0 z-10 flex w-[22%] min-w-16 max-w-32 items-center justify-start bg-gradient-to-r from-transparent to-transparent pl-2 transition-colors duration-200 hover:from-white/12 focus-visible:from-white/12 focus-visible:outline-none active:from-white/25 sm:pl-4"
                aria-label="Previous photo"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/65 backdrop-blur transition-all duration-150 group-hover:bg-white/20 group-hover:text-white group-focus-visible:ring-2 group-focus-visible:ring-white/80 group-active:scale-90">
                  <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                </span>
              </button>

              {current && (
                <Image
                  key={current.src}
                  src={current.src}
                  alt={current.alt}
                  width={1600}
                  height={1600}
                  sizes="100vw"
                  priority
                  className="max-h-full w-auto max-w-full rounded-lg object-contain shadow-2xl shadow-black/40"
                />
              )}

              <button
                type="button"
                onClick={() => go(1)}
                className="group absolute inset-y-0 right-0 z-10 flex w-[22%] min-w-16 max-w-32 items-center justify-end bg-gradient-to-l from-transparent to-transparent pr-2 transition-colors duration-200 hover:from-white/12 focus-visible:from-white/12 focus-visible:outline-none active:from-white/25 sm:pr-4"
                aria-label="Next photo"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/65 backdrop-blur transition-all duration-150 group-hover:bg-white/20 group-hover:text-white group-focus-visible:ring-2 group-focus-visible:ring-white/80 group-active:scale-90">
                  <ChevronRight className="h-6 w-6" aria-hidden="true" />
                </span>
              </button>
            </div>

            {current && (
              <p className="mx-auto max-w-2xl px-6 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-center text-sm leading-6 text-balance text-white/85">
                {current.caption}
              </p>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
