import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';
import WoundPhotos from '../photos/WoundPhotos';

// Procedure types and nosology modules are loaded from the database at runtime.

const EMPTY_PROC = {
  patient_id: '', procedure_type: '', procedure_date: new Date().toISOString().slice(0,10),
  surgeon_id: '', assistant: '', hospital: 'Main Hospital', urgency: 'Elective',
  anesthesia_type: '', indication: '', symptom_status: '', admission_type: 'Inpatient',
  preop_imaging: '', stenosis_percent: '', aneurysm_diameter: '', aneurysm_growth_rate: '',
  abi_preop: '', toe_pressure: '', rutherford_class: '', wound_classification: '',
  infection_present: 0, tissue_loss: 0, baseline_creatinine: '', hemoglobin: '', platelet_count: '', notes: ''
};

const EMPTY_INTRAOP = {
  procedure_start: '', procedure_end: '', duration_minutes: '', blood_loss_ml: '',
  fluoroscopy_time: '', contrast_volume: '', heparin_used: 0, heparin_dose: '',
  protamine_used: 0, graft_type: '', device_name: '', device_manufacturer: '',
  device_lot: '', technical_success: 1, conversion_to_open: 0,
  arterial_dissection: 0, embolization: 0, arterial_rupture: 0,
  device_failure: 0, graft_thrombosis: 0, arrhythmia: 0,
  hypotension: 0, intraop_bleeding: 0, cardiac_arrest: 0, other_complication: ''
};

const EMPTY_POSTOP = {
  icu_admission: 0, icu_days: '', hospital_days: '',
  stroke: 0, stroke_type: '', myocardial_infarction: 0, renal_failure: 0,
  dialysis_required: 0, respiratory_failure: 0, pneumonia: 0, sepsis: 0,
  deep_wound_infection: 0, superficial_wound_infection: 0,
  bleeding_requiring_transfusion: 0, units_transfused: '',
  graft_occlusion: 0, limb_ischemia: 0, reoperation: 0,
  amputation: 0, amputation_level: '',
  death_in_hospital: 0, death_30_day: 0, cause_of_death: '',
  discharge_status: '', discharge_aspirin: 0, discharge_statin: 0,
  discharge_anticoagulant: 0, discharge_antiplatelet: 0,
  followup_scheduled: 0, followup_date: ''
};

const EMPTY_EVAR = {
  aneurysm_diameter_mm: '', aneurysm_location: '', rupture_status: '',
  neck_length_mm: '', neck_diameter_mm: '', neck_angulation: '',
  max_iliac_diameter_mm: '', iliac_aneurysm: 0,
  endograft_manufacturer: '', endograft_model: '',
  main_body_diameter: '', proximal_fixation: '',
  endoleak_detected: 0, endoleak_type: '', technical_success_evar: 1, iliac_extension_used: 0
};

const EMPTY_CAROTID = {
  symptomatic: 0, symptom_type: '', stenosis_percent: '', contralateral_stenosis: '',
  procedure_subtype: '', cea_technique: '', shunt_used: 0, shunt_type: '',
  patch_used: 0, patch_type: '', clamp_time_minutes: '',
  cranial_nerve_injury: 0, cranial_nerve_type: '',
  periop_stroke: 0, periop_stroke_side: '',
  restenosis_50_followup: 0, hyperperfusion_syndrome: 0
};

const EMPTY_PAD = {
  indication: '', rutherford_class: '', wifi_wound_score: '', wifi_ischemia_score: '', wifi_infection_score: '',
  inflow_artery: '', outflow_artery: '', conduit_type: '',
  graft_diameter_mm: '', proximal_anastomosis: '', distal_anastomosis: '',
  abi_preop: '', abi_postop: '', toe_pressure_preop: '', toe_pressure_postop: '',
  primary_patency: 1, assisted_patency: 0, secondary_patency: 0,
  limb_salvage: 1, major_amputation: 0, minor_amputation: 0,
  stent_used: 0, stent_type: '', balloon_size_mm: '',
  lesion_length_cm: '', tasc_classification: ''
};

const EMPTY_VENOUS = {
  ceap_clinical: '', ceap_etiology: '', ceap_anatomy: '', ceap_pathophysiology: '',
  vcss_pain: 0, vcss_varicose_veins: 0, vcss_venous_edema: 0, vcss_skin_pigmentation: 0,
  vcss_inflammation: 0, vcss_induration: 0, vcss_ulcer_active: 0,
  vcss_ulcer_duration: 0, vcss_ulcer_size: 0, vcss_compression_use: 0,
  vein_treated: '', technique: '', closure_length_cm: '', foam_volume_ml: '',
  recurrence: 0, notes: ''
};

