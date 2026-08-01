import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const getCloudinarySignature = (req, res) => {
  try {
    // `type` query param: "image" (default) or "audio"
    const resourceType = req.query.type === "audio" ? "video" : "image";
    const folder =
      resourceType === "video"
        ? "wispecho_voice_notes"
        : "wispecho_chat_images";

    const timestamp = Math.round(new Date().getTime() / 1000);

    // Images upload as standard "upload" type (public on Cloudinary free plan).
    // Security is enforced at the backend proxy layer — the raw Cloudinary URL
    // is stored server-side only and NEVER sent to any client directly.
    // Clients always fetch media through /api/media/image/:messageId which
    // verifies participant auth before streaming bytes.
    const paramsToSign = { timestamp, folder };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
      resourceType, // "image" or "video"
    });
  } catch (error) {
    console.error("Cloudinary signature error:", error);
    res.status(500).json({ error: "Failed to generate signature" });
  }
};
