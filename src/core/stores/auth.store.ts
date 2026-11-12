'use client';

import { create } from 'zustand';

/**
 * The account portal's session state. (Port of the Angular `AuthService`.)
 *
 * `isLoggedIn` defaults to `true` rather than `false`. That is deliberate: the login page's `submit()`
 * never succeeds ("a fake success that leads nowhere would be a worse demo than an honest stub"), so a
 * `false` default would make the portal's auth guard permanently redirect every visitor away from it
 * in the shipped demo -- a demo author could never show the one archetype that most needs showing.
 *
 * `logout()` flips it, which is what the portal nav's "Log out" control exercises to demonstrate the
 * guard's redirect for real, on demand, without needing a working auth backend.
 */
interface AuthState {
  readonly isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: true,
  login: () => set({ isLoggedIn: true }),
  logout: () => set({ isLoggedIn: false }),
}));

export function useAuth() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  return { isLoggedIn, login, logout };
}
