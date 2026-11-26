'use strict';

const DEFAULT_CLI_CONFIG = Object.freeze({
  schemaVersion: 2,
  enabled: false,
  presetId: 'tokyo-night', // 'custom' | 'tokyo-night' | 'catppuccin-mocha' | 'rose-pine' | 'nord-frost' | 'gruvbox-dark' | 'cyberpunk-neon' | 'dracula' | 'github-light'
  colorScheme: 'terminal',
  runningLightSpeed: 'medium',
  altScreenMode: 'auto', // 'auto' | 'always' | 'never'
  statusLineEnabled: true,
  statusLinePreset: 'powerline', // 'minimal' | 'powerline' | 'compact-mono' | 'bordered' | 'badges'
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
  terminalCursorShape: 'bar', // 'bar' | 'filledBox' | 'emptyBox' | 'underscore' | 'vintage'
  terminalPadding: 12,
  terminalOpacity: 88,
  terminalAcrylic: true,
  terminalRetroEffect: false,
  terminalSyncThemeWallpaper: false,
  terminalApplyToDefaultProfile: true,
  terminalBgImage: '',
  terminalBgOpacity: 0.30,
  terminalBgStretch: 'uniformToFill', // 'uniformToFill' | 'uniform' | 'none'
  terminalBgAlignment: 'center', // 'center' | 'right' | 'bottomRight' | 'topRight'
});

const DEFAULT_CONFIG = Object.freeze({
  setupCompleted: false,
  enabled: true,
  applyToIde: true,
  applyToIdeChat: true,
  applyToApp: true,
  splitBrowserSafe: true,
  syncWindowControls: true,

  // Theme Engine (supports both *.theme.css files and pack folders)
  enabledThemes: ['pack:carbon-studio'],
  quickCssEnabled: true,
  quickCssLiveUpdate: true,
  onlineThemeUrls: [],

  // Visual Token Studio (--ag-* tokens)
  colorMode: 'dark', // 'dark' | 'light'
  accentColor: '#3b82f6',
  surfaceTint: 'graphite', // 'graphite' | 'ink' | 'warm'
  uiFont: 'inter',
  monoFont: 'jetbrains',
  customUiFontId: '',
  customMonoFontId: '',
  chatFontSize: 14,
  chatWidth: 'standard', // 'compact' | 'standard' | 'wide'
  chatBubbleStyle: 'glass', // 'glass' | 'minimal' | 'outlined' | 'floating'
  cornerRadius: 10,
  borderStyle: 'hairline', // 'hairline' | 'none' | 'accent'
  glassBlur: 12, // frosted blur px for popups, menus, composer, and glass cards

  // Animation preset
  animationPreset: 'none',

  // Chrome & Deep Workbench presets
  tabsStyle: 'default', // 'default' | 'underline' | 'minimal'
  activityBarStyle: 'subtle', // 'default' | 'subtle' | 'accent' | 'minimal'
  statusBarStyle: 'clean', // 'default' | 'clean' | 'minimal'
  frostedPopups: true,
  roundedTreeRows: true,
  smoothCursor: true,
  hideMinimap: false,
  compactBreadcrumbs: false,

  // Optional local image / GIF / short video backdrop
  wallpaperEnabled: false,
  wallpaperId: '',
  unifiedFullWindow: true,
  wallpaperBlur: 0,
  dimming: 24,
  sidebarOpacity: 58,
  chatOpacity: 60,
  editorOpacity: 66,
  videoFit: 'cover', // 'cover' | 'contain'
  videoSpeed: 1,
  videoVolume: 0,
  smartGpuPowerSaving: true,

  // agy CLI theming
  cli: DEFAULT_CLI_CONFIG,

  // App behavior (opt-in)
  autoApplyOnChange: true,
  minimizeToTray: true,
  autoStartLogin: false,
});

