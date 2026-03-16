import React, { useState, useEffect, createContext, useContext, Component } from 'react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PatientList from './components/patients/PatientList';
import PatientForm from './components/patients/PatientForm';
import ProcedureForm from './components/procedures/ProcedureForm';
import FollowUpForm from './components/followup/FollowUpForm';
import Reports from './components/reports/Reports';
import Search from './components/search/Search';
import UserManagement from './components/admin/UserManagement';
import BackupManager from './components/admin/BackupManager';
import ProcedureTypeSettings from './components/admin/ProcedureTypeSettings';
import ResearchModule from './components/research/ResearchModule';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('VQI ErrorBoundary:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', gap: 16, fontFamily: 'sans-serif', color: '#334155' }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Something went wrong</div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: 400, textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </div>
          <button
            style={{ marginTop: 8, padding: '8px 20px', background: '#3b82f6', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
            onClick={() => this.setState({ error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('vqi_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [view, setView] = useState('dashboard');
  const [viewParams, setViewParams] = useState({});
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  function navigate(newView, params = {}) {
    setView(newView);
    setViewParams(params);
  }

  function notify(message, type = 'success') {
    setNotification({ message, type });
  }

  function handleLogin(u) {
    sessionStorage.setItem('vqi_user', JSON.stringify(u));
    setUser(u);
  }

  function handleLogout() {
    sessionStorage.removeItem('vqi_user');
    setUser(null);
    setView('dashboard');
    setViewParams({});
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const contextValue = { user, navigate, notify };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="app-shell">
        <Sidebar currentView={view} onNavigate={navigate} onLogout={handleLogout} user={user} />
        <main className="app-main">
          {notification && (
            <div className={`notification notification-${notification.type}`}>
              <span>{notification.type === 'success' ? '✓' : notification.type === 'error' ? '✕' : 'ℹ'}</span>
              {notification.message}
            </div>
          )}
          <ErrorBoundary key={view}>
            <ViewRenderer view={view} params={viewParams} />
          </ErrorBoundary>
        </main>
      </div>
    </AppContext.Provider>
  );
}

function ViewRenderer({ view, params }) {
  switch (view) {
    case 'dashboard': return <Dashboard />;
    case 'patients': return <PatientList />;
    case 'patient-new': return <PatientForm />;
    case 'patient-edit': return <PatientForm patientId={params.patientId} defaultTab={params.defaultTab} />;
    case 'patient-view': return <PatientForm patientId={params.patientId} readOnly={false} />;
    case 'procedure-new': return <ProcedureForm patientId={params.patientId} />;
    case 'procedure-edit': return <ProcedureForm procedureId={params.procedureId} />;
    case 'followup': return <FollowUpForm procedureId={params.procedureId} />;
    case 'reports': return <Reports />;
    case 'research': return <ResearchModule />;
    case 'search': return <Search />;
    case 'users': return <UserManagement />;
    case 'procedure-settings': return <ProcedureTypeSettings />;
    case 'backup': return <BackupManager />;
    default: return <Dashboard />;
  }
}
