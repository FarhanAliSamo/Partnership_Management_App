import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, tone = 'success') => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, message, tone }] });
    setTimeout(() => {
      get().dismiss(id);
    }, 2600);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/** Imperative helper for calling from services/non-React code. */
export function toast(message: string, tone: Toast['tone'] = 'success'): void {
  useToastStore.getState().show(message, tone);
}