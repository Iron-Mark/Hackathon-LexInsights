'use client'

import Image from 'next/image'
import { UserMenu } from './user-menu'

export function ChatHeader() {
  return (
    <header className="sticky top-0 z-10 h-14 sm:h-16 bg-white border-b border-slate-200">
      <div className="h-full w-full px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex-1" />
        
        {/* Centered Logo */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1">
          <div className="shrink-0">
            <Image 
              src="/logo/LOGO-0.5-woBG.svg" 
              alt="LexiPH Logo" 
              width={40}
              height={40}
              priority
            />
          </div>
          <div className="flex flex-col items-start">
            <h1 className="text-lg sm:text-xl font-bold bg-linear-to-r from-iris-500 via-purple-600 to-iris-700 animate-gradient bg-clip-text text-transparent leading-tight">
              LexInSight
            </h1>
            <p className="text-[10px] sm:text-xs font-medium bg-linear-to-r from-iris-400 via-purple-500 to-iris-600 animate-gradient bg-clip-text text-transparent leading-tight">
              AI compliance assistant
            </p>
          </div>
        </div>
        
        <UserMenu />
      </div>
    </header>
  )
}
