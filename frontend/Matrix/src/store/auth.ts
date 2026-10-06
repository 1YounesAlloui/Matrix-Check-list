import { create } from 'zustand';
import { User } from '@/types/api';
import { ThemeMode } from '@/constants/theme';

interface AppPreferencesState {
  user: User;
  isAuthenticated: boolean;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  setUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AppPreferencesState>((set) => ({
  user: {
    id: 1,
    username: 'You',
    email: 'local@matrix.app',
  },
  isAuthenticated: true,
  theme: 'dark',

  setTheme: (theme) => set({ theme }),
  setUser: (userUpdates) =>
    set((state) => ({ user: { ...state.user, ...userUpdates } })),
}));
