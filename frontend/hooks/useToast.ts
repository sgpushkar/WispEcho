import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  add: (message: string, type?: ToastType, duration?: number) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (message, type = "info", duration = 3500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, type, duration }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience hook — returns toast helpers */
export function useToast() {
  const add = useToastStore((s) => s.add);

  return {
    toast: (message: string, duration?: number) => add(message, "info", duration),
    success: (message: string, duration?: number) => add(message, "success", duration),
    error: (message: string, duration?: number) => add(message, "error", duration),
    warning: (message: string, duration?: number) => add(message, "warning", duration),
  };
}
