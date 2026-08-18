import { create } from 'zustand';
import type { ThemeMode } from '@/theme';

interface UiState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
}));
