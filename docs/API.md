# API Documentation

This document describes all API endpoints, services, and integrations used in LexInSight.

## 📡 API Overview

LexInSight uses a combination of:

- **Next.js API Routes** - Internal backend endpoints
- **Supabase APIs** - Database, auth, and storage
- **External RAG API** - AI-powered document analysis

## 🔐 Authentication

All API requests require authentication using Supabase JWT tokens.

### Getting Auth Token

```typescript
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const {
  data: { session },
} = await supabase.auth.getSession();
const token = session?.access_token;
```

### Using Auth Token

```typescript
fetch("/api/endpoint", {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});
```

## 📋 Table of Contents

- [Authentication API](#authentication-api)
- [Chat API](#chat-api)
- [Message API](#message-api)
- [Document API](#document-api)
- [RAG API](#rag-api)
- [Search API](#search-api)
- [Error Handling](#error-handling)

---

## Authentication API

### Sign Up

Create a new user account.

**Endpoint:** `POST /auth/signup` (Supabase)

**Request:**

```typescript
{
  email: string
  password: string
  options?: {
    data: {
      full_name?: string
    }
  }
}
```

**Response:**

```typescript
{
  user: {
    id: string;
    email: string;
    created_at: string;
  }
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }
}
```

**Example:**

```typescript
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "secure_password",
  options: {
    data: {
      full_name: "John Doe",
    },
  },
});
```

**Error Codes:**

- `400` - Invalid email or password
- `422` - User already exists

### Sign In

Authenticate existing user.

**Endpoint:** `POST /auth/signin` (Supabase)

**Request:**

```typescript
{
  email: string;
  password: string;
}
```

**Response:**

```typescript
{
  user: User;
  session: Session;
}
```

**Example:**

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "secure_password",
});
```

### Sign Out

End user session.

**Endpoint:** `POST /auth/signout` (Supabase)

**Request:** None

**Response:**

```typescript
{
  error: null;
}
```

**Example:**

```typescript
const { error } = await supabase.auth.signOut();
```

### Get Session

Retrieve current session.

**Endpoint:** `GET /auth/session` (Supabase)

**Response:**

```typescript
{
  session: {
    access_token: string
    refresh_token: string
    user: User
    expires_at: number
  } | null
}
```

**Example:**

```typescript
const {
  data: { session },
} = await supabase.auth.getSession();
```

---

## Chat API

### Create Chat

Create a new chat conversation.

**Endpoint:** `POST /api/chats`

**Request:**

```typescript
{
  title: string;
  mode: "general" | "compliance";
}
```

**Response:**

```typescript
{
  id: string;
  user_id: string;
  title: string;
  mode: "general" | "compliance";
  created_at: string;
  updated_at: string;
}
```

**Example:**

```typescript
const response = await fetch("/api/chats", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    title: "New Compliance Question",
    mode: "compliance",
  }),
});

const chat = await response.json();
```

### Get Chats

Retrieve all chats for current user.

**Endpoint:** `GET /api/chats`

**Query Parameters:**

- `limit` (optional): Number of chats to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `order` (optional): Sort order - `asc` or `desc` (default: `desc`)

**Response:**

```typescript
{
  chats: Chat[]
  total: number
}
```

**Example:**

```typescript
// Using Supabase client
const { data: chats, error } = await supabase
  .from("chats")
  .select("*")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
  .limit(50);
```

### Get Chat by ID

Retrieve specific chat with messages.

**Endpoint:** `GET /api/chats/:id`

**Response:**

```typescript
{
  id: string
  title: string
  mode: string
  created_at: string
  messages: Message[]
}
```

**Example:**

```typescript
const { data: chat, error } = await supabase
  .from("chats")
  .select(
    `
    *,
    messages (
      id,
      role,
      content,
      created_at,
      metadata
    )
  `
  )
  .eq("id", chatId)
  .single();
```

### Update Chat

Update chat properties.

**Endpoint:** `PATCH /api/chats/:id`

**Request:**

```typescript
{
  title?: string
  mode?: 'general' | 'compliance'
}
```

**Response:**

```typescript
{
  id: string;
  title: string;
  mode: string;
  updated_at: string;
}
```

**Example:**

```typescript
const { data, error } = await supabase
  .from("chats")
  .update({ title: "Updated Title" })
  .eq("id", chatId)
  .select()
  .single();
```

### Delete Chat

Delete a chat and all its messages.

**Endpoint:** `DELETE /api/chats/:id`

**Response:**

```typescript
{
  success: boolean;
}
```

**Example:**

```typescript
const { error } = await supabase.from("chats").delete().eq("id", chatId);
```

---

## Message API

### Create Message

Add a message to a chat.

**Endpoint:** `POST /api/chats/:chatId/messages`

**Request:**

```typescript
{
  role: 'user' | 'assistant'
  content: string
  metadata?: {
    ragResponse?: object
    searchQueries?: string[]
    documentCount?: number
  }
}
```

**Response:**

```typescript
{
  id: string;
  chat_id: string;
  role: string;
  content: string;
  metadata: object;
  created_at: string;
}
```

**Example:**

```typescript
const { data: message, error } = await supabase
  .from("messages")
  .insert({
    chat_id: chatId,
    role: "user",
    content: "What are the requirements for RA 10173?",
  })
  .select()
  .single();
```

### Get Messages

Retrieve messages for a chat.

**Endpoint:** `GET /api/chats/:chatId/messages`

**Query Parameters:**

- `limit` (optional): Number of messages (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**

```typescript
{
  messages: Message[]
  total: number
}
```

**Example:**

```typescript
const { data: messages, error } = await supabase
  .from("messages")
  .select("*")
  .eq("chat_id", chatId)
  .order("created_at", { ascending: true });
```

---

## Document API

### Upload Document

Upload a file to Supabase Storage.

**Endpoint:** `POST /api/documents`

**Request:** `multipart/form-data`

```typescript
{
  file: File
  chat_id?: string
}
```

**Response:**

```typescript
{
  id: string;
  user_id: string;
  chat_id: string | null;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  status: "pending" | "processed" | "error";
  created_at: string;
}
```

**Example:**

```typescript
const formData = new FormData();
formData.append("file", file);
formData.append("chat_id", chatId);

const response = await fetch("/api/documents", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});

const document = await response.json();
```

### Get Documents

Retrieve all documents for current user.

**Endpoint:** `GET /api/documents`

**Query Parameters:**

- `chat_id` (optional): Filter by chat ID
- `status` (optional): Filter by status
- `limit` (optional): Number of documents (default: 50)

**Response:**

```typescript
{
  documents: Document[]
  total: number
}
```

**Example:**

```typescript
const { data: documents, error } = await supabase
  .from("documents")
  .select("*")
  .eq("user_id", userId)
  .order("created_at", { ascending: false });
```

### Download Document

Get signed URL for document download.

**Endpoint:** `GET /api/documents/:id/download`

**Response:**

```typescript
{
  url: string;
  expires_at: number;
}
```

**Example:**

```typescript
const { data, error } = await supabase.storage
  .from("documents")
  .createSignedUrl(storagePath, 3600); // 1 hour
```

### Delete Document

Delete document file and metadata.

**Endpoint:** `DELETE /api/documents/:id`

**Response:**

```typescript
{
  success: boolean;
}
```

**Example:**

```typescript
// Delete from storage
await supabase.storage.from("documents").remove([storagePath]);

// Delete metadata
await supabase.from("documents").delete().eq("id", documentId);
```

---

## RAG API

The RAG (Retrieval-Augmented Generation) API provides AI-powered document analysis.

### Analyze Document

Send document for compliance analysis.

**Endpoint:** `POST /api/rag/analyze` (Proxied to external RAG API)

**Request:**

```typescript
{
  files: File[]
  query: string
  mode: 'general' | 'compliance'
  deep_search?: boolean
}
```

**Response (WebSocket Stream):**

```typescript
{
  status: 'processing' | 'completed' | 'error'
  query: string
  summary: string
  search_queries_used: string[]
  documents_found: number
  related_documents: Array<{
    title: string
    relevance_score: number
    excerpt: string
    reference: string
  }>
  compliance_report?: {
    score: number
    compliant_sections: string[]
    non_compliant_sections: string[]
    recommendations: string[]
  }
}
```

**Example:**

```typescript
// Using WebSocket
const ws = new WebSocket(
  `${ragWsUrl}/rag/analyze?mode=compliance&deep_search=true`
);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("RAG Response:", data);
};

