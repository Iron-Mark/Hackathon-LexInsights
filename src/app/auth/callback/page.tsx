import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { NO_INDEX_ROBOTS } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Auth Callback',
  description: 'LexInsights authentication callback.',
  robots: NO_INDEX_ROBOTS,
}

export default function AuthCallbackPage() {
  redirect('/chat')
}
