import axios from "axios";
import { useAuthStore } from "@/store/useAuthStore";

// Hardcoded fallback ensures the APK always knows the backend URL
// even if NEXT_PUBLIC_API_URL wasn't injected at build time
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://wispecho.onrender.com/api";

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send refreshToken cookie
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue: Array<() => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push(() => resolve(api(originalRequest)));
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          { refreshToken },
          { withCredentials: true }
        );
        useAuthStore.getState().setAccessToken(data.accessToken);
        if (data.refreshToken) {
          useAuthStore.getState().setRefreshToken(data.refreshToken);
        }
        queue.forEach((cb) => cb());
        queue = [];
        return api(originalRequest);
      } catch (refreshErr) {
        useAuthStore.getState().logout();
        if (typeof window !== "undefined") window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