// Send files
const formData = new FormData();
files.forEach((file) => formData.append("files", file));
formData.append("query", "Check compliance with RA 10173");

fetch("/api/rag/analyze", {
  method: "POST",
  body: formData,
});
```

### General Query

Ask general questions without document upload.

**Endpoint:** `POST /api/rag/query`

**Request:**

```typescript
{
  query: string
  chat_history?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  deep_search?: boolean
}
```

**Response:**

```typescript
{
  answer: string
  sources: Array<{
    title: string
    url: string
    excerpt: string
  }>
  related_queries: string[]
}
```

**Example:**

```typescript
const response = await fetch("/api/rag/query", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query: "What are the requirements for RA 10173?",
    deep_search: true,
  }),
});

const result = await response.json();
```

---

## Search API

### Deep Search

Perform deep search across legal documents.

**Endpoint:** `POST /api/deep-search`

**Request:**

```typescript
{
  query: string
  filters?: {
    law?: string[]
    date_from?: string
    date_to?: string
  }
  limit?: number
}
```

**Response:**

```typescript
{
  results: Array<{
    title: string;
    excerpt: string;
    relevance_score: number;
    reference: string;
    metadata: {
      law: string;
      section: string;
      date: string;
    };
  }>;
  total: number;
  query_time_ms: number;
}
```

**Example:**

```typescript
const response = await fetch("/api/deep-search", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query: "data privacy compliance requirements",
    filters: {
      law: ["RA 10173"],
    },
    limit: 20,
  }),
});

