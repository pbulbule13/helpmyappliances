# Frontend Rules — Next.js

## Stack

- **Next.js 14+** with App Router
- **TypeScript** strict mode
- **Tailwind CSS** for styling
- **React Query / SWR** for data fetching
- **Zustand** for client state (if needed)

## Directory Structure

```
app/
├── (auth)/              # Auth routes (login, register)
├── (dashboard)/         # Authenticated routes
│   ├── inbox/           # Unified inbox
│   ├── conversations/   # Conversation views
│   ├── knowledge/       # Knowledge base management
│   ├── agents/          # Agent configuration
│   └── settings/        # Org and user settings
├── api/                 # API routes (BFF if needed)
└── layout.tsx

components/
├── ui/                  # Base components (Button, Input, etc.)
├── chat/                # Chat-specific components
├── voice/               # Voice call components
├── video/               # Video call components
└── shared/              # Shared components

hooks/
├── useAuth.ts
├── useConversation.ts
├── useVoice.ts
└── useVideo.ts
```

## Rules

1. **Server Components by default** — use `'use client'` only when needed
2. **Colocate related files** — page, components, hooks together
3. **Type everything** — no `any`, no implicit types
4. **Handle loading/error states** — every async operation
5. **Optimistic updates** for better UX
6. **Accessibility** — semantic HTML, ARIA labels, keyboard nav

## API Client Pattern

```typescript
// lib/api/client.ts
const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new ApiError(await res.json());
    return res.json();
  },
  // post, put, delete...
};

// services/conversations.ts
export const conversationService = {
  list: (orgId: string) => api.get<Conversation[]>(`/api/v1/orgs/${orgId}/conversations`),
  get: (orgId: string, id: string) => api.get<Conversation>(`/api/v1/orgs/${orgId}/conversations/${id}`),
};
```

## Component Pattern

```typescript
// components/chat/MessageBubble.tsx
interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={cn("rounded-lg p-3", isOwn ? "bg-blue-500 text-white" : "bg-gray-100")}>
      {message.content}
    </div>
  );
}
```

## Real-time Updates

- Use WebSocket for live conversation updates
- Reconnect logic with exponential backoff
- Optimistic UI updates with rollback on failure
