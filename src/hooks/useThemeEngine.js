import { useCallback, useEffect, useRef, useState } from 'react';

const BROWSER_FALLBACK_STATE = {
  appVersion: '1.2.0',
  systemDark: true,
  config: {
    setupCompleted: false,
    enabled: true,
    applyToIde: true,
    applyToIdeChat: true,
    applyToApp: true,
    splitBrowserSafe: true,
    syncWindowControls: true,
    enabledThemes: ['obsidian-glass.theme.css'],
    quickCssEnabled: true,
    quickCssLiveUpdate: true,
    onlineThemeUrls: [],
    colorMode: 'dark',
    accentColor: '#3b82f6',
    surfaceTint: 'graphite',
    uiFont: 'inter',
    monoFont: 'jetbrains',
    customUiFontId: '',
    customMonoFontId: '',
    chatFontSize: 14,
    foldLongCodeBlocks: false,
    cornerRadius: 10,
    borderStyle: 'hairline',
    animationPreset: 'none',
    tabsStyle: 'default',
    activityBarStyle: 'subtle',
    statusBarStyle: 'clean',
    wallpaperEnabled: false,
    wallpaperId: '',
    unifiedFullWindow: true,
    wallpaperBlur: 0,
    dimming: 32,
    sidebarOpacity: 78,
    chatOpacity: 76,
    editorOpacity: 84,
    videoFit: 'cover',
    videoSpeed: 1,
    videoVolume: 0,
    smartGpuPowerSaving: true,
    cli: {
      enabled: false,
      presetId: 'tokyo-night',
      autoFollowOs: false,
      darkPresetId: 'catppuccin-mocha',
      lightPresetId: 'github-light',
      colorScheme: 'terminal',
      runningLightSpeed: 'medium',
      altScreenMode: 'auto',
      statusLineEnabled: true,
      statusLinePreset: 'powerline',
      statusLinePadding: 0,
      statusLineStackWithDefault: false,
      statusLineShowModel: true,
      statusLineShowFolder: true,
      statusLineShowBranch: true,
      statusLineShowContextBar: true,
      statusLineShowClock: false,
      statusLinePrefix: '◆',
      terminalFontFace: 'JetBrainsMono Nerd Font',
      terminalFontSize: 11,
      terminalLineHeight: 1.2,
      terminalCursorShape: 'bar',
      terminalPadding: 12,
      terminalOpacity: 88,
      terminalAcrylic: true,
      terminalRetroEffect: false,
      terminalSyncThemeWallpaper: false,
      terminalApplyToDefaultProfile: true,
      terminalBgImage: '',
      terminalBgOpacity: 0.3,
      terminalBgStretch: 'uniformToFill',
      terminalBgAlignment: 'center',
    },
    autoApplyOnChange: true,
    minimizeToTray: true,
    autoStartLogin: false,
  },
  themes: [
    {
      id: 'pack:carbon-studio',
      fileName: 'pack:carbon-studio',
      kind: 'pack',
      name: 'Carbon Studio',
      author: 'Antigravity Themes',
      version: '1.0.0',
      description: 'Unified 3-surface theme pack for Antigravity IDE, App, and agy CLI.',
      targets: ['ide', 'app', 'cli'],
      size: 3840,
    },
    {
      id: 'obsidian-glass.theme.css',
      fileName: 'obsidian-glass.theme.css',
      kind: 'css',
      name: 'Obsidian Glass',
      author: 'Antigravity Themes',
      version: '1.0.0',
      description: 'Quiet graphite surfaces with subtle hairlines and cobalt focus states.',
      targets: ['ide', 'app'],
      size: 820,
    },
  ],
  themesDir: '~/.antigravity-themes/themes',
  quickCss: '/* QuickCSS live stylesheet */\n:root {\n  --ag-accent: #3b82f6;\n}\n',
  onlineThemes: [],
  builtInWallpapers: [],
  wallpapers: [],
  fonts: [],
  mediaPort: 0,
  cdpStatus: {
    connected: false,
    port: null,
    ports: [],
    ideCount: 0,
    ideChatCount: 0,
    appCount: 0,
    ideConnected: false,
    ideChatConnected: false,
    appConnected: false,
  },
  argvStatus: { configured: false, path: '~/.antigravity-ide/argv.json', port: null },
  executables: { ide: null, app: null },
  cliStatus: {
    settingsPath: '~/.gemini/antigravity-cli/settings.json',
    settingsExists: false,
    currentColorScheme: 'terminal',
    currentSpeed: 'medium',
    currentAltScreen: 'auto',
    hasCustomStatusLine: false,
    windowsTerminalDetected: false,
    wtProfileInstalled: false,
    wtHasBackup: false,
  },
  cliPresets: [],
  cliBgMediaUrl: '',
  terminalSnippets: { palette: null, ghostty: '', wezterm: '', kitty: '', alacritty: '' },
};

