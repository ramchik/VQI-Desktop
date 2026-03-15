import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';

const EMPTY_FOLLOWUP = {
  procedure_id: '',
  followup_date: new Date().toISOString().slice(0, 10),
  followup_interval: '30 Day',
  alive: 1,
  cause_of_death: '',
  reintervention: 0,
  reintervention_type: '',
  graft_patency: '',
  abi: '',
  imaging_type: '',
  imaging_result: '',
  stenosis_percent: '',
  aneurysm_sac_diameter: '',
  endoleak_type: 'None',
  stroke: 0,
  mi: 0,
  amputation: 0,
  amputation_level: '',
  limb_status: '',
  walking_distance_meters: '',
  quality_of_life_score: '',
  functional_status: '',
  notes: ''
};

const PATENCY_LABELS = {
  1: 'Primary — graft open without intervention',
  2: 'Assisted Primary — graft open after minor intervention',
  3: 'Secondary — graft reopened after occlusion',
  0: 'Occluded'
};

export default function FollowUpForm({ procedureId }) {
  const { navigate, notify } = useApp();
  const [followups, setFollowups] = useState([]);
  const [proc, setProc] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FOLLOWUP, procedure_id: procedureId });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (procedureId) loadData();
  }, [procedureId]);

  async function loadData() {
    setLoading(true);
    const [fuRes, procRes] = await Promise.all([
      window.electronAPI.getFollowups(procedureId),
      window.electronAPI.getProcedureById(procedureId)
    ]);
    if (fuRes.success) setFollowups(fuRes.data);
    if (procRes.success) setProc(procRes.data);
    setLoading(false);
  }

  function startNew() {
    setEditing(null);
    setForm({ ...EMPTY_FOLLOWUP, procedure_id: procedureId });
    setShowForm(true);
  }

  function startEdit(fu) {
    setEditing(fu.followup_id);
    setForm({ ...EMPTY_FOLLOWUP, ...Object.fromEntries(Object.entries(fu).map(([k, v]) => [k, v === null ? '' : v])) });
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]));
      let res;
      if (editing) {
        res = await window.electronAPI.updateFollowup(editing, data);
      } else {
        res = await window.electronAPI.createFollowup(data);
      }
      if (res.success) {
        notify(editing ? 'Follow-up updated' : 'Follow-up recorded');
        setShowForm(false);
        loadData();
      } else {
        notify(res.error || 'Save failed', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this follow-up record?')) return;
    const res = await window.electronAPI.deleteFollowup(id);
    if (res.success) { notify('Follow-up deleted'); loadData(); }
  }

  function setF(field, value) { setForm(f => ({ ...f, [field]: value })); }
  function toggle(field) { setForm(f => ({ ...f, [field]: f[field] ? 0 : 1 })); }

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ textAlign: 'center', color: '#64748b' }}>Loading follow-up data...</div>
    </div>
  );

  return (
    <div className="page-wide" style={{ padding: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Follow-Up Tracking</h1>
          {proc && (
            <p className="page-subtitle">
              {proc.procedure_type} — {proc.patient_name} (MRN: {proc.mrn}) —{' '}
              {proc.procedure_date ? new Date(proc.procedure_date + 'T00:00:00').toLocaleDateString() : ''}
            </p>
          )}
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={() => navigate(proc?.patient_id ? 'patient-edit' : 'patients', proc?.patient_id ? { patientId: proc.patient_id } : {})}>
            ← Back to Patient
          </button>
          <button className="btn btn-primary" onClick={startNew}>+ Add Follow-up</button>
        </div>
      </div>

      {/* Follow-up Timeline */}
      {followups.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">📅 Follow-up Timeline ({followups.length} visits)</div>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Interval</th>
                  <th>Date</th>
                  <th>Alive</th>
                  <th>ABI</th>
                  <th>Patency</th>
                  <th>Reintervention</th>
                  <th>Stroke</th>
                  <th>Amputation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {followups.map(fu => (
                  <tr key={fu.followup_id}>
                    <td><span className="badge badge-info">{fu.followup_interval}</span></td>
                    <td>{fu.followup_date ? new Date(fu.followup_date + 'T00:00:00').toLocaleDateString() : '—'}</td>
                    <td>
                      <span className={`badge badge-${fu.alive ? 'success' : 'danger'}`}>
                        {fu.alive ? '✓ Alive' : '✕ Deceased'}
                      </span>
                    </td>
                    <td style={{ fontWeight: fu.abi ? 600 : 400 }}>{fu.abi ?? '—'}</td>
                    <td>
                      {fu.graft_patency !== null && fu.graft_patency !== '' ? (
                        <span className={`badge badge-${fu.graft_patency > 0 ? 'success' : 'danger'}`}>
                          {fu.graft_patency === 1 ? 'Primary' : fu.graft_patency === 2 ? 'Assisted' : fu.graft_patency === 3 ? 'Secondary' : 'Occluded'}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${fu.reintervention ? 'warning' : 'gray'}`}>
                        {fu.reintervention ? '⚠ Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${fu.stroke ? 'danger' : 'gray'}`}>
                        {fu.stroke ? '✕ Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${fu.amputation ? 'danger' : 'gray'}`}>
                        {fu.amputation ? '✕ Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group">
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(fu)}>✏️</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDelete(fu.followup_id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {followups.length === 0 && !showForm && (
        <div className="card">
          <div className="empty-state" style={{ padding: 60 }}>
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-title">No follow-up visits recorded</div>
            <div className="empty-state-desc">
              VQI-style follow-up intervals: 30 days, 6 months, 1 year, and annually thereafter
            </div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={startNew}>
              + Record First Follow-up
            </button>
          </div>
        </div>
      )}

      {/* Follow-up Form */}
      {showForm && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">{editing ? '✏️ Edit Follow-up Visit' : '➕ New Follow-up Visit'}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕ Cancel</button>
          </div>
          <div className="card-body">
            <div className="form-grid form-grid-3">
              <div className="section-header">Visit Information</div>
              <div className="form-group">
                <label className="form-label required">Follow-up Interval</label>
                <select className="form-select" value={form.followup_interval} onChange={e => setF('followup_interval', e.target.value)}>
                  {['30 Day','6 Month','1 Year','2 Year','3 Year','4 Year','5 Year','Annual'].map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label required">Visit Date</label>
                <input className="form-input" type="date" value={form.followup_date}
                  onChange={e => setF('followup_date', e.target.value)} />
              </div>
              <div></div>

              <div className="section-header">Survival</div>
              <div className="form-group">
                <label className="form-label">Patient Alive</label>
                <div className="yn-group">
                  <button className={`yn-btn ${form.alive ? 'active-yes' : ''}`} onClick={() => setF('alive', 1)}>Yes</button>
                  <button className={`yn-btn ${!form.alive ? 'active-no' : ''}`} onClick={() => setF('alive', 0)}>No</button>
                </div>
              </div>
              {!form.alive ? (
                <div className="form-group">
                  <label className="form-label">Cause of Death</label>
                  <input className="form-input" value={form.cause_of_death}
                    onChange={e => setF('cause_of_death', e.target.value)} placeholder="Cause of death" />
                </div>
              ) : <div></div>}
              <div></div>

              <div className="section-header">Vascular Status</div>
              <div className="form-group">
                <label className="form-label">Graft/Vessel Patency</label>
                <select className="form-select" value={form.graft_patency} onChange={e => setF('graft_patency', e.target.value)}>
                  <option value="">Not applicable</option>
                  <option value="1">1 — Primary patency</option>
                  <option value="2">2 — Assisted primary patency</option>
                  <option value="3">3 — Secondary patency</option>
                  <option value="0">0 — Occluded</option>
                </select>
                {form.graft_patency !== '' && form.graft_patency !== null && (
                  <span className="form-hint">{PATENCY_LABELS[form.graft_patency]}</span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">ABI (Ankle-Brachial Index)</label>
                <input className="form-input" type="number" step="0.01" min="0" max="2"
                  value={form.abi} onChange={e => setF('abi', e.target.value)} placeholder="e.g., 0.75" />
              </div>
              <div className="form-group">
                <label className="form-label">Limb Status</label>
                <select className="form-select" value={form.limb_status} onChange={e => setF('limb_status', e.target.value)}>
                  <option value="">Select...</option>
                  <option>Intact</option><option>Tissue loss</option><option>Ulcer</option><option>Gangrene</option>
                </select>
              </div>

              <div className="section-header">Imaging</div>
              <div className="form-group">
                <label className="form-label">Imaging Performed</label>
                <select className="form-select" value={form.imaging_type} onChange={e => setF('imaging_type', e.target.value)}>
                  <option value="">None</option>
                  <option>Duplex Ultrasound</option><option>CTA</option><option>MRA</option>
                  <option>Angiography</option><option>Plain X-Ray</option>
                </select>
              </div>
              {form.imaging_type && (
                <>
                  <div className="form-group">
                    <label className="form-label">Stenosis (%)</label>
                    <input className="form-input" type="number" min="0" max="100"
                      value={form.stenosis_percent} onChange={e => setF('stenosis_percent', e.target.value)} placeholder="e.g., 30" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Aneurysm Sac Diameter (mm)</label>
                    <input className="form-input" type="number"
                      value={form.aneurysm_sac_diameter} onChange={e => setF('aneurysm_sac_diameter', e.target.value)} placeholder="e.g., 52" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Endoleak</label>
                    <select className="form-select" value={form.endoleak_type} onChange={e => setF('endoleak_type', e.target.value)}>
                      <option>None</option>
                      <option>Type I</option><option>Type II</option><option>Type III</option>
                      <option>Type IV</option><option>Type V</option><option>Unknown</option>
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Imaging Result / Interpretation</label>
                    <textarea className="form-textarea" value={form.imaging_result}
                      onChange={e => setF('imaging_result', e.target.value)} placeholder="Summary of imaging findings..." />
                  </div>
                </>
              )}

              <div className="section-header">Adverse Events</div>
              <div className="form-group">
                <label className="form-label">Reintervention</label>
                <div className="yn-group">
                  <button className={`yn-btn ${form.reintervention ? 'active-yes' : ''}`} onClick={() => toggle('reintervention')}>Yes</button>
                  <button className={`yn-btn ${!form.reintervention ? 'active-no' : ''}`} onClick={() => { if (form.reintervention) toggle('reintervention'); }}>No</button>
                </div>
              </div>
              {form.reintervention ? (
                <div className="form-group">
                  <label className="form-label">Reintervention Type</label>
                  <input className="form-input" value={form.reintervention_type}
                    onChange={e => setF('reintervention_type', e.target.value)} placeholder="Type of reintervention" />
                </div>
              ) : <div></div>}
              <div></div>

              <div className="form-group">
                <label className="form-label">Stroke</label>
                <div className="yn-group">
                  <button className={`yn-btn ${form.stroke ? 'active-yes' : ''}`} onClick={() => toggle('stroke')}>Yes</button>
                  <button className={`yn-btn ${!form.stroke ? 'active-no' : ''}`} onClick={() => { if (form.stroke) toggle('stroke'); }}>No</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Myocardial Infarction</label>
                <div className="yn-group">
                  <button className={`yn-btn ${form.mi ? 'active-yes' : ''}`} onClick={() => toggle('mi')}>Yes</button>
                  <button className={`yn-btn ${!form.mi ? 'active-no' : ''}`} onClick={() => { if (form.mi) toggle('mi'); }}>No</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Amputation</label>
                <div className="yn-group">
                  <button className={`yn-btn ${form.amputation ? 'active-yes' : ''}`} onClick={() => toggle('amputation')}>Yes</button>
                  <button className={`yn-btn ${!form.amputation ? 'active-no' : ''}`} onClick={() => { if (form.amputation) toggle('amputation'); }}>No</button>
                </div>
              </div>
              {form.amputation ? (
                <div className="form-group">
                  <label className="form-label">Amputation Level</label>
                  <select className="form-select" value={form.amputation_level} onChange={e => setF('amputation_level', e.target.value)}>
                    <option value="">Select...</option>
                    <option>Toe</option><option>Transmetatarsal</option><option>Below Knee</option><option>Above Knee</option>
                  </select>
                </div>
              ) : null}

              <div className="section-header">Functional Outcomes</div>
              <div className="form-group">
                <label className="form-label">Walking Distance (meters)</label>
                <input className="form-input" type="number" value={form.walking_distance_meters}
                  onChange={e => setF('walking_distance_meters', e.target.value)} placeholder="e.g., 200" />
              </div>
              <div className="form-group">
                <label className="form-label">Quality of Life Score (0-100)</label>
                <input className="form-input" type="number" min="0" max="100" value={form.quality_of_life_score}
                  onChange={e => setF('quality_of_life_score', e.target.value)} placeholder="e.g., 75" />
              </div>
              <div className="form-group">
                <label className="form-label">Functional Status</label>
                <select className="form-select" value={form.functional_status} onChange={e => setF('functional_status', e.target.value)}>
                  <option value="">Select...</option>
                  <option>Independent</option><option>Partially dependent</option><option>Fully dependent</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={form.notes}
                  onChange={e => setF('notes', e.target.value)} placeholder="Clinical notes, additional findings..." />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner-sm"></span> Saving...</> : editing ? '💾 Update Follow-up' : '✅ Save Follow-up'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
