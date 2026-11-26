'use strict';

const { execFile, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { getSurfaceRamp, parseRgbTriple, toHexColor } = require('../core/defaults.cjs');
const { buildAnsiPalette } = require('../core/cli-themer.cjs');

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

function getArgvPaths() {
  const home = os.homedir();
  const paths = [path.join(home, '.antigravity-ide', 'argv.json')];
  const altDir = path.join(home, '.antigravity');
  if (fs.existsSync(altDir)) {
    paths.push(path.join(altDir, 'argv.json'));
  }
  return paths;
}

function getArgvStatus() {
  for (const argvPath of getArgvPaths()) {
    try {
      if (!fs.existsSync(argvPath)) continue;
      const parsed = JSON.parse(stripJsonc(fs.readFileSync(argvPath, 'utf8')) || '{}');
      if (parsed && parsed['remote-debugging-port'] !== undefined) {
        return { configured: true, path: argvPath, port: String(parsed['remote-debugging-port']) };
      }
    } catch (_) {}
  }
  return { configured: false, path: getArgvPaths()[0], port: null };
}

function configureIdeArgvCdp(enable = true) {
  const updated = [];
  for (const argvPath of getArgvPaths()) {
    try {
      fs.mkdirSync(path.dirname(argvPath), { recursive: true });
      if (!fs.existsSync(argvPath)) {
        if (!enable) continue;
        fs.writeFileSync(argvPath, JSON.stringify({ 'remote-debugging-port': '0' }, null, '\t') + '\n', 'utf8');
        updated.push(argvPath);
        continue;
      }

      const raw = fs.readFileSync(argvPath, 'utf8');
      const parsed = JSON.parse(stripJsonc(raw) || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;

      if (enable) {
        if (parsed['remote-debugging-port'] === '0') continue;
        parsed['remote-debugging-port'] = '0';
      } else {
        if (!Object.prototype.hasOwnProperty.call(parsed, 'remote-debugging-port')) continue;
        delete parsed['remote-debugging-port'];
      }

      const tmp = `${argvPath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(parsed, null, '\t') + '\n', 'utf8');
      fs.renameSync(tmp, argvPath);
      updated.push(argvPath);
    } catch (_) {}
  }

  return {
    ok: true,
    updated,
    status: getArgvStatus(),
  };
}

function syncIdeWindowControls(config, forceRestore = false) {
  if (process.platform !== 'win32') return;
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const candidates = [
    path.join(appData, 'Antigravity IDE', 'User', 'settings.json'),
    path.join(appData, 'Antigravity', 'User', 'settings.json'),
  ];

  const active = !forceRestore && Boolean(config?.enabled) && config?.applyToIde !== false && config?.syncWindowControls !== false;
  const ramp = getSurfaceRamp(config);
  const [r, g, b] = parseRgbTriple(ramp.rgb);
  const bgHex = toHexColor(r, g, b);
  const fgHex = ramp.textPrimary;
  const ansi = buildAnsiPalette({
    ...(config || {}),
    cli: { ...(config?.cli || {}), presetId: 'custom' },
  });
  const hasWallpaper = Boolean(config?.wallpaperEnabled && config?.wallpaperId);

  for (const settingsPath of candidates) {
    if (!fs.existsSync(settingsPath)) continue;
    try {
      const parsed = JSON.parse(stripJsonc(fs.readFileSync(settingsPath, 'utf8')) || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;

      let changed = false;
      const cc =
        parsed['workbench.colorCustomizations'] && typeof parsed['workbench.colorCustomizations'] === 'object'
          ? { ...parsed['workbench.colorCustomizations'] }
          : {};

      const keys = [
        'titleBar.activeBackground',
        'titleBar.inactiveBackground',
        'titleBar.activeForeground',
        'titleBar.inactiveForeground',
        'minimap.background',
        'terminal.background',
        'terminal.foreground',
        'terminalCursor.foreground',
        'terminal.ansiBlack',
        'terminal.ansiRed',
        'terminal.ansiGreen',
        'terminal.ansiYellow',
        'terminal.ansiBlue',
        'terminal.ansiMagenta',
        'terminal.ansiCyan',
        'terminal.ansiWhite',
        'terminal.ansiBrightBlack',
        'terminal.ansiBrightRed',
        'terminal.ansiBrightGreen',
        'terminal.ansiBrightYellow',
        'terminal.ansiBrightBlue',
        'terminal.ansiBrightMagenta',
        'terminal.ansiBrightCyan',
        'terminal.ansiBrightWhite',
      ];

      if (active) {
        const desired = {
          'titleBar.activeBackground': bgHex,
          'titleBar.inactiveBackground': bgHex,
          'titleBar.activeForeground': fgHex,
          'titleBar.inactiveForeground': fgHex,
          'minimap.background': hasWallpaper ? '#00000000' : bgHex,
          'terminal.background': hasWallpaper ? '#00000000' : bgHex,
          'terminal.foreground': ansi.foreground,
          'terminalCursor.foreground': ansi.cursorColor,
          'terminal.ansiBlack': ansi.black,
          'terminal.ansiRed': ansi.red,
          'terminal.ansiGreen': ansi.green,
          'terminal.ansiYellow': ansi.yellow,
          'terminal.ansiBlue': ansi.blue,
          'terminal.ansiMagenta': ansi.purple,
          'terminal.ansiCyan': ansi.cyan,
          'terminal.ansiWhite': ansi.white,
          'terminal.ansiBrightBlack': ansi.brightBlack,
          'terminal.ansiBrightRed': ansi.brightRed,
          'terminal.ansiBrightGreen': ansi.brightGreen,
          'terminal.ansiBrightYellow': ansi.brightYellow,
          'terminal.ansiBrightBlue': ansi.brightBlue,
          'terminal.ansiBrightMagenta': ansi.brightPurple,
          'terminal.ansiBrightCyan': ansi.brightCyan,
          'terminal.ansiBrightWhite': ansi.brightWhite,
        };
        for (const [k, v] of Object.entries(desired)) {
          if (cc[k] !== v) {
            cc[k] = v;
            changed = true;
          }
        }
        if (changed) parsed['workbench.colorCustomizations'] = cc;
      } else {
        for (const k of keys) {
          if (Object.prototype.hasOwnProperty.call(cc, k)) {
            delete cc[k];
            changed = true;
          }
        }
        if (Object.keys(cc).length === 0) {
          if (Object.prototype.hasOwnProperty.call(parsed, 'workbench.colorCustomizations')) {
            delete parsed['workbench.colorCustomizations'];
            changed = true;
          }
        } else if (changed) {
          parsed['workbench.colorCustomizations'] = cc;
        }
      }

      if (changed) {
        fs.writeFileSync(settingsPath, JSON.stringify(parsed, null, 4) + '\n', 'utf8');
      }
    } catch (_) {}
  }
}

function findExecutables() {
  if (process.platform === 'win32') {
    const localApp = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const progFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const ideCandidates = [
      path.join(localApp, 'Programs', 'Antigravity IDE', 'Antigravity IDE.exe'),
      path.join(progFiles, 'Antigravity IDE', 'Antigravity IDE.exe'),
    ];
    const appCandidates = [
      path.join(localApp, 'Programs', 'Antigravity', 'Antigravity.exe'),
      path.join(localApp, 'Programs', 'Antigravity App', 'Antigravity.exe'),
      path.join(progFiles, 'Antigravity', 'Antigravity.exe'),
    ];
    return {
      ide: ideCandidates.find((p) => fs.existsSync(p)) || null,
      app: appCandidates.find((p) => fs.existsSync(p)) || null,
    };
  }
  if (process.platform === 'darwin') {
    const ide = '/Applications/Antigravity IDE.app/Contents/MacOS/Antigravity IDE';
    const app = '/Applications/Antigravity.app/Contents/MacOS/Antigravity';
    return {
      ide: fs.existsSync(ide) ? ide : null,
      app: fs.existsSync(app) ? app : null,
    };
  }
  return { ide: null, app: null };
}

function launchTargetWithCdp(target = 'ide') {
  return new Promise((resolve) => {
    if (target === 'ide') configureIdeArgvCdp(true);
    const exes = findExecutables();
    const exe = target === 'app' ? exes.app : exes.ide;

    if (!exe) {
      resolve({
        ok: false,
        message:
          target === 'app'
            ? 'Antigravity App executable not found automatically. Start it with --remote-debugging-port=0.'
            : 'Antigravity IDE executable not found automatically. Open Antigravity IDE after enabling argv.json.',
      });
      return;
    }

    const exeName = path.basename(exe);
    const spawnApp = () => {
      try {
        const child = spawn(exe, ['--remote-debugging-port=0'], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
        resolve({ ok: true, message: `Launched ${exeName} with local CDP enabled.` });
      } catch (err) {
        resolve({ ok: false, message: err.message });
      }
    };

    if (process.platform === 'win32') {
      execFile('taskkill', ['/IM', exeName, '/F'], () => setTimeout(spawnApp, 750));
    } else {
      spawnApp();
    }
  });
}

module.exports = {
  getArgvStatus,
  configureIdeArgvCdp,
  syncIdeWindowControls,
  findExecutables,
  launchTargetWithCdp,
};
