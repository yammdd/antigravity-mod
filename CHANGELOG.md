# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2026-11-27

### Added
- **12-Preset Live Dynamic Canvas Engine**: Expanded real-time animations with 9 new dynamic effects (*Live Aurora Waves*, *Shooting Stars*, *Star Constellation*, *Ambient Bokeh Orbs*, *Warm Fireflies*, *Winter Snowfall*, *Raindrop Ripples*, *Neon Code Rain*, *Synthwave Grid*) alongside *Sakura Petals*, *Midnight Rain*, and *Starlight Drift* — all accent-aware, reduced-motion-safe, and 0-FPS idle-paused when unfocused.
- **Live Speed & Intensity Controls**: Tune `Animation speed` (`0.4x`–`2.2x`) and `Animation intensity & density` (`25%`–`150%`) live in Studio with matching real-time preview inside `FxPreviewCanvas`.
- **Parallel Dynamic UI Motion**: Decoupled `Dynamic UI motion` (titlebar accent light glide, smooth reply fade-rise, focus pulse) so it runs simultaneously alongside any live canvas FX.
- **Dynamic-First 4K Theme Packs**: Paired all curated 4K UHD packs and *Carbon Studio* with tailored live dynamic animations by default (`SEED_VERSION = 8`) while keeping all 4K backdrops intact.

## [1.2.1] - 2026-11-27

### Changed
- **Curated 4K UHD Theme Collection (10 Packs + 2 CSS)**: Trimmed 9 redundant/low-resolution starter packs and upgraded all 6 static Landscape and Anime packs (*Tokyo Tower Night*, *Mount Fuji Dusk*, *Monochrome Fuji Light*, *Shinjuku Rain*, *Cyberpunk Tokyo Rain*, *Starfall Lake*) to true **4K UHD (`3840×2160`)** high-bitrate photography and illustrations.
- **Upgraded Live Video to Full HD 1080p 30fps**: Upgraded *Cyberpunk Rain Room* (`cozy-rain-live`) from 720p to a crisp **1920×1080 30fps** VP9 loop with a 1080p poster and sharper `960×540` CLI GIF, reducing total bundled asset footprint by ~37% while dramatically improving sharpness.
- **Automatic Theme Cache Migration**: Bumped `SEED_VERSION` to `7` in `ThemeManager` so existing installations automatically replace older compressed assets with the new 4K packs and prune removed starter packs.

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
