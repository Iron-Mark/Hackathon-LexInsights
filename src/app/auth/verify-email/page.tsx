import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { NO_INDEX_ROBOTS } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Verify Email',
  description: 'LexInsights email verification redirect.',
  robots: NO_INDEX_ROBOTS,
}

export default function VerifyEmailPage() {
  redirect('/auth/signup')
}
