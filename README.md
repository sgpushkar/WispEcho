# WispEcho

Real-time messaging app. Next.js 15 + Express/Socket.io + Postgres/Prisma.

## What's actually wired up and working
- Auth: register, login, JWT access + refresh (httpOnly cookie), logout, forgot/reset password, email verification, Google OAuth
- Real-time 1:1 + group messaging via Socket.io (text + image URL messages)
- Typing indicators, online/offline presence, read receipts
- Message edit, delete-for-everyone, emoji reactions, replies
- Friends: send/accept/reject requests, block, friends list
- Groups: create, invite, roles (owner/admin/mod/member), kick
- Conversation sidebar: pin/favorite/archive flags in schema, search, unread previews
- Glassmorphic, animated UI (Framer Motion) matching the "premium/Discord/Linear/IG DMs" brief

## What's intentionally NOT built (would need separate infra, not stubbed with fake logic)
- Voice/video calls, screen share (needs WebRTC + TURN/STUN servers)
- Voice rooms, Spotify presence, stories — same reason, real infra beyond a single build
- Actual file/image upload pipeline — the schema and message types support `mediaUrl`, but wire it to Cloudinary/UploadThing (env vars are already there) before going to prod

## Setup

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT secrets, etc.
npx prisma migrate dev --name init
npm run dev             # http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev              # http://localhost:3000
```

### 3. Postgres
Use a local Postgres, or spin up free ones on Railway/Render/Supabase/Neon and drop the connection string into `DATABASE_URL`.

### 4. Google OAuth (optional)
Create credentials at console.cloud.google.com → OAuth consent screen → get `GOOGLE_CLIENT_ID`/`SECRET`, drop into both `.env` files.

### 5. SMTP (optional, for verify/reset emails)
Use Gmail app password or any SMTP provider. If left blank, the backend just logs the email content to console instead of failing — so auth still works without it.

## Folder structure
```
backend/
  prisma/schema.prisma      # Users, Friendships, Conversations, Messages, Groups, Reactions...
  src/
    controllers/            # business logic
    routes/                 # express routers
    sockets/                # socket.io auth + events
    middleware/              # JWT guard, error handler
    utils/                    # token signing, zod schemas, mailer
frontend/
  app/(auth)/login|register
  app/(main)/chat            # main app shell
  components/chat/            # Sidebar, ChatWindow, MessageBubble
  store/                       # zustand: auth + chat state
  lib/                          # axios client w/ auto-refresh, socket.io client
```

## Next moves if you want to keep building
1. Wire actual Cloudinary upload for images/files (route + presigned URL)
2. Add a `chat/[conversationId]` dynamic route instead of state-only routing
3. Build out group settings UI, friend requests panel, notifications dropdown
4. Add WebRTC calling as its own module once core messaging is proven
