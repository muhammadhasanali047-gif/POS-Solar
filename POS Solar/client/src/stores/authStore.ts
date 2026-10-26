import { create } from 'zustand';
import { User, UserRole } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const storedToken = localStorage.getItem('solar_pos_token');
  const storedUser = localStorage.getItem('solar_pos_user');

  let initialUser: User | null = null;
  try {
    initialUser = storedUser ? JSON.parse(storedUser) : null;
  } catch (e) {
    initialUser = null;
  }

  return {
    user: initialUser,
    token: storedToken,
    isAuthenticated: !!storedToken && !!initialUser,
    login: (token: string, user: User) => {
      localStorage.setItem('solar_pos_token', token);
      localStorage.setItem('solar_pos_user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('solar_pos_token');
      localStorage.removeItem('solar_pos_user');
      set({ token: null, user: null, isAuthenticated: false });
    },
    updateUser: (updated) => {
      set((state) => {
        if (!state.user) return state;
        const newUser = { ...state.user, ...updated };
        localStorage.setItem('solar_pos_user', JSON.stringify(newUser));
        return { user: newUser };
      });
    },
  };
});