const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const { SCHEMA_SQL } = require('./schema');

let db;

function getDbPath() {
  const userDataPath = app ? app.getPath('userData') : path.join(__dirname, '../../data');
  return path.join(userDataPath, 'vqi_registry.db');
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'vqi_registry_salt_2024').digest('hex');
}

function initDatabase() {
  const Database = require('better-sqlite3');
  const dbPath = getDbPath();
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA_SQL);
  seedDefaultData();
  return db;
}

function seedDefaultData() {
  const adminExists = db.prepare('SELECT user_id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    db.prepare(`INSERT INTO users (username, password_hash, full_name, role) VALUES (?,?,?,?)`)
      .run('admin', hashPassword('admin123'), 'System Administrator', 'administrator');
  }

  const surgeonExists = db.prepare('SELECT surgeon_id FROM surgeons LIMIT 1').get();
  if (!surgeonExists) {
    const insertSurgeon = db.prepare(
      `INSERT INTO surgeons (first_name, last_name, specialty) VALUES (?,?,?)`
    );
    insertSurgeon.run('John', 'Smith', 'Vascular Surgery');
    insertSurgeon.run('Sarah', 'Johnson', 'Vascular Surgery');
    insertSurgeon.run('Michael', 'Davis', 'Vascular Surgery');
  }
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

function loginUser(username, password) {
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
  if (!user) return null;
  const hash = hashPassword(password);
  if (hash !== user.password_hash) return null;
  db.prepare(`UPDATE users SET last_login = datetime('now') WHERE user_id = ?`).run(user.user_id);
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

// ─── PATIENTS ────────────────────────────────────────────────────────────────

function getPatients(filters = {}) {
  let query = `
    SELECT p.*,
      (SELECT COUNT(*) FROM procedures pr WHERE pr.patient_id = p.patient_id) AS procedure_count,
      (SELECT MAX(procedure_date) FROM procedures pr WHERE pr.patient_id = p.patient_id) AS last_procedure_date
    FROM patients p
    WHERE 1=1
  `;
  const params = [];
  if (filters.search) {
    query += ` AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.mrn LIKE ?)`;
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }
  if (filters.sex) { query += ` AND p.sex = ?`; params.push(filters.sex); }
  query += ` ORDER BY p.last_name, p.first_name`;
  if (filters.limit) { query += ` LIMIT ? OFFSET ?`; params.push(filters.limit, filters.offset || 0); }
  return db.prepare(query).all(...params);
}

function getPatientById(patientId) {
  const patient = db.prepare('SELECT * FROM patients WHERE patient_id = ?').get(patientId);
  if (!patient) return null;
  patient.comorbidities = db.prepare('SELECT * FROM comorbidities WHERE patient_id = ?').get(patientId);
  patient.medications = db.prepare('SELECT * FROM medications WHERE patient_id = ?').get(patientId);
  patient.procedures = db.prepare(`
    SELECT pr.*, s.first_name || ' ' || s.last_name AS surgeon_name
    FROM procedures pr
    LEFT JOIN surgeons s ON pr.surgeon_id = s.surgeon_id
    WHERE pr.patient_id = ?
    ORDER BY pr.procedure_date DESC
  `).all(patientId);
  return patient;
}

function createPatient(data) {
  const { comorbidities, medications, ...patientData } = data;
  if (patientData.height_cm && patientData.weight_kg) {
    const h = patientData.height_cm / 100;
    patientData.bmi = parseFloat((patientData.weight_kg / (h * h)).toFixed(1));
  }

  const stmt = db.prepare(`
    INSERT INTO patients (mrn, first_name, last_name, date_of_birth, sex, race, ethnicity,
      height_cm, weight_kg, bmi, phone, email, address, insurance, referring_physician,
      primary_care_provider, zip_code, consent_signed, enrollment_date)
    VALUES (@mrn, @first_name, @last_name, @date_of_birth, @sex, @race, @ethnicity,
      @height_cm, @weight_kg, @bmi, @phone, @email, @address, @insurance, @referring_physician,
      @primary_care_provider, @zip_code, @consent_signed, @enrollment_date)
  `);
  const result = stmt.run(patientData);
  const patientId = result.lastInsertRowid;

  if (comorbidities) {
    db.prepare(`INSERT OR REPLACE INTO comorbidities (patient_id, ${Object.keys(comorbidities).join(', ')})
      VALUES (${patientId}, ${Object.keys(comorbidities).map(() => '?').join(', ')})`
    ).run(...Object.values(comorbidities));
  }
  if (medications) {
    db.prepare(`INSERT OR REPLACE INTO medications (patient_id, ${Object.keys(medications).join(', ')})
      VALUES (${patientId}, ${Object.keys(medications).map(() => '?').join(', ')})`
    ).run(...Object.values(medications));
  }
  return { patient_id: patientId };
}

function updatePatient(patientId, data) {
  const { comorbidities, medications, ...patientData } = data;
  if (patientData.height_cm && patientData.weight_kg) {
    const h = patientData.height_cm / 100;
    patientData.bmi = parseFloat((patientData.weight_kg / (h * h)).toFixed(1));
  }

  const fields = Object.keys(patientData).map(k => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE patients SET ${fields}, updated_at = datetime('now') WHERE patient_id = @patient_id`)
    .run({ ...patientData, patient_id: patientId });

  if (comorbidities) {
    const existing = db.prepare('SELECT comorbidity_id FROM comorbidities WHERE patient_id = ?').get(patientId);
    if (existing) {
      const fields2 = Object.keys(comorbidities).map(k => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE comorbidities SET ${fields2} WHERE patient_id = @patient_id`)
        .run({ ...comorbidities, patient_id: patientId });
    } else {
      db.prepare(`INSERT INTO comorbidities (patient_id, ${Object.keys(comorbidities).join(', ')})
        VALUES (@patient_id, ${Object.keys(comorbidities).map(k => `@${k}`).join(', ')})`
      ).run({ ...comorbidities, patient_id: patientId });
    }
  }
  if (medications) {
    const existing = db.prepare('SELECT medication_id FROM medications WHERE patient_id = ?').get(patientId);
    if (existing) {
      const fields2 = Object.keys(medications).map(k => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE medications SET ${fields2} WHERE patient_id = @patient_id`)
        .run({ ...medications, patient_id: patientId });
    } else {
      db.prepare(`INSERT INTO medications (patient_id, ${Object.keys(medications).join(', ')})
        VALUES (@patient_id, ${Object.keys(medications).map(k => `@${k}`).join(', ')})`
      ).run({ ...medications, patient_id: patientId });
    }
  }
  return { success: true };
}

function deletePatient(patientId) {
  db.prepare('DELETE FROM patients WHERE patient_id = ?').run(patientId);
  return { success: true };
}

// ─── PROCEDURES ──────────────────────────────────────────────────────────────

function getProcedures(filters = {}) {
  let query = `
    SELECT pr.*,
      p.first_name || ' ' || p.last_name AS patient_name,
      p.mrn,
      p.date_of_birth,
      s.first_name || ' ' || s.last_name AS surgeon_name,
      po.stroke, po.myocardial_infarction, po.death_30_day, po.hospital_days
    FROM procedures pr
    JOIN patients p ON pr.patient_id = p.patient_id
    LEFT JOIN surgeons s ON pr.surgeon_id = s.surgeon_id
    LEFT JOIN postoperative po ON po.procedure_id = pr.procedure_id
    WHERE 1=1
  `;
  const params = [];
  if (filters.patientId) { query += ` AND pr.patient_id = ?`; params.push(filters.patientId); }
  if (filters.procedureType) { query += ` AND pr.procedure_type = ?`; params.push(filters.procedureType); }
  if (filters.surgeonId) { query += ` AND pr.surgeon_id = ?`; params.push(filters.surgeonId); }
  if (filters.dateFrom) { query += ` AND pr.procedure_date >= ?`; params.push(filters.dateFrom); }
  if (filters.dateTo) { query += ` AND pr.procedure_date <= ?`; params.push(filters.dateTo); }
  if (filters.urgency) { query += ` AND pr.urgency = ?`; params.push(filters.urgency); }
  if (filters.search) {
    query += ` AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.mrn LIKE ?)`;
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }
  query += ` ORDER BY pr.procedure_date DESC`;
  if (filters.limit) { query += ` LIMIT ? OFFSET ?`; params.push(filters.limit, filters.offset || 0); }
  return db.prepare(query).all(...params);
}

function getProcedureById(procedureId) {
  const proc = db.prepare(`
    SELECT pr.*,
      p.first_name || ' ' || p.last_name AS patient_name, p.mrn, p.date_of_birth, p.sex,
      s.first_name || ' ' || s.last_name AS surgeon_name
    FROM procedures pr
    JOIN patients p ON pr.patient_id = p.patient_id
    LEFT JOIN surgeons s ON pr.surgeon_id = s.surgeon_id
    WHERE pr.procedure_id = ?
  `).get(procedureId);
  if (!proc) return null;
  proc.intraoperative = db.prepare('SELECT * FROM intraoperative WHERE procedure_id = ?').get(procedureId);
  proc.postoperative = db.prepare('SELECT * FROM postoperative WHERE procedure_id = ?').get(procedureId);
  proc.followups = db.prepare('SELECT * FROM followup WHERE procedure_id = ? ORDER BY followup_date').all(procedureId);
  proc.evar_module = db.prepare('SELECT * FROM evar_module WHERE procedure_id = ?').get(procedureId);
  proc.carotid_module = db.prepare('SELECT * FROM carotid_module WHERE procedure_id = ?').get(procedureId);
  proc.pad_module = db.prepare('SELECT * FROM pad_module WHERE procedure_id = ?').get(procedureId);
  proc.venous_module = db.prepare('SELECT * FROM venous_module WHERE procedure_id = ?').get(procedureId);
  return proc;
}

function createProcedure(data) {
  const { intraoperative, postoperative, evar_module, carotid_module, pad_module, venous_module, ...procData } = data;
  const stmt = db.prepare(`
    INSERT INTO procedures (patient_id, procedure_type, procedure_date, surgeon_id, assistant,
      hospital, urgency, anesthesia_type, indication, symptom_status, admission_type,
      preop_imaging, stenosis_percent, aneurysm_diameter, aneurysm_growth_rate, abi_preop,
      toe_pressure, rutherford_class, wound_classification, infection_present, tissue_loss,
      baseline_creatinine, hemoglobin, platelet_count, notes)
    VALUES (@patient_id, @procedure_type, @procedure_date, @surgeon_id, @assistant,
      @hospital, @urgency, @anesthesia_type, @indication, @symptom_status, @admission_type,
      @preop_imaging, @stenosis_percent, @aneurysm_diameter, @aneurysm_growth_rate, @abi_preop,
      @toe_pressure, @rutherford_class, @wound_classification, @infection_present, @tissue_loss,
      @baseline_creatinine, @hemoglobin, @platelet_count, @notes)
  `);
  const result = stmt.run(procData);
  const procedureId = result.lastInsertRowid;

  if (intraoperative) upsertIntraoperative(procedureId, intraoperative);
  if (postoperative) upsertPostoperative(procedureId, postoperative);
  if (evar_module) upsertModule('evar_module', 'evar_id', procedureId, evar_module);
  if (carotid_module) upsertModule('carotid_module', 'carotid_id', procedureId, carotid_module);
  if (pad_module) upsertModule('pad_module', 'pad_id', procedureId, pad_module);
  if (venous_module) upsertVenousModule(procedureId, venous_module);

  return { procedure_id: procedureId };
}

const PROCEDURE_COLUMNS = new Set([
  'patient_id', 'procedure_type', 'procedure_date', 'surgeon_id', 'assistant',
  'hospital', 'urgency', 'anesthesia_type', 'indication', 'symptom_status', 'admission_type',
  'preop_imaging', 'stenosis_percent', 'aneurysm_diameter', 'aneurysm_growth_rate', 'abi_preop',
  'toe_pressure', 'rutherford_class', 'wound_classification', 'infection_present', 'tissue_loss',
  'baseline_creatinine', 'hemoglobin', 'platelet_count', 'notes'
]);

function updateProcedure(procedureId, data) {
  const { intraoperative, postoperative, evar_module, carotid_module, pad_module, venous_module, ...rawProcData } = data;
  const procData = Object.fromEntries(Object.entries(rawProcData).filter(([k]) => PROCEDURE_COLUMNS.has(k)));
  if (Object.keys(procData).length > 0) {
    const fields = Object.keys(procData).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE procedures SET ${fields}, updated_at = datetime('now') WHERE procedure_id = @procedure_id`)
      .run({ ...procData, procedure_id: procedureId });
  }
  if (intraoperative) upsertIntraoperative(procedureId, intraoperative);
  if (postoperative) upsertPostoperative(procedureId, postoperative);
  if (evar_module) upsertModule('evar_module', 'evar_id', procedureId, evar_module);
  if (carotid_module) upsertModule('carotid_module', 'carotid_id', procedureId, carotid_module);
  if (pad_module) upsertModule('pad_module', 'pad_id', procedureId, pad_module);
  if (venous_module) upsertVenousModule(procedureId, venous_module);
  return { success: true };
}

