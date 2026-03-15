import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../App';
import {
  calcAge, summarize, computeP,
  formatP, pColor, pAsterisks,
  logRankTest, oddsRatio, coxPH, kaplanMeier, medianSurvival
} from '../../utils/stats';

const PROCEDURE_TYPES = [
  'Carotid Endarterectomy','Carotid Artery Stenting','TCAR (Transcarotid Artery Revascularization)',
  'EVAR (Endovascular Aortic Repair)','TEVAR (Thoracic EVAR)','Open AAA Repair',
  'Open Thoracoabdominal Aortic Repair','Peripheral Bypass','Peripheral Angioplasty/Stenting',
  'Visceral/Renal Revascularization','Lower Extremity Amputation','Upper Extremity Amputation',
  'Dialysis Access Creation','Dialysis Access Revision','Thrombectomy/Embolectomy',
  'Varicose Vein Ablation (EVLA/RFA)','Phlebectomy','Sclerotherapy','Venous Stenting',
  'Deep Venous Reconstruction','Fasciotomy','Other Vascular Procedure'
];

// ─── Variable Definitions ─────────────────────────────────────────────────────
// Each entry describes one row in Table 1.
// type: 'continuous' | 'binary' | 'categorical'
// extract: fn(rawPatientRow) → value (null if missing)

const TABLE1_VARS = [
  // ── Demographics ──────────────────────────────────────────────────────────
  { section: 'Demographics' },
  { key: 'age',        label: 'Age (years)',      type: 'continuous',
    extract: p => calcAge(p.date_of_birth) },
  { key: 'sex_female', label: 'Female sex',       type: 'binary',
    extract: p => p.sex == null ? null : p.sex === 'Female' ? 1 : 0 },
  { key: 'bmi',        label: 'BMI (kg/m²)',      type: 'continuous',
    extract: p => p.bmi },
  { key: 'race',       label: 'Race',             type: 'categorical',
    extract: p => p.race || null },

  // ── Comorbidities ─────────────────────────────────────────────────────────
  { section: 'Comorbidities' },
  { key: 'hypertension',         label: 'Hypertension',              type: 'binary',
    extract: p => p.hypertension },
  { key: 'diabetes',             label: 'Diabetes mellitus',         type: 'binary',
    extract: p => p.diabetes },
  { key: 'dm_insulin',           label: '  Insulin-dependent DM',    type: 'binary', indent: true,
    extract: p => p.diabetes ? (p.insulin ? 1 : 0) : null },
  { key: 'dm_oral',              label: '  Oral agents DM',          type: 'binary', indent: true,
    extract: p => p.diabetes ? (p.oral_diabetic_medications ? 1 : 0) : null },
  { key: 'hba1c',                label: '  HbA1c (%)',               type: 'continuous', indent: true,
    extract: p => p.hba1c },
  { key: 'smoking_status',       label: 'Smoking status',            type: 'categorical',
    extract: p => p.smoking_status || null },
  { key: 'smoking_current',      label: '  Current smoker',          type: 'binary', indent: true,
    extract: p => p.smoking_status ? (p.smoking_status === 'Current' ? 1 : 0) : null },
  { key: 'pack_years',           label: '  Pack-years',              type: 'continuous', indent: true,
    extract: p => p.pack_years },
  { key: 'hyperlipidemia',       label: 'Hyperlipidemia',            type: 'binary',
    extract: p => p.hyperlipidemia },
  { key: 'cad',                  label: 'Coronary artery disease',   type: 'binary',
    extract: p => p.coronary_artery_disease },
  { key: 'prior_mi',             label: '  Prior MI',                type: 'binary', indent: true,
    extract: p => p.prior_mi },
  { key: 'prior_cabg',           label: '  Prior CABG',              type: 'binary', indent: true,
    extract: p => p.prior_cabg },
  { key: 'prior_pci',            label: '  Prior PCI',               type: 'binary', indent: true,
    extract: p => p.prior_pci },
  { key: 'heart_failure',        label: 'Heart failure',             type: 'binary',
    extract: p => p.heart_failure },
  { key: 'copd',                 label: 'COPD',                      type: 'binary',
    extract: p => p.copd },
  { key: 'afib',                 label: 'Atrial fibrillation',       type: 'binary',
    extract: p => p.atrial_fibrillation },
  { key: 'ckd_stage',            label: 'CKD stage',                 type: 'categorical',
    extract: p => p.ckd_stage != null ? `Stage ${p.ckd_stage}` : null },
  { key: 'dialysis',             label: 'Dialysis',                  type: 'binary',
    extract: p => p.dialysis },
  { key: 'prior_stroke',         label: 'Prior stroke / TIA',        type: 'binary',
    extract: p => (p.prior_stroke || p.prior_tia) ? 1 : (p.prior_stroke == null && p.prior_tia == null ? null : 0) },
  { key: 'pad',                  label: 'Peripheral artery disease',  type: 'binary',
    extract: p => p.peripheral_artery_disease },
  { key: 'prior_amputation',     label: 'Prior amputation',          type: 'binary',
    extract: p => p.prior_amputation },
  { key: 'functional_status',    label: 'Functional status',         type: 'categorical',
    extract: p => p.functional_status || null },

  // ── Medications ───────────────────────────────────────────────────────────
  { section: 'Pre-operative Medications' },
  { key: 'aspirin',              label: 'Aspirin',                   type: 'binary',
    extract: p => p.aspirin },
  { key: 'clopidogrel',         label: 'Clopidogrel',               type: 'binary',
    extract: p => p.clopidogrel },
  { key: 'ticagrelor',          label: 'Ticagrelor',                type: 'binary',
    extract: p => p.ticagrelor },
  { key: 'any_antiplatelet',    label: 'Any antiplatelet',          type: 'binary',
    extract: p => (p.aspirin || p.clopidogrel || p.ticagrelor) ? 1 :
      (p.aspirin == null ? null : 0) },
  { key: 'statin',              label: 'Statin',                    type: 'binary',
    extract: p => p.statin },
  { key: 'beta_blocker',        label: 'Beta-blocker',              type: 'binary',
    extract: p => p.beta_blocker },
  { key: 'ace_arb',             label: 'ACE inhibitor / ARB',       type: 'binary',
    extract: p => (p.ace_inhibitor || p.arb) ? 1 : (p.ace_inhibitor == null ? null : 0) },
  { key: 'anticoag',            label: 'Anticoagulation',           type: 'binary',
    extract: p => (p.warfarin || p.apixaban || p.rivaroxaban) ? 1 :
      (p.warfarin == null ? null : 0) },
  { key: 'warfarin',            label: '  Warfarin / VKA',          type: 'binary', indent: true,
    extract: p => p.warfarin },
  { key: 'doac',                label: '  DOAC (apixaban/rivaroxaban)', type: 'binary', indent: true,
    extract: p => (p.apixaban || p.rivaroxaban) ? 1 : (p.apixaban == null ? null : 0) },

  // ── Pre-operative Labs ────────────────────────────────────────────────────
  { section: 'Pre-operative Laboratory Values' },
  { key: 'hemoglobin',          label: 'Hemoglobin (g/dL)',         type: 'continuous',
    extract: p => p.hemoglobin },
  { key: 'creatinine',          label: 'Creatinine (mg/dL)',        type: 'continuous',
    extract: p => p.creatinine },
  { key: 'platelet_count',      label: 'Platelet count (×10³/µL)', type: 'continuous',
    extract: p => p.platelet_count },
];

