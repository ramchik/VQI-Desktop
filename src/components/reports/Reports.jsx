import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const REPORT_TYPES = [
  { id: 'baseline_characteristics', label: 'Table 1 — Baseline Characteristics', icon: '👥' },
  { id: 'procedural_outcomes', label: 'Table 2 — Procedural Outcomes', icon: '⚕️' },
  { id: 'surgeon_volume', label: 'Surgeon Volume & Outcomes', icon: '👨‍⚕️' },
  { id: 'carotid_outcomes', label: 'Carotid Surgery Outcomes', icon: '🧠' },
  { id: 'aaa_outcomes', label: 'AAA / EVAR Outcomes', icon: '🫀' },
  { id: 'pad_outcomes', label: 'PAD / Bypass Outcomes', icon: '🦵' },
  { id: 'followup_summary', label: 'Follow-up Summary', icon: '📅' },
];

const PROCEDURE_TYPES = [
  '', 'Carotid Endarterectomy', 'Carotid Artery Stenting', 'EVAR (Endovascular Aortic Repair)',
  'TEVAR (Thoracic EVAR)', 'Open AAA Repair', 'Peripheral Bypass',
  'Peripheral Angioplasty/Stenting', 'Dialysis Access Creation'
];

export default function Reports() {
  const { notify } = useApp();
  const [reportType, setReportType] = useState('baseline_characteristics');
  const [data, setData] = useState(null);
  const [surgeons, setSurgeons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '', dateTo: '', surgeonId: '', procedureType: ''
  });

  useEffect(() => {
    loadSurgeons();
  }, []);

  useEffect(() => {
    loadReport();
  }, [reportType]);

  async function loadSurgeons() {
    const res = await window.electronAPI.getSurgeons();
    if (res.success) setSurgeons(res.data);
  }

  async function loadReport() {
    setLoading(true);
    setData(null);
    try {
      const res = await window.electronAPI.getReportData(reportType, filters);
      if (res.success) setData(res.data);
      else notify(res.error || 'Failed to load report', 'error');
    } finally {
      setLoading(false);
    }
  }

  function objToCSV(rows) {
    if (!rows || rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const csvRows = [headers.join(',')];
    rows.forEach(row => {
      csvRows.push(headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(','));
    });
    return csvRows.join('\n');
  }

  async function handleExportCSV() {
    if (!data) return;
    const rows = Array.isArray(data) ? data : [data];
    const csv = objToCSV(rows);
    const reportLabel = REPORT_TYPES.find(r => r.id === reportType)?.label || reportType;
    const filename = `vqi_${reportType}_${new Date().toISOString().slice(0,10)}.csv`;
    const res = await window.electronAPI.saveFile(csv, filename);
    if (res.success) notify(`Report exported: ${res.path}`);
    else if (!res.canceled) notify('Export failed', 'error');
  }

  const currentReport = REPORT_TYPES.find(r => r.id === reportType);

  return (
    <div className="page-wide" style={{ padding: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Export</h1>
          <p className="page-subtitle">Generate publishable research tables and quality reports</p>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={loadReport} disabled={loading}>⟳ Refresh</button>
          <button className="btn btn-success" onClick={handleExportCSV} disabled={!data || loading}>
            📥 Export CSV
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
        {/* Report Selector */}
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Report Type</div>
            </div>
            <div style={{ padding: '8px 0' }}>
              {REPORT_TYPES.map(r => (
                <div key={r.id}
                  onClick={() => setReportType(r.id)}
                  style={{
                    padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    background: reportType === r.id ? '#dbeafe' : 'transparent',
                    color: reportType === r.id ? '#1d4ed8' : '#374151',
                    borderLeft: `3px solid ${reportType === r.id ? '#2563eb' : 'transparent'}`,
                    fontSize: '0.85rem', fontWeight: reportType === r.id ? 600 : 400
                  }}>
                  <span>{r.icon}</span> {r.label}
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div className="card-title">Filters</div>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Date From</label>
                <input className="form-input" type="date" value={filters.dateFrom}
                  onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Date To</label>
                <input className="form-input" type="date" value={filters.dateTo}
                  onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Surgeon</label>
                <select className="form-select" value={filters.surgeonId}
                  onChange={e => setFilters(f => ({ ...f, surgeonId: e.target.value }))}>
                  <option value="">All Surgeons</option>
                  {surgeons.map(s => <option key={s.surgeon_id} value={s.surgeon_id}>
                    Dr. {s.first_name} {s.last_name}
                  </option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Procedure Type</label>
                <select className="form-select" value={filters.procedureType}
                  onChange={e => setFilters(f => ({ ...f, procedureType: e.target.value }))}>
                  {PROCEDURE_TYPES.map(t => <option key={t} value={t}>{t || 'All Types'}</option>)}
                </select>
              </div>
              <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                onClick={loadReport} disabled={loading}>
                {loading ? '⏳ Loading...' : '📊 Apply Filters'}
              </button>
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { setFilters({ dateFrom:'',dateTo:'',surgeonId:'',procedureType:'' }); }}>
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">{currentReport?.icon} {currentReport?.label}</div>
              {data && (
                <span className="badge badge-info">
                  {Array.isArray(data) ? `${data.length} rows` : '1 row'}
                </span>
              )}
            </div>
            <div className="card-body">
              {loading ? (
                <div className="empty-state">
                  <div className="empty-state-icon">⏳</div>
                  <div>Loading report...</div>
                </div>
              ) : !data ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <div>Select a report type and click Apply</div>
                </div>
              ) : reportType === 'baseline_characteristics' ? (
                <BaselineCharacteristicsReport data={data} />
              ) : (
                <GenericTableReport data={data} reportType={reportType} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BaselineCharacteristicsReport({ data }) {
  if (!data || data.total_patients === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">👥</div>
        <div className="empty-state-title">No patient data yet</div>
        <div className="empty-state-desc">Register patients to generate this report</div>
      </div>
    );
  }

  const n = data.total_patients;
  const pct = (count) => count ? `${count} (${((count / n) * 100).toFixed(1)}%)` : '0 (0%)';

  const rows = [
    { label: 'Total Patients', value: n, type: 'header' },
    { label: 'Age (mean ± SD)', value: data.mean_age ? `${data.mean_age} years` : '—' },
    { label: 'Male Sex', value: pct(data.male_count) },
    { label: '', value: '', type: 'divider' },
    { label: 'COMORBIDITIES', value: '', type: 'section' },
    { label: 'Diabetes', value: pct(data.diabetes_count) },
    { label: 'Hypertension', value: pct(data.hypertension_count) },
    { label: 'Current Smoker', value: pct(data.current_smokers) },
    { label: 'Coronary Artery Disease', value: pct(data.cad_count) },
    { label: 'COPD', value: pct(data.copd_count) },
    { label: 'Dialysis-Dependent', value: pct(data.dialysis_count) },
    { label: 'Prior Stroke', value: pct(data.prior_stroke_count) },
  ];

  return (
    <div>
      <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 16 }}>
        Table 1. Baseline Characteristics of {n} Registered Patients
      </p>
      <table>
        <thead>
          <tr>
            <th style={{ width: '60%' }}>Variable</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            if (row.type === 'divider') return <tr key={i}><td colSpan={2} style={{ padding: 4 }}></td></tr>;
            if (row.type === 'section') return (
              <tr key={i} style={{ background: '#f8fafc' }}>
                <td colSpan={2} style={{ fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2563eb', padding: '10px 14px 6px' }}>
                  {row.label}
                </td>
              </tr>
            );
            return (
              <tr key={i}>
                <td style={{ fontWeight: row.type === 'header' ? 700 : 400 }}>{row.label}</td>
                <td style={{ fontWeight: row.type === 'header' ? 700 : 400 }}>{row.value}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GenericTableReport({ data, reportType }) {
  const rows = Array.isArray(data) ? data : (data ? [data] : []);

  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">No data for this report</div>
        <div className="empty-state-desc">Add procedures matching the selected filters to generate this report</div>
      </div>
    );
  }

  const headers = Object.keys(rows[0]);

  // Format column headers for display
  function formatHeader(h) {
    return h.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // Format cell values
  function formatValue(val) {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
      if (Number.isInteger(val)) return val.toLocaleString();
      return val.toFixed(2);
    }
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(val + 'T00:00:00').toLocaleDateString();
    }
    return String(val);
  }

  function badgeForField(header, val) {
    if (header.includes('rate') || header.includes('mortality') || header.includes('stroke')) {
      const n = parseFloat(val);
      if (!isNaN(n)) {
        const color = n === 0 ? 'success' : n < 3 ? 'warning' : 'danger';
        return <span className={`badge badge-${color}`}>{n.toFixed(2)}%</span>;
      }
    }
    if (header === 'urgency') {
      return <span className={`badge badge-${val === 'Emergency' ? 'danger' : val === 'Urgent' ? 'warning' : 'success'}`}>{val}</span>;
    }
    if (typeof val === 'number' && (val === 0 || val === 1) && (header.includes('stroke') || header.includes('death') || header.includes('mi') || header.includes('amputation') || header.includes('reintervention'))) {
      return <span className={`badge badge-${val ? 'danger' : 'success'}`}>{val ? 'Yes' : 'No'}</span>;
    }
    return null;
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              {headers.map(h => <th key={h} title={h}>{formatHeader(h)}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {headers.map(h => {
                  const badge = badgeForField(h, row[h]);
                  return (
                    <td key={h}>
                      {badge || <span style={{ fontSize: '0.85rem' }}>{formatValue(row[h])}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 12 }}>
        {rows.length} record{rows.length !== 1 ? 's' : ''} · Use Export CSV to download for statistical analysis in R, SPSS, or Stata
      </p>
    </div>
  );
}
