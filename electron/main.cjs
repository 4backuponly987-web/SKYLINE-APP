'use strict';

const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

const APP_ID = 'com.skyline.wingsuit';
const GAME_FILE = path.join(__dirname, '..', 'SKYLINE.html');

app.setAppUserModelId(APP_ID);
// Keep the Chromium profile (and therefore SKYLINE localStorage saves) in a
// stable app-specific folder across updates.
app.setPath('userData', path.join(app.getPath('appData'), 'SKYLINE'));

function createWindow() {
  const win = new BrowserWindow({
    title: 'SKYLINE',
    width: 1600,
    height: 1000,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#090d14',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  win.loadFile(GAME_FILE);

  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });

  // SKYLINE itself is fully local. If a future menu contains an external
  // link, open it in the normal browser rather than navigating the game away.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const current = win.webContents.getURL();
    if (url !== current) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  // F11 toggles true desktop fullscreen without stealing Escape from the
  // game's own pause menu.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
