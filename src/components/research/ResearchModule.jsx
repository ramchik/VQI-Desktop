import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';

const PROCEDURE_TYPES = [
  'Carotid Endarterectomy','Carotid Artery Stenting','TCAR (Transcarotid Artery Revascularization)',
  'EVAR (Endovascular Aortic Repair)','TEVAR (Thoracic EVAR)','Open AAA Repair',
  'Open Thoracoabdominal Aortic Repair','Peripheral Bypass','Peripheral Angioplasty/Stenting',
  'Visceral/Renal Revascularization','Lower Extremity Amputation','Upper Extremity Amputation',
  'Dialysis Access Creation','Dialysis Access Revision','Thrombectomy/Embolectomy',
  'Varicose Vein Ablation (EVLA/RFA)','Phlebectomy','Sclerotherapy','Venous Stenting',
  'Deep Venous Reconstruction','Fasciotomy','Other Vascular Procedure'
];

const EMPTY_FILTERS = {
  sex: '', minAge: '', maxAge: '', diabetes: '', hypertension: '', copd: '',
  heart_failure: '', dialysis: '', prior_stroke: '', smoking: '',
  procedure_type: '', procedure_date_from: '', procedure_date_to: '', surgeon_id: ''
};

export default function ResearchModule() {
  const { navigate } = useApp();
  const [tab, setTab] = useState('cohort');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [surgeons, setSurgeons] = useState([]);
  const [cohort, setCohort] = useState(null);
  const [table1, setTable1] = useState(null);
  const [timeToEvent, setTimeToEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());

  useEffect(() => {
    window.electronAPI.getSurgeons().then(r => { if (r.success) setSurgeons(r.data); });
  }, []);

  function setF(field, val) { setFilters(f => ({ ...f, [field]: val })); }

  async function runQuery() {
    setLoading(true);
    setCohort(null); setTable1(null); setTimeToEvent(null); setSelectedRows(new Set());
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '' && v !== null)
      );
      const res = await window.electronAPI.getCohort(cleanFilters);
      if (res.success) {
        setCohort(res.data);
        setSelectedRows(new Set(res.data.map(p => p.patient_id)));
      }
    } finally { setLoading(false); }
  }

  async function generateTable1() {
    const ids = [...selectedRows];
    if (!ids.length) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.getTable1Stats(ids);
      if (res.success) { setTable1(res.data); setTab('table1'); }
    } finally { setLoading(false); }
  }

  async function generateTTE() {
    const ids = [...selectedRows];
    if (!ids.length) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.getTimeToEvent(ids);
      if (res.success) { setTimeToEvent(res.data); setTab('tte'); }
    } finally { setLoading(false); }
  }

  function toggleRow(id) {
    setSelectedRows(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    if (!cohort) return;
    if (selectedRows.size === cohort.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(cohort.map(p => p.patient_id)));
  }

  function calcAge(dob) {
    if (!dob) return '—';
    const today = new Date(), b = new Date(dob);
    return today.getFullYear() - b.getFullYear() -
      (today < new Date(today.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
  }

  function calcMFI5(p) {
    return (p.diabetes ? 1 : 0) + (p.copd ? 1 : 0) + (p.heart_failure ? 1 : 0) +
      (p.hypertension ? 1 : 0) +
      (p.functional_status && p.functional_status !== 'Independent' ? 1 : 0);
  }

  function exportCohortCSV() {
    if (!cohort) return;
    const rows = cohort.filter(p => selectedRows.has(p.patient_id));
    const headers = ['patient_id','mrn','last_name','first_name','date_of_birth','age','sex','race',
      'hypertension','diabetes','copd','heart_failure','prior_stroke','dialysis',
      'smoking_status','peripheral_artery_disease','functional_status','mfi5',
      'procedure_count','last_procedure_date'];
    const csv = [headers.join(','),
      ...rows.map(p => [
        p.patient_id, p.mrn, p.last_name, p.first_name, p.date_of_birth, calcAge(p.date_of_birth),
        p.sex, p.race || '',
        p.hypertension || 0, p.diabetes || 0, p.copd || 0, p.heart_failure || 0,
        p.prior_stroke || 0, p.dialysis || 0, p.smoking_status || '',
        p.peripheral_artery_disease || 0, p.functional_status || '', calcMFI5(p),
        p.procedure_count || 0, p.last_procedure_date || ''
      ].join(','))
    ].join('\n');
    window.electronAPI.saveFile(csv, 'cohort_export.csv', [{ name: 'CSV Files', extensions: ['csv'] }]);
  }

  function exportTTEcsv() {
    if (!timeToEvent) return;
    const headers = ['patient_id','mrn','patient_name','procedure_id','procedure_type',
      'procedure_date','days_to_event','event_reintervention','event_death',
      'reintervention_date','death_date','last_followup_date'];
    const csv = [headers.join(','),
      ...timeToEvent.map(r => [
        r.patient_id, r.mrn, `"${r.patient_name}"`, r.procedure_id, `"${r.procedure_type}"`,
        r.procedure_date, r.days_to_event ?? '',
        r.event_reintervention || 0, r.event_death || 0,
        r.reintervention_date || '', r.death_date || '', r.last_followup_date || ''
      ].join(','))
    ].join('\n');
    window.electronAPI.saveFile(csv, 'time_to_event.csv', [{ name: 'CSV Files', extensions: ['csv'] }]);
  }

  return (
    <div className="page-wide" style={{ padding: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">🔬 Research Workspace</h1>
          <p className="page-subtitle">Cohort builder · Table 1 · Time-to-event analysis</p>
        </div>
        {cohort && (
          <div className="btn-group">
            <span style={{ color: '#94a3b8', alignSelf: 'center', fontSize: 13 }}>
              {selectedRows.size} / {cohort.length} selected
            </span>
            <button className="btn btn-secondary" onClick={generateTable1} disabled={!selectedRows.size || loading}>
              📋 Table 1
            </button>
            <button className="btn btn-secondary" onClick={generateTTE} disabled={!selectedRows.size || loading}>
              📈 Time-to-Event
            </button>
            <button className="btn btn-secondary" onClick={exportCohortCSV} disabled={!selectedRows.size}>
              ⬇ Export CSV
            </button>
          </div>
        )}
      </div>

      <div className="tabs">
        {[
          { id: 'cohort', label: '🔍 Cohort Builder' },
          ...(table1 ? [{ id: 'table1', label: '📋 Table 1' }] : []),
          ...(timeToEvent ? [{ id: 'tte', label: '📈 Time-to-Event' }] : []),
        ].map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'cohort' && (
        <>
          <CohortFilters filters={filters} setF={setF} surgeons={surgeons}
            onReset={() => setFilters(EMPTY_FILTERS)} onRun={runQuery} loading={loading} />
          {cohort !== null && (
            <CohortResults cohort={cohort} selectedRows={selectedRows}
              toggleRow={toggleRow} toggleAll={toggleAll}
              calcAge={calcAge} calcMFI5={calcMFI5}
              onNavigatePatient={id => navigate('patient-edit', { patientId: id })} />
          )}
        </>
      )}

      {tab === 'table1' && table1 && <Table1View stats={table1} />}
      {tab === 'tte' && timeToEvent && <TimeToEventView data={timeToEvent} onExport={exportTTEcsv} />}
    </div>
  );
}

function CohortFilters({ filters, setF, surgeons, onReset, onRun, loading }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <div className="card-title">Filter Criteria</div>
        <button className="btn btn-secondary btn-sm" onClick={onReset}>Reset</button>
      </div>
      <div className="card-body">
        <div className="form-grid form-grid-3">
          <div className="section-header">Demographics</div>
          <div className="form-group">
            <label className="form-label">Sex</label>
            <select className="form-select" value={filters.sex} onChange={e => setF('sex', e.target.value)}>
              <option value="">Any</option>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Min Age</label>
            <input className="form-input" type="number" value={filters.minAge}
              onChange={e => setF('minAge', e.target.value)} placeholder="e.g. 65" />
          </div>
          <div className="form-group">
            <label className="form-label">Max Age</label>
            <input className="form-input" type="number" value={filters.maxAge}
              onChange={e => setF('maxAge', e.target.value)} placeholder="e.g. 85" />
          </div>

          <div className="section-header">Comorbidities</div>
          {[
            ['diabetes', 'Diabetes'], ['hypertension', 'Hypertension'], ['copd', 'COPD'],
            ['heart_failure', 'Heart Failure'], ['dialysis', 'Dialysis'], ['prior_stroke', 'Prior Stroke']
          ].map(([field, label]) => (
            <div className="form-group" key={field}>
              <label className="form-label">{label}</label>
              <select className="form-select" value={filters[field]} onChange={e => setF(field, e.target.value)}>
                <option value="">Any</option>
                <option value="1">Yes</option>
              </select>
            </div>
          ))}
          <div className="form-group">
            <label className="form-label">Smoking Status</label>
            <select className="form-select" value={filters.smoking} onChange={e => setF('smoking', e.target.value)}>
              <option value="">Any</option>
              <option>Never</option><option>Former</option><option>Current</option>
            </select>
          </div>

          <div className="section-header">Procedure</div>
          <div className="form-group">
            <label className="form-label">Procedure Type</label>
            <select className="form-select" value={filters.procedure_type}
              onChange={e => setF('procedure_type', e.target.value)}>
              <option value="">Any</option>
              {PROCEDURE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date From</label>
            <input className="form-input" type="date" value={filters.procedure_date_from}
              onChange={e => setF('procedure_date_from', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Date To</label>
            <input className="form-input" type="date" value={filters.procedure_date_to}
              onChange={e => setF('procedure_date_to', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Surgeon</label>
            <select className="form-select" value={filters.surgeon_id}
              onChange={e => setF('surgeon_id', e.target.value)}>
              <option value="">Any</option>
              {surgeons.map(s => <option key={s.surgeon_id} value={s.surgeon_id}>Dr. {s.first_name} {s.last_name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onRun} disabled={loading}>
            {loading ? <><span className="spinner-sm"></span> Running...</> : '🔍 Run Query'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CohortResults({ cohort, selectedRows, toggleRow, toggleAll, calcAge, calcMFI5, onNavigatePatient }) {
  if (cohort.length === 0) {
    return (
      <div className="card">
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">No patients match these criteria</div>
          <div className="empty-state-desc">Try loosening the filter criteria above</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Cohort Results ({cohort.length} patients)</div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={selectedRows.size === cohort.length && cohort.length > 0}
                onChange={toggleAll} /></th>
              <th>MRN</th><th>Patient</th><th>Age</th><th>Sex</th>
              <th>DM</th><th>HTN</th><th>CAD</th><th>COPD</th><th>CKD</th>
              <th>mFI-5</th><th>Procedures</th><th>Last Procedure</th>
            </tr>
          </thead>
          <tbody>
            {cohort.map(p => {
              const mfi = calcMFI5(p);
              const mfiColor = mfi >= 3 ? '#ef4444' : mfi >= 2 ? '#f59e0b' : '#10b981';
              return (
                <tr key={p.patient_id} className={selectedRows.has(p.patient_id) ? 'selected-row' : ''}>
                  <td><input type="checkbox" checked={selectedRows.has(p.patient_id)}
                    onChange={() => toggleRow(p.patient_id)} /></td>
                  <td><span className="badge badge-secondary">{p.mrn}</span></td>
                  <td>
                    <span className="link-text" onClick={() => onNavigatePatient(p.patient_id)}>
                      {p.last_name}, {p.first_name}
                    </span>
                  </td>
                  <td>{calcAge(p.date_of_birth)}</td>
                  <td>{p.sex || '—'}</td>
                  <td>{p.diabetes ? <span className="badge badge-danger">Yes</span> : '—'}</td>
                  <td>{p.hypertension ? <span className="badge badge-warning">Yes</span> : '—'}</td>
                  <td>{p.coronary_artery_disease ? <span className="badge badge-warning">Yes</span> : '—'}</td>
                  <td>{p.copd ? <span className="badge badge-warning">Yes</span> : '—'}</td>
                  <td>{p.ckd_stage ? `Stage ${p.ckd_stage}` : '—'}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: mfiColor }}>{mfi}/5</span>
                  </td>
                  <td>{p.procedure_count || 0}</td>
                  <td>{p.last_procedure_date || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Table1View({ stats }) {
  function fmt(s, type = 'mean') {
    if (!s || s.n === 0) return '—';
    if (type === 'mean') return `${s.mean} ± ${s.sd}`;
    if (type === 'median') return `${s.median} [${s.iqr?.[0]}–${s.iqr?.[1]}]`;
    return '—';
  }
  function fmtPct(s) {
    if (!s) return '—';
    return `${s.n} (${s.pct}%)`;
  }
  function fmtCat(obj) {
    if (!obj) return '—';
    return Object.entries(obj).map(([k, v]) => `${k}: ${v.n} (${v.pct}%)`).join('; ');
  }

  const rows = [
    ['N', stats.n, ''],
    ['— Demographics', '', ''],
    ['Age (years)', fmt(stats.age, 'mean'), 'Mean ± SD'],
    ['Age (years)', fmt(stats.age, 'median'), 'Median [IQR]'],
    ['BMI (kg/m²)', fmt(stats.bmi, 'mean'), 'Mean ± SD'],
    ['Sex', fmtCat(stats.sex), 'n (%)'],
    ['Race', fmtCat(stats.race), 'n (%)'],
    ['Smoking Status', fmtCat(stats.smoking), 'n (%)'],
    ['— Comorbidities', '', ''],
    ['Hypertension', fmtPct(stats.hypertension), 'n (%)'],
    ['Diabetes Mellitus', fmtPct(stats.diabetes), 'n (%)'],
    ['HbA1c (%)', fmt(stats.hba1c, 'mean'), 'Mean ± SD'],
    ['Hyperlipidemia', fmtPct(stats.hyperlipidemia), 'n (%)'],
    ['Coronary Artery Disease', fmtPct(stats.cad), 'n (%)'],
    ['Heart Failure', fmtPct(stats.heart_failure), 'n (%)'],
    ['COPD', fmtPct(stats.copd), 'n (%)'],
    ['Prior Stroke / TIA', fmtPct(stats.prior_stroke), 'n (%)'],
    ['CKD Stage', fmtCat(stats.ckd), 'n (%)'],
    ['Dialysis', fmtPct(stats.dialysis), 'n (%)'],
    ['Atrial Fibrillation', fmtPct(stats.afib), 'n (%)'],
    ['Peripheral Artery Disease', fmtPct(stats.pad), 'n (%)'],
    ['— Medications', '', ''],
    ['Aspirin', fmtPct(stats.aspirin), 'n (%)'],
    ['Statin', fmtPct(stats.statin), 'n (%)'],
    ['Clopidogrel', fmtPct(stats.clopidogrel), 'n (%)'],
    ['Beta-blocker', fmtPct(stats.beta_blocker), 'n (%)'],
    ['Anticoagulant', fmtPct(stats.anticoagulant), 'n (%)'],
  ];

  function exportTable1() {
    const csv = ['Variable,Value,Statistic',
      ...rows.map(([v, val, stat]) => `"${v}","${val}","${stat}"`)
    ].join('\n');
    window.electronAPI.saveFile(csv, 'Table1_demographics.csv', [{ name: 'CSV Files', extensions: ['csv'] }]);
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Table 1 — Baseline Characteristics (n={stats.n})</div>
        <button className="btn btn-secondary btn-sm" onClick={exportTable1}>⬇ Export CSV</button>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr><th style={{ width: '50%' }}>Variable</th><th>Value</th><th>Statistic</th></tr>
          </thead>
          <tbody>
            {rows.map(([v, val, stat], i) => {
              const isHeader = v.startsWith('—');
              if (isHeader) {
                return (
                  <tr key={i}>
                    <td colSpan={3} style={{ fontWeight: 700, color: '#60a5fa', paddingTop: 12, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {v.replace('— ', '')}
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={i}>
                  <td style={{ paddingLeft: 16 }}>{v}</td>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{val}</td>
                  <td style={{ color: '#64748b', fontSize: 12 }}>{stat}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '8px 16px', fontSize: 12, color: '#64748b' }}>
        Continuous variables: Mean ± SD or Median [IQR] · Categorical: n (%)
        · Ready for direct use as Table 1 in publications.
      </div>
    </div>
  );
}

function TimeToEventView({ data, onExport }) {
  const eventCount = data.filter(d => d.event_reintervention || d.event_death).length;
  const medianDays = (() => {
    const days = data.map(d => d.days_to_event).filter(d => d != null).sort((a, b) => a - b);
    if (!days.length) return null;
    const mid = Math.floor(days.length / 2);
    return days.length % 2 === 0 ? ((days[mid - 1] + days[mid]) / 2).toFixed(0) : days[mid];
  })();

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'Total Procedures', value: data.length, color: '#2563eb' },
          { label: 'Events (Reintervention / Death)', value: eventCount, color: '#ef4444' },
          { label: 'Event Rate', value: data.length ? `${((eventCount / data.length) * 100).toFixed(1)}%` : '—', color: '#f59e0b' },
          { label: 'Median Follow-up', value: medianDays ? `${medianDays}d` : '—', color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Time-to-Event Data ({data.length} procedures)</div>
          <button className="btn btn-secondary btn-sm" onClick={onExport}>⬇ Export CSV (R-ready)</button>
        </div>
        <div style={{ padding: '8px 16px 0', fontSize: 12, color: '#64748b' }}>
          Export columns: <code>days_to_event</code>, <code>event_reintervention</code>, <code>event_death</code>
          — import directly into R <code>survival::Surv()</code> or GraphPad Prism for Kaplan-Meier curves.
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th><th>MRN</th><th>Procedure</th><th>Date</th>
                <th>Days to Event</th><th>Reintervention</th><th>Death</th><th>Last Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {data.map(d => (
                <tr key={d.procedure_id}>
                  <td>{d.patient_name}</td>
                  <td><span className="badge badge-secondary">{d.mrn}</span></td>
                  <td style={{ fontSize: 12 }}>{d.procedure_type}</td>
                  <td>{d.procedure_date}</td>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {d.days_to_event ?? '—'}
                  </td>
                  <td>{d.event_reintervention ?
                    <span className="badge badge-danger">Yes</span> :
                    <span style={{ color: '#10b981' }}>No</span>}
                  </td>
                  <td>{d.event_death ?
                    <span className="badge badge-danger">Yes</span> :
                    <span style={{ color: '#10b981' }}>No</span>}
                  </td>
                  <td>{d.last_followup_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
