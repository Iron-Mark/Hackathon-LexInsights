# 🏛️ LexInSight

> **AI-Powered Philippine Legal Compliance Assistant**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/Iron-Mark/Hackathon-LexInsights)
[![Version](https://img.shields.io/badge/version-0.1.0-blue)](https://github.com/Iron-Mark/Hackathon-LexInsights)
[![License](https://img.shields.io/badge/license-MIT-green)](#-license)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

LexInSight is an intelligent, AI-powered chat application designed to help individuals, businesses, and organizations navigate the complex landscape of Philippine legal compliance. Through advanced document analysis and conversational AI, LexInSight makes legal compliance accessible, understandable, and actionable.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Installation](#-installation)
- [Usage Guide](#-usage-guide)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Performance](#-performance)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Roadmap](#-roadmap)
- [FAQ](#-faq)
- [Support](#-support)
- [License](#-license)

---

## 🎯 Overview

### What is LexInSight?

LexInSight is a comprehensive legal compliance platform that combines:
- **AI-Powered Chat** - Natural language interface for legal queries
- **Document Analysis** - Automated compliance checking for uploaded documents
- **Knowledge Base** - Extensive Philippine legal and regulatory information
- **Real-time Assistance** - Instant answers to compliance questions

### Who is it for?

- **Small Businesses** - Navigate regulatory requirements
- **Compliance Officers** - Streamline compliance workflows
- **Legal Professionals** - Quick reference and document analysis
- **Government Agencies** - Assist constituents with compliance
- **Students & Researchers** - Learn about Philippine law

### Why LexInSight?

- ✅ **Accessible** - Complex legal language made simple
- ✅ **Fast** - Instant answers, no waiting for consultations
- ✅ **Comprehensive** - Covers major Philippine laws and regulations
- ✅ **Secure** - Enterprise-grade security and privacy
- ✅ **Affordable** - Cost-effective compliance solution

---

## ✨ Key Features

### 💬 Dual-Mode Chat Interface

#### General Mode
- Ask questions about Philippine laws and regulations
- Get explanations of legal requirements
- Learn about compliance procedures
- Receive step-by-step guidance
- Access to extensive legal knowledge base

**Example Queries:**
- "What are the requirements for RA 10173 Data Privacy Act?"
- "How do I register a business in Manila?"
- "What permits do I need for construction?"

#### Compliance Mode
- Upload documents for automated analysis
- Check compliance against Philippine legal standards
- Receive detailed compliance reports
- Identify gaps and recommendations
- Generate compliance checklists

**Supported Documents:**
- PDF files
- Word documents (.doc, .docx)
- Markdown files (.md)
- Text files (.txt)

### 📄 Advanced Document Analysis

- **Multi-Document Support** - Analyze up to 3 documents simultaneously
- **File Size Limit** - 5MB per file
- **Real-time Processing** - Instant analysis results
- **Detailed Reports** - Comprehensive compliance assessments
- **Actionable Insights** - Clear next steps and recommendations

### 🔐 Enterprise-Grade Security

- **Authentication** - Secure Clerk authentication with Supabase Third-Party Auth
- **Row-Level Security** - Database-level access control
- **Encrypted Storage** - Files encrypted at rest and in transit
- **User Isolation** - Complete data separation between users
- **Audit Trails** - Track all document access and modifications

### 📊 Document Management

- **Centralized Dashboard** - View all uploaded documents
- **Download & Delete** - Full control over your files
- **Metadata Tracking** - File size, type, upload date
- **Search & Filter** - Find documents quickly
- **Version History** - Track compliance report edits in the browser

### 🎨 Modern User Experience

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark Mode** - Eye-friendly interface (coming soon)
- **Smooth Animations** - Polished, professional feel
- **Accessibility** - WCAG 2.1 compliant
- **Fast Loading** - Optimized performance

---

## 🚀 Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.2.9 | React framework with App Router |
| **React** | 19.2.7 | UI library |
| **TypeScript** | 5.0+ | Type-safe development |
| **Tailwind CSS** | 3.4+ | Utility-first styling |
| **Framer Motion** | 11.0+ | Smooth animations |
| **Zustand** | 4.5+ | State management |
| **Lucide React** | Latest | Icon library |

### Backend

| Technology | Purpose |
|------------|---------|
| **Supabase** | Backend as a Service |
| **PostgreSQL** | Relational database |
| **Clerk** | User authentication |
| **Supabase Storage** | File storage |
| **Row Level Security** | Data access control |
| **Real-time** | Live updates |

### AI/ML

| Technology | Purpose |
|------------|---------|
| **RAG (Retrieval-Augmented Generation)** | Document analysis |
| **WebSocket** | Real-time AI responses |
| **Vector Search** | Semantic document search |

### Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Git** | Version control |
| **npm** | Package management |

---

## 🏁 Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.0 or higher ([Download](https://nodejs.org/))
- **npm** 9.0 or higher (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Clerk Account** ([Sign up](https://dashboard.clerk.com/))
- **Supabase Account** ([Sign up](https://supabase.com))
- **Code Editor** (VS Code recommended)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Iron-Mark/Hackathon-LexInsights.git

# Navigate to project directory
cd Hackathon-LexInsights/lexiph

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Clerk and Supabase credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/Iron-Mark/Hackathon-LexInsights.git
cd Hackathon-LexInsights/lexiph
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js and React
- Supabase client
- Tailwind CSS
- Framer Motion
- And more...

### Step 3: Supabase Setup

#### 3.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in project details
4. Wait for project to be created

#### 3.2 Get API Credentials

1. Go to **Settings** → **API**
2. Copy **Project URL**
3. Copy **anon/public key**

#### 3.3 Configure Environment Variables

Create `.env.local` in the app root (`lexiph`). Start from the template:

```bash
cp .env.example .env.local
```

```env
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/signup
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/chat
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/chat

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key

# RAG API Configuration
NEXT_PUBLIC_RAG_API_URL=https://devkada.resqlink.org
NEXT_PUBLIC_RAG_WS_URL=wss://devkada.resqlink.org
NEXT_PUBLIC_USE_RAG_PROXY=true
NEXT_PUBLIC_RAG_BACKEND_ISSUE_URL=https://github.com/Iron-Mark/Hackathon-LexInsights/issues/1
```

### Step 4: Database Setup

#### 4.1 Create Tables

1. Open Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Copy contents of `supabase-setup.sql`
4. Click **Run**

This creates:
- `profiles` - User profiles
- `chats` - Chat conversations
- `messages` - Chat messages
- `documents` - File metadata
- `compliance_reports` - Analysis reports
- `search_history` - Search queries

#### 4.2 Set Up Storage

1. Go to **Storage** → **New Bucket**
2. Name: `documents`
3. Public: **OFF**
4. File size limit: `5242880` (5MB)
5. Allowed MIME types:
   ```
   application/pdf
   application/msword
   application/vnd.openxmlformats-officedocument.wordprocessingml.document
   text/plain
   text/markdown
   ```

6. Run `supabase-storage-setup.sql` in SQL Editor

#### 4.3 Insert Sample Data (Optional)

```bash
# For testing, insert sample data
# Run in SQL Editor:
supabase-insert-data-ken.sql
```

### Step 5: Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Step 6: Build for Production

```bash
npm run build
npm start
```

---

## 📖 Usage Guide

### Creating an Account

1. Navigate to `/auth/signup`
2. Complete the Clerk signup flow
3. Continue to `/chat`
4. Use the profile icon in the header to manage or sign out

### Using General Mode

1. **Ask a Question**
   - Type your legal question in the chat input
   - Press Enter or click Send
   - Receive AI-powered response

2. **Example Questions**
   - "What are the requirements for RA 10173?"
   - "How do I get a business permit in Manila?"
   - "What is the process for SEC registration?"

3. **Follow-up Questions**
   - Continue the conversation
   - Ask for clarification
   - Request more details

### Using Compliance Mode

1. **Switch to Compliance Mode**
   - Toggle the mode switch at bottom of chat

2. **Upload Documents**
   - Drag and drop files onto the chat area
   - Or click to browse and select files
   - Up to 3 files, 5MB each

3. **Add Query (Optional)**
   - Type specific questions about your documents
   - Example: "Check compliance with RA 10121"

4. **Analyze**
   - Click Send button
   - Wait for analysis to complete
   - View detailed compliance report

5. **Review Results**
   - Read compliance score
   - Check compliant sections
   - Review recommendations
   - Download the report as Markdown or DOCX

### Managing Documents

1. **View All Documents**
   - Click "Uploaded Files" button
   - Or navigate to `/documents`

2. **Download Documents**
   - Click download icon next to file
   - File downloads to your computer

3. **Delete Documents**
   - Click delete icon
   - Confirm deletion
   - File removed from storage and database

### Chat Management

1. **Create New Chat**
   - Click "New Chat" button
   - Start typing to create chat

2. **View Chat History**
   - All chats listed in sidebar
   - Click to open any chat

3. **Delete Chat**
   - Hover over chat in sidebar
   - Click delete icon
   - Confirm deletion

---

## 🏗️ Project Structure

```
lexiph/
├── app/                          # Next.js App Router
│   ├── auth/                    # Authentication pages
│   │   ├── login/              # Login page
│   │   ├── signup/             # Signup page
│   │   ├── callback/           # Auth callback
│   │   └── verify-email/       # Legacy redirect to Clerk signup
│   ├── chat/                    # Chat interface
│   │   ├── page.tsx            # Main chat page
│   │   └── [chatId]/           # Individual chat
│   ├── documents/               # Document management
│   │   └── page.tsx            # Documents page
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
│
├── components/                   # React components
│   ├── auth/                    # Auth components
│   │   ├── login-form.tsx
│   │   └── signup-form.tsx
│   ├── chat/                    # Chat components
│   │   ├── chat-container.tsx
│   │   ├── chat-input.tsx
│   │   ├── chat-messages.tsx
│   │   ├── message-bubble.tsx
│   │   ├── empty-state.tsx
│   │   ├── centered-input.tsx
│   │   ├── uploaded-files-list.tsx
│   │   ├── uploaded-files-dialog.tsx
│   │   ├── user-documents-list.tsx
│   │   └── ...
│   ├── layout/                  # Layout components
│   │   ├── chat-header.tsx
│   │   └── user-menu.tsx
│   ├── navigation/              # Navigation
│   │   └── app-sidebar.tsx
│   └── ui/                      # Reusable UI
│       ├── button.tsx
│       ├── input.tsx
│       ├── dialog.tsx
│       └── toast.tsx
│
├── lib/                          # Utilities & services
│   ├── store/                   # Zustand stores
│   │   ├── auth-store.ts
│   │   ├── chat-store.ts
│   │   ├── chat-mode-store.ts
│   │   ├── file-upload-store.ts
│   │   ├── rag-store.ts
│   │   └── sidebar-store.ts
│   ├── services/                # API services
│   │   ├── rag-api.ts
│   │   └── deep-search-api.ts
│   ├── supabase/                # Supabase client
│   │   ├── client.ts
│   │   └── README.md
│   └── utils.ts                 # Utility functions
│
├── types/                        # TypeScript types
│   └── index.ts
│
├── public/                       # Static assets
│   ├── logo/
│   └── ...
│
├── styles/                       # Global styles
│   └── globals.css
│
├── supabase-setup.sql           # Database schema
├── supabase-storage-setup.sql   # Storage policies
├── supabase-insert-data-ken.sql # Sample data
├── supabase-insert-data-mark.sql # Sample data
│
├── .env.local                    # Environment variables
├── .gitignore                    # Git ignore rules
├── next.config.ts                # Next.js config
├── tailwind.config.ts            # Tailwind config
├── tsconfig.json                 # TypeScript config
├── package.json                  # Dependencies
└── README.md                     # This file
```

---

## 🗄️ Database Schema

### Tables Overview

| Table | Purpose | Rows (Est.) |
|-------|---------|-------------|
| `profiles` | User profiles | 1 per user |
| `chats` | Chat conversations | ~10 per user |
| `messages` | Chat messages | ~100 per chat |
| `documents` | File metadata | ~20 per user |
| `compliance_reports` | Analysis reports | ~10 per user |
| `search_history` | Search queries | ~50 per user |

### Detailed Schema

#### profiles
```sql
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### chats
```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### documents
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  chat_id UUID REFERENCES chats(id),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_chats_created_at ON chats(created_at DESC);
```

### Row Level Security (RLS)

All tables have RLS enabled with policies:
- Users can only SELECT their own data
- Users can only INSERT their own data
- Users can only UPDATE their own data
- Users can only DELETE their own data

---

## 🔌 API Documentation

### Authentication

Authentication is handled by Clerk App Router pages:

- `/auth/signup`
- `/auth/login`
- `/auth/callback` redirects into the signed-in app
- `/auth/verify-email` is a legacy redirect to `/auth/signup`

### Chat Operations

#### Create Chat
```typescript
POST /api/chats
Body: { title: string, mode: 'general' | 'compliance' }
Response: { chat: Chat }
```

#### Get Chats
```typescript
GET /api/chats
Response: { chats: Chat[] }
```

#### Delete Chat
```typescript
DELETE /api/chats/:id
Response: { success: boolean }
```

### Document Operations

#### Upload Document
```typescript
POST /api/documents
Body: FormData { file: File, chat_id?: string }
Response: { document: Document }
```

#### Get Documents
```typescript
GET /api/documents
Response: { documents: Document[] }
```

#### Delete Document
```typescript
DELETE /api/documents/:id
Response: { success: boolean }
```

---

## 🔐 Security

### Authentication & Authorization

- **Clerk Auth** - Managed authentication and session UI
- **Supabase Third-Party Auth** - Clerk session tokens authorize database and storage requests
- **JWT Claims** - RLS policies compare `auth.jwt()->>'sub'` with stored Clerk user IDs
- **Session Expiry** - Automatic token refresh

### Data Protection

- **Row Level Security** - Database-level access control
- **Encrypted Storage** - AES-256 encryption at rest
- **HTTPS Only** - TLS 1.3 for data in transit
- **Signed URLs** - Temporary file access
- **Input Validation** - Prevent injection attacks

### File Security

- **Type Validation** - Only allowed file types
- **Size Limits** - 5MB maximum per file
- **Virus Scanning** - (Coming soon)
- **User Isolation** - Files stored per user
- **Access Logs** - Track all file access

### Best Practices

- ✅ Never commit `.env.local`
- ✅ Use environment variables for secrets
- ✅ Enable email verification in production
- ✅ Regular security audits
- ✅ Keep dependencies updated
- ✅ Monitor for suspicious activity

---

## ⚡ Performance

### Optimization Techniques

- **Code Splitting** - Lazy load components
- **Image Optimization** - Next.js Image component
- **Caching** - Browser and CDN caching
- **Database Indexes** - Fast query performance
- **Connection Pooling** - Efficient database connections

### Performance Checks

Measure the live deployment before publishing performance claims. Useful targets are First Contentful Paint, Largest Contentful Paint, Cumulative Layout Shift, route response times, and RAG proxy timeout behavior.

### Operational Visibility

- **Vercel deployment logs** - Build and serverless route failures
- **Supabase dashboard logs** - Auth, storage, and database failures
- **Readiness endpoint** - Non-secret Supabase and RAG blocker status through `/api/readiness`
- **Deployment preflight** - Clean worktree, live commit, route, and Vercel linkage checks through `npm run check:deployment`

---

## 🧪 Testing

### Run Tests

```bash
# Full sequential local gate
cd lexiph
npm run check:local

# Individual gates run by check:local
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm audit --omit=dev
npm run check:docs:self-test
npm run check:docs

# Readiness helper safety checks
npm run check:readiness:self-test

# Deployment preflight helper safety checks
npm run check:deployment:self-test

# Live deployment helper safety checks
npm run check:live:self-test

# RAG proxy helper safety checks
npm run check:rag-proxy:self-test

# Build and browser smoke
npm run build
npm run smoke:browser

# Backend readiness, after Supabase and RAG env are reachable
npm run check:readiness

# Deployment preflight, after production deploy
npm run check:deployment -- --base-url https://lexiph.vercel.app

# Deployment preflight without backend probes, useful while external backends are still blocked
npm run check:deployment -- --base-url https://lexiph.vercel.app --source-only
npm run check:deployment -- --base-url https://lexiph.vercel.app --skip-backend

# Deployment ownership diagnostics, when Vercel linkage is unclear
npm run check:deployment -- --base-url https://lexiph.vercel.app --with-vercel-cli --discover-vercel-scopes

# Scoped deployment diagnostics, when the project should be under the team scope
npm run check:deployment -- --base-url https://lexiph.vercel.app --with-vercel-cli --discover-vercel-scopes --vercel-scope marksiazon-dev

# Live deployment freshness and backend readiness, after production deploy
npm run check:live -- --base-url https://lexiph.vercel.app

# Deployment freshness only, useful while external backends are still blocked
npm run check:live -- --base-url https://lexiph.vercel.app --source-only
npm run check:live -- --base-url https://lexiph.vercel.app --skip-backend
```

### Test Structure

```
tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
└── e2e/              # End-to-end tests
```

### Testing Tools

- **ESLint** - Zero-warning lint gate
- **TypeScript** - Static type checking
- **npm audit** - Production dependency audit
- **Markdown link checks** - Parser self-test and repo-local documentation link validation
- **Scripted self-tests** - Readiness, deployment preflight, and RAG proxy helper regression checks
- **Playwright** - Browser smoke checks

---

## 🚢 Deployment

### Vercel (Recommended)

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   cd lexiph
   vercel
   ```

   In the Vercel dashboard, set **Root Directory** to `lexiph`. A deployment that does not expose `/api/version` is stale or not serving this codebase.

2. **Configure Environment Variables**
   - Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Add `CLERK_SECRET_KEY`
   - Add `NEXT_PUBLIC_SUPABASE_URL`
   - Add `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

3. **Deploy**
   ```bash
   vercel --prod
   ```

   After deployment, run:
   ```bash
   npm run check:deployment -- --base-url https://lexiph.vercel.app
   ```

   If Vercel does not show a project linked to `Iron-Mark/Hackathon-LexInsights` or the `lexiph.vercel.app` alias, rerun with CLI ownership diagnostics:
   ```bash
   npm run check:deployment -- --base-url https://lexiph.vercel.app --with-vercel-cli --discover-vercel-scopes
   npm run check:deployment -- --base-url https://lexiph.vercel.app --with-vercel-cli --discover-vercel-scopes --vercel-scope marksiazon-dev
   ```

   A preflight that reports `/api/version` or `/api/readiness` as `404` means the live URL is not serving this codebase yet, even if the GitHub push succeeded.

### Manual Deployment

```bash
# Build
npm run build

# Start production server
npm start
```

### Environment Setup

```env
# Production
NODE_ENV=production
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_SUPABASE_URL=your_production_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_production_publishable_key
```

---

## 🤝 Contributing

We welcome contributions! Here's how:

### Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/Hackathon-LexInsights.git
   cd Hackathon-LexInsights/lexiph
   ```
3. **Create a branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
4. **Make changes**
5. **Commit**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open Pull Request**

### Code Style

- Follow TypeScript best practices
- Use Prettier for formatting
- Write meaningful commit messages
- Add tests for new features
- Update documentation

### Pull Request Guidelines

- Clear description of changes
- Link related issues
- Include screenshots for UI changes
- Ensure tests pass
- Update documentation

---

## 🗺️ Roadmap

### Phase 1: Core Features (Current)
- [x] User authentication
- [x] Chat interface
- [x] Document upload
- [x] Compliance analysis
- [x] Document management

### Phase 2: Enhanced Features (Q1 2025)
- [ ] Multi-language support (Filipino, English)
- [ ] Advanced document comparison
- [ ] Compliance templates
- [ ] Export reports to PDF
- [ ] Email notifications

### Phase 3: Advanced Features (Q2 2025)
- [ ] Mobile app (iOS, Android)
- [ ] API access for developers
- [ ] Batch document processing
- [ ] Compliance calendar
- [ ] Team collaboration

### Phase 4: Enterprise Features (Q3 2025)
- [ ] SSO integration
- [ ] Custom branding
- [ ] Advanced analytics
- [ ] Audit logs
- [ ] SLA guarantees

---

## ❓ FAQ

### General Questions

**Q: Is LexInSight free to use?**
A: Currently in beta, free for all users.

**Q: What Philippine laws are covered?**
A: Major laws including RA 10173 (Data Privacy), RA 10121 (Disaster Risk Reduction), RA 9003 (Solid Waste Management), Labor Code, and more.

**Q: Can I use this for legal advice?**
A: LexInSight provides information and guidance but is not a substitute for professional legal advice.

### Technical Questions

**Q: What file types are supported?**
A: PDF, Word (.doc, .docx), Markdown (.md), and Text (.txt) files.

**Q: What's the file size limit?**
A: 5MB per file, up to 3 files at once.

**Q: Is my data secure?**
A: Yes, we use enterprise-grade security with encryption and Row Level Security.

**Q: Can I delete my data?**
A: Yes, you can delete individual documents or your entire account.

---

## 📞 Support

### Get Help

- **Documentation**: Check our [guides](./lexiph/TESTING_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/Iron-Mark/Hackathon-LexInsights/issues)
- **Email**: support@lexinsight.ph (coming soon)
- **Discord**: Join our community (coming soon)

### Report a Bug

1. Check existing issues
2. Create new issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

---

## 📄 License

This project is licensed under the MIT License.

---

## 👥 Team

### Core Team

<table>
  <tr>
    <td align="center">
      <img src="https://github.com/KpG782.png" width="100px;" alt="Ken Patrick Garcia"/><br />
      <sub><b>Ken Patrick Garcia</b></sub><br />
      <sub>Full Stack Developer</sub><br />
      <a href="https://github.com/KpG782">GitHub</a>
    </td>
    <td align="center">
      <img src="https://via.placeholder.com/100" width="100px;" alt="Jam Villarosa"/><br />
      <sub><b>Jam Villarosa</b></sub><br />
      <sub>AI/ML Engineer</sub><br />
      <a href="#">GitHub</a>
    </td>
    <td align="center">
      <img src="https://via.placeholder.com/100" width="100px;" alt="Mark Siazon"/><br />
      <sub><b>Mark Siazon</b></sub><br />
      <sub>UI/UX Designer</sub><br />
      <a href="#">GitHub</a>
    </td>
    <td align="center">
      <img src="https://via.placeholder.com/100" width="100px;" alt="Ashlyn Torres"/><br />
      <sub><b>Ashlyn Torres</b></sub><br />
      <sub>Project Manager</sub><br />
      <a href="#">LinkedIn</a>
    </td>
  </tr>
</table>

### Roles & Responsibilities

#### 🚀 Ken Patrick Garcia - Full Stack Developer
- Frontend development (Next.js, React, TypeScript)
- Backend integration (Supabase, API design)
- Database architecture and optimization
- State management and data flow
- Performance optimization
- Code review and quality assurance

#### 🤖 Jam Villarosa - AI/ML Engineer
- RAG (Retrieval-Augmented Generation) implementation
- Document analysis algorithms
- AI model integration and optimization
- Natural language processing
- Vector search and embeddings
- ML pipeline development

#### 🎨 Mark Siazon - UI/UX Designer
- User interface design
- User experience research
- Design system creation
- Wireframing and prototyping
- Accessibility compliance
- Visual design and branding

#### 📋 Ashlyn Torres - Project Manager
- Project planning and coordination
- Sprint management and agile methodology
- Stakeholder communication
- Requirements gathering
- Timeline and milestone tracking
- Team collaboration facilitation

### Contributors

Thanks to all contributors who have helped make LexInSight better!

Want to contribute? Check out our [Contributing Guidelines](#-contributing).

---

## 🙏 Acknowledgments

### Special Thanks

- **Philippine Government** - For making legal information accessible and promoting digital transformation
- **Department of Justice (DOJ)** - For comprehensive legal resources
- **National Privacy Commission (NPC)** - For Data Privacy Act guidance

### Technology Partners

- **Supabase** - For excellent backend infrastructure and real-time capabilities
- **Next.js Team** - For the amazing React framework and developer experience
- **Vercel** - For seamless hosting, deployment, and edge network
- **Tailwind Labs** - For the utility-first CSS framework

### Open Source Community

Special thanks to the maintainers and contributors of:
- React and React ecosystem
- TypeScript
- Framer Motion
- Zustand
- Lucide Icons
- And countless other open source projects

### Inspiration & Support

- **Legal Tech Community** - For pioneering accessible legal solutions
- **Philippine Startup Ecosystem** - For fostering innovation
- **Our Beta Testers** - For valuable feedback and suggestions
- **University of Makati** - For academic support and resources

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/Iron-Mark/Hackathon-LexInsights?style=social)
![GitHub forks](https://img.shields.io/github/forks/Iron-Mark/Hackathon-LexInsights?style=social)
![GitHub issues](https://img.shields.io/github/issues/Iron-Mark/Hackathon-LexInsights)
![GitHub pull requests](https://img.shields.io/github/issues-pr/Iron-Mark/Hackathon-LexInsights)

---

<div align="center">

**Built with ❤️ for Philippine Legal Compliance**

### 🏗️ Built By

**Team LexInSight**
- Ken Patrick Garcia (Full Stack Developer)
- Jam Villarosa (AI/ML Engineer)
- Mark Siazon (UI/UX Designer)
- Ashlyn Torres (Project Manager)

---

[Website](https://lexiph.vercel.app) • [Documentation](./lexiph/TESTING_GUIDE.md) • [Report Bug](https://github.com/Iron-Mark/Hackathon-LexInsights/issues) • [Request Feature](https://github.com/Iron-Mark/Hackathon-LexInsights/issues)

**© 2025 LexInSight. All rights reserved.**

</div>
