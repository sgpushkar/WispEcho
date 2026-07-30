# WispEcho ⚡

> **Next-Gen Encrypted Real-Time Messaging & Chat Platform**  
> Ultra-fast, privacy-first messaging with View Once media, custom theme engine, in-app self-updates, and native Android support.

---

## ✨ Features

- 💬 **Real-Time Messaging**: Built on Socket.io for instant message delivery and read receipts.
- 👁️ **View Once Media**: Send photos that can only be opened once by the recipient.
- 📸 **Image Uploads**: Powered by Cloudinary direct-to-cloud uploads with live progress bars.
- 📁 **Multi-Source Attachments**: Support for Gallery picker, Camera integration (`@capacitor/camera`), Drag & Drop, and Clipboard (`Ctrl+V`) paste.
- 🔍 **Zoomable Media Viewer**: Interactive full-screen image viewer with pinch-to-zoom and panning (`react-zoom-pan-pinch`).
- 🎨 **Dynamic Theme System**: Sleek glassmorphism UI with ultra-customizable dark and light modes.
- 🔔 **Native & Web Notifications**: Browser notification permissions and `@capacitor/local-notifications` integration for background alerts.
- 🚀 **Self-Hosted In-App APK Updates**: Automatic update checker that fetches GitHub Release binaries directly inside the Android app.
- 🔍 **SEO & OpenGraph Ready**: Optimized with JSON-LD `SoftwareApplication` schema, dynamic `sitemap.xml`, and `robots.txt`.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router, Turbopack) & React 19
- **Mobile**: Capacitor 8 (Android SDK)
- **Styling**: Tailwind CSS & Framer Motion
- **State Management**: Zustand & TanStack React Query
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js & Express
- **Database**: PostgreSQL (Supabase / Prisma ORM)
- **Real-Time**: Socket.io
- **Media Storage**: Cloudinary SDK

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js `v20+`
- PostgreSQL database URL
- Cloudinary account

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
PORT=5000
DATABASE_URL="your_postgresql_database_url"
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Run database migrations & start backend:

```bash
npx prisma db push
npm run dev
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create `.env.local` inside `frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

Start dev server:

```bash
npm run dev
```

---

## 📱 Mobile App (Capacitor Android)

To run or build the native Android app locally:

```bash
cd frontend
npm run build
npx cap sync android
npx cap open android
```

---

## 📦 CI/CD & Automated APK Releases

WispEcho features a fully automated GitHub Actions pipeline (`.github/workflows/release.yml`) that builds and packages the Android `.apk` binary automatically on every push to `main` or version tag release.

---

## 📄 License

MIT License © 2026 WispEcho Team
