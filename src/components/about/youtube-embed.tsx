'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'

interface YouTubeEmbedProps {
  videoId: string
  title: string
  /** Local poster shown before playback so no external request fires on load. */
  poster: string
}

/**
 * Click-to-load YouTube facade: shows a local poster + play button, and only
 * mounts the (privacy-friendly, no-cookie) iframe once the user hits play, so
 * the heavy YouTube player never loads on first paint.
 */
export function YouTubeEmbed({ videoId, title, poster }: YouTubeEmbedProps) {
  const [active, setActive] = useState(false)

  return (
    <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-black shadow-sm dark:border-iris-300/15">
      {active ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="group absolute inset-0 h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-inset"
          aria-label={`Play video: ${title}`}
        >
          <Image
            src={poster}
            alt=""
            fill
            sizes="(min-width: 768px) 42rem, 100vw"
            className="object-cover opacity-85 transition-opacity duration-200 group-hover:opacity-100"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-transform duration-200 group-hover:scale-110 group-focus-visible:scale-110">
              <Play className="h-7 w-7 translate-x-0.5 fill-current" aria-hidden="true" />
            </span>
          </span>
        </button>
      )}
    </div>
  )
}
