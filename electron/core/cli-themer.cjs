'use strict';

const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { getSurfaceRamp, parseHexTriple } = require('./defaults.cjs');

/**
 * Standalone Antigravity CLI (agy) theming engine:
 *  1. 8 built-in standalone terminal color presets (zero IDE dependency)
 *  2. Official ~/.gemini/antigravity-cli/settings.json (colorScheme, runningLightSpeed, altScreenMode, statusLine)
 *  3. Modular ANSI statusLine generator + live Node self-test
 *  4. JSONC-safe Windows Terminal sync (dedicated "Antigravity CLI" profile + opt-in defaults sync + backup restore)
 *  5. Cross-platform config generators (Ghostty, WezTerm, Kitty, Alacritty)
 */

const CLI_THEME_PRESETS = Object.freeze({
  'tokyo-night': {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    tagline: 'Deep twilight indigo with crisp blue and cyan ANSI accents',
    mode: 'dark',
    accent: '#7aa2f7',
    agyColorScheme: 'terminal',
    recommendedPack: 'rainy-window',
    palette: {
      name: 'Antigravity CLI Theme',
      background: '#1a1b26',
      foreground: '#c0caf5',
      cursorColor: '#7aa2f7',
      selectionBackground: '#33467c',
      black: '#15161e',
      red: '#f7768e',
      green: '#9ece6a',
      yellow: '#e0af68',
      blue: '#7aa2f7',
      purple: '#bb9af7',
      cyan: '#7dcfff',
      white: '#a9b1d6',
      brightBlack: '#414868',
      brightRed: '#f7768e',
      brightGreen: '#9ece6a',
      brightYellow: '#e0af68',
      brightBlue: '#7aa2f7',
      brightPurple: '#bb9af7',
      brightCyan: '#7dcfff',
      brightWhite: '#c0caf5',
    },
  },
  'catppuccin-mocha': {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    tagline: 'Warm pastel lavender, peach, and teal on velvety midnight slate',
    mode: 'dark',
    accent: '#cba6f7',
    agyColorScheme: 'terminal',
    recommendedPack: 'balcony-night',
    palette: {
      name: 'Antigravity CLI Theme',
      background: '#1e1e2e',
      foreground: '#cdd6f4',
      cursorColor: '#f5e0dc',
      selectionBackground: '#45475a',
      black: '#45475a',
      red: '#f38ba8',
      green: '#a6e3a1',
      yellow: '#f9e2af',
      blue: '#89b4fa',
      purple: '#cba6f7',
      cyan: '#94e2d5',
      white: '#bac2de',
      brightBlack: '#585b70',
      brightRed: '#f38ba8',
      brightGreen: '#a6e3a1',
      brightYellow: '#f9e2af',
      brightBlue: '#89b4fa',
      brightPurple: '#f5c2e7',
      brightCyan: '#94e2d5',
      brightWhite: '#a6adc8',
    },
  },
  'rose-pine': {
    id: 'rose-pine',
    name: 'Rose Pine',
    tagline: 'Muted dusky plum with soft rose, gold, and pine highlights',
    mode: 'dark',
    accent: '#ebbcba',
    agyColorScheme: 'terminal',
    recommendedPack: 'dusk-windmills',
    palette: {
      name: 'Antigravity CLI Theme',
      background: '#191724',
      foreground: '#e0def4',
      cursorColor: '#ebbcba',
      selectionBackground: '#403d52',
      black: '#26233a',
      red: '#eb6f92',
      green: '#31748f',
      yellow: '#f6c177',
      blue: '#9ccfd8',
      purple: '#c4a7e7',
      cyan: '#ebbcba',
      white: '#e0def4',
      brightBlack: '#6e6a86',
      brightRed: '#eb6f92',
      brightGreen: '#31748f',
      brightYellow: '#f6c177',
      brightBlue: '#9ccfd8',
      brightPurple: '#c4a7e7',
      brightCyan: '#ebbcba',
      brightWhite: '#e0def4',
    },
  },
  'nord-frost': {
    id: 'nord-frost',
    name: 'Nord Frost',
    tagline: 'Clean arctic polar night with frost cyan and soft ice blues',
    mode: 'dark',
    accent: '#88c0d0',
    agyColorScheme: 'terminal',
    recommendedPack: 'fuji-twilight',
    palette: {
      name: 'Antigravity CLI Theme',
      background: '#2e3440',
      foreground: '#d8dee9',
      cursorColor: '#88c0d0',
      selectionBackground: '#434c5e',
      black: '#3b4252',
      red: '#bf616a',
      green: '#a3be8c',
      yellow: '#ebcb8b',
      blue: '#81a1c1',
      purple: '#b48ead',
      cyan: '#88c0d0',
      white: '#e5e9f0',
      brightBlack: '#4c566a',
      brightRed: '#bf616a',
      brightGreen: '#a3be8c',
      brightYellow: '#ebcb8b',
      brightBlue: '#81a1c1',
      brightPurple: '#b48ead',
      brightCyan: '#8fbcbb',
      brightWhite: '#eceff4',
    },
  },
  'gruvbox-dark': {
    id: 'gruvbox-dark',
    name: 'Gruvbox Dark',
    tagline: 'Retro warm espresso tones with crisp golden amber and coral',
    mode: 'dark',
    accent: '#fabd2f',
    agyColorScheme: 'terminal',
    recommendedPack: 'tokyo-tower-rain',
    palette: {
      name: 'Antigravity CLI Theme',
      background: '#282828',
      foreground: '#ebdbb2',
      cursorColor: '#fabd2f',
      selectionBackground: '#504945',
      black: '#282828',
      red: '#cc241d',
      green: '#98971a',
      yellow: '#d79921',
      blue: '#458588',
      purple: '#b16286',
      cyan: '#689d6a',
      white: '#a89984',
      brightBlack: '#928374',
      brightRed: '#fb4934',
      brightGreen: '#b8bb26',
      brightYellow: '#fabd2f',
      brightBlue: '#83a598',
      brightPurple: '#d3869b',
      brightCyan: '#8ec07c',
      brightWhite: '#ebdbb2',
    },
  },
  'cyberpunk-neon': {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Cyan',
    tagline: 'Deep obsidian terminal with vivid electric cyan and rose',
    mode: 'dark',
    accent: '#22d3ee',
    agyColorScheme: 'terminal',
    recommendedPack: 'cozy-rain-live',
    palette: {
      name: 'Antigravity CLI Theme',
      background: '#0d1017',
      foreground: '#e2e8f0',
      cursorColor: '#22d3ee',
      selectionBackground: '#1e3a5f',
      black: '#151924',
      red: '#fb7185',
      green: '#34d399',
      yellow: '#fbbf24',
      blue: '#38bdf8',
      purple: '#c084fc',
      cyan: '#22d3ee',
      white: '#cbd5e1',
      brightBlack: '#475569',
      brightRed: '#fda4af',
      brightGreen: '#6ee7b7',
      brightYellow: '#fde047',
      brightBlue: '#7dd3fc',
      brightPurple: '#d8b4fe',
      brightCyan: '#67e8f9',
      brightWhite: '#f8fafc',
    },
  },
  dracula: {
    id: 'dracula',
    name: 'Dracula',
    tagline: 'Classic dark purple contrast with vibrant emerald and pink',
    mode: 'dark',
    accent: '#bd93f9',
    agyColorScheme: 'terminal',
    recommendedPack: 'comet-lake',
    palette: {
      name: 'Antigravity CLI Theme',
      background: '#282a36',
      foreground: '#f8f8f2',
      cursorColor: '#bd93f9',
      selectionBackground: '#44475a',
      black: '#21222c',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#bd93f9',
      purple: '#ff79c6',
      cyan: '#8be9fd',
      white: '#f8f8f2',
      brightBlack: '#6272a4',
      brightRed: '#ff6e6e',
      brightGreen: '#69ff94',
      brightYellow: '#ffffa5',
      brightBlue: '#d6acff',
      brightPurple: '#ff92df',
      brightCyan: '#a4ffff',
      brightWhite: '#ffffff',
    },
  },
  'github-light': {
    id: 'github-light',
    name: 'GitHub Light',
    tagline: 'Daytime crisp white terminal with high-contrast ink ANSI',
    mode: 'light',
    accent: '#0969da',
    agyColorScheme: 'light',
    recommendedPack: 'fuji-mono-light',
    palette: {
      name: 'Antigravity CLI Theme',
      background: '#ffffff',
      foreground: '#1f2328',
      cursorColor: '#0969da',
      selectionBackground: '#ddf4ff',
      black: '#24292f',
      red: '#cf222e',
      green: '#116329',
      yellow: '#4d2d00',
      blue: '#0969da',
      purple: '#8250df',
      cyan: '#1b7c83',
      white: '#6e7781',
      brightBlack: '#57606a',
      brightRed: '#a40e26',
      brightGreen: '#1a7f37',
      brightYellow: '#633c01',
      brightBlue: '#218bff',
      brightPurple: '#a475f9',
      brightCyan: '#3192aa',
      brightWhite: '#8c959f',
    },
  },
});

