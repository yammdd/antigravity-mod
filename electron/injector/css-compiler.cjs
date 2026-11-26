'use strict';

const { getSurfaceRamp, hexToRgbString } = require('../core/defaults.cjs');

const UI_FONT_MAP = {
  inter: "'Inter', 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
  geist: "'Geist', 'Inter', 'Segoe UI Variable', system-ui, sans-serif",
  be_vietnam: "'Be Vietnam Pro', 'Inter', 'Segoe UI', system-ui, sans-serif",
  ibm_plex: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
  system: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
};

const MONO_FONT_MAP = {
  jetbrains: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
  cascadia: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
  ibm_mono: "'IBM Plex Mono', Consolas, monospace",
  system: "Consolas, 'Courier New', monospace",
};

function alpha(pct) {
  return Math.max(0, Math.min(1, Number(pct) / 100)).toFixed(2);
}

function buildAnimationCss(preset, accentRgb) {
  if (!preset || preset === 'none') return '';

  if (preset === 'ken-burns') {
    return `@keyframes agKenBurns {
  0% { transform: scale(1.0) translate3d(0%, 0%, 0); }
  50% { transform: scale(1.08) translate3d(-1.5%, -1%, 0); }
  100% { transform: scale(1.0) translate3d(0%, 0%, 0); }
}
#ag-theme-bg-img { animation: agKenBurns 30s ease-in-out infinite; will-change: transform; }
@media (prefers-reduced-motion: reduce) { #ag-theme-bg-img { animation: none !important; } }`;
  }

  if (preset === 'tab-slide') {
    return `@keyframes agFadeRise { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
.monaco-workbench .part.editor .tab, .agy-shell [data-testid="agent-response"] {
  transition: background-color 150ms cubic-bezier(0.22,1,0.36,1), border-color 150ms cubic-bezier(0.22,1,0.36,1) !important;
}
.agy-shell [data-testid="agent-response"] { animation: agFadeRise 220ms cubic-bezier(0.22,1,0.36,1); }
@media (prefers-reduced-motion: reduce) { .agy-shell [data-testid="agent-response"] { animation: none !important; } }`;
  }

  if (preset === 'ambient-shift') {
    return `@keyframes agAmbientShift {
  0%, 100% { filter: brightness(1) saturate(1); }
  50% { filter: brightness(1.07) saturate(1.1); }
}
#ag-theme-bg-stage { animation: agAmbientShift 16s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { #ag-theme-bg-stage { animation: none !important; } }`;
  }

  if (preset === 'cursor-pulse') {
    return `@keyframes agFocusPulse {
  0%, 100% { box-shadow: 0 0 0 1px rgba(${accentRgb}, 0.35); }
  50% { box-shadow: 0 0 0 2px rgba(${accentRgb}, 0.65); }
}
.surface-composer:focus-within { animation: agFocusPulse 2.8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .surface-composer:focus-within { animation: none !important; } }`;
  }

  if (preset === 'aurora-edge') {
    return `@keyframes agEdgeGlide {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
.monaco-workbench .part.titlebar::after, .agy-shell [class*="@container/titlebar"]::after {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(${accentRgb}, 0.75), transparent);
  background-size: 200% 100%;
  animation: agEdgeGlide 8s linear infinite;
  pointer-events: none;
  z-index: 10;
}
@media (prefers-reduced-motion: reduce) {
  .monaco-workbench .part.titlebar::after, .agy-shell [class*="@container/titlebar"]::after { animation: none !important; }
}`;
  }

  return '';
}

/**
 * Compiles comprehensive CSS for Antigravity IDE ('ide'), IDE embedded chat ('ide-chat'),
 * and Antigravity App ('app'), covering chrome variables, frosted glass popups,
 * sidebar cards, chat bubbles, composer, tabs, explorer rows, and editor polish.
 */