export function useThemeEngine() {
  const [state, setState] = useState(null);
  const [cdpStatus, setCdpStatus] = useState(BROWSER_FALLBACK_STATE.cdpStatus);
  const [busyAction, setBusyAction] = useState('');
  const [toast, setToast] = useState('');

  const patchTimerRef = useRef(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 3000);
  }, []);

  useEffect(() => {
    if (!window.themeAPI) {
      setState(BROWSER_FALLBACK_STATE);
      return;
    }

    window.themeAPI.getState().then((initial) => {
      setState(initial);
      if (initial?.cdpStatus) setCdpStatus(initial.cdpStatus);
    });

    const unsubCdp = window.themeAPI.onCdpStatus((status) => setCdpStatus(status));
    const unsubState = window.themeAPI.onStateUpdated((next) => {
      setState((prev) => ({ ...prev, ...next }));
      if (next?.cdpStatus) setCdpStatus(next.cdpStatus);
    });

    return () => {
      unsubCdp?.();
      unsubState?.();
    };
  }, []);

  const patchConfig = useCallback((patch, immediate = false) => {
    setState((prev) => {
      if (!prev) return prev;
      const nextCli = patch.cli ? { ...prev.config.cli, ...patch.cli } : prev.config.cli;
      return { ...prev, config: { ...prev.config, ...patch, cli: nextCli } };
    });
    if (!window.themeAPI) return;

    clearTimeout(patchTimerRef.current);
    const run = () => {
      window.themeAPI.updateConfig(patch).then((next) => {
        if (next) setState((prev) => ({ ...prev, ...next }));
      });
    };

    if (immediate) run();
    else patchTimerRef.current = setTimeout(run, 100);
  }, []);

  const applyNow = useCallback(async () => {
    if (!window.themeAPI) return;
    setBusyAction('apply');
    try {
      const res = await window.themeAPI.applyNow();
      if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
      showToast(
        res?.count > 0
          ? `Applied to ${res.count} Antigravity target${res.count > 1 ? 's' : ''}`
          : 'Saved. Start Antigravity IDE or App with CDP enabled to attach'
      );
    } finally {
      setBusyAction('');
    }
  }, [showToast]);

  const disableTheme = useCallback(async () => {
    if (!window.themeAPI) {
      patchConfig({ enabled: false }, true);
      return;
    }
    const res = await window.themeAPI.disableTheme();
    if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
    showToast('Custom CSS disabled and stock UI restored');
  }, [patchConfig, showToast]);

  const applyPresetPack = useCallback(
    async (themeId) => {
      if (!window.themeAPI) {
        patchConfig({ enabledThemes: [themeId], enabled: true }, true);
        return;
      }
      const res = await window.themeAPI.applyPresetPack(themeId);
      if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
      if (res?.ok && res.theme) {
        showToast(`Applied theme: ${res.theme.name}`);
      }
    },
    [patchConfig, showToast]
  );

  const toggleLocalTheme = useCallback(async (themeId) => {
    if (!window.themeAPI) {
      setState((prev) => {
        const set = new Set(prev.config.enabledThemes || []);
        if (set.has(themeId)) set.delete(themeId);
        else set.add(themeId);
        return { ...prev, config: { ...prev.config, enabledThemes: [...set] } };
      });
      return;
    }
    const res = await window.themeAPI.toggleLocalTheme(themeId);
    if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
  }, []);

  const createLocalTheme = useCallback(
    async (meta) => {
      if (!window.themeAPI) return null;
      const res = await window.themeAPI.createLocalTheme(meta);
      if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
      if (res?.ok) showToast(`Created ${res.theme.name}`);
      return res;
    },
    [showToast]
  );

  const exportStudioTheme = useCallback(
    async (meta) => {
      if (!window.themeAPI) return null;
      const res = await window.themeAPI.exportStudioTheme(meta);
      if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
      if (res?.ok) showToast(`Exported ${res.theme.name} to themes folder`);
      return res;
    },
    [showToast]
  );

  const deleteLocalTheme = useCallback(
    async (themeId) => {
      if (!window.themeAPI) return;
      const res = await window.themeAPI.deleteLocalTheme(themeId);
      if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
      if (res?.ok) showToast('Theme removed');
    },
    [showToast]
  );

  const importThemes = useCallback(async () => {
    if (!window.themeAPI) return;
    const res = await window.themeAPI.importThemes();
    if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
    if (res?.added > 0) showToast(`Imported and enabled ${res.added} theme${res.added > 1 ? 's' : ''}`);
  }, [showToast]);

  const importPack = useCallback(async () => {
    if (!window.themeAPI) return;
    const res = await window.themeAPI.importPack();
    if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
    if (res?.error) showToast(res.error);
    else if (res?.added > 0) showToast('Imported and enabled Theme Pack');
  }, [showToast]);

  const importPackZip = useCallback(async () => {
    if (!window.themeAPI) return;
    const res = await window.themeAPI.importPackZip();
    if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
    if (res?.error) showToast(res.error);
    else if (res?.added > 0) showToast(`Imported ${res.added} Theme Pack ZIP${res.added > 1 ? 's' : ''}`);
  }, [showToast]);

  const exportPackZip = useCallback(
    async (themeId) => {
      if (!window.themeAPI) return;
      const res = await window.themeAPI.exportPackZip(themeId);
      if (res?.ok) showToast(`Exported pack ZIP to ${res.filePath}`);
      else if (res?.error) showToast(`Export failed: ${res.error}`);
    },
    [showToast]
  );

  const runSetup = useCallback(
    async (options) => {
      if (!window.themeAPI) {
        patchConfig(
          {
            setupCompleted: true,
            enabled: true,
            applyToIde: Boolean(options?.ide),
            applyToIdeChat: Boolean(options?.ide),
            applyToApp: Boolean(options?.app),
            cli: { enabled: Boolean(options?.cli) },
          },
          true
        );
        return { ok: true, steps: [] };
      }
      setBusyAction('setup');
      try {
        const res = await window.themeAPI.runSetup(options);
        if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
        if (res?.ok) {
          const labels = (res.steps || []).map((s) => s.label).join(', ');
          showToast(labels ? `Setup complete: ${labels}` : 'Setup complete');
        } else if (res?.error) {
          showToast(res.error);
        }
        return res;
      } finally {
        setBusyAction('');
      }
    },
    [patchConfig, showToast]
  );

  const uninstallAll = useCallback(async () => {
    if (!window.themeAPI) {
      patchConfig({ setupCompleted: false, enabled: false, cli: { enabled: false } }, true);
      return { ok: true };
    }
    setBusyAction('setup');
    try {
      const res = await window.themeAPI.uninstallAll();
      if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
      showToast('Restored IDE, App, and CLI to stock defaults');
      return res;
    } finally {
      setBusyAction('');
    }
  }, [patchConfig, showToast]);

  const reloadAllThemes = useCallback(async () => {
    if (!window.themeAPI) return;
    setBusyAction('reload');
    try {
      const res = await window.themeAPI.reloadAllThemes();
      if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
      showToast('Reloaded local themes, packs, online CSS, and QuickCSS');
    } finally {
      setBusyAction('');
    }
  }, [showToast]);

  const saveQuickCss = useCallback(
    async (cssText, apply = true, silent = false) => {
      setState((prev) => (prev ? { ...prev, quickCss: cssText } : prev));
      if (!window.themeAPI) return;
      const res = await window.themeAPI.saveQuickCss(cssText, apply);
      if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
      if (!silent) showToast('QuickCSS saved and applied');
    },
    [showToast]
  );

  const setOnlineUrls = useCallback(
    async (urls) => {
      if (!window.themeAPI) {
        patchConfig({ onlineThemeUrls: urls }, true);
        return;
      }
      setBusyAction('online');
      try {
        const res = await window.themeAPI.setOnlineUrls(urls);
        if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
        showToast('Updated online CSS theme links');
      } finally {
        setBusyAction('');
      }
    },
    [patchConfig, showToast]
  );

  const importWallpapers = useCallback(async () => {
    if (!window.themeAPI) return;
    const res = await window.themeAPI.importWallpapers();
    if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
    if (res?.added > 0) showToast(`Imported ${res.added} media file${res.added > 1 ? 's' : ''}`);
  }, [showToast]);

  const importPaths = useCallback(
    async (paths) => {
      if (!window.themeAPI || !paths.length) return;
      const res = await window.themeAPI.importPaths(paths);
      if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
      if (res?.added > 0) showToast(`Imported ${res.added} file${res.added > 1 ? 's' : ''}`);
    },
    [showToast]
  );

  const deleteWallpaper = useCallback(async (id) => {
    if (!window.themeAPI) return;
    const res = await window.themeAPI.deleteWallpaper(id);
    if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
  }, []);

  const importFonts = useCallback(async () => {
    if (!window.themeAPI) return;
    const res = await window.themeAPI.importFonts();
    if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
    if (res?.added > 0) showToast(`Imported ${res.added} font file${res.added > 1 ? 's' : ''}`);
  }, [showToast]);

  const deleteFont = useCallback(async (id) => {
    if (!window.themeAPI) return;
    const res = await window.themeAPI.deleteFont(id);
    if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
  }, []);

  // --- agy CLI actions ---
  const applyCliPreset = useCallback(
    async (presetId, includeWallpaper = false) => {
      if (!window.themeAPI) {
        patchConfig({ cli: { presetId, enabled: true } }, true);
        return { ok: true };
      }
      const res = await window.themeAPI.applyCliPreset(presetId, includeWallpaper);
      if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
      if (res?.ok && res.preset) {
        showToast(`Applied CLI theme: ${res.preset.name}`);
      } else if (res?.error) {
        showToast(res.error);
      }
      return res;
    },
    [patchConfig, showToast]
  );

  const applyCliSettings = useCallback(async () => {
    if (!window.themeAPI) return;
    const res = await window.themeAPI.applyCliSettings();
    if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
    showToast(res?.ok ? 'Applied theme to ~/.gemini/antigravity-cli/settings.json' : res?.error || 'Failed to update CLI settings');
  }, [showToast]);

  const testCliStatusLine = useCallback(async () => {
    if (!window.themeAPI) {
      return { ok: true, plainText: '◆ Gemini 4 Neon  antigravity-project (main)  ██░░░░░░ 28%' };
    }
    return window.themeAPI.testCliStatusLine();
  }, []);

  const resetCliSettings = useCallback(async () => {
    if (!window.themeAPI) return;
    const res = await window.themeAPI.resetCliSettings();
    if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
    showToast('Restored agy CLI settings to defaults');
  }, [showToast]);

  const syncWindowsTerminal = useCallback(async () => {
    if (!window.themeAPI) return;
    const res = await window.themeAPI.syncWindowsTerminal();
    if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
    showToast(
      res?.ok
        ? res.appliedDefaults
          ? 'Synced "Antigravity CLI" and default Windows Terminal profile'
          : 'Synced "Antigravity CLI" profile to Windows Terminal'
        : res?.error || 'Sync failed'
    );
  }, [showToast]);

  const restoreWindowsTerminal = useCallback(async () => {
    if (!window.themeAPI) return;
    const res = await window.themeAPI.restoreWindowsTerminal();
    if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
    showToast(res?.ok ? 'Restored original Windows Terminal backup' : res?.error || 'Restore failed');
  }, [showToast]);

  const launchCliTerminal = useCallback(async () => {
    if (!window.themeAPI) return;
    setBusyAction('launch-cli');
    try {
      const res = await window.themeAPI.launchCliTerminal();
      if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
      showToast(res?.ok ? res.message || 'Launched Antigravity CLI terminal' : res?.error || 'Launch failed');
    } finally {
      setBusyAction('');
    }
  }, [showToast]);

  const pickCliBgImage = useCallback(async () => {
    if (!window.themeAPI) return;
    const res = await window.themeAPI.pickCliBgImage();
    if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
    if (res?.ok) showToast('Updated terminal background media');
    else if (res?.error) showToast(res.error);
  }, [showToast]);

  const syncExternalTerminal = useCallback(
    async (termName) => {
      if (!window.themeAPI) return null;
      const res = await window.themeAPI.syncExternalTerminal(termName);
      if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
      if (res?.ok) {
        showToast(res.note ? `${termName}: ${res.note}` : `Synced ${termName} config (${res.path})`);
      } else if (res?.error) {
        showToast(res.error);
      }
      return res;
    },
    [showToast]
  );

  const exportCliPreset = useCallback(async () => {
    if (!window.themeAPI) return;
    const res = await window.themeAPI.exportCliPreset();
    if (res?.ok) showToast(`Exported CLI preset to ${res.filePath}`);
  }, [showToast]);

  const importCliPreset = useCallback(async () => {
    if (!window.themeAPI) return;
    const res = await window.themeAPI.importCliPreset();
    if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
    if (res?.ok) showToast(`Imported CLI preset: ${res.name}`);
    else if (res?.error) showToast(`Import failed: ${res.error}`);
  }, [showToast]);

  const checkForUpdates = useCallback(async () => {
    if (!window.themeAPI) {
      return { ok: true, currentVersion: '1.2.0', latestVersion: '1.2.0', updateAvailable: false };
    }
    return window.themeAPI.checkForUpdates();
  }, []);

  const runDiagnostics = useCallback(async () => {
    if (!window.themeAPI?.runDiagnostics) {
      return {
        timestamp: new Date().toISOString(),
        systemDark: true,
        desktopTargets: [],
        cli: { ok: true, summary: 'Browser preview mode', checks: [] },
      };
    }
    return window.themeAPI.runDiagnostics();
  }, []);

  const openExternal = useCallback((url) => {
    window.themeAPI?.openExternal(url);
  }, []);

  // --- IDE & App integration ---
  const configureArgv = useCallback(
    async (enable = true) => {
      if (!window.themeAPI) return;
      const res = await window.themeAPI.configureArgv(enable);
      if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
      showToast(enable ? 'Enabled CDP flag in ~/.antigravity-ide/argv.json' : 'Removed CDP flag from argv.json');
    },
    [showToast]
  );

  const launchTarget = useCallback(
    async (target = 'ide') => {
      if (!window.themeAPI) return;
      setBusyAction(`launch-${target}`);
      try {
        const res = await window.themeAPI.launchTarget(target);
        showToast(res?.message || `Launched ${target}`);
      } finally {
        setBusyAction('');
      }
    },
    [showToast]
  );

  const toggleAutoStart = useCallback(
    async (enable) => {
      if (!window.themeAPI) return;
      const res = await window.themeAPI.toggleAutoStart(enable);
      if (res?.state) setState((prev) => ({ ...prev, ...res.state }));
      if (res?.ok) showToast(enable ? 'Launch on login enabled' : 'Launch on login disabled');
    },
    [showToast]
  );

  const exportBackup = useCallback(async () => {
    if (!window.themeAPI) return;
    const res = await window.themeAPI.exportBackup();
    if (res?.ok) showToast(`Backup exported to ${res.filePath}`);
  }, [showToast]);

  const importBackup = useCallback(async () => {
    if (!window.themeAPI) return;
    const res = await window.themeAPI.importBackup();
    if (res?.ok && res.state) {
      setState((prev) => ({ ...prev, ...res.state }));
      showToast('Backup restored');
    } else if (res?.error) {
      showToast(`Import failed: ${res.error}`);
    }
  }, [showToast]);

  const resetConfig = useCallback(async () => {
    if (!window.themeAPI) return;
    const next = await window.themeAPI.resetConfig();
    if (next) setState((prev) => ({ ...prev, ...next }));
    showToast('Configuration reset to defaults');
  }, [showToast]);

  return {
    state,
    cdpStatus,
    busyAction,
    toast,
    showToast,
    patchConfig,
    applyNow,
    disableTheme,
    applyPresetPack,
    toggleLocalTheme,
    createLocalTheme,
    exportStudioTheme,
    deleteLocalTheme,
    importThemes,
    importPack,
    importPackZip,
    exportPackZip,
    runSetup,
    uninstallAll,
    reloadAllThemes,
    saveQuickCss,
    setOnlineUrls,
    importWallpapers,
    importPaths,
    deleteWallpaper,
    importFonts,
    deleteFont,
    applyCliPreset,
    applyCliSettings,
    testCliStatusLine,
    resetCliSettings,
    syncWindowsTerminal,
    restoreWindowsTerminal,
    launchCliTerminal,
    pickCliBgImage,
    syncExternalTerminal,
    exportCliPreset,
    importCliPreset,
    checkForUpdates,
    runDiagnostics,
    openExternal,
    configureArgv,
    launchTarget,
    toggleAutoStart,
    exportBackup,
    importBackup,
    resetConfig,
  };
}
