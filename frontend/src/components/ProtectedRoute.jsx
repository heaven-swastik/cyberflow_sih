/**
 * CyberFlow — Protected Route Wrapper
 *
 * Renders children only if the user is authenticated and has one of the
 * allowed roles. Otherwise renders the LoginPage.
 */
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, allowedRoles = null }) {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="login-loading-screen">
        <div className="login-loading-spinner" />
        <span className="login-loading-text">Verifying credentials…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // App.jsx handles showing LoginPage when not authenticated
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div className="protected-denied">
        <h2>Access Restricted</h2>
        <p>Your role ({role}) does not have permission to access this section.</p>
        <p>Contact your system administrator for access.</p>
      </div>
    );
  }

  return children;
}

