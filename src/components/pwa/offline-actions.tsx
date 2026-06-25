'use client'

import Link from 'next/link'
import { Home, RotateCw } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function OfflineActions() {
  return (
    <div className="mt-7 flex w-full flex-col gap-3 min-[420px]:flex-row min-[420px]:justify-center">
      <Button
        type="button"
        onClick={() => window.location.reload()}
        className="h-12 gap-2 rounded-md px-5"
      >
        <RotateCw className="h-4 w-4" aria-hidden="true" />
        Try again
      </Button>
      <Button asChild variant="outline" className="h-12 gap-2 rounded-md px-5">
        <Link href="/">
          <Home className="h-4 w-4" aria-hidden="true" />
          Return home
        </Link>
      </Button>
    </div>
  )
}
