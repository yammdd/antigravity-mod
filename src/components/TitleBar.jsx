import React from 'react';
import { Minus, Power, RefreshCw, Square, X } from 'lucide-react';
import appLogo from '../assets/logo.png';

export default function TitleBar({
  t,
  cdpStatus,
  enabled,
  busyAction,
  isSetupMode = false,
  showDesktopControls = true,
  onApplyNow,
  onDisableTheme,
}) {
  const connected = Boolean(cdpStatus?.connected);
  const totalTargets =
    (cdpStatus?.ideCount || 0) + (cdpStatus?.ideChatCount || 0) + (cdpStatus?.appCount || 0);

  return (
    <header className="titlebar">
      <div className="titlebar-brand">
        <img className="brand-logo" src={appLogo} alt="" width={24} height={24} />
        <span className="brand-name">{t.brand}</span>
      </div>

      <div className="titlebar-right">
        {!isSetupMode && showDesktopControls && (
          <>
            <div className="cdp-indicator">
              <span className={`cdp-dot ${connected ? 'connected' : ''}`} />
              <span>{connected ? `${t.attached} (${totalTargets})` : t.notAttached}</span>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              disabled={busyAction === 'apply'}
              onClick={onApplyNow}
            >
              <RefreshCw size={15} strokeWidth={1.5} />
              <span>{busyAction === 'apply' ? t.applying : t.apply}</span>
            </button>

            <button
              type="button"
              className={enabled ? 'btn btn-ghost' : 'btn btn-danger'}
              onClick={enabled ? onDisableTheme : onApplyNow}
            >
              <Power size={15} strokeWidth={1.5} />
              <span>{enabled ? t.disable : t.disabled}</span>
            </button>
          </>
        )}

        <div className="win-controls">
          <button
            type="button"
            className="win-btn"
            onClick={() => window.themeAPI?.minimize()}
            aria-label="Minimize"
          >
            <Minus size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="win-btn"
            onClick={() => window.themeAPI?.maximize()}
            aria-label="Maximize"
          >
            <Square size={12} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="win-btn close"
            onClick={() => window.themeAPI?.close()}
            aria-label="Close"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