function upsertIntraoperative(procedureId, data) {
  const existing = db.prepare('SELECT intraop_id FROM intraoperative WHERE procedure_id = ?').get(procedureId);
  if (existing) {
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE intraoperative SET ${fields} WHERE procedure_id = @procedure_id`)
      .run({ ...data, procedure_id: procedureId });
  } else {
    const cols = ['procedure_id', ...Object.keys(data)];
    const vals = cols.map(c => `@${c}`).join(', ');
    db.prepare(`INSERT INTO intraoperative (${cols.join(', ')}) VALUES (${vals})`)
      .run({ ...data, procedure_id: procedureId });
  }
}

function upsertPostoperative(procedureId, data) {
  const existing = db.prepare('SELECT postop_id FROM postoperative WHERE procedure_id = ?').get(procedureId);
  if (existing) {
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE postoperative SET ${fields} WHERE procedure_id = @procedure_id`)
      .run({ ...data, procedure_id: procedureId });
  } else {
    const cols = ['procedure_id', ...Object.keys(data)];
    const vals = cols.map(c => `@${c}`).join(', ');
    db.prepare(`INSERT INTO postoperative (${cols.join(', ')}) VALUES (${vals})`)
      .run({ ...data, procedure_id: procedureId });
  }
}

function upsertModule(tableName, pkName, procedureId, data) {
  const existing = db.prepare(`SELECT ${pkName} FROM ${tableName} WHERE procedure_id = ?`).get(procedureId);
  if (existing) {
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE ${tableName} SET ${fields} WHERE procedure_id = @procedure_id`)
      .run({ ...data, procedure_id: procedureId });
  } else {
    const cols = ['procedure_id', ...Object.keys(data)];
    const vals = cols.map(c => `@${c}`).join(', ');
    db.prepare(`INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${vals})`)
      .run({ ...data, procedure_id: procedureId });
  }
}

function deleteProcedure(procedureId) {
  db.prepare('DELETE FROM procedures WHERE procedure_id = ?').run(procedureId);
  return { success: true };
}

// ─── FOLLOW-UP ───────────────────────────────────────────────────────────────

function getFollowups(procedureId) {
  return db.prepare('SELECT * FROM followup WHERE procedure_id = ? ORDER BY followup_date').all(procedureId);
}

function createFollowup(data) {
  const cols = Object.keys(data);
  const vals = cols.map(c => `@${c}`).join(', ');
  const result = db.prepare(`INSERT INTO followup (${cols.join(', ')}) VALUES (${vals})`).run(data);
  return { followup_id: result.lastInsertRowid };
}

function updateFollowup(followupId, data) {
  const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE followup SET ${fields} WHERE followup_id = @followup_id`)
    .run({ ...data, followup_id: followupId });
  return { success: true };
}

