import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';

const EMPTY_PATIENT = {
  mrn: '', first_name: '', last_name: '', date_of_birth: '', sex: '',
  race: '', ethnicity: '', height_cm: '', weight_kg: '', bmi: '',
  phone: '', email: '', address: '', insurance: '', referring_physician: '',
  primary_care_provider: '', zip_code: '', consent_signed: 0,
  enrollment_date: new Date().toISOString().slice(0,10)
};

const EMPTY_COMORBIDITIES = {
  smoking_status: '', pack_years: '', hypertension: 0, hypertension_controlled: 0,
  diabetes: 0, diabetes_type: '', hba1c: '', hyperlipidemia: 0,
  coronary_artery_disease: 0, prior_mi: 0, prior_cabg: 0, prior_pci: 0,
  heart_failure: 0, nyha_class: '', copd: 0, home_oxygen: 0,
  ckd_stage: '', dialysis: 0, atrial_fibrillation: 0,
  prior_stroke: 0, prior_tia: 0, peripheral_artery_disease: 0,
  claudication_history: 0, prior_amputation: 0, carotid_disease: 0,
  family_history_aneurysm: 0, frailty_score: '', functional_status: '', ambulatory_status: ''
};

const EMPTY_MEDICATIONS = {
  aspirin: 0, clopidogrel: 0, ticagrelor: 0, warfarin: 0,
  apixaban: 0, rivaroxaban: 0, statin: 0, beta_blocker: 0,
  ace_inhibitor: 0, arb: 0, calcium_channel_blocker: 0,
  insulin: 0, oral_diabetic_medications: 0, antibiotic_prophylaxis: 0
};

