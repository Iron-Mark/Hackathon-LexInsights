# LexInSight Setup Guide

Complete installation and configuration guide for setting up LexInSight locally.

## ��� Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Node.js 18.x or higher**: [Download](https://nodejs.org/)
  - Check version: `node --version`
  - Recommended: v18.17.0 or higher

- **npm 9.x or higher** (comes with Node.js)
  - Check version: `npm --version`
  - Alternative: Use pnpm or yarn

- **Git**: [Download](https://git-scm.com/)
  - Check version: `git --version`
  - Required for cloning the repository

### Required Accounts

- **Supabase Account**: [Sign up](https://supabase.com/)
  - Free tier available
  - Required for database and authentication

- **Reachable RAG API** (Optional for full functionality)
  - The default hosted endpoint is `https://devkada.resqlink.org`
  - Required for `/test-rag`, chat RAG, deep search, and compliance analysis
  - If the hosted endpoint is unavailable, run a compatible backend locally and update `.env.local`

## ��� Quick Start

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/Iron-Mark/Hackathon-LexInsights.git

# Navigate to the project directory
cd Hackathon-LexInsights/lexiph
```

### 2. Install Dependencies

```bash
# Install all npm packages
npm install
```

This will install all required dependencies including:
- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- Supabase Client
- Zustand
- and more...

### 3. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=LexInSight

# RAG API Configuration (OPTIONAL)
NEXT_PUBLIC_RAG_API_URL=https://devkada.resqlink.org
NEXT_PUBLIC_RAG_WS_URL=wss://devkada.resqlink.org
NEXT_PUBLIC_USE_RAG_PROXY=true

# Analytics (OPTIONAL)
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

### 4. Set Up Supabase

#### Create a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Fill in project details:
   - **Name**: LexInSight
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your location
4. Wait for project to be created (~2 minutes)

#### Get API Credentials

1. Go to **Project Settings** → **API**
2. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Paste them into your `.env.local` file

#### Run Database Migration

```bash
# Navigate to the project root
cd lexiph

# Run the database setup script
npm run db:setup
```

**OR manually via Supabase Dashboard:**

1. Go to **SQL Editor** in Supabase Dashboard
2. Open `supabase-setup.sql` from project root
3. Copy the entire contents
4. Paste into SQL Editor
5. Click "Run"

This will create:
- `profiles` table
- `chats` table
- `messages` table
- `documents` table
- All necessary Row-Level Security (RLS) policies
- Database functions and triggers

#### Set Up Storage Bucket

```bash
# Run the storage setup script
npm run storage:setup
```

**OR manually via Supabase Dashboard:**

1. Go to **Storage** in Supabase Dashboard
2. Create a new bucket:
   - **Name**: `documents`
   - **Public**: No (private)
   - **File size limit**: 5MB
3. Go to **Policies** tab
4. Add the following policies:
   - **Insert**: Allow authenticated users to upload their own files
   - **Select**: Allow authenticated users to view their own files
   - **Update**: Allow authenticated users to update their own files
   - **Delete**: Allow authenticated users to delete their own files

Alternatively, run the SQL from `supabase-storage-setup.sql`.

### 5. Start Development Server

```bash
# Start the development server
npm run dev
```

The application will be available at:
- **Local**: http://localhost:3000
- **Network**: http://192.168.x.x:3000 (your local IP)

## ���️ Detailed Setup

### Database Schema

The database consists of four main tables:

#### 1. Profiles Table
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. Chats Table
```sql
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('general', 'compliance')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. Messages Table
```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. Documents Table
```sql
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'error')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row-Level Security (RLS)

All tables have RLS enabled with the following policies:

#### Profiles
- Users can view their own profile
- Users can update their own profile
- New users are automatically added via trigger

#### Chats
- Users can view their own chats
- Users can create new chats
- Users can update their own chats
- Users can delete their own chats

#### Messages
- Users can view messages from their chats
- Users can create messages in their chats
- Users cannot update or delete messages

#### Documents
- Users can view their own documents
- Users can upload documents
- Users can update their own documents
- Users can delete their own documents

### Environment Variables Reference

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGc...` |

#### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME` | Application name | `LexInSight` |
| `NEXT_PUBLIC_RAG_API_URL` | RAG API endpoint | `https://devkada.resqlink.org` |
| `NEXT_PUBLIC_RAG_WS_URL` | RAG WebSocket endpoint | `wss://devkada.resqlink.org` |
| `NEXT_PUBLIC_USE_RAG_PROXY` | Route browser RAG calls through `/api/rag-proxy` | `true` |
| `NEXT_PUBLIC_ANALYTICS_ID` | Analytics tracking ID | - |

## ��� Development Workflow

### Running the Application

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linter
npm run lint -- --max-warnings=0

# Full local quality gate
npm run check:local
```

### Development Tools

#### TypeScript

TypeScript is configured with strict mode. Check types with:

```bash
# Type checking
npx tsc --noEmit
```

Run the complete sequential local gate before pushing:

```bash
npm run check:local
```

#### ESLint

Code linting is configured with Next.js rules:

```bash
# Run linter
npm run lint -- --max-warnings=0

# Fix auto-fixable issues
npm run lint -- --fix
```

### Project Structure Navigation

```
lexiph/
├── app/              # Next.js App Router
│   ├── api/         # API routes
│   ├── auth/        # Authentication pages
│   ├── chat/        # Chat interface
│   └── documents/   # Document management
│
├── components/       # React components
│   ├── auth/        # Auth components
│   ├── chat/        # Chat components
│   ├── ui/          # Reusable UI components
│   └── ...
│
├── lib/             # Utilities and services
│   ├── store/       # Zustand state stores
│   ├── services/    # API services
│   ├── supabase/    # Supabase client
│   └── utils/       # Utility functions
│
├── types/           # TypeScript type definitions
├── public/          # Static assets
└── docs/            # Documentation
```

## ��� Testing

### Manual Testing Checklist

After setup, verify the following features:

#### Authentication
- [ ] Sign up with email and password
- [ ] Sign in with existing account
- [ ] Sign out functionality
- [ ] Password reset (if implemented)

#### Chat Interface
- [ ] Create new chat (General mode)
- [ ] Create new chat (Compliance mode)
- [ ] Send messages
- [ ] Receive AI responses
- [ ] View chat history in sidebar
- [ ] Switch between chats
- [ ] Delete chats

#### Document Upload
- [ ] Upload PDF file (max 5MB)
- [ ] Upload DOC/DOCX file
- [ ] Upload TXT file
- [ ] View uploaded files
- [ ] Download uploaded files
- [ ] Delete uploaded files

#### User Profile
- [ ] View profile information
- [ ] Update profile name
- [ ] Update avatar (if implemented)

## ��� Troubleshooting

### Common Issues

#### 1. "Supabase client is not initialized"

**Problem**: Missing or incorrect Supabase credentials

**Solution**:
- Check `.env.local` file exists
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Restart development server: `npm run dev`

#### 2. "Database connection error"

**Problem**: Database schema not set up

**Solution**:
```bash
# Run database setup
npm run db:setup

# OR manually run supabase-setup.sql in Supabase Dashboard
```

#### 3. "File upload failed"

**Problem**: Storage bucket not configured

**Solution**:
- Go to Supabase Dashboard → Storage
- Create `documents` bucket
- Set up RLS policies
- Run `supabase-storage-setup.sql`

#### 4. "Port 3000 already in use"

**Problem**: Another process is using port 3000

**Solution**:
```bash
# Option 1: Kill the process
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9

# Option 2: Use different port
npm run dev -- -p 3001
```

#### 5. "Module not found" errors

**Problem**: Dependencies not installed

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

#### 6. TypeScript errors after install

**Problem**: Type definitions not generated

**Solution**:
```bash
# Restart TypeScript server in VS Code
# Press Ctrl+Shift+P → "TypeScript: Restart TS Server"

# OR
npm run build
```

## ��� Database Migrations

If database schema changes are needed:

1. Create migration file in `migrations/` folder
2. Name it with timestamp: `YYYYMMDD_description.sql`
3. Run migration in Supabase Dashboard SQL Editor
4. Document changes in this file

## ��� Production Deployment

For production deployment instructions, see:
- [DEPLOYMENT.md](./DEPLOYMENT.md)

## ��� Next Steps

After successful setup:

1. **Read the documentation**:
   - [Architecture Guide](./ARCHITECTURE.md)
   - [API Reference](./API.md)
   - [Contributing Guide](./CONTRIBUTING.md)

2. **Explore the codebase**:
   - Start with `app/page.tsx` (landing page)
   - Check `components/chat/ChatContainer.tsx` (main chat)
   - Review `lib/store/chat-store.ts` (state management)

3. **Make your first change**:
   - Update the welcome message
   - Customize the color scheme
   - Add a new feature

## ��� Getting Help

If you encounter issues not covered here:

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Search [GitHub Issues](https://github.com/Iron-Mark/Hackathon-LexInsights/issues)
3. Ask questions in [GitHub Issues](https://github.com/Iron-Mark/Hackathon-LexInsights/issues)
4. Join our [Discord](https://discord.gg/lexinsight) (if available)

## ��� Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Last Updated**: November 2025

**Need help?** Open an issue or reach out to the maintainers!
