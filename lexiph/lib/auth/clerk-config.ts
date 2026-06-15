export const CLERK_SETUP_TITLE = 'Clerk setup required'
export const CLERK_SETUP_MESSAGE =
  'Add Clerk publishable and secret keys to enable sign-in, signup, and protected app routes.'

export function isClerkConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY
  )
}