function deleteFollowup(followupId) {
  db.prepare('DELETE FROM followup WHERE followup_id = ?').run(followupId);
  return { success: true };
}

// ─── SURGEONS ────────────────────────────────────────────────────────────────

function getSurgeons() {
  return db.prepare('SELECT * FROM surgeons WHERE active = 1 ORDER BY last_name, first_name').all();
}

function createSurgeon(data) {
  const result = db.prepare(
    `INSERT INTO surgeons (first_name, last_name, specialty, license_number) VALUES (?,?,?,?)`
  ).run(data.first_name, data.last_name, data.specialty, data.license_number);
  return { surgeon_id: result.lastInsertRowid };
}

function updateSurgeon(surgeonId, data) {
  const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE surgeons SET ${fields} WHERE surgeon_id = @surgeon_id`)
    .run({ ...data, surgeon_id: surgeonId });
  return { success: true };
}

// ─── USERS ───────────────────────────────────────────────────────────────────

function getUsers() {
  return db.prepare('SELECT user_id, username, full_name, role, active, last_login, created_at FROM users ORDER BY full_name').all();
}

function createUser(data) {
  const hash = hashPassword(data.password);
  const result = db.prepare(
    `INSERT INTO users (username, password_hash, full_name, role) VALUES (?,?,?,?)`
  ).run(data.username, hash, data.full_name, data.role);
  return { user_id: result.lastInsertRowid };
}

function updateUser(userId, data) {
  if (data.password) {
    data.password_hash = hashPassword(data.password);
    delete data.password;
  }
  const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE users SET ${fields} WHERE user_id = @user_id`)
    .run({ ...data, user_id: userId });
  return { success: true };
}

function deleteUser(userId) {
  db.prepare('UPDATE users SET active = 0 WHERE user_id = ?').run(userId);
  return { success: true };
}

// ─── REPORTS / DASHBOARD ─────────────────────────────────────────────────────