function stripJsonc(text) {
  let out = '';
  let inStr = false;
  let escape = false;
  let inLine = false;
  let inBlock = false;
  const s = String(text || '').replace(/^\uFEFF/, '');

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1];
    if (inLine) {
      if (ch === '\n') {
        inLine = false;
        out += ch;
      }
      continue;
    }
    if (inBlock) {
      if (ch === '*' && next === '/') {
        inBlock = false;
        i++;
      }
      continue;
    }
    if (inStr) {
      out += ch;
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      out += ch;
      continue;
    }
    if (ch === '/' && next === '/') {
      inLine = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlock = true;
      i++;
      continue;
    }
    out += ch;
  }
  return out.replace(/,\s*([}\]])/g, '$1');
}

function getAgyCliSettingsPath() {
  return path.join(os.homedir(), '.gemini', 'antigravity-cli', 'settings.json');
}

function getWindowsTerminalSettingsPaths() {
  if (process.platform !== 'win32') return [];
  const localApp = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const candidates = [
    path.join(localApp, 'Packages', 'Microsoft.WindowsTerminal_8wekyb3d8bbwe', 'LocalState', 'settings.json'),
    path.join(localApp, 'Packages', 'Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe', 'LocalState', 'settings.json'),
    path.join(localApp, 'Microsoft', 'Windows Terminal', 'settings.json'),
  ];
  return candidates.filter((p) => fs.existsSync(p));
}

function readJsonOrEmpty(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return {};
    return JSON.parse(stripJsonc(raw));
  } catch (_) {
    return null;
  }
}

function writeJsonWithBackup(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const bakPath = `${filePath}.agthemes.bak`;
  if (fs.existsSync(filePath) && !fs.existsSync(bakPath)) {
    try {
      fs.copyFileSync(filePath, bakPath);
    } catch (_) {}
  }
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, filePath);
}

const AGY_WT_PROFILE_GUID = '{a917a170-c110-4a91-9b0c-a917a1700001}';

const CLI_SHADER_PRESETS = Object.freeze([
  { id: 'none', name: 'None', file: '' },
  { id: 'subtle-vignette', name: 'Subtle Vignette', file: 'subtle-vignette.hlsl' },
  { id: 'soft-bloom', name: 'Soft Bloom', file: 'soft-bloom.hlsl' },
  { id: 'crt-scanlines', name: 'CRT Scanlines', file: 'crt-scanlines.hlsl' },
]);

let cachedFfmpegAvailable = null;

function isFfmpegAvailable() {
  if (cachedFfmpegAvailable !== null) return cachedFfmpegAvailable;
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore', timeout: 2500, windowsHide: true });
    cachedFfmpegAvailable = true;
  } catch (_) {
    cachedFfmpegAvailable = false;
  }
  return cachedFfmpegAvailable;
}

function resolveShaderSourcePath(fileName) {
  if (!fileName) return '';
  const candidates = [
    path.resolve(__dirname, '..', 'assets', 'shaders', fileName),
    process.resourcesPath ? path.join(process.resourcesPath, 'assets', 'shaders', fileName) : '',
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) || '';
}

/**
 * Copies the selected bundled .hlsl shader to persistent <appBaseDir>/cli/shaders/
 * so Windows Terminal keeps a valid path even after a portable .exe closes.
 */
function resolvePersistentShaderPath(shaderId, appBaseDir) {
  if (!shaderId || shaderId === 'none') return '';
  const meta = CLI_SHADER_PRESETS.find((s) => s.id === shaderId);
  if (!meta || !meta.file) return '';
  const srcPath = resolveShaderSourcePath(meta.file);
  if (!srcPath) return '';
  if (!appBaseDir) return srcPath;
  try {
    const destDir = path.join(appBaseDir, 'cli', 'shaders');
    fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, meta.file);
    fs.copyFileSync(srcPath, destPath);
    return destPath;
  } catch (_) {
    return srcPath;
  }
}

