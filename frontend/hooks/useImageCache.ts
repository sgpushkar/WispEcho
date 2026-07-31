import { useState, useEffect } from "react";

const CACHE_NAME = "wispecho-image-cache-v1";

export function useImageCache(url: string | null | undefined) {
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);

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

    let isMounted = true;

    const checkCache = async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(url);

        if (cachedResponse) {
          const blob = await cachedResponse.blob();
          const localUrl = URL.createObjectURL(blob);
          if (isMounted) setCachedUrl(localUrl);
        } else {
          // Fetch and store
          const response = await fetch(url);
          if (response.ok) {
            // Put clone into cache
            await cache.put(url, response.clone());
            const blob = await response.blob();
            const localUrl = URL.createObjectURL(blob);
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
      // Revoke the object URL if we created one
      if (cachedUrl && cachedUrl.startsWith("blob:")) {
        URL.revokeObjectURL(cachedUrl);
      }
    };
  }, [url]);

  return cachedUrl;
}
