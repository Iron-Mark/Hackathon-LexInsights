interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-neutral-900">
      <div className="text-slate-600 dark:text-slate-300">{message}</div>
    </div>
  )
}
