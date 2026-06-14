# Deployment Guide

This guide covers deploying LexInSight to production environments.

## 📋 Pre-Deployment Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] Storage bucket configured
- [ ] API keys secured
- [ ] Error tracking set up
- [ ] Analytics configured
- [ ] Performance testing done
- [ ] Security audit completed
- [ ] Documentation updated

## 🚀 Vercel Deployment (Recommended)

Vercel provides the best experience for Next.js applications.

### Prerequisites

- GitHub repository
- Vercel account ([Sign up](https://vercel.com/signup))
- Supabase project (production)

### Step 1: Prepare Repository

```bash
# Ensure your code is committed
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Connect to Vercel

#### Option A: Using Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Select the `lexiph` folder
5. Click **"Deploy"**

The project must use `lexiph` as the Vercel root directory. If production serves the homepage but returns `404` for `/api/version` or `/api/readiness`, it is stale or connected to a different project/codebase.

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd lexiph
vercel
```

### Step 3: Configure Environment Variables

In Vercel Dashboard:

1. Go to **Project Settings** → **Environment Variables**
2. Add the following:

```env
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key

# App URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# RAG API (Production)
NEXT_PUBLIC_RAG_API_URL=https://prod-api.example.com
NEXT_PUBLIC_RAG_WS_URL=wss://prod-api.example.com
NEXT_PUBLIC_USE_RAG_PROXY=true
```

3. Set environment for: **Production**, **Preview**, **Development**

### Step 4: Configure Build Settings

Vercel auto-detects Next.js, but verify:

- **Framework Preset**: Next.js
- **Root Directory**: `lexiph`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### Step 5: Deploy to Production

```bash
# Deploy to production
vercel --prod

# Verify deployment linkage and freshness
npm run check:deployment -- --base-url https://lexinsights.vercel.app
```

Or push to main branch (auto-deploys).

### Step 6: Configure Domain

1. Go to **Project Settings** → **Domains**
2. Add your custom domain
3. Configure DNS:
   - Type: `CNAME`
   - Name: `@` or `www`
   - Value: `cname.vercel-dns.com`

### Vercel Features

✅ **Automatic HTTPS**
✅ **Edge Network CDN**
✅ **Preview Deployments** (every PR)
✅ **Instant Rollbacks**
✅ **Analytics**
✅ **Web Vitals Monitoring**

## 🐳 Docker Deployment

For self-hosting or custom infrastructure.

### Create Dockerfile

```dockerfile
# Base image
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Update next.config.ts

```typescript
const nextConfig = {
  output: 'standalone',
  // ... other config
}
```

### Build Docker Image

```bash
docker build -t lexinsight:latest .
```

### Run Container

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  lexinsight:latest
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - app
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

## ☁️ AWS Deployment

### AWS Amplify

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Click **"New app"** → **"Host web app"**
3. Connect GitHub repository
4. Configure build settings:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd lexiph
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: lexiph/.next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

5. Add environment variables
6. Deploy

### AWS EC2

1. **Launch EC2 Instance**
   - AMI: Ubuntu 22.04
   - Instance type: t3.medium (minimum)
   - Security group: HTTP (80), HTTPS (443), SSH (22)

2. **Connect and Install Dependencies**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

3. **Deploy Application**

```bash
# Clone repository
git clone https://github.com/Iron-Mark/Hackathon-LexInsights.git
cd Hackathon-LexInsights/lexiph

# Install dependencies
npm ci

# Build
npm run build

# Start with PM2
pm2 start npm --name "lexinsight" -- start
pm2 save
pm2 startup
```

4. **Configure Nginx**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

5. **Enable HTTPS with Let's Encrypt**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 🔧 Environment Configuration

### Production Environment Variables

```env
# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# RAG API
NEXT_PUBLIC_RAG_API_URL=https://api.your-domain.com
NEXT_PUBLIC_RAG_WS_URL=wss://api.your-domain.com
NEXT_PUBLIC_USE_RAG_PROXY=true

# Optional: Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# Optional: Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=true
```

### Environment Variable Security

✅ **Never commit `.env.local`**
✅ **Use different keys for dev/staging/prod**
✅ **Rotate keys periodically**
✅ **Use secret management services**
✅ **Limit key permissions**

## 🗄️ Database Migration

### Production Database Setup

1. **Create Production Supabase Project**
   - Go to Supabase Dashboard
   - Create new project
   - Choose production region

2. **Run Migrations**

```bash
# Connect to production database
psql postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

# Run setup script
\i supabase-setup.sql
\i supabase-storage-setup.sql
```

3. **Verify Tables**

```sql
-- Check tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

## 🔒 Security Hardening

### HTTPS Configuration

Ensure all traffic uses HTTPS:

```javascript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}
```

### Rate Limiting

Implement rate limiting:

```typescript
// middleware.ts
import { rateLimit } from '@/lib/rate-limit'

export async function middleware(request: Request) {
  const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500
  })

  try {
    await limiter.check(10, 'CACHE_TOKEN') // 10 requests per minute
  } catch {
    return new Response('Too Many Requests', { status: 429 })
  }
}
```

### Security Headers

```typescript
// In next.config.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
]
```

## 📊 Monitoring & Analytics

### Vercel Analytics

Automatically enabled on Vercel:

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### Error Tracking (Sentry)

```bash
npm install @sentry/nextjs
```

```typescript
// sentry.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
})
```

### Google Analytics

```typescript
// lib/analytics.ts
export const pageview = (url: string) => {
  window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
    page_path: url
  })
}

export const event = ({ action, category, label, value }) => {
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value
  })
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions

The repository includes `.github/workflows/ci.yml` for code-quality gates on push and pull request events. It runs from the `lexiph` app root.

Use the same sequence locally before a release checkpoint:

```bash
npm run check:local
```

CI keeps the sequence expanded so each failed layer is visible in GitHub Actions logs:

```yaml
npm ci
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm audit --omit=dev
npm run check:readiness:self-test
npm run check:deployment:self-test
npm run check:rag-proxy:self-test
npm run build
npm run smoke:browser
```

Production deployment is still handled by Vercel/Git integration, not by a repo-owned deploy workflow. Keep `npm run check:readiness` as the live backend gate after Supabase and RAG environment values point to reachable services.

Before full live QA, run the deployment preflight. It checks the app root, local Vercel link presence, `/api/version`, `/api/readiness`, and the public RAG proxy route without printing env values or provider secrets:

```bash
npm run check:deployment -- --base-url https://lexinsights.vercel.app
```

Add `--with-vercel-cli` when you also want a local Vercel CLI check from the current shell. This verifies CLI availability, authenticated user, visible projects, whether any visible project is linked to `Iron-Mark/Hackathon-LexInsights`, whether any visible project owns the configured live URL alias, and whether `vercel inspect` can read that deployment.

Use `--discover-vercel-scopes` with the CLI check to print safe team-scope slugs available to the current Vercel account:

```bash
npm run check:deployment -- --base-url https://lexinsights.vercel.app --with-vercel-cli --discover-vercel-scopes
```

If the project may live under a team, pass the team scope explicitly:

```bash
npm run check:deployment -- --base-url https://lexinsights.vercel.app --with-vercel-cli --discover-vercel-scopes --vercel-scope marksiazon-dev
```

When the repo or live URL is still not visible, the preflight prints a non-critical `vercel.recovery_hint` with the next scoped command or provider action.

If the CLI check reports no visible project for this repository or live URL, switch to the Vercel team/account that owns the deployment or import this repository into a new Vercel project. Set the project Root Directory to `lexiph`, configure the required env vars, deploy `main`, then rerun the preflight. A GitHub push alone will not update `https://lexinsights.vercel.app` if that domain is attached to an inaccessible or unrelated Vercel project.

After production deploys, verify deployment freshness before claiming live E2E:

```bash
npm run check:live -- --base-url https://lexinsights.vercel.app
```

Use `--source-only` when validating deployment freshness before external Supabase/RAG services are healthy:

```bash
npm run check:live -- --base-url https://lexinsights.vercel.app --source-only
```

Full mode checks the public routes, `GET /api/version`, `GET /api/readiness`, and the RAG proxy health path. `/api/version` returns non-secret build metadata, including the Vercel/Git commit SHA when the project is connected through Vercel Git integration. A commit mismatch means the live app is not serving the current repository state.

## 🚦 Health Checks

Use the runtime version and readiness endpoints:

```bash
curl https://lexinsights.vercel.app/api/version
curl https://lexinsights.vercel.app/api/readiness
```

The endpoint returns `200` only when critical Supabase env/key checks, Supabase DNS, direct RAG health, and RAG proxy health checks pass. It returns `503` with component-level blocker details while an external backend is down. Supabase key checks validate public key format, anon role, and legacy JWT issuer/project-ref alignment without printing the raw key.

For a faster operator probe while an upstream backend is known to be unavailable, call `/api/readiness?timeoutMs=2000`. The readiness route forwards that timeout to the RAG proxy health call; proxy upstream timeouts return structured `504` errors, upstream connection failures return structured `502` errors, and proxy `endpoint` values must remain on the configured RAG API origin.

## 📈 Performance Optimization

### Enable Caching

```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    optimizeCss: true
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60
  }
}
```

### CDN Configuration

Use Vercel's Edge Network or CloudFlare for:
- Static asset caching
- Image optimization
- DDoS protection
- Global distribution

## 🔙 Backup & Recovery

### Database Backups

Supabase auto-backups:
- Daily backups (7 days retention)
- Point-in-time recovery

Manual backup:
```bash
pg_dump -h your-host -U postgres your-db > backup.sql
```

### Storage Backups

```bash
# Backup Supabase storage
supabase storage download documents ./backups/documents
```

## 📝 Post-Deployment

### Verification Checklist

- [ ] Website accessible
- [ ] HTTPS working
- [ ] Authentication working
- [ ] File uploads working
- [ ] Database connections working
- [ ] API endpoints responding
- [ ] Error tracking active
- [ ] Analytics reporting
- [ ] Performance acceptable
- [ ] Mobile responsive

### Monitoring

Monitor these metrics:
- Response times
- Error rates
- CPU/Memory usage
- Database connections
- Storage usage
- API rate limits

---

**Need help?** Contact the team or open an issue!
