# Troubleshooting Guide

Common issues and their solutions for LexInSight development and deployment.

## 📋 Table of Contents

- [Installation Issues](#installation-issues)
- [Development Server Issues](#development-server-issues)
- [Authentication Issues](#authentication-issues)
- [Database Issues](#database-issues)
- [File Upload Issues](#file-upload-issues)
- [API Issues](#api-issues)
- [Build Issues](#build-issues)
- [Deployment Issues](#deployment-issues)

---

## Installation Issues

### npm install fails

**Problem**: `npm install` throws errors

**Solutions**:

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still failing, try with legacy peer deps
npm install --legacy-peer-deps
```

### Node version mismatch

**Problem**: "Unsupported Node.js version"

**Solution**:

```bash
# Check current version
node --version

# Install correct version (18+)
# Using nvm:
nvm install 20
nvm use 20

# Verify
node --version
```

### Permission errors

**Problem**: EACCES permission denied

**Solution**:

```bash
# On Mac/Linux - fix npm permissions
sudo chown -R $USER:$(id -gn $USER) ~/.npm
sudo chown -R $USER:$(id -gn $USER) ~/.config

# On Windows - run as administrator or:
npm config set prefix %APPDATA%\npm
```

---

## Development Server Issues

### Port 3000 already in use

**Problem**: "Port 3000 is already in use"

**Solution**:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### Hot reload not working

**Problem**: Changes not reflecting

**Solutions**:

1. **Clear .next folder**

```bash
rm -rf .next
npm run dev
```

2. **Check file watcher limits (Linux)**

```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

3. **Disable antivirus watching node_modules**

### Module not found errors

**Problem**: "Module not found: Can't resolve '@/...'"

**Solution**:

Check `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

Then:

```bash
rm -rf .next
npm run dev
```

---

## Authentication Issues

### Cannot sign up

**Problem**: Sign up fails with error

**Checklist**:

- [ ] Is Supabase URL correct in `.env.local`?
- [ ] Is anon key correct?
- [ ] Is email provider enabled in Supabase Auth settings?
- [ ] Is email format valid?
- [ ] Is password strong enough (min 6 chars)?

**Solution**:

```typescript
// Check Supabase connection
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const { data, error } = await supabase.auth.getSession();
console.log("Supabase connection:", data, error);
```

### Cannot log in

**Problem**: Login fails with "Invalid credentials"

**Solutions**:

1. **Verify email is confirmed** (if email confirmation enabled)

   - Check Supabase Dashboard → Authentication → Users
   - Look for email confirmed status

2. **Reset password**

```typescript
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: "http://localhost:3000/auth/reset-password",
});
```

3. **Check RLS policies**

```sql
-- In Supabase SQL Editor
SELECT * FROM auth.users WHERE email = 'your@email.com';
```

### Session expires immediately

**Problem**: User gets logged out instantly

**Solution**:

Check cookie settings:

```typescript
// lib/supabase/client.ts
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return getCookie(name);
        },
        set(name, value, options) {
          setCookie(name, value, options);
        },
        remove(name, options) {
          deleteCookie(name, options);
        },
      },
    }
  );
```

---

## Database Issues

### Connection refused

**Problem**: Cannot connect to Supabase

**Checklist**:

- [ ] Is Supabase project active?
- [ ] Is URL correct?
- [ ] Is anon key correct?
- [ ] Is internet connection working?

**Test connection**:

```bash
# Test API endpoint
curl https://your-project.supabase.co/rest/v1/
```

### RLS preventing access

**Problem**: "row-level security policy violated"

**Solutions**:

1. **Check auth state**

```typescript
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("Current user:", user);
```

2. **Verify RLS policies**

```sql
-- List policies for a table
SELECT * FROM pg_policies WHERE tablename = 'chats';

-- Temporarily disable RLS (DEV ONLY!)
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
```

3. **Check user_id matches**

```sql
-- Verify user owns record
SELECT * FROM chats WHERE user_id = 'user-uuid-here';
```

### Tables not found

**Problem**: "relation does not exist"

**Solution**:

Run setup script:

```bash
# In Supabase SQL Editor
# Copy and run: supabase-setup.sql
```

Verify tables:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

---

## File Upload Issues

### File too large

**Problem**: Upload fails - file too large

**Solution**:

Check file size:

```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

if (file.size > MAX_FILE_SIZE) {
  throw new Error("File exceeds 5MB limit");
}
```

Increase limit in Supabase:

1. Storage → documents → Edit bucket
2. Change file size limit

### Invalid file type

**Problem**: File type not allowed

**Solution**:

```typescript
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error("Invalid file type");
}
```

### Upload fails silently

**Problem**: Upload doesn't complete

**Debug steps**:

```typescript
const { data, error } = await supabase.storage
  .from("documents")
  .upload(path, file);

console.log("Upload result:", { data, error });

if (error) {
  console.error("Upload error details:", error);
}
```

Check bucket policies:

```sql
-- In Supabase SQL Editor
SELECT * FROM storage.buckets WHERE name = 'documents';
```

---

## API Issues

### CORS errors

**Problem**: "CORS policy: No 'Access-Control-Allow-Origin'"

**Solution**:

Enable proxy in `.env.local`:

```env
NEXT_PUBLIC_USE_RAG_PROXY=true
```

Or add CORS headers:

```typescript
// next.config.ts
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type' }
      ]
    }
  ]
}
```

### 404 Not Found

**Problem**: API endpoint returns 404

**Solutions**:

1. **Check route file structure**

```
app/
└── api/
    └── endpoint/
        └── route.ts  ← Must be named 'route.ts'
