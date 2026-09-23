import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const NavIcon = ({ icon, label, active, onClick, accentColor }) => (
  <button
    className={`sidebar-icon-btn${active ? ' active' : ''}`}
    onClick={onClick}
    title={label}
    aria-label={label}
    style={active && accentColor ? { color: accentColor, background: `${accentColor}1f`, borderColor: `${accentColor}55` } : undefined}
  >
    <span className="sidebar-icon-glyph">{icon}</span>
  </button>
);

export default function Sidebar({
  view,
  isAuthenticated,
  isAdmin,
  isComplainant,
  isOfficer,
  onGoDashboard,
  onOpenComplaintPortal,
  onOpenAdminPanel,
  onOpenComplaintTracker,
  onOpenApiIntegration,
  onLogout,
  onLogin,
  user,
}) {
  return (
    <aside className="sidebar-rail">
      <div className="sidebar-logo" title="CyberFlow">CF</div>

      <nav className="sidebar-nav">
        <NavIcon
          icon="📊"
          label="Dashboard"
          active={view === 'landing'}
          onClick={onGoDashboard}
        />
        {isAuthenticated && (isAdmin || isOfficer) && (
          <NavIcon
            icon="🛡️"
            label="Active Investigations"
            active={false}
            onClick={onGoDashboard}
          />
        )}
        {isAuthenticated && isComplainant && (
          <NavIcon
            icon="📝"
            label="My Complaints"
            active={false}
            onClick={onOpenComplaintTracker}
          />
        )}
        {isAuthenticated && isComplainant && (
          <NavIcon
            icon="➕"
            label="File a Complaint"
            active={false}
            onClick={onOpenComplaintPortal}
          />
        )}
        {isAuthenticated && isAdmin && (
          <NavIcon
            icon="🔌"
            label="API Integration Demo"
            active={false}
            onClick={onOpenApiIntegration}
          />
        )}
        {isAuthenticated && isAdmin && (
          <NavIcon
            icon="⚙️"
            label="Admin Console"
            active={false}
            accentColor="#41dc8f"
            onClick={onOpenAdminPanel}
          />
        )}
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-footer">
        {isAuthenticated ? (
          <>
            <div className="sidebar-avatar" title={user?.displayName || user?.email}>
              {(user?.displayName || user?.email || '?')[0].toUpperCase()}
            </div>
            <button className="sidebar-icon-btn sidebar-logout" onClick={onLogout} title="Sign out" aria-label="Sign out">
              <span className="sidebar-icon-glyph">↗</span>
            </button>
          </>
        ) : (
          <button className="sidebar-icon-btn" onClick={onLogin} title="System Login" aria-label="System Login">
            <span className="sidebar-icon-glyph">→</span>
          </button>
        )}
      </div>
    </aside>
  );
}
