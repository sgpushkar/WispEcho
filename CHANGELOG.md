# Changelog

All notable changes to WispEcho are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.6] — 2026-08-04

### New
- **Leave group** — any member can now leave a group directly from Group Settings
- **Delete group** — owners can permanently delete a group from Group Settings
- **Saved Messages** — bookmark any message and access it instantly from the sidebar
- **Notification Center** — in-app inbox with unread badge, mark-read and delete controls
- **Conversation filters** — All, Favorites, and Archived tabs in the sidebar
- **Archive & Favorite** — right-click or long-press any chat for quick actions

### Improved
- Deleted-for-everyone messages now instantly disappear from all participants' screens
- Group settings footer always visible; Save, Leave, and Delete actions are role-aware
- Sidebar shows unread notification badge on the bell icon

### Fixed
- `message:deleted` socket event was missing `conversationId` — deletion no longer silently fails on the client
- Saved images correctly served via secure proxy (raw Cloudinary URL stripped)

---

## [1.2.5] — 2026-08-01

### New
- **Secure photo delivery** — images are proxied through the backend; raw Cloudinary URLs are never sent to clients
- **View Once anti-capture** — canvas rendering with watermark, 10-second auto-close countdown timer, screenshot detection via visibility/blur events
- **Android screenshot prevention** — `FLAG_SECURE` blocks OS-level screenshots, screen recording, and recent-apps thumbnail
- View Once images permanently blocked server-side after first view — `mediaUrl` nulled in DB, proxy returns 403 on re-access

### Improved
- Images stripped from API responses and `message:new` socket events — only accessible via authenticated proxy endpoint
- View Once photos load via blob URLs that are revoked on viewer close — no memory residue
- View Once images excluded from Cache API / Service Worker cache

### Fixed
- Voice notes were silently dropped and never sent (missing socket handler — now uses REST API)
- Messages failing to send due to `null` mediaPublicId triggering Zod schema rejection
- Download button incorrectly appearing on View Once photos (`null` vs `false` coercion bug)
- Deleted image messages showing "Image unavailable" alongside "this message was deleted"
- Raw Cloudinary URLs leaking via `message:new` WebSocket events for all conversation participants

---

## [1.1.0] — 2026-07-30

### New
- Preloaded chats — instant switching between conversations with zero load times
- Custom themes — ultra-premium dark and light mode system aesthetics

### Improved
- Smart system back button handling for native Android gestures
- Virtual scrolling performance with silky smooth glassmorphism animations

### Fixed
- Login token refresh reliability on slow connections

---

## [1.0.0] — 2026-07-01

### New
- Initial release of WispEcho
- Real-time messaging powered by Socket.IO
- Group chats and direct messages
- Friend requests and friend management
- Google OAuth authentication
- Message reactions and replies
- Media sharing via Cloudinary
- Glassmorphism design system with dark/light themes
- Android APK via Capacitor
