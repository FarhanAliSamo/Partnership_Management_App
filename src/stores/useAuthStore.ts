import { create } from 'zustand';
import type { User } from '@/types';
import * as authService from '@/services/authService';

interface AuthState {
  user: User | null;
  restoring: boolean;
  setUser: (user: User | null) => void;
  login: (username: string, passcode: string) => Promise<User>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  restoring: true,

  setUser: (user) => set({ user }),

  login: async (username, passcode) => {
    const { user } = await authService.login(username, passcode);
    set({ user });
    return user;
  },

  logout: async () => {
    await authService.logout();
    set({ user: null });
  },

  restore: async () => {
    try {
      const user = await authService.restoreSession();
      set({ user });
    } finally {
      set({ restoring: false });
    }
  },
}));