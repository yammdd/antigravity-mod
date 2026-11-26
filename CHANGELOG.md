# Changelog

All notable changes to this project will be documented in this file.

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
