'use strict';

const { app, BrowserWindow, Menu, nativeImage, nativeTheme, Tray } = require('electron');
const fs = require('fs');
const path = require('path');
const { LocalMediaServer } = require('../core/media-server.cjs');
const { AppStore } = require('../core/store.cjs');
const { ThemeManager } = require('../core/theme-manager.cjs');
const { CdpBridge } = require('../core/cdp-bridge.cjs');
const { getSurfaceRamp } = require('../core/defaults.cjs');
const { compileStylesheet } = require('../injector/css-compiler.cjs');
const {
  applyAgyCliSettings,
  repairQuotedStatusLineIfNeeded,
  syncWindowsTerminalProfile,
} = require('../core/cli-themer.cjs');
const { syncIdeWindowControls } = require('./ide-integration.cjs');
const { registerIpc } = require('./ipc.cjs');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let mediaServer = null;
let store = null;
let themeManager = null;
let cdp = null;

function resolveBundledThemesDir() {
  const devDir = path.resolve(__dirname, '..', '..', 'themes');
  if (fs.existsSync(devDir)) return devDir;
  if (process.resourcesPath) {
    const prodDir = path.join(process.resourcesPath, 'themes');
    if (fs.existsSync(prodDir)) return prodDir;
  }
  return devDir;
}

function resolveAssetPath(fileName) {
  const candidates = [
    path.resolve(__dirname, '..', 'assets', fileName),
    process.resourcesPath ? path.join(process.resourcesPath, 'assets', fileName) : '',
    path.resolve(__dirname, '..', '..', 'build', fileName),
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) || '';
}

function createWindowIcon() {
  const icoPath = resolveAssetPath(process.platform === 'win32' ? 'icon.ico' : 'icon.png');
  if (icoPath) return icoPath;
  const pngPath = resolveAssetPath('icon.png');
  return pngPath ? nativeImage.createFromPath(pngPath) : undefined;
}

function createTrayIcon() {
  const trayPath = resolveAssetPath('tray-icon.png') || resolveAssetPath('icon.png') || resolveAssetPath('icon.ico');
  if (trayPath) {
    const img = nativeImage.createFromPath(trayPath);
    if (!img.isEmpty()) return img.resize({ width: 16, height: 16 });
  }
  return nativeImage.createEmpty();
}

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function getSystemDark() {
  return nativeTheme ? Boolean(nativeTheme.shouldUseDarkColors) : true;
}

function buildRuntimePayload() {
  const config = store.config;
  const systemDark = getSystemDark();
  const bundle = themeManager.collectActiveBundle(config);
  const activeWallpaper = config.wallpaperEnabled
    ? store.getActiveWallpaper() || themeManager.getBuiltInWallpaperById(config.wallpaperId) || bundle.packBackdrop || null
    : null;
  const customFonts = store.getFonts();
  const ramp = getSurfaceRamp(config, systemDark);

  return {
    config,
    systemDark,
    wallpaper: activeWallpaper,
    surfaceRgb: ramp.rgb,
    cssIde: compileStylesheet({
      config,
      targetKind: 'ide',
      activeWallpaper,
      customFonts,
      userCss: bundle.ideCss,
      systemDark,
    }),
    cssIdeChat: compileStylesheet({
      config,
      targetKind: 'ide-chat',
      activeWallpaper,
      customFonts,
      userCss: bundle.appCss,
      systemDark,
    }),
    cssApp: compileStylesheet({
      config,
      targetKind: 'app',
      activeWallpaper,
      customFonts,
      userCss: bundle.appCss,
      systemDark,
    }),
    ts: Date.now(),
  };
}

function createWindow(startHidden = false) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    show: !startHidden,
    backgroundColor: '#141415',
    title: 'Antigravity Themes',
    icon: createWindowIcon(),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  const devUrl = process.env.VITE_DEV_URL;
  const distHtml = path.join(__dirname, '..', '..', 'dist-ui', 'index.html');

  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else if (fs.existsSync(distHtml)) {
    mainWindow.loadFile(distHtml);
  } else {
    mainWindow.loadURL('http://127.0.0.1:5179');
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting && store?.config?.minimizeToTray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(getFullState) {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('Antigravity Themes');

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open Antigravity Themes',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow(false);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Reload Themes',
      click: async () => {
        if (!store || !cdp) return;
        store.saveConfig({ enabled: true });
        syncIdeWindowControls(store.config, false, getSystemDark());
        await cdp.applyNow(buildRuntimePayload());
        sendToRenderer('theme:state-updated', getFullState());
      },
    },
    {
      label: 'Disable Custom CSS',
      click: async () => {
        if (!store || !cdp) return;
        store.saveConfig({ enabled: false });
        syncIdeWindowControls(store.config, true, getSystemDark());
        await cdp.disableAll();
        sendToRenderer('theme:state-updated', getFullState());
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_ev, argv) => {
    if (Array.isArray(argv) && argv.includes('--tray')) {
      cdp?.scan();
      return;
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    if (process.platform === 'win32') {
      app.setAppUserModelId('dev.antigravity.themes');
    }
    const startHidden = process.argv.includes('--tray');

    mediaServer = new LocalMediaServer();
    await mediaServer.start();

    store = new AppStore(app.getPath('userData'), mediaServer);
    themeManager = new ThemeManager(store.baseDir, resolveBundledThemesDir(), mediaServer);
    await themeManager.syncOnlineThemes(store.config.onlineThemeUrls, false);

    // Auto-repair legacy quoted statusLine command if present
    try {
      repairQuotedStatusLineIfNeeded();
    } catch (_) {}

    // On CLI v2 migration, immediately re-sync CLI settings & Windows Terminal so .jpg wallpaper & defaults apply cleanly
    if (store.didMigrateCli && store.config.cli?.enabled) {
      try {
        applyAgyCliSettings(store.config, getSystemDark());
        syncWindowsTerminalProfile(store.config, store.baseDir, getSystemDark());
      } catch (_) {}
    }

    cdp = new CdpBridge(buildRuntimePayload);
    cdp.on('status', (status) => {
      sendToRenderer('theme:cdp-status', status);
    });

    const { getFullState, applyCurrentState } = registerIpc({
      getMainWindow: () => mainWindow,
      store,
      themeManager,
      cdp,
      mediaServer,
      buildRuntimePayload,
      getSystemDark,
    });

    if (nativeTheme && typeof nativeTheme.on === 'function') {
      nativeTheme.on('updated', async () => {
        if (!store) return;
        const dark = getSystemDark();
        if (store.config.enabled && store.config.colorMode === 'auto') {
          await applyCurrentState();
        }
        if (store.config.cli?.enabled && store.config.cli?.autoFollowOs) {
          try {
            const cliRes = applyAgyCliSettings(store.config, dark);
            if (cliRes.ok && cliRes.status?.windowsTerminalDetected) {
              syncWindowsTerminalProfile(store.config, store.baseDir, dark);
            }
          } catch (_) {}
        }
        sendToRenderer('theme:state-updated', getFullState());
      });
    }

    themeManager.on('changed', async () => {
      if (store.config.enabled) await applyCurrentState();
      sendToRenderer('theme:state-updated', getFullState());
    });
    themeManager.startWatching();

    createTray(getFullState);
    createWindow(startHidden);
    cdp.start();
  });

  app.on('before-quit', () => {
    isQuitting = true;
    themeManager?.stopWatching();
    cdp?.stop();
    mediaServer?.stop();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && !store?.config?.minimizeToTray) {
      app.quit();
    }
  });
}
