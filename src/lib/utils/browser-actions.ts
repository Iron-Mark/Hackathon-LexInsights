export function downloadBlob(blob: Blob, fileName: string) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('Browser download APIs are unavailable.')
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function announceToAssistiveTechnology(message: string, timeoutMs = 1000) {
  if (typeof document === 'undefined') {
    return
  }

  const liveRegion = document.createElement('div')
  liveRegion.setAttribute('role', 'status')
  liveRegion.setAttribute('aria-live', 'polite')
  liveRegion.className = 'sr-only'
  liveRegion.textContent = message
  document.body.appendChild(liveRegion)

  window.setTimeout(() => {
    liveRegion.parentNode?.removeChild(liveRegion)
  }, timeoutMs)
}

export function formatClockTime(dateInput: string | Date) {
  return new Date(dateInput).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatShortDate(dateInput: string | Date) {
  return new Date(dateInput).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatVersionTimestamp(dateInput: string | Date) {
  return new Date(dateInput).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(dateInput: string | Date, now = new Date()) {
  const date = new Date(dateInput)
  const diffInMs = Math.max(0, now.getTime() - date.getTime())
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }

  return new Date(dateInput).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function formatFileSize(bytes: number) {
  if (bytes <= 0) {
    return '0 B'
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getDocumentFileType(fileName: string, mimeType = '') {
  const lowerFileName = fileName.toLowerCase()

  if (lowerFileName.endsWith('.pdf') || mimeType.includes('pdf')) {
    return 'PDF'
  }

  if (lowerFileName.endsWith('.docx') || mimeType.includes('wordprocessingml')) {
    return 'Word'
  }

  if (lowerFileName.endsWith('.doc') || mimeType.includes('msword')) {
    return 'Word'
  }

  if (lowerFileName.endsWith('.md') || mimeType.includes('markdown')) {
    return 'MD'
  }

  if (lowerFileName.endsWith('.txt') || mimeType.includes('text/plain')) {
    return 'TXT'
  }

  return 'File'
}
