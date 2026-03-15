const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// In a packaged Electron app, __dirname inside main.js points to the root of
// the asar archive (or the app folder when unpackaged). All paths below use
// __dirname so they work correctly in both dev and packaged modes.

let mainWindow;
let db;

function createWindow() {
  // Only show icon if the file actually exists (avoid crash when missing)
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  const windowOptions = {
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Allow loading local files from the asar archive
      webSecurity: true
    },
    title: 'VQI Desktop Registry — Vascular Surgery',
    show: false,
    backgroundColor: '#1e2a3a'
  };

  if (fs.existsSync(iconPath)) windowOptions.icon = iconPath;

  mainWindow = new BrowserWindow(windowOptions);

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  // Ensure data directory
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });

  // Initialize database
  const dbModule = require('./src/database/db');
  db = dbModule.initDatabase();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC HANDLERS ────────────────────────────────────────────────────────────

const dbModule = () => require('./src/database/db');

// Auth
ipcMain.handle('auth:login', async (_, { username, password }) => {
  try { return { success: true, user: dbModule().loginUser(username, password) }; }
  catch (e) { return { success: false, error: e.message }; }
});

// Patients
ipcMain.handle('patients:getAll', async (_, filters) => {
  try { return { success: true, data: dbModule().getPatients(filters || {}) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('patients:getById', async (_, id) => {
  try { return { success: true, data: dbModule().getPatientById(id) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('patients:create', async (_, data) => {
  try { return { success: true, data: dbModule().createPatient(data) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('patients:update', async (_, { id, data }) => {
  try { return { success: true, data: dbModule().updatePatient(id, data) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('patients:delete', async (_, id) => {
  try { return { success: true, data: dbModule().deletePatient(id) }; }
  catch (e) { return { success: false, error: e.message }; }
});

// Procedures
ipcMain.handle('procedures:getAll', async (_, filters) => {
  try { return { success: true, data: dbModule().getProcedures(filters || {}) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('procedures:getById', async (_, id) => {
  try { return { success: true, data: dbModule().getProcedureById(id) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('procedures:create', async (_, data) => {
  try { return { success: true, data: dbModule().createProcedure(data) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('procedures:update', async (_, { id, data }) => {
  try { return { success: true, data: dbModule().updateProcedure(id, data) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('procedures:delete', async (_, id) => {
  try { return { success: true, data: dbModule().deleteProcedure(id) }; }
  catch (e) { return { success: false, error: e.message }; }
});

// Follow-up
ipcMain.handle('followup:getByProcedure', async (_, procedureId) => {
  try { return { success: true, data: dbModule().getFollowups(procedureId) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('followup:create', async (_, data) => {
  try { return { success: true, data: dbModule().createFollowup(data) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('followup:update', async (_, { id, data }) => {
  try { return { success: true, data: dbModule().updateFollowup(id, data) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('followup:delete', async (_, id) => {
  try { return { success: true, data: dbModule().deleteFollowup(id) }; }
  catch (e) { return { success: false, error: e.message }; }
});

// Surgeons
ipcMain.handle('surgeons:getAll', async () => {
  try { return { success: true, data: dbModule().getSurgeons() }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('surgeons:create', async (_, data) => {
  try { return { success: true, data: dbModule().createSurgeon(data) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('surgeons:update', async (_, { id, data }) => {
  try { return { success: true, data: dbModule().updateSurgeon(id, data) }; }
  catch (e) { return { success: false, error: e.message }; }
});

// Users
ipcMain.handle('users:getAll', async () => {
  try { return { success: true, data: dbModule().getUsers() }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('users:create', async (_, data) => {
  try { return { success: true, data: dbModule().createUser(data) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('users:update', async (_, { id, data }) => {
  try { return { success: true, data: dbModule().updateUser(id, data) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('users:delete', async (_, id) => {
  try { return { success: true, data: dbModule().deleteUser(id) }; }
  catch (e) { return { success: false, error: e.message }; }
});

// Reports / Dashboard
ipcMain.handle('reports:dashboard', async () => {
  try { return { success: true, data: dbModule().getDashboardStats() }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('reports:getData', async (_, { reportType, filters }) => {
  try { return { success: true, data: dbModule().getReportData(reportType, filters || {}) }; }
  catch (e) { return { success: false, error: e.message }; }
});

// Export
ipcMain.handle('export:patients', async () => {
  try { return { success: true, data: dbModule().exportPatientData() }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('export:procedures', async () => {
  try { return { success: true, data: dbModule().exportProcedureData() }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('export:saveFile', async (_, { content, defaultName, filters }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName || 'export.csv',
      filters: filters || [{ name: 'CSV Files', extensions: ['csv'] }]
    });
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, content, 'utf-8');
      return { success: true, path: result.filePath };
    }
    return { success: false, canceled: true };
  } catch (e) { return { success: false, error: e.message }; }
});

// Backup
ipcMain.handle('backup:create', async () => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `vqi_backup_${new Date().toISOString().slice(0,10)}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    });
    if (!result.canceled && result.filePath) {
      await dbModule().backupDatabase(result.filePath);
      return { success: true, path: result.filePath };
    }
    return { success: false, canceled: true };
  } catch (e) { return { success: false, error: e.message }; }
});

// Red-flag alerts
ipcMain.handle('alerts:getRedFlags', async () => {
  try { return { success: true, data: dbModule().getRedFlags() }; }
  catch (e) { return { success: false, error: e.message }; }
});

// Research / Cohort
ipcMain.handle('research:getPatientRawData', async (_, patientIds) => {
  try { return { success: true, data: dbModule().getPatientRawData(patientIds || []) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('research:getCohort', async (_, filters) => {
  try { return { success: true, data: dbModule().getCohort(filters || {}) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('research:getTable1', async (_, patientIds) => {
  try { return { success: true, data: dbModule().getTable1Stats(patientIds || []) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('research:getTimeToEvent', async (_, patientIds) => {
  try { return { success: true, data: dbModule().getTimeToEvent(patientIds || []) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('research:getTable2', async (_, patientIds) => {
  try { return { success: true, data: dbModule().getTable2RawData(patientIds || []) }; }
  catch (e) { return { success: false, error: e.message }; }
});

// Devices
ipcMain.handle('devices:getByProcedure', async (_, procedureId) => {
  try { return { success: true, data: dbModule().getDevices(procedureId) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('devices:create', async (_, data) => {
  try { return { success: true, data: dbModule().createDevice(data) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('devices:update', async (_, { id, data }) => {
  try { return { success: true, data: dbModule().updateDevice(id, data) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('devices:delete', async (_, id) => {
  try { return { success: true, data: dbModule().deleteDevice(id) }; }
  catch (e) { return { success: false, error: e.message }; }
});

// Photos
ipcMain.handle('photos:getByProcedure', async (_, procedureId) => {
  try { return { success: true, data: dbModule().getPhotos(procedureId) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('photos:upload', async (_, { procedureId, patientId, meta }) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Photo(s)',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'] }],
      properties: ['openFile', 'multiSelections']
    });
    if (result.canceled || !result.filePaths.length) return { success: false, canceled: true };

    const photosDir = path.join(app.getPath('userData'), 'photos');
    if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });

    const saved = [];
    for (const srcPath of result.filePaths) {
      const ext = path.extname(srcPath);
      const ts = Date.now();
      const destName = `proc${procedureId}_${ts}${ext}`;
      const destPath = path.join(photosDir, destName);
      fs.copyFileSync(srcPath, destPath);
      const record = dbModule().createPhoto({
        procedure_id: procedureId,
        patient_id: patientId,
        file_path: destPath,
        file_name: path.basename(srcPath),
        taken_date: meta?.taken_date || new Date().toISOString().slice(0, 10),
        anatomical_location: meta?.anatomical_location || null,
        photo_type: meta?.photo_type || 'Wound',
        wifi_wound: meta?.wifi_wound ?? null,
        wifi_ischemia: meta?.wifi_ischemia ?? null,
        wifi_infection: meta?.wifi_infection ?? null,
        notes: meta?.notes || null
      });
      saved.push(record);
    }
    return { success: true, data: saved };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('photos:delete', async (_, photoId) => {
  try {
    const result = dbModule().deletePhoto(photoId);
    if (result.file_path && fs.existsSync(result.file_path)) {
      try { fs.unlinkSync(result.file_path); } catch (_) {}
    }
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('photos:openFile', async (_, filePath) => {
  try { shell.openPath(filePath); return { success: true }; }
  catch (e) { return { success: false, error: e.message }; }
});

// Venous module
ipcMain.handle('venous:upsert', async (_, { procedureId, data }) => {
  try { dbModule().upsertVenousModule(procedureId, data); return { success: true }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('app:getDataPath', async () => {
  return app.getPath('userData');
});

ipcMain.handle('shell:openPath', async (_, filePath) => {
  shell.showItemInFolder(filePath);
  return { success: true };
});
