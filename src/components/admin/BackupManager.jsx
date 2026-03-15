import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';

export default function BackupManager() {
  const { notify } = useApp();
  const [dataPath, setDataPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState('');

  useEffect(() => {
    window.electronAPI.getDataPath().then(path => setDataPath(path));
  }, []);

  async function handleBackup() {
    setLoading(true);
    try {
      const res = await window.electronAPI.createBackup();
      if (res.success) {
        notify(`Backup saved: ${res.path}`);
      } else if (!res.canceled) {
        notify('Backup failed', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPatients() {
    setExportLoading('patients');
    try {
      const res = await window.electronAPI.exportPatients();
      if (!res.success) { notify('Export failed', 'error'); return; }
      const csv = toCSV(res.data);
      const saveRes = await window.electronAPI.saveFile(csv, `vqi_patients_${today()}.csv`);
      if (saveRes.success) notify(`Patients exported: ${saveRes.path}`);
      else if (!saveRes.canceled) notify('Export failed', 'error');
    } finally {
      setExportLoading('');
    }
  }

  async function handleExportProcedures() {
    setExportLoading('procedures');
    try {
      const res = await window.electronAPI.exportProcedures();
      if (!res.success) { notify('Export failed', 'error'); return; }
      const csv = toCSV(res.data);
      const saveRes = await window.electronAPI.saveFile(csv, `vqi_procedures_${today()}.csv`);
      if (saveRes.success) notify(`Procedures exported: ${saveRes.path}`);
      else if (!saveRes.canceled) notify('Export failed', 'error');
    } finally {
      setExportLoading('');
    }
  }

  function toCSV(rows) {
    if (!rows || rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')];
    rows.forEach(row => {
      lines.push(headers.map(h => {
        const v = row[h];
        if (v === null || v === undefined) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','));
    });
    return lines.join('\n');
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  return (
    <div className="page" style={{ padding: 24, maxWidth: 800 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Backup & Data Export</h1>
          <p className="page-subtitle">Protect your registry data and export for research</p>
        </div>
      </div>

      {/* Database Info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">🗄️ Database Information</div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, fontSize: '0.88rem' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Type:</span>
            <span>SQLite (local, encrypted)</span>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Location:</span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', wordBreak: 'break-all' }}>
              {dataPath ? `${dataPath}/vqi_registry.db` : 'Loading...'}
            </span>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Mode:</span>
            <span>Fully offline — no internet required</span>
          </div>
          {dataPath && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}
              onClick={() => window.electronAPI.openPath(dataPath)}>
              📁 Open Data Folder
            </button>
          )}
        </div>
      </div>

      {/* Backup */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">💾 Database Backup</div>
        </div>
        <div className="card-body">
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 16 }}>
            Create a complete backup of the registry database. The backup file can be used to restore the
            registry on another workstation or recover from data loss. Store backups on an external drive or
            secure network location.
          </p>
          <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
            <strong style={{ color: '#92400e', fontSize: '0.85rem' }}>⚠️ Recommended:</strong>
            <p style={{ color: '#78350f', fontSize: '0.83rem', marginTop: 4 }}>
              Create daily backups and store at least one copy offsite. For HIPAA compliance,
              ensure backups are encrypted and access-controlled.
            </p>
          </div>
          <button className="btn btn-primary" onClick={handleBackup} disabled={loading}>
            {loading ? <><span className="spinner-sm"></span> Creating Backup...</> : '💾 Create Backup Now'}
          </button>
        </div>
      </div>

      {/* Data Export */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">📥 Data Export</div>
        </div>
        <div className="card-body">
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 16 }}>
            Export registry data in CSV format for analysis in statistical software (R, SPSS, Stata, Excel).
            Exported files can be used to generate Kaplan–Meier survival curves, patency analyses, and
            publishable research tables.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>👥</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Patient Registry</div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 12 }}>
                All patients with demographics and comorbidities.
                Use for Table 1 baseline characteristics.
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleExportPatients}
                disabled={exportLoading === 'patients'}>
                {exportLoading === 'patients' ? '⏳ Exporting...' : '📥 Export Patients CSV'}
              </button>
            </div>

            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🔬</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Procedure Registry</div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 12 }}>
                All procedures with intraoperative and postoperative outcomes.
                Use for Table 2 outcomes analysis.
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleExportProcedures}
                disabled={exportLoading === 'procedures'}>
                {exportLoading === 'procedures' ? '⏳ Exporting...' : '📥 Export Procedures CSV'}
              </button>
            </div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', marginTop: 16 }}>
            <strong style={{ color: '#1e40af', fontSize: '0.85rem' }}>ℹ️ Research Tip</strong>
            <p style={{ color: '#1e3a8a', fontSize: '0.83rem', marginTop: 4 }}>
              For Kaplan–Meier patency and survival analysis, use the Reports section to export
              follow-up data with time-to-event variables. Import into R (<code>survival</code> package)
              or SPSS for KM curves.
            </p>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🔒 Security & Privacy</div>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.88rem' }}>
            {[
              ['✓', 'All data stored locally on this workstation', 'success'],
              ['✓', 'No data transmitted over the internet', 'success'],
              ['✓', 'Role-based access control enforced', 'success'],
              ['✓', 'All user actions logged in audit trail', 'success'],
              ['⚠', 'Ensure workstation has full disk encryption enabled (BitLocker / FileVault)', 'warning'],
              ['⚠', 'Restrict physical access to workstation running registry', 'warning'],
              ['⚠', 'Follow your institution\'s data retention policies', 'warning'],
            ].map(([icon, text, type], i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: type === 'success' ? '#10b981' : '#f59e0b', fontWeight: 700, marginTop: 1 }}>{icon}</span>
                <span style={{ color: type === 'success' ? '#065f46' : '#92400e' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
