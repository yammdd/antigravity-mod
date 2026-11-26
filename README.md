<p align="center">
  <img src="electron/assets/icon.png" alt="Antigravity Themes" width="76" height="76" />
</p>

<h1 align="center">Antigravity Themes</h1>

<p align="center">
  UI theme manager, QuickCSS editor, and standalone CLI studio for Google Antigravity IDE, App, and <code>agy</code> CLI.
</p>

<p align="center">
  <a href="https://github.com/yammdd/antigravity-mod/actions/workflows/ci.yml">
    <img src="https://github.com/yammdd/antigravity-mod/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" />
  </a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg" alt="Platforms" />
</p>

---

Antigravity Themes customizes Google Antigravity across three independent surfaces without patching binaries or `app.asar`:

- **Antigravity IDE** — Live CSS injection for `.monaco-workbench` and embedded chat over local CDP (`127.0.0.1`).
- **Antigravity App** — Live styling for `.agy-shell`, sidebar, composer, and modals.
- **Antigravity CLI (`agy`)** — Standalone terminal presets, animated GIF / wallpaper backgrounds, modular ANSI status bar, and Windows Terminal / Ghostty / WezTerm / Kitty / Alacritty configuration.

## Features

| Feature | Antigravity IDE | Antigravity App | Antigravity CLI (`agy`) |
| :--- | :---: | :---: | :---: |
| Built-in themes & media | 16 Anime, GIF, Landscape & Video packs + 4 CSS themes | 16 Anime, GIF, Landscape & Video packs + 4 CSS themes | 8 standalone ANSI presets + 8 built-in animated GIFs |
| Local `.theme.css` hot reload | Yes | Yes | Optional pack sync |
| Live QuickCSS editor (`Ctrl+S`) | Yes | Yes | — |
| Online CSS links (`https://`) | Yes | Yes | — |
| Custom local fonts (`.woff2`/`.ttf`/`.otf`) | Yes | Yes | Via terminal profile |
| Image, animated GIF & video backdrops | `.jpg`, `.png`, `.gif`, `.webm`, `.mp4` | `.jpg`, `.png`, `.gif`, `.webm`, `.mp4` | `.jpg`, `.png`, `.gif` (+ auto video-to-GIF via `ffmpeg`) |
| Animations & status UI | Sakura, Rain, Stars, Ken Burns, UI motion | Sakura, Rain, Stars, Ken Burns, UI motion | `runningLightSpeed`, `altScreenMode`, modular `statusLine` |

## Quick Start

### Windows (Portable Executable)

1. Download `Antigravity-Themes-<version>.exe` from the [Releases](https://github.com/yammdd/antigravity-mod/releases) page (or build locally with `npm run build:win`).
2. On first launch, choose the surfaces you want to customize (**Antigravity IDE**, **Antigravity App**, **Antigravity CLI**, or **Select all**).
3. Click **Install & Open Studio** to open the workspace.

### Run from Source (Windows / macOS / Linux)

Requires **Node.js 20+**.

```bash
git clone https://github.com/yammdd/antigravity-mod.git
cd antigravity-mod
npm install
npm run dev
```

### Scripts

```bash
npm test                # Run core 3-surface verification tests
npm run build:ui        # Build React studio UI to dist-ui/
npm run build           # Package desktop app to release/
npm run build:win       # Package Windows portable .exe to release/
```

## Surface Details

You can change active surfaces anytime using **Change targets** in the sidebar.

### Antigravity CLI (`agy`) — Standalone Studio
- Works independently of Antigravity IDE and App.
- Includes 8 curated 16-color terminal palettes (*Tokyo Night*, *Catppuccin Mocha*, *Rose Pine*, *Nord Frost*, *Gruvbox Dark*, *Cyberpunk Cyan*, *Dracula*, *GitHub Light*), a live `agy` terminal preview, 8 built-in animated GIFs, and automatic short `.mp4`/`.webm` → `.gif` conversion when `ffmpeg` is installed.
- Configures `~/.gemini/antigravity-cli/settings.json` (`colorScheme`, `runningLightSpeed`, `altScreenMode`, and modular Node.js `statusLine` with a built-in self-test button).
- Syncs Windows Terminal (`Antigravity CLI` profile and optional default profile) using JSONC-safe parsing with automatic `.agthemes.bak` backup and one-click restore.
- Exports ready-to-paste snippets for **Ghostty**, **WezTerm**, **Kitty**, and **Alacritty**.

### Antigravity IDE
- Setup adds `"remote-debugging-port": "0"` to `~/.antigravity-ide/argv.json`.
- Click **Launch IDE** (or restart Antigravity IDE) to attach over loopback CDP and apply live styles.

### Antigravity App
- Click **Launch App** (or start Antigravity App with `--remote-debugging-port=0`) to attach and apply live styles.

## Project Structure

```text
├── build/                 # Packaging icons (icon.ico, icon.png)
├── docs/                  # Theme authoring documentation
├── electron/
│   ├── assets/            # App, taskbar, and tray icons
│   ├── core/              # Store, CDP bridge, media server, theme manager, CLI engine
│   ├── injector/          # CSS compiler and CSP-safe runtime DOM injector
│   ├── main/              # Electron main process, IPC handlers, IDE & OS integration
│   └── preload/           # Sandboxed contextBridge API
├── scripts/               # Core 3-surface automated test suite
├── src/                   # React + Vite desktop studio UI
└── themes/                # Bundled Theme Packs and starter .theme.css files
```

## Documentation & Policies

- [Theme Authoring Guide](docs/THEME_AUTHORING.md) — Creating `.theme.css` files and multi-surface Theme Packs
- [Contributing](CONTRIBUTING.md) — Development setup, PR checklist, and commit guidelines
- [Security Policy](SECURITY.md) — Sandbox model, loopback CDP, and vulnerability reporting
- [Changelog](CHANGELOG.md) — Release history

## License

[MIT](LICENSE)
