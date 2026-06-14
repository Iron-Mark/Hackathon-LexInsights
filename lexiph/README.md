# LexInSight - Philippine Legal Compliance Assistant

> AI-powered legal compliance assistant for Philippine legislation and regulations

LexInSight is a modern web application that helps users understand and comply with Philippine laws through AI-powered document analysis and intelligent Q&A.

---

## 🌟 Features

### 💬 Dual Chat Modes

**General Mode**
- Ask questions about Philippine laws and regulations
- Get AI-powered answers from 33,562+ legislative documents
- Deep Search for enhanced analysis with cross-references
- Conversation-style interface with markdown formatting

**Compliance Mode**
- Upload documents (PDF, Word, Markdown, Text)
- Automated compliance analysis
- Color-coded compliance reports
- Gap analysis and recommendations
- Downloadable reports (Markdown & DOCX)

### 🔍 Deep Search

- Enhanced analysis with 150+ related documents
- Cross-referenced legislation
- Relevance scoring
- Additional insights and recommendations
- Available in General Mode

### 📊 Compliance Canvas

- Split-screen document viewer
- Color-coded sections (✅ Compliant, ⚠️ Needs Revision, 🚫 Critical)
- Version history tracking
- Edit and preview modes
- Export to Markdown or DOCX

### 🎨 Modern UI/UX

- Responsive design (mobile, tablet, desktop)
- Dark mode support
- Smooth animations and transitions
- Accessible (WCAG AAA compliant)
- Interactive loading states

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for authentication)
- Reachable RAG API server for full AI features. The default hosted backend is `https://devkada.resqlink.org`; use a local compatible backend only if you update `.env.local`.

### Installation

```bash
# Clone the repository
git clone https://github.com/Iron-Mark/Hackathon-LexInsights.git
cd Hackathon-LexInsights/lexiph

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

### Environment Variables

```env
# RAG API Configuration
NEXT_PUBLIC_RAG_API_URL=https://devkada.resqlink.org
NEXT_PUBLIC_RAG_WS_URL=wss://devkada.resqlink.org
NEXT_PUBLIC_USE_RAG_PROXY=true

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 📖 Usage Guide

### General Mode - Ask Questions

1. Open the chat interface
2. Stay in **General Mode** (default)
3. Type your question: "What is RA 9003?"
4. Click **Send** for a standard RAG response
5. Or click **Deep Search** for enhanced analysis with PDF extraction

### Compliance Mode - Analyze Documents

1. Switch to **Compliance Mode**
2. Click **Upload** button (📎)
3. Select your document (MD or TXT for direct browser-side Draft Checker analysis; PDF and Word files require backend-side extraction)
4. Add optional query or leave blank
5. Click **Send** to analyze
6. View results in the compliance canvas

When the RAG/Draft Checker backend is unreachable, LexInSight shows an unavailable status instead of generating a mock compliance report.

### Deep Search (General Mode Only)

1. Type your question in General Mode
2. Click the **sparkles button** (✨)
3. Wait for processing. Standard queries are usually shorter; deep search can take several minutes depending on backend load and PDF extraction.
4. View enhanced results with:
   - Related documents
   - Cross-references
   - Additional insights
   - Relevance scores

---

## 🏗️ Project Structure

```
lexiph/
├── app/                      # Next.js app directory
│   ├── auth/                # Authentication pages
│   ├── chat/                # Chat interface
│   ├── test-rag/            # RAG API testing page
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── chat/               # Chat-related components
│   ├── layout/             # Layout components
│   ├── navigation/         # Navigation components
│   └── ui/                 # UI primitives
├── lib/                     # Utilities and services
│   ├── api/                # API clients
│   ├── services/           # Service layer
│   ├── store/              # State management (Zustand)
│   ├── supabase/           # Supabase client
│   └── utils/              # Utility functions
├── public/                  # Static assets
│   └── sample-documents/   # Sample documents
├── docs/                    # Documentation
├── tests/                   # Test files
└── types/                   # TypeScript types
```

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **Zustand** - State management
- **React Markdown** - Markdown rendering
- **Lucide React** - Icons

### Backend Services
- **Supabase** - Authentication & database
- **RAG API** - AI-powered search (Python/FastAPI)
- **ChromaDB** - Vector database

