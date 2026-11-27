import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SegmentedControl from './ui/SegmentedControl.jsx';
import FxPreviewCanvas from './FxPreviewCanvas.jsx';
import { hexToRgb, PREVIEW_SURFACES } from '../utils/color.js';

export default function PreviewCanvas({
  t,
  config,
  systemDark = true,
  activeWallpaper,
  builtInWallpapers = [],
  wallpapers = [],
  previewMode,
  visibleModes = ['ide', 'app', 'cli'],
  onChangeMode,
}) {
  const [collapsed, setCollapsed] = useState(false);

  const mode =
    config.colorMode === 'auto'
      ? (systemDark ? 'dark' : 'light')
      : (config.colorMode === 'light' ? 'light' : 'dark');
  const tint = PREVIEW_SURFACES[mode][config.surfaceTint] ? config.surfaceTint : 'graphite';
  const ramp = PREVIEW_SURFACES[mode][tint];
  const accent = config.accentColor || '#3b82f6';
  const accentRgb = hexToRgb(accent);
  const hasWallpaper = Boolean(config.enabled && config.wallpaperEnabled && activeWallpaper?.mediaUrl);

  const sidebarAlpha = hasWallpaper ? (config.sidebarOpacity ?? 78) / 100 : 1;
  const editorAlpha = hasWallpaper ? (config.editorOpacity ?? 84) / 100 : 1;
  const chatAlpha = hasWallpaper ? (config.chatOpacity ?? 76) / 100 : 1;
  const dimAlpha = (config.dimming ?? 32) / 100;
  const blurPx = config.wallpaperBlur || 0;
  const radius = config.cornerRadius ?? 10;
  const isKenBurns = config.enabled && config.animationPreset === 'ken-burns';

  const hairline =
    config.borderStyle === 'none'
      ? 'transparent'
      : config.borderStyle === 'accent'
        ? `rgba(${accentRgb}, 0.35)`
        : mode === 'light'
          ? 'rgba(23, 23, 23, 0.09)'
          : 'rgba(237, 237, 237, 0.08)';

  const surfaceBg = (a) => (config.enabled ? `rgba(${ramp.rgb}, ${a.toFixed(2)})` : '#141415');
  const fgPrimary = config.enabled ? ramp.text : '#ededed';
  const fgMuted = config.enabled ? ramp.muted : '#85858b';
  const cli = config.cli || {};
  const cliBgUrl = (() => {
    if (!cli.terminalBgImage) return '';
    const low = cli.terminalBgImage.toLowerCase();
    const match = [...wallpapers, ...builtInWallpapers].find(
      (w) => w.filePath && w.filePath.toLowerCase() === low
    );
    return match ? match.posterUrl || match.mediaUrl : '';
  })();

  const modeLabels = { ide: 'IDE', app: 'Antigravity App', cli: 'CLI (agy)' };
  const safeModes = visibleModes.length ? visibleModes : ['ide', 'app', 'cli'];
  const activeMode = safeModes.includes(previewMode) ? previewMode : safeModes[0];

  return (
    <section className="preview-frame">
      <div className="preview-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            {t.livePreview} {safeModes.length === 1 ? `· ${modeLabels[activeMode]}` : ''}
          </span>
          {activeWallpaper && config.wallpaperEnabled && (
            <span className="surface-tag">{activeWallpaper.name}</span>
          )}
        </div>

        <div className="header-actions">
          {!collapsed && safeModes.length > 1 && (
            <SegmentedControl
              value={activeMode}
              onChange={onChangeMode}
              options={safeModes.map((id) => ({ id, label: modeLabels[id] }))}
            />
          )}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ height: 26, padding: '0 8px' }}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            <span>{collapsed ? t.showPreview : t.hidePreview}</span>
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="preview-viewport compact">
          {activeMode !== 'cli' && (
            <>
              <div className="preview-bg">
                {hasWallpaper ? (
                  activeWallpaper.mediaType === 'video' ? (
                    <video
                      key={activeWallpaper.mediaUrl}
                      src={activeWallpaper.mediaUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: config.videoFit === 'contain' ? 'contain' : 'cover',
                        filter: blurPx > 0 ? `blur(${blurPx}px)` : 'none',
                      }}
                    />
                  ) : (
                    <img
                      src={activeWallpaper.mediaUrl}
                      alt=""
                      className={isKenBurns ? 'preview-ken-burns' : ''}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: config.videoFit === 'contain' ? 'contain' : 'cover',
                        filter: blurPx > 0 ? `blur(${blurPx}px)` : 'none',
                      }}
                    />
                  )
                ) : (
                  <div style={{ width: '100%', height: '100%', backgroundColor: config.enabled ? ramp.bg : '#141415' }} />
                )}
              </div>
              {hasWallpaper && (
                <div
                  className="preview-scrim"
                  style={{ backgroundColor: `rgba(${ramp.rgb}, ${dimAlpha.toFixed(2)})` }}
                />
              )}
              {config.enabled && (
                <FxPreviewCanvas
                  preset={config.animationPreset}
                  accentRgb={accentRgb}
                  speed={config.animationSpeed ?? 1}
                  intensity={config.animationIntensity ?? 100}
                />
              )}
            </>
          )}

          <div
            className="preview-content"
            style={{
              color: fgPrimary,
              backgroundColor: activeMode === 'cli' ? ramp.bg : undefined,
              zIndex: 3,
            }}
          >
            {/* Top titlebar */}
            <div
              style={{
                height: 26,
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: surfaceBg(sidebarAlpha),
                borderBottom: `1px solid ${hairline}`,
                fontSize: 11,
              }}
            >
              <div style={{ display: 'flex', gap: 10, color: fgMuted }}>
                {activeMode === 'cli' ? (
                  <span className="mono">Antigravity CLI — agy</span>
                ) : (
                  <>
                    <span>File</span>
                    <span>Edit</span>
                    <span>View</span>
                  </>
                )}
              </div>
              <span className="mono" style={{ fontSize: 11, color: fgMuted }}>
                {activeMode === 'ide'
                  ? 'theme.json — antigravity'
                  : activeMode === 'app'
                    ? 'Antigravity App'
                    : `${cli.terminalFontFace || 'JetBrainsMono Nerd Font'} · ${cli.terminalFontSize || 11}pt`}
              </span>
              <span className="mono" style={{ fontSize: 11, color: accent }}>
                {config.accentColor}
              </span>
            </div>

            {activeMode === 'ide' && (
              <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <div
                  style={{
                    width: 32,
                    backgroundColor: surfaceBg(sidebarAlpha),
                    borderRight: `1px solid ${hairline}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingTop: 8,
                    gap: 10,
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        backgroundColor: i === 0 ? accent : fgMuted,
                        opacity: i === 0 ? 0.95 : 0.35,
                      }}
                    />
                  ))}
                </div>

                <div
                  style={{
                    width: 146,
                    padding: '8px 10px',
                    backgroundColor: surfaceBg(sidebarAlpha),
                    borderRight: `1px solid ${hairline}`,
                    fontSize: 11,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                  }}
                >
                  <div style={{ color: fgMuted }}>Explorer</div>
                  <div style={{ color: fgPrimary }}>rainy-window/</div>
                  <div style={{ paddingLeft: 8, color: fgMuted }}>shared.css</div>
                  <div style={{ paddingLeft: 8, color: fgMuted }}>backdrop.jpg</div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div
                    style={{
                      height: 28,
                      padding: '0 8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: surfaceBg(sidebarAlpha),
                      borderBottom: `1px solid ${hairline}`,
                      fontSize: 11,
                    }}
                  >
                    <div
                      style={{
                        height: 28,
                        padding: '0 10px',
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: config.tabsStyle === 'default' ? surfaceBg(editorAlpha) : 'transparent',
                        borderBottom: config.tabsStyle === 'underline' ? `2px solid ${accent}` : undefined,
                        borderTop: config.tabsStyle === 'minimal' ? `2px solid ${accent}` : undefined,
                        color: fgPrimary,
                      }}
                    >
                      shared.css
                    </div>
                    <div style={{ padding: '0 8px', color: fgMuted }}>app.css</div>
                  </div>

                  <div
                    className="mono"
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      fontSize: 11,
                      lineHeight: 1.6,
                      backgroundColor: surfaceBg(editorAlpha),
                    }}
                  >
                    <div>
                      <span style={{ color: accent }}>:root</span> {'{'}
                    </div>
                    <div style={{ paddingLeft: 14 }}>
                      --ag-accent: <span style={{ color: accent }}>{accent}</span>;
                    </div>
                    <div style={{ paddingLeft: 14 }}>--ag-radius: {radius}px;</div>
                    <div style={{ paddingLeft: 14 }}>--ag-fx: {config.animationPreset || 'none'};</div>
                    <div>{'}'}</div>
                  </div>
                </div>
              </div>
            )}

            {activeMode === 'app' && (
              <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <div
                  style={{
                    width: 140,
                    padding: 10,
                    backgroundColor: surfaceBg(sidebarAlpha),
                    borderRight: `1px solid ${hairline}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    fontSize: 11,
                  }}
                >
                  <div style={{ color: fgMuted }}>Conversations</div>
                  <div
                    style={{
                      padding: '5px 8px',
                      borderRadius: Math.max(4, radius - 2),
                      backgroundColor: `rgba(${accentRgb}, 0.15)`,
                      color: fgPrimary,
                    }}
                  >
                    Theme Preview
                  </div>
                  <div style={{ padding: '5px 8px', color: fgMuted }}>CLI profile</div>
                </div>

                <div
                  style={{
                    flex: 1,
                    padding: 12,
                    backgroundColor: surfaceBg(chatAlpha),
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ alignSelf: 'flex-end', maxWidth: '75%' }}>
                      <div
                        style={{
                          padding: '6px 10px',
                          borderRadius: radius,
                          border: `1px solid rgba(${accentRgb}, 0.35)`,
                          backgroundColor: `rgba(${accentRgb}, 0.14)`,
                          fontSize: 11,
                        }}
                      >
                        Apply anime backdrop & sakura petals
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '6px 10px',
                        borderRadius: radius,
                        border: `1px solid ${hairline}`,
                        backgroundColor: surfaceBg(Math.min(1, chatAlpha + 0.08)),
                        fontSize: 11,
                        maxWidth: '85%',
                      }}
                    >
                      Live CSS & backdrop active across sidebar, chat, and side panel.
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '6px 10px',
                      borderRadius: radius,
                      border: `1px solid ${hairline}`,
                      backgroundColor: surfaceBg(Math.min(1, chatAlpha + 0.1)),
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: fgMuted,
                    }}
                  >
                    <span>Ask anything...</span>
                    <span style={{ color: accent, fontWeight: 500 }}>Send</span>
                  </div>
                </div>
              </div>
            )}

            {activeMode === 'cli' && (
              <div
                className="mono"
                style={{
                  position: 'relative',
                  flex: 1,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  lineHeight: 1.6,
                  overflow: 'hidden',
                }}
              >
                {cliBgUrl && (
                  <img
                    src={cliBgUrl}
                    alt=""
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: Number(cli.terminalBgOpacity ?? 0.3),
                      pointerEvents: 'none',
                    }}
                  />
                )}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ color: fgMuted }}>$ agy</div>
                  <div>
                    <span style={{ color: accent }}>antigravity-cli</span>{' '}
                    <span style={{ color: fgMuted }}>scheme={cli.colorScheme || 'terminal'}</span>
                  </div>
                  <div style={{ marginTop: 4, color: '#4cc38a' }}>
                    ✓ Ready with custom ANSI palette{cliBgUrl ? ' & terminal wallpaper' : ''}
                  </div>
                </div>
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    paddingTop: 6,
                    borderTop: `1px solid ${hairline}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ backgroundColor: accent, color: '#0f0f10', padding: '1px 7px', borderRadius: 3 }}>
                    Antigravity
                  </span>
                  <span style={{ backgroundColor: 'rgba(237,237,237,0.08)', color: fgPrimary, padding: '1px 7px', borderRadius: 3 }}>
                    workspace{cli.statusLineShowBranch !== false ? ' (main)' : ''}
                  </span>
                  {cli.statusLineShowContextBar !== false ? (
                    <span>
                      <span style={{ color: accent }}>██</span>
                      <span style={{ color: fgMuted }}>░░░░░░ 24%</span>
                    </span>
                  ) : (
                    <span style={{ color: fgMuted }}>ctx 24%</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
