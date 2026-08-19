import { useState, useEffect, useRef } from "react";

const CACHE_NAME = "wispecho-image-cache-v1";

/**
 * Caches images in the Cache API for performance.
 * View-once images are NEVER cached — they exist only in memory for the duration of the session.
 */
export function useImageCache(url: string | null | undefined, isViewOnce?: boolean) {
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  // Track the live object URL in a ref so the cleanup function
  // always revokes the correct value, not a stale closure snapshot.
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!url) {
      setCachedUrl(null);
      return;
    }

    // Ignore local data urls or temporary preview urls
    if (url.startsWith("blob:") || url.startsWith("data:")) {
      setCachedUrl(url);
      return;
    }

    // NEVER cache view-once images — they must not persist in any browser storage
    if (isViewOnce) {
      setCachedUrl(url);
      return;
    }

    let isMounted = true;

    const checkCache = async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(url);

        if (cachedResponse) {
          const blob = await cachedResponse.blob();
          const localUrl = URL.createObjectURL(blob);
          objectUrlRef.current = localUrl;
          if (isMounted) setCachedUrl(localUrl);
        } else {
          // Fetch and store
          const response = await fetch(url);
          if (response.ok) {
            // Put clone into cache
            await cache.put(url, response.clone());
            const blob = await response.blob();
            const localUrl = URL.createObjectURL(blob);
            objectUrlRef.current = localUrl;
            if (isMounted) setCachedUrl(localUrl);
          } else {
            if (isMounted) setCachedUrl(url);
          }
        }
      } catch (err) {
        console.error("Image cache error:", err);
        if (isMounted) setCachedUrl(url);
      }
    };

    checkCache();

    return () => {
      isMounted = false;
      // Revoke via ref — always has the current URL, not a stale closure snapshot
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [url, isViewOnce]);

  return cachedUrl;
}
