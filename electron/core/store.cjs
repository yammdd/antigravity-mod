'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DEFAULT_CONFIG, DEFAULT_CLI_CONFIG, sanitizeConfigPatch } = require('./defaults.cjs');

const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v', '.ogg']);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg']);
const FONT_EXTS = new Set(['.woff2', '.woff', '.ttf', '.otf']);

class AppStore {
  constructor(userDataDir, mediaServer) {
    this.baseDir = path.join(userDataDir, 'antigravity-themes');
    this.configPath = path.join(this.baseDir, 'config.json');
    this.wallpapersPath = path.join(this.baseDir, 'wallpapers.json');
    this.fontsPath = path.join(this.baseDir, 'fonts.json');
    this.mediaServer = mediaServer;

    fs.mkdirSync(this.baseDir, { recursive: true });
    this.didMigrateCli = false;
    this.config = this.loadConfig();
    this.wallpapers = this.loadList(this.wallpapersPath);
    this.fonts = this.loadList(this.fontsPath);
    this.syncMediaRegistrations();
  }

  readJsonSafe(filePath) {
    for (const candidate of [filePath, `${filePath}.bak`]) {
      try {
        if (!fs.existsSync(candidate)) continue;
        const raw = fs.readFileSync(candidate, 'utf8');
        if (!raw.trim()) continue;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (_) {}
    }
    return null;
  }

  writeJsonAtomic(filePath, obj) {
    const text = JSON.stringify(obj, null, 2) + '\n';
    const tmpPath = `${filePath}.tmp`;
    const bakPath = `${filePath}.bak`;
    try {
      if (fs.existsSync(filePath)) {
        const cur = fs.readFileSync(filePath, 'utf8');
        if (cur.trim()) {
          JSON.parse(cur);
          fs.writeFileSync(bakPath, cur, 'utf8');
        }
      }
    } catch (_) {}

    fs.writeFileSync(tmpPath, text, 'utf8');
    try {
      fs.renameSync(tmpPath, filePath);
    } catch (_) {
      fs.writeFileSync(filePath, text, 'utf8');
      try { fs.unlinkSync(tmpPath); } catch (_) {}
    }
  }

  loadConfig() {
    const saved = this.readJsonSafe(this.configPath) || {};
    const sanitized = sanitizeConfigPatch(saved, DEFAULT_CLI_CONFIG);
    const merged = {
      ...DEFAULT_CONFIG,
      ...sanitized,
      cli: { ...DEFAULT_CLI_CONFIG, ...(sanitized.cli || {}) },
    };

    // One-time migration from v1 CLI config (decouple from IDE, enable default WT profile & status bar, migrate .webp -> .jpg)
    let migrated = false;
    const prevCliVer = Number(saved?.cli?.schemaVersion || 0);
    if (saved && Object.keys(saved).length > 0 && prevCliVer < 2) {
      merged.cli.schemaVersion = 2;
      merged.cli.terminalSyncThemeWallpaper = false;
      merged.cli.terminalApplyToDefaultProfile = true;
      merged.cli.statusLineEnabled = true;
      if (merged.cli.altScreenMode === 'default') merged.cli.altScreenMode = 'auto';
      migrated = true;
      this.didMigrateCli = true;
    }

    if (merged.cli.terminalBgImage && /\.webp$/i.test(merged.cli.terminalBgImage)) {
      const jpgCandidate = merged.cli.terminalBgImage.replace(/\.webp$/i, '.jpg');
      merged.cli.terminalBgImage = jpgCandidate;
      migrated = true;
    }

    if (migrated) {
      try {
        this.writeJsonAtomic(this.configPath, merged);
      } catch (_) {}
    }

    return merged;
  }

  saveConfig(patch = {}) {
    const clean = sanitizeConfigPatch(patch, this.config.cli);
    this.config = {
      ...this.config,
      ...clean,
      cli: clean.cli ? clean.cli : this.config.cli,
    };
    this.writeJsonAtomic(this.configPath, this.config);
    return this.config;
  }

  resetConfig() {
    this.config = { ...DEFAULT_CONFIG, cli: { ...DEFAULT_CLI_CONFIG } };
    this.writeJsonAtomic(this.configPath, this.config);
    return this.config;
  }

  loadList(filePath) {
    const saved = this.readJsonSafe(filePath);
    return Array.isArray(saved) ? saved : [];
  }

  syncMediaRegistrations() {
    for (const wp of this.wallpapers) {
      if (wp.filePath && fs.existsSync(wp.filePath)) {
        this.mediaServer.register(`wp:${wp.id}`, wp.filePath);
      }
    }
    for (const f of this.fonts) {
      if (f.filePath && fs.existsSync(f.filePath)) {
        this.mediaServer.register(`font:${f.id}`, f.filePath);
      }
    }
  }

  getWallpapers() {
    return this.wallpapers
      .filter((wp) => wp.filePath && fs.existsSync(wp.filePath))
      .map((wp) => ({
        ...wp,
        isGif: path.extname(wp.filePath || '').toLowerCase() === '.gif',
        mediaUrl: this.mediaServer.getUrl(`wp:${wp.id}`),
      }));
  }

  getActiveWallpaper() {
    if (!this.config.wallpaperEnabled || !this.config.wallpaperId) return null;
    return this.getWallpapers().find((wp) => wp.id === this.config.wallpaperId) || null;
  }

  importWallpapers(filePaths) {
    const added = [];
    const existing = new Set(this.wallpapers.map((w) => path.resolve(w.filePath || '').toLowerCase()));

    for (const raw of filePaths || []) {
      if (!raw || !fs.existsSync(raw)) continue;
      const ext = path.extname(raw).toLowerCase();
      const mediaType = VIDEO_EXTS.has(ext) ? 'video' : IMAGE_EXTS.has(ext) ? 'image' : null;
      if (!mediaType) continue;

      const absPath = path.resolve(raw);
      if (existing.has(absPath.toLowerCase())) continue;

      const stat = fs.statSync(absPath);
      const id = 'wp-' + crypto.createHash('sha1').update(`${absPath}:${stat.size}`).digest('hex').slice(0, 10);
      const entry = {
        id,
        name: path.basename(absPath, ext).replace(/[_-]+/g, ' ').trim() || 'Wallpaper',
        mediaType,
        filePath: absPath,
        fileSize: stat.size,
        addedAt: Date.now(),
      };

      this.wallpapers.unshift(entry);
      existing.add(absPath.toLowerCase());
      added.push(entry);
    }

    if (added.length) {
      this.writeJsonAtomic(this.wallpapersPath, this.wallpapers);
      this.syncMediaRegistrations();
    }
    return added;
  }

  deleteWallpaper(id) {
    const idx = this.wallpapers.findIndex((w) => w.id === id);
    if (idx === -1) return false;
    this.wallpapers.splice(idx, 1);
    this.mediaServer.unregister(`wp:${id}`);
    if (this.config.wallpaperId === id) {
      this.saveConfig({ wallpaperId: '', wallpaperEnabled: false });
    }
    this.writeJsonAtomic(this.wallpapersPath, this.wallpapers);
    return true;
  }

  // --- Custom Local Fonts (.woff2 / .woff / .ttf / .otf) ---
  getFonts() {
    return this.fonts
      .filter((f) => f.filePath && fs.existsSync(f.filePath))
      .map((f) => ({ ...f, fontUrl: this.mediaServer.getUrl(`font:${f.id}`) }));
  }

  importFonts(filePaths) {
    const added = [];
    const existing = new Set(this.fonts.map((f) => path.resolve(f.filePath || '').toLowerCase()));

    for (const raw of filePaths || []) {
      if (!raw || !fs.existsSync(raw)) continue;
      const ext = path.extname(raw).toLowerCase();
      if (!FONT_EXTS.has(ext)) continue;

      const absPath = path.resolve(raw);
      if (existing.has(absPath.toLowerCase())) continue;

      const stat = fs.statSync(absPath);
      const id = 'fn-' + crypto.createHash('sha1').update(`${absPath}:${stat.size}`).digest('hex').slice(0, 10);
      const family = path.basename(absPath, ext).replace(/[_-]+/g, ' ').trim() || 'Custom Font';
      const entry = {
        id,
        family,
        filePath: absPath,
        fileSize: stat.size,
        format: ext.slice(1),
        addedAt: Date.now(),
      };

      this.fonts.unshift(entry);
      existing.add(absPath.toLowerCase());
      added.push(entry);
    }

    if (added.length) {
      this.writeJsonAtomic(this.fontsPath, this.fonts);
      this.syncMediaRegistrations();
    }
    return added;
  }

  deleteFont(id) {
    const idx = this.fonts.findIndex((f) => f.id === id);
    if (idx === -1) return false;
    this.fonts.splice(idx, 1);
    this.mediaServer.unregister(`font:${id}`);
    if (this.config.customUiFontId === id) this.saveConfig({ customUiFontId: '', uiFont: 'inter' });
    if (this.config.customMonoFontId === id) this.saveConfig({ customMonoFontId: '', monoFont: 'jetbrains' });
    this.writeJsonAtomic(this.fontsPath, this.fonts);
    return true;
  }

  exportBackupJson(quickCss = '') {
    return JSON.stringify(
      {
        schema: 'antigravity-themes/v2',
        exportedAt: new Date().toISOString(),
        config: this.config,
        quickCss,
        wallpapers: this.wallpapers.map((w) => w.filePath),
        fonts: this.fonts.map((f) => f.filePath),
      },
      null,
      2
    );
  }

  importBackupJson(rawText) {
    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON backup file');
    if (parsed.config && typeof parsed.config === 'object') this.saveConfig(parsed.config);
    if (Array.isArray(parsed.wallpapers)) this.importWallpapers(parsed.wallpapers);
    if (Array.isArray(parsed.fonts)) this.importFonts(parsed.fonts);
    return {
      config: this.config,
      quickCss: typeof parsed.quickCss === 'string' ? parsed.quickCss : null,
    };
  }
}

module.exports = { AppStore };
