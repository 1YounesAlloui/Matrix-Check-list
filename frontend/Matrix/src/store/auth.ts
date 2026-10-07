import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { User } from '@/types/api';
import { ThemeMode } from '@/constants/theme';

interface AppPreferencesState {
  user: User;
  isAuthenticated: boolean;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  setUser: (user: Partial<User>) => void;
}

const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null;
      }
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(name, value);
        }
        return;
      }
      await SecureStore.setItemAsync(name, value);
    } catch {
      // Ignore secure store write errors
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(name);
        }
        return;
      }
      await SecureStore.deleteItemAsync(name);
    } catch {
      // Ignore secure store delete errors
    }
  },
};

export const useAuthStore = create<AppPreferencesState>()(
  persist(
    (set) => ({
      user: {
        id: 1,
        username: 'You',
        email: 'local@matrix.app',
      },
      isAuthenticated: true,
      theme: 'light',

      setTheme: (theme) => set({ theme }),
      setUser: (userUpdates) =>
        set((state) => ({ user: { ...state.user, ...userUpdates } })),
    }),
    {
      name: 'matrix-auth-preferences',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        theme: state.theme,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
