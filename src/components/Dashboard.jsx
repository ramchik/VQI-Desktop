import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function Dashboard() {
  const { navigate } = useApp();
  const [stats, setStats] = useState(null);
  const [redFlags, setRedFlags] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const [statsRes, flagsRes] = await Promise.all([
        window.electronAPI.getDashboardStats(),
        window.electronAPI.getRedFlags()
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (flagsRes.success) setRedFlags(flagsRes.data);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div>Loading dashboard...</div>
      </div>
    </div>
  );

  const monthlyData = buildMonthlyChart(stats?.monthlyVolume || []);

  return (
    <div className="page-wide" style={{ padding: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Vascular Surgery Registry Overview — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary btn-sm" onClick={loadStats}>⟳ Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('patient-new')}>+ New Patient</button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderTop: '4px solid #2563eb' }}>
          <div className="stat-label">Total Patients</div>
          <div className="stat-value">{(stats?.totalPatients || 0).toLocaleString()}</div>
          <div className="stat-unit">registered patients</div>
          <span className="stat-badge stat-badge-info">Registry</span>
        </div>
        <div className="stat-card" style={{ borderTop: '4px solid #8b5cf6' }}>
          <div className="stat-label">Total Procedures</div>
          <div className="stat-value">{(stats?.totalProcedures || 0).toLocaleString()}</div>
          <div className="stat-unit">recorded procedures</div>
          <span className="stat-badge stat-badge-info">All types</span>
        </div>
        <div className="stat-card" style={{ borderTop: `4px solid ${rateColor(stats?.strokeRate, 3)}` }}>
          <div className="stat-label">30-Day Stroke Rate</div>
          <div className="stat-value" style={{ color: rateColor(stats?.strokeRate, 3) }}>
            {stats?.strokeRate ?? '—'}%
          </div>
          <div className="stat-unit">of all procedures</div>
          <span className={`stat-badge stat-badge-${rateLevel(stats?.strokeRate, 3)}`}>
            Target &lt;3%
          </span>
        </div>
        <div className="stat-card" style={{ borderTop: `4px solid ${rateColor(stats?.mortalityRate, 2)}` }}>
          <div className="stat-label">30-Day Mortality</div>
          <div className="stat-value" style={{ color: rateColor(stats?.mortalityRate, 2) }}>
            {stats?.mortalityRate ?? '—'}%
          </div>
          <div className="stat-unit">perioperative mortality</div>
          <span className={`stat-badge stat-badge-${rateLevel(stats?.mortalityRate, 2)}`}>
            Target &lt;2%
          </span>
        </div>
        <div className="stat-card" style={{ borderTop: '4px solid #10b981' }}>
          <div className="stat-label">Limb Salvage Rate</div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            {stats?.limbSalvageRate ?? '—'}%
          </div>
          <div className="stat-unit">PAD procedures</div>
          <span className="stat-badge stat-badge-success">Target &gt;90%</span>
        </div>
        <div className="stat-card" style={{ borderTop: `4px solid ${rateColor(stats?.reinterventionRate, 10)}` }}>
          <div className="stat-label">Reintervention Rate</div>
          <div className="stat-value" style={{ color: rateColor(stats?.reinterventionRate, 10) }}>
            {stats?.reinterventionRate ?? '—'}%
          </div>
          <div className="stat-unit">follow-up interventions</div>
          <span className={`stat-badge stat-badge-${rateLevel(stats?.reinterventionRate, 10)}`}>
            All follow-ups
          </span>
        </div>
      </div>

      {/* Red-Flag Alerts for M&M Review */}
      {redFlags && (redFlags.strokeDeath.length > 0 || redFlags.missedFollowups.length > 0 || redFlags.carotidStrokes.length > 0) && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>🚨</span>
            <h2 style={{ color: '#ef4444', margin: 0, fontSize: 16, fontWeight: 700 }}>M&M Review Alerts</h2>
            <span style={{ fontSize: 12, color: '#64748b' }}>— Requires clinical review</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {redFlags.strokeDeath.map(r => (
              <div key={r.procedure_id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#450a0a', border: '1px solid #7f1d1d', borderLeft: '4px solid #ef4444', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}
                onClick={() => navigate('procedure-edit', { procedureId: r.procedure_id })}>
                <span style={{ fontSize: 20 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, color: '#fca5a5' }}>{r.patient_name}</span>
                  <span style={{ color: '#94a3b8', margin: '0 8px', fontSize: 12 }}>MRN: {r.mrn}</span>
                  <span style={{ fontSize: 12, color: '#f87171' }}>{r.procedure_type} · {r.procedure_date}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {r.stroke ? <span className="badge badge-danger">Stroke</span> : null}
                  {r.death_in_hospital ? <span className="badge badge-danger">In-Hospital Death</span> : null}
                  {r.death_30_day ? <span className="badge badge-danger">30-Day Death</span> : null}
                  {r.amputation ? <span className="badge badge-danger">Amputation</span> : null}
                  {r.reoperation ? <span style={{ background: '#78350f', color: '#fcd34d', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>Reoperation</span> : null}
                </div>
                <span style={{ color: '#64748b', fontSize: 12 }}>→ View</span>
              </div>
            ))}
            {redFlags.carotidStrokes.map(r => (
              <div key={`cs-${r.procedure_id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#450a0a', border: '1px solid #7f1d1d', borderLeft: '4px solid #dc2626', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}
                onClick={() => navigate('procedure-edit', { procedureId: r.procedure_id })}>
                <span style={{ fontSize: 20 }}>🧠</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, color: '#fca5a5' }}>{r.patient_name}</span>
                  <span style={{ color: '#94a3b8', margin: '0 8px', fontSize: 12 }}>MRN: {r.mrn}</span>
                  <span style={{ fontSize: 12, color: '#f87171' }}>Carotid · {r.procedure_date}</span>
                </div>
                <span className="badge badge-danger">Periop Stroke ({r.periop_stroke_side})</span>
                <span style={{ color: '#64748b', fontSize: 12 }}>→ View</span>
              </div>
            ))}
            {redFlags.missedFollowups.map(r => (
              <div key={`mf-${r.procedure_id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#431407', border: '1px solid #7c2d12', borderLeft: '4px solid #f97316', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}
                onClick={() => navigate('patient-edit', { patientId: r.patient_id })}>
                <span style={{ fontSize: 20 }}>📅</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, color: '#fdba74' }}>{r.patient_name}</span>
                  <span style={{ color: '#94a3b8', margin: '0 8px', fontSize: 12 }}>MRN: {r.mrn}</span>
                  <span style={{ fontSize: 12, color: '#fb923c' }}>{r.procedure_type} · Proc date: {r.procedure_date}</span>
                </div>
                <span style={{ background: '#7c2d12', color: '#fdba74', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>
                  Follow-up due: {r.followup_date}
                </span>
                <span style={{ color: '#64748b', fontSize: 12 }}>→ View</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="charts-grid">
        {/* Monthly Procedure Volume */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📈 Monthly Procedure Volume (12 Months)</div>
          </div>
          <div className="card-body">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[3,3,0,0]} name="Procedures" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-icon">📊</div>
                <div className="empty-state-title">No procedure data yet</div>
                <div className="empty-state-desc">Add procedures to see monthly volume charts</div>
              </div>
            )}
          </div>
        </div>

        {/* Procedure Type Breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🥧 Procedures by Type</div>
          </div>
          <div className="card-body">
            {stats?.procedureTypeBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={stats.procedureTypeBreakdown}
                    dataKey="count"
                    nameKey="procedure_type"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name?.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {stats.procedureTypeBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-icon">🥧</div>
                <div className="empty-state-title">No data yet</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        {/* Surgeon Volume */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">👨‍⚕️ Surgeon Procedure Volume</div>
          </div>
          <div className="card-body-sm">
            {stats?.surgeonVolume?.length > 0 ? (
              <table style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 0', color: '#64748b', fontWeight: 600, fontSize: '0.75rem' }}>Surgeon</th>
                    <th style={{ textAlign: 'right', padding: '6px 0', color: '#64748b', fontWeight: 600, fontSize: '0.75rem' }}>Procedures</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.surgeonVolume.map((s, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px 0', borderTop: '1px solid #f0f0f0' }}>
                        {s.surgeon_name || 'Unknown Surgeon'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '6px 0', borderTop: '1px solid #f0f0f0' }}>
                        <span className="badge badge-info">{s.count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state" style={{ padding: 30 }}>
                <div>No procedure data yet</div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Patients */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🕐 Recently Added Patients</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('patients')}>View All</button>
          </div>
          <div className="card-body-sm">
            {stats?.recentPatients?.length > 0 ? (
              <table style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 0', color: '#64748b', fontWeight: 600, fontSize: '0.75rem' }}>Patient</th>
                    <th style={{ textAlign: 'left', padding: '6px 0', color: '#64748b', fontWeight: 600, fontSize: '0.75rem' }}>MRN</th>
                    <th style={{ textAlign: 'right', padding: '6px 0', color: '#64748b', fontWeight: 600, fontSize: '0.75rem' }}>Procedures</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentPatients.map((p, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px 0', borderTop: '1px solid #f0f0f0' }}>
                        <span className="table-link" onClick={() => navigate('patient-edit', { patientId: p.patient_id })}>
                          {p.name}
                        </span>
                      </td>
                      <td style={{ padding: '6px 0', borderTop: '1px solid #f0f0f0', color: '#64748b' }}>{p.mrn}</td>
                      <td style={{ textAlign: 'right', padding: '6px 0', borderTop: '1px solid #f0f0f0' }}>
                        <span className="badge badge-gray">{p.proc_count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state" style={{ padding: 30 }}>
                <div className="empty-state-title">No patients yet</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('patient-new')}>
                  + Add First Patient
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div className="card-title">⚡ Quick Actions</div>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('patient-new')}>➕ Register New Patient</button>
            <button className="btn btn-secondary" onClick={() => navigate('procedure-new')}>🔬 Record Procedure</button>
            <button className="btn btn-secondary" onClick={() => navigate('reports')}>📊 Generate Report</button>
            <button className="btn btn-secondary" onClick={() => navigate('search')}>🔍 Search Registry</button>
            <button className="btn btn-secondary" onClick={() => navigate('backup')}>💾 Backup Database</button>
          </div>
        </div>
      </div>

      {/* VQI Module Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 20 }}>
        {[
          { label: 'Carotid', icon: '🧠', type: 'Carotid Endarterectomy', color: '#2563eb' },
          { label: 'AAA/EVAR', icon: '🫀', type: 'EVAR', color: '#7c3aed' },
          { label: 'Peripheral', icon: '🦵', type: 'Peripheral Bypass', color: '#10b981' },
          { label: 'Dialysis Access', icon: '💉', type: 'Dialysis Access', color: '#f59e0b' },
        ].map(mod => {
          const count = stats?.procedureTypeBreakdown?.find(p => p.procedure_type === mod.type)?.count || 0;
          return (
            <div key={mod.label} className="card" style={{ borderTop: `4px solid ${mod.color}`, cursor: 'pointer' }}
              onClick={() => navigate('search')}>
              <div className="card-body" style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{mod.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{mod.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: mod.color }}>{count}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>procedures</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildMonthlyChart(data) {
  const map = {};
  data.forEach(({ month, count }) => {
    if (!map[month]) map[month] = { month: month.slice(5), count: 0 };
    map[month].count += count;
  });
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

function rateColor(rate, threshold) {
  if (rate == null) return '#64748b';
  return rate <= threshold ? '#10b981' : rate <= threshold * 1.5 ? '#f59e0b' : '#ef4444';
}

function rateLevel(rate, threshold) {
  if (rate == null) return 'gray';
  return rate <= threshold ? 'success' : rate <= threshold * 1.5 ? 'warning' : 'danger';
}
