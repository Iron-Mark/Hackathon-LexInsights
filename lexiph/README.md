# LexInsight - Philippine Legal Compliance Assistant

> AI-powered legal compliance assistant for Philippine legislation and regulations

LexInsight is a modern web application that helps users understand and comply with Philippine laws through AI-powered document analysis and intelligent Q&A.
# LexInsights - Philippine Legal Compliance Assistant

> AI-powered legal compliance assistant for Philippine legislation and regulations

LexInsights is a modern web application that helps users understand and comply with Philippine laws through AI-powered document analysis and intelligent Q&A.

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
- RAG API server running (for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/Iron-Mark/lexinsights.git
cd lexinsights/lexiph

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
4. Click **Send** for standard response (50-90s)
5. Or click **Deep Search** for enhanced analysis (4-7s)

### Compliance Mode - Analyze Documents

1. Switch to **Compliance Mode**
2. Click **Upload** button (📎)
3. Select your document (PDF, DOCX, MD, TXT)
4. Add optional query or leave blank
5. Click **Send** to analyze
6. View results in the compliance canvas

### Deep Search (General Mode Only)

1. Type your question in General Mode
2. Click the **sparkles button** (✨)
3. Wait 4-7 seconds for processing
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

**Processing Time:** 50-90 seconds
**Timeout:** 300 seconds (5 minutes)

### Deep Search API

**Endpoint**
```
POST /api/research/deep-search
```

**Processing Time:** 3-5 seconds
**Documents Analyzed:** 150+

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
curl http://localhost:8000/api/research/health

# Test query
curl -X POST http://localhost:8000/api/research/rag-summary \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RA 9003?", "user_id": "test"}' \
  --max-time 300
```

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
3. Deploy RAG API server
4. Update environment variables
5. Deploy to Vercel/Netlify

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