function resolveAgyExecutablePath() {
  if (process.platform === 'win32') {
    const localApp = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const candidates = [
      path.join(localApp, 'agy', 'bin', 'agy.exe'),
      path.join(localApp, 'Programs', 'agy', 'agy.exe'),
      path.join(os.homedir(), '.gemini', 'antigravity-cli', 'bin', 'agy.exe'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  }
  return 'agy';
}

/**
 * Resolves a Windows-Terminal-safe background image path (.png, .jpg, .gif).
 * - Migrates bundled .webp -> .jpg automatically
 * - Converts arbitrary user .webp files to cached .png via ffmpeg or nativeImage
 * - Converts user .mp4 / .webm / .mov short videos to cached looping .gif via ffmpeg
 */
function resolveTerminalBgImagePath(rawPath, appBaseDir) {
  if (!rawPath) return '';
  let candidate = path.resolve(rawPath);
  if (/\.webp$/i.test(candidate)) {
    const siblingJpg = candidate.replace(/\.webp$/i, '.jpg');
    if (fs.existsSync(siblingJpg)) return siblingJpg;
  }
  if (!fs.existsSync(candidate)) return '';

  const ext = path.extname(candidate).toLowerCase();
  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.gif') {
    return candidate;
  }

  if (!appBaseDir) return candidate;

  const isVideo = ext === '.mp4' || ext === '.webm' || ext === '.mov' || ext === '.m4v';
  if (isVideo) {
    try {
      const stat = fs.statSync(candidate);
      const cliDir = path.join(appBaseDir, 'cli');
      fs.mkdirSync(cliDir, { recursive: true });
      const baseSlug = path
        .basename(candidate, ext)
        .replace(/[^a-z0-9-_]/gi, '-')
        .slice(0, 32);
      const outGif = path.join(cliDir, `terminal-bg-${baseSlug}-${Math.round(stat.mtimeMs)}.gif`);
      if (fs.existsSync(outGif) && fs.statSync(outGif).size > 0) return outGif;

      for (const f of fs.readdirSync(cliDir)) {
        if (f.startsWith('terminal-bg-') && f.endsWith('.gif')) {
          try { fs.unlinkSync(path.join(cliDir, f)); } catch (_) {}
        }
      }

      execFileSync(
        'ffmpeg',
        [
          '-y',
          '-loglevel',
          'error',
          '-t',
          '4.5',
          '-i',
          candidate,
          '-vf',
          'fps=12,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=160:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle',
          '-loop',
          '0',
          outGif,
        ],
        { timeout: 25000, windowsHide: true }
      );
      if (fs.existsSync(outGif) && fs.statSync(outGif).size > 0) return outGif;
    } catch (_) {}
    return '';
  }

  if (ext === '.webp') {
    try {
      const stat = fs.statSync(candidate);
      const cliDir = path.join(appBaseDir, 'cli');
      fs.mkdirSync(cliDir, { recursive: true });
      const baseSlug = path
        .basename(candidate, ext)
        .replace(/[^a-z0-9-_]/gi, '-')
        .slice(0, 32);
      const outPng = path.join(cliDir, `terminal-bg-${baseSlug}-${Math.round(stat.mtimeMs)}.png`);
      if (fs.existsSync(outPng)) return outPng;

      const cleanOld = () => {
        for (const f of fs.readdirSync(cliDir)) {
          if (f.startsWith('terminal-bg-') && f.endsWith('.png')) {
            try { fs.unlinkSync(path.join(cliDir, f)); } catch (_) {}
          }
        }
      };

      // Try ffmpeg first (decodes all WebP reliably on Windows)
      try {
        cleanOld();
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', candidate, outPng], {
          timeout: 8000,
          windowsHide: true,
        });
        if (fs.existsSync(outPng) && fs.statSync(outPng).size > 0) return outPng;
      } catch (_) {}

      // Fallback to Electron nativeImage
      try {
        const { nativeImage } = require('electron');
        const img = nativeImage.createFromPath(candidate);
        if (img && !img.isEmpty()) {
          cleanOld();
          fs.writeFileSync(outPng, img.toPNG());
          return outPng;
        }
      } catch (_) {}
    } catch (_) {}
  }
  return candidate;
}

function getCliPresetsList() {
  return Object.values(CLI_THEME_PRESETS);
}

/**
 * Builds active 16-color ANSI palette from either a standalone CLI preset or custom theme colors.
 */
function buildAnsiPalette(config) {
  const presetId = config?.cli?.presetId;
  if (presetId && presetId !== 'custom' && CLI_THEME_PRESETS[presetId]) {
    return { ...CLI_THEME_PRESETS[presetId].palette };
  }

  const isLight = config?.colorMode === 'light';
  const ramp = getSurfaceRamp(config);
  const accent = config?.accentColor || '#3b82f6';
  const custom =
    presetId === 'custom' && config?.cli?.customPalette && typeof config.cli.customPalette === 'object'
      ? config.cli.customPalette
      : {};

  if (isLight) {
    return {
      name: 'Antigravity CLI Theme',
      background: ramp.hex,
      foreground: ramp.textPrimary,
      cursorColor: accent,
      selectionBackground: '#dbeafe',
      black: '#1f2328',
      red: '#cf222e',
      green: '#1a7f37',
      yellow: '#9a6700',
      blue: accent,
      purple: '#8250df',
      cyan: '#0e7490',
      white: '#6e7781',
      brightBlack: '#57606a',
      brightRed: '#a40e26',
      brightGreen: '#2da44e',
      brightYellow: '#bf8700',
      brightBlue: accent,
      brightPurple: '#a475f9',
      brightCyan: '#0891b2',
      brightWhite: '#171717',
      ...custom,
      name: 'Antigravity CLI Theme',
    };
  }

  return {
    name: 'Antigravity CLI Theme',
    background: ramp.hex,
    foreground: ramp.textPrimary,
    cursorColor: accent,
    selectionBackground: '#264f78',
    black: '#18181b',
    red: '#e5484d',
    green: '#4cc38a',
    yellow: '#e5a93c',
    blue: accent,
    purple: '#9e8cfc',
    cyan: '#36b5c5',
    white: '#d4d4d8',
    brightBlack: '#71717a',
    brightRed: '#f26d72',
    brightGreen: '#68d39f',
    brightYellow: '#f0be5b',
    brightBlue: accent,
    brightPurple: '#b8a9ff',
    brightCyan: '#56ccd9',
    brightWhite: '#f4f4f5',
    ...custom,
    name: 'Antigravity CLI Theme',
  };
}

function getCliAccentHex(config) {
  const presetId = config?.cli?.presetId;
  if (presetId && presetId !== 'custom' && CLI_THEME_PRESETS[presetId]) {
    return CLI_THEME_PRESETS[presetId].accent;
  }
  if (presetId === 'custom' && config?.cli?.customPalette?.blue) {
    return config.cli.customPalette.blue;
  }
  return config?.accentColor || '#3b82f6';
}

/**
 * Generates a self-contained Node.js statusLine script for ~/.gemini/antigravity-cli/settings.json.
 */
