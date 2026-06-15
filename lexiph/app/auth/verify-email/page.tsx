import { redirect } from 'next/navigation'

export default function VerifyEmailPage() {
  redirect('/auth/signup')
}
