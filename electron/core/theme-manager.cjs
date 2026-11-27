'use strict';

const EventEmitter = require('events');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createZipFromDir, extractZipSafe } = require('./zip-pack.cjs');

const MAX_ONLINE_CSS_BYTES = 512 * 1024;
const ONLINE_FETCH_TIMEOUT_MS = 8000;

const DEFAULT_QUICK_CSS = `/* QuickCSS — Live stylesheet injected on top of active themes.
 * Press Ctrl+S (or enable Live Update) to apply changes immediately.
 *
 * Useful tokens:
 *   --ag-accent: #3b82f6;
 *   --ag-radius: 10px;
 *   --ag-chat-font-size: 14px;
 */

`;

function parseThemeMetadata(cssText, fileName) {
  const fallbackName = fileName
    .replace(/\.theme\.css$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const meta = {
    name: fallbackName,
    author: 'Local',
    version: '1.0.0',
    description: '',
    source: '',
    website: '',
    colormode: '',
    surfacetint: '',
    accent: '',
  };

  const blockMatch = String(cssText || '').match(/^\s*\/\*\*([\s\S]*?)\*\//);
  if (!blockMatch) return meta;

  for (const rawLine of blockMatch[1].split(/\r?\n/)) {
    const m = rawLine.match(/^\s*\*?\s*@([a-zA-Z]+)\s+(.+?)\s*$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key in meta && val) meta[key] = val;
  }
  return {
    name: meta.name,
    author: meta.author,
    version: meta.version,
    description: meta.description,
    source: meta.source,
    website: meta.website,
    colorMode: meta.colormode === 'light' ? 'light' : 'dark',
    surfaceTint: meta.surfacetint || 'graphite',
    accentColor: meta.accent || '#3b82f6',
  };
}

function slugify(name) {
  return (
    String(name || 'custom-theme')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'custom-theme'
  );
}

function slugifyThemeName(name) {
  return `${slugify(name)}.theme.css`;
}

function copyDirRecursive(srcDir, destDir, overwrite = false) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, ent.name);
    const dst = path.join(destDir, ent.name);
    if (ent.isDirectory()) {
      copyDirRecursive(src, dst, overwrite);
    } else if (ent.isFile() && (overwrite || !fs.existsSync(dst))) {
      fs.copyFileSync(src, dst);
    }
  }
}

function getDirTotalSize(dirPath) {
  let total = 0;
  try {
    for (const ent of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const full = path.join(dirPath, ent.name);
      if (ent.isDirectory()) total += getDirTotalSize(full);
      else if (ent.isFile()) total += fs.statSync(full).size;
    }
  } catch (_) {}
  return total;
}

class ThemeManager extends EventEmitter {
  constructor(baseDir, bundledThemesDir, mediaServer = null) {
    super();
    this.baseDir = baseDir;
    this.themesDir = path.join(baseDir, 'themes');
    this.quickCssPath = path.join(baseDir, 'quickcss.css');
    this.bundledThemesDir = bundledThemesDir;
    this.mediaServer = mediaServer;
    this.onlineCache = new Map();
    this.watchers = [];
    this.debounceTimer = null;

    fs.mkdirSync(this.themesDir, { recursive: true });
    this.seedStarterThemes();
    this.ensureQuickCssFile();
  }

