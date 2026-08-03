import { useState, useEffect, useCallback, useRef } from "react";

/** Must match the app's built-in version (update on each release) */
export const CURRENT_VERSION = "1.2.6";

/* ---------- types ---------- */

interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    new: string[];
    improved: string[];
    fixed: string[];
  };
}

interface VersionPayload {
  latestVersion: string;
  minimumVersion: string;
  versionCode: number;
  downloadUrl: string;
  releaseDate: string | null;
  changelog: ChangelogEntry[];
}

type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "update-available"
  | "force-update"
  | "downloading"
  | "download-complete"
  | "download-error";

export interface UpdateState {
  status: UpdateStatus;
  payload: VersionPayload | null;
  downloadProgress: number; // 0-100
  error: string | null;
}

/* ---------- semver helpers ---------- */

function parseSemver(v: string): number[] {
  return v.replace(/^v/i, "").split(".").map(Number);
}

/** Returns true when `remote` is strictly newer than `local`. */
export function isNewerVersion(remote: string, local: string): boolean {
  const r = parseSemver(remote);
  const l = parseSemver(local);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const rn = r[i] ?? 0;
    const ln = l[i] ?? 0;
    if (rn > ln) return true;
    if (rn < ln) return false;
  }
  return false;
}

/** Returns true when `installed` is below `minimum`. */
function isBelowMinimum(installed: string, minimum: string): boolean {
  return isNewerVersion(minimum, installed);
}

/* ---------- hook ---------- */

export function useUpdateChecker() {
  const [state, setState] = useState<UpdateState>({
    status: "idle",
    payload: null,
    downloadProgress: 0,
    error: null,
  });

  const xhrRef = useRef<XMLHttpRequest | null>(null);

  /** Fetch version info from the backend. */
  const checkForUpdate = useCallback(async () => {
    setState((s) => ({ ...s, status: "checking", error: null }));

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL || "https://wispecho.onrender.com";
      const res = await fetch(`${baseUrl}/version.json?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: VersionPayload = await res.json();

      if (isBelowMinimum(CURRENT_VERSION, data.minimumVersion)) {
        setState({ status: "force-update", payload: data, downloadProgress: 0, error: null });
      } else if (isNewerVersion(data.latestVersion, CURRENT_VERSION)) {
        setState({ status: "update-available", payload: data, downloadProgress: 0, error: null });
      } else {
        setState({ status: "up-to-date", payload: data, downloadProgress: 0, error: null });
      }
    } catch (err: any) {
      console.error("Version check failed:", err);
      setState((s) => ({ ...s, status: "idle", error: err.message }));
    }
  }, []);

  /** Download the APK with progress tracking, then open the Android installer. */
  const startDownload = useCallback(async () => {
    const url = state.payload?.downloadUrl;
    if (!url) return;

    const isCapacitor = typeof window !== "undefined" && (window as any).Capacitor;

    if (isCapacitor) {
      // ── Native Android path ──────────────────────────────────────────────
      // Download in-app with a progress bar, save to Downloads, then install.
      setState((s) => ({ ...s, status: "downloading", downloadProgress: 0, error: null }));

      try {
        const { Filesystem, Directory } = await import("@capacitor/filesystem");
        const version = state.payload?.latestVersion || "update";
        const fileName = `WispEcho-v${version}.apk`;

        // 1. Fetch with progress via ReadableStream
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const contentLength = Number(response.headers.get("content-length") || "0");
        const reader = response.body!.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          if (contentLength > 0) {
            const pct = Math.round((received / contentLength) * 100);
            setState((s) => ({ ...s, downloadProgress: pct }));
          }
        }

        // 2. Convert to base64
        const blob = new Blob(chunks as unknown as BlobPart[], { type: "application/vnd.android.package-archive" });
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader2 = new FileReader();
          reader2.onload = () => {
            const result = reader2.result as string;
            resolve(result.split(",")[1]); // strip data:...;base64,
          };
          reader2.onerror = reject;
          reader2.readAsDataURL(blob);
        });

        // 3. Save to the device Downloads folder
        const { uri } = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
          recursive: true,
        });

        setState((s) => ({ ...s, status: "download-complete", downloadProgress: 100 }));

        // 4. Open the saved file to trigger the Android package installer
        // file:// URI is handled by Android's FileProvider for APK installs
        const fileUrl = uri.startsWith("file://") ? uri : `file://${uri}`;
        window.open(fileUrl, "_system");
      } catch (err: any) {
        console.error("In-app download failed, falling back to browser:", err);
        // Fallback: open in system browser
        window.open(url, "_system");
        dismiss();
      }

      return;
    }

    // ── Web path ─────────────────────────────────────────────────────────────
    setState((s) => ({ ...s, status: "downloading", downloadProgress: 0, error: null }));

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.responseType = "blob";

    xhr.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setState((s) => ({ ...s, downloadProgress: pct }));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setState((s) => ({ ...s, status: "download-complete", downloadProgress: 100 }));

        const blob = xhr.response as Blob;
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `WispEcho-v${state.payload?.latestVersion || "update"}.apk`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      } else {
        setState((s) => ({
          ...s,
          status: "download-error",
          error: `Download failed (HTTP ${xhr.status})`,
        }));
      }
    };

    xhr.onerror = () => {
      setState((s) => ({
        ...s,
        status: "download-error",
        error: "Network error during download",
      }));
    };

    xhr.open("GET", url);
    xhr.send();
  }, [state.payload]);

  /** Cancel an in-progress download. */
  const cancelDownload = useCallback(() => {
    xhrRef.current?.abort();
    setState((s) => ({ ...s, status: "update-available", downloadProgress: 0 }));
  }, []);

  /** Dismiss the update dialog (only for optional updates). */
  const dismiss = useCallback(() => {
    setState((s) => ({ ...s, status: "idle" }));
  }, []);

  /** Open the download URL in the system browser as a fallback. */
  const openInBrowser = useCallback(() => {
    const url = state.payload?.downloadUrl;
    if (url) {
      window.open(url, "_system");
    }
  }, [state.payload]);

  // Auto-check on mount and every 10 minutes
  useEffect(() => {
    checkForUpdate();
    const interval = setInterval(checkForUpdate, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkForUpdate]);

  return {
    ...state,
    checkForUpdate,
    startDownload,
    cancelDownload,
    dismiss,
    openInBrowser,
  };
}