function generateStatusLineScript(preset, accentHex, opts = {}) {
  const [r, g, b] = parseHexTriple(accentHex || '#7aa2f7');
  const showModel = opts.showModel !== false;
  const showFolder = opts.showFolder !== false;
  const showBranch = opts.showBranch !== false;
  const showCtxBar = opts.showContextBar !== false;
  const showClock = Boolean(opts.showClock);
  const prefix = String(opts.prefix ?? '◆').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  return `'use strict';
// Generated by Antigravity Themes (preset: ${preset})
const path = require('path');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let data = {};
  try { data = JSON.parse(raw || '{}'); } catch (_) {}

  const cwd = data.cwd || data.workspace || process.cwd();
  const folder = path.basename(cwd) || cwd;
  const model = data.model?.display_name || data.model?.name || data.model || 'Antigravity';
  const branch = data.git?.branch || data.branch || '';
  const ctxPct = data.context_window?.used_percentage ?? data.contextPercentage ?? null;
  const now = new Date();
  const clock = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

  const RST = '\\x1b[0m';
  const FG_ACCENT = '\\x1b[38;2;${r};${g};${b}m';
  const BG_ACCENT = '\\x1b[48;2;${r};${g};${b}m';
  const FG_DARK = '\\x1b[38;2;15;15;18m';
  const FG_MUTED = '\\x1b[38;2;148;154;170m';
  const FG_TEXT = '\\x1b[38;2;237;237;242m';
  const FG_WARN = '\\x1b[38;2;245;158;11m';
  const FG_CRIT = '\\x1b[38;2;244;63;94m';
  const BG_RAISED = '\\x1b[48;2;34;36;46m';

  const prefix = '${prefix}';
  const showModel = ${showModel ? 'true' : 'false'};
  const showFolder = ${showFolder ? 'true' : 'false'};
  const showBranch = ${showBranch ? 'true' : 'false'};
  const showBar = ${showCtxBar ? 'true' : 'false'};
  const showClock = ${showClock ? 'true' : 'false'};

  let ctxText = '';
  if (ctxPct !== null) {
    const pct = Math.max(0, Math.min(100, Math.round(ctxPct)));
    const barColor = pct >= 85 ? FG_CRIT : (pct >= 70 ? FG_WARN : FG_ACCENT);
    if (showBar) {
      const filled = Math.round(pct / 12.5);
      ctxText = barColor + '█'.repeat(filled) + FG_MUTED + '░'.repeat(8 - filled) + ' ' + pct + '%' + RST;
    } else {
      ctxText = barColor + 'ctx ' + pct + '%' + RST;
    }
  }

  const labelModel = (prefix ? prefix + ' ' : '') + model;
  const loc = (showFolder ? folder : '') + (showBranch && branch ? (showFolder ? ' (' + branch + ')' : branch) : '');

  if ('${preset}' === 'powerline') {
    const parts = [];
    if (showModel) parts.push(BG_ACCENT + FG_DARK + ' ' + labelModel + ' ' + RST);
    if (loc) parts.push(BG_RAISED + FG_TEXT + ' ' + loc + ' ' + RST);
    if (ctxText) parts.push(' ' + ctxText);
    if (showClock) parts.push(FG_MUTED + ' ' + clock + RST);
    process.stdout.write(parts.join(' ') + '\\n');
  } else if ('${preset}' === 'badges') {
    const parts = [];
    if (showModel) parts.push(FG_ACCENT + '[' + labelModel + ']' + RST);
    if (loc) parts.push(FG_TEXT + '[' + loc + ']' + RST);
    if (ctxText) parts.push(ctxText);
    if (showClock) parts.push(FG_MUTED + clock + RST);
    process.stdout.write(parts.join('  ') + '\\n');
  } else if ('${preset}' === 'bordered') {
    const segs = [];
    if (showModel) segs.push(FG_ACCENT + labelModel + RST);
    if (showFolder) segs.push(FG_TEXT + folder + RST);
    if (showBranch && branch) segs.push(FG_MUTED + branch + RST);
    if (ctxText) segs.push(ctxText);
    if (showClock) segs.push(FG_MUTED + clock + RST);
    process.stdout.write(FG_MUTED + '[' + RST + ' ' + segs.join(FG_MUTED + ' | ' + RST) + ' ' + FG_MUTED + ']' + RST + '\\n');
  } else if ('${preset}' === 'compact-mono') {
    const segs = [];
    if (showModel) segs.push(FG_ACCENT + labelModel + RST);
    if (showFolder) segs.push(FG_MUTED + folder + RST);
    if (showBranch && branch) segs.push(FG_MUTED + '@' + branch + RST);
    if (ctxText) segs.push(ctxText);
    if (showClock) segs.push(FG_MUTED + clock + RST);
    process.stdout.write(segs.join('  ') + '\\n');
  } else {
    const segs = [];
    if (showFolder) segs.push(FG_TEXT + folder + RST);
    if (showModel) segs.push(FG_ACCENT + labelModel + RST);
    if (showBranch && branch) segs.push(FG_MUTED + branch + RST);
    if (ctxText) segs.push(ctxText);
    if (showClock) segs.push(FG_MUTED + clock + RST);
    process.stdout.write(segs.join(FG_MUTED + ' · ' + RST) + '\\n');
  }
});
`;
}

function getCliStatus() {
  const settingsPath = getAgyCliSettingsPath();
  const exists = fs.existsSync(settingsPath);
  const current = exists ? readJsonOrEmpty(settingsPath) : {};
  const wtPaths = getWindowsTerminalSettingsPaths();

  let wtProfileInstalled = false;
  let wtHasBackup = false;
  if (wtPaths.length > 0) {
    wtHasBackup = fs.existsSync(`${wtPaths[0]}.agthemes.bak`);
    const wt = readJsonOrEmpty(wtPaths[0]);
    const list = wt?.profiles?.list || [];
    wtProfileInstalled = list.some((p) => p && p.name === 'Antigravity CLI');
  }

  const home = os.homedir();
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
  const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
  const detectedTerminals = {
    ghostty: fs.existsSync(path.join(xdgConfig, 'ghostty')) || fs.existsSync(path.join(appData, 'ghostty')),
    wezterm: fs.existsSync(path.join(home, '.wezterm.lua')) || fs.existsSync(path.join(xdgConfig, 'wezterm')),
    kitty: fs.existsSync(path.join(xdgConfig, 'kitty')),
    alacritty: fs.existsSync(path.join(xdgConfig, 'alacritty')) || fs.existsSync(path.join(appData, 'alacritty')),
  };

  return {
    settingsPath,
    settingsExists: exists,
    currentColorScheme: current?.colorScheme || 'terminal',
    currentSpeed: current?.runningLightSpeed || 'medium',
    currentAltScreen: current?.altScreenMode || 'auto',
    hasCustomStatusLine: Boolean(current?.statusLine?.enabled && current?.statusLine?.command),
    windowsTerminalDetected: wtPaths.length > 0,
    windowsTerminalPath: wtPaths[0] || null,
    wtProfileInstalled,
    wtHasBackup,
    ffmpegAvailable: isFfmpegAvailable(),
    detectedTerminals,
  };
}