function getDashboardStats() {
  const totalPatients = db.prepare('SELECT COUNT(*) AS count FROM patients').get().count;
  const totalProcedures = db.prepare('SELECT COUNT(*) AS count FROM procedures').get().count;

  const strokeRate = db.prepare(`
    SELECT ROUND(SUM(CASE WHEN po.stroke = 1 THEN 1.0 ELSE 0 END) / MAX(COUNT(*), 1) * 100, 2) AS rate
    FROM postoperative po
    JOIN procedures pr ON po.procedure_id = pr.procedure_id
  `).get().rate || 0;

  const mortalityRate = db.prepare(`
    SELECT ROUND(SUM(CASE WHEN po.death_30_day = 1 THEN 1.0 ELSE 0 END) / MAX(COUNT(*), 1) * 100, 2) AS rate
    FROM postoperative po
  `).get().rate || 0;

  const reinterventionRate = db.prepare(`
    SELECT ROUND(SUM(CASE WHEN f.reintervention = 1 THEN 1.0 ELSE 0 END) / MAX(COUNT(*), 1) * 100, 2) AS rate
    FROM followup f
  `).get().rate || 0;

  const limbSalvageRate = db.prepare(`
    SELECT ROUND(SUM(CASE WHEN po.amputation = 0 THEN 1.0 ELSE 0 END) / MAX(COUNT(*), 1) * 100, 2) AS rate
    FROM postoperative po
    JOIN procedures pr ON po.procedure_id = pr.procedure_id
    WHERE pr.procedure_type IN ('Peripheral Bypass','Peripheral Angioplasty/Stenting','Amputation')
  `).get().rate || 100;

  const miRate = db.prepare(`
    SELECT ROUND(SUM(CASE WHEN po.myocardial_infarction = 1 THEN 1.0 ELSE 0 END) / MAX(COUNT(*), 1) * 100, 2) AS rate
    FROM postoperative po
  `).get().rate || 0;

  const monthlyVolume = db.prepare(`
    SELECT strftime('%Y-%m', procedure_date) AS month, COUNT(*) AS count,
      procedure_type
    FROM procedures
    WHERE procedure_date >= date('now', '-12 months')
    GROUP BY month, procedure_type
    ORDER BY month
  `).all();

  const procedureTypeBreakdown = db.prepare(`
    SELECT procedure_type, COUNT(*) AS count
    FROM procedures
    GROUP BY procedure_type
    ORDER BY count DESC
  `).all();

  const surgeonVolume = db.prepare(`
    SELECT s.first_name || ' ' || s.last_name AS surgeon_name, COUNT(*) AS count
    FROM procedures pr
    LEFT JOIN surgeons s ON pr.surgeon_id = s.surgeon_id
    GROUP BY pr.surgeon_id
    ORDER BY count DESC
    LIMIT 10
  `).all();

  const recentPatients = db.prepare(`
    SELECT p.patient_id, p.mrn, p.first_name || ' ' || p.last_name AS name,
      p.date_of_birth, p.created_at,
      (SELECT COUNT(*) FROM procedures pr WHERE pr.patient_id = p.patient_id) AS proc_count
    FROM patients p
    ORDER BY p.created_at DESC LIMIT 5
  `).all();

  const upcomingFollowups = db.prepare(`
    SELECT p.first_name || ' ' || p.last_name AS patient_name, p.mrn,
      po.followup_date, pr.procedure_type, pr.procedure_date
    FROM postoperative po
    JOIN procedures pr ON po.procedure_id = pr.procedure_id
    JOIN patients p ON pr.patient_id = p.patient_id
    WHERE po.followup_scheduled = 1 AND po.followup_date >= date('now')
    ORDER BY po.followup_date LIMIT 10
  `).all();

  return {
    totalPatients, totalProcedures, strokeRate, mortalityRate,
    reinterventionRate, limbSalvageRate, miRate,
    monthlyVolume, procedureTypeBreakdown, surgeonVolume,
    recentPatients, upcomingFollowups
  };
}

function getReportData(reportType, filters = {}) {
  const { dateFrom, dateTo, surgeonId, procedureType } = filters;
  let dateFilter = '';
  const params = [];
  if (dateFrom) { dateFilter += ` AND pr.procedure_date >= ?`; params.push(dateFrom); }
  if (dateTo) { dateFilter += ` AND pr.procedure_date <= ?`; params.push(dateTo); }
  if (surgeonId) { dateFilter += ` AND pr.surgeon_id = ?`; params.push(surgeonId); }

  switch (reportType) {
    case 'baseline_characteristics': {
      return db.prepare(`
        SELECT
          COUNT(*) AS total_patients,
          ROUND(AVG((julianday('now') - julianday(p.date_of_birth)) / 365.25), 1) AS mean_age,
          SUM(CASE WHEN p.sex = 'Male' THEN 1 ELSE 0 END) AS male_count,
          SUM(CASE WHEN c.diabetes = 1 THEN 1 ELSE 0 END) AS diabetes_count,
          SUM(CASE WHEN c.hypertension = 1 THEN 1 ELSE 0 END) AS hypertension_count,
          SUM(CASE WHEN c.smoking_status = 'Current' THEN 1 ELSE 0 END) AS current_smokers,
          SUM(CASE WHEN c.coronary_artery_disease = 1 THEN 1 ELSE 0 END) AS cad_count,
          SUM(CASE WHEN c.copd = 1 THEN 1 ELSE 0 END) AS copd_count,
          SUM(CASE WHEN c.dialysis = 1 THEN 1 ELSE 0 END) AS dialysis_count,
          SUM(CASE WHEN c.prior_stroke = 1 THEN 1 ELSE 0 END) AS prior_stroke_count
        FROM patients p
        LEFT JOIN comorbidities c ON p.patient_id = c.patient_id
      `).get();
    }
    case 'procedural_outcomes': {
      const typeFilter = procedureType ? ` AND pr.procedure_type = ?` : '';
      if (procedureType) params.push(procedureType);
      return db.prepare(`
        SELECT
          pr.procedure_type,
          COUNT(*) AS procedure_count,
          ROUND(AVG(po.hospital_days), 1) AS avg_hospital_days,
          SUM(CASE WHEN po.stroke = 1 THEN 1 ELSE 0 END) AS stroke_count,
          ROUND(SUM(CASE WHEN po.stroke = 1 THEN 1.0 ELSE 0 END) / MAX(COUNT(*),1) * 100, 2) AS stroke_rate,
          SUM(CASE WHEN po.myocardial_infarction = 1 THEN 1 ELSE 0 END) AS mi_count,
          ROUND(SUM(CASE WHEN po.myocardial_infarction = 1 THEN 1.0 ELSE 0 END) / MAX(COUNT(*),1) * 100, 2) AS mi_rate,
          SUM(CASE WHEN po.death_30_day = 1 THEN 1 ELSE 0 END) AS mortality_count,
          ROUND(SUM(CASE WHEN po.death_30_day = 1 THEN 1.0 ELSE 0 END) / MAX(COUNT(*),1) * 100, 2) AS mortality_rate,
          SUM(CASE WHEN po.reoperation = 1 THEN 1 ELSE 0 END) AS reoperation_count
        FROM procedures pr
        LEFT JOIN postoperative po ON po.procedure_id = pr.procedure_id
        WHERE 1=1 ${dateFilter} ${typeFilter}
        GROUP BY pr.procedure_type
        ORDER BY procedure_count DESC
      `).all(...params);
    }
    case 'surgeon_volume': {
      return db.prepare(`
        SELECT
          s.first_name || ' ' || s.last_name AS surgeon_name,
          pr.procedure_type,
          COUNT(*) AS procedure_count,
          ROUND(SUM(CASE WHEN po.death_30_day = 1 THEN 1.0 ELSE 0 END) / MAX(COUNT(*),1) * 100, 2) AS mortality_rate,
          ROUND(SUM(CASE WHEN po.stroke = 1 THEN 1.0 ELSE 0 END) / MAX(COUNT(*),1) * 100, 2) AS stroke_rate,
          ROUND(AVG(po.hospital_days), 1) AS avg_los
        FROM procedures pr
        LEFT JOIN surgeons s ON pr.surgeon_id = s.surgeon_id
        LEFT JOIN postoperative po ON po.procedure_id = pr.procedure_id
        WHERE 1=1 ${dateFilter}
        GROUP BY pr.surgeon_id, pr.procedure_type
        ORDER BY surgeon_name, procedure_count DESC
      `).all(...params);
    }
    case 'carotid_outcomes': {
      return db.prepare(`
        SELECT
          pr.procedure_date, p.mrn,
          p.first_name || ' ' || p.last_name AS patient_name,
          c.symptomatic, c.stenosis_percent, c.procedure_subtype,
          c.shunt_used, c.patch_used,
          po.stroke, po.death_30_day, po.hospital_days,
          c.cranial_nerve_injury, c.periop_stroke
        FROM procedures pr
        JOIN patients p ON pr.patient_id = p.patient_id
        JOIN carotid_module c ON c.procedure_id = pr.procedure_id
        LEFT JOIN postoperative po ON po.procedure_id = pr.procedure_id
        WHERE 1=1 ${dateFilter}
        ORDER BY pr.procedure_date DESC
      `).all(...params);
    }
    case 'aaa_outcomes': {
      return db.prepare(`
        SELECT
          pr.procedure_date, p.mrn,
          p.first_name || ' ' || p.last_name AS patient_name,
          e.aneurysm_diameter_mm, e.aneurysm_location, e.rupture_status,
          e.endograft_manufacturer, e.endoleak_type,
          po.death_30_day, po.renal_failure, po.hospital_days,
          po.death_in_hospital
        FROM procedures pr
        JOIN patients p ON pr.patient_id = p.patient_id
        JOIN evar_module e ON e.procedure_id = pr.procedure_id
        LEFT JOIN postoperative po ON po.procedure_id = pr.procedure_id
        WHERE 1=1 ${dateFilter}
        ORDER BY pr.procedure_date DESC
      `).all(...params);
    }
    case 'pad_outcomes': {
      return db.prepare(`
        SELECT
          pr.procedure_date, p.mrn,
          p.first_name || ' ' || p.last_name AS patient_name,
          pad.indication, pad.rutherford_class, pad.conduit_type,
          pad.inflow_artery, pad.outflow_artery,
          pad.abi_preop, pad.abi_postop,
          po.amputation, po.death_30_day, po.hospital_days
        FROM procedures pr
        JOIN patients p ON pr.patient_id = p.patient_id
        JOIN pad_module pad ON pad.procedure_id = pr.procedure_id
        LEFT JOIN postoperative po ON po.procedure_id = pr.procedure_id
        WHERE 1=1 ${dateFilter}
        ORDER BY pr.procedure_date DESC
      `).all(...params);
    }
    case 'followup_summary': {
      return db.prepare(`
        SELECT
          f.followup_interval,
          COUNT(*) AS followup_count,
          SUM(CASE WHEN f.alive = 1 THEN 1 ELSE 0 END) AS alive_count,
          SUM(CASE WHEN f.reintervention = 1 THEN 1 ELSE 0 END) AS reintervention_count,
          SUM(CASE WHEN f.stroke = 1 THEN 1 ELSE 0 END) AS stroke_count,
          SUM(CASE WHEN f.amputation = 1 THEN 1 ELSE 0 END) AS amputation_count,
          ROUND(AVG(f.abi), 2) AS avg_abi
        FROM followup f
        JOIN procedures pr ON f.procedure_id = pr.procedure_id
        WHERE 1=1 ${dateFilter}
        GROUP BY f.followup_interval
        ORDER BY CASE f.followup_interval
          WHEN '30 Day' THEN 1 WHEN '6 Month' THEN 2 WHEN '1 Year' THEN 3
          WHEN '2 Year' THEN 4 WHEN '3 Year' THEN 5 WHEN '4 Year' THEN 6
          WHEN '5 Year' THEN 7 WHEN 'Annual' THEN 8 END
      `).all(...params);
    }
    default:
      return [];
  }
}

