import { AlertCircle } from 'lucide-react'

interface FormErrorProps {
  message: string
  id?: string
}

export function FormError({ message, id }: FormErrorProps) {
  if (!message) return null
  
  return (
    <div 
      id={id}
      className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200"
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}
