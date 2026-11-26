import React, { useMemo, useState } from 'react';
import { AppWindow, ArrowRight, Check, Code2, RotateCcw, Terminal } from 'lucide-react';

export default function SetupView({
  t,
  config,
  cdpStatus,
  argvStatus,
  executables,
  cliStatus,
  busyAction,
  isReconfigure,
  onRunSetup,
  onUninstallAll,
  onBack,
}) {
  const [selected, setSelected] = useState(() => {
    if (isReconfigure) {
      return {
        ide: Boolean(config.applyToIde),
        app: Boolean(config.applyToApp),
        cli: Boolean(config.cli?.enabled),
      };
    }
    return {
      ide: true,
      app: Boolean(executables?.app || cdpStatus?.appConnected || true),
      cli: true,
    };
  });
  const [launchDesktop, setLaunchDesktop] = useState(false);

  const selectedCount = (selected.ide ? 1 : 0) + (selected.app ? 1 : 0) + (selected.cli ? 1 : 0);
  const allSelected = selected.ide && selected.app && selected.cli;

  const cards = useMemo(
    () => [
      {
        id: 'ide',
        title: 'Antigravity IDE',
        icon: Code2,
        status: cdpStatus?.ideConnected
          ? { label: t.pillAttached, tone: 'ok' }
          : argvStatus?.configured
            ? { label: t.pillCdpReady, tone: 'ok' }
            : executables?.ide
              ? { label: t.pillDetected, tone: 'neutral' }
              : { label: t.pillManual, tone: 'muted' },
        summary: t.setupIdeDesc,
      },
      {
        id: 'app',
        title: 'Antigravity App',
        icon: AppWindow,
        status: cdpStatus?.appConnected
          ? { label: t.pillAttached, tone: 'ok' }
          : executables?.app
            ? { label: t.pillDetected, tone: 'neutral' }
            : { label: t.pillManual, tone: 'muted' },
        summary: t.setupAppDesc,
      },
      {
        id: 'cli',
        title: 'Antigravity CLI (agy)',
        icon: Terminal,
        status: cliStatus?.wtProfileInstalled
          ? { label: t.pillProfileSynced, tone: 'ok' }
          : cliStatus?.windowsTerminalDetected
            ? { label: t.pillTerminalReady, tone: 'neutral' }
            : { label: t.pillConfigReady, tone: 'muted' },
        summary: t.setupCliDesc,
      },
    ],
    [t, cdpStatus, argvStatus, executables, cliStatus]
  );

  const toggle = (id) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleAll = () => {
    const next = !allSelected;
    setSelected({ ide: next, app: next, cli: next });
  };

  const needsDesktopLaunch =
    (selected.ide && !cdpStatus?.ideConnected) || (selected.app && !cdpStatus?.appConnected);

  const handleInstall = async () => {
    if (selectedCount === 0) return;
    await onRunSetup({
      ide: selected.ide,
      app: selected.app,
      cli: selected.cli,
      launchDesktop: needsDesktopLaunch && launchDesktop,
    });
  };

  return (
    <div className="setup-shell">
      <div className="setup-container">
        <div className="setup-header">
          <div>
            <h1 className="setup-title">{isReconfigure ? t.setupTitleManage : t.setupTitleFirst}</h1>
            <p className="setup-subtitle">{t.setupSubtitle}</p>
          </div>
          <button type="button" className="btn" onClick={toggleAll}>
            {allSelected ? t.clearAll : t.selectAll}
          </button>
        </div>

        <div className="setup-grid">
          {cards.map((card) => {
            const Icon = card.icon;
            const isChecked = selected[card.id];
            return (
              <button
                key={card.id}
                type="button"
                className={`surface-card ${isChecked ? 'selected' : ''}`}
                aria-pressed={isChecked}
                onClick={() => toggle(card.id)}
              >
                <div className="surface-card-top">
                  <div className="surface-icon-box">
                    <Icon size={18} strokeWidth={1.5} />
                  </div>
                  <div className="surface-card-badges">
                    <span className={`surface-pill tone-${card.status.tone}`}>{card.status.label}</span>
                    <span className={`surface-check ${isChecked ? 'checked' : ''}`} aria-hidden="true">
                      {isChecked && <Check size={12} strokeWidth={2.2} />}
                    </span>
                  </div>
                </div>

                <div className="surface-card-title">{card.title}</div>
                <p className="surface-card-desc">{card.summary}</p>
              </button>
            );
          })}
        </div>

        <div className="setup-footer card">
          <div className="setup-footer-left">
            {needsDesktopLaunch ? (
              <label className="setup-checkbox">
                <input
                  type="checkbox"
                  checked={launchDesktop}
                  onChange={(e) => setLaunchDesktop(e.target.checked)}
                />
                <span>{t.setupLaunchAfter}</span>
              </label>
            ) : (
              <span className="setup-hint">
                {selectedCount === 0 ? t.setupSelectPrompt : t.setupSelectedCount(selectedCount)}
              </span>
            )}
          </div>

          <div className="header-actions">
            {isReconfigure && (
              <>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busyAction === 'setup'}
                  onClick={onUninstallAll}
                >
                  <RotateCcw size={15} strokeWidth={1.5} />
                  <span>{t.setupRestoreAll}</span>
                </button>
                <button type="button" className="btn btn-ghost" onClick={onBack}>
                  {t.setupBack}
                </button>
              </>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={selectedCount === 0 || busyAction === 'setup'}
              onClick={handleInstall}
            >
              <span>
                {busyAction === 'setup'
                  ? t.setupWorking
                  : isReconfigure
                    ? t.setupUpdateCta
                    : t.setupInstallCta}
              </span>
              <ArrowRight size={15} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