function exportPatientData(filters = {}) {
  const patients = db.prepare(`
    SELECT p.*, c.smoking_status, c.hypertension, c.diabetes, c.hyperlipidemia,
      c.coronary_artery_disease, c.copd, c.ckd_stage, c.dialysis, c.prior_stroke
    FROM patients p
    LEFT JOIN comorbidities c ON p.patient_id = c.patient_id
    ORDER BY p.last_name, p.first_name
  `).all();
  return patients;
}

function exportProcedureData(filters = {}) {
  return db.prepare(`
    SELECT pr.procedure_id, p.mrn, p.first_name || ' ' || p.last_name AS patient_name,
      p.date_of_birth, p.sex,
      pr.procedure_type, pr.procedure_date, pr.urgency, pr.anesthesia_type,
      s.first_name || ' ' || s.last_name AS surgeon_name,
      io.duration_minutes, io.blood_loss_ml, io.technical_success,
      po.icu_admission, po.hospital_days, po.stroke, po.myocardial_infarction,
      po.renal_failure, po.reoperation, po.death_30_day, po.discharge_status
    FROM procedures pr
    JOIN patients p ON pr.patient_id = p.patient_id
    LEFT JOIN surgeons s ON pr.surgeon_id = s.surgeon_id
    LEFT JOIN intraoperative io ON io.procedure_id = pr.procedure_id
    LEFT JOIN postoperative po ON po.procedure_id = pr.procedure_id
    ORDER BY pr.procedure_date DESC
  `).all();
}

function backupDatabase(destPath) {
  return new Promise((resolve, reject) => {
    db.backup(destPath)
      .then(() => resolve({ success: true, path: destPath }))
      .catch(err => reject(err));
  });
}

// ─── TABLE 1 RAW DATA (for frontend statistical tests) ───────────────────────