const results = await response.json();
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```typescript
{
  error: {
    message: string
    code: string
    details?: any
  }
}
```

### HTTP Status Codes

| Code | Meaning               | Description             |
| ---- | --------------------- | ----------------------- |
| 200  | OK                    | Request succeeded       |
| 201  | Created               | Resource created        |
| 400  | Bad Request           | Invalid request data    |
| 401  | Unauthorized          | Authentication required |
| 403  | Forbidden             | Access denied           |
| 404  | Not Found             | Resource not found      |
| 409  | Conflict              | Resource already exists |
| 413  | Payload Too Large     | File too large          |
| 422  | Unprocessable Entity  | Validation error        |
| 429  | Too Many Requests     | Rate limit exceeded     |
| 500  | Internal Server Error | Server error            |
| 503  | Service Unavailable   | Service down            |

### Error Handling Example

```typescript
try {
  const response = await fetch("/api/endpoint");

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  const data = await response.json();
  return data;
} catch (error) {
  console.error("API Error:", error);
  // Handle error appropriately
}
```

### Common Errors

#### Authentication Errors

```typescript
{
  error: {
    message: 'Invalid credentials',
    code: 'invalid_credentials'
  }
}
```

#### Validation Errors

```typescript
{
  error: {
    message: 'Validation failed',
    code: 'validation_error',
    details: {
      field: 'email',
      message: 'Invalid email format'
    }
  }
}
```

#### File Upload Errors

```typescript
{
  error: {
    message: 'File size exceeds limit',
    code: 'file_too_large',
    details: {
      max_size: 5242880,
      actual_size: 6291456
    }
  }
}
```

## 🔄 Rate Limiting

### Limits

| Endpoint        | Rate Limit         |
| --------------- | ------------------ |
| Authentication  | 5 requests/minute  |
| Chat operations | 60 requests/minute |
| File uploads    | 10 uploads/minute  |
| RAG analysis    | 5 requests/minute  |

### Rate Limit Headers

```typescript
{
  'X-RateLimit-Limit': '60',
  'X-RateLimit-Remaining': '45',
  'X-RateLimit-Reset': '1609459200'
}
```

## 📊 API Versioning

Current API version: `v1`

All endpoints are versioned:

```
/api/v1/endpoint
```

## 🔗 Useful Links

- [Supabase API Reference](https://supabase.com/docs/reference/javascript)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [REST API Best Practices](https://restfulapi.net/)

---

**Last Updated**: November 2025
