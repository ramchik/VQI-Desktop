const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'VQI Desktop Registry — Vascular Surgery',
    show: false
  });

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

ipcMain.handle('app:getDataPath', async () => {
  return app.getPath('userData');
});

ipcMain.handle('shell:openPath', async (_, filePath) => {
  shell.showItemInFolder(filePath);
  return { success: true };
});
