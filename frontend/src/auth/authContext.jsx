import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { authApi } from '../api/auth.api.js';
import { tokenStore } from '../api/axios.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapped, setBootstrapped] = useState(false);

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
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

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
