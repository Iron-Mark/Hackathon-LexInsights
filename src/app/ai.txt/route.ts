import { absoluteUrl } from '@/lib/seo'

export const dynamic = 'force-static'

export function GET() {
  return Response.redirect(absoluteUrl('/llms.txt'), 308)
}
