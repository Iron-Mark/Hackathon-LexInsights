# Supabase Database Schema

## Overview

Supabase remains the database and storage backend. Clerk is the source of authentication, and RLS policies authorize rows by comparing the Clerk user ID claim to app-owned `TEXT` user columns.

This spec covers the fresh Clerk demo schema. Existing Supabase Auth UUID data requires a separate migration or reset.

## Tables

### profiles

```sql
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = id);
```

### chats

```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'general' CHECK (mode IN ('general', 'compliance')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### messages

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### documents

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Storage Buckets

- `documents`: private uploaded PDF, Word, Markdown, and text files.
- Object paths must start with the Clerk user ID: `user_.../file-name`.

## Auth Configuration

- Configure Clerk as a Supabase Third-Party Auth provider.
- Clerk session tokens must include the role claim expected by Supabase.
- The app uses the Supabase client `accessToken` callback to pass Clerk session tokens.

## Data API Grants

New Supabase projects may not expose public tables to the Data API automatically. The setup SQL explicitly grants the `authenticated` role CRUD access to app tables after RLS policies are enabled.
