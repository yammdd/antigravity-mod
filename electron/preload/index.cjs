'use strict';

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('themeAPI', {
  getState: () => ipcRenderer.invoke('theme:get-state'),
  updateConfig: (patch) => ipcRenderer.invoke('theme:update-config', patch),
  applyNow: () => ipcRenderer.invoke('theme:apply-now'),
  disableTheme: () => ipcRenderer.invoke('theme:disable'),
  resetConfig: () => ipcRenderer.invoke('theme:reset-config'),

  // Local .theme.css & Theme Pack management
  applyPresetPack: (themeId) => ipcRenderer.invoke('theme:apply-preset-pack', themeId),
  toggleLocalTheme: (themeId) => ipcRenderer.invoke('theme:toggle-local', themeId),
  createLocalTheme: (meta) => ipcRenderer.invoke('theme:create-local', meta),
  exportStudioTheme: (meta) => ipcRenderer.invoke('theme:export-studio-theme', meta),
  deleteLocalTheme: (themeId) => ipcRenderer.invoke('theme:delete-local', themeId),
  importThemes: () => ipcRenderer.invoke('theme:import-themes'),
  importPack: () => ipcRenderer.invoke('theme:import-pack'),
  openThemesFolder: () => ipcRenderer.invoke('theme:open-folder'),
  openThemeFile: (themeId) => ipcRenderer.invoke('theme:open-file', themeId),
  reloadAllThemes: () => ipcRenderer.invoke('theme:reload-all'),

  // Guided Setup
  runSetup: (options) => ipcRenderer.invoke('setup:install', options),
  uninstallAll: () => ipcRenderer.invoke('setup:uninstall-all'),

  // QuickCSS & Online CSS
  saveQuickCss: (cssText, apply = true) => ipcRenderer.invoke('theme:save-quickcss', cssText, apply),
  setOnlineUrls: (urls) => ipcRenderer.invoke('theme:set-online-urls', urls),

  // Wallpapers & Custom Local Fonts
  importWallpapers: () => ipcRenderer.invoke('theme:import-wallpapers'),
  importPaths: (paths) => ipcRenderer.invoke('theme:import-paths', paths),
  deleteWallpaper: (id) => ipcRenderer.invoke('theme:delete-wallpaper', id),
  importFonts: () => ipcRenderer.invoke('theme:import-fonts'),
  deleteFont: (id) => ipcRenderer.invoke('theme:delete-font', id),

  // agy CLI Theming
  applyCliPreset: (presetId, includeWallpaper = true) =>
    ipcRenderer.invoke('cli:apply-preset', presetId, includeWallpaper),
  applyCliSettings: () => ipcRenderer.invoke('cli:apply-settings'),
  testCliStatusLine: () => ipcRenderer.invoke('cli:test-statusline'),
  resetCliSettings: () => ipcRenderer.invoke('cli:reset-settings'),
  syncWindowsTerminal: () => ipcRenderer.invoke('cli:sync-wt'),
  restoreWindowsTerminal: () => ipcRenderer.invoke('cli:restore-wt'),
  launchCliTerminal: () => ipcRenderer.invoke('cli:launch-terminal'),
  pickCliBgImage: () => ipcRenderer.invoke('cli:pick-bg-image'),

  // IDE & App integration
  inspectDom: () => ipcRenderer.invoke('ide:inspect-dom'),
  configureArgv: (enable = true) => ipcRenderer.invoke('ide:configure-argv', enable),
  launchTarget: (target = 'ide') => ipcRenderer.invoke('ide:launch-target', target),
  toggleAutoStart: (enable) => ipcRenderer.invoke('app:toggle-autostart', enable),
  exportBackup: () => ipcRenderer.invoke('app:export-backup'),
  importBackup: () => ipcRenderer.invoke('app:import-backup'),
  openDataDir: () => ipcRenderer.invoke('app:open-data-dir'),

  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch (_) {
      return '';
    }
  },

  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  onCdpStatus: (cb) => {
    const handler = (_ev, data) => cb(data);
    ipcRenderer.on('theme:cdp-status', handler);
    return () => ipcRenderer.removeListener('theme:cdp-status', handler);
  },
  onStateUpdated: (cb) => {
    const handler = (_ev, data) => cb(data);
    ipcRenderer.on('theme:state-updated', handler);
    return () => ipcRenderer.removeListener('theme:state-updated', handler);
  },
});