### Key Libraries
- `react-markdown` - Markdown formatting
- `remark-gfm` - GitHub Flavored Markdown
- `docx` - DOCX export
- `framer-motion` - Animations

---

## 🎨 Design System

### Colors

**Primary (Iris)**
- iris-50 to iris-900
- Main brand color

**Accent (Purple/Pink)**
- purple-500 to purple-600
- pink-500
- Used for Deep Search and highlights

**Neutral (Slate)**
- slate-50 to slate-900
- Text and backgrounds

### Typography

**Fonts**
- Display: Outfit (headings)
- Body: Manrope (text)

**Sizes**
- Base: 16px
- Scale: Tailwind default

---

## 🔌 API Integration

### RAG API Endpoints

**Main Endpoint**
```
POST /api/research/rag-summary
```

**Request**
```json
{
  "query": "What is RA 9003?",
  "user_id": "user-123"
}
```

**Response**
```json
{
  "status": "completed",
  "query": "What is RA 9003?",
  "summary": "# EXECUTIVE SUMMARY\n\n...",
  "search_queries_used": ["RA 9003", "Solid Waste"],
  "documents_found": 42
}
```

**Processing Time:** Usually 20-90 seconds, depending on backend load
**Timeout:** 300 seconds (5 minutes)

### Deep Search API

**Endpoint**
```
POST /api/research/rag-summary
```

**Request flag:** `use_deep_search: true`
**Processing Time:** Up to 3-5 minutes when PDF extraction is required
**Backend Required:** Full E2E only passes when the configured RAG backend health check responds successfully

---

## 📚 Documentation

Comprehensive documentation is available in the `/docs` folder:

- `CHAT_INPUT_BUTTONS.md` - Button functionality guide
- `DEEP_SEARCH_FEATURE.md` - Deep Search documentation
- `DEEP_SEARCH_GENERAL_MODE_ONLY.md` - Mode-specific guide
- `LOADING_STATES_DESIGN.md` - Loading indicators
- `MARKDOWN_STYLING_GUIDE.md` - Markdown formatting
- `MESSAGE_BUBBLE_DESIGN.md` - Message styling
- `RAG_TESTING_QUICKSTART.md` - API testing guide

---

## 🧪 Testing

### Full Local Gate

Run the full sequential local gate before pushing or release checks:

```bash
npm run check:local
```

It runs zero-warning lint, TypeScript, production audit, Markdown link checker self-test, Markdown link checks, readiness self-test, deployment preflight self-test, live deployment self-test, RAG proxy self-test, production build, and Playwright smoke.

Run the docs check directly after editing Markdown links:

```bash
npm run check:docs:self-test
npm run check:docs
```

### Readiness Check

Run the non-secret backend readiness check before claiming a full E2E pass:

```bash
npm run check:readiness
```

Run the deterministic readiness helper self-test after changing readiness parsing or Supabase key checks:

```bash
npm run check:readiness:self-test
```

Run the deterministic deployment preflight self-test after changing Vercel project visibility checks or deployment output redaction:

```bash
npm run check:deployment:self-test
```

Run the deterministic live deployment helper self-test after changing live route, source-only, commit comparison, or public output behavior:

```bash
npm run check:live:self-test
```

Run the deterministic RAG proxy self-test after changing proxy timeout, endpoint, or error-classification behavior:

```bash
npm run check:rag-proxy:self-test
```

When the local app is running, include route and proxy checks:

```bash
npm run check:readiness -- --base-url http://localhost:3000
```

The app also exposes `GET /api/readiness` for live or local runtime checks. It returns `200` only when critical Supabase env/key checks, Supabase DNS, direct RAG health, and RAG proxy health checks pass; otherwise it returns `503` with component-level blocker details. Supabase key checks validate the public key format, anon role claim, and legacy JWT issuer project ref without printing the raw key. Add `?timeoutMs=2000` for a faster probe when an upstream backend is known to be down; the same timeout is forwarded to the RAG proxy health call, which returns structured `502` or `504` blocker errors when the upstream backend cannot be reached. Browser route-shape smoke may use `?externalChecks=skip`; skipped external checks stay critical, so that mode cannot prove backend E2E readiness. RAG proxy `endpoint` values must remain on the configured RAG API origin.

