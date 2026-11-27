# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-11-27

### Added
- **Auto OS Dark/Light Sync across all 3 surfaces**: Added `Auto (OS)` color mode for Antigravity IDE & App (driven by Electron `nativeTheme` events) and `Auto-follow OS Dark / Light` with customizable Dark & Light preset pairs for `agy` CLI and Windows Terminal.
- **3-Surface Selector Registry & Live Diagnostics**: Added `electron/core/host-selectors.cjs`, Antigravity v2.34–2.35 App/Chat selectors (`sidebar-split`, `conversation-view`, `agent-input-box`, `overview-panel-host`, `step-plan`), read-only CDP selector compatibility checks in **Settings → 3-Surface Diagnostics**, and `runCliDiagnostics()` health checks in both **CLI Studio** and **Settings**.
- **Opt-in Long Code Block Folding**: Collapse code blocks exceeding 22 lines in IDE Chat and Antigravity App using a zero-`innerHTML`, cleanly reversible DOM wrapper.
- **CodeQL & CI Security Fitness Gates**: Added `.github/workflows/codeql.yml` and automated test gates enforcing `0 innerHTML`, `0 taskkill`, `0 :has()`, balanced CSS braces, and loopback `Host`/`Origin` validation.
- **Non-Affiliation & Trademark Disclaimer**: Clarified independent community status in `README.md` and expanded `SECURITY.md`.

### Security & Performance
- **DNS rebinding & CORS hardening**: `LocalMediaServer` now validates strict loopback `Host` headers (`127.0.0.1:<port>` / `localhost:<port>`) and rejects untrusted cross-site `Origin` headers with `403`.
- **Safe process launch (zero `taskkill /F`)**: Replaced forced termination in `ide-integration.cjs` with read-only process detection (`tasklist` / `pgrep`) that prompts users to save and close cleanly.
- **0-FPS Idle Power Saving**: Particle canvas animations and dual-deck video backdrops now pause automatically on window `blur` in addition to `visibilitychange`.

## [1.1.0] - 2026-11-26

### Added
- **Windows Terminal HLSL pixel shaders**: Bundled 3 lightweight shaders (*Subtle Vignette*, *Soft Bloom*, *CRT Scanlines*) copied to persistent app data so Windows Terminal keeps valid shader paths even with portable `.exe` builds.
- **Custom 16-color ANSI palette editor & JSON presets**: Fork any built-in CLI palette with live color swatches and export/import portable `agy` CLI preset `.json` files.
- **1-click external terminal config sync**: Write managed theme configurations (with automatic `.agthemes.bak` backup) directly for **Ghostty**, **WezTerm**, **Kitty**, and **Alacritty** alongside copyable snippets.
- **Shareable `.zip` Theme Packs**: Zero-dependency ZIP exporter and zip-slip-safe importer (`Import .zip` button, per-pack export button, and drag-and-drop support).
- **GitHub Releases update checker**: Check installed vs. latest release version from **Settings** with a direct link to the release page.
- **Multi-platform Release CI**: Automated builds for Windows (`.exe`), macOS (`.dmg`), and Linux (`.AppImage`) with generated `SHA256SUMS.txt`.
- **README visual showcase**: Added desktop studio screenshots (`CLI Studio`, `Themes Gallery`, `Guided Setup`) and `ffmpeg` installation hint in CLI Studio when absent.

## [1.0.0] - 2026-11-26

### Added
- **3-surface UI theming**: Live runtime CSS theming for Antigravity IDE (`.monaco-workbench` + embedded chat) and Antigravity App (`.agy-shell`), plus standalone configuration for Antigravity CLI (`agy`).
- **Guided Setup**: Choose one, several, or all surfaces on first launch and switch targets anytime.
- **Standalone CLI (`agy`) Studio**:
  - Dedicated live `agy` terminal preview with real 16-color ANSI palette rendering, cursor shapes, and live status bar preview.
  - 8 standalone 16-color terminal presets (*Tokyo Night*, *Catppuccin Mocha*, *Rose Pine*, *Nord Frost*, *Gruvbox Dark*, *Cyberpunk Cyan*, *Dracula*, *GitHub Light*).
  - Modular ANSI `statusLine` builder (`Powerline`, `Bracketed badges`, `Bracketed segments`, `Compact`, `Minimal`) with live Node.js self-test.
  - JSONC-safe Windows Terminal sync (`Antigravity CLI` profile + default profile option + `.agthemes.bak` backup & restore) and config export for Ghostty, WezTerm, Kitty, and Alacritty.
  - Animated GIF backgrounds and automatic short video-to-GIF conversion via `ffmpeg`.
- **16 bundled Theme Packs & 4 starter `.theme.css` files**: Curated real anime illustrations, landscape photography, 4 animated pixel-art/lofi GIF packs, 4 looping `.webm` video packs (each paired with a looping CLI `.gif`), and 4 minimal CSS themes.
- **Studio & QuickCSS**: Accent color picker, dark/light surfaces, custom local fonts (`.woff2`, `.ttf`, `.otf`), live particle animations (*Sakura*, *Rain*, *Stars*, *Ken Burns*), frosted popups, QuickCSS live editor, and `https://` online CSS links.
- **Single portable Windows executable**: Packaged via `electron-builder` with custom app, taskbar, and system tray icons.
