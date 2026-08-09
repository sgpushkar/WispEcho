import axios from "axios";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";

// Hardcoded fallback ensures the APK always knows the backend URL
// even if NEXT_PUBLIC_API_URL wasn't injected at build time
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://wispecho.onrender.com/api";

export const adminApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send refreshToken cookie
});

adminApi.interceptors.request.use((config) => {
  const token = useAdminAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue: Array<() => void> = [];

adminApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push(() => resolve(adminApi(originalRequest)));
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = useAdminAuthStore.getState().refreshToken;
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          { refreshToken },
          { withCredentials: true }
        );
        useAdminAuthStore.getState().setAccessToken(data.accessToken);
        if (data.refreshToken) {
          useAdminAuthStore.getState().setRefreshToken(data.refreshToken);
        }
        queue.forEach((cb) => cb());
        queue = [];
        return adminApi(originalRequest);
      } catch (refreshErr) {
        useAdminAuthStore.getState().logout();
        if (typeof window !== "undefined") window.location.href = "/admin/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
