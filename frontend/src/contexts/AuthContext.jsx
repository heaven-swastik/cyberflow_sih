/**
 * CyberFlow — Authentication Context
 *
 * Provides app-wide auth state (user, role, loading) via React Context.
 * Auth state is backed by the local backend JWT and cached locally.
 *
 * Three roles:
 *   admin        — Full dashboard + user management
 *   officer      — Full investigation access
 *   complainant  — File + track own complaints only
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
const TOKEN_KEY = 'cyberflow_token';
const USER_KEY = 'cyberflow_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem(USER_KEY) || 'null'));
  const [role, setRole] = useState(() => JSON.parse(localStorage.getItem(USER_KEY) || 'null')?.role || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setRole(null);
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!response.ok) throw new Error('Session expired');
        return response.json();
      })
      .then(({ user: currentUser }) => {
        setUser(currentUser);
        setRole(currentUser.role);
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setRole(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Auth actions ──

  const login = useCallback(async (email, password, selectedRole = 'user') => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, role: selectedRole }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Authentication failed');
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    setUser(result.user);
    setRole(result.user.role);
    return result.user;
  }, []);

  const signup = useCallback(async (email, password, displayName) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, displayName }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Registration failed');
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    setUser(result.user);
    setRole(result.user.role);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setRole(null);
  }, []);

  const getIdToken = useCallback(async () => {
    return user ? localStorage.getItem(TOKEN_KEY) : null;
  }, [user]);

  // ── Convenience booleans ──

  const isAdmin = role === 'admin';
  const isOfficer = role === 'officer';
  const isComplainant = role === 'complainant';
  const isAuthenticated = !!user;

  const value = {
    user,
    role,
    loading,
    isAuthenticated,
    isAdmin,
    isOfficer,
    isComplainant,
    login,
    signup,
    logout,
    getIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;

