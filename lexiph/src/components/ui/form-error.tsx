import { AlertCircle } from 'lucide-react'

interface FormErrorProps {
  message: string
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null
  
  return (
    <div 
      className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg"
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}
