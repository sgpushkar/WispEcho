import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import friendRoutes from "./routes/friend.routes.js";
import messageRoutes from "./routes/message.routes.js";
import groupRoutes from "./routes/group.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { initSockets } from "./sockets/index.js";

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

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 3000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);

app.use(notFound);
app.use(errorHandler);

initSockets(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🔥 WispEcho API running on port ${PORT}`);
});
