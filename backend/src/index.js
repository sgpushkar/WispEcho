import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { fileURLToPath } from "url";
import { dirname, join } from "path";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import friendRoutes from "./routes/friend.routes.js";
import messageRoutes from "./routes/message.routes.js";
import groupRoutes from "./routes/group.routes.js";
import pollRoutes from "./routes/poll.routes.js";
import versionRoutes from "./routes/version.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import linkpreviewRoutes from "./routes/linkpreview.routes.js";
import secureMediaRoutes from "./routes/secureMedia.routes.js";
import pushRoutes from "./routes/push.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import themeRoutes from "./routes/theme.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { getVersion } from "./controllers/versionController.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { ipBanMiddleware } from "./middleware/ipBan.js";
import { initSockets } from "./sockets/index.js";
import { redisAdapter } from "./config/redis.js";
import "./jobs/cron.js"; // Subscription expiry cron

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);

const allowedOrigins = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (origin.includes("localhost") || origin.includes("vercel.app") || origin === process.env.CLIENT_URL) {
    callback(null, true);
  } else {
    callback(new Error("Not allowed by CORS"));
  }
};

const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
});

if (redisAdapter) {
  io.adapter(redisAdapter);
}

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));
app.use(ipBanMiddleware);

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 3000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

app.get("/health", (req, res) => res.json({ ok: true }));
// Version API — backward-compatible path + canonical /api/version
app.get("/version.json", getVersion);

// Direct APK download route (serves directly from backend public/downloads)
app.use("/downloads", express.static(join(__dirname, "../public/downloads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/polls", pollRoutes);
app.use("/api/version", versionRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/media", secureMediaRoutes);
app.use("/api/linkpreview", linkpreviewRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/inbox", notificationsRoutes);
app.use("/api/themes", themeRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

initSockets(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🔥 WispEcho API running on port ${PORT}`);
});
