import React from 'react';

const NAV_ITEMS = [
  { section: 'Overview' },
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'search', label: 'Search', icon: '🔍' },
  { section: 'Patient Management' },
  { id: 'patients', label: 'Patient Registry', icon: '👥' },
  { id: 'patient-new', label: 'New Patient', icon: '➕' },
  { section: 'Procedures' },
  { id: 'procedure-new', label: 'New Procedure', icon: '🔬' },
  { section: 'Analytics' },
  { id: 'reports', label: 'Reports & Export', icon: '📊' },
  { section: 'Administration' },
  { id: 'users', label: 'User Management', icon: '👤' },
  { id: 'backup', label: 'Backup & Settings', icon: '💾' },
];

export default function Sidebar({ currentView, onNavigate, onLogout, user }) {
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🫀</div>
          <div>
            <div className="sidebar-logo-text">VQI Registry</div>
            <div className="sidebar-logo-sub">Vascular Surgery</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item, i) => {
          if (item.section) {
            return <div key={i} className="sidebar-section-label">{item.section}</div>;
          }
          // Only show admin items to administrators
          if ((item.id === 'users' || item.id === 'backup') && user?.role !== 'administrator') {
            return null;
          }
          return (
            <div
              key={item.id}
              className={`sidebar-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name || user?.username}</div>
            <div className="sidebar-user-role">{user?.role?.replace('_', ' ')}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout}>↩ Sign Out</button>
      </div>
    </aside>
  );
}