  seedStarterThemes() {
    if (!this.bundledThemesDir || !fs.existsSync(this.bundledThemesDir)) return;
    const SEED_VERSION = '8';
    const markerPath = path.join(this.themesDir, '.seed-version');
    let currentVer = '';
    try {
      if (fs.existsSync(markerPath)) currentVer = fs.readFileSync(markerPath, 'utf8').trim();
    } catch (_) {}
    const shouldRefresh = currentVer !== SEED_VERSION;

    if (shouldRefresh) {
      const deprecated = [
        'sakura-twilight',
        'midnight-lofi',
        'astral-rooftop',
        'sakura-motion',
        'tokyo-rain-live',
        'kyoto-lantern',
        'nordic-aurora',
        'alpine-morning',
        'dusk-windmills',
        'summer-sparkler',
        'midnight-rain-gif',
        'neon-rooftop-gif',
        'firefly-ink-live',
        'pastel-aura-live',
        'sunset-train-live',
        'nordic-slate.theme.css',
        'tokyo-ink.theme.css',
      ];
      for (const oldSlug of deprecated) {
        try {
          const oldPath = path.join(this.themesDir, oldSlug);
          if (fs.existsSync(oldPath)) fs.rmSync(oldPath, { recursive: true, force: true });
        } catch (_) {}
      }
    }

    try {
      for (const ent of fs.readdirSync(this.bundledThemesDir, { withFileTypes: true })) {
        const src = path.join(this.bundledThemesDir, ent.name);
        const dst = path.join(this.themesDir, ent.name);
        if (ent.isFile() && ent.name.endsWith('.theme.css')) {
          if (shouldRefresh || !fs.existsSync(dst)) fs.copyFileSync(src, dst);
        } else if (ent.isDirectory() && fs.existsSync(path.join(src, 'theme.json'))) {
          copyDirRecursive(src, dst, shouldRefresh);
          if (shouldRefresh) {
            for (const legacyAsset of ['backdrop.webp', 'poster.webp']) {
              const legacyPath = path.join(dst, 'assets', legacyAsset);
              if (fs.existsSync(legacyPath)) {
                try { fs.unlinkSync(legacyPath); } catch (_) {}
              }
            }
          }
        }
      }
      if (shouldRefresh) {
        fs.writeFileSync(markerPath, SEED_VERSION + '\n', 'utf8');
      }
    } catch (_) {}
  }

  ensureQuickCssFile() {
    if (!fs.existsSync(this.quickCssPath)) {
      fs.writeFileSync(this.quickCssPath, DEFAULT_QUICK_CSS, 'utf8');
    }
  }

  /**
   * Lists BOTH single-file *.theme.css themes AND multi-surface Theme Pack directories (pack:<slug>).
   */
  listLocalThemes() {
    let entries = [];
    try {
      entries = fs.readdirSync(this.themesDir, { withFileTypes: true });
    } catch (_) {
      return [];
    }

    const items = [];
    for (const ent of entries) {
      if (ent.isFile() && ent.name.toLowerCase().endsWith('.theme.css')) {
        const filePath = path.join(this.themesDir, ent.name);
        try {
          const stat = fs.statSync(filePath);
          const css = fs.readFileSync(filePath, 'utf8');
          const meta = parseThemeMetadata(css, ent.name);
          items.push({
            id: ent.name,
            fileName: ent.name,
            kind: 'css',
            filePath,
            size: stat.size,
            updatedAt: stat.mtimeMs,
            targets: ['ide', 'app'],
            ...meta,
          });
        } catch (_) {}
      } else if (ent.isDirectory()) {
        const packDir = path.join(this.themesDir, ent.name);
        const manifestPath = path.join(packDir, 'theme.json');
        if (!fs.existsSync(manifestPath)) continue;
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
          const stat = fs.statSync(manifestPath);
          const targets = Array.isArray(manifest.targets) && manifest.targets.length
            ? manifest.targets
            : ['ide', 'app', 'cli'];

          let previewUrl = '';
          let previewFilePath = '';
          const previewRel = manifest.preview || manifest.backdrop?.file || '';
          if (previewRel && this.mediaServer) {
            const absPrev = path.resolve(packDir, previewRel);
            if (absPrev.startsWith(path.resolve(packDir)) && fs.existsSync(absPrev)) {
              previewUrl = this.mediaServer.register(`packprev:${ent.name}`, absPrev);
              previewFilePath = absPrev;
            }
          }

          let backdropUrl = '';
          let backdropMediaType = null;
          let backdropFilePath = '';
          let isGif = false;
          if (manifest.backdrop?.file && this.mediaServer) {
            const absBg = path.resolve(packDir, manifest.backdrop.file);
            if (absBg.startsWith(path.resolve(packDir)) && fs.existsSync(absBg)) {
              const ext = path.extname(absBg).toLowerCase();
              backdropMediaType = ['.mp4', '.webm', '.mov', '.m4v', '.ogg'].includes(ext) ? 'video' : 'image';
              isGif = ext === '.gif';
              backdropUrl = this.mediaServer.register(`packbg:${ent.name}`, absBg);
              backdropFilePath = absBg;
            }
          }

          let cliBackdropUrl = '';
          let cliBackdropFilePath = '';
          let cliBackdropIsGif = false;
          if (manifest.cliBackdrop && this.mediaServer) {
            const absCliBg = path.resolve(packDir, manifest.cliBackdrop);
            if (absCliBg.startsWith(path.resolve(packDir)) && fs.existsSync(absCliBg)) {
              cliBackdropUrl = this.mediaServer.register(`packclibg:${ent.name}`, absCliBg);
              cliBackdropFilePath = absCliBg;
              cliBackdropIsGif = path.extname(absCliBg).toLowerCase() === '.gif';
            }
          }

          items.push({
            id: `pack:${ent.name}`,
            fileName: `pack:${ent.name}`,
            folderName: ent.name,
            kind: 'pack',
            filePath: packDir,
            manifestPath,
            size: getDirTotalSize(packDir),
            updatedAt: stat.mtimeMs,
            name: manifest.name || ent.name,
            author: manifest.author || 'Local',
            version: manifest.version || '1.0.0',
            category: manifest.category || (backdropMediaType === 'video' ? 'video' : isGif ? 'gif' : 'minimal'),
            description: manifest.description || '',
            source: manifest.source || '',
            website: manifest.website || '',
            targets,
            preset: manifest.preset || null,
            accentColor: manifest.preset?.accentColor || '#3b82f6',
            colorMode: manifest.preset?.colorMode || 'dark',
            cli: manifest.cli || null,
            animation: manifest.animation || null,
            previewUrl,
            previewFilePath,
            backdropUrl,
            backdropMediaType,
            backdropFilePath,
            isGif,
            cliBackdropUrl: cliBackdropUrl || (backdropMediaType === 'image' ? backdropUrl : previewUrl),
            cliBackdropFilePath: cliBackdropFilePath || (backdropMediaType === 'image' ? backdropFilePath : previewFilePath),
            cliBackdropIsGif: cliBackdropIsGif || isGif,
            hasBackdrop: Boolean(backdropUrl),
          });
        } catch (_) {}
      }
    }

