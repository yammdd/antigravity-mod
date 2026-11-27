'use strict';

const { app, dialog, ipcMain, shell } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { buildExportThemeCss } = require('../injector/css-compiler.cjs');
const { checkForUpdates } = require('../core/updater.cjs');
const {
  getArgvStatus,
  configureIdeArgvCdp,
  syncIdeWindowControls,
  findExecutables,
  launchTargetWithCdp,
} = require('./ide-integration.cjs');
const {
  CLI_THEME_PRESETS,
  CLI_SHADER_PRESETS,
  getCliPresetsList,
  resolveActiveCliPresetId,
  resolveTerminalBgImagePath,
  getCliStatus,
  runCliDiagnostics,
  applyAgyCliSettings,
  testStatusLineScript,
  resetAgyCliSettings,
  syncWindowsTerminalProfile,
  restoreWindowsTerminalBackup,
  launchStyledCliTerminal,
  generateTerminalSnippets,
  syncExternalTerminalConfig,
  exportCliPresetJson,
  parseCliPresetJson,
} = require('../core/cli-themer.cjs');
const { setLoginAutoStart } = require('./autostart.cjs');

function registerIpc({
  getMainWindow,
  store,
  themeManager,
  cdp,
  mediaServer,
  buildRuntimePayload,
  getSystemDark = () => true,
}) {
  const getCliBgMediaUrl = () => {
    const rawBg = store.config.cli?.terminalBgImage || '';
    if (!rawBg) return '';
    const resolved = resolveTerminalBgImagePath(rawBg, store.baseDir);
    if (!resolved || !fs.existsSync(resolved)) return '';
    try {
      const stat = fs.statSync(resolved);
      const hash = crypto
        .createHash('sha1')
        .update(`${resolved}:${stat.mtimeMs}:${stat.size}`)
        .digest('hex')
        .slice(0, 12);
      const url = mediaServer.register('cli-bg', resolved);
      return url ? `${url}?v=${hash}` : '';
    } catch (_) {
      return '';
    }
  };

  const getFullState = () => {
    const systemDark = Boolean(getSystemDark());
    return {
      appVersion: typeof app?.getVersion === 'function' ? app.getVersion() : '1.2.0',
      systemDark,
      config: store.config,
      themes: themeManager.listLocalThemes(),
      builtInWallpapers: themeManager.listBuiltInWallpapers(),
      themesDir: themeManager.themesDir,
      quickCss: themeManager.getQuickCss(),
      onlineThemes: themeManager.getOnlineThemeStatuses(store.config.onlineThemeUrls),
      wallpapers: store.getWallpapers(),
      fonts: store.getFonts(),
      mediaPort: mediaServer.port,
      cdpStatus: cdp.getStatus(),
      argvStatus: getArgvStatus(),
      executables: findExecutables(),
      cliStatus: getCliStatus(),
      cliActivePresetId: resolveActiveCliPresetId(store.config, systemDark),
      cliPresets: getCliPresetsList(),
      cliShaders: CLI_SHADER_PRESETS,
      cliBgMediaUrl: getCliBgMediaUrl(),
      terminalSnippets: generateTerminalSnippets(store.config, systemDark),
    };
  };

  const applyCurrentState = async () => {
    const payload = buildRuntimePayload();
    syncIdeWindowControls(store.config, !store.config.enabled, getSystemDark());
    if (store.config.enabled) {
      return cdp.applyNow(payload);
    }
    return cdp.disableAll();
  };

  ipcMain.handle('theme:get-state', () => getFullState());

  ipcMain.handle('theme:update-config', async (_ev, patch) => {
    const safePatch = patch && typeof patch === 'object' ? patch : {};
    const prevUrls = JSON.stringify(store.config.onlineThemeUrls || []);
    store.saveConfig(safePatch);
    const nextUrls = JSON.stringify(store.config.onlineThemeUrls || []);

    if (prevUrls !== nextUrls) {
      await themeManager.syncOnlineThemes(store.config.onlineThemeUrls, false);
    }

    const patchKeys = Object.keys(safePatch);
    const hasCliPatch = Boolean(safePatch.cli && typeof safePatch.cli === 'object');
    const onlyCliPatch = hasCliPatch && patchKeys.length === 1;

    if (hasCliPatch && store.config.autoApplyOnChange && store.config.cli?.enabled && safePatch.cli.enabled !== false) {
      const cliRes = applyAgyCliSettings(store.config, getSystemDark());
      if (cliRes.ok && cliRes.status?.windowsTerminalDetected) {
        syncWindowsTerminalProfile(store.config, store.baseDir, getSystemDark());
      }
    }

    if (store.config.autoApplyOnChange && !onlyCliPatch) {
      await applyCurrentState();
    }
    return getFullState();
  });

  ipcMain.handle('theme:apply-now', async () => {
    store.saveConfig({ enabled: true });
    const res = await applyCurrentState();
    return { ...res, state: getFullState() };
  });

  ipcMain.handle('theme:disable', async () => {
    store.saveConfig({ enabled: false });
    syncIdeWindowControls(store.config, true, getSystemDark());
    const res = await cdp.disableAll();
    return { ...res, state: getFullState() };
  });

  ipcMain.handle('theme:reset-config', async () => {
    store.resetConfig();
    await applyCurrentState();
    return getFullState();
  });

  // --- Local .theme.css & Theme Pack management ---
  ipcMain.handle('theme:apply-preset-pack', async (_ev, themeId) => {
    const target = themeManager.listLocalThemes().find((t) => t.id === themeId);
    if (!target) return { ok: false, state: getFullState() };

    const patch = {
      enabled: true,
      enabledThemes: [target.id],
    };

    if (target.kind === 'pack') {
      if (target.preset && typeof target.preset === 'object') {
        Object.assign(patch, target.preset);
      }
      if (target.hasBackdrop) {
        patch.wallpaperEnabled = true;
        patch.wallpaperId = `builtin:${target.folderName}`;
      } else {
        patch.wallpaperEnabled = false;
      }
      if (Boolean(store.config.cli?.terminalSyncThemeWallpaper)) {
        if (target.cli && typeof target.cli === 'object') {
          patch.cli = { ...target.cli };
        }
        const bgForCli =
          target.cliBackdropFilePath ||
          (target.backdropMediaType === 'image' ? target.backdropFilePath : (target.previewFilePath || ''));
        patch.cli = { ...(patch.cli || {}), terminalBgImage: bgForCli || '' };
      }
    } else {
      // Single .theme.css: sync colorMode, surfaceTint, accentColor cleanly and disable wallpaper clash
      patch.colorMode = target.colorMode === 'light' ? 'light' : 'dark';
      if (target.surfaceTint) patch.surfaceTint = target.surfaceTint;
      if (target.accentColor) patch.accentColor = target.accentColor;
      patch.wallpaperEnabled = false;
      if (Boolean(store.config.cli?.terminalSyncThemeWallpaper)) {
        patch.cli = { terminalBgImage: '' };
      }
    }

    store.saveConfig(patch);

    if (store.config.cli?.enabled && Boolean(store.config.cli?.terminalSyncThemeWallpaper)) {
      applyAgyCliSettings(store.config, getSystemDark());
      syncWindowsTerminalProfile(store.config, store.baseDir, getSystemDark());
    }

    await applyCurrentState();
    return { ok: true, theme: target, state: getFullState() };
  });

  ipcMain.handle('theme:toggle-local', async (_ev, themeId) => {
    if (typeof themeId !== 'string' || (!themeId.endsWith('.theme.css') && !themeId.startsWith('pack:'))) {
      return { ok: false, state: getFullState() };
    }
    const list = new Set(store.config.enabledThemes || []);
    if (list.has(themeId)) list.delete(themeId);
    else list.add(themeId);

    store.saveConfig({ enabledThemes: [...list], enabled: true });
    await applyCurrentState();
    return { ok: true, state: getFullState() };
  });

  ipcMain.handle('theme:create-local', async (_ev, meta) => {
    const created =
      meta?.kind === 'pack'
        ? themeManager.createThemePack({ ...meta, config: store.config })
        : themeManager.createThemeFile(meta || {});
    const list = new Set(store.config.enabledThemes || []);
    list.add(created.id);
    store.saveConfig({ enabledThemes: [...list] });
    await applyCurrentState();
    return { ok: true, theme: created, state: getFullState() };
  });

  ipcMain.handle('theme:export-studio-theme', async (_ev, meta) => {
    const kind = meta?.kind === 'pack' ? 'pack' : 'css';
    const css = buildExportThemeCss(store.config, meta || {}, getSystemDark());
    const created =
      kind === 'pack'
        ? themeManager.createThemePack({
            name: meta?.name || 'Custom Studio Pack',
            author: meta?.author || 'User',
            description: meta?.description || 'Exported from Antigravity Themes',
            config: store.config,
            sharedCss: css,
          })
        : themeManager.createThemeFile({
            name: meta?.name || 'Custom Studio Theme',
            author: meta?.author || 'User',
            description: meta?.description || 'Exported from Antigravity Themes',
            css,
          });
    return { ok: true, theme: created, state: getFullState() };
  });

  ipcMain.handle('theme:delete-local', async (_ev, themeId) => {
    const removed = themeManager.deleteThemeItem(themeId);
    if (removed) {
      const next = (store.config.enabledThemes || []).filter((id) => id !== themeId);
      store.saveConfig({ enabledThemes: next });
      await applyCurrentState();
    }
    return { ok: removed, state: getFullState() };
  });

  ipcMain.handle('theme:open-folder', () => {
    shell.openPath(themeManager.themesDir);
    return { ok: true };
  });

  ipcMain.handle('theme:open-file', (_ev, themeId) => {
    const target = themeManager.listLocalThemes().find((t) => t.id === themeId);
    if (!target) return { ok: false };
    shell.openPath(target.filePath);
    return { ok: true };
  });

  ipcMain.handle('theme:reload-all', async () => {
    await themeManager.syncOnlineThemes(store.config.onlineThemeUrls, true);
    await applyCurrentState();
    return { ok: true, state: getFullState() };
  });

  // --- QuickCSS & Online URLs ---
  ipcMain.handle('theme:save-quickcss', async (_ev, cssText, apply = true) => {
    themeManager.saveQuickCss(typeof cssText === 'string' ? cssText : '');
    if (apply && store.config.enabled && store.config.quickCssEnabled !== false) {
      await applyCurrentState();
    }
    return { ok: true, state: getFullState() };
  });

  ipcMain.handle('theme:set-online-urls', async (_ev, urls) => {
    store.saveConfig({ onlineThemeUrls: Array.isArray(urls) ? urls : [] });
    await themeManager.syncOnlineThemes(store.config.onlineThemeUrls, true);
    if (store.config.enabled) await applyCurrentState();
    return { ok: true, state: getFullState() };
  });

  // --- Wallpapers & Local Fonts ---
  ipcMain.handle('theme:import-wallpapers', async () => {
    const win = getMainWindow();
    const res = await dialog.showOpenDialog(win, {
      title: 'Import local image, GIF, or short video backdrop',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Media', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'mp4', 'webm', 'mov'] }],
    });
    if (res.canceled || !res.filePaths.length) return { added: 0, state: getFullState() };
    const added = store.importWallpapers(res.filePaths);
    if (added.length) {
      store.saveConfig({ wallpaperEnabled: true, wallpaperId: added[0].id });
      await applyCurrentState();
    }
    return { added: added.length, state: getFullState() };
  });

  ipcMain.handle('theme:import-themes', async () => {
    const win = getMainWindow();
    const res = await dialog.showOpenDialog(win, {
      title: 'Import .theme.css files',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Theme CSS', extensions: ['css'] }],
    });
    if (res.canceled || !res.filePaths.length) return { added: 0, state: getFullState() };
    const imported = themeManager.importThemeItems(res.filePaths);
    if (imported.length) {
      const list = new Set(store.config.enabledThemes || []);
      for (const item of imported) list.add(item.id);
      store.saveConfig({ enabledThemes: [...list], enabled: true });
      await applyCurrentState();
    }
    return { added: imported.length, items: imported, state: getFullState() };
  });

  ipcMain.handle('theme:import-pack', async () => {
    const win = getMainWindow();
    const res = await dialog.showOpenDialog(win, {
      title: 'Import Theme Pack folder (must contain theme.json)',
      properties: ['openDirectory'],
    });
    if (res.canceled || !res.filePaths.length) return { added: 0, state: getFullState() };
    const imported = themeManager.importThemeItems(res.filePaths);
    if (!imported.length) {
      return { added: 0, error: 'Selected ZIP or folder does not contain a valid theme.json manifest.', state: getFullState() };
    }
    const list = new Set(store.config.enabledThemes || []);
    for (const item of imported) list.add(item.id);
    store.saveConfig({ enabledThemes: [...list], enabled: true });
    await applyCurrentState();
    return { added: imported.length, items: imported, state: getFullState() };
  });

  ipcMain.handle('theme:import-pack-zip', async () => {
    const win = getMainWindow();
    const res = await dialog.showOpenDialog(win, {
      title: 'Import Theme Pack (.zip)',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Theme Pack Archive (.zip)', extensions: ['zip'] }],
    });
    if (res.canceled || !res.filePaths.length) return { added: 0, state: getFullState() };
    const imported = themeManager.importThemeItems(res.filePaths);
    if (!imported.length) {
      return { added: 0, error: 'Selected ZIP does not contain a valid theme.json manifest.', state: getFullState() };
    }
    const list = new Set(store.config.enabledThemes || []);
    for (const item of imported) list.add(item.id);
    store.saveConfig({ enabledThemes: [...list], enabled: true });
    await applyCurrentState();
    return { added: imported.length, items: imported, state: getFullState() };
  });

  ipcMain.handle('theme:export-pack-zip', async (_ev, themeId) => {
    const win = getMainWindow();
    const slug = String(themeId || 'theme-pack').replace(/^pack:/, '').replace(/[^a-z0-9-_]/gi, '-');
    const res = await dialog.showSaveDialog(win, {
      title: 'Export shareable Theme Pack (.zip)',
      defaultPath: `${slug}.agtheme.zip`,
      filters: [{ name: 'Theme Pack Archive', extensions: ['zip'] }],
    });
    if (res.canceled || !res.filePath) return { ok: false };
    try {
      const out = themeManager.exportPackZip(themeId, res.filePath);
      return { ok: true, filePath: out.filePath, bytes: out.bytes };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('theme:import-paths', async (_ev, filePaths) => {
    const paths = Array.isArray(filePaths) ? filePaths : [];
    const importedThemes = themeManager.importThemeItems(paths);
    const addedWp = store.importWallpapers(paths);
    const addedFonts = store.importFonts(paths);

    const patch = {};
    if (importedThemes.length) {
      const list = new Set(store.config.enabledThemes || []);
      for (const item of importedThemes) list.add(item.id);
      patch.enabledThemes = [...list];
      patch.enabled = true;
    }
    if (addedWp.length) {
      patch.wallpaperEnabled = true;
      patch.wallpaperId = addedWp[0].id;
    }
    if (Object.keys(patch).length) store.saveConfig(patch);
    if (importedThemes.length || addedWp.length || addedFonts.length) await applyCurrentState();
    return {
      added: importedThemes.length + addedWp.length + addedFonts.length,
      themes: importedThemes.length,
      wallpapers: addedWp.length,
      fonts: addedFonts.length,
      state: getFullState(),
    };
  });

  ipcMain.handle('theme:delete-wallpaper', async (_ev, id) => {
    const ok = store.deleteWallpaper(id);
    if (ok) await applyCurrentState();
    return { ok, state: getFullState() };
  });

  ipcMain.handle('theme:import-fonts', async () => {
    const win = getMainWindow();
    const res = await dialog.showOpenDialog(win, {
      title: 'Import local font file (.woff2, .woff, .ttf, .otf)',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Fonts', extensions: ['woff2', 'woff', 'ttf', 'otf'] }],
    });
    if (res.canceled || !res.filePaths.length) return { added: 0, state: getFullState() };
    const added = store.importFonts(res.filePaths);
    return { added: added.length, state: getFullState() };
  });

  ipcMain.handle('theme:delete-font', async (_ev, id) => {
    const ok = store.deleteFont(id);
    if (ok) await applyCurrentState();
    return { ok, state: getFullState() };
  });

  // --- agy CLI Theming ---
  ipcMain.handle('cli:apply-preset', (_ev, presetId, includeRecommendedWallpaper = true) => {
    const preset = CLI_THEME_PRESETS[presetId];
    if (!preset) return { ok: false, error: 'Unknown CLI preset', state: getFullState() };

    const cliPatch = {
      enabled: true,
      presetId: preset.id,
      colorScheme: preset.agyColorScheme || 'terminal',
    };

    if (includeRecommendedWallpaper && preset.recommendedPack) {
      const wp = themeManager.getBuiltInWallpaperById(`builtin:${preset.recommendedPack}`);
      const pack = themeManager.listLocalThemes().find((t) => t.id === `pack:${preset.recommendedPack}`);
      const imgPath =
        pack?.cliBackdropFilePath ||
        wp?.cliBgFilePath ||
        (wp?.mediaType === 'image' ? wp.filePath : (pack?.previewFilePath || ''));
      if (imgPath) cliPatch.terminalBgImage = imgPath;
    }

    store.saveConfig({ cli: cliPatch });
    const cliRes = applyAgyCliSettings(store.config, getSystemDark());
    if (cliRes.ok && cliRes.status?.windowsTerminalDetected) {
      syncWindowsTerminalProfile(store.config, store.baseDir, getSystemDark());
    }
    return { ...cliRes, preset, state: getFullState() };
  });

  ipcMain.handle('cli:test-statusline', () => testStatusLineScript(store.config, getSystemDark()));

  ipcMain.handle('cli:restore-wt', () => {
    const res = restoreWindowsTerminalBackup();
    return { ...res, state: getFullState() };
  });

  ipcMain.handle('cli:apply-settings', () => {
    store.saveConfig({ cli: { enabled: true } });
    const res = applyAgyCliSettings(store.config, getSystemDark());
    if (res.ok && res.status?.windowsTerminalDetected) {
      syncWindowsTerminalProfile(store.config, store.baseDir, getSystemDark());
    }
    return { ...res, state: getFullState() };
  });

  ipcMain.handle('cli:reset-settings', () => {
    store.saveConfig({
      cli: {
        presetId: 'tokyo-night',
        autoFollowOs: false,
        colorScheme: 'terminal',
        runningLightSpeed: 'medium',
        altScreenMode: 'auto',
        statusLineEnabled: false,
        terminalBgImage: '',
        terminalApplyToDefaultProfile: false,
      },
    });
    const res = resetAgyCliSettings();
    if (res.status?.windowsTerminalDetected) {
      syncWindowsTerminalProfile(store.config, store.baseDir, getSystemDark());
    }
    return { ...res, state: getFullState() };
  });

  ipcMain.handle('cli:sync-wt', () => {
    const res = syncWindowsTerminalProfile(store.config, store.baseDir, getSystemDark());
    return { ...res, state: getFullState() };
  });

  ipcMain.handle('cli:launch-terminal', () => {
    applyAgyCliSettings(store.config, getSystemDark());
    const res = launchStyledCliTerminal(store.config, store.baseDir, getSystemDark());
    return { ...res, state: getFullState() };
  });

  ipcMain.handle('cli:pick-bg-image', async () => {
    const win = getMainWindow();
    const res = await dialog.showOpenDialog(win, {
      title: 'Select Terminal background GIF, image, or short video',
      properties: ['openFile'],
      filters: [
        { name: 'Animated GIF, Images & Videos', extensions: ['gif', 'png', 'jpg', 'jpeg', 'webp', 'mp4', 'webm', 'mov'] },
      ],
    });
    if (res.canceled || !res.filePaths.length) return { ok: false, state: getFullState() };
    const picked = res.filePaths[0];
    const resolved = resolveTerminalBgImagePath(picked, store.baseDir);
    if (!resolved) {
      return {
        ok: false,
        error: 'Could not convert video to GIF (ffmpeg is required in PATH for MP4/WebM conversion).',
        state: getFullState(),
      };
    }
    store.saveConfig({ cli: { terminalBgImage: resolved } });
    if (getCliStatus().windowsTerminalDetected) {
      syncWindowsTerminalProfile(store.config, store.baseDir, getSystemDark());
    }
    return { ok: true, path: resolved, state: getFullState() };
  });

  ipcMain.handle('cli:sync-external', (_ev, termName) => {
    try {
      const res = syncExternalTerminalConfig(termName, store.config, '', getSystemDark());
      return { ...res, state: getFullState() };
    } catch (err) {
      return { ok: false, error: err.message, state: getFullState() };
    }
  });

  ipcMain.handle('cli:export-preset', async () => {
    const win = getMainWindow();
    const slug = (store.config.cli?.presetId || 'custom').replace(/[^a-z0-9-_]/gi, '-');
    const res = await dialog.showSaveDialog(win, {
      title: 'Export agy CLI preset (.json)',
      defaultPath: `agy-cli-${slug}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (res.canceled || !res.filePath) return { ok: false };
    fs.writeFileSync(res.filePath, exportCliPresetJson(store.config, getSystemDark()), 'utf8');
    return { ok: true, filePath: res.filePath };
  });

  ipcMain.handle('cli:import-preset', async () => {
    const win = getMainWindow();
    const res = await dialog.showOpenDialog(win, {
      title: 'Import agy CLI preset (.json)',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (res.canceled || !res.filePaths.length) return { ok: false, state: getFullState() };
    try {
      const { name, cliPatch } = parseCliPresetJson(fs.readFileSync(res.filePaths[0], 'utf8'));
      store.saveConfig({ cli: cliPatch });
      applyAgyCliSettings(store.config, getSystemDark());
      if (getCliStatus().windowsTerminalDetected) {
        syncWindowsTerminalProfile(store.config, store.baseDir, getSystemDark());
      }
      return { ok: true, name, state: getFullState() };
    } catch (err) {
      return { ok: false, error: err.message, state: getFullState() };
    }
  });

  // --- Guided Setup (select 1, multiple, or all 3 surfaces) ---
  ipcMain.handle('setup:install', async (_ev, options = {}) => {
    const ide = Boolean(options.ide);
    const appSurface = Boolean(options.app);
    const cli = Boolean(options.cli);
    const launchDesktop = Boolean(options.launchDesktop);
    if (!ide && !appSurface && !cli) {
      return { ok: false, error: 'Select at least one surface to set up.', steps: [], state: getFullState() };
    }

    const steps = [];
    store.saveConfig({
      setupCompleted: true,
      enabled: true,
      applyToIde: ide,
      applyToIdeChat: ide,
      applyToApp: appSurface,
      cli: { enabled: cli },
    });

    if (ide) {
      const argvRes = configureIdeArgvCdp(true);
      syncIdeWindowControls(store.config, false, getSystemDark());
      steps.push({
        id: 'ide',
        label: 'Antigravity IDE',
        ok: Boolean(argvRes?.ok),
        detail: 'Enabled local CDP in argv.json',
      });
    }

    if (appSurface) {
      steps.push({
        id: 'app',
        label: 'Antigravity App',
        ok: true,
        detail: launchDesktop ? 'Configured and launching with CDP' : 'Configured for Antigravity App',
      });
    }

    if (cli) {
      const cliRes = applyAgyCliSettings(store.config, getSystemDark());
      let detail = cliRes.ok ? 'Updated ~/.gemini/antigravity-cli/settings.json' : cliRes.error;
      if (cliRes.ok && cliRes.status?.windowsTerminalDetected) {
        const wtRes = syncWindowsTerminalProfile(store.config, store.baseDir, getSystemDark());
        if (wtRes.ok) detail = 'Updated CLI settings and Windows Terminal profile';
      }
      steps.push({
        id: 'cli',
        label: 'Antigravity CLI (agy)',
        ok: Boolean(cliRes.ok),
        detail,
      });
    }

    if (ide || appSurface) {
      await applyCurrentState();
      const status = cdp.getStatus();
      if (launchDesktop) {
        if (ide && !status.ideConnected) await launchTargetWithCdp('ide');
        if (appSurface && !status.appConnected) await launchTargetWithCdp('app');
      }
    }

    return { ok: true, steps, state: getFullState() };
  });

  ipcMain.handle('setup:uninstall-all', async () => {
    store.saveConfig({
      setupCompleted: false,
      enabled: false,
      cli: { enabled: false, statusLineEnabled: false },
    });
    syncIdeWindowControls(store.config, true, getSystemDark());
    configureIdeArgvCdp(false);
    resetAgyCliSettings();
    await cdp.disableAll();
    return { ok: true, state: getFullState() };
  });

  // --- IDE, App & CLI Diagnostics & Integration ---
  ipcMain.handle('ide:inspect-dom', () => cdp.inspectTargets());
  ipcMain.handle('diagnostics:run-all', async () => {
    const systemDark = Boolean(getSystemDark());
    const [desktopTargets, cliDiag] = await Promise.all([
      cdp.runCompatibilityCheck(),
      Promise.resolve(runCliDiagnostics(store.config, store.baseDir, systemDark)),
    ]);
    return {
      timestamp: new Date().toISOString(),
      systemDark,
      cdpStatus: cdp.getStatus(),
      desktopTargets,
      cli: cliDiag,
    };
  });
  ipcMain.handle('ide:configure-argv', (_ev, enable = true) => {
    const res = configureIdeArgvCdp(Boolean(enable));
    return { ...res, state: getFullState() };
  });
  ipcMain.handle('ide:launch-target', (_ev, target = 'ide') => {
    const safeTarget = target === 'app' ? 'app' : 'ide';
    return launchTargetWithCdp(safeTarget);
  });

  ipcMain.handle('app:toggle-autostart', (_ev, enable) => {
    const res = setLoginAutoStart(Boolean(enable));
    if (res.ok) store.saveConfig({ autoStartLogin: Boolean(enable) });
    return { ...res, state: getFullState() };
  });

  ipcMain.handle('app:export-backup', async () => {
    const win = getMainWindow();
    const res = await dialog.showSaveDialog(win, {
      title: 'Export Antigravity Themes backup',
      defaultPath: `antigravity-themes-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (res.canceled || !res.filePath) return { ok: false };
    fs.writeFileSync(res.filePath, store.exportBackupJson(themeManager.getQuickCss()), 'utf8');
    return { ok: true, filePath: res.filePath };
  });

  ipcMain.handle('app:import-backup', async () => {
    const win = getMainWindow();
    const res = await dialog.showOpenDialog(win, {
      title: 'Import Antigravity Themes backup',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (res.canceled || !res.filePaths.length) return { ok: false };
    try {
      const imported = store.importBackupJson(fs.readFileSync(res.filePaths[0], 'utf8'));
      if (imported.quickCss !== null) themeManager.saveQuickCss(imported.quickCss);
      await themeManager.syncOnlineThemes(store.config.onlineThemeUrls, false);
      await applyCurrentState();
      return { ok: true, state: getFullState() };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('app:open-data-dir', () => {
    shell.openPath(store.baseDir);
    return { ok: true };
  });

  ipcMain.handle('app:check-updates', async () => {
    const ver = typeof app?.getVersion === 'function' ? app.getVersion() : '1.2.0';
    return checkForUpdates(ver);
  });

  ipcMain.handle('app:open-external', (_ev, url) => {
    if (typeof url === 'string' && /^https:\/\/github\.com\/yammdd\/antigravity-mod(\/|$)/i.test(url)) {
      shell.openExternal(url);
      return { ok: true };
    }
    return { ok: false };
  });

  ipcMain.on('window:minimize', () => getMainWindow()?.minimize());
  ipcMain.on('window:maximize', () => {
    const win = getMainWindow();
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.on('window:close', () => getMainWindow()?.close());

  return { getFullState, applyCurrentState };
}

module.exports = { registerIpc };
