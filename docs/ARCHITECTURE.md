# DFZ Messenger — Architectural Blueprint & Specification

## 1. System Overview
**DFZ Messenger** is a production-grade, secure, extensible next-generation web messenger built to power a multi-platform ecosystem (Web, PWA, Desktop, Mobile).

### Core Stack
- **Frontend**: Next.js 14+ (App Router), React 18/19, TypeScript, Tailwind CSS, Lucide Icons, Socket.IO Client, WebRTC.
- **Backend**: Modular TypeScript Engine / NestJS architecture, Socket.IO Gateway, Prisma ORM, BullMQ queue system, MinIO / S3 Storage Client, bcrypt, JWT + HttpOnly Cookies.
- **Database**: PostgreSQL 16+ (Local instance on port 5432 / Docker container).
- **Cache & State**: Redis 7+ (with resilient in-memory fallback for zero-dependency local dev).
- **Voice & Media**: Browser MediaRecorder API with Web Audio API Waveforms; S3 / Local chunked file storage.
- **Calling**: WebRTC (RTCPeerConnection + STUN/TURN signaling over WebSocket).

---

## 2. Monorepo Structure
```
c:\Users\Lenovo\Desktop\messenger/
├── apps/
│   ├── api/                   # Backend Application (Modular TS, Prisma, WebSockets, BullMQ)
│   │   ├── prisma/            # Database schema & migrations & seed
│   │   ├── src/
│   │   │   ├── auth/          # Auth, sessions, cookies, 2FA, brute-force rate limit
│   │   │   ├── users/         # Users, profiles, avatars, settings
│   │   │   ├── contacts/      # Contacts & address book
│   │   │   ├── chats/         # Private chats, group chats, channels, folders
│   │   │   ├── messages/      # Messages, pagination, edit, delete, receipts, reactions
│   │   │   ├── media/         # Uploads, MIME validation, S3/local storage, waveforms
│   │   │   ├── calls/         # WebRTC signaling gateway
│   │   │   ├── search/        # Global & in-chat search
│   │   │   ├── admin/         # Admin metrics, user management, audit logs
│   │   │   ├── moderation/    # Report system, moderation queue
│   │   │   ├── common/        # Guards, decorators, filters, interceptors
│   │   │   └── gateway/       # Centralized WebSocket gateway & events
│   │   └── test/              # Integration and unit tests
│   └── web/                   # Frontend Next.js Client
│       ├── public/            # Manifest, icons, sound effects, PWA assets
│       ├── src/
│       │   ├── app/           # Next.js App Router (/(auth), /(messenger), /admin, /onboarding)
│       │   ├── components/    # Modular UI components (sidebar, chat, composer, media, calls, modals)
│       │   ├── hooks/         # Custom hooks (useSocket, useAuth, useWebRTC, useAudioRecorder, etc.)
│       │   ├── stores/        # State management (authStore, chatStore, callStore, uiStore)
│       │   ├── lib/           # API client, socket client, utils, formatters
│       │   └── types/         # Client-side typing
├── packages/
│   ├── types/                 # Shared DTOs, Models, Events, Enums
│   └── config/                # Shared branding, limits, constants
├── infrastructure/
│   ├── docker-compose.yml     # Complete PostgreSQL, Redis, MinIO, API & Web setup
│   ├── Dockerfile.api         # Production Dockerfile for backend
│   └── Dockerfile.web         # Production Dockerfile for frontend
├── docs/                      # Comprehensive documentation
├── .env.example               # Complete environment variable template
├── package.json               # Root npm workspaces
└── README.md                  # Comprehensive setup & run manual
```

---

## 3. Database Schema (Prisma PostgreSQL)
Key Entities:
1. `User`: id, username, email, phone, role (USER, MODERATOR, ADMIN, SUPERADMIN), isBanned, status, createdAt.
2. `Credential`: userId, passwordHash, twoFactorSecret, twoFactorEnabled.
3. `Profile`: userId, displayName, bio, avatarUrl, lastSeen, privacySettings.
4. `Session`: id, userId, tokenHash, userAgent, ipAddress, deviceName, lastActiveAt, expiresAt, isRevoked.
5. `Contact`: userId, contactUserId, nickname, createdAt.
6. `Chat`: id, type (DIRECT, GROUP, CHANNEL, SAVED), title, avatarUrl, description, ownerId, isPublic, inviteCode, createdAt, updatedAt.
7. `ChatMember`: chatId, userId, role (OWNER, ADMIN, MEMBER), permissions (bitmask/JSON), customTitle, joinedAt, isMuted, mutedUntil.
8. `Message`: id, chatId, senderId, replyToId, forwardedFromId, content, type (TEXT, IMAGE, VIDEO, AUDIO, VOICE, FILE, SYSTEM), isEdited, isDeleted, idempotencyKey, createdAt, updatedAt.
9. `MessageReceipt`: messageId, userId, status (DELIVERED, READ), timestamp.
10. `Reaction`: messageId, userId, emoji, createdAt.
11. `Attachment`: id, messageId, originalName, mimeType, sizeBytes, storageKey, url, thumbnailUrl, duration, width, height.
12. `PinnedMessage`: chatId, messageId, pinnedById, pinnedAt.
13. `Block`: blockerId, blockedId, reason, createdAt.
14. `Call`: id, chatId, callerId, type (AUDIO, VIDEO), status (RINGING, ACTIVE, ENDED, REJECTED, MISSED), startedAt, endedAt.
15. `Report`: id, reporterId, targetType (USER, CHAT, MESSAGE), targetId, reason, status (PENDING, RESOLVED, DISMISSED), reviewedBy, createdAt.
16. `AuditLog`: id, actorId, action, target, metadata, ipAddress, createdAt.

---

## 4. Realtime WebSocket Protocol
Socket.IO with JWT cookie / handshake authentication.
- Events Emitter / Receiver:
  - `presence:online`, `presence:offline`, `presence:query`
  - `chat:join`, `chat:leave`, `chat:typing`
  - `message:send`, `message:new`, `message:edit`, `message:delete`, `message:receipt`
  - `reaction:add`, `reaction:remove`
  - `call:signal` (offer, answer, candidate, call-user, accept-call, reject-call, end-call)
  - `notification:new`

---

## 5. Security & Defensive Architecture
- Strict password hashing (bcrypt salt rounds = 12).
- HttpOnly, SameSite=Lax (or Strict), Secure cookies for Refresh Tokens & Access Tokens.
- CSRF protection via double-submit cookie or Authorization header.
- Rate limiting on sensitive endpoints (auth, uploads, reports) using Redis/Memory token bucket.
- Server-side access control checks on every route checking chat membership and group permissions.
- MIME type sniffing and file extension verification on all uploads. Safe UUID-based S3/local filenames.
- Input validation using Zod/class-validator DTOs with whitelist stripping.
