import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../App';

export default function Search() {
  const { navigate } = useApp();
  const [tab, setTab] = useState('patients');
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [procFilters, setProcFilters] = useState({
    search: '', procedureType: '', surgeonId: '', dateFrom: '', dateTo: '', urgency: ''
  });
  const [procedures, setProcedures] = useState([]);
  const [surgeons, setSurgeons] = useState([]);
  const [procedureTypes, setProcedureTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSurgeons();
    window.electronAPI.getProcedureTypes().then(r => { if (r.success) setProcedureTypes(r.data); });
  }, []);

  async function loadSurgeons() {
    const res = await window.electronAPI.getSurgeons();
    if (res.success) setSurgeons(res.data);
  }

  const searchPatients = useCallback(async () => {
    setLoading(true);
    const res = await window.electronAPI.getPatients({ search: patientSearch });
    if (res.success) setPatients(res.data);
    setLoading(false);
  }, [patientSearch]);

  const searchProcedures = useCallback(async () => {
    setLoading(true);
    const res = await window.electronAPI.getProcedures(procFilters);
    if (res.success) setProcedures(res.data);
    setLoading(false);
  }, [procFilters]);

  useEffect(() => {
    if (tab === 'patients') {
      const t = setTimeout(searchPatients, 300);
      return () => clearTimeout(t);
    }
  }, [tab, searchPatients]);

  useEffect(() => {
    if (tab === 'procedures') {
      const t = setTimeout(searchProcedures, 300);
      return () => clearTimeout(t);
    }
  }, [tab, searchProcedures]);

  function calcAge(dob) {
    if (!dob) return '—';
    return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  }

  return (
    <div className="page-wide" style={{ padding: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Search Registry</h1>
          <p className="page-subtitle">Search and filter patients and procedures</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'patients' ? 'active' : ''}`} onClick={() => setTab('patients')}>
          👥 Patient Search
        </button>
        <button className={`tab-btn ${tab === 'procedures' ? 'active' : ''}`} onClick={() => setTab('procedures')}>
          🔬 Procedure Search
        </button>
      </div>

      {tab === 'patients' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '14px 20px' }}>
              <div className="search-bar" style={{ maxWidth: 500 }}>
                <span className="search-bar-icon">🔍</span>
                <input
                  className="form-input"
                  style={{ paddingLeft: 32 }}
                  type="text"
                  placeholder="Search by patient name or MRN..."
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Results</div>
              <span className="badge badge-info">{patients.length} patient{patients.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              {loading ? (
                <div className="empty-state"><div>Searching...</div></div>
              ) : patients.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🔍</div>
                  <div className="empty-state-title">No patients found</div>
                  <div className="empty-state-desc">Try a different search term</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>MRN</th>
                      <th>Name</th>
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
                        <td><span className="badge badge-gray">{p.mrn}</span></td>
                        <td>
                          <span className="table-link" onClick={() => navigate('patient-edit', { patientId: p.patient_id })}>
                            {p.last_name}, {p.first_name}
                          </span>
                        </td>
                        <td>{p.date_of_birth ? new Date(p.date_of_birth + 'T00:00:00').toLocaleDateString() : '—'}</td>
                        <td>{calcAge(p.date_of_birth)}</td>
                        <td>
                          <span className={`badge badge-${p.sex === 'Male' ? 'info' : 'purple'}`}>{p.sex || '—'}</span>
                        </td>
                        <td><span className="badge badge-gray">{p.procedure_count || 0}</span></td>
                        <td style={{ color: '#64748b', fontSize: '0.82rem' }}>
                          {p.last_procedure_date ? new Date(p.last_procedure_date + 'T00:00:00').toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <div className="btn-group">
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate('patient-edit', { patientId: p.patient_id })}>
                              👤 View
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate('procedure-new', { patientId: p.patient_id })}>
                              🔬 Add Proc
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'procedures' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '14px 20px' }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: '1', minWidth: 200 }}>
                  <label className="form-label">Search</label>
                  <div className="search-bar">
                    <span className="search-bar-icon">🔍</span>
                    <input
                      className="form-input"
                      style={{ paddingLeft: 32 }}
                      placeholder="Patient name or MRN..."
                      value={procFilters.search}
                      onChange={e => setProcFilters(f => ({ ...f, search: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="form-group" style={{ minWidth: 180 }}>
                  <label className="form-label">Procedure Type</label>
                  <select className="form-select" value={procFilters.procedureType}
                    onChange={e => setProcFilters(f => ({ ...f, procedureType: e.target.value }))}>
                    <option value="">All Types</option>
                    {procedureTypes.filter(t => t.active).map(t => <option key={t.type_id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ minWidth: 150 }}>
                  <label className="form-label">Surgeon</label>
                  <select className="form-select" value={procFilters.surgeonId}
                    onChange={e => setProcFilters(f => ({ ...f, surgeonId: e.target.value }))}>
                    <option value="">All Surgeons</option>
                    {surgeons.map(s => <option key={s.surgeon_id} value={s.surgeon_id}>Dr. {s.first_name} {s.last_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date From</label>
                  <input className="form-input" type="date" value={procFilters.dateFrom}
                    onChange={e => setProcFilters(f => ({ ...f, dateFrom: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Date To</label>
                  <input className="form-input" type="date" value={procFilters.dateTo}
                    onChange={e => setProcFilters(f => ({ ...f, dateTo: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Urgency</label>
                  <select className="form-select" value={procFilters.urgency}
                    onChange={e => setProcFilters(f => ({ ...f, urgency: e.target.value }))}>
                    <option value="">All</option>
                    <option>Elective</option><option>Urgent</option><option>Emergency</option>
                  </select>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ marginBottom: 2 }}
                  onClick={() => setProcFilters({ search:'',procedureType:'',surgeonId:'',dateFrom:'',dateTo:'',urgency:'' })}>
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Procedures</div>
              <span className="badge badge-info">{procedures.length} result{procedures.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              {loading ? (
                <div className="empty-state"><div>Searching...</div></div>
              ) : procedures.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🔬</div>
                  <div className="empty-state-title">No procedures found</div>
                  <div className="empty-state-desc">Adjust filters to see results</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Patient</th>
                      <th>MRN</th>
                      <th>Procedure</th>
                      <th>Surgeon</th>
                      <th>Urgency</th>
                      <th>Stroke</th>
                      <th>MI</th>
                      <th>Mortality</th>
                      <th>LOS</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {procedures.map(pr => (
                      <tr key={pr.procedure_id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                          {pr.procedure_date ? new Date(pr.procedure_date + 'T00:00:00').toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <span className="table-link" onClick={() => navigate('patient-edit', { patientId: pr.patient_id })}>
                            {pr.patient_name}
                          </span>
                        </td>
                        <td><span className="badge badge-gray">{pr.mrn}</span></td>
                        <td style={{ maxWidth: 180 }}>
                          <span className="table-link" onClick={() => navigate('procedure-edit', { procedureId: pr.procedure_id })}>
                            {pr.procedure_type}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{pr.surgeon_name || '—'}</td>
                        <td>
                          <span className={`badge badge-${pr.urgency === 'Emergency' ? 'danger' : pr.urgency === 'Urgent' ? 'warning' : 'success'}`}>
                            {pr.urgency || '—'}
                          </span>
                        </td>
                        <td>
                          {pr.stroke !== null ? (
                            <span className={`badge badge-${pr.stroke ? 'danger' : 'gray'}`}>{pr.stroke ? 'Yes' : 'No'}</span>
                          ) : <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td>
                          {pr.myocardial_infarction !== null ? (
                            <span className={`badge badge-${pr.myocardial_infarction ? 'danger' : 'gray'}`}>{pr.myocardial_infarction ? 'Yes' : 'No'}</span>
                          ) : <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td>
                          {pr.death_30_day !== null ? (
                            <span className={`badge badge-${pr.death_30_day ? 'danger' : 'gray'}`}>{pr.death_30_day ? 'Yes' : 'No'}</span>
                          ) : <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>{pr.hospital_days != null ? `${pr.hospital_days}d` : '—'}</td>
                        <td>
                          <div className="btn-group">
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate('procedure-edit', { procedureId: pr.procedure_id })}>✏️</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate('followup', { procedureId: pr.procedure_id })}>📅</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
