'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const { DEFAULT_CONFIG, resolveEffectiveColorMode, sanitizeConfigPatch } = require('../electron/core/defaults.cjs');
const { ThemeManager, parseThemeMetadata } = require('../electron/core/theme-manager.cjs');
const { compileStylesheet, buildExportThemeCss } = require('../electron/injector/css-compiler.cjs');
const { buildInjectScript, buildRemoveScript } = require('../electron/injector/runtime-script.cjs');
const { LocalMediaServer } = require('../electron/core/media-server.cjs');
const { HOST_SELECTOR_CONTRACTS, buildDomCompatProbeScript } = require('../electron/core/host-selectors.cjs');
const {
  CLI_THEME_PRESETS,
  CLI_SHADER_PRESETS,
  stripJsonc,
  resolvePersistentShaderPath,
  resolveActiveCliPresetId,
  buildAnsiPalette,
  formatStatusLineCommand,
  generateStatusLineScript,
  generateTerminalSnippets,
  syncExternalTerminalConfig,
  exportCliPresetJson,
  parseCliPresetJson,
  runCliDiagnostics,
} = require('../electron/core/cli-themer.cjs');
const { createZipFromDir, extractZipSafe } = require('../electron/core/zip-pack.cjs');
const { compareSemver } = require('../electron/core/updater.cjs');
const { CdpBridge } = require('../electron/core/cdp-bridge.cjs');

