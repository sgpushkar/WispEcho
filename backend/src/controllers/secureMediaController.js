import { v2 as cloudinary } from "cloudinary";
import prisma from "../config/db.js";
import https from "https";
import http from "http";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cache-Control values
const VIEW_ONCE_CACHE = "no-store, no-cache, must-revalidate, private";
const REGULAR_CACHE   = "private, max-age=900"; // 15 min client-side, private (no CDN)

/**
 * GET /api/media/image/:messageId
 * Streams image bytes after verifying the requester is a conversation participant.
 * The raw Cloudinary URL is NEVER sent to the client.
 * View-once: blocked after first view. Regular: proxied with 15-min cache headers.
 */
export async function proxyMediaImage(req, res, next) {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    // 1. Fetch message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        conversationId: true,
        type: true,
        mediaUrl: true,
        mediaPublicId: true,
        isViewOnce: true,
        viewedByIds: true,
        isDeleted: true,
        senderId: true,
      },
    });

    if (!message || message.isDeleted) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (!["IMAGE", "VOICE", "VIDEO"].includes(message.type)) {
      return res.status(400).json({ error: "Not a media message" });
    }

    // 2. Verify participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId: message.conversationId, userId },
      },
    });

    if (!participant) {
      return res.status(403).json({ error: "Access denied" });
    }

    // 3. View-once: block re-access after viewing (recipients only — sender can preview)
    if (message.isViewOnce && message.senderId !== userId) {
      if (message.viewedByIds.includes(userId)) {
        return res.status(403).json({ error: "View-once image already viewed" });
      }
    }

    // 4. Resolve the actual Cloudinary URL to fetch
    // mediaUrl stores the original Cloudinary secure_url (public but hidden from clients)
    // mediaPublicId is used to generate a fresh Cloudinary URL if needed
    let cloudinaryUrl = message.mediaUrl;

    if (!cloudinaryUrl && message.mediaPublicId) {
      const resourceType = message.type === "VOICE" ? "video" : "image";
      cloudinaryUrl = cloudinary.url(message.mediaPublicId, {
        resource_type: resourceType,
        secure: true,
      });
    }

    if (!cloudinaryUrl) {
      return res.status(404).json({ error: "No media found" });
    }

    // 5. Set security headers
    res.set({
      "Cache-Control": message.isViewOnce ? VIEW_ONCE_CACHE : REGULAR_CACHE,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": message.isViewOnce
        ? "inline"
        : `inline; filename="media-${messageId}"`,
      // Prevent embedding in other origins
      "X-Frame-Options": "DENY",
    });

    // 6. Stream image from Cloudinary → client (never exposing the URL)
    const protocol = cloudinaryUrl.startsWith("https") ? https : http;
    const proxyReq = protocol.get(cloudinaryUrl, (cloudRes) => {
      // Forward content-type from Cloudinary
      if (cloudRes.headers["content-type"]) {
        res.set("Content-Type", cloudRes.headers["content-type"]);
      }
      if (cloudRes.headers["content-length"]) {
        res.set("Content-Length", cloudRes.headers["content-length"]);
      }

      res.status(cloudRes.statusCode || 200);
      cloudRes.pipe(res);
    });

    proxyReq.on("error", (err) => {
      console.error("Proxy fetch error:", err);
      if (!res.headersSent) res.status(502).json({ error: "Failed to fetch media" });
    });

    req.on("close", () => proxyReq.destroy());

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/media/token/:messageId
 * Returns a short-lived opaque token the frontend can use in the img src.
 * Token = JWT-signed {messageId, userId, exp} — verified by proxyMediaImage.
 * This is the URL the frontend actually uses: /api/media/image/:messageId
 * (No token needed — auth is via the session cookie / Bearer token on the request itself)
 */

/**
 * POST /api/media/register
 * Called by frontend after Cloudinary upload to store the public_id.
 */
export async function registerUploadedMedia(req, res, next) {
  try {
    const { messageId, publicId } = req.body;
    if (!messageId || !publicId) {
      return res.status(400).json({ error: "messageId and publicId required" });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true },
    });

    if (!message) return res.status(404).json({ error: "Message not found" });
    if (message.senderId !== req.userId) return res.status(403).json({ error: "Access denied" });

    await prisma.message.update({
      where: { id: messageId },
      data: { mediaPublicId: publicId },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
