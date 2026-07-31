import React, { useState, useCallback } from "react";
import { api } from "@/lib/api";

export interface PendingUpload {
  id: string; // Temporary ID to match local state
  file: File;
  previewUrl: string;
  progress: number;
  status: "uploading" | "error" | "done";
  caption?: string;
  isViewOnce?: boolean;
  secureUrl?: string; // Filled when done
}

export function useImageUpload() {
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const activeXhrRefs = React.useRef<{ [id: string]: XMLHttpRequest }>({});
  const callbacksRef = React.useRef<{ [id: string]: { onComplete?: Function, onError?: Function } }>({});

  const uploadFile = useCallback(async (
    file: File,
    tempId: string,
    caption?: string,
    onComplete?: (url: string, tempId: string, caption?: string) => void,
    onError?: (err: Error, tempId: string) => void
  ) => {
    try {
      // Set status back to uploading if retrying
      setPendingUploads((prev) =>
        prev.map((up) => (up.id === tempId ? { ...up, status: "uploading", progress: 0 } : up))
      );

      // Store callbacks for retry
      callbacksRef.current[tempId] = { onComplete, onError };

      // 1. Get Signature from backend
      const sigRes = await api.get("/upload/signature");
      const { signature, timestamp, cloudName, apiKey, folder } = sigRes.data;

      // 2. Prepare FormData for Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", folder);

      // 3. Upload with XHR to track progress
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setPendingUploads((prev) =>
            prev.map((up) =>
              up.id === tempId ? { ...up, progress } : up
            )
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          const secureUrl = response.secure_url;
          setPendingUploads((prev) =>
            prev.map((up) =>
              up.id === tempId ? { ...up, status: "done", progress: 100, secureUrl } : up
            )
          );
          if (onComplete) onComplete(secureUrl, tempId, caption);
        } else {
          setPendingUploads((prev) =>
            prev.map((up) => (up.id === tempId ? { ...up, status: "error" } : up))
          );
          if (onError) onError(new Error(`Upload failed: ${xhr.status}`), tempId);
        }
      };

      xhr.onerror = () => {
        setPendingUploads((prev) =>
          prev.map((up) => (up.id === tempId ? { ...up, status: "error" } : up))
        );
        delete activeXhrRefs.current[tempId];
        if (onError) onError(new Error("Network error during upload"), tempId);
      };

      xhr.onabort = () => {
        setPendingUploads((prev) =>
          prev.map((up) => (up.id === tempId ? { ...up, status: "error" } : up))
        );
        delete activeXhrRefs.current[tempId];
      };

      activeXhrRefs.current[tempId] = xhr;
      xhr.send(formData);
    } catch (err: any) {
      setPendingUploads((prev) =>
        prev.map((up) => (up.id === tempId ? { ...up, status: "error" } : up))
      );
      delete activeXhrRefs.current[tempId];
      if (onError) onError(err, tempId);
    }
  }, []);

  const cancelUpload = useCallback((tempId: string) => {
    const xhr = activeXhrRefs.current[tempId];
    if (xhr) {
      xhr.abort();
      delete activeXhrRefs.current[tempId];
    }
  }, []);

  const addPendingUpload = useCallback((file: File, caption?: string, isViewOnce?: boolean) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const previewUrl = URL.createObjectURL(file);
    
    const newUpload: PendingUpload = {
      id: tempId,
      file,
      previewUrl,
      progress: 0,
      status: "uploading",
      caption,
      isViewOnce,
    };
    
    setPendingUploads((prev) => [...prev, newUpload]);
    return { tempId, newUpload };
  }, []);

  const removePendingUpload = useCallback((tempId: string) => {
    setPendingUploads((prev) => {
      const upload = prev.find((u) => u.id === tempId);
      if (upload) URL.revokeObjectURL(upload.previewUrl);
      return prev.filter((u) => u.id !== tempId);
    });
    delete callbacksRef.current[tempId];
    delete activeXhrRefs.current[tempId];
  }, []);

  const retryUpload = useCallback((tempId: string) => {
    const upload = pendingUploads.find(u => u.id === tempId);
    if (upload) {
      const cbs = callbacksRef.current[tempId];
      uploadFile(upload.file, tempId, upload.caption, cbs?.onComplete as any, cbs?.onError as any);
    }
  }, [pendingUploads, uploadFile]);

  return {
    pendingUploads,
    addPendingUpload,
    uploadFile,
    removePendingUpload,
    cancelUpload,
    retryUpload,
  };
}