async function run() {
  // 1. Config sanitization & clamping (including CLI block + pack IDs)
  const patched = sanitizeConfigPatch({
    setupCompleted: true,
    accentColor: '#0EA5E9',
    chatFontSize: 99,
    cornerRadius: -5,
    colorMode: 'invalid-mode',
    animationPreset: 'tab-slide',
    enabledThemes: ['obsidian-glass.theme.css', 'pack:carbon-studio', '../evil.js'],
    onlineThemeUrls: ['https://example.com/a.theme.css', 'http://insecure.com/x.css', 'javascript:alert(1)'],
    cli: {
      presetId: 'catppuccin-mocha',
      colorScheme: 'tokyo night',
      runningLightSpeed: 'fast',
      altScreenMode: 'always',
      statusLinePreset: 'badges',
      terminalCursorShape: 'filledBox',
      terminalFontSize: 50,
      statusLinePadding: 99,
    },
    unknownProp: 'drop-me',
  });
  assert.strictEqual(patched.setupCompleted, true);
  assert.strictEqual(patched.accentColor, '#0ea5e9');
  assert.strictEqual(patched.chatFontSize, 18);
  assert.strictEqual(patched.cornerRadius, 0);
  assert.strictEqual(patched.colorMode, undefined);
  assert.strictEqual(patched.animationPreset, 'tab-slide');
  assert.deepStrictEqual(patched.enabledThemes, ['obsidian-glass.theme.css', 'pack:carbon-studio']);
  assert.deepStrictEqual(patched.onlineThemeUrls, ['https://example.com/a.theme.css']);
  assert.strictEqual(patched.cli.presetId, 'catppuccin-mocha');
  assert.strictEqual(patched.cli.colorScheme, 'tokyo night');
  assert.strictEqual(patched.cli.altScreenMode, 'always');
  assert.strictEqual(patched.cli.statusLinePreset, 'badges');
  assert.strictEqual(patched.cli.terminalCursorShape, 'filledBox');
  assert.strictEqual(patched.cli.terminalFontSize, 24);
  assert.strictEqual(patched.cli.statusLinePadding, 3);
  assert.strictEqual(patched.unknownProp, undefined);
  assert.strictEqual(sanitizeConfigPatch({ tabsStyle: 'pills' }).tabsStyle, undefined, 'Pill tab mode must be removed');

  // 2. Media server (loopback, token auth, font MIME types)
  const srv = new LocalMediaServer();
  const port = await srv.start();
  assert.ok(port > 0);

  // 3. ThemeManager: single .theme.css + Theme Pack seeding, CRUD, asset rewrite & collection
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-themes-test-'));
  try {
    const bundledDir = path.resolve(__dirname, '..', 'themes');
    const mgr = new ThemeManager(tmpDir, bundledDir, srv);
    const list = mgr.listLocalThemes();
    assert.ok(list.some((t) => t.id === 'obsidian-glass.theme.css'), 'obsidian-glass should be seeded');
    assert.ok(list.some((t) => t.id === 'paper-light.theme.css'), 'paper-light should be seeded');
    assert.ok(list.some((t) => t.id === 'pack:carbon-studio' && t.kind === 'pack'), 'carbon-studio pack should be seeded');
    assert.ok(list.some((t) => t.id === 'pack:rainy-window' && t.category === 'anime' && t.previewUrl), 'rainy-window 4K anime pack should be seeded with preview');
    assert.ok(list.some((t) => t.id === 'pack:cozy-rain-live' && t.backdropMediaType === 'video' && t.cliBackdropIsGif), 'cozy-rain-live 1080p looping video pack should expose animated GIF for CLI');
    assert.ok(list.some((t) => t.id === 'pack:sakura-shrine-gif' && t.isGif && t.category === 'gif'), 'sakura-shrine-gif animated GIF pack should be seeded');
    assert.ok(list.some((t) => t.id === 'pack:snowy-station-gif' && t.isGif), 'snowy-station-gif animated GIF pack should be seeded');
    const builtInWps = mgr.listBuiltInWallpapers();
    assert.ok(builtInWps.length >= 9, 'should expose all 9 curated 4K/HD/GIF bundled wallpapers');
    assert.ok(builtInWps.filter((w) => w.cliBgIsGif).length >= 3, 'CLI should have at least 3 built-in animated GIF backgrounds');
    assert.ok(builtInWps.some((w) => w.mediaType === 'video' && w.posterFilePath && w.posterFilePath.endsWith('.jpg')), 'video wallpapers must expose JPG posterFilePath');
    assert.ok(builtInWps.filter((w) => w.mediaType === 'image').every((w) => !w.filePath.endsWith('.webp')), 'bundled image/GIF wallpapers must not use WebP');
    // Verify all 6 curated static 4K backdrops are genuine 3840x2160 UHD
    const readJpegDims = (fp) => {
      const b = fs.readFileSync(fp);
      let i = 2;
      while (i < b.length) {
        if (b[i] !== 0xff) break;
        const m = b[i + 1];
        const len = b.readUInt16BE(i + 2);
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
          return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
        }
        i += 2 + len;
      }
      return { w: 0, h: 0 };
    };
    for (const slug of ['tokyo-tower-rain', 'fuji-twilight', 'fuji-mono-light', 'rainy-window', 'balcony-night', 'comet-lake']) {
      const dims = readJpegDims(path.join(bundledDir, slug, 'assets', 'backdrop.jpg'));
      assert.strictEqual(dims.w, 3840, `${slug} backdrop width must be 4K (3840), got ${dims.w}`);
      assert.strictEqual(dims.h, 2160, `${slug} backdrop height must be 4K (2160), got ${dims.h}`);
    }
    assert.strictEqual(DEFAULT_CONFIG.cli.terminalApplyToDefaultProfile, true, 'CLI should apply to default Windows Terminal profile out of the box');
    assert.strictEqual(DEFAULT_CONFIG.cli.terminalSyncThemeWallpaper, false, 'CLI must stay decoupled from IDE themes by default');
    assert.strictEqual(DEFAULT_CONFIG.cli.altScreenMode, 'auto', 'altScreenMode must default to official auto value');

    const createdCss = mgr.createThemeFile({ name: 'Unit CSS', author: 'QA', description: 'Temp' });
    assert.strictEqual(createdCss.fileName, 'unit-css.theme.css');
    assert.strictEqual(mgr.deleteThemeItem(createdCss.id), true);

    const createdPack = mgr.createThemePack({ name: 'Unit Pack', author: 'QA', config: DEFAULT_CONFIG });
    assert.strictEqual(createdPack.id, 'pack:unit-pack');
    assert.ok(fs.existsSync(path.join(createdPack.filePath, 'theme.json')));
    assert.strictEqual(mgr.deleteThemeItem(createdPack.id), true);

    // Import single .css file and Theme Pack directory
    const externalCss = path.join(tmpDir, 'external-import.css');
    fs.writeFileSync(externalCss, ':root { --ag-accent: #10b981; }\n', 'utf8');
    const imported = mgr.importThemeItems([externalCss, path.join(bundledDir, 'carbon-studio')]);
    assert.strictEqual(imported.length, 2);
    assert.ok(imported.some((x) => x.kind === 'css' && x.id.endsWith('.theme.css')));
    assert.ok(imported.some((x) => x.kind === 'pack' && x.id.startsWith('pack:carbon-studio')));

    mgr.saveQuickCss(':root { --ag-accent: #14b8a6; }');
    const bundle = mgr.collectActiveBundle({
      ...DEFAULT_CONFIG,
      enabledThemes: ['pack:carbon-studio', 'obsidian-glass.theme.css'],
    });
    assert.ok(bundle.ideCss.includes('Pack IDE: carbon-studio'));
    assert.ok(bundle.appCss.includes('Pack App: carbon-studio'));
    assert.ok(bundle.ideCss.includes('--ag-accent: #14b8a6'));
    assert.ok(bundle.packCliStatusLine.endsWith('statusline.cjs'));

    // 4. CSS compiler (IDE, App, custom fonts, animations, export)
    const fakeFontUrl = srv.register('font:demo', path.join(bundledDir, 'obsidian-glass.theme.css'));
    const compiledIde = compileStylesheet({
      config: {
        ...DEFAULT_CONFIG,
        uiFont: 'custom',
        customUiFontId: 'demo',
        animationPreset: 'aurora-edge',
        frostedPopups: true,
        roundedTreeRows: true,
        smoothCursor: true,
        tabsStyle: 'underline',
      },
      targetKind: 'ide',
      activeWallpaper: null,
      customFonts: [{ id: 'demo', family: 'Demo Sans', fontUrl: fakeFontUrl }],
      userCss: bundle.ideCss,
    });
    assert.ok(compiledIde.includes("@font-face"));
    assert.ok(compiledIde.includes("Demo Sans"));
    assert.ok(compiledIde.includes('@keyframes agEdgeGlide'));
    assert.ok(compiledIde.includes('font-family: codicon !important;'));
    assert.ok(compiledIde.includes('.tab.active'), 'Underline tab style should be compiled');
    assert.ok(compiledIde.includes('.quick-input-widget'), 'Frosted popups must style Command Palette');
    assert.ok(compiledIde.includes('.monaco-tree-sticky-row'), 'Explorer sticky tree headers must be themed');
    assert.ok(compiledIde.includes('.xterm-viewport'), 'IDE integrated terminal viewport must be transparent');

    const compiledDefaultTabs = compileStylesheet({
      config: { ...DEFAULT_CONFIG, tabsStyle: 'default' },
      targetKind: 'ide',
      activeWallpaper: null,
      userCss: '',
    });
    assert.ok(!compiledDefaultTabs.includes('border-radius: 7px'), 'Default IDE tabs must stay stock without pill bubble styling');

    const compiledApp = compileStylesheet({
      config: { ...DEFAULT_CONFIG, chatBubbleStyle: 'floating', glassBlur: 14 },
      targetKind: 'app',
      activeWallpaper: { mediaUrl: 'http://127.0.0.1:1/x.webp', mediaType: 'image' },
      userCss: bundle.appCss,
    });
    assert.ok(compiledApp.includes('.agy-shell'));
    assert.ok(compiledApp.includes('[data-side-panel-body="true"]'));
    assert.ok(compiledApp.includes('backdrop-filter: blur(14px)'), 'App glass blur should be compiled');
    assert.ok(compiledApp.includes('.settings-modal-container'), 'App Settings modal must be themed');

    const exported = buildExportThemeCss(DEFAULT_CONFIG, { name: 'Exported', author: 'Dev' });
    const parsedExport = parseThemeMetadata(exported, 'exported.theme.css');
    assert.strictEqual(parsedExport.name, 'Exported');

    // 5. Runtime injector script syntax, live FX presets & Trusted-Types safety
    for (const fx of ['sakura', 'rain', 'stars', 'ken-burns']) {
      const fxCss = compileStylesheet({
        config: { ...DEFAULT_CONFIG, animationPreset: fx },
        targetKind: 'ide',
        activeWallpaper: null,
      });
      if (fx === 'ken-burns') assert.ok(fxCss.includes('@keyframes agKenBurns'));
    }
    const injectCode = buildInjectScript({
      config: { ...DEFAULT_CONFIG, animationPreset: 'sakura' },
      cssIde: compiledIde,
      cssIdeChat: compiledApp,
      cssApp: compiledApp,
    });
    assert.ok(!injectCode.includes('innerHTML'), 'Runtime script must not use innerHTML');
    assert.ok(injectCode.includes('ag-theme-fx-canvas'), 'Runtime script should include live particle FX canvas');
    new Function(injectCode);
    new Function(buildRemoveScript());

    // 6. Media server token enforcement
    const badRes = await fetch(`http://127.0.0.1:${port}/media/00000000000000000000000000000000/font%3Ademo`);
    assert.strictEqual(badRes.status, 404);
    const okRes = await fetch(fakeFontUrl);
    assert.strictEqual(okRes.status, 200);

    // 7. Standalone CLI Themer (8 presets, JSONC parser, modular statusLine, 4 terminal snippets)
    assert.strictEqual(Object.keys(CLI_THEME_PRESETS).length, 8, 'must ship 8 standalone CLI presets');
    assert.deepStrictEqual(JSON.parse(stripJsonc('// comment\n{"a": 1, /* block */ "b": [2,],}')), { a: 1, b: [2] });

    const tokyoPalette = buildAnsiPalette(DEFAULT_CONFIG);
    assert.strictEqual(tokyoPalette.background, '#1a1b26');
    const catPalette = buildAnsiPalette({
      ...DEFAULT_CONFIG,
      cli: { ...DEFAULT_CONFIG.cli, presetId: 'catppuccin-mocha' },
    });
    assert.strictEqual(catPalette.background, '#1e1e2e');
    const customPalette = buildAnsiPalette({
      ...DEFAULT_CONFIG,
      cli: { ...DEFAULT_CONFIG.cli, presetId: 'custom' },
    });
    assert.strictEqual(customPalette.blue, DEFAULT_CONFIG.accentColor);

    const statusScript = generateStatusLineScript('badges', '#cba6f7', {
      showModel: true,
      showFolder: true,
      showBranch: true,
      showContextBar: true,
      showClock: true,
      prefix: '▲',
    });
    new Function(statusScript);
    const statusFile = path.join(tmpDir, 'test-statusline.cjs');
    fs.writeFileSync(statusFile, statusScript, 'utf8');
    const cmdLine = formatStatusLineCommand(statusFile);
    assert.ok(!cmdLine.includes('"'), 'statusLine command must not contain literal quotes (agy splits by whitespace)');
    const [cmdBin, ...cmdArgs] = cmdLine.split(/\s+/);
    assert.strictEqual(cmdBin, 'node');
    const { execFileSync } = require('child_process');
    const slOut = execFileSync(process.execPath, cmdArgs, {
      input: JSON.stringify({ cwd: 'C:\\repo\\antigravity-mod', model: { display_name: 'Gemini 4 Neon' }, git: { branch: 'main' }, context_window: { used_percentage: 25 } }),
      encoding: 'utf8',
    });
    assert.ok(slOut.includes('▲ Gemini 4 Neon') && slOut.includes('antigravity-mod') && slOut.includes('25%'), 'statusLine script must render live ANSI output');
    const snippets = generateTerminalSnippets(DEFAULT_CONFIG);
    assert.ok(snippets.ghostty.includes('font-family = JetBrainsMono Nerd Font'));
    assert.ok(snippets.wezterm.includes('window_background_opacity'));
    assert.ok(snippets.kitty.includes('background_opacity'));
    assert.ok(snippets.alacritty.includes('[colors.primary]'));

    // 8. CDP Bridge target classification (IDE vs IDE-Chat vs Standalone App)
    const bridge = new CdpBridge(() => ({}));
    assert.strictEqual(
      bridge.classifyTarget({ type: 'page', url: 'vscode-file://vscode-app/workbench.html', webSocketDebuggerUrl: 'ws://x' }, true),
      'ide'
    );
    assert.strictEqual(
      bridge.classifyTarget({ type: 'iframe', url: 'http://127.0.0.1:4200/launchpad', webSocketDebuggerUrl: 'ws://x' }, true),
      'ide-chat'
    );
    assert.strictEqual(
      bridge.classifyTarget({ type: 'page', url: 'http://127.0.0.1:4200/launchpad', webSocketDebuggerUrl: 'ws://x' }, false),
      'app'
    );

    // 9. v1.1.0 features: HLSL shaders, custom ANSI palette + JSON preset, 1-click external terminal sync, ZIP pack, updater
    assert.strictEqual(CLI_SHADER_PRESETS.length, 4, 'must ship None + 3 HLSL shaders');
    for (const sh of CLI_SHADER_PRESETS.filter((s) => s.id !== 'none')) {
      const copiedShader = resolvePersistentShaderPath(sh.id, tmpDir);
      assert.ok(copiedShader && fs.existsSync(copiedShader), `HLSL shader ${sh.id} must resolve and copy cleanly`);
    }

    const customCfg = {
      ...DEFAULT_CONFIG,
      cli: {
        ...DEFAULT_CONFIG.cli,
        presetId: 'custom',
        terminalShader: 'subtle-vignette',
        customPalette: { background: '#101218', blue: '#00d1b2' },
      },
    };
    const customPal = buildAnsiPalette(customCfg);
    assert.strictEqual(customPal.background, '#101218');
    assert.strictEqual(customPal.blue, '#00d1b2');
    const exportedPreset = exportCliPresetJson(customCfg);
    const parsedPreset = parseCliPresetJson(exportedPreset);
    assert.strictEqual(parsedPreset.cliPatch.customPalette.background, '#101218');
    assert.strictEqual(parsedPreset.cliPatch.terminalShader, 'subtle-vignette');

    const fakeHome = path.join(tmpDir, 'fake-home');
    for (const term of ['ghostty', 'kitty', 'alacritty', 'wezterm']) {
      const syncRes = syncExternalTerminalConfig(term, customCfg, fakeHome);
      assert.strictEqual(syncRes.ok, true, `external sync for ${term} must succeed`);
      assert.ok(fs.existsSync(syncRes.themePath), `${term} theme file must exist`);
    }
    // Second write to ghostty should create .agthemes.bak backup cleanly
    syncExternalTerminalConfig('ghostty', customCfg, fakeHome);
    assert.ok(fs.existsSync(path.join(fakeHome, '.config', 'ghostty', 'config.agthemes.bak')));

    // ZIP Theme Pack export + import round-trip + zip-slip rejection
    const zipOut = path.join(tmpDir, 'carbon-studio.agtheme.zip');
    mgr.exportPackZip('pack:carbon-studio', zipOut);
    assert.ok(fs.existsSync(zipOut) && fs.statSync(zipOut).size > 200);
    const extractedDir = path.join(tmpDir, 'zip-check');
    extractZipSafe(zipOut, extractedDir);
    assert.ok(fs.existsSync(path.join(extractedDir, 'theme.json')));
    const importedZip = mgr.importThemeItems([zipOut]);
    assert.strictEqual(importedZip.length, 1);
    assert.ok(importedZip[0].id.startsWith('pack:carbon-studio'));

    // Updater semver comparisons
    assert.strictEqual(compareSemver('1.1.0', '1.0.0'), 1);
    assert.strictEqual(compareSemver('v1.1.0', '1.1.0'), 0);
    assert.strictEqual(compareSemver('1.0.9', '1.1.0'), -1);

    // 10. v1.2.0 Architecture & Security Fitness Gates (IDE + App + CLI)
    const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    const runtimeCode = stripComments(
      fs.readFileSync(path.resolve(__dirname, '..', 'electron', 'injector', 'runtime-script.cjs'), 'utf8')
    );
    assert.ok(!/\b(innerHTML|outerHTML|insertAdjacentHTML)\b/.test(runtimeCode), 'Fitness Gate: runtime-script.cjs must have 0 innerHTML/outerHTML/insertAdjacentHTML');

    const ideIntCode = stripComments(
      fs.readFileSync(path.resolve(__dirname, '..', 'electron', 'main', 'ide-integration.cjs'), 'utf8')
    );
    assert.ok(!/taskkill/i.test(ideIntCode), 'Fitness Gate: ide-integration.cjs must never force-kill via taskkill');

    const checkCssFitness = (css, label) => {
      assert.ok(!css.includes(':has('), `Fitness Gate (${label}): compiled CSS must not use :has()`);
      let depth = 0;
      for (const ch of css) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        assert.ok(depth >= 0, `Fitness Gate (${label}): unbalanced closing brace`);
      }
      assert.strictEqual(depth, 0, `Fitness Gate (${label}): unbalanced CSS braces (depth=${depth})`);
    };
    const foldedAppCss = compileStylesheet({
      config: { ...DEFAULT_CONFIG, colorMode: 'auto', foldLongCodeBlocks: true },
      targetKind: 'app',
      activeWallpaper: null,
      systemDark: false,
    });
    checkCssFitness(compiledIde, 'ide');
    checkCssFitness(compiledApp, 'app');
    checkCssFitness(foldedAppCss, 'app-auto-light-folded');
    assert.ok(foldedAppCss.includes('color-scheme: light'), 'Auto OS light mode must compile light palette');
    assert.ok(foldedAppCss.includes('[data-testid="agent-input-box"]'), 'App CSS must include v2.35 composer selector');
    assert.ok(foldedAppCss.includes('[data-testid="step-plan"]'), 'App CSS must include v2.35 step-plan selector');
    assert.ok(foldedAppCss.includes('.ag-code-fold-wrap'), 'foldLongCodeBlocks must compile code folding styles');

    const foldedScript = buildInjectScript({
      config: { ...DEFAULT_CONFIG, foldLongCodeBlocks: true },
      cssIde: compiledIde,
      cssIdeChat: foldedAppCss,
      cssApp: foldedAppCss,
    });
    assert.ok(foldedScript.includes('ag-code-fold-btn'), 'Runtime script must include opt-in code block folding');
    assert.ok(foldedScript.includes('isWindowIdle'), 'Runtime script must include 0-FPS blur/hidden idle gating');
    new Function(foldedScript);

    // DNS rebinding Host & Origin guard on LocalMediaServer
    const rawHttpStatus = (reqHeaders) =>
      new Promise((resolve, reject) => {
        const u = new URL(fakeFontUrl);
        const req = http.request(
          { hostname: '127.0.0.1', port: Number(u.port), path: u.pathname, method: 'GET', headers: reqHeaders },
          (res) => {
            res.resume();
            res.on('end', () => resolve(res.statusCode));
          }
        );
        req.on('error', reject);
        req.end();
      });
    assert.strictEqual(await rawHttpStatus({ Host: 'evil.example:80' }), 403, 'LocalMediaServer must reject non-loopback Host header (DNS rebinding guard)');
    assert.strictEqual(await rawHttpStatus({ Host: `127.0.0.1:${port}`, Origin: 'https://evil.example' }), 403, 'LocalMediaServer must reject untrusted cross-site Origin');
    assert.strictEqual(await rawHttpStatus({ Host: `127.0.0.1:${port}`, Origin: 'vscode-file://vscode-app' }), 200, 'LocalMediaServer must allow vscode-file:// origin with valid token');

    // Auto OS colorMode & CLI autoFollowOs
    assert.strictEqual(sanitizeConfigPatch({ colorMode: 'auto', foldLongCodeBlocks: true }).colorMode, 'auto');
    assert.strictEqual(resolveEffectiveColorMode({ colorMode: 'auto' }, true), 'dark');
    assert.strictEqual(resolveEffectiveColorMode({ colorMode: 'auto' }, false), 'light');
    const autoCliCfg = {
      ...DEFAULT_CONFIG,
      cli: {
        ...DEFAULT_CONFIG.cli,
        autoFollowOs: true,
        darkPresetId: 'catppuccin-mocha',
        lightPresetId: 'github-light',
      },
    };
    assert.strictEqual(resolveActiveCliPresetId(autoCliCfg, true), 'catppuccin-mocha');
    assert.strictEqual(resolveActiveCliPresetId(autoCliCfg, false), 'github-light');
    assert.strictEqual(buildAnsiPalette(autoCliCfg, true).background, '#1e1e2e');
    assert.strictEqual(buildAnsiPalette(autoCliCfg, false).background, '#ffffff');

    // 3-Surface Selector Registry & CLI Diagnostics
    assert.ok(HOST_SELECTOR_CONTRACTS.ide.length >= 6, 'IDE selector contract registry must cover core workbench areas');
    assert.ok(HOST_SELECTOR_CONTRACTS.shell.length >= 7, 'Shell selector contract registry must cover App/Chat areas');
    new Function(buildDomCompatProbeScript('ide'));
    new Function(buildDomCompatProbeScript('app'));
    new Function(buildDomCompatProbeScript('ide-chat'));
    const cliDiag = runCliDiagnostics(autoCliCfg, tmpDir, true);
    assert.ok(Array.isArray(cliDiag.checks) && cliDiag.checks.length >= 5, 'CLI diagnostics must report structured health checks');

    console.log('ALL 3-SURFACE CORE TESTS & v1.2.0 FITNESS GATES PASSED (IDE + App + CLI)');
  } finally {
    srv.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
