import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { getClerkSetupStatus } from './lib/auth/clerk-config'

const isProtectedRoute = createRouteMatcher(['/documents(.*)'])
const isClerkProxyRoute = createRouteMatcher(['/__clerk(.*)'])
const hasClerkKeys = getClerkSetupStatus().configured

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

async function runProtectedClerkProxy(req: NextRequest, event: NextFetchEvent) {
  try {
    return await protectedClerkProxy(req, event)
  } catch (error) {
    console.error('[auth] Clerk proxy failed.', error)
    return NextResponse.next()
  }
}

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  if (!hasClerkKeys) {
    return missingClerkProxy()
  }

  if (isClerkProxyRoute(req)) {
    return runProtectedClerkProxy(req, event)
  }

  if (!isProtectedRoute(req)) {
    return NextResponse.next()
  }

  if (!hasClerkSessionCookie(req)) {
    return redirectToSignIn(req)
  }

  return runProtectedClerkProxy(req, event)
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
}
