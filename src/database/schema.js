const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('surgeon','data_manager','administrator')),
  active INTEGER NOT NULL DEFAULT 1,
  last_login TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS surgeons (
  surgeon_id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  specialty TEXT DEFAULT 'Vascular Surgery',
  license_number TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patients (
  patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
  mrn TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  sex TEXT CHECK(sex IN ('Male','Female','Other')),
  race TEXT,
  ethnicity TEXT,
  height_cm REAL,
  weight_kg REAL,
  bmi REAL,
  phone TEXT,
  email TEXT,
  address TEXT,
  insurance TEXT,
  referring_physician TEXT,
  primary_care_provider TEXT,
  zip_code TEXT,
  consent_signed INTEGER DEFAULT 0,
  enrollment_date TEXT DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comorbidities (
  comorbidity_id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
  smoking_status TEXT CHECK(smoking_status IN ('Never','Former','Current')),
  pack_years REAL,
  hypertension INTEGER DEFAULT 0,
  hypertension_controlled INTEGER DEFAULT 0,
  diabetes INTEGER DEFAULT 0,
  diabetes_type TEXT CHECK(diabetes_type IN ('Type 1','Type 2','Unknown')),
  hba1c REAL,
  hyperlipidemia INTEGER DEFAULT 0,
  coronary_artery_disease INTEGER DEFAULT 0,
  prior_mi INTEGER DEFAULT 0,
  prior_cabg INTEGER DEFAULT 0,
  prior_pci INTEGER DEFAULT 0,
  heart_failure INTEGER DEFAULT 0,
  nyha_class INTEGER,
  copd INTEGER DEFAULT 0,
  home_oxygen INTEGER DEFAULT 0,
  ckd_stage INTEGER,
  dialysis INTEGER DEFAULT 0,
  atrial_fibrillation INTEGER DEFAULT 0,
  prior_stroke INTEGER DEFAULT 0,
  prior_tia INTEGER DEFAULT 0,
  peripheral_artery_disease INTEGER DEFAULT 0,
  claudication_history INTEGER DEFAULT 0,
  prior_amputation INTEGER DEFAULT 0,
  carotid_disease INTEGER DEFAULT 0,
  family_history_aneurysm INTEGER DEFAULT 0,
  frailty_score INTEGER,
  functional_status TEXT CHECK(functional_status IN ('Independent','Partially dependent','Fully dependent')),
  ambulatory_status TEXT CHECK(ambulatory_status IN ('Ambulatory','Non-ambulatory','Wheelchair'))
);

CREATE TABLE IF NOT EXISTS medications (
  medication_id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
  aspirin INTEGER DEFAULT 0,
  clopidogrel INTEGER DEFAULT 0,
  ticagrelor INTEGER DEFAULT 0,
  warfarin INTEGER DEFAULT 0,
  apixaban INTEGER DEFAULT 0,
  rivaroxaban INTEGER DEFAULT 0,
  statin INTEGER DEFAULT 0,
  beta_blocker INTEGER DEFAULT 0,
  ace_inhibitor INTEGER DEFAULT 0,
  arb INTEGER DEFAULT 0,
  calcium_channel_blocker INTEGER DEFAULT 0,
  insulin INTEGER DEFAULT 0,
  oral_diabetic_medications INTEGER DEFAULT 0,
  antibiotic_prophylaxis INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS procedures (
  procedure_id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
  procedure_type TEXT NOT NULL,
  procedure_date TEXT NOT NULL,
  surgeon_id INTEGER REFERENCES surgeons(surgeon_id),
  assistant TEXT,
  hospital TEXT DEFAULT 'Main Hospital',
  urgency TEXT CHECK(urgency IN ('Elective','Urgent','Emergency')),
  anesthesia_type TEXT CHECK(anesthesia_type IN ('General','Regional','Local','Monitored')),
  indication TEXT,
  symptom_status TEXT CHECK(symptom_status IN ('Symptomatic','Asymptomatic')),
  admission_type TEXT CHECK(admission_type IN ('Inpatient','Outpatient','Transfer')),
  preop_imaging TEXT,
  stenosis_percent REAL,
  aneurysm_diameter REAL,
  aneurysm_growth_rate REAL,
  abi_preop REAL,
  toe_pressure REAL,
  rutherford_class INTEGER,
  wound_classification TEXT,
  infection_present INTEGER DEFAULT 0,
  tissue_loss INTEGER DEFAULT 0,
  baseline_creatinine REAL,
  hemoglobin REAL,
  platelet_count INTEGER,
  notes TEXT,
  created_by INTEGER REFERENCES users(user_id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS intraoperative (
  intraop_id INTEGER PRIMARY KEY AUTOINCREMENT,
  procedure_id INTEGER NOT NULL REFERENCES procedures(procedure_id) ON DELETE CASCADE,
  procedure_start TEXT,
  procedure_end TEXT,
  duration_minutes INTEGER,
  blood_loss_ml INTEGER,
  fluoroscopy_time REAL,
  contrast_volume INTEGER,
  heparin_used INTEGER DEFAULT 0,
  heparin_dose INTEGER,
  protamine_used INTEGER DEFAULT 0,
  graft_type TEXT,
  device_name TEXT,
  device_manufacturer TEXT,
  device_lot TEXT,
  technical_success INTEGER DEFAULT 1,
  conversion_to_open INTEGER DEFAULT 0,
  arterial_dissection INTEGER DEFAULT 0,
  embolization INTEGER DEFAULT 0,
  arterial_rupture INTEGER DEFAULT 0,
  device_failure INTEGER DEFAULT 0,
  graft_thrombosis INTEGER DEFAULT 0,
  arrhythmia INTEGER DEFAULT 0,
  hypotension INTEGER DEFAULT 0,
  intraop_bleeding INTEGER DEFAULT 0,
  cardiac_arrest INTEGER DEFAULT 0,
  other_complication TEXT
);

CREATE TABLE IF NOT EXISTS postoperative (
  postop_id INTEGER PRIMARY KEY AUTOINCREMENT,
  procedure_id INTEGER NOT NULL REFERENCES procedures(procedure_id) ON DELETE CASCADE,
  icu_admission INTEGER DEFAULT 0,
  icu_days REAL,
  hospital_days REAL,
  stroke INTEGER DEFAULT 0,
  stroke_type TEXT CHECK(stroke_type IN ('Ischemic','Hemorrhagic','TIA','Unknown')),
  myocardial_infarction INTEGER DEFAULT 0,
  renal_failure INTEGER DEFAULT 0,
  dialysis_required INTEGER DEFAULT 0,
  respiratory_failure INTEGER DEFAULT 0,
  pneumonia INTEGER DEFAULT 0,
  sepsis INTEGER DEFAULT 0,
  deep_wound_infection INTEGER DEFAULT 0,
  superficial_wound_infection INTEGER DEFAULT 0,
  bleeding_requiring_transfusion INTEGER DEFAULT 0,
  units_transfused INTEGER,
  graft_occlusion INTEGER DEFAULT 0,
  limb_ischemia INTEGER DEFAULT 0,
  reoperation INTEGER DEFAULT 0,
  amputation INTEGER DEFAULT 0,
  amputation_level TEXT CHECK(amputation_level IN ('Toe','Transmetatarsal','Below Knee','Above Knee')),
  death_in_hospital INTEGER DEFAULT 0,
  death_30_day INTEGER DEFAULT 0,
  cause_of_death TEXT,
  discharge_status TEXT CHECK(discharge_status IN ('Home','Rehab','Nursing Home','Expired','Transfer','Against Medical Advice')),
  discharge_aspirin INTEGER DEFAULT 0,
  discharge_statin INTEGER DEFAULT 0,
  discharge_anticoagulant INTEGER DEFAULT 0,
  discharge_antiplatelet INTEGER DEFAULT 0,
  followup_scheduled INTEGER DEFAULT 0,
  followup_date TEXT
);

CREATE TABLE IF NOT EXISTS followup (
  followup_id INTEGER PRIMARY KEY AUTOINCREMENT,
  procedure_id INTEGER NOT NULL REFERENCES procedures(procedure_id) ON DELETE CASCADE,
  followup_date TEXT NOT NULL,
  followup_interval TEXT CHECK(followup_interval IN ('30 Day','6 Month','1 Year','2 Year','3 Year','4 Year','5 Year','Annual')),
  alive INTEGER DEFAULT 1,
  cause_of_death TEXT,
  reintervention INTEGER DEFAULT 0,
  reintervention_type TEXT,
  graft_patency INTEGER CHECK(graft_patency IN (0,1,2,3)),
  abi REAL,
  imaging_type TEXT,
  imaging_result TEXT,
  stenosis_percent REAL,
  aneurysm_sac_diameter REAL,
  endoleak_type TEXT CHECK(endoleak_type IN ('None','Type I','Type II','Type III','Type IV','Type V','Unknown')),
  stroke INTEGER DEFAULT 0,
  mi INTEGER DEFAULT 0,
  amputation INTEGER DEFAULT 0,
  amputation_level TEXT,
  limb_status TEXT CHECK(limb_status IN ('Intact','Tissue loss','Ulcer','Gangrene')),
  walking_distance_meters INTEGER,
  quality_of_life_score INTEGER,
  functional_status TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS evar_module (
  evar_id INTEGER PRIMARY KEY AUTOINCREMENT,
  procedure_id INTEGER NOT NULL REFERENCES procedures(procedure_id) ON DELETE CASCADE,
  aneurysm_diameter_mm REAL,
  aneurysm_location TEXT CHECK(aneurysm_location IN ('Infrarenal','Juxtarenal','Pararenal','Suprarenal','Thoracoabdominal')),
  rupture_status TEXT CHECK(rupture_status IN ('Intact','Symptomatic','Ruptured')),
  neck_length_mm REAL,
  neck_diameter_mm REAL,
  neck_angulation INTEGER,
  max_iliac_diameter_mm REAL,
  iliac_aneurysm INTEGER DEFAULT 0,
  endograft_manufacturer TEXT,
  endograft_model TEXT,
  main_body_diameter REAL,
  proximal_fixation TEXT CHECK(proximal_fixation IN ('Infrarenal','Suprarenal','Fenestrated','Branched')),
  endoleak_detected INTEGER DEFAULT 0,
  endoleak_type TEXT CHECK(endoleak_type IN ('None','Type I','Type II','Type III','Type IV','Type V')),
  technical_success_evar INTEGER DEFAULT 1,
  iliac_extension_used INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS carotid_module (
  carotid_id INTEGER PRIMARY KEY AUTOINCREMENT,
  procedure_id INTEGER NOT NULL REFERENCES procedures(procedure_id) ON DELETE CASCADE,
  symptomatic INTEGER DEFAULT 0,
  symptom_type TEXT CHECK(symptom_type IN ('TIA','Stroke','Amaurosis Fugax','Asymptomatic')),
  stenosis_percent REAL,
  contralateral_stenosis TEXT CHECK(contralateral_stenosis IN ('<50%','50-69%','70-99%','Occluded','Unknown')),
  procedure_subtype TEXT CHECK(procedure_subtype IN ('Carotid Endarterectomy','Carotid Artery Stenting','TCAR')),
  cea_technique TEXT CHECK(cea_technique IN ('Standard','Eversion')),
  shunt_used INTEGER DEFAULT 0,
  shunt_type TEXT,
  patch_used INTEGER DEFAULT 0,
  patch_type TEXT CHECK(patch_type IN ('Dacron','PTFE','Vein','Bovine Pericardium')),
  clamp_time_minutes INTEGER,
  cranial_nerve_injury INTEGER DEFAULT 0,
  cranial_nerve_type TEXT,
  periop_stroke INTEGER DEFAULT 0,
  periop_stroke_side TEXT CHECK(periop_stroke_side IN ('Ipsilateral','Contralateral','Unknown')),
  restenosis_50_followup INTEGER DEFAULT 0,
  hyperperfusion_syndrome INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pad_module (
  pad_id INTEGER PRIMARY KEY AUTOINCREMENT,
  procedure_id INTEGER NOT NULL REFERENCES procedures(procedure_id) ON DELETE CASCADE,
  indication TEXT CHECK(indication IN ('Claudication','Rest Pain','Tissue Loss','Acute Ischemia')),
  rutherford_class INTEGER CHECK(rutherford_class BETWEEN 0 AND 6),
  wifi_wound_score INTEGER,
  wifi_ischemia_score INTEGER,
  wifi_infection_score INTEGER,
  inflow_artery TEXT,
  outflow_artery TEXT,
  conduit_type TEXT CHECK(conduit_type IN ('Great Saphenous Vein','Small Saphenous Vein','Arm Vein','PTFE','Dacron','Composite','Umbilical Vein')),
  graft_diameter_mm REAL,
  proximal_anastomosis TEXT,
  distal_anastomosis TEXT,
  abi_preop REAL,
  abi_postop REAL,
  toe_pressure_preop REAL,
  toe_pressure_postop REAL,
  primary_patency INTEGER DEFAULT 1,
  assisted_patency INTEGER DEFAULT 0,
  secondary_patency INTEGER DEFAULT 0,
  limb_salvage INTEGER DEFAULT 1,
  major_amputation INTEGER DEFAULT 0,
  minor_amputation INTEGER DEFAULT 0,
  stent_used INTEGER DEFAULT 0,
  stent_type TEXT,
  balloon_size_mm REAL,
  lesion_length_cm REAL,
  tasc_classification TEXT CHECK(tasc_classification IN ('A','B','C','D'))
);

CREATE TABLE IF NOT EXISTS dialysis_access_module (
  access_id INTEGER PRIMARY KEY AUTOINCREMENT,
  procedure_id INTEGER NOT NULL REFERENCES procedures(procedure_id) ON DELETE CASCADE,
  access_type TEXT CHECK(access_type IN ('AVF','AVG','Tunneled Catheter','Non-tunneled Catheter')),
  access_location TEXT,
  inflow_artery TEXT,
  outflow_vein TEXT,
  graft_material TEXT,
  maturation_weeks INTEGER,
  primary_failure INTEGER DEFAULT 0,
  primary_patency_months INTEGER,
  assisted_patency_months INTEGER,
  secondary_patency_months INTEGER,
  thrombosis INTEGER DEFAULT 0,
  steal_syndrome INTEGER DEFAULT 0,
  infection INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS venous_module (
  venous_id INTEGER PRIMARY KEY AUTOINCREMENT,
  procedure_id INTEGER NOT NULL REFERENCES procedures(procedure_id) ON DELETE CASCADE,
  ceap_clinical INTEGER CHECK(ceap_clinical BETWEEN 0 AND 6),
  ceap_etiology TEXT CHECK(ceap_etiology IN ('Congenital','Primary','Secondary','Unknown')),
  ceap_anatomy TEXT,
  ceap_pathophysiology TEXT,
  vcss_pain INTEGER DEFAULT 0,
  vcss_varicose_veins INTEGER DEFAULT 0,
  vcss_venous_edema INTEGER DEFAULT 0,
  vcss_skin_pigmentation INTEGER DEFAULT 0,
  vcss_inflammation INTEGER DEFAULT 0,
  vcss_induration INTEGER DEFAULT 0,
  vcss_ulcer_active INTEGER DEFAULT 0,
  vcss_ulcer_duration INTEGER DEFAULT 0,
  vcss_ulcer_size INTEGER DEFAULT 0,
  vcss_compression_use INTEGER DEFAULT 0,
  vein_treated TEXT,
  technique TEXT CHECK(technique IN ('EVLA','RFA','Sclerotherapy','Phlebectomy','Open Stripping','Stenting','Other')),
  closure_length_cm REAL,
  foam_volume_ml REAL,
  recurrence INTEGER DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS devices (
  device_id INTEGER PRIMARY KEY AUTOINCREMENT,
  procedure_id INTEGER NOT NULL REFERENCES procedures(procedure_id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  size_description TEXT,
  lot_number TEXT,
  serial_number TEXT,
  ref_number TEXT,
  expiry_date TEXT,
  implanted INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS procedure_photos (
  photo_id INTEGER PRIMARY KEY AUTOINCREMENT,
  procedure_id INTEGER NOT NULL REFERENCES procedures(procedure_id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  taken_date TEXT,
  anatomical_location TEXT,
  photo_type TEXT CHECK(photo_type IN ('Pre-operative','Intraoperative','Post-operative','Follow-up','Wound')),
  wifi_wound INTEGER CHECK(wifi_wound BETWEEN 0 AND 3),
  wifi_ischemia INTEGER CHECK(wifi_ischemia BETWEEN 0 AND 3),
  wifi_infection INTEGER CHECK(wifi_infection BETWEEN 0 AND 3),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(user_id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id INTEGER,
  old_data TEXT,
  new_data TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_procedures_patient ON procedures(patient_id);
CREATE INDEX IF NOT EXISTS idx_procedures_date ON procedures(procedure_date);
CREATE INDEX IF NOT EXISTS idx_procedures_type ON procedures(procedure_type);
CREATE INDEX IF NOT EXISTS idx_followup_procedure ON followup(procedure_id);
CREATE INDEX IF NOT EXISTS idx_postop_procedure ON postoperative(procedure_id);
CREATE INDEX IF NOT EXISTS idx_intraop_procedure ON intraoperative(procedure_id);
`;

module.exports = { SCHEMA_SQL };