const ENUMS = {
  colorMode: new Set(['dark', 'light']),
  surfaceTint: new Set(['graphite', 'ink', 'warm']),
  uiFont: new Set(['inter', 'geist', 'be_vietnam', 'ibm_plex', 'system', 'custom']),
  monoFont: new Set(['jetbrains', 'cascadia', 'ibm_mono', 'system', 'custom']),
  chatWidth: new Set(['compact', 'standard', 'wide']),
  chatBubbleStyle: new Set(['glass', 'minimal', 'outlined', 'floating']),
  borderStyle: new Set(['hairline', 'none', 'accent']),
  animationPreset: new Set([
    'none',
    'sakura',
    'rain',
    'stars',
    'ken-burns',
    'tab-slide',
    'ambient-shift',
    'cursor-pulse',
    'aurora-edge',
  ]),
  tabsStyle: new Set(['default', 'underline', 'minimal']),
  activityBarStyle: new Set(['default', 'subtle', 'accent', 'minimal']),
  statusBarStyle: new Set(['default', 'clean', 'minimal']),
  videoFit: new Set(['cover', 'contain']),
};

const CLI_ENUMS = {
  presetId: new Set([
    'custom',
    'tokyo-night',
    'catppuccin-mocha',
    'rose-pine',
    'nord-frost',
    'gruvbox-dark',
    'cyberpunk-neon',
    'dracula',
    'github-light',
  ]),
  colorScheme: new Set([
    'terminal',
    'dark',
    'light',
    'tokyo night',
    'solarized dark',
    'solarized light',
    'colorblind-friendly dark',
    'colorblind-friendly light',
  ]),
  runningLightSpeed: new Set(['fast', 'medium', 'slow', 'off']),
  altScreenMode: new Set(['auto', 'always', 'never']),
  statusLinePreset: new Set(['minimal', 'powerline', 'compact-mono', 'bordered', 'badges']),
  terminalCursorShape: new Set(['bar', 'filledBox', 'emptyBox', 'underscore', 'vintage']),
  terminalBgStretch: new Set(['uniformToFill', 'uniform', 'none']),
  terminalBgAlignment: new Set(['center', 'right', 'bottomRight', 'topRight']),
};

const RANGES = {
  chatFontSize: [12, 18],
  cornerRadius: [0, 20],
  glassBlur: [0, 24],
  wallpaperBlur: [0, 28],
  dimming: [0, 95],
  sidebarOpacity: [0, 100],
  chatOpacity: [0, 100],
  editorOpacity: [0, 100],
  videoSpeed: [0.25, 2.5],
  videoVolume: [0, 100],
};

const SURFACE_RAMPS = {
  dark: {
    graphite: { rgb: '20, 20, 21', hex: '#141415', raisedHex: '#19191b', textPrimary: '#ededed', textSecondary: '#a1a1a6', textMuted: '#85858b' },
    ink: { rgb: '11, 13, 20', hex: '#0b0d14', raisedHex: '#11141c', textPrimary: '#eef0f5', textSecondary: '#a3a9b8', textMuted: '#7a8296' },
    warm: { rgb: '22, 21, 19', hex: '#161513', raisedHex: '#1c1a18', textPrimary: '#efe9de', textSecondary: '#aaa398', textMuted: '#8a847a' },
  },
  light: {
    graphite: { rgb: '250, 250, 250', hex: '#fafafa', raisedHex: '#ffffff', textPrimary: '#171717', textSecondary: '#525252', textMuted: '#737373' },
    ink: { rgb: '245, 247, 250', hex: '#f5f7fa', raisedHex: '#ffffff', textPrimary: '#111827', textSecondary: '#4b5565', textMuted: '#6b7487' },
    warm: { rgb: '247, 244, 238', hex: '#f7f4ee', raisedHex: '#fdfbf7', textPrimary: '#1f1b16', textSecondary: '#5e554a', textMuted: '#7b7266' },
  },
};

function clamp(val, min, max, fallback) {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function isValidHex(str) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(str || '').trim());
}

function isValidThemeId(str) {
  if (typeof str !== 'string') return false;
  const s = str.trim();
  if (!s || s.includes('..') || s.includes('/') || s.includes('\\')) return false;
  return s.endsWith('.theme.css') || s.startsWith('pack:');
}