export default function ProcedureForm({ procedureId, patientId }) {
  const { navigate, notify } = useApp();
  const [tab, setTab] = useState('procedure');
  const [surgeons, setSurgeons] = useState([]);
  const [allProcedureTypes, setAllProcedureTypes] = useState([]);
  const [proc, setProc] = useState({ ...EMPTY_PROC, patient_id: patientId || '' });
  const [intraop, setIntraop] = useState(EMPTY_INTRAOP);
  const [postop, setPostop] = useState(EMPTY_POSTOP);
  const [evar, setEvar] = useState(EMPTY_EVAR);
  const [carotid, setCarotid] = useState(EMPTY_CAROTID);
  const [pad, setPad] = useState(EMPTY_PAD);
  const [venous, setVenous] = useState(EMPTY_VENOUS);
  const [loading, setLoading] = useState(!!procedureId);
  const [saving, setSaving] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const isEdit = !!procedureId;
  const procType = proc.procedure_type;
  const typesByModule = (mod) => allProcedureTypes.filter(t => t.module === mod && t.active).map(t => t.name);
  const showCarotid = typesByModule('carotid').includes(procType);
  const showEvar    = typesByModule('evar').includes(procType);
  const showPad     = typesByModule('pad').includes(procType);
  const showVenous  = typesByModule('venous').includes(procType);

  useEffect(() => {
    loadSurgeons();
    loadProcedureTypes();
    if (procedureId) loadProcedure();
  }, [procedureId]);

  useEffect(() => {
    if (patientId) {
      window.electronAPI.getPatientById(patientId).then(res => {
        if (res.success && res.data) setSelectedPatient(res.data);
      });
    }
  }, [patientId]);

  async function loadSurgeons() {
    const res = await window.electronAPI.getSurgeons();
    if (res.success) setSurgeons(res.data);
  }

  async function loadProcedureTypes() {
    const res = await window.electronAPI.getProcedureTypes();
    if (res.success) setAllProcedureTypes(res.data);
  }

  async function loadProcedure() {
    setLoading(true);
    const res = await window.electronAPI.getProcedureById(procedureId);
    if (res.success && res.data) {
      const d = res.data;
      // Exclude joined/computed fields that don't belong to the procedures table
      const { patient_name, mrn, date_of_birth, sex, surgeon_name,
              intraoperative, postoperative, followups,
              evar_module, carotid_module, pad_module, venous_module,
              ...procFields } = d;
      setProc({ ...EMPTY_PROC, ...stripNulls(procFields) });
      if (intraoperative) setIntraop({ ...EMPTY_INTRAOP, ...stripNulls(intraoperative) });
      if (postoperative) setPostop({ ...EMPTY_POSTOP, ...stripNulls(postoperative) });
      if (evar_module) setEvar({ ...EMPTY_EVAR, ...stripNulls(evar_module) });
      if (carotid_module) setCarotid({ ...EMPTY_CAROTID, ...stripNulls(carotid_module) });
      if (pad_module) setPad({ ...EMPTY_PAD, ...stripNulls(pad_module) });
      if (venous_module) setVenous({ ...EMPTY_VENOUS, ...stripNulls(venous_module) });
    }
    setLoading(false);
  }

  function stripNulls(obj) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === null ? '' : v]));
  }

  async function searchPatients(query) {
    setPatientSearch(query);
    if (!query || query.length < 2) { setPatientResults([]); setShowPatientDropdown(false); return; }
    const res = await window.electronAPI.getPatients({ search: query });
    if (res.success) {
      setPatientResults(res.data.slice(0, 8));
      setShowPatientDropdown(true);
    }
  }

  function selectPatient(p) {
    setSelectedPatient(p);
    setProc(o => ({ ...o, patient_id: p.patient_id }));
    setPatientSearch('');
    setPatientResults([]);
    setShowPatientDropdown(false);
  }

  function clearPatient() {
    setSelectedPatient(null);
    setProc(o => ({ ...o, patient_id: '' }));
  }

  function cleanObj(obj) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v]));
  }

  function setF(setter) { return (field, val) => setter(o => ({ ...o, [field]: val })); }
  function toggle(setter, field) { setter(o => ({ ...o, [field]: o[field] ? 0 : 1 })); }

  async function handleSave() {
    if (!proc.procedure_type || !proc.procedure_date || !proc.patient_id) {
      notify('Please fill in Procedure Type, Date, and Patient ID', 'error');
      setTab('procedure');
      return;
    }
    setSaving(true);
    try {
      const data = {
        ...cleanObj(proc),
        intraoperative: cleanObj(intraop),
        postoperative: cleanObj(postop),
        ...(showEvar ? { evar_module: cleanObj(evar) } : {}),
        ...(showCarotid ? { carotid_module: cleanObj(carotid) } : {}),
        ...(showPad ? { pad_module: cleanObj(pad) } : {}),
        ...(showVenous ? { venous_module: cleanObj(venous) } : {}),
      };
      let res;
      if (isEdit) {
        res = await window.electronAPI.updateProcedure(procedureId, data);
      } else {
        res = await window.electronAPI.createProcedure(data);
      }
      if (res.success) {
        notify(isEdit ? 'Procedure updated' : 'Procedure recorded successfully');
        if (!isEdit) {
          const pid = Number(proc.patient_id) || selectedPatient?.patient_id;
          if (pid) navigate('patient-edit', { patientId: pid, defaultTab: 'procedures' });
          else if (res.data?.procedure_id) navigate('procedure-edit', { procedureId: res.data.procedure_id });
        }
      } else {
        notify(res.error || 'Save failed', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: 'procedure', label: '📋 Procedure Info' },
    { id: 'preop', label: '🔎 Pre-operative' },
    { id: 'intraop', label: '⚕️ Intraoperative' },
    { id: 'postop', label: '🏥 Post-operative' },
    ...(showCarotid ? [{ id: 'carotid', label: '🧠 Carotid Module' }] : []),
    ...(showEvar ? [{ id: 'evar', label: '🫀 Aortic Module' }] : []),
    ...(showPad ? [{ id: 'pad', label: '🦵 PAD Module' }] : []),
    ...(showVenous ? [{ id: 'venous', label: '🩸 Venous Module' }] : []),
    ...(isEdit ? [{ id: 'devices', label: '🔩 Devices' }, { id: 'photos', label: '📸 Wound Photos' }] : []),
  ];

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ textAlign: 'center', color: '#64748b' }}>Loading procedure...</div>
    </div>
  );

  return (
    <div className="page-wide" style={{ padding: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Procedure' : 'Record New Procedure'}</h1>
          {proc.procedure_type && <p className="page-subtitle">{proc.procedure_type}</p>}
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={() => {
            const pid = Number(proc.patient_id) || selectedPatient?.patient_id;
            pid ? navigate('patient-edit', { patientId: pid }) : navigate('patients');
          }}>← Back</button>
          {isEdit && (
            <button className="btn btn-secondary" onClick={() => navigate('followup', { procedureId })}>
              📅 Follow-ups
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner-sm"></span> Saving...</> : isEdit ? '💾 Save Changes' : '✅ Record Procedure'}
          </button>
        </div>
      </div>

      {selectedPatient && (
        <div style={{ display:'flex', alignItems:'center', gap:12, background:'#1e3a5f', border:'1px solid #2563eb', borderRadius:8, padding:'10px 16px', marginBottom:16 }}>
          <span style={{ fontSize:20 }}>👤</span>
          <div style={{ flex:1 }}>
            <span style={{ fontWeight:600, color:'#93c5fd' }}>
              {selectedPatient.first_name} {selectedPatient.last_name}
            </span>
            <span style={{ color:'#64748b', margin:'0 8px' }}>|</span>
            <span style={{ color:'#94a3b8', fontSize:13 }}>MRN: {selectedPatient.mrn}</span>
            {selectedPatient.date_of_birth && (
              <>
                <span style={{ color:'#64748b', margin:'0 8px' }}>|</span>
                <span style={{ color:'#94a3b8', fontSize:13 }}>
                  DOB: {selectedPatient.date_of_birth}
                </span>
              </>
            )}
          </div>
          {!patientId && (
            <button className="btn btn-secondary" style={{ padding:'4px 10px', fontSize:12 }} onClick={clearPatient}>
              Change Patient
            </button>
          )}
        </div>
      )}

      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'procedure' && <ProcedureInfoTab proc={proc} setProc={setProc} surgeons={surgeons} allProcedureTypes={allProcedureTypes} setF={setF(setProc)}
        selectedPatient={selectedPatient} patientSearch={patientSearch} onPatientSearch={searchPatients}
        patientResults={patientResults} showPatientDropdown={showPatientDropdown}
        onSelectPatient={selectPatient} onCloseDropdown={() => setShowPatientDropdown(false)} />}
      {tab === 'preop' && <PreopTab proc={proc} setF={setF(setProc)} />}
      {tab === 'intraop' && <IntraopTab data={intraop} setF={setF(setIntraop)} toggle={(f) => toggle(setIntraop, f)} procType={procType} />}
      {tab === 'postop' && <PostopTab data={postop} setF={setF(setPostop)} toggle={(f) => toggle(setPostop, f)} />}
      {tab === 'carotid' && showCarotid && <CarotidModuleTab data={carotid} setF={setF(setCarotid)} toggle={(f) => toggle(setCarotid, f)} />}
      {tab === 'evar' && showEvar && <EvarModuleTab data={evar} setF={setF(setEvar)} toggle={(f) => toggle(setEvar, f)} procType={procType} />}
      {tab === 'pad' && showPad && <PADModuleTab data={pad} setF={setF(setPad)} toggle={(f) => toggle(setPad, f)} />}
      {tab === 'venous' && showVenous && <VenousModuleTab data={venous} setF={setF(setVenous)} toggle={(f) => toggle(setVenous, f)} />}
      {tab === 'devices' && isEdit && <DevicesTab procedureId={procedureId} />}
      {tab === 'photos' && isEdit && <WoundPhotos procedureId={procedureId} patientId={proc.patient_id || selectedPatient?.patient_id} />}
    </div>
  );
}

function ProcedureInfoTab({ proc, setProc, surgeons, allProcedureTypes, setF, selectedPatient, patientSearch, onPatientSearch, patientResults, showPatientDropdown, onSelectPatient, onCloseDropdown }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="form-grid form-grid-3">
          <div className="section-header">Procedure Identification</div>

          {!selectedPatient && (
            <div className="form-group" style={{ position:'relative' }}>
              <label className="form-label required">Patient</label>
              <input className="form-input" type="text" value={patientSearch}
                onChange={e => onPatientSearch(e.target.value)}
                onBlur={() => setTimeout(onCloseDropdown, 200)}
                placeholder="Search by name or MRN..." />
              {showPatientDropdown && patientResults.length > 0 && (
                <div style={{ position:'absolute', zIndex:100, top:'100%', left:0, right:0, background:'#1e2a3a', border:'1px solid #334155', borderRadius:6, boxShadow:'0 4px 16px rgba(0,0,0,0.4)', maxHeight:260, overflowY:'auto' }}>
                  {patientResults.map(p => (
                    <div key={p.patient_id}
                      style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid #1e293b' }}
                      onMouseDown={() => onSelectPatient(p)}
                      onMouseEnter={e => e.currentTarget.style.background='#263548'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <div style={{ fontWeight:600, color:'#e2e8f0' }}>{p.first_name} {p.last_name}</div>
                      <div style={{ fontSize:12, color:'#64748b' }}>MRN: {p.mrn}{p.date_of_birth ? ` · DOB: ${p.date_of_birth}` : ''}</div>
                    </div>
                  ))}
                </div>
              )}
              {showPatientDropdown && patientResults.length === 0 && patientSearch.length >= 2 && (
                <div style={{ position:'absolute', zIndex:100, top:'100%', left:0, right:0, background:'#1e2a3a', border:'1px solid #334155', borderRadius:6, padding:'12px 14px', color:'#64748b', fontSize:13 }}>
                  No patients found. <a href="#" style={{ color:'#60a5fa' }} onMouseDown={e => { e.preventDefault(); }}>Create a new patient first.</a>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label required">Procedure Type</label>
            <select className="form-select" value={proc.procedure_type}
              onChange={e => setF('procedure_type', e.target.value)}>
              <option value="">Select procedure type...</option>
              {allProcedureTypes.filter(t => t.active).map(t => <option key={t.type_id} value={t.name}>{t.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label required">Procedure Date</label>
            <input className="form-input" type="date" value={proc.procedure_date}
              onChange={e => setF('procedure_date', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Urgency</label>
            <select className="form-select" value={proc.urgency} onChange={e => setF('urgency', e.target.value)}>
              <option>Elective</option><option>Urgent</option><option>Emergency</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Surgeon</label>
            <select className="form-select" value={proc.surgeon_id} onChange={e => setF('surgeon_id', e.target.value)}>
              <option value="">Select surgeon...</option>
              {surgeons.map(s => <option key={s.surgeon_id} value={s.surgeon_id}>
                Dr. {s.first_name} {s.last_name}
              </option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Assistant</label>
            <input className="form-input" value={proc.assistant}
              onChange={e => setF('assistant', e.target.value)} placeholder="Resident, PA, or NP name" />
          </div>

          <div className="form-group">
            <label className="form-label">Anesthesia Type</label>
            <select className="form-select" value={proc.anesthesia_type} onChange={e => setF('anesthesia_type', e.target.value)}>
              <option value="">Select...</option>
              <option>General</option><option>Regional</option><option>Local</option><option>Monitored</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Admission Type</label>
            <select className="form-select" value={proc.admission_type} onChange={e => setF('admission_type', e.target.value)}>
              <option>Inpatient</option><option>Outpatient</option><option>Transfer</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Hospital / Site</label>
            <input className="form-input" value={proc.hospital}
              onChange={e => setF('hospital', e.target.value)} placeholder="Hospital name" />
          </div>

          <div className="form-group full-width">
            <label className="form-label">Indication / Clinical Summary</label>
            <textarea className="form-textarea" value={proc.indication}
              onChange={e => setF('indication', e.target.value)}
              placeholder="Clinical indication for procedure, relevant history..." />
          </div>

          <div className="form-group full-width">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={proc.notes}
              onChange={e => setF('notes', e.target.value)} placeholder="Additional notes..." />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreopTab({ proc, setF }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="form-grid form-grid-3">
          <div className="section-header">Symptom Status</div>
          <div className="form-group">
            <label className="form-label">Symptomatic Status</label>
            <div className="yn-group">
              <button className={`yn-btn ${proc.symptom_status === 'Symptomatic' ? 'active-yes' : ''}`}
                onClick={() => setF('symptom_status', 'Symptomatic')}>Symptomatic</button>
              <button className={`yn-btn ${proc.symptom_status === 'Asymptomatic' ? 'active-no' : ''}`}
                onClick={() => setF('symptom_status', 'Asymptomatic')}>Asymptomatic</button>
            </div>
          </div>
          <div></div><div></div>

          <div className="section-header">Preoperative Imaging</div>
          <div className="form-group full-width">
            <label className="form-label">Imaging Performed</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Duplex Ultrasound','CTA','MRA','Conventional Angiography','Plain X-Ray'].map(img => (
                <label key={img} className="checkbox-label" style={{ minWidth: 'auto' }}>
                  <input type="checkbox"
                    checked={proc.preop_imaging?.includes(img)}
                    onChange={e => {
                      const current = proc.preop_imaging ? proc.preop_imaging.split(',') : [];
                      const next = e.target.checked ? [...current, img] : current.filter(x => x !== img);
                      setF('preop_imaging', next.join(','));
                    }} />
                  {img}
                </label>
              ))}
            </div>
          </div>

          <div className="section-header">Vascular Measurements</div>
          <div className="form-group">
            <label className="form-label">Stenosis Degree (%)</label>
            <input className="form-input" type="number" min="0" max="100" value={proc.stenosis_percent}
              onChange={e => setF('stenosis_percent', e.target.value)} placeholder="e.g., 70" />
          </div>
          <div className="form-group">
            <label className="form-label">Aneurysm Diameter (cm)</label>
            <input className="form-input" type="number" step="0.1" value={proc.aneurysm_diameter}
              onChange={e => setF('aneurysm_diameter', e.target.value)} placeholder="e.g., 5.5" />
          </div>
          <div className="form-group">
            <label className="form-label">Aneurysm Growth Rate (cm/yr)</label>
            <input className="form-input" type="number" step="0.1" value={proc.aneurysm_growth_rate}
              onChange={e => setF('aneurysm_growth_rate', e.target.value)} placeholder="e.g., 0.5" />
          </div>
          <div className="form-group">
            <label className="form-label">Ankle-Brachial Index (ABI)</label>
            <input className="form-input" type="number" step="0.01" min="0" max="2" value={proc.abi_preop}
              onChange={e => setF('abi_preop', e.target.value)} placeholder="e.g., 0.65" />
          </div>
          <div className="form-group">
            <label className="form-label">Toe Pressure (mmHg)</label>
            <input className="form-input" type="number" value={proc.toe_pressure}
              onChange={e => setF('toe_pressure', e.target.value)} placeholder="e.g., 40" />
          </div>
          <div className="form-group">
            <label className="form-label">Rutherford Classification</label>
            <select className="form-select" value={proc.rutherford_class} onChange={e => setF('rutherford_class', e.target.value)}>
              <option value="">Select...</option>
              <option value="0">0 - Asymptomatic</option>
              <option value="1">1 - Mild claudication</option>
              <option value="2">2 - Moderate claudication</option>
              <option value="3">3 - Severe claudication</option>
              <option value="4">4 - Rest pain</option>
              <option value="5">5 - Minor tissue loss</option>
              <option value="6">6 - Major tissue loss</option>
            </select>
          </div>

          <div className="section-header">Laboratory Values</div>
          <div className="form-group">
            <label className="form-label">Baseline Creatinine (mg/dL)</label>
            <input className="form-input" type="number" step="0.1" value={proc.baseline_creatinine}
              onChange={e => setF('baseline_creatinine', e.target.value)} placeholder="e.g., 1.2" />
          </div>
          <div className="form-group">
            <label className="form-label">Hemoglobin (g/dL)</label>
            <input className="form-input" type="number" step="0.1" value={proc.hemoglobin}
              onChange={e => setF('hemoglobin', e.target.value)} placeholder="e.g., 12.5" />
          </div>
          <div className="form-group">
            <label className="form-label">Platelet Count (×10³/µL)</label>
            <input className="form-input" type="number" value={proc.platelet_count}
              onChange={e => setF('platelet_count', e.target.value)} placeholder="e.g., 250" />
          </div>

          <div className="section-header">Wound Status</div>
          <div className="form-group">
            <label className="form-label">Wound Classification</label>
            <select className="form-select" value={proc.wound_classification} onChange={e => setF('wound_classification', e.target.value)}>
              <option value="">Select...</option>
              <option>Clean</option><option>Clean-contaminated</option><option>Contaminated</option><option>Dirty</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Infection Present</label>
            <div className="yn-group">
              <button className={`yn-btn ${proc.infection_present ? 'active-yes' : ''}`} onClick={() => setF('infection_present', proc.infection_present ? 0 : 1)}>Yes</button>
              <button className={`yn-btn ${!proc.infection_present ? 'active-no' : ''}`} onClick={() => setF('infection_present', 0)}>No</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Tissue Loss</label>
            <div className="yn-group">
              <button className={`yn-btn ${proc.tissue_loss ? 'active-yes' : ''}`} onClick={() => setF('tissue_loss', proc.tissue_loss ? 0 : 1)}>Yes</button>
              <button className={`yn-btn ${!proc.tissue_loss ? 'active-no' : ''}`} onClick={() => setF('tissue_loss', 0)}>No</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntraopTab({ data, setF, toggle, procType }) {
  const showFluoro = EVAR_TYPES.includes(procType) || procType?.includes('Angioplasty') || procType?.includes('Stenting');

  return (
    <div className="card">
      <div className="card-body">
        <div className="form-grid form-grid-3">
          <div className="section-header">Procedure Timing</div>
          <div className="form-group">
            <label className="form-label">Start Time</label>
            <input className="form-input" type="time" value={data.procedure_start?.slice(11,16) || ''}
              onChange={e => setF('procedure_start', `${new Date().toISOString().slice(0,10)}T${e.target.value}:00`)} />
          </div>
          <div className="form-group">
            <label className="form-label">End Time</label>
            <input className="form-input" type="time" value={data.procedure_end?.slice(11,16) || ''}
              onChange={e => setF('procedure_end', `${new Date().toISOString().slice(0,10)}T${e.target.value}:00`)} />
          </div>
          <div className="form-group">
            <label className="form-label">Duration (minutes)</label>
            <input className="form-input" type="number" value={data.duration_minutes}
              onChange={e => setF('duration_minutes', e.target.value)} placeholder="e.g., 180" />
          </div>

          <div className="section-header">Operative Details</div>
          <div className="form-group">
            <label className="form-label">Blood Loss (mL)</label>
            <input className="form-input" type="number" value={data.blood_loss_ml}
              onChange={e => setF('blood_loss_ml', e.target.value)} placeholder="e.g., 200" />
          </div>
          {showFluoro && <>
            <div className="form-group">
              <label className="form-label">Fluoroscopy Time (min)</label>
              <input className="form-input" type="number" step="0.1" value={data.fluoroscopy_time}
                onChange={e => setF('fluoroscopy_time', e.target.value)} placeholder="e.g., 25.5" />
            </div>
            <div className="form-group">
              <label className="form-label">Contrast Volume (mL)</label>
              <input className="form-input" type="number" value={data.contrast_volume}
                onChange={e => setF('contrast_volume', e.target.value)} placeholder="e.g., 80" />
            </div>
          </>}

          <div className="section-header">Anticoagulation</div>
          <div className="form-group">
            <label className="form-label">Heparin Used</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.heparin_used ? 'active-yes' : ''}`} onClick={() => toggle('heparin_used')}>Yes</button>
              <button className={`yn-btn ${!data.heparin_used ? 'active-no' : ''}`} onClick={() => { if (data.heparin_used) toggle('heparin_used'); }}>No</button>
            </div>
          </div>
          {data.heparin_used ? (
            <div className="form-group">
              <label className="form-label">Heparin Dose (units)</label>
              <input className="form-input" type="number" value={data.heparin_dose}
                onChange={e => setF('heparin_dose', e.target.value)} placeholder="e.g., 5000" />
            </div>
          ) : <div></div>}
          <div className="form-group">
            <label className="form-label">Protamine Reversal</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.protamine_used ? 'active-yes' : ''}`} onClick={() => toggle('protamine_used')}>Yes</button>
              <button className={`yn-btn ${!data.protamine_used ? 'active-no' : ''}`} onClick={() => { if (data.protamine_used) toggle('protamine_used'); }}>No</button>
            </div>
          </div>

          <div className="section-header">Implants & Devices</div>
          <div className="form-group">
            <label className="form-label">Graft Type</label>
            <select className="form-select" value={data.graft_type} onChange={e => setF('graft_type', e.target.value)}>
              <option value="">Select...</option>
              <option>Great Saphenous Vein</option><option>Small Saphenous Vein</option>
              <option>Arm Vein</option><option>PTFE</option><option>Dacron</option>
              <option>Composite</option><option>Umbilical Vein</option><option>N/A</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Device Name</label>
            <input className="form-input" value={data.device_name}
              onChange={e => setF('device_name', e.target.value)} placeholder="e.g., Endurant II" />
          </div>
          <div className="form-group">
            <label className="form-label">Manufacturer</label>
            <input className="form-input" value={data.device_manufacturer}
              onChange={e => setF('device_manufacturer', e.target.value)} placeholder="e.g., Medtronic" />
          </div>
          <div className="form-group">
            <label className="form-label">Lot Number</label>
            <input className="form-input" value={data.device_lot}
              onChange={e => setF('device_lot', e.target.value)} placeholder="Device lot/serial" />
          </div>

          <div className="section-header">Technical Outcome</div>
          <div className="form-group">
            <label className="form-label">Technical Success</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.technical_success ? 'active-yes' : ''}`} onClick={() => setF('technical_success', 1)}>Yes</button>
              <button className={`yn-btn ${!data.technical_success ? 'active-no' : ''}`} onClick={() => setF('technical_success', 0)}>No</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Conversion to Open</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.conversion_to_open ? 'active-yes' : ''}`} onClick={() => toggle('conversion_to_open')}>Yes</button>
              <button className={`yn-btn ${!data.conversion_to_open ? 'active-no' : ''}`} onClick={() => { if (data.conversion_to_open) toggle('conversion_to_open'); }}>No</button>
            </div>
          </div>
          <div></div>

          <div className="section-header">Intraoperative Complications</div>
          <div className="form-group full-width">
            <div className="checkbox-group">
              {[
                ['arterial_dissection','Arterial Dissection'],
                ['embolization','Embolization'],
                ['arterial_rupture','Arterial Rupture'],
                ['device_failure','Device Failure'],
                ['graft_thrombosis','Graft Thrombosis'],
                ['arrhythmia','Arrhythmia'],
                ['hypotension','Hypotension'],
                ['intraop_bleeding','Significant Bleeding'],
                ['cardiac_arrest','Cardiac Arrest'],
              ].map(([field, label]) => (
                <label key={field} className="checkbox-label">
                  <input type="checkbox" checked={!!data[field]} onChange={() => toggle(field)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group full-width">
            <label className="form-label">Other Complication / Notes</label>
            <textarea className="form-textarea" value={data.other_complication}
              onChange={e => setF('other_complication', e.target.value)} placeholder="Describe any other intraoperative events..." />
          </div>
        </div>
      </div>
    </div>
  );
}

function PostopTab({ data, setF, toggle }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="form-grid form-grid-3">
          <div className="section-header">Hospital Course</div>
          <div className="form-group">
            <label className="form-label">ICU Admission</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.icu_admission ? 'active-yes' : ''}`} onClick={() => toggle('icu_admission')}>Yes</button>
              <button className={`yn-btn ${!data.icu_admission ? 'active-no' : ''}`} onClick={() => { if (data.icu_admission) toggle('icu_admission'); }}>No</button>
            </div>
          </div>
          {data.icu_admission ? (
            <div className="form-group">
              <label className="form-label">ICU Days</label>
              <input className="form-input" type="number" step="0.5" value={data.icu_days}
                onChange={e => setF('icu_days', e.target.value)} placeholder="e.g., 2" />
            </div>
          ) : <div></div>}
          <div className="form-group">
            <label className="form-label">Total Hospital Days</label>
            <input className="form-input" type="number" step="0.5" value={data.hospital_days}
              onChange={e => setF('hospital_days', e.target.value)} placeholder="e.g., 5" />
          </div>

          <div className="section-header">Postoperative Complications</div>
          <div className="form-group full-width">
            <div className="checkbox-group">
              {[
                ['stroke','Stroke'],
                ['myocardial_infarction','Myocardial Infarction'],
                ['renal_failure','Renal Failure'],
                ['dialysis_required','Dialysis Required'],
                ['respiratory_failure','Respiratory Failure'],
                ['pneumonia','Pneumonia'],
                ['sepsis','Sepsis'],
                ['deep_wound_infection','Deep Wound Infection'],
                ['superficial_wound_infection','Superficial Wound Infection'],
                ['bleeding_requiring_transfusion','Bleeding / Transfusion'],
                ['graft_occlusion','Graft Occlusion'],
                ['limb_ischemia','Limb Ischemia'],
                ['reoperation','Reoperation'],
                ['amputation','Amputation'],
              ].map(([field, label]) => (
                <label key={field} className="checkbox-label">
                  <input type="checkbox" checked={!!data[field]} onChange={() => toggle(field)} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {data.stroke ? (
            <div className="form-group">
              <label className="form-label">Stroke Type</label>
              <select className="form-select" value={data.stroke_type} onChange={e => setF('stroke_type', e.target.value)}>
                <option value="">Select...</option>
                <option>Ischemic</option><option>Hemorrhagic</option><option>TIA</option><option>Unknown</option>
              </select>
            </div>
          ) : null}
          {data.bleeding_requiring_transfusion ? (
            <div className="form-group">
              <label className="form-label">Units Transfused</label>
              <input className="form-input" type="number" value={data.units_transfused}
                onChange={e => setF('units_transfused', e.target.value)} placeholder="Units of pRBC" />
            </div>
          ) : null}
          {data.amputation ? (
            <div className="form-group">
              <label className="form-label">Amputation Level</label>
              <select className="form-select" value={data.amputation_level} onChange={e => setF('amputation_level', e.target.value)}>
                <option value="">Select...</option>
                <option>Toe</option><option>Transmetatarsal</option><option>Below Knee</option><option>Above Knee</option>
              </select>
            </div>
          ) : null}

          <div className="section-header">Mortality</div>
          <div className="form-group">
            <label className="form-label">Death In-Hospital</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.death_in_hospital ? 'active-yes' : ''}`} onClick={() => toggle('death_in_hospital')}>Yes</button>
              <button className={`yn-btn ${!data.death_in_hospital ? 'active-no' : ''}`} onClick={() => { if (data.death_in_hospital) toggle('death_in_hospital'); }}>No</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">30-Day Mortality</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.death_30_day ? 'active-yes' : ''}`} onClick={() => toggle('death_30_day')}>Yes</button>
              <button className={`yn-btn ${!data.death_30_day ? 'active-no' : ''}`} onClick={() => { if (data.death_30_day) toggle('death_30_day'); }}>No</button>
            </div>
          </div>
          {(data.death_in_hospital || data.death_30_day) ? (
            <div className="form-group">
              <label className="form-label">Cause of Death</label>
              <input className="form-input" value={data.cause_of_death}
                onChange={e => setF('cause_of_death', e.target.value)} placeholder="Cause of death" />
            </div>
          ) : <div></div>}

          <div className="section-header">Discharge</div>
          <div className="form-group">
            <label className="form-label">Discharge Status</label>
            <select className="form-select" value={data.discharge_status} onChange={e => setF('discharge_status', e.target.value)}>
              <option value="">Select...</option>
              <option>Home</option><option>Rehab</option><option>Nursing Home</option>
              <option>Expired</option><option>Transfer</option><option>Against Medical Advice</option>
            </select>
          </div>
          <div className="form-group full-width">
            <label className="form-label">Discharge Medications</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                ['discharge_aspirin','Aspirin'],
                ['discharge_statin','Statin'],
                ['discharge_anticoagulant','Anticoagulant'],
                ['discharge_antiplatelet','Antiplatelet (non-aspirin)'],
              ].map(([field, label]) => (
                <label key={field} className="checkbox-label" style={{ minWidth: 'auto' }}>
                  <input type="checkbox" checked={!!data[field]} onChange={() => toggle(field)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Follow-up Scheduled</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.followup_scheduled ? 'active-yes' : ''}`} onClick={() => toggle('followup_scheduled')}>Yes</button>
              <button className={`yn-btn ${!data.followup_scheduled ? 'active-no' : ''}`} onClick={() => { if (data.followup_scheduled) toggle('followup_scheduled'); }}>No</button>
            </div>
          </div>
          {data.followup_scheduled ? (
            <div className="form-group">
              <label className="form-label">Follow-up Date</label>
              <input className="form-input" type="date" value={data.followup_date}
                onChange={e => setF('followup_date', e.target.value)} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CarotidModuleTab({ data, setF, toggle }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">🧠 Carotid-Specific Module</div>
        <span className="badge badge-info">VQI Carotid Module</span>
      </div>
      <div className="card-body">
        <div className="form-grid form-grid-3">
          <div className="section-header">Indication</div>
          <div className="form-group">
            <label className="form-label">Symptomatic</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.symptomatic ? 'active-yes' : ''}`} onClick={() => setF('symptomatic', 1)}>Yes</button>
              <button className={`yn-btn ${!data.symptomatic ? 'active-no' : ''}`} onClick={() => setF('symptomatic', 0)}>No</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Symptom Type</label>
            <select className="form-select" value={data.symptom_type} onChange={e => setF('symptom_type', e.target.value)}>
              <option value="">Select...</option>
              <option>TIA</option><option>Stroke</option><option>Amaurosis Fugax</option><option>Asymptomatic</option>
            </select>
          </div>
          <div></div>

          <div className="section-header">Stenosis</div>
          <div className="form-group">
            <label className="form-label">Ipsilateral Stenosis (%)</label>
            <input className="form-input" type="number" min="0" max="100" value={data.stenosis_percent}
              onChange={e => setF('stenosis_percent', e.target.value)} placeholder="e.g., 80" />
          </div>
          <div className="form-group">
            <label className="form-label">Contralateral Stenosis</label>
            <select className="form-select" value={data.contralateral_stenosis} onChange={e => setF('contralateral_stenosis', e.target.value)}>
              <option value="">Select...</option>
              <option>&lt;50%</option><option>50-69%</option><option>70-99%</option><option>Occluded</option><option>Unknown</option>
            </select>
          </div>
          <div></div>

          <div className="section-header">Procedure Details</div>
          <div className="form-group">
            <label className="form-label">Procedure Subtype</label>
            <select className="form-select" value={data.procedure_subtype} onChange={e => setF('procedure_subtype', e.target.value)}>
              <option value="">Select...</option>
              <option>Carotid Endarterectomy</option><option>Carotid Artery Stenting</option><option>TCAR</option>
            </select>
          </div>
          {data.procedure_subtype === 'Carotid Endarterectomy' && (
            <div className="form-group">
              <label className="form-label">CEA Technique</label>
              <select className="form-select" value={data.cea_technique} onChange={e => setF('cea_technique', e.target.value)}>
                <option value="">Select...</option>
                <option>Standard</option><option>Eversion</option>
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Clamp Time (minutes)</label>
            <input className="form-input" type="number" value={data.clamp_time_minutes}
              onChange={e => setF('clamp_time_minutes', e.target.value)} placeholder="e.g., 45" />
          </div>

          <div className="form-group">
            <label className="form-label">Shunt Used</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.shunt_used ? 'active-yes' : ''}`} onClick={() => toggle('shunt_used')}>Yes</button>
              <button className={`yn-btn ${!data.shunt_used ? 'active-no' : ''}`} onClick={() => { if (data.shunt_used) toggle('shunt_used'); }}>No</button>
            </div>
          </div>
          {data.shunt_used ? (
            <div className="form-group">
              <label className="form-label">Shunt Type</label>
              <input className="form-input" value={data.shunt_type}
                onChange={e => setF('shunt_type', e.target.value)} placeholder="Shunt type/name" />
            </div>
          ) : <div></div>}

          <div className="form-group">
            <label className="form-label">Patch Used</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.patch_used ? 'active-yes' : ''}`} onClick={() => toggle('patch_used')}>Yes</button>
              <button className={`yn-btn ${!data.patch_used ? 'active-no' : ''}`} onClick={() => { if (data.patch_used) toggle('patch_used'); }}>No</button>
            </div>
          </div>
          {data.patch_used ? (
            <div className="form-group">
              <label className="form-label">Patch Type</label>
              <select className="form-select" value={data.patch_type} onChange={e => setF('patch_type', e.target.value)}>
                <option value="">Select...</option>
                <option>Dacron</option><option>PTFE</option><option>Vein</option><option>Bovine Pericardium</option>
              </select>
            </div>
          ) : <div></div>}

          <div className="section-header">Postoperative Carotid Outcomes</div>
          <div className="form-group">
            <label className="form-label">Cranial Nerve Injury</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.cranial_nerve_injury ? 'active-yes' : ''}`} onClick={() => toggle('cranial_nerve_injury')}>Yes</button>
              <button className={`yn-btn ${!data.cranial_nerve_injury ? 'active-no' : ''}`} onClick={() => { if (data.cranial_nerve_injury) toggle('cranial_nerve_injury'); }}>No</button>
            </div>
          </div>
          {data.cranial_nerve_injury ? (
            <div className="form-group">
              <label className="form-label">Nerve Affected</label>
              <input className="form-input" value={data.cranial_nerve_type}
                onChange={e => setF('cranial_nerve_type', e.target.value)} placeholder="e.g., Marginal mandibular, Hypoglossal" />
            </div>
          ) : <div></div>}

          <div className="form-group">
            <label className="form-label">Perioperative Stroke</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.periop_stroke ? 'active-yes' : ''}`} onClick={() => toggle('periop_stroke')}>Yes</button>
              <button className={`yn-btn ${!data.periop_stroke ? 'active-no' : ''}`} onClick={() => { if (data.periop_stroke) toggle('periop_stroke'); }}>No</button>
            </div>
          </div>
          {data.periop_stroke ? (
            <div className="form-group">
              <label className="form-label">Stroke Side</label>
              <select className="form-select" value={data.periop_stroke_side} onChange={e => setF('periop_stroke_side', e.target.value)}>
                <option value="">Select...</option>
                <option>Ipsilateral</option><option>Contralateral</option><option>Unknown</option>
              </select>
            </div>
          ) : <div></div>}

          <div className="form-group">
            <label className="form-label">Hyperperfusion Syndrome</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.hyperperfusion_syndrome ? 'active-yes' : ''}`} onClick={() => toggle('hyperperfusion_syndrome')}>Yes</button>
              <button className={`yn-btn ${!data.hyperperfusion_syndrome ? 'active-no' : ''}`} onClick={() => { if (data.hyperperfusion_syndrome) toggle('hyperperfusion_syndrome'); }}>No</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">&gt;50% Restenosis at Follow-up</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.restenosis_50_followup ? 'active-yes' : ''}`} onClick={() => toggle('restenosis_50_followup')}>Yes</button>
              <button className={`yn-btn ${!data.restenosis_50_followup ? 'active-no' : ''}`} onClick={() => { if (data.restenosis_50_followup) toggle('restenosis_50_followup'); }}>No</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EvarModuleTab({ data, setF, toggle, procType }) {
  const isEvar = procType?.includes('EVAR') || procType?.includes('Open AAA');

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">🫀 Aortic-Specific Module</div>
        <span className="badge badge-purple">VQI Aortic Module</span>
      </div>
      <div className="card-body">
        <div className="form-grid form-grid-3">
          <div className="section-header">Aneurysm Characteristics</div>
          <div className="form-group">
            <label className="form-label">Maximum Diameter (mm)</label>
            <input className="form-input" type="number" value={data.aneurysm_diameter_mm}
              onChange={e => setF('aneurysm_diameter_mm', e.target.value)} placeholder="e.g., 58" />
          </div>
          <div className="form-group">
            <label className="form-label">Aneurysm Location</label>
            <select className="form-select" value={data.aneurysm_location} onChange={e => setF('aneurysm_location', e.target.value)}>
              <option value="">Select...</option>
              <option>Infrarenal</option><option>Juxtarenal</option><option>Pararenal</option>
              <option>Suprarenal</option><option>Thoracoabdominal</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Rupture Status</label>
            <select className="form-select" value={data.rupture_status} onChange={e => setF('rupture_status', e.target.value)}>
              <option value="">Select...</option>
              <option>Intact</option><option>Symptomatic</option><option>Ruptured</option>
            </select>
          </div>

          <div className="section-header">Neck Anatomy</div>
          <div className="form-group">
            <label className="form-label">Proximal Neck Length (mm)</label>
            <input className="form-input" type="number" value={data.neck_length_mm}
              onChange={e => setF('neck_length_mm', e.target.value)} placeholder="e.g., 15" />
          </div>
          <div className="form-group">
            <label className="form-label">Proximal Neck Diameter (mm)</label>
            <input className="form-input" type="number" value={data.neck_diameter_mm}
              onChange={e => setF('neck_diameter_mm', e.target.value)} placeholder="e.g., 22" />
          </div>
          <div className="form-group">
            <label className="form-label">Neck Angulation (degrees)</label>
            <input className="form-input" type="number" value={data.neck_angulation}
              onChange={e => setF('neck_angulation', e.target.value)} placeholder="e.g., 45" />
          </div>
          <div className="form-group">
            <label className="form-label">Max Iliac Diameter (mm)</label>
            <input className="form-input" type="number" value={data.max_iliac_diameter_mm}
              onChange={e => setF('max_iliac_diameter_mm', e.target.value)} placeholder="e.g., 18" />
          </div>
          <div className="form-group">
            <label className="form-label">Iliac Aneurysm</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.iliac_aneurysm ? 'active-yes' : ''}`} onClick={() => toggle('iliac_aneurysm')}>Yes</button>
              <button className={`yn-btn ${!data.iliac_aneurysm ? 'active-no' : ''}`} onClick={() => { if (data.iliac_aneurysm) toggle('iliac_aneurysm'); }}>No</button>
            </div>
          </div>

          {isEvar && <>
            <div className="section-header">Endograft Details</div>
            <div className="form-group">
              <label className="form-label">Endograft Manufacturer</label>
              <select className="form-select" value={data.endograft_manufacturer} onChange={e => setF('endograft_manufacturer', e.target.value)}>
                <option value="">Select...</option>
                {['Medtronic','Endologix','Gore','Cook','Terumo Aortic','Lombard Medical','Other'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Endograft Model</label>
              <input className="form-input" value={data.endograft_model}
                onChange={e => setF('endograft_model', e.target.value)} placeholder="e.g., Endurant II" />
            </div>
            <div className="form-group">
              <label className="form-label">Main Body Diameter (mm)</label>
              <input className="form-input" type="number" value={data.main_body_diameter}
                onChange={e => setF('main_body_diameter', e.target.value)} placeholder="e.g., 28" />
            </div>
            <div className="form-group">
              <label className="form-label">Proximal Fixation</label>
              <select className="form-select" value={data.proximal_fixation} onChange={e => setF('proximal_fixation', e.target.value)}>
                <option value="">Select...</option>
                <option>Infrarenal</option><option>Suprarenal</option><option>Fenestrated</option><option>Branched</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Iliac Extension Used</label>
              <div className="yn-group">
                <button className={`yn-btn ${data.iliac_extension_used ? 'active-yes' : ''}`} onClick={() => toggle('iliac_extension_used')}>Yes</button>
                <button className={`yn-btn ${!data.iliac_extension_used ? 'active-no' : ''}`} onClick={() => { if (data.iliac_extension_used) toggle('iliac_extension_used'); }}>No</button>
              </div>
            </div>

            <div className="section-header">Endoleak</div>
            <div className="form-group">
              <label className="form-label">Endoleak Detected</label>
              <div className="yn-group">
                <button className={`yn-btn ${data.endoleak_detected ? 'active-yes' : ''}`} onClick={() => toggle('endoleak_detected')}>Yes</button>
                <button className={`yn-btn ${!data.endoleak_detected ? 'active-no' : ''}`} onClick={() => { if (data.endoleak_detected) toggle('endoleak_detected'); }}>No</button>
              </div>
            </div>
            {data.endoleak_detected ? (
              <div className="form-group">
                <label className="form-label">Endoleak Type</label>
                <select className="form-select" value={data.endoleak_type} onChange={e => setF('endoleak_type', e.target.value)}>
                  <option value="">Select...</option>
                  <option>Type I</option><option>Type II</option><option>Type III</option>
                  <option>Type IV</option><option>Type V</option>
                </select>
              </div>
            ) : null}
          </>}
        </div>
      </div>
    </div>
  );
}

function PADModuleTab({ data, setF, toggle }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">🦵 Peripheral Arterial Disease Module</div>
        <span className="badge badge-success">VQI PAD Module</span>
      </div>
      <div className="card-body">
        <div className="form-grid form-grid-3">
          <div className="section-header">Clinical Indication</div>
          <div className="form-group">
            <label className="form-label">Indication</label>
            <select className="form-select" value={data.indication} onChange={e => setF('indication', e.target.value)}>
              <option value="">Select...</option>
              <option>Claudication</option><option>Rest Pain</option><option>Tissue Loss</option><option>Acute Ischemia</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Rutherford Classification</label>
            <select className="form-select" value={data.rutherford_class} onChange={e => setF('rutherford_class', e.target.value)}>
              <option value="">Select...</option>
              <option value="0">0 - Asymptomatic</option>
              <option value="1">1 - Mild claudication</option>
              <option value="2">2 - Moderate claudication</option>
              <option value="3">3 - Severe claudication</option>
              <option value="4">4 - Rest pain</option>
              <option value="5">5 - Minor tissue loss</option>
              <option value="6">6 - Major tissue loss (gangrene)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">TASC Classification</label>
            <select className="form-select" value={data.tasc_classification} onChange={e => setF('tasc_classification', e.target.value)}>
              <option value="">Select...</option>
              <option>A</option><option>B</option><option>C</option><option>D</option>
            </select>
          </div>

          <div className="section-header">WIfI Score</div>
          <div className="form-group">
            <label className="form-label">Wound Score (0-3)</label>
            <input className="form-input" type="number" min="0" max="3" value={data.wifi_wound_score}
              onChange={e => setF('wifi_wound_score', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Ischemia Score (0-3)</label>
            <input className="form-input" type="number" min="0" max="3" value={data.wifi_ischemia_score}
              onChange={e => setF('wifi_ischemia_score', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Infection Score (0-3)</label>
            <input className="form-input" type="number" min="0" max="3" value={data.wifi_infection_score}
              onChange={e => setF('wifi_infection_score', e.target.value)} />
          </div>

          <div className="section-header">Arterial Anatomy</div>
          <div className="form-group">
            <label className="form-label">Inflow Artery</label>
            <select className="form-select" value={data.inflow_artery} onChange={e => setF('inflow_artery', e.target.value)}>
              <option value="">Select...</option>
              {['Aorta','Common Iliac','External Iliac','Common Femoral','Superficial Femoral','Profunda Femoris','Other'].map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Outflow / Target Artery</label>
            <select className="form-select" value={data.outflow_artery} onChange={e => setF('outflow_artery', e.target.value)}>
              <option value="">Select...</option>
              {['Superficial Femoral','Popliteal (Above Knee)','Popliteal (Below Knee)','Tibioperoneal Trunk','Anterior Tibial','Posterior Tibial','Peroneal','Dorsalis Pedis','Other'].map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Lesion Length (cm)</label>
            <input className="form-input" type="number" step="0.5" value={data.lesion_length_cm}
              onChange={e => setF('lesion_length_cm', e.target.value)} placeholder="e.g., 15" />
          </div>

          <div className="section-header">Conduit / Device</div>
          <div className="form-group">
            <label className="form-label">Conduit Type</label>
            <select className="form-select" value={data.conduit_type} onChange={e => setF('conduit_type', e.target.value)}>
              <option value="">Select...</option>
              <option>Great Saphenous Vein</option><option>Small Saphenous Vein</option>
              <option>Arm Vein</option><option>PTFE</option><option>Dacron</option>
              <option>Composite</option><option>Umbilical Vein</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Graft Diameter (mm)</label>
            <input className="form-input" type="number" value={data.graft_diameter_mm}
              onChange={e => setF('graft_diameter_mm', e.target.value)} placeholder="e.g., 6" />
          </div>
          <div className="form-group">
            <label className="form-label">Stent Used</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.stent_used ? 'active-yes' : ''}`} onClick={() => toggle('stent_used')}>Yes</button>
              <button className={`yn-btn ${!data.stent_used ? 'active-no' : ''}`} onClick={() => { if (data.stent_used) toggle('stent_used'); }}>No</button>
            </div>
          </div>
          {data.stent_used ? (
            <>
              <div className="form-group">
                <label className="form-label">Stent Type</label>
                <input className="form-input" value={data.stent_type}
                  onChange={e => setF('stent_type', e.target.value)} placeholder="e.g., Zilver PTX" />
              </div>
              <div className="form-group">
                <label className="form-label">Balloon Size (mm)</label>
                <input className="form-input" type="number" step="0.5" value={data.balloon_size_mm}
                  onChange={e => setF('balloon_size_mm', e.target.value)} placeholder="e.g., 5" />
              </div>
            </>
          ) : null}

          <div className="section-header">Hemodynamic Results</div>
          <div className="form-group">
            <label className="form-label">ABI Pre-op</label>
            <input className="form-input" type="number" step="0.01" value={data.abi_preop}
              onChange={e => setF('abi_preop', e.target.value)} placeholder="e.g., 0.55" />
          </div>
          <div className="form-group">
            <label className="form-label">ABI Post-op</label>
            <input className="form-input" type="number" step="0.01" value={data.abi_postop}
              onChange={e => setF('abi_postop', e.target.value)} placeholder="e.g., 0.85" />
          </div>
          <div className="form-group">
            <label className="form-label">Toe Pressure Pre-op (mmHg)</label>
            <input className="form-input" type="number" value={data.toe_pressure_preop}
              onChange={e => setF('toe_pressure_preop', e.target.value)} placeholder="e.g., 35" />
          </div>
          <div className="form-group">
            <label className="form-label">Toe Pressure Post-op (mmHg)</label>
            <input className="form-input" type="number" value={data.toe_pressure_postop}
              onChange={e => setF('toe_pressure_postop', e.target.value)} placeholder="e.g., 55" />
          </div>

          <div className="section-header">Limb Outcomes</div>
          <div className="form-group">
            <label className="form-label">Limb Salvage</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.limb_salvage ? 'active-yes' : ''}`} onClick={() => setF('limb_salvage', 1)}>Yes</button>
              <button className={`yn-btn ${!data.limb_salvage ? 'active-no' : ''}`} onClick={() => setF('limb_salvage', 0)}>No</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Major Amputation</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.major_amputation ? 'active-yes' : ''}`} onClick={() => toggle('major_amputation')}>Yes</button>
              <button className={`yn-btn ${!data.major_amputation ? 'active-no' : ''}`} onClick={() => { if (data.major_amputation) toggle('major_amputation'); }}>No</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Minor Amputation</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.minor_amputation ? 'active-yes' : ''}`} onClick={() => toggle('minor_amputation')}>Yes</button>
              <button className={`yn-btn ${!data.minor_amputation ? 'active-no' : ''}`} onClick={() => { if (data.minor_amputation) toggle('minor_amputation'); }}>No</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VENOUS MODULE TAB ────────────────────────────────────────────────────────

function VenousModuleTab({ data, setF, toggle }) {
  const vcssTotal = ['vcss_pain','vcss_varicose_veins','vcss_venous_edema','vcss_skin_pigmentation',
    'vcss_inflammation','vcss_induration','vcss_ulcer_active','vcss_ulcer_duration',
    'vcss_ulcer_size','vcss_compression_use'].reduce((s, k) => s + (Number(data[k]) || 0), 0);

  const ceapDesc = ['C0 – No visible disease','C1 – Telangiectasia / reticular veins',
    'C2 – Varicose veins','C3 – Edema','C4a – Pigmentation / eczema',
    'C4b – Lipodermatosclerosis / atrophie blanche','C5 – Healed venous ulcer','C6 – Active venous ulcer'];

  return (
    <div className="card">
      <div className="card-body">
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '12px 20px', textAlign: 'center', minWidth: 100 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: vcssTotal >= 15 ? '#ef4444' : vcssTotal >= 8 ? '#f59e0b' : '#10b981' }}>{vcssTotal}/30</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>VCSS Score</div>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            Venous Clinical Severity Score: 0–30. ≥15 = Severe. Each item 0–3 (absent/mild/moderate/severe).
          </div>
        </div>
        <div className="form-grid form-grid-3">
          <div className="section-header">CEAP Classification</div>
          <div className="form-group">
            <label className="form-label">C — Clinical Class</label>
            <select className="form-select" value={data.ceap_clinical} onChange={e => setF('ceap_clinical', e.target.value)}>
              <option value="">Select...</option>
              {ceapDesc.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">E — Etiology</label>
            <select className="form-select" value={data.ceap_etiology} onChange={e => setF('ceap_etiology', e.target.value)}>
              <option value="">Select...</option>
              <option>Congenital</option><option>Primary</option><option>Secondary</option><option>Unknown</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">A — Anatomy</label>
            <input className="form-input" value={data.ceap_anatomy} onChange={e => setF('ceap_anatomy', e.target.value)}
              placeholder="e.g. Superficial, Deep, Perforator" />
          </div>
          <div className="form-group">
            <label className="form-label">P — Pathophysiology</label>
            <input className="form-input" value={data.ceap_pathophysiology} onChange={e => setF('ceap_pathophysiology', e.target.value)}
              placeholder="e.g. Reflux, Obstruction, Both" />
          </div>
          <div className="section-header">VCSS — Venous Clinical Severity Score</div>
          {[
            ['vcss_pain', 'Pain'], ['vcss_varicose_veins', 'Varicose Veins'], ['vcss_venous_edema', 'Venous Edema'],
            ['vcss_skin_pigmentation', 'Skin Pigmentation'], ['vcss_inflammation', 'Inflammation'],
            ['vcss_induration', 'Induration'], ['vcss_ulcer_active', 'Active Ulcer'],
            ['vcss_ulcer_duration', 'Ulcer Duration'], ['vcss_ulcer_size', 'Ulcer Size'],
            ['vcss_compression_use', 'Compression Use']
          ].map(([field, label]) => (
            <div className="form-group" key={field}>
              <label className="form-label">{label} (0–3)</label>
              <select className="form-select" value={data[field]} onChange={e => setF(field, Number(e.target.value))}>
                <option value={0}>0 — Absent</option><option value={1}>1 — Mild</option>
                <option value={2}>2 — Moderate</option><option value={3}>3 — Severe</option>
              </select>
            </div>
          ))}
          <div className="section-header">Procedure Details</div>
          <div className="form-group">
            <label className="form-label">Vein Treated</label>
            <input className="form-input" value={data.vein_treated} onChange={e => setF('vein_treated', e.target.value)}
              placeholder="GSV, SSV, tributary..." />
          </div>
          <div className="form-group">
            <label className="form-label">Technique</label>
            <select className="form-select" value={data.technique} onChange={e => setF('technique', e.target.value)}>
              <option value="">Select...</option>
              <option>EVLA</option><option>RFA</option><option>Sclerotherapy</option>
              <option>Phlebectomy</option><option>Open Stripping</option><option>Stenting</option><option>Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Closure Length (cm)</label>
            <input className="form-input" type="number" value={data.closure_length_cm}
              onChange={e => setF('closure_length_cm', e.target.value)} placeholder="cm" />
          </div>
          <div className="form-group">
            <label className="form-label">Foam Volume (mL)</label>
            <input className="form-input" type="number" value={data.foam_volume_ml}
              onChange={e => setF('foam_volume_ml', e.target.value)} placeholder="mL" />
          </div>
          <div className="form-group">
            <label className="form-label">Recurrence</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.recurrence ? 'active-yes' : ''}`} onClick={() => toggle('recurrence')}>Yes</button>
              <button className={`yn-btn ${!data.recurrence ? 'active-no' : ''}`} onClick={() => { if (data.recurrence) toggle('recurrence'); }}>No</button>
            </div>
          </div>
          <div className="form-group full-width">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={data.notes}
              onChange={e => setF('notes', e.target.value)} placeholder="Additional venous procedure notes..." />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DEVICES TAB ─────────────────────────────────────────────────────────────

function DevicesTab({ procedureId }) {
  const { notify } = useApp();
  const [devices, setDevices] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    device_name: '', manufacturer: '', model: '', size_description: '',
    lot_number: '', serial_number: '', ref_number: '', expiry_date: '', implanted: 1, notes: ''
  });

  useEffect(() => { loadDevices(); }, [procedureId]);

  async function loadDevices() {
    const res = await window.electronAPI.getDevices(procedureId);
    if (res.success) setDevices(res.data);
  }

  function setF(field, val) { setForm(f => ({ ...f, [field]: val })); }

  async function handleSave() {
    if (!form.device_name.trim()) { notify('Device name is required', 'error'); return; }
    const data = { ...form, procedure_id: procedureId };
    let res;
    if (editId) { res = await window.electronAPI.updateDevice(editId, data); }
    else { res = await window.electronAPI.createDevice(data); }
    if (res.success) {
      notify(editId ? 'Device updated' : 'Device logged');
      setAdding(false); setEditId(null);
      setForm({ device_name: '', manufacturer: '', model: '', size_description: '',
        lot_number: '', serial_number: '', ref_number: '', expiry_date: '', implanted: 1, notes: '' });
      await loadDevices();
    } else { notify(res.error || 'Save failed', 'error'); }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this device from the log?')) return;
    const res = await window.electronAPI.deleteDevice(id);
    if (res.success) { notify('Device removed'); await loadDevices(); }
  }

  function startEdit(d) {
    setEditId(d.device_id);
    setForm({ device_name: d.device_name || '', manufacturer: d.manufacturer || '',
      model: d.model || '', size_description: d.size_description || '',
      lot_number: d.lot_number || '', serial_number: d.serial_number || '',
      ref_number: d.ref_number || '', expiry_date: d.expiry_date || '',
      implanted: d.implanted ?? 1, notes: d.notes || '' });
    setAdding(true);
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">🔩 Device / Implant Log</div>
          {!adding && <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Add Device</button>}
        </div>
        {adding && (
          <div className="card-body">
            <div className="form-grid form-grid-3">
              <div className="form-group">
                <label className="form-label required">Device Name</label>
                <input className="form-input" value={form.device_name} onChange={e => setF('device_name', e.target.value)}
                  placeholder="e.g. Endurant II, Viabahn, Zilver PTX" />
              </div>
              <div className="form-group">
                <label className="form-label">Manufacturer</label>
                <input className="form-input" value={form.manufacturer} onChange={e => setF('manufacturer', e.target.value)}
                  placeholder="e.g. Medtronic, Gore, Cook" />
              </div>
              <div className="form-group">
                <label className="form-label">Model / REF</label>
                <input className="form-input" value={form.model} onChange={e => setF('model', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Size / Description</label>
                <input className="form-input" value={form.size_description} onChange={e => setF('size_description', e.target.value)}
                  placeholder="e.g. 28mm × 120mm" />
              </div>
              <div className="form-group">
                <label className="form-label">Lot Number</label>
                <input className="form-input" value={form.lot_number} onChange={e => setF('lot_number', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Serial Number</label>
                <input className="form-input" value={form.serial_number} onChange={e => setF('serial_number', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">REF Number</label>
                <input className="form-input" value={form.ref_number} onChange={e => setF('ref_number', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input className="form-input" type="date" value={form.expiry_date} onChange={e => setF('expiry_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Implanted</label>
                <div className="yn-group">
                  <button className={`yn-btn ${form.implanted ? 'active-yes' : ''}`} onClick={() => setF('implanted', 1)}>Yes</button>
                  <button className={`yn-btn ${!form.implanted ? 'active-no' : ''}`} onClick={() => setF('implanted', 0)}>No (Removed)</button>
                </div>
              </div>
              <div className="form-group full-width">
                <label className="form-label">Notes</label>
                <input className="form-input" value={form.notes} onChange={e => setF('notes', e.target.value)}
                  placeholder="e.g. bilateral iliac extensions, proximal fixation zone 0" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn btn-secondary" onClick={() => { setAdding(false); setEditId(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>💾 {editId ? 'Update' : 'Log Device'}</button>
            </div>
          </div>
        )}
      </div>
      {devices.length === 0 && !adding ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-icon">🔩</div>
            <div className="empty-state-title">No devices logged</div>
            <div className="empty-state-desc">Log implants, stents, grafts, and endografts — useful for recalls and inventory analysis</div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setAdding(true)}>+ Add Device</button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr><th>Device</th><th>Manufacturer</th><th>Size</th><th>Lot #</th><th>REF #</th><th>Expiry</th><th>Implanted</th><th></th></tr>
              </thead>
              <tbody>
                {devices.map(d => (
                  <tr key={d.device_id}>
                    <td><div style={{ fontWeight: 600 }}>{d.device_name}</div>{d.model && <div style={{ fontSize: 12, color: '#64748b' }}>{d.model}</div>}</td>
                    <td>{d.manufacturer || '—'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{d.size_description || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.lot_number || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.ref_number || '—'}</td>
                    <td>{d.expiry_date || '—'}</td>
                    <td>{d.implanted ? <span className="badge badge-success">Yes</span> : <span className="badge badge-secondary">Removed</span>}</td>
                    <td>
                      <div className="btn-group">
                        <button className="btn btn-secondary btn-sm" onClick={() => startEdit(d)}>Edit</button>
                        <button className="btn btn-sm" style={{ background: '#7f1d1d', color: '#fca5a5', border: 'none' }}
                          onClick={() => handleDelete(d.device_id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
