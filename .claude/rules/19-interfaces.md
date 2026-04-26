# Three Interfaces Rules — Admin, User, Mobile

This project has exactly **three** user-facing interfaces. All features, APIs, and docs must account for them.

---

## 1. Admin (Web)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Internal users (admins, operators) configure and monitor the system |
| **Stack** | Next.js + TypeScript (same app as User UI, role-based routes) |
| **Scope** | AI model config, KB management, agent management, system monitoring, API keys, analytics, tenant settings |
| **Access** | RBAC; admin role only; not exposed to end customers |
| **Routes** | `/admin/*` |

## 2. User Interface (Web)

| Aspect | Detail |
|--------|--------|
| **Purpose** | End customers and agents use support on the web |
| **Stack** | Next.js + TypeScript |
| **Scope** | Chat widget, conversation history, ticket view, help center, voice/video UI |
| **Access** | Public (chat widget) or authenticated (signed-in users) |
| **Routes** | `/`, `/chat`, `/tickets`, `/help` |

## 3. Native Mobile App

| Aspect | Detail |
|--------|--------|
| **Purpose** | End customers and optionally agents use support on iOS/Android |
| **Stack** | React Native / Swift / Kotlin / Flutter |
| **Scope** | Chat, tickets, history, push notifications, voice/video |
| **Access** | Same auth as web (JWT); supports device/push tokens |
| **Location** | Separate codebase (`mobile/` or dedicated repo) |

---

## Architecture Rules

```
┌─────────────────────────────────────────────────────┐
│              FastAPI Backend (Single API)           │
├─────────────────────────────────────────────────────┤
│  Admin Web  │  User Web  │  Native Mobile App      │
│  (Next.js)  │  (Next.js) │  (iOS/Android)          │
└─────────────────────────────────────────────────────┘
```

### API Rules

- **One API surface** serves all three interfaces
- Use RBAC and scopes to distinguish admin vs user vs mobile
- Do not create separate APIs per interface unless justified
- Mobile-specific endpoints: push tokens, deep links

### Web Rules

- Single Next.js app hosts both Admin and User UI
- Separate routes/layouts with role checks
- Shared design system and API client

### Mobile Rules

- Native app consumes same `docs/API_SPEC.md` endpoints
- Use SDK or direct REST/WebSocket
- Document mobile-specific needs (push, offline, app version header)
- Distribute via App Store and Google Play

---

## Do Not

- Build admin-only flows in the mobile app
- Assume only one "frontend" — there are two delivery surfaces (web + native) and three logical interfaces
- Expose admin endpoints to non-admin roles