function formatStatusLineCommand(scriptPath) {
  let cleanPath = path.resolve(scriptPath);
  if (process.platform === 'win32' && /\s/.test(cleanPath)) {
    // Convert spaced Windows paths to 8.3 short path so agy's whitespace-split runner needs no quotes
    try {
      const shortOut = execFileSync(
        'cmd.exe',
        ['/d', '/c', `for %I in ("${cleanPath}") do @echo %~sI`],
        { encoding: 'utf8', timeout: 2000, windowsHide: true }
      ).trim();
      if (shortOut && !/\s/.test(shortOut) && fs.existsSync(shortOut)) {
        cleanPath = shortOut;
      }
    } catch (_) {}
  }
  return `node ${cleanPath.replace(/\\/g, '/')}`;
}

function repairQuotedStatusLineIfNeeded() {
  const settingsPath = getAgyCliSettingsPath();
  if (!fs.existsSync(settingsPath)) return false;
  const existing = readJsonOrEmpty(settingsPath);
  const cmd = existing?.statusLine?.command;
  if (typeof cmd !== 'string') return false;
  const m = cmd.match(/^node\s+"([^"]*agthemes-statusline\.cjs)"$/i);
  if (!m) return false;
  existing.statusLine = { ...existing.statusLine, command: formatStatusLineCommand(m[1]) };
  writeJsonWithBackup(settingsPath, existing);
  return true;
}

function applyAgyCliSettings(config) {
  const cli = config?.cli || {};
  const settingsPath = getAgyCliSettingsPath();
  const existing = readJsonOrEmpty(settingsPath);
  if (existing === null) {
    return { ok: false, error: 'Existing ~/.gemini/antigravity-cli/settings.json contains invalid JSON.' };
  }

  const next = { ...existing };
  next.colorScheme = cli.colorScheme || 'terminal';
  next.runningLightSpeed = cli.runningLightSpeed || 'medium';
  if (cli.altScreenMode && cli.altScreenMode !== 'auto') {
    next.altScreenMode = cli.altScreenMode;
  } else {
    delete next.altScreenMode;
  }

  if (cli.statusLineEnabled) {
    const cliDir = path.dirname(settingsPath);
    fs.mkdirSync(cliDir, { recursive: true });
    const scriptPath = path.join(cliDir, 'agthemes-statusline.cjs');
    fs.writeFileSync(
      scriptPath,
      generateStatusLineScript(cli.statusLinePreset || 'powerline', getCliAccentHex(config), {
        showModel: cli.statusLineShowModel !== false,
        showFolder: cli.statusLineShowFolder !== false,
        showBranch: cli.statusLineShowBranch !== false,
        showContextBar: cli.statusLineShowContextBar !== false,
        showClock: Boolean(cli.statusLineShowClock),
        prefix: cli.statusLinePrefix ?? '◆',
      }),
      'utf8'
    );
    next.statusLine = {
      type: 'command',
      command: formatStatusLineCommand(scriptPath),
      enabled: true,
      padding: Number(cli.statusLinePadding) || 0,
      stack_with_default: Boolean(cli.statusLineStackWithDefault),
    };
  } else if (next.statusLine && typeof next.statusLine === 'object') {
    next.statusLine = { ...next.statusLine, enabled: false };
  }

  writeJsonWithBackup(settingsPath, next);
  return { ok: true, settingsPath, status: getCliStatus() };
}

