import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <main className="flex flex-col items-center justify-center space-y-6 sm:space-y-8 px-4 text-center">
        <div className="space-y-3 sm:space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900">
            LexInsight
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-md px-4">
            Your Philippine legal compliance assistant
          </p>
        </div>
        
        <Link href="/auth/login">
          <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 min-h-[44px]">
            Get Started
          </Button>
        </Link>
      </main>
    </div>
  )
}
