import { v2 as cloudinary } from "cloudinary";

// Ensure cloudinary is configured (using env vars automatically if CLOUDINARY_URL is present, or configure manually)
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

    // All params sent to Cloudinary MUST be included in the signature
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
      resourceType, // "image" or "video" — tells the frontend which Cloudinary endpoint to use
    });
  } catch (error) {
    console.error("Cloudinary signature error:", error);
    res.status(500).json({ error: "Failed to generate signature" });
  }
};
