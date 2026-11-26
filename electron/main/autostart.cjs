'use strict';

const { app } = require('electron');

function setLoginAutoStart(enable) {
  if (process.platform !== 'win32' && process.platform !== 'darwin') {
    return { ok: false, error: 'Login auto-start is managed by your desktop environment on Linux.' };
  }
  if (!app.isPackaged) {
    return { ok: true, skipped: true };
  }
  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(enable),
      args: ['--tray'],
    });
    return { ok: true, enabled: Boolean(enable) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { setLoginAutoStart };
