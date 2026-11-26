import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Upload } from 'lucide-react';
import { useThemeEngine } from './hooks/useThemeEngine.js';
import { getStrings } from './i18n.js';
import TitleBar from './components/TitleBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import SetupView from './components/SetupView.jsx';
import PreviewCanvas from './components/PreviewCanvas.jsx';
import ThemesView from './components/ThemesView.jsx';
import WallpapersView from './components/WallpapersView.jsx';
import QuickCssView from './components/QuickCssView.jsx';
import StudioView from './components/StudioView.jsx';
import CliView from './components/CliView.jsx';
import SettingsView from './components/SettingsView.jsx';

export default function App() {
  const engine = useThemeEngine();
  const [activeTab, setActiveTab] = useState('themes');
  const [previewMode, setPreviewMode] = useState('ide');
  const [showSetup, setShowSetup] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const initRef = useRef(false);

  const { state, cdpStatus, busyAction, toast } = engine;
  const config = state?.config || {};
  const t = useMemo(() => getStrings(), []);

  const wallpapers = state?.wallpapers || [];
  const builtInWallpapers = state?.builtInWallpapers || [];

  const showIde = config.applyToIde !== false;
  const showApp = config.applyToApp !== false;
  const showDesktop = showIde || showApp;
  const showCli = Boolean(config.cli?.enabled);

  const visibleModes = useMemo(() => {
    const modes = [];
    if (showIde) modes.push('ide');
    if (showApp) modes.push('app');
    if (showCli) modes.push('cli');
    return modes.length ? modes : ['ide', 'app', 'cli'];
  }, [showIde, showApp, showCli]);

  useEffect(() => {
    if (!state || initRef.current) return;
    initRef.current = true;
    const completed = Boolean(state.config?.setupCompleted);
    setShowSetup(!completed);
    if (completed) {
      const hasDesk = state.config?.applyToIde !== false || state.config?.applyToApp !== false;
      setActiveTab(hasDesk ? 'themes' : 'cli');
      setPreviewMode(
        state.config?.applyToIde !== false ? 'ide' : state.config?.applyToApp !== false ? 'app' : 'cli'
      );
    }
  }, [state]);

  const activeWallpaper = useMemo(() => {
    if (!config.wallpaperId) return null;
    return (
      wallpapers.find((w) => w.id === config.wallpaperId) ||
      builtInWallpapers.find((w) => w.id === config.wallpaperId) ||
      null
    );
  }, [wallpapers, builtInWallpapers, config.wallpaperId]);

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'cli') setPreviewMode('cli');
    else if (previewMode === 'cli' && showDesktop) setPreviewMode(showIde ? 'ide' : 'app');
  };

  const handleRunSetup = async (options) => {
    const res = await engine.runSetup(options);
    if (res?.ok) {
      const hasDesk = Boolean(options.ide || options.app);
      setActiveTab(hasDesk ? 'themes' : 'cli');
      setPreviewMode(options.ide ? 'ide' : options.app ? 'app' : 'cli');
      setShowSetup(false);
    }
  };

  const handleUninstallAll = async () => {
    await engine.uninstallAll();
    setShowSetup(true);
  };

  const handleSyncCliWallpaper = async (filePath) => {
    engine.patchConfig({ cli: { terminalBgImage: filePath } }, true);
    await engine.syncWindowsTerminal();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (showSetup) return;
    const paths = Array.from(e.dataTransfer?.files || [])
      .map((f) => window.themeAPI?.getPathForFile(f))
      .filter(Boolean);
    if (paths.length) await engine.importPaths(paths);
  };

  if (!state || showSetup === null) {
    return (
      <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t.loading}</span>
      </div>
    );
  }

  const ideNeedsAttach = showIde && !cdpStatus?.ideConnected;
  const appNeedsAttach = showApp && !cdpStatus?.appConnected;
  const showConnectBanner =
    !showSetup &&
    showDesktop &&
    activeTab !== 'settings' &&
    activeTab !== 'cli' &&
    (ideNeedsAttach || appNeedsAttach);

  return (
    <div
      className="app-shell"
      onDragOver={(e) => {
        e.preventDefault();
        if (!showSetup && !isDragging) setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsDragging(false);
      }}
      onDrop={handleDrop}
    >
      <TitleBar
        t={t}
        cdpStatus={cdpStatus}
        enabled={config.enabled}
        busyAction={busyAction}
        isSetupMode={showSetup}
        showDesktopControls={showDesktop}
        onApplyNow={engine.applyNow}
        onDisableTheme={engine.disableTheme}
      />

      {showSetup ? (
        <SetupView
          t={t}
          config={config}
          cdpStatus={cdpStatus}
          argvStatus={state.argvStatus}
          executables={state.executables}
          cliStatus={state.cliStatus}
          busyAction={busyAction}
          isReconfigure={Boolean(config.setupCompleted)}
          onRunSetup={handleRunSetup}
          onUninstallAll={handleUninstallAll}
          onBack={() => setShowSetup(false)}
        />
      ) : (
        <div className="app-body">
          <Sidebar
            t={t}
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            onOpenSetup={() => setShowSetup(true)}
            enabledCount={(config.enabledThemes || []).length}
            config={config}
            cdpStatus={cdpStatus}
            cliStatus={state.cliStatus}
          />

          <main className="content-scroll">
            <div className="content-inner">
              {showConnectBanner && (
                <div className="connect-banner">
                  <span className="connect-banner-text">
                    {ideNeedsAttach && appNeedsAttach
                      ? t.connectBoth
                      : ideNeedsAttach
                        ? t.connectIde
                        : t.connectApp}
                  </span>
                  <div className="header-actions">
                    {ideNeedsAttach && (
                      <button
                        type="button"
                        className="btn"
                        disabled={busyAction === 'launch-ide'}
                        onClick={() => engine.launchTarget('ide')}
                      >
                        <Play size={14} strokeWidth={1.5} />
                        <span>{busyAction === 'launch-ide' ? t.launching : t.launchIde}</span>
                      </button>
                    )}
                    {appNeedsAttach && (
                      <button
                        type="button"
                        className="btn"
                        disabled={busyAction === 'launch-app'}
                        onClick={() => engine.launchTarget('app')}
                      >
                        <Play size={14} strokeWidth={1.5} />
                        <span>{busyAction === 'launch-app' ? t.launching : t.launchApp}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeTab !== 'settings' && activeTab !== 'quickcss' && activeTab !== 'cli' && (
                <PreviewCanvas
                  t={t}
                  config={config}
                  activeWallpaper={activeWallpaper}
                  builtInWallpapers={builtInWallpapers}
                  wallpapers={wallpapers}
                  previewMode={previewMode}
                  visibleModes={visibleModes}
                  onChangeMode={setPreviewMode}
                />
              )}

              {activeTab === 'themes' && (
                <ThemesView
                  t={t}
                  themes={state.themes || []}
                  themesDir={state.themesDir || ''}
                  enabledThemes={config.enabledThemes || []}
                  onlineThemeUrls={config.onlineThemeUrls || []}
                  onlineThemes={state.onlineThemes || []}
                  busyAction={busyAction}
                  onApplyPresetPack={engine.applyPresetPack}
                  onCreateTheme={engine.createLocalTheme}
                  onDeleteTheme={engine.deleteLocalTheme}
                  onImportThemes={engine.importThemes}
                  onImportPack={engine.importPack}
                  onImportPackZip={engine.importPackZip}
                  onExportPackZip={engine.exportPackZip}
                  onReloadAll={engine.reloadAllThemes}
                  onSetOnlineUrls={engine.setOnlineUrls}
                />
              )}

              {activeTab === 'wallpapers' && (
                <WallpapersView
                  t={t}
                  config={config}
                  wallpapers={wallpapers}
                  builtInWallpapers={builtInWallpapers}
                  showCli={showCli}
                  onPatchConfig={engine.patchConfig}
                  onImportWallpapers={engine.importWallpapers}
                  onDeleteWallpaper={engine.deleteWallpaper}
                  onSyncCliWallpaper={handleSyncCliWallpaper}
                />
              )}

              {activeTab === 'studio' && (
                <StudioView
                  t={t}
                  config={config}
                  fonts={state.fonts || []}
                  onPatchConfig={engine.patchConfig}
                  onImportFonts={engine.importFonts}
                  onDeleteFont={engine.deleteFont}
                  onExportStudioTheme={engine.exportStudioTheme}
                />
              )}

              {activeTab === 'quickcss' && (
                <QuickCssView
                  t={t}
                  quickCss={state.quickCss || ''}
                  quickCssEnabled={config.quickCssEnabled}
                  quickCssLiveUpdate={config.quickCssLiveUpdate}
                  onPatchConfig={engine.patchConfig}
                  onSaveQuickCss={engine.saveQuickCss}
                />
              )}

              {activeTab === 'cli' && (
                <CliView
                  t={t}
                  config={config}
                  cliStatus={state.cliStatus}
                  cliPresets={state.cliPresets || []}
                  cliBgMediaUrl={state.cliBgMediaUrl || ''}
                  builtInWallpapers={builtInWallpapers}
                  wallpapers={wallpapers}
                  terminalSnippets={state.terminalSnippets}
                  busyAction={busyAction}
                  onPatchConfig={engine.patchConfig}
                  onApplyCliPreset={engine.applyCliPreset}
                  onApplyCli={engine.applyCliSettings}
                  onTestCliStatusLine={engine.testCliStatusLine}
                  onResetCli={engine.resetCliSettings}
                  onSyncWindowsTerminal={engine.syncWindowsTerminal}
                  onRestoreWindowsTerminal={engine.restoreWindowsTerminal}
                  onLaunchCliTerminal={engine.launchCliTerminal}
                  onPickCliBgImage={engine.pickCliBgImage}
                  onSyncExternalTerminal={engine.syncExternalTerminal}
                  onExportCliPreset={engine.exportCliPreset}
                  onImportCliPreset={engine.importCliPreset}
                  onShowToast={engine.showToast}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  t={t}
                  appVersion={state.appVersion || '1.1.0'}
                  config={config}
                  cdpStatus={cdpStatus}
                  argvStatus={state.argvStatus}
                  executables={state.executables}
                  mediaPort={state.mediaPort}
                  busyAction={busyAction}
                  onPatchConfig={engine.patchConfig}
                  onConfigureArgv={engine.configureArgv}
                  onLaunchTarget={engine.launchTarget}
                  onToggleAutoStart={engine.toggleAutoStart}
                  onExportBackup={engine.exportBackup}
                  onImportBackup={engine.importBackup}
                  onResetConfig={engine.resetConfig}
                  onCheckForUpdates={engine.checkForUpdates}
                  onOpenExternal={engine.openExternal}
                />
              )}
            </div>
          </main>
        </div>
      )}

      {isDragging && !showSetup && (
        <div className="drop-overlay">
          <div className="drop-card">
            <Upload size={24} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
            <div style={{ fontSize: 15, fontWeight: 500 }}>{t.dropOverlayTitle}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.dropOverlaySub}</div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