export default function PatientForm({ patientId, defaultTab }) {
  const { navigate, notify } = useApp();
  const [tab, setTab] = useState(defaultTab || 'demographics');
  const [patient, setPatient] = useState(EMPTY_PATIENT);
  const [comorbidities, setComorbidities] = useState(EMPTY_COMORBIDITIES);
  const [medications, setMedications] = useState(EMPTY_MEDICATIONS);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(!!patientId);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const isEdit = !!patientId;

  useEffect(() => {
    if (patientId) loadPatient();
  }, [patientId]);

  async function loadPatient() {
    setLoading(true);
    const res = await window.electronAPI.getPatientById(patientId);
    if (res.success && res.data) {
      const { comorbidities, medications, procedures: procs, ...patientFields } = res.data;
      setPatient({ ...EMPTY_PATIENT, ...stripNulls(patientFields) });
      if (comorbidities) setComorbidities({ ...EMPTY_COMORBIDITIES, ...stripNulls(comorbidities) });
      if (medications) setMedications({ ...EMPTY_MEDICATIONS, ...stripNulls(medications) });
      if (procs) setProcedures(procs);
    }
    setLoading(false);
  }

  function stripNulls(obj) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === null ? '' : v]));
  }

  function setPatientField(field, value) {
    setPatient(p => {
      const updated = { ...p, [field]: value };
      if ((field === 'height_cm' || field === 'weight_kg') && updated.height_cm && updated.weight_kg) {
        const h = parseFloat(updated.height_cm) / 100;
        updated.bmi = h > 0 ? (parseFloat(updated.weight_kg) / (h * h)).toFixed(1) : '';
      }
      return updated;
    });
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }));
  }

  function validate() {
    const errs = {};
    if (!patient.mrn.trim()) errs.mrn = 'MRN is required';
    if (!patient.first_name.trim()) errs.first_name = 'First name is required';
    if (!patient.last_name.trim()) errs.last_name = 'Last name is required';
    if (!patient.date_of_birth) errs.date_of_birth = 'Date of birth is required';
    if (!patient.sex) errs.sex = 'Sex is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) { setTab('demographics'); return; }
    setSaving(true);
    try {
      const data = {
        ...patient,
        comorbidities: cleanNumbers(comorbidities),
        medications: cleanNumbers(medications)
      };
      let res;
      if (isEdit) {
        res = await window.electronAPI.updatePatient(patientId, data);
      } else {
        res = await window.electronAPI.createPatient(data);
      }
      if (res.success) {
        notify(isEdit ? 'Patient updated successfully' : 'Patient registered successfully');
        if (!isEdit && res.data?.patient_id) {
          navigate('patient-edit', { patientId: res.data.patient_id });
        } else {
          loadPatient();
        }
      } else {
        notify(res.error || 'Save failed. Check if MRN is unique.', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  function cleanNumbers(obj) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v]));
  }

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ textAlign: 'center', color: '#64748b' }}>Loading patient...</div>
    </div>
  );

  return (
    <div className="page-wide" style={{ padding: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? `${patient.first_name} ${patient.last_name}` : 'Register New Patient'}</h1>
          {isEdit && <p className="page-subtitle">MRN: {patient.mrn} · Patient ID: {patientId}</p>}
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={() => navigate('patients')}>← Back</button>
          {isEdit && (
            <button className="btn btn-secondary" onClick={() => navigate('procedure-new', { patientId })}>
              🔬 Add Procedure
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner-sm"></span> Saving...</> : isEdit ? '💾 Save Changes' : '✅ Register Patient'}
          </button>
        </div>
      </div>

      <div className="tabs">
        {[
          { id: 'demographics', label: '👤 Demographics' },
          { id: 'comorbidities', label: '🏥 Comorbidities' },
          { id: 'medications', label: '💊 Medications' },
          ...(isEdit ? [{ id: 'procedures', label: `🔬 Procedures (${procedures.length})` }] : [])
        ].map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'demographics' && <DemographicsTab patient={patient} setField={setPatientField} errors={errors} />}
      {tab === 'comorbidities' && <ComorbiditiesTab data={comorbidities} setData={setComorbidities} />}
      {tab === 'medications' && <MedicationsTab data={medications} setData={setMedications} />}
      {tab === 'procedures' && isEdit && <ProceduresTab procedures={procedures} patientId={patientId} navigate={navigate} />}
    </div>
  );
}

function DemographicsTab({ patient, setField, errors }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="form-grid form-grid-3">
          <div className="section-header">Patient Identification</div>

          <div className="form-group">
            <label className="form-label required">Medical Record Number (MRN)</label>
            <input className={`form-input ${errors.mrn ? 'border-red-500' : ''}`}
              value={patient.mrn} onChange={e => setField('mrn', e.target.value)}
              placeholder="e.g., 123456" />
            {errors.mrn && <span className="form-error">{errors.mrn}</span>}
          </div>

          <div className="form-group">
            <label className="form-label required">First Name</label>
            <input className="form-input" value={patient.first_name}
              onChange={e => setField('first_name', e.target.value)} placeholder="First name" />
            {errors.first_name && <span className="form-error">{errors.first_name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label required">Last Name</label>
            <input className="form-input" value={patient.last_name}
              onChange={e => setField('last_name', e.target.value)} placeholder="Last name" />
            {errors.last_name && <span className="form-error">{errors.last_name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label required">Date of Birth</label>
            <input className="form-input" type="date" value={patient.date_of_birth}
              onChange={e => setField('date_of_birth', e.target.value)} />
            {errors.date_of_birth && <span className="form-error">{errors.date_of_birth}</span>}
          </div>

          <div className="form-group">
            <label className="form-label required">Sex</label>
            <select className="form-select" value={patient.sex} onChange={e => setField('sex', e.target.value)}>
              <option value="">Select...</option>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
            {errors.sex && <span className="form-error">{errors.sex}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Enrollment Date</label>
            <input className="form-input" type="date" value={patient.enrollment_date}
              onChange={e => setField('enrollment_date', e.target.value)} />
          </div>

          <div className="section-header">Demographics</div>

          <div className="form-group">
            <label className="form-label">Race</label>
            <select className="form-select" value={patient.race} onChange={e => setField('race', e.target.value)}>
              <option value="">Select...</option>
              {['White','Black/African American','Asian','American Indian/Alaska Native','Native Hawaiian/Pacific Islander','Multiracial','Unknown/Not reported'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Ethnicity</label>
            <select className="form-select" value={patient.ethnicity} onChange={e => setField('ethnicity', e.target.value)}>
              <option value="">Select...</option>
              <option>Hispanic or Latino</option>
              <option>Not Hispanic or Latino</option>
              <option>Unknown</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Insurance</label>
            <select className="form-select" value={patient.insurance} onChange={e => setField('insurance', e.target.value)}>
              <option value="">Select...</option>
              {['Medicare','Medicaid','Private Insurance','Self-Pay','VA/Military','Workers Comp','Other'].map(i => <option key={i}>{i}</option>)}
            </select>
          </div>

          <div className="section-header">Anthropometrics</div>

          <div className="form-group">
            <label className="form-label">Height (cm)</label>
            <input className="form-input" type="number" value={patient.height_cm}
              onChange={e => setField('height_cm', e.target.value)} placeholder="e.g., 175" min="50" max="250" />
          </div>

          <div className="form-group">
            <label className="form-label">Weight (kg)</label>
            <input className="form-input" type="number" value={patient.weight_kg}
              onChange={e => setField('weight_kg', e.target.value)} placeholder="e.g., 80" min="10" max="500" />
          </div>

          <div className="form-group">
            <label className="form-label">BMI (auto-calculated)</label>
            <input className="form-input" value={patient.bmi} readOnly
              style={{ background: '#f8fafc', fontWeight: 600, color: bmiColor(patient.bmi) }} />
            {patient.bmi && <span className="form-hint">{bmiLabel(patient.bmi)}</span>}
          </div>

          <div className="section-header">Contact Information</div>

          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={patient.phone}
              onChange={e => setField('phone', e.target.value)} placeholder="Phone number" />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={patient.email}
              onChange={e => setField('email', e.target.value)} placeholder="Email address" />
          </div>

          <div className="form-group">
            <label className="form-label">ZIP Code</label>
            <input className="form-input" value={patient.zip_code}
              onChange={e => setField('zip_code', e.target.value)} placeholder="ZIP" />
          </div>

          <div className="form-group full-width">
            <label className="form-label">Address</label>
            <input className="form-input" value={patient.address}
              onChange={e => setField('address', e.target.value)} placeholder="Street address" />
          </div>

          <div className="form-group">
            <label className="form-label">Referring Physician</label>
            <input className="form-input" value={patient.referring_physician}
              onChange={e => setField('referring_physician', e.target.value)} placeholder="Dr. Name" />
          </div>

          <div className="form-group">
            <label className="form-label">Primary Care Provider</label>
            <input className="form-input" value={patient.primary_care_provider}
              onChange={e => setField('primary_care_provider', e.target.value)} placeholder="Dr. Name" />
          </div>

          <div className="form-group">
            <label className="form-label">Consent Signed</label>
            <div className="yn-group">
              <button className={`yn-btn ${patient.consent_signed ? 'active-yes' : ''}`}
                onClick={() => setField('consent_signed', 1)}>Yes</button>
              <button className={`yn-btn ${patient.consent_signed === 0 ? 'active-no' : ''}`}
                onClick={() => setField('consent_signed', 0)}>No</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComorbiditiesTab({ data, setData }) {
  function toggle(field) { setData(d => ({ ...d, [field]: d[field] ? 0 : 1 })); }
  function set(field, value) { setData(d => ({ ...d, [field]: value })); }

  const BoolField = ({ field, label }) => (
    <label className="checkbox-label">
      <input type="checkbox" checked={!!data[field]} onChange={() => toggle(field)} />
      {label}
    </label>
  );

  // Modified Frailty Index – 5 (mFI-5)
  const mfi5 = (data.diabetes ? 1 : 0) + (data.copd ? 1 : 0) + (data.heart_failure ? 1 : 0) +
    (data.hypertension ? 1 : 0) +
    (data.functional_status && data.functional_status !== 'Independent' ? 1 : 0);
  const mfiColor = mfi5 >= 3 ? '#ef4444' : mfi5 >= 2 ? '#f59e0b' : '#10b981';
  const mfiRisk = mfi5 >= 3 ? 'High Risk' : mfi5 >= 2 ? 'Intermediate' : 'Low Risk';

  return (
    <div>
      {/* mFI-5 Banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#1e293b', border: `1px solid ${mfiColor}44`, borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ textAlign: 'center', minWidth: 80 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: mfiColor, lineHeight: 1 }}>{mfi5}/5</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>mFI-5 Score</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: mfiColor, marginBottom: 2 }}>Modified Frailty Index — {mfiRisk}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            Components: Diabetes · COPD · Heart Failure · Hypertension · Non-independent functional status
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            mFI-5 ≥3 associated with ↑ postoperative complications, 30-day mortality, and readmission in vascular surgery.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 200 }}>
          {[['DM', data.diabetes], ['COPD', data.copd], ['CHF', data.heart_failure],
            ['HTN', data.hypertension], ['Non-Indep', data.functional_status && data.functional_status !== 'Independent']
          ].map(([label, active]) => (
            <span key={label} style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
              background: active ? mfiColor + '33' : '#1e293b',
              color: active ? mfiColor : '#475569',
              border: `1px solid ${active ? mfiColor + '66' : '#334155'}`
            }}>{label}</span>
          ))}
        </div>
      </div>

    <div className="card">
      <div className="card-body">
        <div className="form-grid form-grid-3">
          <div className="section-header">Smoking History</div>
          <div className="form-group">
            <label className="form-label">Smoking Status</label>
            <select className="form-select" value={data.smoking_status} onChange={e => set('smoking_status', e.target.value)}>
              <option value="">Select...</option>
              <option>Never</option><option>Former</option><option>Current</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Pack Years</label>
            <input className="form-input" type="number" value={data.pack_years}
              onChange={e => set('pack_years', e.target.value)} placeholder="Pack years" min="0" />
          </div>
          <div></div>

          <div className="section-header">Cardiovascular</div>
          <div className="form-group full-width">
            <div className="checkbox-group">
              <BoolField field="hypertension" label="Hypertension" />
              <BoolField field="hypertension_controlled" label="Hypertension Controlled" />
              <BoolField field="coronary_artery_disease" label="Coronary Artery Disease" />
              <BoolField field="prior_mi" label="Prior Myocardial Infarction" />
              <BoolField field="prior_cabg" label="Prior CABG" />
              <BoolField field="prior_pci" label="Prior PCI/Stent" />
              <BoolField field="heart_failure" label="Heart Failure / CHF" />
              <BoolField field="atrial_fibrillation" label="Atrial Fibrillation" />
            </div>
          </div>
          {data.heart_failure ? (
            <div className="form-group">
              <label className="form-label">NYHA Class</label>
              <select className="form-select" value={data.nyha_class} onChange={e => set('nyha_class', e.target.value)}>
                <option value="">Select...</option>
                <option value="1">I - No limitation</option>
                <option value="2">II - Slight limitation</option>
                <option value="3">III - Marked limitation</option>
                <option value="4">IV - Severe limitation</option>
              </select>
            </div>
          ) : null}

          <div className="section-header">Metabolic</div>
          <div className="form-group full-width">
            <div className="checkbox-group">
              <BoolField field="hyperlipidemia" label="Hyperlipidemia" />
              <BoolField field="diabetes" label="Diabetes" />
            </div>
          </div>
          {data.diabetes ? (
            <>
              <div className="form-group">
                <label className="form-label">Diabetes Type</label>
                <select className="form-select" value={data.diabetes_type} onChange={e => set('diabetes_type', e.target.value)}>
                  <option value="">Select...</option>
                  <option>Type 1</option><option>Type 2</option><option>Unknown</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">HbA1c (%)</label>
                <input className="form-input" type="number" step="0.1" value={data.hba1c}
                  onChange={e => set('hba1c', e.target.value)} placeholder="e.g., 7.2" />
              </div>
              <div></div>
            </>
          ) : null}

          <div className="section-header">Pulmonary & Renal</div>
          <div className="form-group full-width">
            <div className="checkbox-group">
              <BoolField field="copd" label="COPD" />
              <BoolField field="home_oxygen" label="Home Oxygen" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">CKD Stage</label>
            <select className="form-select" value={data.ckd_stage} onChange={e => set('ckd_stage', e.target.value)}>
              <option value="">None / Unknown</option>
              <option value="1">Stage 1 (GFR ≥90)</option>
              <option value="2">Stage 2 (GFR 60-89)</option>
              <option value="3">Stage 3 (GFR 30-59)</option>
              <option value="4">Stage 4 (GFR 15-29)</option>
              <option value="5">Stage 5 (GFR &lt;15)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Dialysis</label>
            <div className="yn-group">
              <button className={`yn-btn ${data.dialysis ? 'active-yes' : ''}`} onClick={() => set('dialysis', 1)}>Yes</button>
              <button className={`yn-btn ${!data.dialysis ? 'active-no' : ''}`} onClick={() => set('dialysis', 0)}>No</button>
            </div>
          </div>

          <div className="section-header">Neurological & Vascular History</div>
          <div className="form-group full-width">
            <div className="checkbox-group">
              <BoolField field="prior_stroke" label="Prior Stroke" />
              <BoolField field="prior_tia" label="Prior TIA" />
              <BoolField field="carotid_disease" label="Carotid Disease" />
              <BoolField field="peripheral_artery_disease" label="Peripheral Artery Disease" />
              <BoolField field="claudication_history" label="Claudication History" />
              <BoolField field="prior_amputation" label="Prior Amputation" />
              <BoolField field="family_history_aneurysm" label="Family Hx Aneurysm" />
            </div>
          </div>

          <div className="section-header">Functional Status</div>
          <div className="form-group">
            <label className="form-label">Functional Status</label>
            <select className="form-select" value={data.functional_status} onChange={e => set('functional_status', e.target.value)}>
              <option value="">Select...</option>
              <option>Independent</option>
              <option>Partially dependent</option>
              <option>Fully dependent</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Ambulatory Status</label>
            <select className="form-select" value={data.ambulatory_status} onChange={e => set('ambulatory_status', e.target.value)}>
              <option value="">Select...</option>
              <option>Ambulatory</option>
              <option>Non-ambulatory</option>
              <option>Wheelchair</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Frailty Score (1-5)</label>
            <input className="form-input" type="number" min="1" max="5" value={data.frailty_score}
              onChange={e => set('frailty_score', e.target.value)} placeholder="1-5" />
            <span className="form-hint">1=Very fit, 5=Severely frail</span>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

function MedicationsTab({ data, setData }) {
  function toggle(field) { setData(d => ({ ...d, [field]: d[field] ? 0 : 1 })); }

  const MEDS = [
    { section: 'Antiplatelet Agents', fields: [
      { field: 'aspirin', label: 'Aspirin' },
      { field: 'clopidogrel', label: 'Clopidogrel (Plavix)' },
      { field: 'ticagrelor', label: 'Ticagrelor (Brilinta)' },
    ]},
    { section: 'Anticoagulants', fields: [
      { field: 'warfarin', label: 'Warfarin (Coumadin)' },
      { field: 'apixaban', label: 'Apixaban (Eliquis)' },
      { field: 'rivaroxaban', label: 'Rivaroxaban (Xarelto)' },
    ]},
    { section: 'Cardiovascular Medications', fields: [
      { field: 'statin', label: 'Statin (any)' },
      { field: 'beta_blocker', label: 'Beta Blocker' },
      { field: 'ace_inhibitor', label: 'ACE Inhibitor' },
      { field: 'arb', label: 'ARB' },
      { field: 'calcium_channel_blocker', label: 'Calcium Channel Blocker' },
    ]},
    { section: 'Diabetes Medications', fields: [
      { field: 'insulin', label: 'Insulin' },
      { field: 'oral_diabetic_medications', label: 'Oral Diabetic Medications' },
    ]},
    { section: 'Other', fields: [
      { field: 'antibiotic_prophylaxis', label: 'Antibiotic Prophylaxis' },
    ]},
  ];

  return (
    <div className="card">
      <div className="card-body">
        {MEDS.map(section => (
          <div key={section.section} style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase',
              letterSpacing: '0.06em', color: '#2563eb', borderBottom: '2px solid #dbeafe',
              paddingBottom: 6, marginBottom: 12 }}>
              {section.section}
            </div>
            <div className="checkbox-group">
              {section.fields.map(({ field, label }) => (
                <label key={field} className="checkbox-label">
                  <input type="checkbox" checked={!!data[field]} onChange={() => toggle(field)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProceduresTab({ procedures, patientId, navigate }) {
  if (procedures.length === 0) return (
    <div className="card">
      <div className="empty-state" style={{ padding: 60 }}>
        <div className="empty-state-icon">🔬</div>
        <div className="empty-state-title">No procedures recorded</div>
        <div className="empty-state-desc">Add a procedure to begin tracking outcomes</div>
        <button className="btn btn-primary" style={{ marginTop: 16 }}
          onClick={() => navigate('procedure-new', { patientId })}>
          + Add First Procedure
        </button>
      </div>
    </div>
  );

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Recorded Procedures ({procedures.length})</div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('procedure-new', { patientId })}>
          + Add Procedure
        </button>
      </div>
      <div className="table-container" style={{ border: 'none' }}>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Procedure Type</th>
              <th>Surgeon</th>
              <th>Urgency</th>
              <th>Follow-ups</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {procedures.map(pr => (
              <tr key={pr.procedure_id}>
                <td>{pr.procedure_date ? new Date(pr.procedure_date + 'T00:00:00').toLocaleDateString() : '—'}</td>
                <td>
                  <span className="table-link" onClick={() => navigate('procedure-edit', { procedureId: pr.procedure_id })}>
                    {pr.procedure_type}
                  </span>
                </td>
                <td>{pr.surgeon_name || '—'}</td>
                <td>
                  <span className={`badge badge-${pr.urgency === 'Emergency' ? 'danger' : pr.urgency === 'Urgent' ? 'warning' : 'success'}`}>
                    {pr.urgency || '—'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('followup', { procedureId: pr.procedure_id })}>
                    Follow-ups
                  </button>
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm"
                    onClick={() => navigate('procedure-edit', { procedureId: pr.procedure_id })}>
                    ✏️ Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function bmiColor(bmi) {
  const v = parseFloat(bmi);
  if (!v) return '#64748b';
  if (v < 18.5) return '#3b82f6';
  if (v < 25) return '#10b981';
  if (v < 30) return '#f59e0b';
  return '#ef4444';
}

function bmiLabel(bmi) {
  const v = parseFloat(bmi);
  if (!v) return '';
  if (v < 18.5) return 'Underweight';
  if (v < 25) return 'Normal weight';
  if (v < 30) return 'Overweight';
  if (v < 35) return 'Obese Class I';
  if (v < 40) return 'Obese Class II';
  return 'Obese Class III';
}