function getPatientRawData(patientIds) {
  if (!patientIds || patientIds.length === 0) return [];
  const placeholders = patientIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT
      p.patient_id, p.date_of_birth, p.sex, p.race, p.ethnicity,
      p.bmi, p.height_cm, p.weight_kg,
      c.hypertension, c.diabetes, c.diabetes_type, c.hba1c, c.hyperlipidemia,
      c.coronary_artery_disease, c.prior_mi, c.prior_cabg, c.prior_pci,
      c.heart_failure, c.nyha_class, c.copd, c.home_oxygen,
      c.ckd_stage, c.dialysis, c.atrial_fibrillation,
      c.prior_stroke, c.prior_tia, c.peripheral_artery_disease,
      c.claudication_history, c.prior_amputation, c.carotid_disease,
      c.family_history_aneurysm, c.frailty_score,
      c.smoking_status, c.pack_years, c.functional_status, c.ambulatory_status,
      m.aspirin, m.clopidogrel, m.ticagrelor, m.warfarin,
      m.apixaban, m.rivaroxaban, m.statin, m.beta_blocker,
      m.ace_inhibitor, m.arb, m.insulin, m.oral_diabetic_medications,
      -- Pre-op labs from most recent procedure
      (SELECT pr2.hemoglobin FROM procedures pr2
       WHERE pr2.patient_id = p.patient_id
       ORDER BY pr2.procedure_date DESC LIMIT 1) AS hemoglobin,
      (SELECT pr2.baseline_creatinine FROM procedures pr2
       WHERE pr2.patient_id = p.patient_id
       ORDER BY pr2.procedure_date DESC LIMIT 1) AS creatinine,
      (SELECT pr2.platelet_count FROM procedures pr2
       WHERE pr2.patient_id = p.patient_id
       ORDER BY pr2.procedure_date DESC LIMIT 1) AS platelet_count,
      (SELECT pr2.procedure_type FROM procedures pr2
       WHERE pr2.patient_id = p.patient_id
       ORDER BY pr2.procedure_date DESC LIMIT 1) AS last_procedure_type,
      (SELECT COUNT(*) FROM procedures pr2
       WHERE pr2.patient_id = p.patient_id) AS procedure_count
    FROM patients p
    LEFT JOIN comorbidities c ON c.patient_id = p.patient_id
    LEFT JOIN medications m ON m.patient_id = p.patient_id
    WHERE p.patient_id IN (${placeholders})
    ORDER BY p.last_name, p.first_name
  `).all(...patientIds);
}

// ─── RED-FLAG ALERTS ─────────────────────────────────────────────────────────

function getRedFlags() {
  const today = new Date().toISOString().slice(0, 10);

  // Procedures with stroke or in-hospital death (last 90 days)
  const strokeDeath = db.prepare(`
    SELECT pr.procedure_id, pr.procedure_date, pr.procedure_type,
      p.patient_id, p.first_name || ' ' || p.last_name AS patient_name, p.mrn,
      po.stroke, po.death_in_hospital, po.death_30_day,
      po.amputation, po.reoperation
    FROM procedures pr
    JOIN patients p ON pr.patient_id = p.patient_id
    JOIN postoperative po ON po.procedure_id = pr.procedure_id
    WHERE pr.procedure_date >= date('now', '-90 days')
      AND (po.stroke = 1 OR po.death_in_hospital = 1 OR po.death_30_day = 1
           OR po.amputation = 1 OR po.reoperation = 1)
    ORDER BY pr.procedure_date DESC
  `).all();

  // Missed 30-day follow-ups: followup_scheduled=1, followup_date < today, no followup record
  const missedFollowups = db.prepare(`
    SELECT pr.procedure_id, pr.procedure_date, pr.procedure_type,
      p.patient_id, p.first_name || ' ' || p.last_name AS patient_name, p.mrn,
      po.followup_date
    FROM procedures pr
    JOIN patients p ON pr.patient_id = p.patient_id
    JOIN postoperative po ON po.procedure_id = pr.procedure_id
    WHERE po.followup_scheduled = 1
      AND po.followup_date IS NOT NULL
      AND po.followup_date < ?
      AND NOT EXISTS (SELECT 1 FROM followup f WHERE f.procedure_id = pr.procedure_id)
    ORDER BY po.followup_date ASC
    LIMIT 20
  `).all(today);

  // Carotid procedures with periop stroke
  const carotidStrokes = db.prepare(`
    SELECT pr.procedure_id, pr.procedure_date,
      p.patient_id, p.first_name || ' ' || p.last_name AS patient_name, p.mrn,
      cm.periop_stroke, cm.periop_stroke_side
    FROM procedures pr
    JOIN patients p ON pr.patient_id = p.patient_id
    JOIN carotid_module cm ON cm.procedure_id = pr.procedure_id
    WHERE pr.procedure_date >= date('now', '-90 days')
      AND cm.periop_stroke = 1
    ORDER BY pr.procedure_date DESC
  `).all();

  return { strokeDeath, missedFollowups, carotidStrokes };
}

// ─── RESEARCH / COHORT ENGINE ─────────────────────────────────────────────────

function getCohort(filters = {}) {
  let query = `
    SELECT DISTINCT p.patient_id, p.mrn, p.first_name, p.last_name,
      p.date_of_birth, p.sex, p.race,
      c.hypertension, c.diabetes, c.coronary_artery_disease, c.copd,
      c.heart_failure, c.prior_stroke, c.ckd_stage, c.dialysis,
      c.smoking_status, c.peripheral_artery_disease,
      c.functional_status, c.frailty_score,
      (SELECT COUNT(*) FROM procedures pr WHERE pr.patient_id = p.patient_id) AS procedure_count,
      (SELECT MAX(pr.procedure_date) FROM procedures pr WHERE pr.patient_id = p.patient_id) AS last_procedure_date
    FROM patients p
    LEFT JOIN comorbidities c ON c.patient_id = p.patient_id
    LEFT JOIN procedures pr ON pr.patient_id = p.patient_id
    WHERE 1=1
  `;
  const params = [];

  if (filters.sex) { query += ` AND p.sex = ?`; params.push(filters.sex); }
  if (filters.minAge) {
    query += ` AND (strftime('%Y','now') - strftime('%Y', p.date_of_birth)) >= ?`;
    params.push(Number(filters.minAge));
  }
  if (filters.maxAge) {
    query += ` AND (strftime('%Y','now') - strftime('%Y', p.date_of_birth)) <= ?`;
    params.push(Number(filters.maxAge));
  }
  if (filters.diabetes == 1) { query += ` AND c.diabetes = 1`; }
  if (filters.hypertension == 1) { query += ` AND c.hypertension = 1`; }
  if (filters.copd == 1) { query += ` AND c.copd = 1`; }
  if (filters.heart_failure == 1) { query += ` AND c.heart_failure = 1`; }
  if (filters.dialysis == 1) { query += ` AND c.dialysis = 1`; }
  if (filters.prior_stroke == 1) { query += ` AND c.prior_stroke = 1`; }
  if (filters.smoking) { query += ` AND c.smoking_status = ?`; params.push(filters.smoking); }
  if (filters.procedure_type) {
    query += ` AND EXISTS (SELECT 1 FROM procedures pp WHERE pp.patient_id = p.patient_id AND pp.procedure_type = ?)`;
    params.push(filters.procedure_type);
  }
  if (filters.procedure_date_from) {
    query += ` AND pr.procedure_date >= ?`; params.push(filters.procedure_date_from);
  }
  if (filters.procedure_date_to) {
    query += ` AND pr.procedure_date <= ?`; params.push(filters.procedure_date_to);
  }
  if (filters.surgeon_id) {
    query += ` AND pr.surgeon_id = ?`; params.push(filters.surgeon_id);
  }

  query += ` ORDER BY p.last_name, p.first_name`;
  return db.prepare(query).all(...params);
}

function getTable1Stats(patientIds) {
  if (!patientIds || patientIds.length === 0) return {};

  const placeholders = patientIds.map(() => '?').join(',');
  const patients = db.prepare(`
    SELECT p.date_of_birth, p.sex, p.race, p.bmi, p.height_cm, p.weight_kg,
      c.hypertension, c.diabetes, c.hyperlipidemia, c.coronary_artery_disease,
      c.copd, c.heart_failure, c.prior_stroke, c.prior_tia, c.ckd_stage,
      c.dialysis, c.atrial_fibrillation, c.smoking_status,
      c.peripheral_artery_disease, c.prior_amputation, c.hba1c, c.frailty_score,
      m.aspirin, m.clopidogrel, m.statin, m.beta_blocker, m.ace_inhibitor,
      m.warfarin, m.apixaban
    FROM patients p
    LEFT JOIN comorbidities c ON c.patient_id = p.patient_id
    LEFT JOIN medications m ON m.patient_id = p.patient_id
    WHERE p.patient_id IN (${placeholders})
  `).all(...patientIds);

  const n = patients.length;
  if (n === 0) return { n: 0 };

  function calcAge(dob) {
    if (!dob) return null;
    const today = new Date();
    const birth = new Date(dob);
    return today.getFullYear() - birth.getFullYear() -
      (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
  }
  function stats(values) {
    const v = values.filter(x => x != null && !isNaN(x));
    if (v.length === 0) return { mean: null, sd: null, median: null, iqr: null, n: 0 };
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
    const sorted = [...v].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    return { mean: +mean.toFixed(1), sd: +sd.toFixed(1), median: +median.toFixed(1), iqr: [+q1?.toFixed(1), +q3?.toFixed(1)], n: v.length };
  }
  function pct(field, val = 1) {
    const cnt = patients.filter(p => p[field] === val).length;
    return { n: cnt, pct: +((cnt / n) * 100).toFixed(1) };
  }
  function catCount(field) {
    const map = {};
    patients.forEach(p => { const v = p[field]; if (v != null) map[v] = (map[v] || 0) + 1; });
    return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, { n: v, pct: +((v / n) * 100).toFixed(1) }]));
  }

  return {
    n,
    age: stats(patients.map(p => calcAge(p.date_of_birth))),
    bmi: stats(patients.map(p => p.bmi)),
    hba1c: stats(patients.map(p => p.hba1c)),
    sex: catCount('sex'),
    race: catCount('race'),
    smoking: catCount('smoking_status'),
    ckd: catCount('ckd_stage'),
    hypertension: pct('hypertension'),
    diabetes: pct('diabetes'),
    hyperlipidemia: pct('hyperlipidemia'),
    cad: pct('coronary_artery_disease'),
    copd: pct('copd'),
    heart_failure: pct('heart_failure'),
    prior_stroke: pct('prior_stroke'),
    dialysis: pct('dialysis'),
    afib: pct('atrial_fibrillation'),
    pad: pct('peripheral_artery_disease'),
    aspirin: pct('aspirin'),
    statin: pct('statin'),
    clopidogrel: pct('clopidogrel'),
    beta_blocker: pct('beta_blocker'),
    anticoagulant: { n: patients.filter(p => p.warfarin || p.apixaban).length,
      pct: +((patients.filter(p => p.warfarin || p.apixaban).length / n) * 100).toFixed(1) }
  };
}

function getTimeToEvent(patientIds) {
  if (!patientIds || patientIds.length === 0) return [];
  const placeholders = patientIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT pr.procedure_id, pr.procedure_date, pr.procedure_type,
      p.patient_id, p.first_name || ' ' || p.last_name AS patient_name, p.mrn,
      po.reoperation, po.death_30_day, po.death_in_hospital, po.amputation,
      po.discharge_status,
      (SELECT MIN(f.followup_date) FROM followup f WHERE f.procedure_id = pr.procedure_id AND f.reintervention = 1)
        AS reintervention_date,
      (SELECT MIN(f.followup_date) FROM followup f WHERE f.procedure_id = pr.procedure_id AND f.alive = 0)
        AS death_date,
      (SELECT MAX(f.followup_date) FROM followup f WHERE f.procedure_id = pr.procedure_id)
        AS last_followup_date,
      CAST(julianday(
        COALESCE(
          (SELECT MIN(f.followup_date) FROM followup f WHERE f.procedure_id = pr.procedure_id AND f.reintervention = 1),
          (SELECT MAX(f.followup_date) FROM followup f WHERE f.procedure_id = pr.procedure_id),
          date('now')
        )
      ) - julianday(pr.procedure_date) AS INTEGER) AS days_to_event,
      (SELECT CASE WHEN MIN(f.followup_date) IS NOT NULL THEN 1 ELSE 0 END
       FROM followup f WHERE f.procedure_id = pr.procedure_id AND f.reintervention = 1) AS event_reintervention,
      (SELECT CASE WHEN MIN(f.followup_date) IS NOT NULL THEN 1 ELSE 0 END
       FROM followup f WHERE f.procedure_id = pr.procedure_id AND f.alive = 0) AS event_death
    FROM procedures pr
    JOIN patients p ON pr.patient_id = p.patient_id
    LEFT JOIN postoperative po ON po.procedure_id = pr.procedure_id
    WHERE p.patient_id IN (${placeholders})
    ORDER BY pr.procedure_date DESC
  `).all(...patientIds);
}

