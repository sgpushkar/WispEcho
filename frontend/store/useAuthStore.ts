import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  accentColor?: string | null;
  status?: string | null;
  isOnline?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isNewUser: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string, isNewUser?: boolean) => void;
  setAccessToken: (token: string) => void;
  setRefreshToken: (token: string) => void;
  logout: () => void;
  setIsNewUser: (isNew: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isNewUser: false,
      setAuth: (user, accessToken, refreshToken, isNewUser = false) => {
        set({ user, accessToken, refreshToken, isAuthenticated: true, isNewUser });
      },
      setAccessToken: (token) => {
        set({ accessToken: token, isAuthenticated: true });
      },
      setRefreshToken: (token) => {
        set({ refreshToken: token });
      },
      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isNewUser: false });
      },
      setIsNewUser: (isNew) => set({ isNewUser: isNew }),
    }),
    {
      name: "wispecho-auth",
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken, refreshToken: state.refreshToken }),
    }
  )
);

/**
 * Returns true once zustand's persist middleware has finished
 * rehydrating state from localStorage. Use this to avoid the
 * SSR flash where accessToken is null before hydration.
 */
export function useHasHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    // If hydration already finished before this effect ran
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  return hydrated;
}