    items.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'pack' ? -1 : 1;
      const catRank = { anime: 0, gif: 1, video: 2, landscape: 3, minimal: 4 };
      const ra = catRank[a.category] ?? 5;
      const rb = catRank[b.category] ?? 5;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
    return items;
  }

  /**
   * Lists all bundled image, animated GIF & looping video wallpapers from local Theme Packs so users
   * can mix and match them freely in the Wallpapers & Video gallery and CLI Studio.
   */
  listBuiltInWallpapers() {
    const out = [];
    for (const t of this.listLocalThemes()) {
      if (t.kind !== 'pack' || !t.backdropUrl || !t.backdropMediaType) continue;
      out.push({
        id: `builtin:${t.folderName}`,
        packId: t.id,
        name: t.name,
        category: t.category || 'landscape',
        mediaType: t.backdropMediaType,
        isGif: Boolean(t.isGif),
        mediaUrl: t.backdropUrl,
        posterUrl: t.previewUrl || t.backdropUrl,
        filePath: t.backdropFilePath,
        posterFilePath: t.previewFilePath || '',
        cliBgUrl: t.cliBackdropUrl || t.previewUrl || t.backdropUrl,
        cliBgFilePath: t.cliBackdropFilePath || t.previewFilePath || t.backdropFilePath,
        cliBgIsGif: Boolean(t.cliBackdropIsGif || t.isGif),
        accentColor: t.accentColor || '#3b82f6',
        builtin: true,
      });
    }
    return out;
  }

  getBuiltInWallpaperById(id) {
    if (typeof id !== 'string' || !id.startsWith('builtin:')) return null;
    return this.listBuiltInWallpapers().find((w) => w.id === id) || null;
  }

  readThemeCss(fileName) {
    const safeName = path.basename(String(fileName || ''));
    if (!safeName.toLowerCase().endsWith('.theme.css')) return null;
    const fullPath = path.join(this.themesDir, safeName);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath, 'utf8');
  }

  /**
   * Registers pack assets on LocalMediaServer and rewrites relative url("./assets/...") references.
   */
  rewritePackAssetUrls(packSlug, packDir, cssText) {
    if (!this.mediaServer || !cssText) return cssText || '';
    return cssText.replace(/url\(\s*(['"]?)\.\/(assets\/[^'")]+)\1\s*\)/gi, (full, _q, relAsset) => {
      const resolved = path.resolve(packDir, relAsset);
      if (!resolved.startsWith(path.resolve(packDir)) || !fs.existsSync(resolved)) return full;
      const mediaId = `pack:${packSlug}:${relAsset.replace(/\\/g, '/')}`;
      const url = this.mediaServer.register(mediaId, resolved);
      return `url("${url}")`;
    });
  }

  readPackPayload(packId) {
    const slug = String(packId || '').replace(/^pack:/, '');
    if (!slug || slug.includes('..') || slug.includes('/') || slug.includes('\\')) return null;
    const packDir = path.join(this.themesDir, slug);
    const manifestPath = path.join(packDir, 'theme.json');
    if (!fs.existsSync(manifestPath)) return null;

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
      const readRel = (rel) => {
        const p = path.join(packDir, rel);
        return fs.existsSync(p) ? this.rewritePackAssetUrls(slug, packDir, fs.readFileSync(p, 'utf8')) : '';
      };

      let fontCss = '';
      if (Array.isArray(manifest.fonts)) {
        for (const f of manifest.fonts) {
          if (!f?.family || !f?.file) continue;
          const abs = path.resolve(packDir, f.file);
          if (!abs.startsWith(path.resolve(packDir)) || !fs.existsSync(abs) || !this.mediaServer) continue;
          const url = this.mediaServer.register(`packfont:${slug}:${f.file}`, abs);
          fontCss += `@font-face { font-family: '${f.family}'; src: url("${url}"); font-weight: ${f.weight || '100 900'}; font-display: swap; }\n`;
        }
      }

      let backdrop = null;
      if (manifest.backdrop?.file && this.mediaServer) {
        const abs = path.resolve(packDir, manifest.backdrop.file);
        if (abs.startsWith(path.resolve(packDir)) && fs.existsSync(abs)) {
          const ext = path.extname(abs).toLowerCase();
          const isVideo = ['.mp4', '.webm', '.mov', '.m4v', '.ogg'].includes(ext);
          backdrop = {
            id: `packbg:${slug}`,
            name: manifest.name || slug,
            mediaType: isVideo ? 'video' : 'image',
            mediaUrl: this.mediaServer.register(`packbg:${slug}`, abs),
            filePath: abs,
          };
        }
      }

      const cliStatusLineScript = manifest.cli?.statusLineScript
        ? path.resolve(packDir, manifest.cli.statusLineScript)
        : '';

      return {
        slug,
        packDir,
        manifest,
        fontCss,
        sharedCss: readRel('shared.css'),
        ideCss: readRel('ide.css'),
        appCss: readRel('app.css'),
        backdrop,
        cliStatusLineScript:
          cliStatusLineScript && cliStatusLineScript.startsWith(path.resolve(packDir)) && fs.existsSync(cliStatusLineScript)
            ? cliStatusLineScript
            : '',
      };
    } catch (_) {
      return null;
    }
  }

  createThemeFile({ name, author = 'User', description = '', css = '' }) {
    const cleanName = String(name || 'Custom Theme').trim();
    const baseFile = slugifyThemeName(cleanName);
    let fileName = baseFile;
    let counter = 2;
    while (fs.existsSync(path.join(this.themesDir, fileName))) {
      fileName = baseFile.replace(/\.theme\.css$/, `-${counter}.theme.css`);
      counter++;
    }

    const body = css && css.trim()
      ? css.trim()
      : `:root {\n  --ag-accent: #3b82f6;\n  --ag-radius: 10px;\n}\n`;

    const hasHeader = /^\s*\/\*\*[\s\S]*?@name\b/.test(body);
    const content = hasHeader
      ? body + '\n'
      : [
          '/**',
          ` * @name ${cleanName}`,
          ` * @author ${String(author || 'User').trim()}`,
          ' * @version 1.0.0',
          ` * @description ${String(description || 'Custom theme for Antigravity').trim()}`,
          ' */',
          '',
          body,
          '',
        ].join('\n');

    const filePath = path.join(this.themesDir, fileName);
    fs.writeFileSync(filePath, content, 'utf8');
    return {
      id: fileName,
      fileName,
      kind: 'css',
      filePath,
      ...parseThemeMetadata(content, fileName),
    };
  }

  createThemePack({ name, author = 'User', description = '', config = null, sharedCss = '', ideCss = '', appCss = '' }) {
    const cleanName = String(name || 'My Theme Pack').trim();
    const baseSlug = slugify(cleanName);
    let folderName = baseSlug;
    let counter = 2;
    while (fs.existsSync(path.join(this.themesDir, folderName))) {
      folderName = `${baseSlug}-${counter}`;
      counter++;
    }

    const packDir = path.join(this.themesDir, folderName);
    fs.mkdirSync(path.join(packDir, 'assets'), { recursive: true });
    fs.mkdirSync(path.join(packDir, 'cli'), { recursive: true });

    const manifest = {
      name: cleanName,
      author: String(author || 'User').trim(),
      version: '1.0.0',
      description: String(description || 'Unified theme pack for Antigravity IDE, App, and CLI').trim(),
      targets: ['ide', 'app', 'cli'],
      animation: { preset: config?.animationPreset || 'none' },
      cli: {
        colorScheme: config?.cli?.colorScheme || 'terminal',
        runningLightSpeed: config?.cli?.runningLightSpeed || 'medium',
        statusLinePreset: config?.cli?.statusLinePreset || 'powerline',
        terminalFontFace: config?.cli?.terminalFontFace || 'JetBrainsMono Nerd Font',
      },
    };

    fs.writeFileSync(path.join(packDir, 'theme.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    fs.writeFileSync(
      path.join(packDir, 'shared.css'),
      sharedCss || `/* Shared CSS variables & rules for Antigravity IDE + App */\n:root {\n  --ag-accent: ${config?.accentColor || '#3b82f6'};\n  --ag-radius: ${config?.cornerRadius ?? 10}px;\n}\n`,
      'utf8'
    );
    fs.writeFileSync(
      path.join(packDir, 'ide.css'),
      ideCss || `/* Antigravity IDE (.monaco-workbench) overrides */\n`,
      'utf8'
    );
    fs.writeFileSync(
      path.join(packDir, 'app.css'),
      appCss || `/* Antigravity App (.agy-shell) overrides */\n`,
      'utf8'
    );

    return {
      id: `pack:${folderName}`,
      fileName: `pack:${folderName}`,
      folderName,
      kind: 'pack',
      filePath: packDir,
      ...manifest,
    };
  }

  deleteThemeItem(themeId) {
    const id = String(themeId || '').trim();
    if (!id || id.includes('..')) return false;

    if (id.startsWith('pack:')) {
      const folder = path.basename(id.slice(5));
      const fullPath = path.join(this.themesDir, folder);
      if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) return false;
      fs.rmSync(fullPath, { recursive: true, force: true });
      return true;
    }

    const safeName = path.basename(id);
    if (!safeName.toLowerCase().endsWith('.theme.css')) return false;
    const fullPath = path.join(this.themesDir, safeName);
    if (!fs.existsSync(fullPath)) return false;
    fs.unlinkSync(fullPath);
    return true;
  }

  /**
   * Imports local *.theme.css / *.css files or Theme Pack directories (containing theme.json)
   * into the user's themes directory.
   */
  importThemeItems(filePaths) {
    const imported = [];
    for (const raw of Array.isArray(filePaths) ? filePaths : []) {
      if (!raw || !fs.existsSync(raw)) continue;
      const absPath = path.resolve(raw);
      let stat;
      try {
        stat = fs.statSync(absPath);
      } catch (_) {
        continue;
      }

      if (stat.isDirectory()) {
        const manifestPath = path.join(absPath, 'theme.json');
        if (!fs.existsSync(manifestPath)) continue;
        let slug = slugify(path.basename(absPath));
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
          if (manifest?.name) slug = slugify(manifest.name);
        } catch (_) {}

        let destSlug = slug;
        let counter = 2;
        while (
          fs.existsSync(path.join(this.themesDir, destSlug)) &&
          path.resolve(this.themesDir, destSlug).toLowerCase() !== absPath.toLowerCase()
        ) {
          destSlug = `${slug}-${counter}`;
          counter++;
        }

        const destDir = path.join(this.themesDir, destSlug);
        if (path.resolve(destDir).toLowerCase() !== absPath.toLowerCase()) {
          copyDirRecursive(absPath, destDir);
        }
        imported.push({ id: `pack:${destSlug}`, kind: 'pack', name: destSlug });
      } else if (stat.isFile()) {
        const lower = absPath.toLowerCase();
        if (lower.endsWith('.zip')) {
          const tmpExtract = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-pack-zip-'));
          try {
            extractZipSafe(absPath, tmpExtract);
            const manifestPath = path.join(tmpExtract, 'theme.json');
            if (!fs.existsSync(manifestPath)) continue;
            let slug = slugify(path.basename(absPath, '.zip').replace(/\.agtheme$/i, ''));
            try {
              const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
              if (manifest?.name) slug = slugify(manifest.name);
            } catch (_) {}

            let destSlug = slug;
            let counter = 2;
            while (fs.existsSync(path.join(this.themesDir, destSlug))) {
              destSlug = `${slug}-${counter}`;
              counter++;
            }
            copyDirRecursive(tmpExtract, path.join(this.themesDir, destSlug), true);
            imported.push({ id: `pack:${destSlug}`, kind: 'pack', name: destSlug });
          } catch (_) {
            // Skip invalid/unsafe zip silently or let caller report 0 added
          } finally {
            try { fs.rmSync(tmpExtract, { recursive: true, force: true }); } catch (_) {}
          }
          continue;
        }
        if (!lower.endsWith('.css')) continue;
        const base = path.basename(absPath);
        const normalized = base.toLowerCase().endsWith('.theme.css')
          ? base
          : `${slugify(path.basename(absPath, path.extname(absPath)))}.theme.css`;

        let destName = normalized;
        let counter = 2;
        while (
          fs.existsSync(path.join(this.themesDir, destName)) &&
          path.resolve(this.themesDir, destName).toLowerCase() !== absPath.toLowerCase()
        ) {
          destName = normalized.replace(/\.theme\.css$/i, `-${counter}.theme.css`);
          counter++;
        }

        const destPath = path.join(this.themesDir, destName);
        if (path.resolve(destPath).toLowerCase() !== absPath.toLowerCase()) {
          fs.copyFileSync(absPath, destPath);
        }
        imported.push({ id: destName, kind: 'css', name: destName });
      }
    }
    return imported;
  }

  exportPackZip(themeId, outZipPath) {
    const id = String(themeId || '').trim();
    if (!id.startsWith('pack:')) throw new Error('Only Theme Packs can be exported as ZIP.');
    const folder = path.basename(id.slice(5));
    const packDir = path.join(this.themesDir, folder);
    if (!fs.existsSync(path.join(packDir, 'theme.json'))) {
      throw new Error('Theme Pack folder or theme.json not found.');
    }
    return createZipFromDir(packDir, outZipPath);
  }

  getQuickCss() {
    try {
      this.ensureQuickCssFile();
      return fs.readFileSync(this.quickCssPath, 'utf8');
    } catch (_) {
      return '';
    }
  }

  saveQuickCss(cssText) {
    fs.writeFileSync(this.quickCssPath, String(cssText || ''), 'utf8');
    return true;
  }

  async fetchOnlineTheme(url, forceRefresh = false) {
    const cleanUrl = String(url || '').trim();
    if (!/^https:\/\/[^\s]+$/i.test(cleanUrl)) {
      return { url: cleanUrl, css: '', error: 'URL must start with https://' };
    }

    const cached = this.onlineCache.get(cleanUrl);
    if (cached && !forceRefresh && Date.now() - cached.fetchedAt < 5 * 60 * 1000) {
      return cached;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ONLINE_FETCH_TIMEOUT_MS);
    try {
      const resp = await fetch(cleanUrl, {
        signal: controller.signal,
        headers: { Accept: 'text/css, text/plain;q=0.9' },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      if (Buffer.byteLength(text, 'utf8') > MAX_ONLINE_CSS_BYTES) {
        throw new Error('CSS file exceeds 512 KB limit');
      }
      if (/<script[\s>]/i.test(text) || /<!doctype\s+html/i.test(text)) {
        throw new Error('URL returned HTML instead of CSS');
      }
      const fileName = path.basename(new URL(cleanUrl).pathname) || 'online.theme.css';
      const entry = {
        url: cleanUrl,
        css: text,
        meta: parseThemeMetadata(text, fileName),
        fetchedAt: Date.now(),
        error: null,
      };
      this.onlineCache.set(cleanUrl, entry);
      return entry;
    } catch (err) {
      const entry = {
        url: cleanUrl,
        css: cached?.css || '',
        meta: cached?.meta || null,
        fetchedAt: Date.now(),
        error: err.name === 'AbortError' ? 'Request timed out' : err.message,
      };
      this.onlineCache.set(cleanUrl, entry);
      return entry;
    } finally {
      clearTimeout(timer);
    }
  }

  async syncOnlineThemes(urls, forceRefresh = false) {
    return Promise.all((Array.isArray(urls) ? urls : []).map((u) => this.fetchOnlineTheme(u, forceRefresh)));
  }

  getOnlineThemeStatuses(urls) {
    return (Array.isArray(urls) ? urls : []).map((url) => {
      const cached = this.onlineCache.get(url);
      return {
        url,
        name: cached?.meta?.name || path.basename(url),
        author: cached?.meta?.author || '',
        loaded: Boolean(cached?.css),
        error: cached?.error || null,
      };
    });
  }

  /**
   * Collects CSS separately for IDE vs App surfaces, plus any pack-bundled backdrop/CLI script.
   */
  collectActiveBundle(config) {
    const ideChunks = [];
    const appChunks = [];
    let packBackdrop = null;
    let packCliStatusLine = '';

    for (const themeId of config.enabledThemes || []) {
      if (themeId.startsWith('pack:')) {
        const pack = this.readPackPayload(themeId);
        if (!pack) continue;
        const shared = [pack.fontCss, pack.sharedCss].filter(Boolean).join('\n');
        if (shared) {
          ideChunks.push(`/* === Pack Shared: ${pack.slug} === */\n${shared}`);
          appChunks.push(`/* === Pack Shared: ${pack.slug} === */\n${shared}`);
        }
        if (pack.ideCss) ideChunks.push(`/* === Pack IDE: ${pack.slug} === */\n${pack.ideCss}`);
        if (pack.appCss) appChunks.push(`/* === Pack App: ${pack.slug} === */\n${pack.appCss}`);
        if (pack.backdrop) packBackdrop = pack.backdrop;
        if (pack.cliStatusLineScript) packCliStatusLine = pack.cliStatusLineScript;
      } else {
        const css = this.readThemeCss(themeId);
        if (css && css.trim()) {
          const block = `/* === Theme: ${themeId} === */\n${css}`;
          ideChunks.push(block);
          appChunks.push(block);
        }
      }
    }

    for (const url of config.onlineThemeUrls || []) {
      const cached = this.onlineCache.get(url);
      if (cached?.css) {
        const block = `/* === Online Theme: ${url} === */\n${cached.css}`;
        ideChunks.push(block);
        appChunks.push(block);
      }
    }

    if (config.quickCssEnabled !== false) {
      const quick = this.getQuickCss().trim();
      if (quick) {
        const block = `/* === QuickCSS === */\n${quick}`;
        ideChunks.push(block);
        appChunks.push(block);
      }
    }

    return {
      ideCss: ideChunks.join('\n\n'),
      appCss: appChunks.join('\n\n'),
      packBackdrop,
      packCliStatusLine,
    };
  }

  startWatching() {
    this.stopWatching();
    const notify = () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.emit('changed'), 160);
    };

    try {
      this.watchers.push(fs.watch(this.themesDir, { recursive: true, persistent: false }, notify));
    } catch (_) {
      try {
        this.watchers.push(fs.watch(this.themesDir, { persistent: false }, notify));
      } catch (__) {}
    }

    try {
      this.watchers.push(fs.watch(this.quickCssPath, { persistent: false }, notify));
    } catch (_) {}
  }

  stopWatching() {
    clearTimeout(this.debounceTimer);
    for (const w of this.watchers) {
      try { w.close(); } catch (_) {}
    }
    this.watchers = [];
  }
}

module.exports = { ThemeManager, parseThemeMetadata, slugifyThemeName, slugify };