// ─── TABLE 2 RAW DATA (30-day outcomes + time-to-event) ──────────────────────

function getTable2RawData(patientIds) {
  if (!patientIds || patientIds.length === 0) return [];
  const placeholders = patientIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT
      pr.procedure_id, pr.procedure_date, pr.procedure_type,
      p.patient_id, p.mrn, p.first_name || ' ' || p.last_name AS patient_name,
      -- 30-day outcomes
      COALESCE(po.stroke, 0)                          AS stroke,
      COALESCE(po.myocardial_infarction, 0)           AS mi,
      COALESCE(po.death_30_day, 0)                    AS death_30_day,
      COALESCE(po.death_in_hospital, 0)               AS death_in_hospital,
      COALESCE(po.renal_failure, 0)                   AS renal_failure,
      COALESCE(po.dialysis_required, 0)               AS dialysis_required,
      COALESCE(po.bleeding_requiring_transfusion, 0)  AS major_bleeding,
      COALESCE(po.reoperation, 0)                     AS reoperation,
      COALESCE(po.amputation, 0)                      AS amputation_30d,
      COALESCE(io.technical_success, 1)               AS technical_success,
      -- Composite 30-day
      CASE WHEN po.renal_failure=1 OR po.dialysis_required=1 THEN 1 ELSE 0 END AS aki,
      CASE WHEN po.death_30_day=1 OR po.myocardial_infarction=1 OR po.stroke=1 THEN 1 ELSE 0 END AS mace,
      -- Time-to-event dates (from follow-up records)
      (SELECT MIN(f.followup_date) FROM followup f
       WHERE f.procedure_id = pr.procedure_id
         AND (f.reintervention = 1 OR (f.graft_patency IS NOT NULL AND f.graft_patency < 1)))
        AS primary_patency_loss_date,
      (SELECT MIN(f.followup_date) FROM followup f
       WHERE f.procedure_id = pr.procedure_id AND f.graft_patency = 0)
        AS secondary_patency_loss_date,
      (SELECT MIN(f.followup_date) FROM followup f
       WHERE f.procedure_id = pr.procedure_id AND f.amputation = 1
         AND f.amputation_level IN ('Below Knee','Above Knee'))
        AS major_amputation_date,
      (SELECT MIN(f.followup_date) FROM followup f
       WHERE f.procedure_id = pr.procedure_id AND f.alive = 0)
        AS death_date_fu,
      (SELECT MAX(f.followup_date) FROM followup f WHERE f.procedure_id = pr.procedure_id)
        AS last_followup_date,
      -- Missingness flags
      (SELECT COUNT(*) FROM followup f WHERE f.procedure_id = pr.procedure_id
         AND f.followup_interval = '1 Year') AS has_1yr_followup,
      (SELECT f.abi FROM followup f WHERE f.procedure_id = pr.procedure_id
         AND f.followup_interval = '1 Year' LIMIT 1) AS abi_1yr,
      (SELECT COUNT(*) FROM followup f WHERE f.procedure_id = pr.procedure_id) AS total_followups,
      CAST(julianday('now') - julianday(pr.procedure_date) AS INTEGER) AS days_since_procedure
    FROM procedures pr
    JOIN patients p ON pr.patient_id = p.patient_id
    LEFT JOIN postoperative po ON po.procedure_id = pr.procedure_id
    LEFT JOIN intraoperative io ON io.procedure_id = pr.procedure_id
    WHERE p.patient_id IN (${placeholders})
    ORDER BY pr.procedure_date DESC
  `).all(...patientIds);
}

// ─── DEVICES ─────────────────────────────────────────────────────────────────

function getDevices(procedureId) {
  return db.prepare('SELECT * FROM devices WHERE procedure_id = ? ORDER BY created_at').all(procedureId);
}

function createDevice(data) {
  const stmt = db.prepare(`
    INSERT INTO devices (procedure_id, device_name, manufacturer, model, size_description,
      lot_number, serial_number, ref_number, expiry_date, implanted, notes)
    VALUES (@procedure_id, @device_name, @manufacturer, @model, @size_description,
      @lot_number, @serial_number, @ref_number, @expiry_date, @implanted, @notes)
  `);
  const result = stmt.run(data);
  return { device_id: result.lastInsertRowid, ...data };
}

function updateDevice(deviceId, data) {
  const fields = Object.keys(data).filter(k => k !== 'device_id').map(k => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE devices SET ${fields} WHERE device_id = @device_id`).run({ ...data, device_id: deviceId });
  return { device_id: deviceId, ...data };
}

