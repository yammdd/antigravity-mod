'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { DEFAULT_CONFIG, sanitizeConfigPatch } = require('../electron/core/defaults.cjs');
const { ThemeManager, parseThemeMetadata } = require('../electron/core/theme-manager.cjs');
const { compileStylesheet, buildExportThemeCss } = require('../electron/injector/css-compiler.cjs');
const { buildInjectScript, buildRemoveScript } = require('../electron/injector/runtime-script.cjs');
const { LocalMediaServer } = require('../electron/core/media-server.cjs');
const {
  CLI_THEME_PRESETS,
  stripJsonc,
  buildAnsiPalette,
  formatStatusLineCommand,
  generateStatusLineScript,
  generateTerminalSnippets,
} = require('../electron/core/cli-themer.cjs');
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
    assert.ok(list.some((t) => t.id === 'pack:carbon-studio' && t.kind === 'pack'), 'carbon-studio pack should be seeded');
    assert.ok(list.some((t) => t.id === 'pack:rainy-window' && t.category === 'anime' && t.previewUrl), 'rainy-window anime pack should be seeded with preview');
    assert.ok(list.some((t) => t.id === 'pack:cozy-rain-live' && t.backdropMediaType === 'video' && t.cliBackdropIsGif), 'cozy-rain-live looping video pack should expose animated GIF for CLI');
    assert.ok(list.some((t) => t.id === 'pack:sakura-shrine-gif' && t.isGif && t.category === 'gif'), 'sakura-shrine-gif animated GIF pack should be seeded');
    assert.ok(list.some((t) => t.id === 'pack:snowy-station-gif' && t.isGif), 'snowy-station-gif animated GIF pack should be seeded');
    assert.ok(list.some((t) => t.id === 'pack:midnight-rain-gif' && t.isGif), 'midnight-rain-gif animated GIF pack should be seeded');
    assert.ok(list.some((t) => t.id === 'pack:neon-rooftop-gif' && t.isGif), 'neon-rooftop-gif animated GIF pack should be seeded');
    const builtInWps = mgr.listBuiltInWallpapers();
    assert.ok(builtInWps.length >= 16, 'should expose all 16 bundled real anime/GIF/landscape/video wallpapers');
    assert.ok(builtInWps.filter((w) => w.cliBgIsGif).length >= 8, 'CLI should have at least 8 built-in animated GIF backgrounds');
    assert.ok(builtInWps.some((w) => w.mediaType === 'video' && w.posterFilePath && w.posterFilePath.endsWith('.jpg')), 'video wallpapers must expose JPG posterFilePath');
    assert.ok(builtInWps.filter((w) => w.mediaType === 'image').every((w) => !w.filePath.endsWith('.webp')), 'bundled image/GIF wallpapers must not use WebP');
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

    console.log('ALL 3-SURFACE CORE TESTS PASSED (IDE + App + CLI)');
  } finally {
    srv.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
