const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(app.getPath('userData'), 'apps.json');
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');
const VERSION_FILE = path.join(app.getPath('userData'), 'version.txt');
const CHANGELOG_FILE = path.join(__dirname, 'changelog.json');

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  Menu.setApplicationMenu(null);
  win.loadFile('index.html');

  // ==== Update Detection ====
  const currentVersion = app.getVersion();
  if (!fs.existsSync(VERSION_FILE)) {
    fs.writeFileSync(VERSION_FILE, currentVersion);
  } else {
    const lastVersion = fs.readFileSync(VERSION_FILE, 'utf-8');
    if (lastVersion !== currentVersion) {
      let changelogData = {};
      if (fs.existsSync(CHANGELOG_FILE)) {
        changelogData = JSON.parse(fs.readFileSync(CHANGELOG_FILE, 'utf-8'));
      }
      const changes = changelogData[currentVersion] || ["No details available."];

      win.webContents.once('did-finish-load', () => {
        win.webContents.send('app-updated', { old: lastVersion, new: currentVersion, changes });
      });

      fs.writeFileSync(VERSION_FILE, currentVersion);
    }
  }
}

app.whenReady().then(createWindow);

// ==== Apps CRUD ====
ipcMain.handle('get-apps', () => {
  return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : [];
});

ipcMain.handle('save-apps', (event, apps) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(apps));
});

ipcMain.handle('select-app', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'] });
  return result.filePaths[0];
});

ipcMain.handle('launch-app', (event, appPath) => {
  shell.openPath(appPath);
});

// ==== Icon Selection ====
ipcMain.handle('select-icon', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'ico', 'jpg', 'jpeg'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

// ==== Settings ====
ipcMain.handle('get-settings', () => {
  return fs.existsSync(SETTINGS_FILE) ? JSON.parse(fs.readFileSync(SETTINGS_FILE)) : {};
});

// 🔹 Save settings without restart
ipcMain.handle('save-settings', (event, settings) => {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings));
});