function testStatusLineScript(config) {
  const cli = config?.cli || {};
  const settingsPath = getAgyCliSettingsPath();
  const cliDir = path.dirname(settingsPath);
  fs.mkdirSync(cliDir, { recursive: true });
  const scriptPath = path.join(cliDir, 'agthemes-statusline.cjs');
  fs.writeFileSync(
    scriptPath,
    generateStatusLineScript(cli.statusLinePreset || 'powerline', getCliAccentHex(config), {
      showModel: cli.statusLineShowModel !== false,
      showFolder: cli.statusLineShowFolder !== false,
      showBranch: cli.statusLineShowBranch !== false,
      showContextBar: cli.statusLineShowContextBar !== false,
      showClock: Boolean(cli.statusLineShowClock),
      prefix: cli.statusLinePrefix ?? '◆',
    }),
    'utf8'
  );

  try {
    const sample = JSON.stringify({
      cwd: path.join(os.homedir(), 'antigravity-project'),
      model: { display_name: 'Gemini 4 Neon' },
      git: { branch: 'main' },
      context_window: { used_percentage: 28 },
    });
    const out = execFileSync('node', [scriptPath], { input: sample, encoding: 'utf8', timeout: 3000 });
    const plainText = out.replace(/\x1b\[[0-9;]*m/g, '').trim();
    return { ok: true, plainText, scriptPath };
  } catch (err) {
    return {
      ok: false,
      error: `Node.js is required in PATH for custom statusLine (${err.message}).`,
    };
  }
}

function resetAgyCliSettings() {
  const settingsPath = getAgyCliSettingsPath();
  if (!fs.existsSync(settingsPath)) return { ok: true, status: getCliStatus() };
  const existing = readJsonOrEmpty(settingsPath);
  if (existing === null) return { ok: false, error: 'Invalid JSON in CLI settings.json' };
  const next = { ...existing };
  delete next.colorScheme;
  delete next.runningLightSpeed;
  delete next.altScreenMode;
  delete next.statusLine;
  writeJsonWithBackup(settingsPath, next);
  return { ok: true, status: getCliStatus() };
}

/**
 * Syncs Windows Terminal: creates/updates "Antigravity CLI" profile (and optionally profiles.defaults).
 */
function syncWindowsTerminalProfile(config, appBaseDir = '') {
  const wtPaths = getWindowsTerminalSettingsPaths();
  if (!wtPaths.length) {
    return { ok: false, error: 'Windows Terminal settings.json not found on this machine.' };
  }

  const targetPath = wtPaths[0];
  const parsed = readJsonOrEmpty(targetPath);
  if (parsed === null) {
    return { ok: false, error: 'Could not parse Windows Terminal settings.json.' };
  }

  const cli = config?.cli || {};
  const scheme = buildAnsiPalette(config);

  if (!Array.isArray(parsed.schemes)) parsed.schemes = [];
  const schemeIdx = parsed.schemes.findIndex(
    (s) => s && (s.name === scheme.name || s.name === 'Antigravity Theme')
  );
  if (schemeIdx >= 0) parsed.schemes[schemeIdx] = scheme;
  else parsed.schemes.push(scheme);

  if (!parsed.profiles || typeof parsed.profiles !== 'object') parsed.profiles = {};
  if (!Array.isArray(parsed.profiles.list)) parsed.profiles.list = [];

  const resolvedShader = resolvePersistentShaderPath(cli.terminalShader, appBaseDir);
  const pad = Number(cli.terminalPadding ?? 12);
  const sharedStyle = {
    colorScheme: scheme.name,
    font: {
      face: cli.terminalFontFace || 'JetBrainsMono Nerd Font',
      size: Number(cli.terminalFontSize) || 11,
      cellHeight: String(cli.terminalLineHeight || 1.2),
    },
    cursorShape: cli.terminalCursorShape || 'bar',
    opacity: Number(cli.terminalOpacity) || 88,
    useAcrylic: Boolean(cli.terminalAcrylic),
    padding: `${pad}, ${Math.round(pad * 1.2)}, ${pad}, ${Math.round(pad * 1.2)}`,
    'experimental.retroTerminalEffect': Boolean(cli.terminalRetroEffect),
    'experimental.pixelShaderPath': resolvedShader || null,
  };

  const resolvedBg = resolveTerminalBgImagePath(cli.terminalBgImage, appBaseDir);
  if (resolvedBg && fs.existsSync(resolvedBg)) {
    sharedStyle.backgroundImage = resolvedBg;
    sharedStyle.backgroundImageOpacity = Number(cli.terminalBgOpacity ?? 0.3);
    sharedStyle.backgroundImageStretchMode = cli.terminalBgStretch || 'uniformToFill';
    sharedStyle.backgroundImageAlignment = cli.terminalBgAlignment || 'center';
  } else {
    sharedStyle.backgroundImage = null;
  }

  const profileObj = {
    guid: AGY_WT_PROFILE_GUID,
    name: 'Antigravity CLI',
    commandline: resolveAgyExecutablePath(),
    startingDirectory: '%USERPROFILE%',
    ...sharedStyle,
  };

  const profIdx = parsed.profiles.list.findIndex(
    (p) => p && (p.guid === AGY_WT_PROFILE_GUID || p.name === 'Antigravity CLI')
  );
  if (profIdx >= 0) {
    parsed.profiles.list[profIdx] = { ...parsed.profiles.list[profIdx], ...profileObj };
  } else {
    parsed.profiles.list.push(profileObj);
  }

  // Opt-in: apply theme to all default Windows Terminal tabs so typing `agy` anywhere is themed.
  // When turned off, cleanly revert only the keys written by Antigravity Themes.
  if (cli.terminalApplyToDefaultProfile) {
    parsed.profiles.defaults = {
      ...(parsed.profiles.defaults && typeof parsed.profiles.defaults === 'object' ? parsed.profiles.defaults : {}),
      ...sharedStyle,
    };
  } else if (
    parsed.profiles.defaults &&
    typeof parsed.profiles.defaults === 'object' &&
    parsed.profiles.defaults.colorScheme === scheme.name
  ) {
    const cleanDefaults = { ...parsed.profiles.defaults };
    for (const k of [
      'colorScheme',
      'font',
      'cursorShape',
      'opacity',
      'useAcrylic',
      'padding',
      'experimental.retroTerminalEffect',
      'experimental.pixelShaderPath',
      'backgroundImage',
      'backgroundImageOpacity',
      'backgroundImageStretchMode',
      'backgroundImageAlignment',
    ]) {
      delete cleanDefaults[k];
    }
    parsed.profiles.defaults = cleanDefaults;
  }

  writeJsonWithBackup(targetPath, parsed);
  return {
    ok: true,
    path: targetPath,
    appliedDefaults: Boolean(cli.terminalApplyToDefaultProfile),
    bgImage: resolvedBg,
    status: getCliStatus(),
  };
}

function restoreWindowsTerminalBackup() {
  const wtPaths = getWindowsTerminalSettingsPaths();
  if (!wtPaths.length) return { ok: false, error: 'Windows Terminal not found.' };
  const targetPath = wtPaths[0];
  const bakPath = `${targetPath}.agthemes.bak`;
  if (!fs.existsSync(bakPath)) {
    return { ok: false, error: 'No Windows Terminal backup found.' };
  }
  fs.copyFileSync(bakPath, targetPath);
  return { ok: true, status: getCliStatus() };
}

function launchStyledCliTerminal(config, appBaseDir = '') {
  if (process.platform !== 'win32') {
    return { ok: false, error: 'Direct Windows Terminal launch is available on Windows.' };
  }
  const syncRes = syncWindowsTerminalProfile(config, appBaseDir);
  if (!syncRes.ok) return syncRes;

  try {
    const child = spawn('wt.exe', ['-p', 'Antigravity CLI'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.unref();
    return { ok: true, message: 'Launched Windows Terminal with the "Antigravity CLI" profile.' };
  } catch (err) {
    return { ok: false, error: `Could not launch wt.exe: ${err.message}` };
  }
}

/**
 * Generates portable terminal theme configs for Ghostty, WezTerm, Kitty, and Alacritty.
 */
function generateTerminalSnippets(config) {
  const cli = config?.cli || {};
  const p = buildAnsiPalette(config);
  const font = cli.terminalFontFace || 'JetBrainsMono Nerd Font';
  const size = Number(cli.terminalFontSize) || 11;
  const pad = Number(cli.terminalPadding ?? 12);
  const opacity = ((Number(cli.terminalOpacity) || 88) / 100).toFixed(2);
  const bgImg = cli.terminalBgImage || '';
  const cursorMap = {
    bar: { ghostty: 'bar', wezterm: 'SteadyBar', kitty: 'beam', alacritty: 'Beam' },
    filledBox: { ghostty: 'block', wezterm: 'SteadyBlock', kitty: 'block', alacritty: 'Block' },
    emptyBox: { ghostty: 'block', wezterm: 'SteadyBlock', kitty: 'block', alacritty: 'Block' },
    underscore: { ghostty: 'underline', wezterm: 'SteadyUnderline', kitty: 'underline', alacritty: 'Underline' },
    vintage: { ghostty: 'underline', wezterm: 'SteadyUnderline', kitty: 'underline', alacritty: 'Underline' },
  };
  const cs = cursorMap[cli.terminalCursorShape] || cursorMap.bar;

  const ghostty = [
    '# Antigravity CLI theme for Ghostty (~/.config/ghostty/config)',
    `font-family = ${font}`,
    `font-size = ${size}`,
    `window-padding-x = ${pad}`,
    `window-padding-y = ${pad}`,
    `cursor-style = ${cs.ghostty}`,
    `background = ${p.background}`,
    `foreground = ${p.foreground}`,
    `cursor-color = ${p.cursorColor}`,
    `background-opacity = ${opacity}`,
    'background-blur-radius = 16',
    `palette = 0=${p.black}`,
    `palette = 1=${p.red}`,
    `palette = 2=${p.green}`,
    `palette = 3=${p.yellow}`,
    `palette = 4=${p.blue}`,
    `palette = 5=${p.purple}`,
    `palette = 6=${p.cyan}`,
    `palette = 7=${p.white}`,
    `palette = 8=${p.brightBlack}`,
    `palette = 9=${p.brightRed}`,
    `palette = 10=${p.brightGreen}`,
    `palette = 11=${p.brightYellow}`,
    `palette = 12=${p.brightBlue}`,
    `palette = 13=${p.brightPurple}`,
    `palette = 14=${p.brightCyan}`,
    `palette = 15=${p.brightWhite}`,
  ].join('\n');

  const wezterm = `-- Antigravity CLI theme for WezTerm (~/.wezterm.lua)
local wezterm = require 'wezterm'
return {
  font = wezterm.font('${font}'),
  font_size = ${size},
  default_cursor_style = '${cs.wezterm}',
  window_padding = { left = ${pad}, right = ${pad}, top = ${pad}, bottom = ${pad} },
  window_background_opacity = ${opacity},${bgImg ? `\n  window_background_image = '${bgImg.replace(/\\/g, '\\\\')}',` : ''}
  colors = {
    background = '${p.background}',
    foreground = '${p.foreground}',
    cursor_bg = '${p.cursorColor}',
    ansi = { '${p.black}', '${p.red}', '${p.green}', '${p.yellow}', '${p.blue}', '${p.purple}', '${p.cyan}', '${p.white}' },
    brights = { '${p.brightBlack}', '${p.brightRed}', '${p.brightGreen}', '${p.brightYellow}', '${p.brightBlue}', '${p.brightPurple}', '${p.brightCyan}', '${p.brightWhite}' },
  },
}`;

  const kitty = [
    '# Antigravity CLI theme for Kitty (~/.config/kitty/antigravity.conf)',
    `font_family ${font}`,
    `font_size ${size}`,
    `window_padding_width ${pad}`,
    `cursor_shape ${cs.kitty}`,
    `background ${p.background}`,
    `foreground ${p.foreground}`,
    `cursor ${p.cursorColor}`,
    `background_opacity ${opacity}`,
    bgImg ? `background_image ${bgImg}` : '# background_image /path/to/wallpaper.png',
    bgImg ? 'background_image_layout cscaled' : '# background_image_layout cscaled',
    `color0 ${p.black}`,
    `color1 ${p.red}`,
    `color2 ${p.green}`,
    `color3 ${p.yellow}`,
    `color4 ${p.blue}`,
    `color5 ${p.purple}`,
    `color6 ${p.cyan}`,
    `color7 ${p.white}`,
    `color8 ${p.brightBlack}`,
    `color9 ${p.brightRed}`,
    `color10 ${p.brightGreen}`,
    `color11 ${p.brightYellow}`,
    `color12 ${p.brightBlue}`,
    `color13 ${p.brightPurple}`,
    `color14 ${p.brightCyan}`,
    `color15 ${p.brightWhite}`,
  ].join('\n');

  const alacritty = `# Antigravity CLI theme for Alacritty (~/.config/alacritty/alacritty.toml)
[window]
opacity = ${opacity}
padding = { x = ${pad}, y = ${pad} }

[font]
size = ${size}
normal = { family = "${font}" }

[cursor.style]
shape = "${cs.alacritty}"

[colors.primary]
background = "${p.background}"
foreground = "${p.foreground}"

[colors.normal]
black = "${p.black}"
red = "${p.red}"
green = "${p.green}"
yellow = "${p.yellow}"
blue = "${p.blue}"
magenta = "${p.purple}"
cyan = "${p.cyan}"
white = "${p.white}"

[colors.bright]
black = "${p.brightBlack}"
red = "${p.brightRed}"
green = "${p.brightGreen}"
yellow = "${p.brightYellow}"
blue = "${p.brightBlue}"
magenta = "${p.brightPurple}"
cyan = "${p.brightCyan}"
white = "${p.brightWhite}"`;

  return { palette: p, ghostty, wezterm, kitty, alacritty };
}

function upsertManagedBlock(filePath, beginMarker, endMarker, body) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const bakPath = `${filePath}.agthemes.bak`;
  let existing = '';
  if (fs.existsSync(filePath)) {
    existing = fs.readFileSync(filePath, 'utf8');
    if (!fs.existsSync(bakPath)) {
      try { fs.copyFileSync(filePath, bakPath); } catch (_) {}
    }
  }
  const block = `${beginMarker}\n${body.trim()}\n${endMarker}`;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${esc(beginMarker)}[\\s\\S]*?${esc(endMarker)}`, 'm');
  const next = re.test(existing)
    ? existing.replace(re, block)
    : (existing.trimEnd() ? `${existing.trimEnd()}\n\n${block}\n` : `${block}\n`);
  fs.writeFileSync(filePath, next, 'utf8');
}

/**
 * 1-click config sync for Ghostty, WezTerm, Kitty, and Alacritty with automatic .agthemes.bak backup.
 */
function syncExternalTerminalConfig(termName, config, baseDirOverride = '') {
  const safeTerm = String(termName || '').toLowerCase();
  const snippets = generateTerminalSnippets(config);
  const home = baseDirOverride || os.homedir();
  const xdg = baseDirOverride
    ? path.join(baseDirOverride, '.config')
    : (process.env.XDG_CONFIG_HOME || path.join(home, '.config'));
  const appData = baseDirOverride
    ? path.join(baseDirOverride, 'AppData', 'Roaming')
    : (process.env.APPDATA || path.join(home, 'AppData', 'Roaming'));

  if (safeTerm === 'ghostty') {
    const targetDir = process.platform === 'win32' && !baseDirOverride && fs.existsSync(path.join(appData, 'ghostty'))
      ? path.join(appData, 'ghostty')
      : path.join(xdg, 'ghostty');
    const themeFile = path.join(targetDir, 'antigravity-themes.conf');
    const mainConfig = path.join(targetDir, 'config');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(themeFile, snippets.ghostty + '\n', 'utf8');
    upsertManagedBlock(
      mainConfig,
      '# BEGIN ANTIGRAVITY-THEMES',
      '# END ANTIGRAVITY-THEMES',
      `config-file = ?${themeFile.replace(/\\/g, '/')}`
    );
    return { ok: true, terminal: 'ghostty', path: mainConfig, themePath: themeFile };
  }

  if (safeTerm === 'kitty') {
    const targetDir = path.join(xdg, 'kitty');
    const themeFile = path.join(targetDir, 'antigravity-themes.conf');
    const mainConfig = path.join(targetDir, 'kitty.conf');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(themeFile, snippets.kitty + '\n', 'utf8');
    upsertManagedBlock(
      mainConfig,
      '# BEGIN ANTIGRAVITY-THEMES',
      '# END ANTIGRAVITY-THEMES',
      'include antigravity-themes.conf'
    );
    return { ok: true, terminal: 'kitty', path: mainConfig, themePath: themeFile };
  }

  if (safeTerm === 'alacritty') {
    const targetDir = process.platform === 'win32' && !baseDirOverride
      ? path.join(appData, 'alacritty')
      : path.join(xdg, 'alacritty');
    const themeFile = path.join(targetDir, 'antigravity-themes.toml');
    const mainConfig = path.join(targetDir, 'alacritty.toml');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(themeFile, snippets.alacritty + '\n', 'utf8');
    if (!fs.existsSync(mainConfig)) {
      fs.writeFileSync(
        mainConfig,
        `# Antigravity Themes import\n[general]\nimport = ["${themeFile.replace(/\\/g, '/')}"]\n`,
        'utf8'
      );
    } else {
      const bakPath = `${mainConfig}.agthemes.bak`;
      if (!fs.existsSync(bakPath)) {
        try { fs.copyFileSync(mainConfig, bakPath); } catch (_) {}
      }
      const cur = fs.readFileSync(mainConfig, 'utf8');
      if (!cur.includes('antigravity-themes.toml')) {
        const importLine = `import = ["${themeFile.replace(/\\/g, '/')}"]`;
        const next = /\[general\]/m.test(cur)
          ? cur.replace(/\[general\]/m, `[general]\n${importLine}`)
          : `[general]\n${importLine}\n\n${cur}`;
        fs.writeFileSync(mainConfig, next, 'utf8');
      }
    }
    return { ok: true, terminal: 'alacritty', path: mainConfig, themePath: themeFile };
  }

  if (safeTerm === 'wezterm') {
    const targetDir = path.join(xdg, 'wezterm');
    const themeFile = path.join(targetDir, 'antigravity-themes.lua');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(themeFile, snippets.wezterm + '\n', 'utf8');
    const mainConfig = path.join(home, '.wezterm.lua');
    if (!fs.existsSync(mainConfig)) {
      fs.writeFileSync(mainConfig, snippets.wezterm + '\n', 'utf8');
      return { ok: true, terminal: 'wezterm', path: mainConfig, themePath: themeFile };
    }
    return {
      ok: true,
      terminal: 'wezterm',
      path: themeFile,
      themePath: themeFile,
      note: 'Saved standalone module without overwriting your existing ~/.wezterm.lua.',
    };
  }

  return { ok: false, error: `Unsupported terminal target: ${termName}` };
}

