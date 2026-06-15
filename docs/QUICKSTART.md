# Quick Start Guide

Get LexInSight up and running in 10 minutes!

## 🚀 Prerequisites

Before starting, make sure you have:

- ✅ Node.js 18+ installed
- ✅ Git installed
- ✅ A Clerk account (free)
- ✅ A Supabase account (free)

## ⚡ 5-Minute Setup

### Step 1: Clone & Install (2 minutes)

```bash
# Clone repository
git clone https://github.com/Iron-Mark/Hackathon-LexInsights.git
cd Hackathon-LexInsights/lexiph

# Install dependencies
npm install
```

### Step 2: Clerk And Supabase Setup (3 minutes)

1. **Create Clerk app** at [dashboard.clerk.com](https://dashboard.clerk.com/)
   - Copy the publishable and secret keys
   - Configure sign-in URL `/auth/login` and sign-up URL `/auth/signup`
   - Configure Clerk's Supabase compatibility
2. **Create Supabase project** at [app.supabase.com](https://app.supabase.com)
3. **Get Supabase credentials**: Settings → API
   - Copy Project URL
   - Copy publishable key
4. **Enable Clerk Third-Party Auth** in the Supabase dashboard
5. **Set up database**: SQL Editor → New Query
   - Paste contents of `supabase-setup.sql`
   - Click Run
6. **Create storage**: SQL Editor → New Query
   - Paste contents of `supabase-storage-setup.sql`
   - Click Run

### Step 3: Configure Environment (1 minute)

Create `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/signup
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/chat
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/chat
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4: Run! (1 minute)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## 📝 First Steps

### 1. Create Account

- Click "Sign Up"
- Enter email and password
- Click "Create Account"

### 2. Try General Mode

- Type: "What are the requirements for RA 10173?"
- Press Enter
- See AI response!

### 3. Try Compliance Mode

- Toggle to Compliance Mode
- Drag and drop a PDF document
- Type: "Check compliance with data privacy law"
- Click Send
- View analysis report

## 🎯 Next Steps

### Explore Features

- 💬 Create multiple chats
- 📄 Upload different document types
- 🔍 Try deep search
- 📂 Manage your documents

### Learn More

- [Full Setup Guide](./SETUP.md) - Detailed instructions
- [Architecture](./ARCHITECTURE.md) - How it works
- [API Reference](./API.md) - API documentation
- [Contributing](./CONTRIBUTING.md) - How to contribute

## 🔧 Common Issues

### Port 3000 in use?

```bash
npm run dev -- -p 3001
```

### Dependencies not installing?

```bash
rm -rf node_modules package-lock.json
npm install
```

### Supabase connection failed?

- Check URL and key in `.env.local`
- Ensure project is active
- Verify database setup ran successfully

### More help?

See [Troubleshooting Guide](./TROUBLESHOOTING.md)

## 📚 File Reference

### SQL Files

- `supabase-setup.sql` - Creates all database tables
- `supabase-storage-setup.sql` - Configures file storage

### Config Files

- `.env.local` - Environment variables (create this)
- `package.json` - Dependencies and scripts
- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration

## 💡 Tips

### Development

- Changes hot reload automatically
- Check terminal for errors
- Use browser DevTools (F12) for debugging

### Database

- View tables in Supabase Dashboard → Table Editor
- Run queries in SQL Editor
- Check storage in Storage → documents

### Best Practices

- Never commit `.env.local`
- Use meaningful commit messages
- Test before pushing
- Read documentation

## 🆘 Need Help?

- 📖 [Documentation](./SETUP.md)
- 🐛 [Report Bug](https://github.com/Iron-Mark/Hackathon-LexInsights/issues)
- 💬 [Questions and feature requests](https://github.com/Iron-Mark/Hackathon-LexInsights/issues)
- 📧 [Email Support](mailto:support@lexinsight.ph) (coming soon)

---

**Setup time**: ~10 minutes
**Difficulty**: Easy
**Prerequisites**: Basic terminal knowledge

Happy coding! 🚀
