import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/chat(.*)', '/documents(.*)'])
const isClerkProxyRoute = createRouteMatcher(['/__clerk(.*)'])
const hasClerkKeys = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY
)

function missingClerkProxy() {
  return NextResponse.next()
}

const protectedClerkProxy = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const signInUrl = buildSignInUrl(req)

    await auth.protect({ unauthenticatedUrl: signInUrl })
  }
})

function hasClerkSessionCookie(req: NextRequest) {
  return req.cookies.getAll().some(({ name }) => (
    name === '__session' ||
    name.startsWith('__session_') ||
    name.startsWith('__client') ||
    name.startsWith('__clerk')
  ))
}

function buildSignInUrl(req: NextRequest) {
  const signInUrl = new URL('/auth/login', req.url)
  const redirectUrl = `${req.nextUrl.pathname}${req.nextUrl.search}`

  signInUrl.searchParams.set('redirect_url', redirectUrl)

  return signInUrl.toString()
}

function redirectToSignIn(req: NextRequest) {
  const signInUrl = buildSignInUrl(req)

  return NextResponse.redirect(signInUrl)
}

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  if (!hasClerkKeys) {
    return missingClerkProxy()
  }

  if (isClerkProxyRoute(req)) {
    return protectedClerkProxy(req, event)
  }

  if (!isProtectedRoute(req)) {
    return NextResponse.next()
  }

  if (!hasClerkSessionCookie(req)) {
    return redirectToSignIn(req)
  }

  return protectedClerkProxy(req, event)
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
}
