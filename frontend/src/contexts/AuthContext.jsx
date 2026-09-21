/**
 * CyberFlow — Authentication Context
 *
 * Provides app-wide auth state (user, role, loading) via React Context.
 * Roles are stored in Firestore document `users/{uid}` and cached locally.
 *
 * Three roles:
 *   admin        — Full dashboard + user management
 *   officer      — Full investigation access
 *   complainant  — File + track own complaints only
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  doc,
  getDoc,
  setDoc,
} from '../firebase';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

// Default role for newly registered users
const DEFAULT_ROLE = 'complainant';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch role from Firestore (or create default entry for new users)
  const fetchRole = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setRole(null);
      return null;
    }
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const r = snap.data().role || DEFAULT_ROLE;
        setRole(r);
        return r;
      }
      // First login — create user document with default role
      const newDoc = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || '',
        role: DEFAULT_ROLE,
        createdAt: new Date().toISOString(),
        caseIds: [],
      };
      await setDoc(userRef, newDoc);
      setRole(DEFAULT_ROLE);
      return DEFAULT_ROLE;
    } catch (err) {
      console.error('[Auth] Failed to fetch role from Firestore:', err);
      // Fallback: if Firestore is unreachable (e.g. no project yet),
      // grant officer role so the demo remains functional.
      setRole('officer');
      return 'officer';
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchRole(firebaseUser);
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [fetchRole]);

  // ── Auth actions ──

  const login = useCallback(async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await fetchRole(cred.user);
    return cred.user;
  }, [fetchRole]);

  const loginWithGoogle = useCallback(async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    await fetchRole(cred.user);
    return cred.user;
  }, [fetchRole]);

  const signup = useCallback(async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    await fetchRole(cred.user);
    return cred.user;
  }, [fetchRole]);

  const logout = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setRole(null);
  }, []);

  const getIdToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
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
    loginWithGoogle,
    signup,
    logout,
    getIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;

