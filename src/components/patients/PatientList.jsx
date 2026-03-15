import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../App';

const AGE_FROM_DOB = (dob) => {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

export default function PatientList() {
  const { navigate, notify } = useApp();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ sex: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await window.electronAPI.getPatients({ search, ...filters });
      if (res.success) setPatients(res.data);
    } finally {
      setLoading(false);
    }
  }, [search, filters]);

  useEffect(() => {
    const timer = setTimeout(loadPatients, 300);
    return () => clearTimeout(timer);
  }, [loadPatients]);

  async function handleDelete(patient) {
    if (confirmDelete?.patient_id !== patient.patient_id) {
      setConfirmDelete(patient);
      return;
    }
    const res = await window.electronAPI.deletePatient(patient.patient_id);
    if (res.success) {
      notify(`Patient ${patient.first_name} ${patient.last_name} deleted`);
      loadPatients();
    }
    setConfirmDelete(null);
  }

  return (
    <div className="page-wide" style={{ padding: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Patient Registry</h1>
          <p className="page-subtitle">{patients.length} patient{patients.length !== 1 ? 's' : ''} found</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('patient-new')}>
          ➕ Register New Patient
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: '1', minWidth: 200 }}>
            <span className="search-bar-icon">🔍</span>
            <input
              className="form-input"
              style={{ paddingLeft: 32 }}
              type="text"
              placeholder="Search by name or MRN..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            style={{ width: 140 }}
            value={filters.sex}
            onChange={e => setFilters(f => ({ ...f, sex: e.target.value }))}
          >
            <option value="">All Sexes</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilters({ sex: '' }); }}>
            Clear
          </button>
        </div>
      </div>

      {/* Confirm Delete Banner */}
      {confirmDelete && (
        <div style={{
          padding: '12px 20px', background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16
        }}>
          <span style={{ color: '#991b1b', flex: 1 }}>
            ⚠️ Confirm delete <strong>{confirmDelete.first_name} {confirmDelete.last_name}</strong>?
            This will permanently remove all associated procedures and data.
          </span>
          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(confirmDelete)}>Delete</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
        </div>
      )}

      <div className="card">
        <div className="table-container" style={{ border: 'none' }}>
          {loading ? (
            <div className="empty-state">
              <div className="empty-state-icon">⏳</div>
              <div>Loading patients...</div>
            </div>
          ) : patients.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">No patients found</div>
              <div className="empty-state-desc">
                {search ? 'Try adjusting your search terms.' : 'Register your first patient to get started.'}
              </div>
              {!search && (
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('patient-new')}>
                  ➕ Register First Patient
                </button>
              )}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>MRN</th>
                  <th>Patient Name</th>
                  <th>Date of Birth</th>
                  <th>Age</th>
                  <th>Sex</th>
                  <th>Procedures</th>
                  <th>Last Procedure</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.patient_id}>
                    <td>
                      <span className="badge badge-gray">{p.mrn}</span>
                    </td>
                    <td>
                      <span
                        className="table-link"
                        onClick={() => navigate('patient-edit', { patientId: p.patient_id })}
                      >
                        {p.last_name}, {p.first_name}
                      </span>
                    </td>
                    <td>{p.date_of_birth ? new Date(p.date_of_birth + 'T00:00:00').toLocaleDateString() : '—'}</td>
                    <td>{AGE_FROM_DOB(p.date_of_birth)}</td>
                    <td>
                      <span className={`badge ${p.sex === 'Male' ? 'badge-info' : p.sex === 'Female' ? 'badge-purple' : 'badge-gray'}`}>
                        {p.sex || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-gray">{p.procedure_count || 0}</span>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.82rem' }}>
                      {p.last_procedure_date ? new Date(p.last_procedure_date + 'T00:00:00').toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div className="btn-group">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate('patient-edit', { patientId: p.patient_id })}
                          title="Edit patient"
                        >✏️</button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate('procedure-new', { patientId: p.patient_id })}
                          title="Add procedure"
                        >🔬</button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(p)}
                          title="Delete patient"
                          style={{ color: '#ef4444' }}
                        >🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
