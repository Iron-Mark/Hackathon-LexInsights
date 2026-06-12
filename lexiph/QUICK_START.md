# Quick Start - Supabase Integration

## 🚀 5-Minute Setup

### 1. Run Database Setup (2 min)
```sql
-- In Supabase SQL Editor, paste and run:
supabase-setup.sql
```

### 2. Create Storage Bucket (1 min)
- Go to Storage → New bucket
- Name: `documents`, Public: OFF, Size: 5MB
- Run `supabase-storage-setup.sql`

### 3. Sign Up & Insert Data (2 min)
```bash
# Sign up in app with:
kenpatrickgarcia123@gmail.com

# Then run in SQL Editor:
supabase-insert-mock-data.sql
```

### 4. Update .env.local

Create it from the app-root template first:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
NEXT_PUBLIC_RAG_API_URL=https://devkada.resqlink.org
NEXT_PUBLIC_RAG_WS_URL=wss://devkada.resqlink.org
NEXT_PUBLIC_USE_RAG_PROXY=true
```

### 5. Test
```bash
npm run dev
# Login and see 6 sample chats!
```

## ✅ What You Get

- 6 sample chats with Philippine law content
- 16 realistic messages
- Full CRUD operations
- Row Level Security
- Realtime updates
- Secure file storage

## 📁 Files to Run (in order)

1. `supabase-setup.sql` - Creates all tables
2. `supabase-storage-setup.sql` - Sets up file storage
3. Sign up in app
4. `supabase-insert-mock-data.sql` - Adds sample data

## 🔍 Verify Setup

```sql
-- Check your chats
SELECT title, mode, created_at 
FROM chats 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'kenpatrickgarcia123@gmail.com');

-- Check message count
SELECT COUNT(*) FROM messages;
```

## 🎯 Sample Chats Included

1. Barangay Disaster Preparedness Plan
2. Waste Management Compliance (RA 9003)
3. Flood Control Project Permits
4. Employee Data Privacy (RA 10173)
5. Environmental Compliance Certificate
6. Workplace Safety Requirements

## 🐛 Quick Troubleshooting

**No chats showing?**
- Check if logged in
- Verify .env.local has correct keys
- Check browser console for errors

**Can't create chat?**
- Verify RLS policies applied
- Check user is authenticated
- Review Supabase logs

**Messages not loading?**
- Check chat_id is valid
- Verify foreign keys set up
- Check network tab in DevTools

## 📚 Full Documentation

See `DATABASE_MIGRATION_GUIDE.md` for complete details.