For local checks that need to avoid external DNS/health lookups (for example while the DNS/host is temporarily unavailable), run:

```bash
npm run check:readiness -- --skip-external-checks
```

When used, external dependency checks are skipped as non-blocking and the remaining checks still validate local env/key safety.

### Deployment Preflight

After pushing and deploying, verify local app-root assumptions, Vercel linkage, live version metadata, readiness route presence, and the public RAG proxy route:

```bash
npm run check:deployment -- --base-url https://lexiph.vercel.app
```

Add `--with-vercel-cli` when you also want to check whether the current shell has an authenticated Vercel CLI session, can see a Vercel project linked to `Iron-Mark/Hackathon-LexInsights`, can see a project with the live URL alias, and can inspect the deployment. The command does not print raw env values or provider secrets.

Use `--discover-vercel-scopes` with the CLI check to print safe team-scope slugs available to the current Vercel account:

```bash
npm run check:deployment -- --base-url https://lexiph.vercel.app --with-vercel-cli --discover-vercel-scopes
```

If the project may live under a Vercel team, pass that team scope explicitly:

```bash
npm run check:deployment -- --base-url https://lexiph.vercel.app --with-vercel-cli --discover-vercel-scopes --vercel-scope marksiazon-dev
```

When the repo or live URL is still not visible, the preflight prints a non-critical `vercel.recovery_hint` with the next scoped command or provider action.

If the Vercel CLI checks cannot see this repo or `lexiph.vercel.app`, switch to the owning Vercel team/account or import the repository into a new Vercel project with Root Directory set to `lexiph`.

### Live Deployment Check

After pushing and deploying, verify that production is serving the expected commit:

```bash
npm run check:live -- --base-url https://lexiph.vercel.app
```

Use `--source-only` or `--skip-backend` when you only need to prove that Vercel is serving this repository commit while Supabase/RAG are still externally blocked:

```bash
npm run check:live -- --base-url https://lexiph.vercel.app --source-only
```

Full mode checks key routes, `GET /api/version`, `GET /api/readiness`, and the RAG proxy health path. It exits nonzero when production is stale, when the exposed commit does not match local `HEAD`, or when backend readiness is still blocked.

### Browser Smoke

Run the Playwright smoke gate for public routes, protected-route redirects, version metadata, and readiness JSON shape:

```bash
npm run smoke:browser
```

By default, Playwright starts its own Next.js dev server on `127.0.0.1:3100` so it does not reuse an unrelated app already listening on port `3000`. To test an already-running app or live deployment:

```powershell
$env:PLAYWRIGHT_BASE_URL='http://localhost:3000'; npm run smoke:browser; Remove-Item Env:PLAYWRIGHT_BASE_URL
```

Browser smoke proves route behavior, version metadata, and readiness reporting. Full backend E2E still requires `npm run check:readiness` to pass.

### Browser Testing

Visit the test page:
```
http://localhost:3000/test-rag
```

Features:
- Health check
- Sample queries
- Response metadata
- Full summary preview

### API Testing

```bash
# Health check
curl https://devkada.resqlink.org/api/research/health

# Test query
curl -X POST https://devkada.resqlink.org/api/research/rag-summary \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RA 9003?", "user_id": "test"}' \
  --max-time 300
```

If the hosted health check times out, `/test-rag`, chat RAG, deep search, and compliance analysis cannot be fully verified until the backend is reachable or `.env.local` points to a working compatible backend.

---

## 🚢 Deployment

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Environment Setup

1. Set up Supabase project
2. Configure authentication
3. Restore or deploy a compatible RAG API server
4. Update environment variables
5. Deploy through Vercel with `lexiph` as the root directory

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

### Code Style

- Use TypeScript
- Follow ESLint rules
- Use Prettier for formatting
- Write meaningful commit messages

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- Philippine legislative database
- Supabase for authentication
- Next.js team
- Open source community

---

## 📞 Support

For issues and questions:
- Check documentation in `/docs`
- Review API instructions
- Check troubleshooting guides

---

**Built with ❤️ for Philippine legal compliance**
