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
  isNewUser: boolean;
  setAuth: (user: User, token: string, isNew?: boolean) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  setIsNewUser: (isNew: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isNewUser: false,
      setAuth: (user, token, isNew = false) => set({ user, accessToken: token, isNewUser: isNew }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      setIsNewUser: (isNew) => set({ isNewUser: isNew }),
      logout: () => set({ user: null, accessToken: null, isNewUser: false }),
    }),
    {
      name: "wispecho-auth",
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
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

