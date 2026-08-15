"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";

// Base API URL (same as lib/api.ts)
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://wispecho.onrender.com/api";

interface UseSecureImageOptions {
  messageId: string | null;
  isViewOnce?: boolean;
  /** Pass true when the image has already been viewed — skip fetch entirely */
  alreadyViewed?: boolean;
  enabled?: boolean;
}

interface UseSecureImageResult {
  url: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useSecureImage({
  messageId,
  isViewOnce = false,
  alreadyViewed = false,
  enabled = true,
}: UseSecureImageOptions): UseSecureImageResult {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const objectUrlRef = useRef<string | null>(null);
  const fetchIdRef = useRef(0);

  const fetchAndCreateObjectUrl = useCallback(async () => {
    if (!messageId || !enabled || alreadyViewed) return;

    const currentFetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const token = useAuthStore.getState().accessToken;

      // Fetch image bytes through the backend proxy.
      // The raw Cloudinary URL is NEVER sent to the client.
      const response = await fetch(`${BASE_URL}/media/image/${messageId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        // Prevent browser from caching view-once responses
        cache: isViewOnce ? "no-store" : "default",
      });

      if (!mountedRef.current || currentFetchId !== fetchIdRef.current) return;

      if (response.status === 403) {
        setError("already_viewed");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError("failed");
        setLoading(false);
        return;
      }

      // Convert response bytes to a local blob URL
      // This means the image never touches the browser's HTTP cache as a Cloudinary URL
      const blob = await response.blob();
      if (!mountedRef.current || currentFetchId !== fetchIdRef.current) return;

      // Revoke previous object URL before creating a new one
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      const objectUrl = URL.createObjectURL(blob);
      objectUrlRef.current = objectUrl;
      setUrl(objectUrl);
      setLoading(false);
    } catch (err: any) {
      if (!mountedRef.current || currentFetchId !== fetchIdRef.current) return;
      setError("failed");
      setLoading(false);
    }
  }, [messageId, enabled, alreadyViewed, isViewOnce]);

  useEffect(() => {
    mountedRef.current = true;
    fetchAndCreateObjectUrl();

    return () => {
      mountedRef.current = false;
      // Revoke object URL on unmount to free memory
      // For view-once: this also ensures the blob can't be accessed after close
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [fetchAndCreateObjectUrl]);

  return { url, loading, error, refresh: fetchAndCreateObjectUrl };
}
