import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api.js';
import { tokenStore } from '../api/axios.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const t = tokenStore.get();
    if (!t) { setBootstrapped(true); return; }
    authApi.me()
      .then((u) => setUser(u))
      .catch(() => { tokenStore.clear(); setUser(null); })
      .finally(() => setBootstrapped(true));
  }, []);

  const login = useCallback(async (username, password) => {
    const { token, user: u } = await authApi.login(username, password);
    tokenStore.set(token);
    // Drop any data fetched under the previous (or anonymous) session so the
    // new user immediately sees their own trust-scoped view — without a page
    // refresh.
    queryClient.clear();
    setUser(u);
    return u;
  }, [queryClient]);

  const logout = useCallback(() => {
    tokenStore.clear();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, login, logout, isAuthenticated: !!user, bootstrapped }),
    [user, login, logout, bootstrapped]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
