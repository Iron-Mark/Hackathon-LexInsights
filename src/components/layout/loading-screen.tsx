interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 supports-[height:100dvh]:min-h-dvh dark:bg-[#171322]">
      <div className="text-slate-600 dark:text-slate-300">{message}</div>
    </div>
  )
}