```

2. **Verify HTTP method**

```typescript
// route.ts must export correct method
export async function GET() {}
export async function POST() {}
```

3. **Clear .next folder**

```bash
rm -rf .next
npm run dev
```

### Timeout errors

**Problem**: Request times out

**Solution**:

Increase timeout:

```typescript
export const maxDuration = 60; // seconds

export async function POST() {
  // Your code
}
```

---

## Build Issues

### TypeScript errors

**Problem**: Build fails with type errors

**Solution**:

```bash
# Check types
npx tsc --noEmit

# If type definitions missing:
npm install --save-dev @types/node @types/react @types/react-dom
```

### Out of memory

**Problem**: "JavaScript heap out of memory"

**Solution**:

```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Or in package.json
"scripts": {
  "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
}
```

### Build takes too long

**Problem**: Build process is slow

**Solutions**:

1. **Disable source maps in production**

```typescript
// next.config.ts
const nextConfig = {
  productionBrowserSourceMaps: false,
};
```

2. **Enable SWC minification**

```typescript
const nextConfig = {
  swcMinify: true,
};
```

3. **Check for large dependencies**

```bash
npm install -g webpack-bundle-analyzer
```

---

## Deployment Issues

### Vercel build fails

**Problem**: Deployment fails on Vercel

**Solutions**:

1. **Check build logs** in Vercel dashboard

2. **Verify environment variables** are set

3. **Test build locally**

```bash
npm run build
npm start
```

4. **Check Next.js version compatibility**

### Environment variables not working

**Problem**: Env vars undefined in production

**Checklist**:

- [ ] Variables prefixed with `NEXT_PUBLIC_`?
- [ ] Variables set in Vercel dashboard?
- [ ] Environment selected (Production/Preview/Development)?
- [ ] Redeployed after adding variables?

**Solution**:

Redeploy:

```bash
vercel --prod
```

### Database connection fails in production

**Problem**: Can't connect to Supabase from production

**Solutions**:

1. **Use production Supabase project**

2. **Check IP restrictions** in Supabase

3. **Verify connection pooling** settings

4. **Test connection**

```typescript
// app/api/test-db/route.ts
export async function GET() {
  const { data, error } = await supabase.from("profiles").select("count");

  return Response.json({ success: !error, error });
}
```

---

## 🔍 Debugging Tips

### Enable Debug Logging

```typescript
// lib/utils/logger.ts
export const debug = (...args: any[]) => {
  if (process.env.NEXT_PUBLIC_DEBUG === "true") {
    console.log("[DEBUG]", ...args);
  }
};
```

### Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. Look for errors (red text)
4. Check Network tab for failed requests

### Check Server Logs

Development:

- Terminal where `npm run dev` is running

Production (Vercel):

- Dashboard → Your Project → Logs

### Use React DevTools

Install: [React Developer Tools](https://react.dev/learn/react-developer-tools)

Features:

- Inspect component props
- View component state
- Profile performance

### Database Debugging

```sql
-- Check RLS policies
SELECT * FROM pg_policies;

-- Check table permissions
SELECT * FROM information_schema.table_privileges;

-- View recent errors
SELECT * FROM pg_stat_database;
```

---

## 🆘 Getting Help

If you're still stuck:

1. **Search existing issues**: [GitHub Issues](https://github.com/KpG782/lexiph/issues)

2. **Create new issue** with:

   - Clear problem description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Error messages
   - Screenshots

3. **Join discussions**: [GitHub Discussions](https://github.com/KpG782/lexiph/discussions)

4. **Check documentation**:
   - [Setup Guide](./SETUP.md)
   - [Architecture](./ARCHITECTURE.md)
   - [API Docs](./API.md)

---

**Last Updated**: November 2025