function deleteDevice(deviceId) {
  db.prepare('DELETE FROM devices WHERE device_id = ?').run(deviceId);
  return { deleted: true };
}

// ─── PHOTOS ──────────────────────────────────────────────────────────────────

function getPhotos(procedureId) {
  return db.prepare('SELECT * FROM procedure_photos WHERE procedure_id = ? ORDER BY taken_date DESC, created_at DESC').all(procedureId);
}

function createPhoto(data) {
  const stmt = db.prepare(`
    INSERT INTO procedure_photos (procedure_id, patient_id, file_path, file_name,
      taken_date, anatomical_location, photo_type, wifi_wound, wifi_ischemia, wifi_infection, notes)
    VALUES (@procedure_id, @patient_id, @file_path, @file_name,
      @taken_date, @anatomical_location, @photo_type, @wifi_wound, @wifi_ischemia, @wifi_infection, @notes)
  `);
  const result = stmt.run(data);
  return { photo_id: result.lastInsertRowid, ...data };
}

function deletePhoto(photoId) {
  const photo = db.prepare('SELECT file_path FROM procedure_photos WHERE photo_id = ?').get(photoId);
  db.prepare('DELETE FROM procedure_photos WHERE photo_id = ?').run(photoId);
  return { deleted: true, file_path: photo?.file_path };
}

// ─── VENOUS MODULE ────────────────────────────────────────────────────────────

function upsertVenousModule(procedureId, data) {
  const existing = db.prepare('SELECT venous_id FROM venous_module WHERE procedure_id = ?').get(procedureId);
  if (existing) {
    const fields = Object.keys(data).filter(k => k !== 'procedure_id').map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE venous_module SET ${fields} WHERE procedure_id = @procedure_id`).run({ ...data, procedure_id: procedureId });
  } else {
    const cols = ['procedure_id', ...Object.keys(data).filter(k => k !== 'procedure_id')];
    const vals = cols.map(k => `@${k}`).join(', ');
    db.prepare(`INSERT INTO venous_module (${cols.join(', ')}) VALUES (${vals})`).run({ ...data, procedure_id: procedureId });
  }
}

module.exports = {
  initDatabase, loginUser,
  getPatients, getPatientById, createPatient, updatePatient, deletePatient,
  getProcedures, getProcedureById, createProcedure, updateProcedure, deleteProcedure,
  getFollowups, createFollowup, updateFollowup, deleteFollowup,
  getSurgeons, createSurgeon, updateSurgeon,
  getUsers, createUser, updateUser, deleteUser,
  getDashboardStats, getReportData,
  exportPatientData, exportProcedureData, backupDatabase,
  upsertIntraoperative, upsertPostoperative, upsertModule,
  getPatientRawData,
  getRedFlags, getCohort, getTable1Stats, getTimeToEvent, getTable2RawData,
  getDevices, createDevice, updateDevice, deleteDevice,
  getPhotos, createPhoto, deletePhoto,
  upsertVenousModule
};