function exportCliPresetJson(config) {
  const cli = config?.cli || {};
  const palette = buildAnsiPalette(config);
  const cleanPal = { ...palette };
  delete cleanPal.name;
  return JSON.stringify(
    {
      schema: 'antigravity-cli-preset/v1',
      exportedAt: new Date().toISOString(),
      name: cli.presetId && CLI_THEME_PRESETS[cli.presetId] ? CLI_THEME_PRESETS[cli.presetId].name : 'Custom CLI Preset',
      cli: {
        presetId: 'custom',
        colorScheme: cli.colorScheme || 'terminal',
        runningLightSpeed: cli.runningLightSpeed || 'medium',
        altScreenMode: cli.altScreenMode || 'auto',
        statusLineEnabled: Boolean(cli.statusLineEnabled),
        statusLinePreset: cli.statusLinePreset || 'powerline',
        statusLinePadding: Number(cli.statusLinePadding) || 0,
        statusLineShowModel: cli.statusLineShowModel !== false,
        statusLineShowFolder: cli.statusLineShowFolder !== false,
        statusLineShowBranch: cli.statusLineShowBranch !== false,
        statusLineShowContextBar: cli.statusLineShowContextBar !== false,
        statusLineShowClock: Boolean(cli.statusLineShowClock),
        statusLinePrefix: cli.statusLinePrefix ?? '◆',
        terminalFontFace: cli.terminalFontFace || 'JetBrainsMono Nerd Font',
        terminalFontSize: Number(cli.terminalFontSize) || 11,
        terminalPadding: Number(cli.terminalPadding ?? 12),
        terminalCursorShape: cli.terminalCursorShape || 'bar',
        terminalOpacity: Number(cli.terminalOpacity) || 88,
        terminalAcrylic: cli.terminalAcrylic !== false,
        terminalShader: cli.terminalShader || 'none',
        customPalette: cleanPal,
      },
    },
    null,
    2
  );
}