function compileStylesheet({ config, targetKind, activeWallpaper, customFonts = [], userCss = '' }) {
  const ramp = getSurfaceRamp(config);
  const isLight = config.colorMode === 'light';
  const accentHex = config.accentColor || '#3b82f6';
  const accentRgb = hexToRgbString(accentHex);
  const surfaceRgb = ramp.rgb;
  const chatFontSize = Number(config.chatFontSize) || 14;
  const radius = Number(config.cornerRadius ?? 10);
  const glassBlur = Math.max(0, Math.min(24, Number(config.glassBlur ?? 12)));
  const frostedPopups = config.frostedPopups !== false;
  const hasWallpaper = Boolean(activeWallpaper?.mediaUrl);

  const customUiFont = customFonts.find((f) => f.id === config.customUiFontId);
  const customMonoFont = customFonts.find((f) => f.id === config.customMonoFontId);

  const uiFont =
    config.uiFont === 'custom' && customUiFont
      ? `'${customUiFont.family}', 'Inter', system-ui, sans-serif`
      : UI_FONT_MAP[config.uiFont] || UI_FONT_MAP.inter;

  const monoFont =
    config.monoFont === 'custom' && customMonoFont
      ? `'${customMonoFont.family}', 'JetBrains Mono', monospace`
      : MONO_FONT_MAP[config.monoFont] || MONO_FONT_MAP.jetbrains;

  const sidebarAlpha = hasWallpaper ? alpha(config.sidebarOpacity) : '1.00';
  const chatAlpha = hasWallpaper ? alpha(config.chatOpacity) : '1.00';
  const editorAlpha = hasWallpaper ? alpha(config.editorOpacity) : '1.00';
  const chromeAlpha = hasWallpaper ? alpha(Math.min(92, (Number(config.sidebarOpacity) || 58) + 8)) : '1.00';
  const popupAlpha = frostedPopups && glassBlur > 0 ? (isLight ? '0.84' : '0.80') : '0.96';
  const cardGlassAlpha = hasWallpaper ? (isLight ? '0.62' : '0.46') : (isLight ? '0.92' : '0.90');
  const subtlePillAlpha = hasWallpaper ? (isLight ? '0.46' : '0.30') : (isLight ? '0.85' : '0.72');
  const blurCss = frostedPopups && glassBlur > 0 ? `backdrop-filter: blur(${glassBlur}px) saturate(1.18) !important; -webkit-backdrop-filter: blur(${glassBlur}px) saturate(1.18) !important;` : '';

  const borderColor =
    config.borderStyle === 'none'
      ? 'transparent'
      : config.borderStyle === 'accent'
        ? `rgba(${accentRgb}, 0.36)`
        : isLight
          ? 'rgba(23, 23, 23, 0.11)'
          : 'rgba(237, 237, 237, 0.10)';

  const hoverBg = isLight ? 'rgba(23, 23, 23, 0.06)' : 'rgba(255, 255, 255, 0.07)';
  const selectBg = `rgba(${accentRgb}, ${isLight ? '0.16' : '0.22'})`;
  const inactiveSelectBg = isLight ? 'rgba(23, 23, 23, 0.09)' : 'rgba(255, 255, 255, 0.10)';
  const inputBg = isLight ? 'rgba(255, 255, 255, 0.68)' : 'rgba(10, 10, 12, 0.34)';
  const codeBlockBg = isLight ? 'rgba(23, 23, 23, 0.05)' : 'rgba(0, 0, 0, 0.34)';
  const popupShadow = isLight
    ? '0 12px 32px rgba(0, 0, 0, 0.12)'
    : '0 14px 36px rgba(0, 0, 0, 0.45)';

  const sections = [];

  // 0. @font-face declarations for imported local fonts
  for (const f of [customUiFont, customMonoFont]) {
    if (f?.fontUrl) {
      sections.push(`@font-face {
  font-family: '${f.family}';
  src: url("${f.fontUrl}");
  font-weight: 100 900;
  font-display: swap;
}`);
    }
  }

  // 1. Standardized public CSS tokens (--ag-*)
  sections.push(`:root {
  --ag-accent: ${accentHex};
  --ag-accent-rgb: ${accentRgb};
  --ag-surface-rgb: ${surfaceRgb};
  --ag-text-primary: ${ramp.textPrimary};
  --ag-text-secondary: ${ramp.textSecondary};
  --ag-text-muted: ${ramp.textMuted};
  --ag-border: ${borderColor};
  --ag-radius: ${radius}px;
  --ag-glass-blur: ${glassBlur}px;
  --ag-font-ui: ${uiFont};
  --ag-font-mono: ${monoFont};
  --ag-chat-font-size: ${chatFontSize}px;
  --ag-chrome-bg: rgba(${surfaceRgb}, ${chromeAlpha});
  --ag-sidebar-bg: rgba(${surfaceRgb}, ${sidebarAlpha});
  --ag-chat-bg: rgba(${surfaceRgb}, ${chatAlpha});
  --ag-editor-bg: rgba(${surfaceRgb}, ${editorAlpha});
  --ag-card-bg: rgba(${surfaceRgb}, ${cardGlassAlpha});
  --ag-pill-bg: rgba(${surfaceRgb}, ${subtlePillAlpha});
  --ag-popup-bg: rgba(${surfaceRgb}, ${popupAlpha});
}`);

  // 2. Scrollbars
  sections.push(`::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
::-webkit-scrollbar-track { background: transparent !important; }
::-webkit-scrollbar-thumb { background: ${isLight ? 'rgba(23,23,23,0.20)' : 'rgba(237,237,237,0.18)'} !important; border-radius: 999px !important; }
::-webkit-scrollbar-thumb:hover { background: rgba(var(--ag-accent-rgb), 0.65) !important; }`);

  // 3. Antigravity App (2.0) & IDE Embedded Chat (.agy-shell + Sidebar + Composer + Bubbles + Popovers)
  if (targetKind === 'app' || targetKind === 'ide-chat') {
    const bubbleStyle = config.chatBubbleStyle || 'glass';
    const chatMaxWidth =
      config.chatWidth === 'compact' ? '680px' : config.chatWidth === 'wide' ? '1080px' : '840px';

    let bubbleCss = '';
    if (bubbleStyle === 'minimal') {
      bubbleCss = `.agy-shell [data-testid="agent-response"] {
  background: transparent !important;
  border: none !important;
  padding-left: 2px !important;
}
.agy-user-bubble, .agy-user-bubble-frame {
  background: rgba(var(--ag-accent-rgb), ${isLight ? '0.12' : '0.16'}) !important;
  border: 1px solid rgba(var(--ag-accent-rgb), 0.28) !important;
}`;
    } else if (bubbleStyle === 'outlined') {
      bubbleCss = `.agy-shell [data-testid="agent-response"] {
  background: var(--ag-pill-bg) !important;
  border: 1px solid var(--ag-border) !important;
  border-left: 2px solid var(--ag-accent) !important;
  padding: 12px 16px !important;
}
.agy-user-bubble, .agy-user-bubble-frame {
  background: var(--ag-card-bg) !important;
  border: 1px solid rgba(var(--ag-accent-rgb), 0.40) !important;
}`;
    } else if (bubbleStyle === 'floating') {
      bubbleCss = `.agy-shell [data-testid="agent-response"] {
  background: var(--ag-card-bg) !important;
  border: 1px solid var(--ag-border) !important;
  box-shadow: ${popupShadow} !important;
  ${blurCss}
  padding: 14px 16px !important;
}
.agy-user-bubble, .agy-user-bubble-frame {
  background: rgba(var(--ag-accent-rgb), ${isLight ? '0.14' : '0.20'}) !important;
  border: 1px solid rgba(var(--ag-accent-rgb), 0.36) !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22) !important;
  ${blurCss}
}`;
    } else {
      // glass (default)
      bubbleCss = `.agy-shell [data-testid="agent-response"] {
  background: ${hasWallpaper ? 'var(--ag-card-bg)' : 'transparent'} !important;
  border: ${hasWallpaper ? '1px solid var(--ag-border)' : 'none'} !important;
  ${hasWallpaper ? blurCss : ''}
  padding: ${hasWallpaper ? '12px 14px' : '4px 0'} !important;
}
.agy-user-bubble, .agy-user-bubble-frame {
  background: rgba(var(--ag-accent-rgb), ${isLight ? '0.14' : '0.18'}) !important;
  border: 1px solid rgba(var(--ag-accent-rgb), 0.34) !important;
  ${blurCss}
}`;
    }

    sections.push(`html, body, #root, .agy-shell {
  font-family: var(--ag-font-ui) !important;
  color: var(--ag-text-primary);
  ${hasWallpaper ? 'background: transparent !important; background-color: transparent !important; background-image: none !important;' : `background-color: ${ramp.hex} !important;`}
  -webkit-font-smoothing: antialiased !important;
  color-scheme: ${isLight ? 'light' : 'dark'};
  --background: ${hasWallpaper ? 'transparent' : ramp.hex};
  --foreground: ${ramp.textPrimary};
  --card: var(--ag-card-bg);
  --card-foreground: ${ramp.textPrimary};
  --popover: var(--ag-popup-bg);
  --popover-foreground: ${ramp.textPrimary};
  --sidebar: transparent;
  --sidebar-foreground: ${ramp.textPrimary};
  --sidebar-accent: ${hoverBg};
  --sidebar-accent-foreground: ${ramp.textPrimary};
  --sidebar-border: ${borderColor};
  --secondary: var(--ag-pill-bg);
  --secondary-foreground: ${ramp.textPrimary};
  --muted: var(--ag-pill-bg);
  --muted-foreground: ${ramp.textSecondary};
  --border: ${borderColor};
  --ring: ${accentHex};
  --vscode-editor-background: ${hasWallpaper ? 'transparent' : ramp.hex};
  --vscode-sideBar-background: ${hasWallpaper ? 'transparent' : ramp.hex};
  --vscode-panel-background: ${hasWallpaper ? 'transparent' : ramp.hex};
  --vscode-foreground: ${ramp.textPrimary};
  --vscode-descriptionForeground: ${ramp.textSecondary};
  --vscode-input-background: var(--ag-card-bg);
  --vscode-input-foreground: ${ramp.textPrimary};
  --vscode-input-placeholderForeground: ${ramp.textMuted};
}
.agy-shell > *:not(#ag-theme-bg-layer):not(#ag-theme-fx-layer) { position: relative !important; z-index: 2 !important; }
body[data-has-browser-hole="true"] .agy-shell[data-ag-hole="1"] #ag-theme-bg-layer {
  clip-path: var(--ag-hole-clip, none) !important;
}

/* Strip ALL opaque nested shell & IDE-embedded chat backgrounds (fixes dark wall in Light Mode IDE chat!) */
.agy-sheet,
.agy-inset-shell,
.browser-hole-opaque,
[data-main-content-body="true"],
[class*="agy-inset-shell"],
[class*="--shell-canvas"],
.agy-shell main,
.agy-shell [role="main"],
.agy-shell [class*="bg-ide-"],
.agy-shell [class*="bg-editor"],
.agy-shell [class*="bg-canvas"],
.agy-shell [class*="bg-chat"],
.agy-shell .bg-background:not(.settings-modal-container):not(.settings-modal-container *) {
  background: ${hasWallpaper ? 'transparent' : ramp.hex} !important;
  background-color: ${hasWallpaper ? 'transparent' : ramp.hex} !important;
  background-image: none !important;
}
${targetKind === 'ide-chat' ? `body, #root, .agy-shell, .agy-shell > div, .agy-shell > div > div {
  background: ${hasWallpaper ? 'transparent' : ramp.hex} !important;
  background-color: ${hasWallpaper ? 'transparent' : ramp.hex} !important;
}
.agy-shell [class*="bg-[#1"],
.agy-shell [class*="bg-[#2"],
.agy-shell [class*="bg-neutral-9"],
.agy-shell [class*="bg-zinc-9"],
.agy-shell [class*="bg-gray-9"],
.agy-shell [class*="bg-slate-9"] {
  background-color: ${hasWallpaper ? 'var(--ag-chat-bg)' : ramp.hex} !important;
}` : ''}

/* Theme Settings Modal & Dialogs cleanly to match Dark/Light mode (fixes solid black Settings window on Light themes!) */
.settings-modal-container,
.agy-shell .settings-modal-container,
[role="dialog"],
.agy-shell [role="dialog"] {
  background: var(--ag-popup-bg) !important;
  background-color: var(--ag-popup-bg) !important;
  color: var(--ag-text-primary) !important;
  border: 1px solid var(--ag-border) !important;
  border-radius: var(--ag-radius) !important;
  box-shadow: ${popupShadow} !important;
  ${blurCss}
}
.settings-modal-container aside,
.settings-modal-container nav,
.settings-modal-container main,
.settings-modal-container [class*="bg-background"],
.settings-modal-container [class*="bg-sidebar"],
.settings-modal-container [class*="bg-neutral-9"],
.settings-modal-container [class*="bg-zinc-9"],
.settings-modal-container [class*="bg-[#1"],
.settings-modal-container [class*="bg-[#0"] {
  background: transparent !important;
  background-color: transparent !important;
  color: var(--ag-text-primary) !important;
}
.settings-modal-container [class*="bg-card"],
.settings-modal-container [class*="bg-muted"],
.settings-modal-container [class*="bg-secondary"],
.settings-modal-container select,
.settings-modal-container input {
  background-color: var(--ag-pill-bg) !important;
  color: var(--ag-text-primary) !important;
  border-color: var(--ag-border) !important;
}
.settings-modal-container h1,
.settings-modal-container h2,
.settings-modal-container h3,
.settings-modal-container p,
.settings-modal-container span,
.settings-modal-container label,
.settings-modal-container button {
  color: inherit;
}
${isLight ? `.agy-shell [class*="text-white"],
.agy-shell [class*="text-gray-1"],
.agy-shell [class*="text-gray-2"],
.agy-shell [class*="text-zinc-1"],
.agy-shell [class*="text-zinc-2"],
.agy-shell [class*="text-neutral-1"],
.agy-shell [class*="text-neutral-2"],
.settings-modal-container [class*="text-white"],
.settings-modal-container [class*="text-gray-1"],
.settings-modal-container [class*="text-zinc-1"],
.settings-modal-container [class*="text-neutral-1"] {
  color: var(--ag-text-primary) !important;
}` : `.agy-shell [class*="text-black"],
.agy-shell [class*="text-gray-9"],
.agy-shell [class*="text-zinc-9"],
.agy-shell [class*="text-neutral-9"],
.settings-modal-container [class*="text-black"] {
  color: var(--ag-text-primary) !important;
}`}

/* Unified Frosted Sidebar — eliminates harsh solid black project strips & sticky bars */
.agy-shell aside, .agy-shell [data-sidebar="true"], .agy-shell .bg-sidebar:not(.surface-opaque) {
  background: var(--ag-sidebar-bg) !important;
  color: var(--ag-text-primary) !important;
  border-right: 1px solid var(--ag-border) !important;
  ${hasWallpaper ? blurCss : ''}
}
.agy-shell aside [class*="sticky"],
.agy-shell [data-sidebar="true"] [class*="sticky"],
.agy-shell aside [class*="bg-sidebar"],
.agy-shell aside [class*="bg-background"],
.agy-shell aside [class*="bg-card"],
.agy-shell aside [class*="bg-muted"],
.agy-shell aside [class*="bg-secondary"],
.agy-shell aside [class*="bg-neutral"],
.agy-shell aside [class*="bg-zinc"],
.agy-shell aside [class*="bg-slate"],
.agy-shell aside [class*="bg-stone"],
.agy-shell aside [class*="bg-gray"],
.agy-shell aside [class*="from-sidebar"],
.agy-shell aside [class*="from-background"],
.agy-shell aside .surface-opaque {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
}
.agy-shell aside [data-sidebar="group-label"],
.agy-shell aside [data-sidebar="menu-button"],
.agy-shell aside button,
.agy-shell aside a {
  border-radius: calc(var(--ag-radius) - 2px) !important;
  transition: background-color 140ms ease, border-color 140ms ease !important;
}
.agy-shell aside [data-sidebar="menu-button"]:hover,
.agy-shell aside button:hover,
.agy-shell aside a:hover {
  background-color: ${hoverBg} !important;
}
.agy-shell aside [data-active="true"],
.agy-shell aside [aria-current="page"],
.agy-shell aside [aria-selected="true"] {
  background-color: ${selectBg} !important;
  border-color: rgba(var(--ag-accent-rgb), 0.34) !important;
}
/* Subtle glass pill for project header rows inside sidebar */
.agy-shell aside [class*="rounded"][class*="bg-"]:not([class*="rounded-full"]):not([class*="bg-blue"]):not([class*="bg-sky"]):not([class*="bg-green"]):not([class*="bg-red"]):not([class*="bg-amber"]) {
  background-color: var(--ag-pill-bg) !important;
  border: 1px solid var(--ag-border) !important;
}

/* Right Auxiliary Pane & Titlebar */
.agy-shell [data-side-panel-body="true"] {
  background: var(--ag-sidebar-bg) !important;
  color: var(--ag-text-primary) !important;
  border-left: 1px solid var(--ag-border) !important;
  ${hasWallpaper ? blurCss : ''}
}
.agy-shell [class*="@container/titlebar"] {
  position: relative;
  background: var(--ag-chrome-bg) !important;
  color: var(--ag-text-primary) !important;
  border-bottom: 1px solid var(--ag-border) !important;
}

/* Chat Typography, Reading Width, Code Blocks & Bubbles */
.agy-shell [data-testid="agent-response"] {
  border-radius: var(--ag-radius) !important;
  font-size: var(--ag-chat-font-size) !important;
  font-family: var(--ag-font-ui) !important;
  color: var(--ag-text-primary) !important;
  line-height: 1.65 !important;
  max-width: ${chatMaxWidth} !important;
}
.agy-shell [data-testid="agent-response"] pre {
  font-family: var(--ag-font-mono) !important;
  background: ${codeBlockBg} !important;
  border: 1px solid var(--ag-border) !important;
  border-radius: calc(var(--ag-radius) - 2px) !important;
}
.agy-shell [data-testid="agent-response"] code {
  font-family: var(--ag-font-mono) !important;
}
.agy-user-bubble-frame, .agy-user-bubble, .surface-composer, .surface-composer-card {
  border-radius: var(--ag-radius) !important;
}
${bubbleCss}

/* Frosted Glass Composer Card & Floating Menus/Popovers */
.agy-shell .surface-composer,
.agy-shell .surface-composer-card {
  background: var(--ag-card-bg) !important;
  color: var(--ag-text-primary) !important;
  border: 1px solid var(--ag-border) !important;
  ${blurCss}
  box-shadow: ${popupShadow} !important;
  transition: border-color 160ms ease, box-shadow 160ms ease !important;
}
.agy-shell .surface-composer textarea,
.agy-shell .surface-composer [contenteditable="true"],
.agy-shell .surface-composer-card textarea,
.agy-shell .surface-composer-card [contenteditable="true"] {
  color: var(--ag-text-primary) !important;
  caret-color: var(--ag-accent) !important;
}
.agy-shell .surface-composer textarea::placeholder,
.agy-shell .surface-composer-card textarea::placeholder {
  color: var(--ag-text-muted) !important;
  opacity: 1 !important;
}
.agy-shell .surface-composer:focus-within,
.agy-shell .surface-composer-card:focus-within {
  border-color: rgba(var(--ag-accent-rgb), 0.65) !important;
  box-shadow: 0 0 0 1px rgba(var(--ag-accent-rgb), 0.28), ${popupShadow} !important;
}
[data-radix-popper-content-wrapper] > *,
.agy-shell [role="menu"],
.agy-shell [role="listbox"],
.agy-shell [role="dialog"] {
  background-color: var(--ag-popup-bg) !important;
  border-color: var(--ag-border) !important;
  border-radius: var(--ag-radius) !important;
  ${blurCss}
}`);
  }

  // 4. Antigravity IDE Workbench (.monaco-workbench)
  if (targetKind === 'ide') {
    const titleBg = 'var(--ag-chrome-bg)';
    const sideBg = 'var(--ag-sidebar-bg)';
    const edBg = hasWallpaper ? 'transparent' : 'var(--ag-editor-bg)';
    const tabBorderTopVar = config.tabsStyle === 'minimal' ? accentHex : 'transparent';
    const tabBorderBottomVar = config.tabsStyle === 'underline' ? accentHex : 'transparent';

    sections.push(`html, body, .monaco-workbench {
  font-family: var(--ag-font-ui) !important;
  color: var(--ag-text-primary);
  ${hasWallpaper ? 'background: transparent !important; background-color: transparent !important;' : `background-color: ${ramp.hex} !important;`}
  --vscode-foreground: ${ramp.textPrimary};
  --vscode-descriptionForeground: ${ramp.textSecondary};
  --vscode-disabledForeground: ${ramp.textMuted};
  --vscode-icon-foreground: ${ramp.textPrimary};
  --vscode-focusBorder: ${accentHex};
  --vscode-titleBar-activeBackground: ${titleBg};
  --vscode-titleBar-inactiveBackground: ${titleBg};
  --vscode-titleBar-activeForeground: ${ramp.textPrimary};
  --vscode-titleBar-inactiveForeground: ${ramp.textSecondary};
  --vscode-titleBar-border: ${borderColor};
  --vscode-statusBar-background: ${titleBg};
  --vscode-statusBar-noFolderBackground: ${titleBg};
  --vscode-statusBar-debuggingBackground: ${titleBg};
  --vscode-statusBar-foreground: ${ramp.textPrimary};
  --vscode-statusBar-border: ${borderColor};
  --vscode-activityBar-background: ${sideBg};
  --vscode-activityBar-foreground: ${ramp.textPrimary};
  --vscode-activityBar-inactiveForeground: ${ramp.textMuted};
  --vscode-activityBar-border: ${borderColor};
  --vscode-sideBar-background: ${sideBg};
  --vscode-sideBar-foreground: ${ramp.textPrimary};
  --vscode-sideBarTitle-foreground: ${ramp.textPrimary};
  --vscode-sideBarSectionHeader-background: transparent;
  --vscode-sideBarSectionHeader-foreground: ${ramp.textPrimary};
  --vscode-sideBarSectionHeader-border: ${borderColor};
  --vscode-sideBarStickyScroll-background: ${sideBg};
  --vscode-sideBarStickyScroll-border: ${borderColor};
  --vscode-sideBar-border: ${borderColor};
  --vscode-list-hoverBackground: ${hoverBg};
  --vscode-list-hoverForeground: ${ramp.textPrimary};
  --vscode-list-activeSelectionBackground: ${selectBg};
  --vscode-list-activeSelectionForeground: ${ramp.textPrimary};
  --vscode-list-inactiveSelectionBackground: ${inactiveSelectBg};
  --vscode-list-inactiveSelectionForeground: ${ramp.textPrimary};
  --vscode-list-focusBackground: ${selectBg};
  --vscode-list-focusForeground: ${ramp.textPrimary};
  --vscode-tree-indentGuidesStroke: ${borderColor};
  --vscode-editorGroupHeader-tabsBackground: ${sideBg};
  --vscode-editorGroupHeader-noTabsBackground: ${sideBg};
  --vscode-editorGroupHeader-tabsBorder: ${borderColor};
  --vscode-tab-activeBackground: transparent;
  --vscode-tab-inactiveBackground: transparent;
  --vscode-tab-activeForeground: ${ramp.textPrimary};
  --vscode-tab-inactiveForeground: ${ramp.textSecondary};
  --vscode-tab-hoverForeground: ${ramp.textPrimary};
  --vscode-tab-border: transparent;
  --vscode-tab-activeBorder: ${tabBorderBottomVar};
  --vscode-tab-activeBorderTop: ${tabBorderTopVar};
  --vscode-tab-unfocusedActiveBorder: transparent;
  --vscode-tab-unfocusedActiveBorderTop: transparent;
  --vscode-breadcrumb-background: transparent;
  --vscode-breadcrumb-foreground: ${ramp.textSecondary};
  --vscode-breadcrumb-focusForeground: ${ramp.textPrimary};
  --vscode-breadcrumb-activeSelectionForeground: ${ramp.textPrimary};
  --vscode-editorStickyScroll-background: ${sideBg};
  --vscode-editorStickyScrollHover-background: ${hoverBg};
  --vscode-editor-background: ${edBg};
  --vscode-editor-lineHighlightBackground: rgba(${accentRgb}, ${isLight ? '0.07' : '0.09'});
  --vscode-editor-lineHighlightBorder: transparent;
  --vscode-editorGutter-background: transparent;
  --vscode-minimap-background: transparent;
  --vscode-terminal-background: ${hasWallpaper ? 'transparent' : sideBg};
  --vscode-terminal-foreground: ${ramp.textPrimary};
  --vscode-terminalCursor-foreground: ${accentHex};
  --vscode-editorWidget-background: var(--ag-popup-bg);
  --vscode-editorWidget-border: ${borderColor};
  --vscode-editorSuggestWidget-background: var(--ag-popup-bg);
  --vscode-editorSuggestWidget-border: ${borderColor};
  --vscode-editorSuggestWidget-selectedBackground: ${selectBg};
  --vscode-editorHoverWidget-background: var(--ag-popup-bg);
  --vscode-editorHoverWidget-border: ${borderColor};
  --vscode-quickInput-background: var(--ag-popup-bg);
  --vscode-quickInput-foreground: ${ramp.textPrimary};
  --vscode-notifications-background: var(--ag-popup-bg);
  --vscode-notifications-border: ${borderColor};
  --vscode-menu-background: var(--ag-popup-bg);
  --vscode-menu-foreground: ${ramp.textPrimary};
  --vscode-menu-border: ${borderColor};
  --vscode-menu-selectionBackground: ${selectBg};
  --vscode-panel-background: ${sideBg};
  --vscode-panel-border: ${borderColor};
  --vscode-panelTitle-activeForeground: ${ramp.textPrimary};
  --vscode-panelTitle-inactiveForeground: ${ramp.textSecondary};
  --vscode-panelTitle-activeBorder: ${accentHex};
  --vscode-input-background: ${inputBg};
  --vscode-input-foreground: ${ramp.textPrimary};
  --vscode-input-border: ${borderColor};
  --vscode-editorCursor-foreground: ${accentHex};
}
.monaco-workbench .codicon, .monaco-workbench [class*="codicon-"] {
  font-family: codicon !important;
}
.monaco-workbench > *:not(#ag-theme-bg-layer):not(#ag-theme-fx-layer) { z-index: 2; }

/* Unified Titlebar & Statusbar */
.monaco-workbench .part.titlebar {
  position: relative;
  background: var(--ag-chrome-bg) !important;
  background-color: var(--ag-chrome-bg) !important;
  color: var(--ag-text-primary) !important;
  border-bottom: 1px solid var(--ag-border) !important;
}
.monaco-workbench .part.titlebar .titlebar-container,
.monaco-workbench .part.titlebar .titlebar-left,
.monaco-workbench .part.titlebar .titlebar-center,
.monaco-workbench .part.titlebar .titlebar-right,
.monaco-workbench .part.titlebar .menubar,
.monaco-workbench .part.titlebar .window-title {
  background: transparent !important;
  background-color: transparent !important;
  color: var(--ag-text-primary) !important;
}
.monaco-workbench .part.titlebar .codicon,
.monaco-workbench .part.titlebar .action-label {
  color: var(--ag-text-primary) !important;
}

.monaco-workbench .part.statusbar {
  background: var(--ag-chrome-bg) !important;
  background-color: var(--ag-chrome-bg) !important;
  color: var(--ag-text-primary) !important;
  border-top: 1px solid var(--ag-border) !important;
}
.monaco-workbench .part.statusbar .items-container,
.monaco-workbench .part.statusbar .statusbar-item,
.monaco-workbench .part.statusbar .statusbar-item-label,
.monaco-workbench .part.statusbar .codicon {
  background: transparent !important;
  color: var(--ag-text-primary) !important;
}

/* Single-layer translucent Activity Bar, Sidebar, and Panel */
.monaco-workbench .part.activitybar,
.monaco-workbench .part.sidebar,
.monaco-workbench .part.panel {
  background: var(--ag-sidebar-bg) !important;
  background-color: var(--ag-sidebar-bg) !important;
  color: var(--ag-text-primary) !important;
  border-color: var(--ag-border) !important;
}
.monaco-workbench .part.sidebar > .title,
.monaco-workbench .part.sidebar > .content,
.monaco-workbench .part.sidebar .composite.title,
.monaco-workbench .part.sidebar .pane,
.monaco-workbench .part.sidebar .pane-header,
.monaco-workbench .part.sidebar .pane-body,
.monaco-workbench .part.sidebar .split-view-view,
.monaco-workbench .part.sidebar .monaco-list,
.monaco-workbench .part.sidebar .monaco-list-rows,
.monaco-workbench .part.sidebar .monaco-scrollable-element,
.monaco-workbench .part.activitybar > .content,
.monaco-workbench .part.panel > .composite.title,
.monaco-workbench .part.panel > .content {
  background: transparent !important;
  background-color: transparent !important;
  color: var(--ag-text-primary) !important;
}
.monaco-workbench .part.sidebar .monaco-list-row {
  color: var(--ag-text-primary) !important;
  transition: background-color 110ms ease !important;
}
.monaco-workbench .part.sidebar .monaco-list-row:hover:not(.selected) {
  background-color: ${hoverBg} !important;
}
.monaco-workbench .part.sidebar .monaco-list-row.selected {
  background-color: ${inactiveSelectBg} !important;
}
.monaco-workbench .part.sidebar .monaco-list:focus .monaco-list-row.selected,
.monaco-workbench .part.sidebar .monaco-list-row.focused.selected {
  background-color: ${selectBg} !important;
}
.monaco-workbench .part.sidebar .pane-header {
  border-top: 1px solid var(--ag-border) !important;
}
.monaco-workbench .part.sidebar .title-label h2,
.monaco-workbench .part.sidebar .pane-header .title,
.monaco-workbench .part.sidebar .monaco-tl-twistie {
  color: var(--ag-text-primary) !important;
}
/* Fix Explorer Sticky Tree Headers (removes solid black bar on Light themes!) */
.monaco-workbench .part.sidebar .monaco-tree-sticky-container,
.monaco-workbench .part.sidebar .monaco-tree-sticky-row,
.monaco-workbench .part.sidebar .monaco-tree-sticky-container-shadow {
  background: var(--ag-sidebar-bg) !important;
  background-color: var(--ag-sidebar-bg) !important;
  color: var(--ag-text-primary) !important;
  box-shadow: none !important;
  border-bottom: 1px solid var(--ag-border) !important;
}
.monaco-workbench .part.sidebar .monaco-tree-sticky-row:hover {
  background-color: ${hoverBg} !important;
}

/* Integrated Terminal Panel Transparency (lets agy CLI inside IDE show the wallpaper!) */
.monaco-workbench .part.panel .terminal-outer-container,
.monaco-workbench .part.panel .terminal-groups-container,
.monaco-workbench .part.panel .terminal-wrapper,
.monaco-workbench .part.panel .terminal,
.monaco-workbench .part.panel .xterm,
.monaco-workbench .part.panel .xterm-viewport,
.monaco-workbench .part.panel .xterm-screen,
.monaco-workbench .part.panel .pane-body.integrated-terminal {
  background: transparent !important;
  background-color: transparent !important;
}

/* Soften current-line border inside code editor */
.monaco-workbench .monaco-editor .view-overlays .current-line {
  border: none !important;
  background: rgba(var(--ag-accent-rgb), ${isLight ? '0.07' : '0.09'}) !important;
}

/* Editor Tabs, Breadcrumbs, Sticky Scroll, Minimap & Canvas */
.monaco-workbench .part.editor > .content .editor-group-container > .title {
  background: var(--ag-sidebar-bg) !important;
  background-color: var(--ag-sidebar-bg) !important;
  border-bottom: 1px solid var(--ag-border) !important;
}
.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-and-actions-container,
.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-breadcrumbs,
.monaco-workbench .part.editor > .content .editor-group-container > .title .monaco-breadcrumbs,
.monaco-workbench .part.editor > .content .editor-group-container > .title .breadcrumbs-control,
.monaco-workbench .part.editor > .content .editor-group-container > .title .tab {
  background: transparent !important;
  background-color: transparent !important;
}
.monaco-workbench .part.editor > .content .editor-group-container > .title .tab .label-name {
  color: var(--ag-text-secondary) !important;
}
.monaco-workbench .part.editor > .content .editor-group-container > .title .tab.active .label-name {
  color: var(--ag-text-primary) !important;
}
${hasWallpaper ? `.monaco-workbench .part.editor,
.monaco-workbench .part.editor > .content,
.monaco-workbench .editor-group-container.empty,
.monaco-workbench .part.auxiliarybar,
.monaco-workbench .part.auxiliarybar > .content,
.monaco-workbench iframe.webview {
  background: transparent !important;
  background-color: transparent !important;
}
.monaco-workbench .editor-group-container:not(.empty) {
  background: var(--ag-editor-bg) !important;
}
.monaco-workbench .editor-group-container:not(.empty) .editor-container,
.monaco-workbench .editor-group-container:not(.empty) .monaco-editor,
.monaco-workbench .editor-group-container:not(.empty) .monaco-editor-background,
.monaco-workbench .editor-group-container:not(.empty) .monaco-editor .margin,
.monaco-workbench .editor-group-container:not(.empty) .monaco-editor .minimap,
.monaco-workbench .editor-group-container:not(.empty) .monaco-editor .minimap canvas,
.monaco-workbench .editor-group-container:not(.empty) .monaco-editor .decorationsOverviewRuler {
  background: transparent !important;
  background-color: transparent !important;
}
.monaco-workbench .monaco-editor .sticky-widget,
.monaco-workbench .monaco-editor .sticky-widget-line-numbers,
.monaco-workbench .monaco-editor .sticky-widget-lines {
  background: var(--ag-sidebar-bg) !important;
  background-color: var(--ag-sidebar-bg) !important;
  border-bottom: 1px solid var(--ag-border) !important;
}` : ''}
.monaco-workbench .monaco-editor .view-lines, .monaco-workbench .monaco-editor .margin-view-overlays {
  font-family: var(--ag-font-mono) !important;
}`);

    // Deep Workbench Polish: Frosted Command Palette, IntelliSense, Hover, Notifications, Menus
    if (frostedPopups) {
      sections.push(`.monaco-workbench .quick-input-widget {
  background: var(--ag-popup-bg) !important;
  border: 1px solid var(--ag-border) !important;
  border-radius: var(--ag-radius) !important;
  box-shadow: ${popupShadow} !important;
  overflow: hidden !important;
  ${blurCss}
}
.monaco-workbench .quick-input-widget .monaco-list,
.monaco-workbench .quick-input-widget .monaco-list-rows {
  background: transparent !important;
}
.monaco-workbench .monaco-editor .suggest-widget,
.monaco-workbench .monaco-editor .monaco-hover,
.monaco-workbench .notifications-toasts .notification-toast,
.monaco-workbench .monaco-menu-container .monaco-menu {
  background: var(--ag-popup-bg) !important;
  border: 1px solid var(--ag-border) !important;
  border-radius: calc(var(--ag-radius) - 2px) !important;
  box-shadow: ${popupShadow} !important;
  ${blurCss}
}
.monaco-workbench .monaco-editor .suggest-widget .monaco-list,
.monaco-workbench .monaco-editor .suggest-widget .monaco-list-rows {
  background: transparent !important;
}`);
    }

    // Deep Workbench Polish: Rounded Explorer Tree Rows
    if (config.roundedTreeRows !== false) {
      sections.push(`.monaco-workbench .part.sidebar .monaco-list-row {
  border-radius: 6px !important;
  width: calc(100% - 12px) !important;
  left: 6px !important;
}`);
    }

    // Deep Workbench Polish: Smooth Typing Caret
    if (config.smoothCursor !== false) {
      sections.push(`.monaco-workbench .monaco-editor .cursors-layer .cursor {
  transition: left 75ms cubic-bezier(0.22, 1, 0.36, 1), top 75ms cubic-bezier(0.22, 1, 0.36, 1) !important;
  border-radius: 2px !important;
}`);
    }

    // Optional Clutter Reduction
    if (config.hideMinimap) {
      sections.push(`.monaco-workbench .monaco-editor .minimap { display: none !important; }`);
    }
    if (config.compactBreadcrumbs) {
      sections.push(`.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-breadcrumbs { display: none !important; }`);
    }

    // Clean Tab Styles (normal stock tabs by default; optional underline or top-line accent)
    if (config.tabsStyle === 'underline') {
      sections.push(`.monaco-workbench .part.editor > .content .editor-group-container > .title .tab .tab-border-top-container { display: none !important; }
.monaco-workbench .part.editor > .content .editor-group-container > .title .tab.active { box-shadow: inset 0 -2px 0 0 var(--ag-accent) !important; }`);
    } else if (config.tabsStyle === 'minimal') {
      sections.push(`.monaco-workbench .part.editor > .content .editor-group-container > .title .tab .tab-border-bottom-container { display: none !important; }
.monaco-workbench .part.editor > .content .editor-group-container > .title .tab { border-right: 1px solid var(--ag-border) !important; }
.monaco-workbench .part.editor > .content .editor-group-container > .title .tab.active { border-top: 2px solid var(--ag-accent) !important; }`);
    }

    if (config.activityBarStyle === 'subtle' || config.activityBarStyle === 'accent') {
      sections.push(`.monaco-workbench .part.activitybar .action-item.checked .active-item-indicator::before { border-left-color: var(--ag-accent) !important; }`);
    }
    if (config.activityBarStyle === 'accent') {
      sections.push(`.monaco-workbench .part.activitybar .action-item.checked .action-label { color: var(--ag-accent) !important; }`);
    }
  }

  // 5. Animation preset
  const animCss = buildAnimationCss(config.animationPreset, accentRgb);
  if (animCss) sections.push(animCss);

  // 6. User .theme.css + Theme Packs + Online CSS + QuickCSS
  if (userCss && userCss.trim()) {
    sections.push(userCss.trim());
  }

  return sections.join('\n\n');
}

function buildExportThemeCss(config, meta = {}) {
  const ramp = getSurfaceRamp(config);
  const accentRgb = hexToRgbString(config.accentColor || '#3b82f6');
  const name = meta.name || 'My Antigravity Theme';
  const author = meta.author || 'User';
  const description = meta.description || 'Exported from Antigravity Themes';

  return `/**
 * @name ${name}
 * @author ${author}
 * @version 1.0.0
 * @description ${description}
 * @colorMode ${config.colorMode === 'light' ? 'light' : 'dark'}
 * @surfaceTint ${config.surfaceTint || 'graphite'}
 * @accent ${config.accentColor || '#3b82f6'}
 */

:root {
  --ag-accent: ${config.accentColor || '#3b82f6'};
  --ag-accent-rgb: ${accentRgb};
  --ag-surface-rgb: ${ramp.rgb};
  --ag-radius: ${Number(config.cornerRadius ?? 10)}px;
  --ag-chat-font-size: ${Number(config.chatFontSize) || 14}px;
}

/* Customize .monaco-workbench (IDE) or .agy-shell (App & Chat) below */
`;
}

module.exports = { compileStylesheet, buildExportThemeCss, buildAnimationCss };
