import React, { useState } from 'react';
import { Activity, Download, FolderOpen, RefreshCw, RotateCcw, Upload, Wrench } from 'lucide-react';
import ToggleRow from './ui/ToggleRow.jsx';

export default function SettingsView({
  t,
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
}) {
  const [domReport, setDomReport] = useState(null);
  const [inspecting, setInspecting] = useState(false);

  const handleInspect = async () => {
    if (!window.themeAPI) return;
    setInspecting(true);
    try {
      const res = await window.themeAPI.inspectDom();
      setDomReport(res);
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
              title={executables?.ide || 'Relaunch Antigravity IDE with CDP'}
            >
              <RefreshCw size={15} strokeWidth={1.5} />
              <span>Launch IDE</span>
            </button>
            <button
              type="button"
              className="btn"
              disabled={busyAction === 'launch-app'}
              onClick={() => onLaunchTarget('app')}
              title={executables?.app || 'Launch Antigravity App 2.0 with --remote-debugging-port=0'}
            >
              <RefreshCw size={15} strokeWidth={1.5} />
              <span>Launch App</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={inspecting}
              onClick={handleInspect}
            >
              <Activity size={15} strokeWidth={1.5} />
              <span>{inspecting ? 'Inspecting' : 'Inspect DOM'}</span>
            </button>
          </div>

          {domReport && (
            <pre
              className="mono"
              style={{
                padding: 12,
                borderRadius: 8,
                backgroundColor: 'var(--surface-deep)',
                border: '1px solid var(--border)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                overflowX: 'auto',
                maxHeight: 180,
                userSelect: 'text',
              }}
            >
              {JSON.stringify(domReport, null, 2)}
            </pre>
          )}
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
    </div>
  );
}
