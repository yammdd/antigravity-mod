import React, { useState } from 'react';
import { Activity, ArrowUpRight, CheckCircle2, Download, FolderOpen, RefreshCw, RotateCcw, Upload, Wrench } from 'lucide-react';
import ToggleRow from './ui/ToggleRow.jsx';

export default function SettingsView({
  t,
  appVersion = '1.2.0',
  systemDark = true,
  config,
  cdpStatus,
  argvStatus,
  executables,
  mediaPort,
  busyAction,
  onPatchConfig,
  onConfigureArgv,
  onLaunchTarget,
  onToggleAutoStart,
  onExportBackup,
  onImportBackup,
  onResetConfig,
  onCheckForUpdates,
  onRunDiagnostics,
  onOpenExternal,
}) {
  const [diagReport, setDiagReport] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  const handleCheckUpdate = async () => {
    if (!onCheckForUpdates) return;
    setCheckingUpdate(true);
    try {
      const res = await onCheckForUpdates();
      setUpdateInfo(res);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setInspecting(true);
    try {
      if (onRunDiagnostics) {
        const res = await onRunDiagnostics();
        setDiagReport(res);
      } else if (window.themeAPI) {
        const res = await window.themeAPI.inspectDom();
        setDiagReport({ desktopTargets: res, cli: null });
      }
    } finally {
      setInspecting(false);
    }
  };

  return (
    <div className="stack-md">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.settingsTitle}</h1>
          <p className="page-subtitle">{t.settingsSub}</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">{t.settingsBridge}</div>
          <div className="stack-sm">
            <div className="meta-row">
              <span>Antigravity IDE</span>
              <span className={`meta-value mono ${cdpStatus?.ideConnected ? 'active' : ''}`}>
                {cdpStatus?.ideConnected ? `Attached (${cdpStatus.ideCount})` : 'Idle'}
              </span>
            </div>
            <div className="meta-row">
              <span>Antigravity App (2.0)</span>
              <span className={`meta-value mono ${cdpStatus?.appConnected ? 'active' : ''}`}>
                {cdpStatus?.appConnected ? `Attached (${cdpStatus.appCount})` : 'Idle'}
              </span>
            </div>
            <div className="meta-row">
              <span>IDE argv.json flag</span>
              <span className={`meta-value mono ${argvStatus?.configured ? 'active' : ''}`}>
                {argvStatus?.configured ? `Configured (port=${argvStatus.port})` : 'Not set'}
              </span>
            </div>
            <div className="meta-row">
              <span>OS appearance</span>
              <span className="meta-value mono">{systemDark ? 'Dark' : 'Light'}</span>
            </div>
            <div className="meta-row">
              <span>Loopback media server</span>
              <span className="meta-value mono">127.0.0.1:{mediaPort || '—'}</span>
            </div>
          </div>

          <div className="header-actions" style={{ flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              onClick={() => onConfigureArgv(!argvStatus?.configured)}
            >
              <Wrench size={15} strokeWidth={1.5} />
              <span>
                {argvStatus?.configured ? 'Remove CDP from argv.json' : 'Enable CDP in argv.json'}
              </span>
            </button>
            <button
              type="button"
              className="btn"
              disabled={busyAction === 'launch-ide'}
              onClick={() => onLaunchTarget('ide')}
              title={executables?.ide || 'Launch Antigravity IDE with CDP (safe, no force-kill)'}
            >
              <RefreshCw size={15} strokeWidth={1.5} />
              <span>Launch IDE</span>
            </button>
            <button
              type="button"
              className="btn"
              disabled={busyAction === 'launch-app'}
              onClick={() => onLaunchTarget('app')}
              title={executables?.app || 'Launch Antigravity App with --remote-debugging-port=0'}
            >
              <RefreshCw size={15} strokeWidth={1.5} />
              <span>Launch App</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={inspecting}
              onClick={handleRunDiagnostics}
            >
              <Activity size={15} strokeWidth={1.5} />
              <span>{inspecting ? 'Running...' : '3-Surface Diagnostics'}</span>
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">{t.settingsScope}</div>
          <div className="stack-sm">
            <ToggleRow
              label="Theme Antigravity IDE Workbench"
              checked={config.applyToIde !== false}
              onChange={(v) => onPatchConfig({ applyToIde: v }, true)}
            />
            <ToggleRow
              label="Theme IDE embedded Chat sidebar"
              checked={config.applyToIdeChat !== false}
              onChange={(v) => onPatchConfig({ applyToIdeChat: v }, true)}
            />
            <ToggleRow
              label="Theme Antigravity App (2.0)"
              checked={config.applyToApp !== false}
              onChange={(v) => onPatchConfig({ applyToApp: v }, true)}
            />
            <ToggleRow
              label="Protect split browser cutout"
              hint="Clip backdrop around embedded browser panels"
              checked={config.splitBrowserSafe !== false}
              onChange={(v) => onPatchConfig({ splitBrowserSafe: v }, true)}
            />
            <ToggleRow
              label="Sync Windows IDE titlebar tint"
              checked={config.syncWindowControls !== false}
              onChange={(v) => onPatchConfig({ syncWindowControls: v }, true)}
            />
            <ToggleRow
              label="Minimize to system tray on close"
              checked={config.minimizeToTray !== false}
              onChange={(v) => onPatchConfig({ minimizeToTray: v }, true)}
            />
            <ToggleRow
              label="Launch on OS login"
              hint="Opt-in OS login item (off by default)"
              checked={Boolean(config.autoStartLogin)}
              onChange={(v) => onToggleAutoStart(v)}
            />
          </div>
        </div>
      </div>

      {diagReport && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">3-Surface Compatibility &amp; Health Report</div>
              <div className="card-desc">
                Read-only selector contract verification across Antigravity IDE, App, and agy CLI.
              </div>
            </div>
            <div className="header-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowRawJson((v) => !v)}
              >
                <span>{showRawJson ? 'Hide JSON' : 'Raw JSON'}</span>
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setDiagReport(null)}>
                <span>Clear</span>
              </button>
            </div>
          </div>

          <div className="diag-panel">
            <div className="diag-section">
              <div className="diag-section-title">Desktop Surfaces (IDE &amp; App)</div>
              {(!diagReport.desktopTargets || diagReport.desktopTargets.length === 0) ? (
                <div className="diag-empty">
                  No CDP targets attached right now. Launch Antigravity IDE or App with CDP enabled to verify live DOM selectors.
                </div>
              ) : (
                diagReport.desktopTargets.map((target) => (
                  <div key={`${target.port}:${target.id}`} className="diag-target-block">
                    <div className="diag-target-head">
                      <span className="mono" style={{ fontWeight: 600 }}>
                        {target.kind.toUpperCase()} · port {target.port}
                      </span>
                      <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        CSS: {target.probe?.styleInjected ? `${target.probe.styleBytes}B` : 'not mounted'}
                        {target.probe?.backdropInjected ? ' · backdrop active' : ''}
                      </span>
                    </div>
                    <div className="diag-list">
                      {(target.probe?.checks || []).map((c) => (
                        <div key={c.id} className="diag-row">
                          <span className={`diag-badge ${String(c.status || 'info').toLowerCase()}`}>
                            {c.status}
                          </span>
                          <span className="diag-label">{c.label}</span>
                          <span className="diag-detail mono">
                            tier {c.tier} · {c.hits} node{c.hits === 1 ? '' : 's'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {diagReport.cli && (
              <div className="diag-section">
                <div className="diag-section-title">
                  agy CLI ({diagReport.cli.summary})
                </div>
                <div className="diag-list">
                  {(diagReport.cli.checks || []).map((c) => (
                    <div key={c.id} className="diag-row">
                      <span className={`diag-badge ${String(c.status || 'info').toLowerCase()}`}>
                        {c.status}
                      </span>
                      <span className="diag-label">{c.label}</span>
                      <span className="diag-detail mono">{c.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showRawJson && (
              <pre
                className="mono"
                style={{
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: 'var(--surface-deep)',
                  border: '1px solid var(--border)',
                  fontSize: 11.5,
                  color: 'var(--text-secondary)',
                  overflowX: 'auto',
                  maxHeight: 240,
                  userSelect: 'text',
                }}
              >
                {JSON.stringify(diagReport, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-title">{t.settingsBackup}</div>
          <div className="header-actions" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={onExportBackup}>
              <Download size={15} strokeWidth={1.5} />
              <span>{t.exportJson}</span>
            </button>
            <button type="button" className="btn" onClick={onImportBackup}>
              <Upload size={15} strokeWidth={1.5} />
              <span>{t.importJson}</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => window.themeAPI?.openDataDir()}
            >
              <FolderOpen size={15} strokeWidth={1.5} />
              <span>{t.openDataDir}</span>
            </button>
            <button type="button" className="btn btn-danger" onClick={onResetConfig}>
              <RotateCcw size={15} strokeWidth={1.5} />
              <span>{t.resetDefaults}</span>
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">App Updates</div>
              <div className="card-desc">
                Installed version: <span className="mono">v{appVersion}</span>
              </div>
            </div>
            <button
              type="button"
              className="btn"
              disabled={checkingUpdate}
              onClick={handleCheckUpdate}
            >
              <RefreshCw size={14} strokeWidth={1.5} />
              <span>{checkingUpdate ? 'Checking...' : 'Check for updates'}</span>
            </button>
          </div>

          {updateInfo && (
            <div className={`update-banner ${updateInfo.ok ? (updateInfo.updateAvailable ? 'avail' : 'ok') : 'err'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {updateInfo.ok && !updateInfo.updateAvailable && <CheckCircle2 size={15} strokeWidth={1.7} />}
                <span>
                  {!updateInfo.ok
                    ? updateInfo.error
                    : updateInfo.updateAvailable
                      ? `New release available: ${updateInfo.latestTag}`
                      : `Up to date (latest: ${updateInfo.latestTag || `v${appVersion}`})`}
                </span>
              </div>
              {updateInfo.ok && updateInfo.updateAvailable && onOpenExternal && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ height: 28, padding: '0 10px' }}
                  onClick={() => onOpenExternal(updateInfo.releaseUrl)}
                >
                  <span>Open Release</span>
                  <ArrowUpRight size={14} strokeWidth={1.7} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
