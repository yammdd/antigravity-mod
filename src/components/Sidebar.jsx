import React from 'react';
import {
  Code2,
  Compass,
  Image,
  LayoutGrid,
  Settings,
  SlidersHorizontal,
  Terminal,
} from 'lucide-react';

export default function Sidebar({
  t,
  activeTab,
  onSelectTab,
  onOpenSetup,
  enabledCount,
  config,
  cdpStatus,
  cliStatus,
}) {
  const showIde = config?.applyToIde !== false;
  const showApp = config?.applyToApp !== false;
  const showDesktop = showIde || showApp;
  const showCli = Boolean(config?.cli?.enabled);

  const primaryItems = [];
  if (showDesktop) {
    primaryItems.push(
      { id: 'themes', label: t.navThemes, icon: LayoutGrid, badge: enabledCount },
      { id: 'wallpapers', label: t.navWallpapers, icon: Image },
      { id: 'studio', label: t.navAppearance, icon: SlidersHorizontal }
    );
  }
  if (showCli) {
    primaryItems.push({ id: 'cli', label: t.navCli, icon: Terminal });
  }

  const advancedItems = [];
  if (showDesktop) {
    advancedItems.push({ id: 'quickcss', label: t.navQuickCss, icon: Code2 });
  }
  advancedItems.push({ id: 'settings', label: t.navSettings, icon: Settings });

  return (
    <aside className="sidebar">
      <nav className="nav-group" aria-label="Primary">
        <div className="nav-section-label">{t.secCustomize}</div>
        {primaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onSelectTab(item.id)}
            >
              <Icon size={16} strokeWidth={1.5} />
              <span>{item.label}</span>
              {item.badge > 0 && <span className="nav-count mono">{item.badge}</span>}
            </button>
          );
        })}

        <div className="nav-section-label" style={{ marginTop: 14 }}>
          {t.secAdvanced}
        </div>
        {advancedItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onSelectTab(item.id)}
            >
              <Icon size={16} strokeWidth={1.5} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-meta">
        {showIde && (
          <div className="meta-row">
            <span>IDE</span>
            <span className={`meta-value mono ${cdpStatus?.ideConnected ? 'active' : ''}`}>
              {cdpStatus?.ideConnected ? t.statusAttached : t.statusIdle}
            </span>
          </div>
        )}
        {showApp && (
          <div className="meta-row">
            <span>App</span>
            <span className={`meta-value mono ${cdpStatus?.appConnected ? 'active' : ''}`}>
              {cdpStatus?.appConnected ? t.statusAttached : t.statusIdle}
            </span>
          </div>
        )}
        {showCli && (
          <div className="meta-row">
            <span>CLI</span>
            <span className={`meta-value mono ${cliStatus?.settingsExists || cliStatus?.wtProfileInstalled ? 'active' : ''}`}>
              {config?.cli?.presetId && config.cli.presetId !== 'custom'
                ? config.cli.presetId
                : cliStatus?.settingsExists
                  ? cliStatus.currentColorScheme
                  : t.statusReady}
            </span>
          </div>
        )}

        <button type="button" className="btn sidebar-setup-btn" onClick={onOpenSetup}>
          <Compass size={14} strokeWidth={1.5} />
          <span>{t.changeTargets}</span>
        </button>
      </div>
    </aside>
  );
}
