import React, { useState, useEffect, createContext, useContext } from 'react';
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

export const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

export default function App() {
  const [user, setUser] = useState(null);
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

  function handleLogout() {
    setUser(null);
    setView('dashboard');
    setViewParams({});
  }

  if (!user) {
    return <Login onLogin={setUser} />;
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
          <ViewRenderer view={view} params={viewParams} />
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
    case 'patient-edit': return <PatientForm patientId={params.patientId} />;
    case 'patient-view': return <PatientForm patientId={params.patientId} readOnly={false} />;
    case 'procedure-new': return <ProcedureForm patientId={params.patientId} />;
    case 'procedure-edit': return <ProcedureForm procedureId={params.procedureId} />;
    case 'followup': return <FollowUpForm procedureId={params.procedureId} />;
    case 'reports': return <Reports />;
    case 'search': return <Search />;
    case 'users': return <UserManagement />;
    case 'backup': return <BackupManager />;
    default: return <Dashboard />;
  }
}