function sanitizeCliPatch(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_CLI_CONFIG, k)) continue;
    const def = DEFAULT_CLI_CONFIG[k];
    if (typeof def === 'boolean') {
      out[k] = Boolean(v);
    } else if (k === 'schemaVersion') {
      out[k] = Math.round(clamp(v, 1, 99, 2));
    } else if (CLI_ENUMS[k]) {
      if (typeof v === 'string' && CLI_ENUMS[k].has(v)) out[k] = v;
    } else if (k === 'statusLinePadding') {
      out[k] = Math.round(clamp(v, 0, 3, 0));
    } else if (k === 'terminalFontSize') {
      out[k] = Math.round(clamp(v, 8, 24, 11));
    } else if (k === 'terminalLineHeight') {
      out[k] = Number(clamp(v, 1.0, 1.8, 1.2).toFixed(2));
    } else if (k === 'terminalPadding') {
      out[k] = Math.round(clamp(v, 0, 32, 12));
    } else if (k === 'terminalOpacity') {
      out[k] = Math.round(clamp(v, 30, 100, 88));
    } else if (k === 'terminalBgOpacity') {
      out[k] = Number(clamp(v, 0, 1, 0.3).toFixed(2));
    } else if (k === 'terminalFontFace') {
      if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 80);
    } else if (k === 'statusLinePrefix') {
      if (typeof v === 'string') out[k] = v.slice(0, 16);
    } else if (k === 'terminalBgImage') {
      if (typeof v === 'string') out[k] = v.trim().slice(0, 512);
    }
  }
  return out;
}

function sanitizeConfigPatch(rawPatch, currentCli = DEFAULT_CLI_CONFIG) {
  if (!rawPatch || typeof rawPatch !== 'object' || Array.isArray(rawPatch)) return {};
  const clean = {};

  for (const [key, val] of Object.entries(rawPatch)) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_CONFIG, key)) continue;
    const defVal = DEFAULT_CONFIG[key];

    if (key === 'cli') {
      const cliPatch = sanitizeCliPatch(val);
      if (cliPatch) clean.cli = { ...DEFAULT_CLI_CONFIG, ...currentCli, ...cliPatch };
    } else if (typeof defVal === 'boolean') {
      clean[key] = Boolean(val);
    } else if (key === 'accentColor') {
      if (isValidHex(val)) clean[key] = String(val).trim().toLowerCase();
    } else if (ENUMS[key]) {
      if (typeof val === 'string' && ENUMS[key].has(val)) clean[key] = val;
    } else if (RANGES[key]) {
      const [min, max] = RANGES[key];
      clean[key] = clamp(val, min, max, defVal);
    } else if (key === 'enabledThemes') {
      if (Array.isArray(val)) {
        clean[key] = [...new Set(val.filter(isValidThemeId).map((s) => s.trim()))];
      }
    } else if (key === 'onlineThemeUrls') {
      if (Array.isArray(val)) {
        clean[key] = [...new Set(
          val.map((s) => String(s || '').trim()).filter((u) => /^https:\/\/[^\s]+$/i.test(u))
        )].slice(0, 20);
      }
    } else if (key === 'wallpaperId' || key === 'customUiFontId' || key === 'customMonoFontId') {
      if (typeof val === 'string') clean[key] = val.slice(0, 128);
    }
  }
  return clean;
}

function parseRgbTriple(rgbStr, fallback = [20, 20, 21]) {
  const parts = String(rgbStr || '').split(',').map((n) => parseInt(n.trim(), 10));
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return parts.map((n) => Math.max(0, Math.min(255, n)));
  }
  return fallback;
}

function parseHexTriple(hexStr, fallback = [59, 130, 246]) {
  const m = String(hexStr || '').trim().replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return fallback;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hexToRgbString(hexStr) {
  return parseHexTriple(hexStr).join(', ');
}

function toHexColor(r, g, b) {
  const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function getSurfaceRamp(config) {
  const mode = config?.colorMode === 'light' ? 'light' : 'dark';
  const tint = SURFACE_RAMPS[mode][config?.surfaceTint] ? config.surfaceTint : 'graphite';
  return SURFACE_RAMPS[mode][tint];
}

module.exports = {
  DEFAULT_CONFIG,
  DEFAULT_CLI_CONFIG,
  SURFACE_RAMPS,
  sanitizeConfigPatch,
  sanitizeCliPatch,
  parseRgbTriple,
  parseHexTriple,
  hexToRgbString,
  toHexColor,
  getSurfaceRamp,
};