const EMPTY_FILTERS = {
  sex: '', minAge: '', maxAge: '', diabetes: '', hypertension: '', copd: '',
  heart_failure: '', dialysis: '', prior_stroke: '', smoking: '',
  procedure_type: '', procedure_date_from: '', procedure_date_to: '', surgeon_id: ''
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResearchModule() {
  const { navigate } = useApp();
  const [activeTab, setActiveTab] = useState('cohort');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [surgeons, setSurgeons] = useState([]);
  const [cohort, setCohort] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // Table 1 state
  const [table1Data, setTable1Data] = useState(null);     // { groupA, groupB? }
  const [t1Config, setT1Config] = useState({
    twoGroup: false,
    splitBy: 'procedure_type',   // 'procedure_type' | 'sex' | 'custom'
    groupALabel: 'Group A',
    groupBLabel: 'Group B',
    groupAProcType: '',
    groupBProcType: '',
    groupAIds: new Set(),         // used when splitBy='custom'
    groupBIds: new Set(),
  });

  // Time-to-event state
  const [timeToEvent, setTimeToEvent] = useState(null);

  // Table 2 state
  const [table2Data, setTable2Data] = useState(null);

  useEffect(() => {
    window.electronAPI.getSurgeons().then(r => { if (r.success) setSurgeons(r.data); });
  }, []);

  function setF(field, val) { setFilters(f => ({ ...f, [field]: val })); }

  async function runCohortQuery() {
    setLoading(true);
    setCohort(null); setTable1Data(null); setTimeToEvent(null); setTable2Data(null);
    setSelectedRows(new Set()); setT1Config(c => ({ ...c, groupAIds: new Set(), groupBIds: new Set() }));
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
    if (!cohort) return;
    setLoading(true);
    try {
      let groupAIds, groupBIds;

      if (t1Config.twoGroup) {
        if (t1Config.splitBy === 'procedure_type') {
          groupAIds = cohort.filter(p => p.last_procedure_type === t1Config.groupAProcType)
            .map(p => p.patient_id);
          groupBIds = cohort.filter(p => p.last_procedure_type === t1Config.groupBProcType)
            .map(p => p.patient_id);
        } else if (t1Config.splitBy === 'sex') {
          groupAIds = cohort.filter(p => p.sex === 'Male').map(p => p.patient_id);
          groupBIds = cohort.filter(p => p.sex === 'Female').map(p => p.patient_id);
          setT1Config(c => ({ ...c, groupALabel: 'Male', groupBLabel: 'Female' }));
        } else {
          groupAIds = [...t1Config.groupAIds];
          groupBIds = [...t1Config.groupBIds];
        }
        if (!groupAIds.length || !groupBIds.length) {
          alert('Both groups must have at least 1 patient. Check your split settings.');
          setLoading(false); return;
        }
      } else {
        groupAIds = [...selectedRows];
      }

      const [resA, resB] = await Promise.all([
        window.electronAPI.getPatientRawData(groupAIds),
        t1Config.twoGroup ? window.electronAPI.getPatientRawData(groupBIds) : Promise.resolve(null)
      ]);

      setTable1Data({
        rawA: resA.success ? resA.data : [],
        rawB: resB && resB.success ? resB.data : null,
        groupALabel: t1Config.groupALabel,
        groupBLabel: t1Config.groupBLabel,
      });
      setActiveTab('table1');
    } finally { setLoading(false); }
  }

  async function generateTable2() {
    if (!cohort) return;
    setLoading(true);
    try {
      let groupAIds, groupBIds;
      let groupALabel = t1Config.groupALabel, groupBLabel = t1Config.groupBLabel;

      if (t1Config.twoGroup) {
        if (t1Config.splitBy === 'procedure_type') {
          groupAIds = cohort.filter(p => p.last_procedure_type === t1Config.groupAProcType).map(p => p.patient_id);
          groupBIds = cohort.filter(p => p.last_procedure_type === t1Config.groupBProcType).map(p => p.patient_id);
        } else if (t1Config.splitBy === 'sex') {
          groupAIds = cohort.filter(p => p.sex === 'Male').map(p => p.patient_id);
          groupBIds = cohort.filter(p => p.sex === 'Female').map(p => p.patient_id);
          groupALabel = 'Male'; groupBLabel = 'Female';
        } else {
          groupAIds = [...t1Config.groupAIds];
          groupBIds = [...t1Config.groupBIds];
        }
        if (!groupAIds.length || !groupBIds.length) {
          alert('Both groups must have at least 1 patient.');
          setLoading(false); return;
        }
      } else {
        groupAIds = [...selectedRows];
      }

      const allIds = t1Config.twoGroup ? [...new Set([...groupAIds, ...groupBIds])] : groupAIds;
      const res = await window.electronAPI.getTable2Data(allIds);
      if (!res.success) { alert('Error: ' + res.error); return; }

      const rows = res.data;
      const rowsA = rows.filter(r => groupAIds.includes(r.patient_id));
      const rowsB = t1Config.twoGroup ? rows.filter(r => groupBIds.includes(r.patient_id)) : null;

      setTable2Data({ rowsA, rowsB, groupALabel, groupBLabel, twoGroup: t1Config.twoGroup });
      setActiveTab('table2');
    } finally { setLoading(false); }
  }

  async function generateTTE() {
    const ids = [...selectedRows];
    if (!ids.length) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.getTimeToEvent(ids);
      if (res.success) { setTimeToEvent(res.data); setActiveTab('tte'); }
    } finally { setLoading(false); }
  }

  function toggleRow(id) {
    setSelectedRows(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    if (!cohort) return;
    setSelectedRows(s => s.size === cohort.length ? new Set() : new Set(cohort.map(p => p.patient_id)));
  }

  function calcAgeDisplay(dob) {
    const a = calcAge(dob); return a ?? '—';
  }

  function mfi5(p) {
    return (p.diabetes ? 1 : 0) + (p.copd ? 1 : 0) + (p.heart_failure ? 1 : 0) +
      (p.hypertension ? 1 : 0) +
      (p.functional_status && p.functional_status !== 'Independent' ? 1 : 0);
  }

  const tabs = [
    { id: 'cohort', label: '🔍 Cohort Builder' },
    ...(table1Data ? [{ id: 'table1', label: '📋 Table 1' }] : []),
    ...(table2Data ? [{ id: 'table2', label: '📊 Table 2' }] : []),
    ...(timeToEvent ? [{ id: 'tte', label: '📈 Time-to-Event' }] : []),
  ];

  return (
    <div className="page-wide" style={{ padding: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">🔬 Research Workspace</h1>
          <p className="page-subtitle">Cohort builder · Table 1 with p-values · Time-to-event · Missing data audit</p>
        </div>
        {cohort && (
          <div className="btn-group">
            <span style={{ color: '#94a3b8', alignSelf: 'center', fontSize: 13 }}>
              {selectedRows.size}/{cohort.length} selected
            </span>
            <button className="btn btn-secondary" onClick={generateTable1}
              disabled={!selectedRows.size || loading}>📋 Table 1</button>
            <button className="btn btn-secondary" onClick={generateTable2}
              disabled={!selectedRows.size || loading}>📊 Table 2</button>
            <button className="btn btn-secondary" onClick={generateTTE}
              disabled={!selectedRows.size || loading}>📈 Time-to-Event</button>
          </div>
        )}
      </div>

      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'cohort' && (
        <>
          <CohortFilters filters={filters} setF={setF} surgeons={surgeons}
            onReset={() => setFilters(EMPTY_FILTERS)} onRun={runCohortQuery} loading={loading} />

          {cohort !== null && (
            <>
              <Table1Config config={t1Config} setConfig={setT1Config}
                cohort={cohort} procedureTypes={PROCEDURE_TYPES} />
              <CohortResults cohort={cohort} selectedRows={selectedRows}
                toggleRow={toggleRow} toggleAll={toggleAll}
                calcAge={calcAgeDisplay} mfi5={mfi5}
                config={t1Config} setConfig={setT1Config}
                onNavigate={id => navigate('patient-edit', { patientId: id })} />
            </>
          )}
        </>
      )}

      {activeTab === 'table1' && table1Data && (
        <Table1View data={table1Data} />
      )}

      {activeTab === 'table2' && table2Data && (
        <Table2View data={table2Data} />
      )}

      {activeTab === 'tte' && timeToEvent && (
        <TimeToEventView data={timeToEvent} />
      )}
    </div>
  );
}

// ─── Cohort Filter Panel ──────────────────────────────────────────────────────

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
              <option value="">Any</option><option>Male</option><option>Female</option>
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
          {[['diabetes','Diabetes'],['hypertension','Hypertension'],['copd','COPD'],
            ['heart_failure','Heart Failure'],['dialysis','Dialysis'],['prior_stroke','Prior Stroke']
          ].map(([field, label]) => (
            <div className="form-group" key={field}>
              <label className="form-label">{label}</label>
              <select className="form-select" value={filters[field]} onChange={e => setF(field, e.target.value)}>
                <option value="">Any</option><option value="1">Yes</option>
              </select>
            </div>
          ))}
          <div className="form-group">
            <label className="form-label">Smoking Status</label>
            <select className="form-select" value={filters.smoking} onChange={e => setF('smoking', e.target.value)}>
              <option value="">Any</option><option>Never</option><option>Former</option><option>Current</option>
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
              {surgeons.map(s => <option key={s.surgeon_id} value={s.surgeon_id}>
                Dr. {s.first_name} {s.last_name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-primary" onClick={onRun} disabled={loading}>
            {loading ? <><span className="spinner-sm"></span> Running...</> : '🔍 Run Query'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Two-Group Configuration ──────────────────────────────────────────────────

function Table1Config({ config, setConfig, cohort, procedureTypes }) {
  function setC(field, val) { setConfig(c => ({ ...c, [field]: val })); }

  const uniqueProcTypes = [...new Set(cohort.map(p => p.last_procedure_type).filter(Boolean))];

  return (
    <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid #2563eb' }}>
      <div className="card-header">
        <div className="card-title">📊 Table 1 Configuration</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={config.twoGroup}
            onChange={e => setC('twoGroup', e.target.checked)} />
          <span style={{ color: '#93c5fd', fontWeight: 600 }}>Enable Two-Group Comparison (p-values)</span>
        </label>
      </div>
      {config.twoGroup && (
        <div className="card-body">
          <div className="form-grid form-grid-3">
            <div className="form-group">
              <label className="form-label">Split By</label>
              <select className="form-select" value={config.splitBy}
                onChange={e => setC('splitBy', e.target.value)}>
                <option value="procedure_type">Procedure Type</option>
                <option value="sex">Sex (Male vs Female)</option>
                <option value="custom">Custom (manual row assignment)</option>
              </select>
            </div>

            {config.splitBy === 'procedure_type' && (
              <>
                <div className="form-group">
                  <label className="form-label">Group A — Procedure Type</label>
                  <select className="form-select" value={config.groupAProcType}
                    onChange={e => { setC('groupAProcType', e.target.value); setC('groupALabel', e.target.value || 'Group A'); }}>
                    <option value="">Select...</option>
                    {uniqueProcTypes.map(t => <option key={t}>{t}</option>)}
                  </select>
                  {config.groupAProcType && (
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      n = {cohort.filter(p => p.last_procedure_type === config.groupAProcType).length}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Group B — Procedure Type</label>
                  <select className="form-select" value={config.groupBProcType}
                    onChange={e => { setC('groupBProcType', e.target.value); setC('groupBLabel', e.target.value || 'Group B'); }}>
                    <option value="">Select...</option>
                    {uniqueProcTypes.filter(t => t !== config.groupAProcType).map(t => <option key={t}>{t}</option>)}
                  </select>
                  {config.groupBProcType && (
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      n = {cohort.filter(p => p.last_procedure_type === config.groupBProcType).length}
                    </span>
                  )}
                </div>
              </>
            )}

            {config.splitBy === 'sex' && (
              <>
                <div className="form-group">
                  <label className="form-label">Group A</label>
                  <div style={{ color: '#e2e8f0' }}>Male (n = {cohort.filter(p => p.sex === 'Male').length})</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Group B</label>
                  <div style={{ color: '#e2e8f0' }}>Female (n = {cohort.filter(p => p.sex === 'Female').length})</div>
                </div>
              </>
            )}

            {config.splitBy === 'custom' && (
              <div className="form-group full-width">
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Use the "A / B" column in the cohort table below to assign each patient to a group.
                  Unassigned patients are excluded from comparison.
                </div>
                <div style={{ marginTop: 6, color: '#64748b', fontSize: 12 }}>
                  Group A: {config.groupAIds.size} patients · Group B: {config.groupBIds.size} patients
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Group A Label</label>
              <input className="form-input" value={config.groupALabel}
                onChange={e => setC('groupALabel', e.target.value)} placeholder="Group A" />
            </div>
            <div className="form-group">
              <label className="form-label">Group B Label</label>
              <input className="form-input" value={config.groupBLabel}
                onChange={e => setC('groupBLabel', e.target.value)} placeholder="Group B" />
            </div>
          </div>
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#0f172a', borderRadius: 6, fontSize: 12, color: '#64748b' }}>
            <strong style={{ color: '#60a5fa' }}>Statistics:</strong> Continuous variables → Welch's t-test (two-tailed) ·
            Binary variables → χ² test or Fisher's exact (expected &lt;5) ·
            Categorical variables → χ² test · Significance: * p&lt;0.05, ** p&lt;0.01, *** p&lt;0.001
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cohort Results Table ─────────────────────────────────────────────────────

function CohortResults({ cohort, selectedRows, toggleRow, toggleAll, calcAge, mfi5, config, setConfig, onNavigate }) {
  if (!cohort.length) {
    return (
      <div className="card">
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">No patients match</div>
          <div className="empty-state-desc">Try loosening the filter criteria above</div>
        </div>
      </div>
    );
  }

  function toggleCustomGroup(id, group) {
    setConfig(c => {
      const aIds = new Set(c.groupAIds), bIds = new Set(c.groupBIds);
      if (group === 'A') { aIds.has(id) ? aIds.delete(id) : aIds.add(id); bIds.delete(id); }
      else { bIds.has(id) ? bIds.delete(id) : bIds.add(id); aIds.delete(id); }
      return { ...c, groupAIds: aIds, groupBIds: bIds };
    });
  }

  function exportCohortCSV() {
    const rows = cohort.filter(p => selectedRows.has(p.patient_id));
    const h = ['patient_id','mrn','last_name','first_name','dob','age','sex','race',
      'hypertension','diabetes','cad','copd','heart_failure','prior_stroke','dialysis',
      'smoking_status','pad','functional_status','mfi5','procedure_count','last_procedure'];
    const csv = [h.join(','),
      ...rows.map(p => [
        p.patient_id, p.mrn, p.last_name, p.first_name, p.date_of_birth,
        calcAge(p.date_of_birth), p.sex || '', p.race || '',
        p.hypertension||0, p.diabetes||0, p.coronary_artery_disease||0,
        p.copd||0, p.heart_failure||0, p.prior_stroke||0, p.dialysis||0,
        p.smoking_status||'', p.peripheral_artery_disease||0,
        p.functional_status||'', mfi5(p), p.procedure_count||0, p.last_procedure_date||''
      ].join(','))
    ].join('\n');
    window.electronAPI.saveFile(csv, 'cohort_export.csv');
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Cohort ({cohort.length} patients · {selectedRows.size} selected)</div>
        <button className="btn btn-secondary btn-sm" onClick={exportCohortCSV} disabled={!selectedRows.size}>
          ⬇ Export CSV
        </button>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th><input type="checkbox"
                checked={selectedRows.size === cohort.length && cohort.length > 0}
                onChange={toggleAll} /></th>
              {config.twoGroup && config.splitBy === 'custom' && <th>A / B</th>}
              <th>MRN</th><th>Patient</th><th>Age</th><th>Sex</th>
              <th>DM</th><th>HTN</th><th>CAD</th><th>COPD</th>
              <th>mFI-5</th><th>Procs</th><th>Last Procedure</th>
            </tr>
          </thead>
          <tbody>
            {cohort.map(p => {
              const score = mfi5(p);
              const mfiColor = score >= 3 ? '#ef4444' : score >= 2 ? '#f59e0b' : '#10b981';
              const inA = config.groupAIds.has(p.patient_id);
              const inB = config.groupBIds.has(p.patient_id);
              return (
                <tr key={p.patient_id}
                  className={selectedRows.has(p.patient_id) ? 'selected-row' : ''}>
                  <td><input type="checkbox" checked={selectedRows.has(p.patient_id)}
                    onChange={() => toggleRow(p.patient_id)} /></td>
                  {config.twoGroup && config.splitBy === 'custom' && (
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, border: 'none', cursor: 'pointer',
                            background: inA ? '#1d4ed8' : '#1e293b', color: inA ? '#fff' : '#64748b' }}
                          onClick={() => toggleCustomGroup(p.patient_id, 'A')}>A</button>
                        <button
                          style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, border: 'none', cursor: 'pointer',
                            background: inB ? '#7c3aed' : '#1e293b', color: inB ? '#fff' : '#64748b' }}
                          onClick={() => toggleCustomGroup(p.patient_id, 'B')}>B</button>
                      </div>
                    </td>
                  )}
                  <td><span className="badge badge-secondary">{p.mrn}</span></td>
                  <td>
                    <span className="link-text" onClick={() => onNavigate(p.patient_id)}>
                      {p.last_name}, {p.first_name}
                    </span>
                  </td>
                  <td>{calcAge(p.date_of_birth)}</td>
                  <td>{p.sex || '—'}</td>
                  <td>{p.diabetes ? <span className="badge badge-danger">Yes</span> : '—'}</td>
                  <td>{p.hypertension ? <span className="badge badge-warning">Yes</span> : '—'}</td>
                  <td>{p.coronary_artery_disease ? <span className="badge badge-warning">Yes</span> : '—'}</td>
                  <td>{p.copd ? <span className="badge badge-warning">Yes</span> : '—'}</td>
                  <td><span style={{ fontWeight: 700, color: mfiColor }}>{score}/5</span></td>
                  <td>{p.procedure_count || 0}</td>
                  <td style={{ fontSize: 12 }}>{p.last_procedure_date || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Table 1 Engine ───────────────────────────────────────────────────────────

function buildTable1Rows(rawA, rawB) {
  const rows = [];
  const twoGroup = rawB != null;
  const nA = rawA.length;
  const nB = rawB?.length ?? 0;

  for (const varDef of TABLE1_VARS) {
    if (varDef.section) { rows.push({ type: 'section', label: varDef.section }); continue; }

    const valuesA = rawA.map(p => varDef.extract(p));
    const valuesB = twoGroup ? rawB.map(p => varDef.extract(p)) : null;

    const statA = summarize(valuesA, varDef.type, nA);
    const statB = valuesB ? summarize(valuesB, varDef.type, nB) : null;
    const p = (twoGroup && statA && statB) ? computeP(statA, statB, varDef.type) : null;

    rows.push({ type: 'data', varDef, statA, statB, p, twoGroup });
  }
  return rows;
}

function fmtContinuous(stat) {
  if (!stat || stat.n === 0) return '—';
  const meanSD = stat.mean != null ? `${stat.mean} ± ${stat.sd ?? '?'}` : null;
  const medIQR = stat.median != null ? `${stat.median} [${stat.q1 ?? '?'}–${stat.q3 ?? '?'}]` : null;
  if (!meanSD && !medIQR) return '—';
  return (
    <span>
      {meanSD && <span>{meanSD}</span>}
      {meanSD && medIQR && <br />}
      {medIQR && <span style={{ fontSize: 11, color: '#94a3b8' }}>{medIQR}</span>}
    </span>
  );
}

function fmtBinary(stat) {
  if (!stat || stat.n === 0) return '—';
  return `${stat.count} (${stat.pct}%)`;
}

function fmtCategorical(stat) {
  if (!stat || !stat.cats || !Object.keys(stat.cats).length) return '—';
  return (
    <span>
      {Object.entries(stat.cats).map(([cat, cnt]) => (
        <div key={cat} style={{ fontSize: 12 }}>
          {cat}: {cnt} ({stat.n ? ((cnt / stat.n) * 100).toFixed(1) : 0}%)
        </div>
      ))}
    </span>
  );
}

function fmtMissing(stat, n) {
  if (!stat) return '';
  if (stat.missing === 0) return '';
  return (
    <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>
      {n - stat.missing}/{n} ({((( n - stat.missing) / n) * 100).toFixed(0)}% complete)
    </div>
  );
}

function Table1View({ data }) {
  const { rawA, rawB, groupALabel, groupBLabel } = data;
  const nA = rawA.length, nB = rawB?.length ?? 0;
  const twoGroup = rawB != null;
  const rows = buildTable1Rows(rawA, rawB);

  function buildCsvText() {
    const lines = [];
    const header = twoGroup
      ? `Variable,${groupALabel} (n=${nA}),${groupBLabel} (n=${nB}),p-value`
      : `Variable,Overall (n=${nA})`;
    lines.push(header);

    for (const row of rows) {
      if (row.type === 'section') { lines.push(`\n"── ${row.label}"`); continue; }
      const { varDef, statA, statB, p } = row;
      let cellA = '', cellB = '';
      if (varDef.type === 'continuous') {
        cellA = statA?.mean != null ? `"${statA.mean} ± ${statA.sd}"` : '—';
        cellB = statB?.mean != null ? `"${statB.mean} ± ${statB.sd}"` : '—';
      } else if (varDef.type === 'binary') {
        cellA = statA ? `${statA.count} (${statA.pct}%)` : '—';
        cellB = statB ? `${statB.count} (${statB.pct}%)` : '—';
      } else {
        cellA = statA?.cats ? Object.entries(statA.cats).map(([k, v]) => `${k}:${v}`).join('; ') : '—';
        cellB = statB?.cats ? Object.entries(statB.cats).map(([k, v]) => `${k}:${v}`).join('; ') : '—';
      }
      if (twoGroup) {
        lines.push(`"${varDef.label}","${cellA}","${cellB}","${p != null ? formatP(p) : '—'}"`);
      } else {
        lines.push(`"${varDef.label}","${cellA}"`);
      }
    }
    return lines.join('\n');
  }

  function handleExportCSV() {
    window.electronAPI.saveFile(buildCsvText(), 'Table1_baseline_characteristics.csv',
      [{ name: 'CSV Files', extensions: ['csv'] }]);
  }

  function handleCopyClipboard() {
    // Tab-separated for Excel paste
    const lines = [];
    const header = twoGroup
      ? `Variable\t${groupALabel} (n=${nA})\t${groupBLabel} (n=${nB})\tp-value`
      : `Variable\tOverall (n=${nA})\tStatistic`;
    lines.push(header);

    for (const row of rows) {
      if (row.type === 'section') { lines.push(`\n── ${row.label}`); continue; }
      const { varDef, statA, statB, p } = row;
      let cellA = '', note = '';
      if (varDef.type === 'continuous') {
        cellA = statA?.mean != null ? `${statA.mean} ± ${statA.sd}` : '—';
        note = 'Mean ± SD';
      } else if (varDef.type === 'binary') {
        cellA = statA ? `${statA.count} (${statA.pct}%)` : '—';
        note = 'n (%)';
      } else {
        cellA = statA?.cats ? Object.entries(statA.cats).map(([k, v]) =>
          `${k}: ${v} (${statA.n ? ((v / statA.n) * 100).toFixed(1) : 0}%)`).join('; ') : '—';
        note = 'n (%)';
      }
      const cellB = twoGroup ? (varDef.type === 'continuous'
        ? (statB?.mean != null ? `${statB.mean} ± ${statB.sd}` : '—')
        : varDef.type === 'binary' ? (statB ? `${statB.count} (${statB.pct}%)` : '—')
        : (statB?.cats ? Object.entries(statB.cats).map(([k, v]) =>
          `${k}: ${v} (${statB.n ? ((v / statB.n) * 100).toFixed(1) : 0}%)`).join('; ') : '—')) : null;

      if (twoGroup) lines.push(`${varDef.label}\t${cellA}\t${cellB}\t${p != null ? formatP(p) : '—'}`);
      else lines.push(`${varDef.label}\t${cellA}\t${note}`);
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      alert('Table 1 copied to clipboard. Paste into Word or Excel.');
    }).catch(() => {
      alert('Clipboard not available. Use Export CSV instead.');
    });
  }

  // Completeness summary
  const totalVars = rows.filter(r => r.type === 'data').length;
  const missingVars = rows.filter(r => r.type === 'data' && r.statA?.missing > 0).length;

  return (
    <div>
      {/* Header actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <span style={{ fontWeight: 700, color: '#e2e8f0' }}>
            Table 1 — Baseline Characteristics
            {twoGroup ? ` (${groupALabel} vs ${groupBLabel})` : ` (n=${nA})`}
          </span>
          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 12 }}>
            {missingVars} of {totalVars} variables have missing data
          </span>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={handleCopyClipboard}>📋 Copy (Excel/Word)</button>
          <button className="btn btn-secondary" onClick={handleExportCSV}>⬇ Export CSV</button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ width: '34%' }}>Variable</th>
                {twoGroup ? (
                  <>
                    <th style={{ width: '22%' }}>{groupALabel}<br /><span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>n = {nA}</span></th>
                    <th style={{ width: '22%' }}>{groupBLabel}<br /><span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>n = {nB}</span></th>
                    <th style={{ width: '12%' }}>p-value</th>
                    <th style={{ width: '10%' }}>Test</th>
                  </>
                ) : (
                  <>
                    <th style={{ width: '30%' }}>Overall<br /><span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>n = {nA}</span></th>
                    <th style={{ width: '16%' }}>Statistic</th>
                    <th style={{ width: '20%' }}>Data Completeness</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                if (row.type === 'section') {
                  return (
                    <tr key={i} style={{ background: '#0f172a' }}>
                      <td colSpan={twoGroup ? 5 : 4}
                        style={{ fontWeight: 700, color: '#60a5fa', fontSize: 11,
                          textTransform: 'uppercase', letterSpacing: 1, paddingTop: 14 }}>
                        {row.label}
                      </td>
                    </tr>
                  );
                }
                const { varDef, statA, statB, p } = row;
                const indent = varDef.indent ? 16 : 0;
                const pVal = p != null ? formatP(p) : '—';
                const pCol = p != null ? pColor(p) : '#64748b';
                const ast = p != null ? pAsterisks(p) : '';
                const testLabel = varDef.type === 'continuous' ? 't' :
                  (varDef.type === 'binary' && statA?.n < 20 ? 'Fx' : 'χ²');

                return (
                  <tr key={i}>
                    <td style={{ paddingLeft: 16 + indent, fontStyle: varDef.indent ? 'italic' : 'normal' }}>
                      {varDef.label}
                    </td>
                    <td>
                      {varDef.type === 'continuous' ? fmtContinuous(statA) :
                        varDef.type === 'binary' ? fmtBinary(statA) :
                        fmtCategorical(statA)}
                      {!twoGroup && fmtMissing(statA, nA)}
                    </td>
                    {twoGroup ? (
                      <>
                        <td>
                          {varDef.type === 'continuous' ? fmtContinuous(statB) :
                            varDef.type === 'binary' ? fmtBinary(statB) :
                            fmtCategorical(statB)}
                          {fmtMissing(statB, nB)}
                        </td>
                        <td style={{ fontWeight: 700, color: pCol, fontFamily: 'monospace' }}>
                          {pVal}
                          {ast !== 'ns' && ast && (
                            <span style={{ marginLeft: 4, fontSize: 14 }}>{ast}</span>
                          )}
                        </td>
                        <td style={{ fontSize: 11, color: '#64748b' }}>{p != null ? testLabel : '—'}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontSize: 12, color: '#64748b' }}>
                          {varDef.type === 'continuous' ? 'Mean ± SD / Median [IQR]' :
                            varDef.type === 'binary' ? 'n (%)' : 'n (%)'}
                        </td>
                        <td>
                          {statA?.missing > 0 ? (
                            <span style={{ fontSize: 12, color: '#f59e0b' }}>
                              {nA - statA.missing}/{nA} ({(((nA - statA.missing) / nA) * 100).toFixed(0)}%)
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: '#10b981' }}>Complete</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '8px 16px', fontSize: 11, color: '#475569', borderTop: '1px solid #1e293b' }}>
          Continuous: Mean ± SD and Median [IQR] · Binary: n (%) · Chi-squared or Fisher's exact for categorical/binary · Welch's t-test for continuous
          {twoGroup && ' · Significance: * p<0.05, ** p<0.01, *** p<0.001 (Fx = Fisher\'s exact)'}
        </div>
      </div>
    </div>
  );
}

// ─── Time-to-Event View ───────────────────────────────────────────────────────

function TimeToEventView({ data }) {
  const eventCount = data.filter(d => d.event_reintervention || d.event_death).length;
  const daysArr = data.map(d => d.days_to_event).filter(d => d != null).sort((a, b) => a - b);
  const medDays = daysArr.length ? (daysArr.length % 2 === 0
    ? ((daysArr[daysArr.length / 2 - 1] + daysArr[daysArr.length / 2]) / 2).toFixed(0)
    : daysArr[Math.floor(daysArr.length / 2)]) : null;

  function exportCSV() {
    const h = ['patient_id','mrn','patient_name','procedure_id','procedure_type',
      'procedure_date','days_to_event','event_reintervention','event_death',
      'reintervention_date','death_date','last_followup_date'];
    const csv = [h.join(','),
      ...data.map(r => [
        r.patient_id, r.mrn, `"${r.patient_name}"`, r.procedure_id, `"${r.procedure_type}"`,
        r.procedure_date, r.days_to_event ?? '',
        r.event_reintervention || 0, r.event_death || 0,
        r.reintervention_date || '', r.death_date || '', r.last_followup_date || ''
      ].join(','))
    ].join('\n');
    window.electronAPI.saveFile(csv, 'time_to_event_R_ready.csv',
      [{ name: 'CSV Files', extensions: ['csv'] }]);
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'Total Procedures', value: data.length, color: '#2563eb' },
          { label: 'Events (Reintervention/Death)', value: eventCount, color: '#ef4444' },
          { label: 'Event Rate', value: data.length ? `${((eventCount / data.length) * 100).toFixed(1)}%` : '—', color: '#f59e0b' },
          { label: 'Median Follow-up', value: medDays ? `${medDays}d` : '—', color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Time-to-Event ({data.length} procedures)</div>
          <div className="btn-group">
            <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>
              Columns: days_to_event · event_reintervention · event_death
            </span>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>⬇ Export R-ready CSV</button>
          </div>
        </div>
        <div style={{ padding: '6px 16px', fontSize: 12, color: '#64748b' }}>
          Import into R: <code style={{ color: '#60a5fa' }}>read.csv("file.csv")</code> then{' '}
          <code style={{ color: '#60a5fa' }}>Surv(days_to_event, event_reintervention)</code> for Kaplan-Meier.
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th><th>MRN</th><th>Procedure</th><th>Date</th>
                <th>Days</th><th>Reintervention</th><th>Death</th><th>Last F/U</th>
              </tr>
            </thead>
            <tbody>
              {data.map(d => (
                <tr key={d.procedure_id}>
                  <td>{d.patient_name}</td>
                  <td><span className="badge badge-secondary">{d.mrn}</span></td>
                  <td style={{ fontSize: 12 }}>{d.procedure_type}</td>
                  <td>{d.procedure_date}</td>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{d.days_to_event ?? '—'}</td>
                  <td>{d.event_reintervention ? <span className="badge badge-danger">Yes</span> : <span style={{ color: '#10b981', fontSize: 12 }}>No</span>}</td>
                  <td>{d.event_death ? <span className="badge badge-danger">Yes</span> : <span style={{ color: '#10b981', fontSize: 12 }}>No</span>}</td>
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

// ─── Table 2 Engine ───────────────────────────────────────────────────────────

const TABLE2_30DAY = [
  { key: 'mace',             label: 'MACE (Death / MI / Stroke)' },
  { key: 'death_30_day',     label: 'All-cause mortality' },
  { key: 'stroke',           label: 'Stroke / TIA' },
  { key: 'mi',               label: 'Myocardial infarction' },
  { key: 'aki',              label: 'AKI (renal failure / dialysis)' },
  { key: 'major_bleeding',   label: 'Major bleeding (requiring transfusion)' },
  { key: 'reoperation',      label: 'Reoperation / reintervention' },
  { key: 'amputation_30d',   label: 'Amputation (30-day)' },
  { key: 'technical_success',label: 'Technical success', invertColor: true },
];

const TABLE2_TTE = [
  { key: 'primary_patency',   label: 'Primary patency',   eventDateKey: 'primary_patency_loss_date' },
  { key: 'secondary_patency', label: 'Secondary patency',  eventDateKey: 'secondary_patency_loss_date' },
  { key: 'limb_salvage',      label: 'Limb salvage',       eventDateKey: 'major_amputation_date' },
  { key: 'overall_survival',  label: 'Overall survival',   eventDateKey: 'death_date_fu' },
];

function daysBetween(dateA, dateB) {
  if (!dateA || !dateB) return null;
  const d = Math.round((new Date(dateB) - new Date(dateA)) / 86400000);
  return d >= 0 ? d : null;
}

function buildTTEData(rows, eventDateKey) {
  return rows.map(r => {
    const eventDate = r[eventDateKey];
    const refDate = r.procedure_date;
    const lastFU = r.last_followup_date;
    if (!refDate) return null;
    const time = eventDate
      ? (daysBetween(refDate, eventDate) ?? 0)
      : (lastFU ? (daysBetween(refDate, lastFU) ?? 0) : r.days_since_procedure ?? 0);
    return { time: Math.max(0, time), status: eventDate ? 1 : 0 };
  }).filter(Boolean);
}

function fmtCI(res) {
  if (!res) return '—';
  return `${res.OR ?? res.HR} (${res.CI_lo}–${res.CI_hi})`;
}

// ─── Table 2 View ─────────────────────────────────────────────────────────────

function Table2View({ data }) {
  const { rowsA, rowsB, groupALabel, groupBLabel, twoGroup } = data;
  const nA = rowsA.length, nB = rowsB?.length ?? 0;
  const [showMissMap, setShowMissMap] = useState(false);

  // ── 30-day stats ──────────────────────────────────────────────────────────
  function count30(rows, key) {
    const events = rows.filter(r => r[key] === 1).length;
    const pct = rows.length ? ((events / rows.length) * 100).toFixed(1) : '—';
    return { events, n: rows.length, pct };
  }

  const rows30 = TABLE2_30DAY.map(def => {
    const cA = count30(rowsA, def.key);
    const cB = twoGroup ? count30(rowsB, def.key) : null;
    const or = (twoGroup && cA && cB)
      ? oddsRatio(cA.events, cA.n - cA.events, cB.events, cB.n - cB.events)
      : null;
    return { ...def, cA, cB, or };
  });

  // ── TTE stats ─────────────────────────────────────────────────────────────
  const rowsTTE = TABLE2_TTE.map(def => {
    const tteA = buildTTEData(rowsA, def.eventDateKey);
    const tteB = twoGroup ? buildTTEData(rowsB, def.eventDateKey) : null;
    const kmA = kaplanMeier(tteA);
    const kmB = tteB ? kaplanMeier(tteB) : null;
    const medA = medianSurvival(kmA);
    const medB = kmB ? medianSurvival(kmB) : null;
    const eventsA = tteA.filter(d => d.status === 1).length;
    const eventsB = tteB ? tteB.filter(d => d.status === 1).length : null;
    const lr = (twoGroup && tteB) ? logRankTest(tteA, tteB) : null;
    const cox = (twoGroup && tteB) ? coxPH(tteA, tteB) : null;
    return { ...def, tteA, tteB, kmA, kmB, medA, medB, eventsA, eventsB, lr, cox };
  });

  // ── Missingness map ───────────────────────────────────────────────────────
  const allRows = twoGroup ? [...rowsA, ...rowsB] : rowsA;
  function missingKey(r) {
    const needsFollowup = r.days_since_procedure > 365;
    const miss1yr = needsFollowup && !r.has_1yr_followup;
    const missABI = needsFollowup && r.abi_1yr == null;
    const noFollowup = r.total_followups === 0 && r.days_since_procedure > 30;
    return { miss1yr, missABI, noFollowup, anyMissing: miss1yr || missABI || noFollowup };
  }
  const missingRows = allRows.filter(r => missingKey(r).anyMissing);

  // ── CSV export ────────────────────────────────────────────────────────────
  function exportCSV() {
    const tteA_pp = buildTTEData(rowsA, 'primary_patency_loss_date');
    const tteA_amp = buildTTEData(rowsA, 'major_amputation_date');
    const tteA_death = buildTTEData(rowsA, 'death_date_fu');
    const tteB_pp = rowsB ? buildTTEData(rowsB, 'primary_patency_loss_date') : [];
    const tteB_amp = rowsB ? buildTTEData(rowsB, 'major_amputation_date') : [];
    const tteB_death = rowsB ? buildTTEData(rowsB, 'death_date_fu') : [];

    const header = 'Patient_ID,MRN,Patient_Name,Procedure_ID,Procedure_Type,Procedure_Date,Group,' +
      'Death_30Day,MI_30Day,Stroke_30Day,AKI_30Day,Major_Bleeding,Reoperation,Technical_Success,' +
      'Primary_Patency_Days,Primary_Patency_Status,' +
      'Secondary_Patency_Days,Secondary_Patency_Status,' +
      'Major_Amputation_Days,Major_Amputation_Status,' +
      'Death_Days,Death_Status,Last_Followup_Date,Has_1Yr_Followup,ABI_1Yr';

    function toTTERow(rows, key) {
      return rows.map(r => {
        const tte = buildTTEData([r], key)[0];
        return tte ? `${tte.time},${tte.status}` : ',';
      });
    }

    const buildRows = (rows, label) => rows.map((r, i) => {
      const pp = buildTTEData([r], 'primary_patency_loss_date')[0];
      const sp = buildTTEData([r], 'secondary_patency_loss_date')[0];
      const amp = buildTTEData([r], 'major_amputation_date')[0];
      const death = buildTTEData([r], 'death_date_fu')[0];
      return [
        r.patient_id, r.mrn, `"${r.patient_name}"`, r.procedure_id, `"${r.procedure_type}"`,
        r.procedure_date, label,
        r.death_30_day||0, r.mi||0, r.stroke||0, r.aki||0, r.major_bleeding||0,
        r.reoperation||0, r.technical_success||1,
        pp ? `${pp.time},${pp.status}` : ',',
        sp ? `${sp.time},${sp.status}` : ',',
        amp ? `${amp.time},${amp.status}` : ',',
        death ? `${death.time},${death.status}` : ',',
        r.last_followup_date||'', r.has_1yr_followup||0, r.abi_1yr ?? ''
      ].join(',');
    });

    const csv = [header,
      ...buildRows(rowsA, twoGroup ? groupALabel : 'Overall'),
      ...(rowsB ? buildRows(rowsB, groupBLabel) : [])
    ].join('\n');

    window.electronAPI.saveFile(csv, 'Table2_outcomes_R_ready.csv',
      [{ name: 'CSV Files', extensions: ['csv'] }]);
  }

  const pFmt = (res) => res ? formatP(res.p) : '—';
  const pClr = (res) => res ? pColor(res.p) : '#64748b';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <span style={{ fontWeight: 700, color: '#e2e8f0' }}>
            Table 2 — Perioperative & Longitudinal Outcomes
            {twoGroup ? ` (${groupALabel} vs ${groupBLabel})` : ` (n=${nA} procedures)`}
          </span>
          {missingRows.length > 0 && (
            <span style={{ marginLeft: 12, fontSize: 12, color: '#f59e0b', cursor: 'pointer',
              textDecoration: 'underline' }}
              onClick={() => setShowMissMap(m => !m)}>
              ⚠ {missingRows.length} procedures missing 1-year data
            </span>
          )}
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={exportCSV}>⬇ Export R-ready CSV</button>
        </div>
      </div>

      {/* 30-Day Outcomes */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">30-Day Perioperative Outcomes</div>
          {twoGroup && (
            <span style={{ fontSize: 12, color: '#64748b' }}>
              OR = Odds Ratio (Group B vs Group A) · 95% CI · Wald p-value
            </span>
          )}
        </div>
        <div className="table-container">
          <table className="data-table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ width: '34%' }}>Outcome</th>
                <th>{twoGroup ? groupALabel : 'Overall'}<br />
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>n = {nA}</span>
                </th>
                {twoGroup && (
                  <>
                    <th>{groupBLabel}<br />
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>n = {nB}</span>
                    </th>
                    <th>OR (95% CI)</th>
                    <th>p-value</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows30.map(row => {
                const danger = !row.invertColor && row.cA?.events > 0;
                const pRes = row.or;
                return (
                  <tr key={row.key}>
                    <td style={{ fontWeight: row.key === 'mace' ? 700 : 400 }}>{row.label}</td>
                    <td style={{ color: danger ? '#fca5a5' : '#e2e8f0', fontFamily: 'monospace' }}>
                      {row.cA ? `${row.cA.events}/${row.cA.n} (${row.cA.pct}%)` : '—'}
                    </td>
                    {twoGroup && (
                      <>
                        <td style={{ color: !row.invertColor && row.cB?.events > 0 ? '#fca5a5' : '#e2e8f0', fontFamily: 'monospace' }}>
                          {row.cB ? `${row.cB.events}/${row.cB.n} (${row.cB.pct}%)` : '—'}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtCI(pRes)}</td>
                        <td style={{ fontWeight: 700, color: pClr(pRes), fontFamily: 'monospace' }}>
                          {pFmt(pRes)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '6px 16px', fontSize: 11, color: '#475569', borderTop: '1px solid #1e293b' }}>
          MACE = Major Adverse Cardiovascular Event (Death OR MI OR Stroke) ·
          AKI = Acute Kidney Injury (renal failure or dialysis required) ·
          {twoGroup ? ' OR with Haldane-Anscombe correction for zero cells' : ''}
        </div>
      </div>

      {/* Time-to-Event */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">Longitudinal Outcomes (Time-to-Event)</div>
          {twoGroup && (
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Log-Rank p · HR = Hazard Ratio (Group B vs A) · Cox PH Breslow
            </span>
          )}
        </div>
        <div className="table-container">
          <table className="data-table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Outcome</th>
                <th>Events A</th>
                <th>Median (days)</th>
                {twoGroup && (
                  <>
                    <th>Events B</th>
                    <th>Median B (days)</th>
                    <th>Log-Rank p</th>
                    <th>HR (95% CI)</th>
                    <th>HR p</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rowsTTE.map(row => {
                const pLR = row.lr;
                const pCox = row.cox;
                return (
                  <tr key={row.key}>
                    <td style={{ fontWeight: 600 }}>{row.label}</td>
                    <td style={{ fontFamily: 'monospace' }}>
                      {row.eventsA}/{row.tteA.length}
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        {' '}({row.tteA.length ? ((row.eventsA / row.tteA.length) * 100).toFixed(1) : 0}%)
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>
                      {row.medA != null ? `${row.medA}d` : 'NR'}
                    </td>
                    {twoGroup && (
                      <>
                        <td style={{ fontFamily: 'monospace' }}>
                          {row.eventsB}/{row.tteB?.length ?? 0}
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            {' '}({row.tteB?.length ? ((row.eventsB / row.tteB.length) * 100).toFixed(1) : 0}%)
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>
                          {row.medB != null ? `${row.medB}d` : 'NR'}
                        </td>
                        <td style={{ fontWeight: 700, color: pClr(pLR), fontFamily: 'monospace' }}>
                          {pFmt(pLR)}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtCI(pCox)}</td>
                        <td style={{ fontWeight: 700, color: pClr(pCox), fontFamily: 'monospace' }}>
                          {pFmt(pCox)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '6px 16px', fontSize: 11, color: '#475569', borderTop: '1px solid #1e293b' }}>
          NR = Not Reached (median survival not crossed 50% threshold) ·
          Log-Rank: Mantel-Cox χ² test · HR: univariate Cox PH (Breslow) ·
          Primary patency loss = reintervention or graft occlusion ·
          Limb salvage loss = major amputation (BKA/AKA)
        </div>
      </div>

      {/* Missingness Map */}
      {(showMissMap || missingRows.length > 0) && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid #f59e0b' }}>
          <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setShowMissMap(m => !m)}>
            <div className="card-title" style={{ color: '#f59e0b' }}>
              ⚠ Missingness Map ({missingRows.length} procedures with incomplete follow-up)
            </div>
            <span style={{ fontSize: 12, color: '#64748b' }}>{showMissMap ? '▲ Collapse' : '▼ Expand'}</span>
          </div>
          {showMissMap && (
            <>
              <div style={{ padding: '8px 16px', fontSize: 12, color: '#f59e0b', background: '#1c1400' }}>
                Highlighted rows are missing critical 1-year follow-up data. Patients highlighted in yellow
                should be contacted before submitting for publication. Missing ABI at 1 year indicates
                incomplete patency assessment.
              </div>
              <div className="table-container">
                <table className="data-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Patient</th><th>MRN</th><th>Procedure</th><th>Date</th>
                      <th>Days Since</th><th>Total F/U</th><th>1-Yr F/U</th><th>ABI @ 1yr</th><th>Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingRows.map(r => {
                      const m = missingKey(r);
                      return (
                        <tr key={r.procedure_id} style={{ background: '#2d2200' }}>
                          <td style={{ color: '#fde047' }}>{r.patient_name}</td>
                          <td><span className="badge badge-secondary">{r.mrn}</span></td>
                          <td>{r.procedure_type}</td>
                          <td>{r.procedure_date}</td>
                          <td style={{ fontFamily: 'monospace' }}>{r.days_since_procedure}d</td>
                          <td style={{ fontFamily: 'monospace' }}>{r.total_followups}</td>
                          <td>
                            {r.has_1yr_followup
                              ? <span className="badge badge-success">Yes</span>
                              : <span style={{ color: '#ef4444', fontWeight: 700 }}>Missing</span>}
                          </td>
                          <td>
                            {r.abi_1yr != null
                              ? <span style={{ color: '#10b981' }}>{r.abi_1yr}</span>
                              : <span style={{ color: '#ef4444', fontWeight: 700 }}>Missing</span>}
                          </td>
                          <td style={{ fontSize: 11 }}>
                            {[m.miss1yr && '❌ No 1-yr F/U', m.missABI && '❌ No ABI',
                              m.noFollowup && '❌ No follow-ups at all'].filter(Boolean).join(' · ')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Export note */}
      <div style={{ padding: '8px 12px', background: '#0f172a', borderRadius: 6, fontSize: 12, color: '#64748b' }}>
        <strong style={{ color: '#60a5fa' }}>R import:</strong>{' '}
        <code style={{ color: '#a78bfa' }}>df &lt;- read.csv("Table2_outcomes_R_ready.csv")</code>
        {' · '}
        <code style={{ color: '#a78bfa' }}>survfit(Surv(Primary_Patency_Days, Primary_Patency_Status) ~ Group, data=df)</code>
        {' · '}
        Compatible with <strong style={{ color: '#e2e8f0' }}>GraphPad Prism</strong> (survival analysis → import CSV).
      </div>
    </div>
  );
}
