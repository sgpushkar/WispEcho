import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Read version-config.json from the backend root.
 * Cached per-process but re-reads on each request in development
 * so you can update it without restarting.
 */
function loadVersionConfig() {
  const configPath = join(__dirname, "../../version-config.json");
  const raw = readFileSync(configPath, "utf-8");
  return JSON.parse(raw);
}

/**
 * GET /version.json  (backward-compatible)
 * GET /api/version    (new canonical route)
 *
 * Returns the full version payload including changelog
 * and minimumVersion for force-update logic.
 */
export function getVersion(req, res) {
  try {
    const config = loadVersionConfig();
    const clientUrl = process.env.CLIENT_URL || "https://wispecho.vercel.app";

    // Build the downloadUrl pointing directly to backend static APK download
    const apiUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "https://wispecho.onrender.com";
    const downloadUrl = config.downloadUrl || `${apiUrl}/downloads/wispecho.apk`;

    res.json({
      latestVersion: config.latestVersion,
      minimumVersion: config.minimumVersion,
      versionCode: config.versionCode,
      downloadUrl,
      releaseDate: config.releaseDate,
      changelog: config.changelog || [],
    });
  } catch (err) {
    console.error("Failed to load version config:", err.message);
    // Return a safe fallback so the app never breaks
    res.json({
      latestVersion: "1.0.0",
      minimumVersion: "1.0.0",
      versionCode: 1,
      downloadUrl: `${process.env.CLIENT_URL || "https://wispecho.vercel.app"}/download`,
      releaseDate: null,
      changelog: [],
    });
  }
}
