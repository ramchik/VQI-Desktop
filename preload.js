const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Auth
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),

  // Patients
  getPatients: (filters) => ipcRenderer.invoke('patients:getAll', filters),
  getPatientById: (id) => ipcRenderer.invoke('patients:getById', id),
  createPatient: (data) => ipcRenderer.invoke('patients:create', data),
  updatePatient: (id, data) => ipcRenderer.invoke('patients:update', { id, data }),
  deletePatient: (id) => ipcRenderer.invoke('patients:delete', id),

  // Procedures
  getProcedures: (filters) => ipcRenderer.invoke('procedures:getAll', filters),
  getProcedureById: (id) => ipcRenderer.invoke('procedures:getById', id),
  createProcedure: (data) => ipcRenderer.invoke('procedures:create', data),
  updateProcedure: (id, data) => ipcRenderer.invoke('procedures:update', { id, data }),
  deleteProcedure: (id) => ipcRenderer.invoke('procedures:delete', id),

  // Follow-up
  getFollowups: (procedureId) => ipcRenderer.invoke('followup:getByProcedure', procedureId),
  createFollowup: (data) => ipcRenderer.invoke('followup:create', data),
  updateFollowup: (id, data) => ipcRenderer.invoke('followup:update', { id, data }),
  deleteFollowup: (id) => ipcRenderer.invoke('followup:delete', id),

  // Surgeons
  getSurgeons: () => ipcRenderer.invoke('surgeons:getAll'),
  createSurgeon: (data) => ipcRenderer.invoke('surgeons:create', data),
  updateSurgeon: (id, data) => ipcRenderer.invoke('surgeons:update', { id, data }),

  // Users
  getUsers: () => ipcRenderer.invoke('users:getAll'),
  createUser: (data) => ipcRenderer.invoke('users:create', data),
  updateUser: (id, data) => ipcRenderer.invoke('users:update', { id, data }),
  deleteUser: (id) => ipcRenderer.invoke('users:delete', id),

  // Reports
  getDashboardStats: () => ipcRenderer.invoke('reports:dashboard'),
  getReportData: (reportType, filters) => ipcRenderer.invoke('reports:getData', { reportType, filters }),

  // Export
  exportPatients: () => ipcRenderer.invoke('export:patients'),
  exportProcedures: () => ipcRenderer.invoke('export:procedures'),
  saveFile: (content, defaultName, filters) => ipcRenderer.invoke('export:saveFile', { content, defaultName, filters }),

  // Backup
  createBackup: () => ipcRenderer.invoke('backup:create'),
  getDataPath: () => ipcRenderer.invoke('app:getDataPath'),
  openPath: (filePath) => ipcRenderer.invoke('shell:openPath', filePath),

  // Red-flag alerts
  getRedFlags: () => ipcRenderer.invoke('alerts:getRedFlags'),

  // Research / Cohort
  getCohort: (filters) => ipcRenderer.invoke('research:getCohort', filters),
  getTable1Stats: (patientIds) => ipcRenderer.invoke('research:getTable1', patientIds),
  getTimeToEvent: (patientIds) => ipcRenderer.invoke('research:getTimeToEvent', patientIds),

  // Devices
  getDevices: (procedureId) => ipcRenderer.invoke('devices:getByProcedure', procedureId),
  createDevice: (data) => ipcRenderer.invoke('devices:create', data),
  updateDevice: (id, data) => ipcRenderer.invoke('devices:update', { id, data }),
  deleteDevice: (id) => ipcRenderer.invoke('devices:delete', id),

  // Photos
  getPhotos: (procedureId) => ipcRenderer.invoke('photos:getByProcedure', procedureId),
  uploadPhotos: (procedureId, patientId, meta) => ipcRenderer.invoke('photos:upload', { procedureId, patientId, meta }),
  deletePhoto: (photoId) => ipcRenderer.invoke('photos:delete', photoId),
  openPhotoFile: (filePath) => ipcRenderer.invoke('photos:openFile', filePath),

  // Venous module
  upsertVenous: (procedureId, data) => ipcRenderer.invoke('venous:upsert', { procedureId, data })
});
