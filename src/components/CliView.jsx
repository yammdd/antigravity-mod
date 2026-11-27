import React, { useMemo, useState } from 'react';
import {
  Activity,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FlaskConical,
  HardDriveDownload,
  History,
  ImagePlus,
  Palette,
  Play,
  RotateCcw,
  Terminal,
  Upload,
  X,
} from 'lucide-react';
import SliderField from './ui/SliderField.jsx';
import ToggleRow from './ui/ToggleRow.jsx';
import SegmentedControl from './ui/SegmentedControl.jsx';
import {
  CLI_ALT_SCREEN_MODES,
  CLI_BG_ALIGNMENTS,
  CLI_BG_STRETCH_MODES,
  CLI_COLOR_SCHEMES,
  CLI_CURSOR_SHAPES,
  CLI_FONT_SUGGESTIONS,
  CLI_PALETTE_FIELDS,
  CLI_PREFIX_SYMBOLS,
  CLI_SHADER_OPTIONS,
  CLI_SPINNER_SPEEDS,
  CLI_STATUSLINE_PRESETS,
} from '../constants/presets.js';

const FALLBACK_PALETTE = {
  background: '#1a1b26',
  foreground: '#c0caf5',
  cursorColor: '#7aa2f7',
  black: '#15161e',
  red: '#f7768e',
  green: '#9ece6a',
  yellow: '#e0af68',
  blue: '#7aa2f7',
  purple: '#bb9af7',
  cyan: '#7dcfff',
  white: '#a9b1d6',
  brightBlack: '#414868',
};

const BG_POSITION_MAP = {
  center: 'center center',
  right: 'right center',
  bottomRight: 'right bottom',
  topRight: 'right top',
};

const BG_FIT_MAP = {
  uniformToFill: 'cover',
  uniform: 'contain',
  none: 'none',
};

function AgyPixelLogo() {
  // Compact 7x7 Antigravity CLI pixel arch inspired by the real agy startup banner
  const pixels = [
    [3, 0, '#fb923c'],
    [2, 1, '#f59e0b'], [3, 1, '#f97316'], [4, 1, '#f43f5e'],
    [2, 2, '#a3e635'], [3, 2, '#facc15'], [4, 2, '#ec4899'],
    [1, 3, '#4ade80'], [2, 3, '#38bdf8'], [4, 3, '#a855f7'], [5, 3, '#c084fc'],
    [1, 4, '#2dd4bf'], [2, 4, '#38bdf8'], [3, 4, '#818cf8'], [4, 4, '#8b5cf6'], [5, 4, '#6366f1'],
    [0, 5, '#38bdf8'], [1, 5, '#22d3ee'], [5, 5, '#6366f1'], [6, 5, '#3b82f6'],
    [0, 6, '#38bdf8'], [1, 6, '#60a5fa'], [5, 6, '#3b82f6'], [6, 6, '#2563eb'],
  ];
  return (
    <svg width="42" height="42" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true">
      {pixels.map(([x, y, fill], i) => (
        <rect key={i} x={x} y={y} width="1" height="1" fill={fill} />
      ))}
    </svg>
  );
}