function parseCliPresetJson(rawText) {
  const parsed = JSON.parse(stripJsonc(rawText));
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON preset file.');
  const cliObj = parsed.cli && typeof parsed.cli === 'object' ? parsed.cli : parsed;
  const paletteObj =
    cliObj.customPalette && typeof cliObj.customPalette === 'object'
      ? cliObj.customPalette
      : (parsed.palette && typeof parsed.palette === 'object' ? parsed.palette : null);
  const patch = {
    enabled: true,
    presetId: paletteObj ? 'custom' : (cliObj.presetId || 'custom'),
    ...cliObj,
  };
  if (paletteObj) patch.customPalette = paletteObj;
  return { name: parsed.name || 'Imported CLI Preset', cliPatch: patch };
}

module.exports = {
  CLI_THEME_PRESETS,
  CLI_SHADER_PRESETS,
  stripJsonc,
  isFfmpegAvailable,
  resolvePersistentShaderPath,
  getCliPresetsList,
  getAgyCliSettingsPath,
  resolveTerminalBgImagePath,
  buildAnsiPalette,
  getCliAccentHex,
  generateStatusLineScript,
  formatStatusLineCommand,
  repairQuotedStatusLineIfNeeded,
  testStatusLineScript,
  getCliStatus,
  applyAgyCliSettings,
  resetAgyCliSettings,
  syncWindowsTerminalProfile,
  restoreWindowsTerminalBackup,
  launchStyledCliTerminal,
  generateTerminalSnippets,
  syncExternalTerminalConfig,
  exportCliPresetJson,
  parseCliPresetJson,
};
