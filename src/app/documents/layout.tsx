import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { NO_INDEX_ROBOTS } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Documents',
  description: 'Private LexInsights document workspace.',
  robots: NO_INDEX_ROBOTS,
}

export default function DocumentsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children
}