export default function CliView({
  t,
  config,
  systemDark = true,
  cliStatus,
  cliActivePresetId = '',
  cliPresets = [],
  cliBgMediaUrl = '',
  builtInWallpapers = [],
  wallpapers = [],
  terminalSnippets,
  busyAction,
  onPatchConfig,
  onApplyCliPreset,
  onApplyCli,
  onTestCliStatusLine,
  onRunDiagnostics,
  onResetCli,
  onSyncWindowsTerminal,
  onRestoreWindowsTerminal,
  onLaunchCliTerminal,
  onPickCliBgImage,
  onSyncExternalTerminal,
  onExportCliPreset,
  onImportCliPreset,
  onShowToast,
}) {
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [showPaletteEditor, setShowPaletteEditor] = useState(false);
  const [hoveredBgId, setHoveredBgId] = useState('');
  const [pairWallpaper, setPairWallpaper] = useState(false);
  const [termTab, setTermTab] = useState('ghostty');
  const [copied, setCopied] = useState(false);
  const [syncingExt, setSyncingExt] = useState(false);
  const [testingSl, setTestingSl] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [runningDiag, setRunningDiag] = useState(false);
  const [cliDiag, setCliDiag] = useState(null);

  const cli = config.cli || {};
  const activePresetId =
    cliActivePresetId ||
    (cli.autoFollowOs
      ? (systemDark ? (cli.darkPresetId || 'catppuccin-mocha') : (cli.lightPresetId || 'github-light'))
      : (cli.presetId || 'tokyo-night'));
  const activePreset = useMemo(
    () => cliPresets.find((p) => p.id === activePresetId) || null,
    [cliPresets, activePresetId]
  );
  const palette = terminalSnippets?.palette || activePreset?.palette || FALLBACK_PALETTE;
  const accentHex = activePreset?.accent || palette.blue || '#7aa2f7';
  const isLightTerm = activePreset?.mode === 'light';

  const patchCli = (patch, immediate = true) => onPatchConfig({ cli: patch }, immediate);

  // Built-in + user image & animated GIF choices for terminal backgrounds (animated GIFs first!)
  const cliBgChoices = useMemo(() => {
    const out = [];
    for (const w of wallpapers || []) {
      if (w.mediaType === 'image' && w.filePath) {
        const isGif = Boolean(w.isGif || /\.gif$/i.test(w.filePath));
        out.push({
          id: w.id,
          name: w.name,
          thumb: w.mediaUrl,
          liveUrl: w.mediaUrl,
          filePath: w.filePath,
          isGif,
        });
      }
    }
    for (const w of builtInWallpapers || []) {
      const targetPath = w.cliBgFilePath || (w.mediaType === 'image' ? w.filePath : (w.posterFilePath || ''));
      if (targetPath) {
        const isGif = Boolean(w.cliBgIsGif || w.isGif || /\.gif$/i.test(targetPath));
        out.push({
          id: w.id,
          name: w.name,
          thumb: w.posterUrl || w.mediaUrl,
          liveUrl: w.cliBgUrl || w.mediaUrl,
          filePath: targetPath,
          isGif,
        });
      }
    }
    out.sort((a, b) => (a.isGif === b.isGif ? 0 : a.isGif ? -1 : 1));
    return out;
  }, [wallpapers, builtInWallpapers]);

  const previewBgUrl = useMemo(() => {
    if (!cli.terminalBgImage) return '';
    const low = cli.terminalBgImage.toLowerCase();
    const match = cliBgChoices.find((c) => c.filePath && c.filePath.toLowerCase() === low);
    if (match?.liveUrl) return match.liveUrl;
    return cliBgMediaUrl || '';
  }, [cliBgMediaUrl, cli.terminalBgImage, cliBgChoices]);

  const snippetText =
    termTab === 'wezterm'
      ? terminalSnippets?.wezterm || ''
      : termTab === 'kitty'
        ? terminalSnippets?.kitty || ''
        : termTab === 'alacritty'
          ? terminalSnippets?.alacritty || ''
          : terminalSnippets?.ghostty || '';

  const handleCopySnippet = async () => {
    if (!snippetText) return;
    try {
      await navigator.clipboard.writeText(snippetText);
      setCopied(true);
      onShowToast(`Copied ${termTab} config snippet`);
      setTimeout(() => setCopied(false), 1800);
    } catch (_) {}
  };

  const handlePickBuiltInBg = (filePath) => {
    patchCli({ terminalBgImage: filePath }, true);
  };

  const handleTestStatusLine = async () => {
    setTestingSl(true);
    try {
      const res = await onTestCliStatusLine();
      setTestResult(res);
    } finally {
      setTestingSl(false);
    }
  };

  const handleRunCliDiag = async () => {
    if (!onRunDiagnostics) return;
    setRunningDiag(true);
    try {
      const res = await onRunDiagnostics();
      setCliDiag(res?.cli || null);
    } finally {
      setRunningDiag(false);
    }
  };

  const handleSyncExternal = async () => {
    if (!onSyncExternalTerminal) return;
    setSyncingExt(true);
    try {
      await onSyncExternalTerminal(termTab);
    } finally {
      setSyncingExt(false);
    }
  };

  const handleCustomColorChange = (key, hex) => {
    const base = { ...palette };
    delete base.name;
    patchCli(
      {
        presetId: 'custom',
        customPalette: { ...base, [key]: hex },
      },
      false
    );
  };

  // Render simulated live status bar inside the terminal preview
  const renderLiveStatusLine = () => {
    if (!cli.statusLineEnabled) {
      return (
        <div className="cli-live-status-default" style={{ color: palette.brightBlack }}>
          <span>? for shortcuts</span>
          <span>
            <span style={{ color: palette.yellow }}>auto</span> · Gemini 4 Neon · xhigh
          </span>
        </div>
      );
    }

    const showModel = cli.statusLineShowModel !== false;
    const showFolder = cli.statusLineShowFolder !== false;
    const showBranch = cli.statusLineShowBranch !== false;
    const showBar = cli.statusLineShowContextBar !== false;
    const showClock = Boolean(cli.statusLineShowClock);
    const prefix = cli.statusLinePrefix ?? '◆';
    const preset = cli.statusLinePreset || 'powerline';

    const modelText = `${prefix ? `${prefix} ` : ''}Gemini 4 Neon`;
    const locText = `${showFolder ? 'antigravity-mod' : ''}${
      showBranch ? (showFolder ? ' (main)' : 'main') : ''
    }`;
    const ctxEl = showBar ? (
      <span>
        <span style={{ color: accentHex }}>██</span>
        <span style={{ color: palette.brightBlack }}>░░░░░░ 28%</span>
      </span>
    ) : (
      <span style={{ color: accentHex }}>ctx 28%</span>
    );
    const clockEl = showClock ? <span style={{ color: palette.brightBlack }}>21:30</span> : null;

    if (preset === 'powerline') {
      return (
        <div className="cli-live-status-row">
          {showModel && (
            <span
              className="cli-pl-pill"
              style={{ backgroundColor: accentHex, color: isLightTerm ? '#ffffff' : '#0f0f12' }}
            >
              {modelText}
            </span>
          )}
          {locText && (
            <span
              className="cli-pl-pill"
              style={{
                backgroundColor: isLightTerm ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.09)',
                color: palette.foreground,
              }}
            >
              {locText}
            </span>
          )}
          {ctxEl}
          {clockEl}
        </div>
      );
    }

    if (preset === 'badges') {
      return (
        <div className="cli-live-status-row" style={{ gap: 10 }}>
          {showModel && <span style={{ color: accentHex }}>[{modelText}]</span>}
          {locText && <span style={{ color: palette.foreground }}>[{locText}]</span>}
          {ctxEl}
          {clockEl}
        </div>
      );
    }

    if (preset === 'bordered') {
      const items = [];
      if (showModel) items.push(<span key="m" style={{ color: accentHex }}>{modelText}</span>);
      if (showFolder) items.push(<span key="f" style={{ color: palette.foreground }}>antigravity-mod</span>);
      if (showBranch) items.push(<span key="b" style={{ color: palette.brightBlack }}>main</span>);
      items.push(<span key="c">{ctxEl}</span>);
      if (clockEl) items.push(<span key="t">{clockEl}</span>);
      return (
        <div className="cli-live-status-row" style={{ gap: 6 }}>
          <span style={{ color: palette.brightBlack }}>[</span>
          {items.map((el, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: palette.brightBlack }}>|</span>}
              {el}
            </React.Fragment>
          ))}
          <span style={{ color: palette.brightBlack }}>]</span>
        </div>
      );
    }

    if (preset === 'compact-mono') {
      return (
        <div className="cli-live-status-row" style={{ gap: 10 }}>
          {showModel && <span style={{ color: accentHex }}>{modelText}</span>}
          {showFolder && <span style={{ color: palette.brightBlack }}>antigravity-mod</span>}
          {showBranch && <span style={{ color: palette.brightBlack }}>@main</span>}
          {ctxEl}
          {clockEl}
        </div>
      );
    }

    // minimal
    const segs = [];
    if (showFolder) segs.push(<span key="f" style={{ color: palette.foreground }}>antigravity-mod</span>);
    if (showModel) segs.push(<span key="m" style={{ color: accentHex }}>{modelText}</span>);
    if (showBranch) segs.push(<span key="b" style={{ color: palette.brightBlack }}>main</span>);
    segs.push(<span key="c">{ctxEl}</span>);
    if (clockEl) segs.push(<span key="t">{clockEl}</span>);
    return (
      <div className="cli-live-status-row" style={{ gap: 6 }}>
        {segs.map((el, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ color: palette.brightBlack }}>·</span>}
            {el}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderCursor = () => {
    const shape = cli.terminalCursorShape || 'bar';
    if (shape === 'filledBox') {
      return (
        <span
          className="cli-cursor-block"
          style={{ backgroundColor: palette.cursorColor, color: palette.background }}
        >
          &nbsp;
        </span>
      );
    }
    if (shape === 'emptyBox') {
      return (
        <span
          className="cli-cursor-outline"
          style={{ borderColor: palette.cursorColor }}
        >
          &nbsp;
        </span>
      );
    }
    if (shape === 'underscore' || shape === 'vintage') {
      return (
        <span
          className="cli-cursor-underline"
          style={{ borderBottomColor: palette.cursorColor }}
        >
          &nbsp;
        </span>
      );
    }
    return <span className="cli-cursor-bar" style={{ backgroundColor: palette.cursorColor }} />;
  };

  const ansiPreviewSwatches = [
    palette.red,
    palette.green,
    palette.yellow,
    palette.blue,
    palette.purple,
    palette.cyan,
  ];

  const currentBgName = useMemo(() => {
    if (!cli.terminalBgImage) return '';
    const parts = cli.terminalBgImage.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || '';
  }, [cli.terminalBgImage]);

  const moduleToggles = [
    { key: 'statusLineShowModel', label: 'Model', checked: cli.statusLineShowModel !== false },
    { key: 'statusLineShowFolder', label: 'Folder', checked: cli.statusLineShowFolder !== false },
    { key: 'statusLineShowBranch', label: 'Git branch', checked: cli.statusLineShowBranch !== false },
    { key: 'statusLineShowContextBar', label: 'Context bar', checked: cli.statusLineShowContextBar !== false },
    { key: 'statusLineShowClock', label: 'Clock', checked: Boolean(cli.statusLineShowClock) },
  ];

  return (
    <div className="stack-md">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.cliTitle}</h1>
          <p className="page-subtitle">
            {t.cliSub} Windows Terminal reloads live; restart <span className="mono">agy</span> after status bar changes.
          </p>
        </div>

        <div className="header-actions" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={runningDiag}
            onClick={handleRunCliDiag}
          >
            <Activity size={15} strokeWidth={1.5} />
            <span>{runningDiag ? 'Checking...' : 'CLI Diagnostics'}</span>
          </button>
          <button type="button" className="btn btn-ghost" onClick={onResetCli}>
            <RotateCcw size={15} strokeWidth={1.5} />
            <span>{t.cliRestore}</span>
          </button>
          <button type="button" className="btn" onClick={onApplyCli}>
            <Terminal size={15} strokeWidth={1.5} />
            <span>{t.cliApply}</span>
          </button>
          {cliStatus?.windowsTerminalDetected && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busyAction === 'launch-cli'}
              onClick={onLaunchCliTerminal}
            >
              <Play size={14} strokeWidth={1.5} />
              <span>{busyAction === 'launch-cli' ? 'Launching...' : 'Launch agy Terminal'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Dedicated Standalone Live agy Terminal Preview */}
      <section className="preview-frame">
        <div className="preview-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
              Live agy Terminal
            </span>
            <span className="surface-tag">
              {activePreset ? activePreset.name : 'Custom palette'}
            </span>
            <div className="cli-ansi-dots" aria-label="Active ANSI colors">
              {ansiPreviewSwatches.map((hex, i) => (
                <span key={i} className="cli-ansi-dot" style={{ backgroundColor: hex }} title={hex} />
              ))}
            </div>
          </div>

          <div className="header-actions">
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {cli.terminalFontFace || 'JetBrainsMono Nerd Font'} · {cli.terminalFontSize ?? 11}pt
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ height: 26, padding: '0 8px' }}
              onClick={() => setPreviewCollapsed((v) => !v)}
            >
              {previewCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              <span>{previewCollapsed ? t.showPreview : t.hidePreview}</span>
            </button>
          </div>
        </div>

        {!previewCollapsed && (
          <div
            className="cli-live-window mono"
            style={{
              backgroundColor: palette.background,
              color: palette.foreground,
            }}
          >
            {previewBgUrl && (
              <img
                key={previewBgUrl}
                src={previewBgUrl}
                alt=""
                className="cli-live-bg"
                style={{
                  opacity: Number(cli.terminalBgOpacity ?? 0.3),
                  objectFit: BG_FIT_MAP[cli.terminalBgStretch] || 'cover',
                  objectPosition: BG_POSITION_MAP[cli.terminalBgAlignment] || 'center center',
                }}
              />
            )}

            {/* Simulated Windows Terminal tab strip */}
            <div
              className="cli-live-tabbar"
              style={{
                borderBottomColor: isLightTerm ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
                backgroundColor: isLightTerm ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.28)',
              }}
            >
              <span
                className="cli-live-tab"
                style={{
                  backgroundColor: palette.background,
                  color: palette.foreground,
                  borderColor: isLightTerm ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
                }}
              >
                <Terminal size={11} strokeWidth={1.6} style={{ color: accentHex }} />
                <span>Antigravity CLI — agy</span>
              </span>
              <span style={{ fontSize: 10, color: palette.brightBlack, marginLeft: 'auto' }}>
                opacity {cli.terminalOpacity ?? 88}%
                {cli.terminalAcrylic !== false ? ' · acrylic' : ''}
                {cli.terminalRetroEffect ? ' · CRT' : ''}
              </span>
            </div>

            {/* Simulated agy TUI body */}
            <div
              className="cli-live-body"
              style={{
                padding: `${Math.min(20, Math.max(10, Math.round((cli.terminalPadding ?? 12) * 0.9)))}px ${Math.min(24, Math.max(12, cli.terminalPadding ?? 12))}px`,
              }}
            >
              <div className="cli-live-banner">
                <AgyPixelLogo />
                <div className="cli-live-banner-meta">
                  <div style={{ color: palette.blue, fontWeight: 600 }}>Antigravity CLI 1.5</div>
                  <div style={{ color: palette.brightBlack }}>~/projects/antigravity-mod</div>
                  <div style={{ color: palette.green, fontSize: 11 }}>
                    ● scheme={cli.colorScheme || 'terminal'} · spinner={cli.runningLightSpeed || 'medium'}
                  </div>
                </div>
              </div>

              <div
                className="cli-live-prompt"
                style={{
                  borderTopColor: isLightTerm ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)',
                  borderBottomColor: isLightTerm ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)',
                }}
              >
                <span style={{ color: accentHex, fontWeight: 600 }}>&gt;</span>
                <span>Ask Antigravity to refactor, review, or run tests</span>
                {renderCursor()}
              </div>

              <div style={{ paddingTop: (cli.statusLinePadding ?? 0) * 4 }}>
                {renderLiveStatusLine()}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* CLI Diagnostics Report (on demand) */}
      {cliDiag && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">agy CLI Health Check</div>
              <div className="card-desc">
                {cliDiag.summary} · Active preset: <span className="mono">{cliDiag.activePresetId}</span>
                {cliDiag.autoFollowOs ? ` (Auto OS: ${cliDiag.systemDark ? 'Dark' : 'Light'})` : ''}
              </div>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setCliDiag(null)}>
              <X size={14} strokeWidth={1.5} />
              <span>Dismiss</span>
            </button>
          </div>
          <div className="diag-list">
            {(cliDiag.checks || []).map((c) => (
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

      {/* Section 1: Standalone CLI Color Presets (Zero IDE Dependency) */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Standalone Color Presets</div>
            <div className="card-desc">
              Pick a complete 16-color ANSI terminal theme with one click. Works independently of Antigravity IDE or App.
            </div>
          </div>

          <div className="header-actions" style={{ flexWrap: 'wrap' }}>
            <label className="setup-checkbox" style={{ whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={pairWallpaper}
                onChange={(e) => setPairWallpaper(e.target.checked)}
              />
              <span>Pair wallpaper</span>
            </label>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowPaletteEditor((v) => !v)}
            >
              <Palette size={14} strokeWidth={1.5} />
              <span>{showPaletteEditor ? 'Hide ANSI editor' : 'Customize ANSI'}</span>
            </button>
            <button type="button" className="btn btn-ghost" onClick={onImportCliPreset} title="Import CLI preset (.json)">
              <Upload size={14} strokeWidth={1.5} />
              <span>Import JSON</span>
            </button>
            <button type="button" className="btn btn-ghost" onClick={onExportCliPreset} title="Export active CLI preset (.json)">
              <Download size={14} strokeWidth={1.5} />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

          <div className="cli-preset-grid">
          {cliPresets.map((preset) => {
            const selected = activePresetId === preset.id;
            const p = preset.palette;
            const swatches = [p.red, p.green, p.yellow, p.blue, p.purple, p.cyan];
            return (
              <button
                key={preset.id}
                type="button"
                className={`cli-preset-card ${selected ? 'selected' : ''}`}
                onClick={() => {
                  if (cli.autoFollowOs) patchCli({ autoFollowOs: false }, true);
                  onApplyCliPreset(preset.id, pairWallpaper);
                }}
              >
                <div
                  className="cli-preset-preview mono"
                  style={{ backgroundColor: p.background, color: p.foreground }}
                >
                  <div className="cli-preset-code">
                    <span style={{ color: p.blue }}>$</span>{' '}
                    <span style={{ color: p.foreground }}>agy</span>{' '}
                    <span style={{ color: p.green }}>--ready</span>
                  </div>
                  <div className="cli-ansi-strip">
                    {swatches.map((hex, i) => (
                      <span key={i} style={{ backgroundColor: hex }} />
                    ))}
                  </div>
                </div>
                <div className="cli-preset-foot">
                  <div className="cli-preset-meta">
                    <span className="cli-preset-name">{preset.name}</span>
                    <span className="cli-preset-mode">{preset.mode}</span>
                  </div>
                  {selected && (
                    <span className="cli-preset-active">
                      <Check size={12} strokeWidth={2.2} />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)' }} className="stack-sm">
          <ToggleRow
            label="Auto-follow OS Dark / Light theme"
            hint={`Automatically switch CLI preset & Windows Terminal colors when your OS changes (OS: ${systemDark ? 'Dark' : 'Light'})`}
            checked={Boolean(cli.autoFollowOs)}
            onChange={(v) => patchCli({ autoFollowOs: v })}
          />
          {cli.autoFollowOs && (
            <div className="grid-2">
              <div className="field">
                <label className="field-head" htmlFor="cli-dark-preset">
                  Dark mode preset
                </label>
                <select
                  id="cli-dark-preset"
                  className="select"
                  value={cli.darkPresetId || 'catppuccin-mocha'}
                  onChange={(e) => patchCli({ darkPresetId: e.target.value })}
                >
                  {cliPresets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.mode})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-head" htmlFor="cli-light-preset">
                  Light mode preset
                </label>
                <select
                  id="cli-light-preset"
                  className="select"
                  value={cli.lightPresetId || 'github-light'}
                  onChange={(e) => patchCli({ lightPresetId: e.target.value })}
                >
                  {cliPresets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.mode})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {showPaletteEditor && (
          <div className="cli-palette-drawer">
            <div className="card-header" style={{ alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  Custom 16-Color ANSI Palette {activePresetId === 'custom' ? '(Custom active)' : ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Editing any swatch forks the active preset into a custom CLI palette.
                </div>
              </div>
            </div>
            <div className="cli-palette-grid">
              {CLI_PALETTE_FIELDS.map((field) => {
                const val = palette[field.key] || '#3b82f6';
                return (
                  <label key={field.key} className="cli-color-cell">
                    <input
                      type="color"
                      value={val}
                      onChange={(e) => handleCustomColorChange(field.key, e.target.value)}
                    />
                    <span className="cli-color-meta">
                      <span className="cli-color-name">{field.label}</span>
                      <span className="cli-color-hex mono">{val}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Terminal Wallpaper, Animated GIF & Positioning */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Terminal Wallpaper, Animated GIF & Short Video</div>
            <div className="card-desc">
              Pick a built-in animated GIF or artwork below, or browse any local GIF, PNG, JPG, or short MP4/WebM
              (videos automatically convert to a looping GIF for Windows Terminal).
              {currentBgName ? (
                <span className="mono" style={{ marginLeft: 6, color: 'var(--text-primary)' }}>
                  Active: {currentBgName}
                </span>
              ) : null}
            </div>
          </div>

          <div className="header-actions">
            {cli.terminalBgImage && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => handlePickBuiltInBg('')}
              >
                <X size={14} strokeWidth={1.5} />
                <span>Clear</span>
              </button>
            )}
            <button type="button" className="btn" onClick={onPickCliBgImage}>
              <ImagePlus size={15} strokeWidth={1.5} />
              <span>Browse GIF / Video</span>
            </button>
          </div>
        </div>

        {cliBgChoices.length > 0 && (
          <div className="cli-wp-strip">
            {cliBgChoices.map((item) => {
              const selected =
                cli.terminalBgImage &&
                cli.terminalBgImage.toLowerCase() === item.filePath.toLowerCase();
              const animateThumb = item.isGif && (hoveredBgId === item.id || selected);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`cli-wp-thumb ${selected ? 'selected' : ''}`}
                  onMouseEnter={() => item.isGif && setHoveredBgId(item.id)}
                  onMouseLeave={() => item.isGif && setHoveredBgId('')}
                  onClick={() => handlePickBuiltInBg(item.filePath)}
                  title={item.isGif ? `${item.name} (Animated GIF)` : item.name}
                >
                  <img src={animateThumb ? item.liveUrl : item.thumb} alt={item.name} loading="lazy" />
                  {item.isGif && <span className="cli-wp-gif-badge">GIF</span>}
                  <span className="cli-wp-label">{item.name}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="grid-3">
          <SliderField
            label={t.cliTermBgOp}
            value={Math.round((cli.terminalBgOpacity ?? 0.3) * 100)}
            min={5}
            max={100}
            unit="%"
            onChange={(v) => patchCli({ terminalBgOpacity: Number((v / 100).toFixed(2)) }, false)}
          />

          <div className="field">
            <span className="field-head">Fit mode</span>
            <SegmentedControl
              full
              value={cli.terminalBgStretch || 'uniformToFill'}
              onChange={(v) => patchCli({ terminalBgStretch: v })}
              options={CLI_BG_STRETCH_MODES}
            />
          </div>

          <div className="field">
            <label className="field-head" htmlFor="cli-bg-align">
              Alignment
            </label>
            <select
              id="cli-bg-align"
              className="select"
              value={cli.terminalBgAlignment || 'center'}
              onChange={(e) => patchCli({ terminalBgAlignment: e.target.value })}
            >
              {CLI_BG_ALIGNMENTS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {cliStatus?.ffmpegAvailable === false && (
          <div className="cli-ffmpeg-hint">
            GIFs, PNGs, and JPGs work natively. To auto-convert MP4/WebM videos into looping terminal GIFs, install{' '}
            <span className="mono">ffmpeg</span> (<span className="mono">winget install Gyan.FFmpeg</span>).
          </div>
        )}
      </div>

      {/* Section 3: Two-Column Core Config (agy CLI + Status Bar | Windows Terminal + Typography) */}
      <div className="grid-2">
        {/* Official agy CLI settings.json & Status Bar Builder */}
        <div className="card">
          <div>
            <div className="card-title">{t.cliOfficialTitle}</div>
            <div className="card-desc mono" style={{ fontSize: 11 }}>
              {cliStatus?.settingsPath || '~/.gemini/antigravity-cli/settings.json'}
            </div>
          </div>

          <div className="field">
            <label className="field-head" htmlFor="cli-scheme">
              {t.cliScheme}
            </label>
            <select
              id="cli-scheme"
              className="select"
              value={cli.colorScheme || 'terminal'}
              onChange={(e) => patchCli({ colorScheme: e.target.value })}
            >
              {CLI_COLOR_SCHEMES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid-2">
            <div className="field">
              <span className="field-head">{t.cliSpinner}</span>
              <SegmentedControl
                full
                value={cli.runningLightSpeed || 'medium'}
                onChange={(v) => patchCli({ runningLightSpeed: v })}
                options={CLI_SPINNER_SPEEDS}
              />
            </div>

            <div className="field">
              <span className="field-head">Alt screen buffer</span>
              <SegmentedControl
                full
                value={cli.altScreenMode || 'auto'}
                onChange={(v) => patchCli({ altScreenMode: v })}
                options={CLI_ALT_SCREEN_MODES}
              />
            </div>
          </div>

          <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)' }} className="stack-sm">
            <ToggleRow
              label={t.cliStatusLine}
              hint={t.cliStatusLineHint}
              checked={Boolean(cli.statusLineEnabled)}
              onChange={(v) => patchCli({ statusLineEnabled: v })}
            />

            {cli.statusLineEnabled && (
              <>
                <div className="grid-2">
                  <div className="field">
                    <label className="field-head" htmlFor="cli-sl-preset">
                      {t.cliStatusLayout}
                    </label>
                    <select
                      id="cli-sl-preset"
                      className="select"
                      value={cli.statusLinePreset || 'powerline'}
                      onChange={(e) => patchCli({ statusLinePreset: e.target.value })}
                    >
                      {CLI_STATUSLINE_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label className="field-head" htmlFor="cli-sl-prefix">
                      Prefix icon
                    </label>
                    <div className="cli-prefix-bar">
                      <input
                        id="cli-sl-prefix"
                        className="input mono"
                        style={{ width: 64, textAlign: 'center', padding: '0 6px' }}
                        value={cli.statusLinePrefix ?? '◆'}
                        maxLength={8}
                        onChange={(e) => patchCli({ statusLinePrefix: e.target.value }, false)}
                      />
                      <div className="cli-chip-row">
                        {CLI_PREFIX_SYMBOLS.map((sym, idx) => {
                          const active = (cli.statusLinePrefix ?? '◆') === sym;
                          return (
                            <button
                              key={idx}
                              type="button"
                              className={`cli-chip ${active ? 'active' : ''}`}
                              onClick={() => patchCli({ statusLinePrefix: sym })}
                            >
                              {sym || 'Off'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="field">
                  <span className="field-head">Status bar modules</span>
                  <div className="cli-chip-row">
                    {moduleToggles.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        className={`cli-chip ${m.checked ? 'active' : ''}`}
                        onClick={() => patchCli({ [m.key]: !m.checked })}
                      >
                        {m.checked && <Check size={11} strokeWidth={2.2} />}
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <SliderField
                  label="Top padding lines"
                  value={cli.statusLinePadding ?? 0}
                  min={0}
                  max={3}
                  onChange={(v) => patchCli({ statusLinePadding: v }, false)}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <button
                    type="button"
                    className="btn"
                    disabled={testingSl}
                    onClick={handleTestStatusLine}
                  >
                    <FlaskConical size={14} strokeWidth={1.5} />
                    <span>{testingSl ? 'Running test...' : 'Test status line'}</span>
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Executes local Node.js status script
                  </span>
                </div>

                {testResult && (
                  <div className={`cli-test-result mono ${testResult.ok ? 'ok' : 'err'}`}>
                    {testResult.ok ? testResult.plainText : testResult.error}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Windows Terminal Profile & Typography */}
        <div className="card">
          <div>
            <div className="card-title">{t.cliTermTitle}</div>
            <div className="card-desc">{t.cliTermDesc}</div>
          </div>

          <div className="field">
            <label className="field-head" htmlFor="term-font">
              {t.cliTermFont}
            </label>
            <input
              id="term-font"
              className="input mono"
              value={cli.terminalFontFace || 'JetBrainsMono Nerd Font'}
              onChange={(e) => patchCli({ terminalFontFace: e.target.value }, false)}
            />
            <div className="cli-chip-row" style={{ marginTop: 4 }}>
              {CLI_FONT_SUGGESTIONS.map((fontName) => (
                <button
                  key={fontName}
                  type="button"
                  className={`cli-chip ${cli.terminalFontFace === fontName ? 'active' : ''}`}
                  onClick={() => patchCli({ terminalFontFace: fontName })}
                >
                  {fontName}
                </button>
              ))}
            </div>
          </div>

          <div className="grid-2">
            <SliderField
              label={t.cliTermSize}
              value={cli.terminalFontSize ?? 11}
              min={8}
              max={24}
              unit="pt"
              onChange={(v) => patchCli({ terminalFontSize: v }, false)}
            />
            <SliderField
              label="Inner padding"
              value={cli.terminalPadding ?? 12}
              min={0}
              max={32}
              unit="px"
              onChange={(v) => patchCli({ terminalPadding: v }, false)}
            />
          </div>

          <div className="grid-2">
            <SliderField
              label={t.cliTermOpacity}
              value={cli.terminalOpacity ?? 88}
              min={30}
              max={100}
              unit="%"
              onChange={(v) => patchCli({ terminalOpacity: v }, false)}
            />

            <div className="field">
              <span className="field-head">Cursor shape</span>
              <SegmentedControl
                full
                value={cli.terminalCursorShape || 'bar'}
                onChange={(v) => patchCli({ terminalCursorShape: v })}
                options={CLI_CURSOR_SHAPES}
              />
            </div>
          </div>

          <div className="field">
            <span className="field-head">Windows Terminal HLSL pixel shader</span>
            <SegmentedControl
              full
              value={cli.terminalShader || 'none'}
              onChange={(v) => patchCli({ terminalShader: v })}
              options={CLI_SHADER_OPTIONS}
            />
          </div>

          <ToggleRow
            label={t.cliTermAcrylic}
            hint="Translucent Windows acrylic backdrop behind the terminal"
            checked={cli.terminalAcrylic !== false}
            onChange={(v) => patchCli({ terminalAcrylic: v })}
          />

          <ToggleRow
            label="Apply to default Windows Terminal profile"
            hint="Enabled by default so opening any PowerShell / CMD tab and running agy immediately shows your theme & wallpaper"
            checked={cli.terminalApplyToDefaultProfile !== false}
            onChange={(v) => patchCli({ terminalApplyToDefaultProfile: v })}
          />

          <ToggleRow
            label="Retro CRT scanline shader"
            hint="Optional subtle CRT glow effect in Windows Terminal"
            checked={Boolean(cli.terminalRetroEffect)}
            onChange={(v) => patchCli({ terminalRetroEffect: v })}
          />

          <ToggleRow
            label="Auto-sync when switching IDE Theme Packs"
            hint="Off by default so CLI stays completely independent of IDE themes"
            checked={Boolean(cli.terminalSyncThemeWallpaper)}
            onChange={(v) => patchCli({ terminalSyncThemeWallpaper: v })}
          />

          <div
            className="header-actions"
            style={{ justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}
          >
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {cliStatus?.windowsTerminalDetected
                ? cliStatus.wtProfileInstalled
                  ? 'Windows Terminal synced'
                  : 'Windows Terminal detected'
                : 'Windows Terminal not found'}
            </span>
            <div className="header-actions">
              {cliStatus?.wtHasBackup && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onRestoreWindowsTerminal}
                  title="Restore your original settings.json backup"
                >
                  <History size={14} strokeWidth={1.5} />
                  <span>Restore WT</span>
                </button>
              )}
              <button
                type="button"
                className="btn"
                disabled={!cliStatus?.windowsTerminalDetected}
                onClick={onSyncWindowsTerminal}
              >
                {t.cliSyncWt}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Cross-Platform Terminal Config Snippets */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">{t.cliOtherTitle}</div>
            <div className="card-desc">
              Ready-to-paste config using your active CLI preset, cursor shape, padding, and wallpaper path.
            </div>
          </div>

          <div className="header-actions" style={{ flexWrap: 'wrap' }}>
            <SegmentedControl
              value={termTab}
              onChange={setTermTab}
              options={[
                { id: 'ghostty', label: 'Ghostty' },
                { id: 'wezterm', label: 'WezTerm' },
                { id: 'kitty', label: 'Kitty' },
                { id: 'alacritty', label: 'Alacritty' },
              ]}
            />
            <button
              type="button"
              className="btn"
              disabled={syncingExt}
              onClick={handleSyncExternal}
              title={`Write managed theme config for ${termTab} (creates .agthemes.bak backup)`}
            >
              <HardDriveDownload size={14} strokeWidth={1.5} />
              <span>{syncingExt ? 'Writing...' : `Write ${termTab} config`}</span>
            </button>
            <button type="button" className="btn btn-ghost" onClick={handleCopySnippet}>
              {copied ? <Check size={15} strokeWidth={1.5} /> : <Copy size={15} strokeWidth={1.5} />}
              <span>{copied ? t.copied : t.copy}</span>
            </button>
          </div>
        </div>

        <pre
          className="mono"
          style={{
            padding: 14,
            borderRadius: 8,
            backgroundColor: 'var(--surface-deep)',
            border: '1px solid var(--border)',
            fontSize: 12,
            lineHeight: 1.55,
            color: 'var(--text-secondary)',
            overflowX: 'auto',
            userSelect: 'text',
          }}
        >
          {snippetText}
        </pre>
      </div>
    </div>
  );
}
