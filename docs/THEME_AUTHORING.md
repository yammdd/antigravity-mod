# Theme Authoring Guide

Antigravity Themes supports two theme formats:

1. **Single `.theme.css` file** — Standard CSS file for Antigravity IDE and App.
2. **Theme Pack (`themes/<slug>/`)** — Folder format covering IDE, App, and `agy` CLI, with optional local fonts, static/animated backdrops (`.jpg`, `.png`, `.gif`, `.webm`), and presets.

Themes provide styling and configuration only; arbitrary JavaScript is not injected into Antigravity.

## Format 1: Single `.theme.css` File

Place a `*.theme.css` file in your themes folder (`Themes -> Open folder`) with a metadata comment header:

```css
/**
 * @name My Custom Theme
 * @author your-handle
 * @version 1.0.0
 * @description Short description of the theme.
 * @colorMode dark
 * @surfaceTint graphite
 * @accent #3b82f6
 * @source https://github.com/your-handle/my-antigravity-theme
 */

:root {
  --ag-accent: #3b82f6;
  --ag-surface-rgb: 20, 20, 21;
  --ag-radius: 10px;
}
```

## Format 2: Theme Pack (`themes/<slug>/`)

Reference examples:
- Minimal pack: [themes/carbon-studio/theme.json](../themes/carbon-studio/theme.json)
- Animated GIF pack: [themes/sakura-shrine-gif/theme.json](../themes/sakura-shrine-gif/theme.json)
- Looping video pack: [themes/cozy-rain-live/theme.json](../themes/cozy-rain-live/theme.json)

```text
themes/my-pack/
├── theme.json            # Required manifest
├── shared.css            # Optional shared CSS tokens and rules for IDE and App
├── ide.css               # Optional Antigravity IDE (.monaco-workbench) styles
├── app.css               # Optional Antigravity App (.agy-shell) styles
└── assets/               # Optional fonts (.woff2/.ttf), images (.jpg/.png), GIFs (.gif), videos (.webm)
    ├── backdrop.webm     # Main backdrop for IDE & App (or backdrop.jpg / backdrop.gif)
    ├── poster.jpg        # Static preview thumbnail
    └── terminal.gif      # Optional animated GIF background for Windows Terminal (agy CLI)
```

### `theme.json` Example

```json
{
  "name": "My Theme Pack",
  "author": "your-handle",
  "version": "1.0.0",
  "category": "gif",
  "description": "Shared styling for IDE, App, and agy CLI.",
  "targets": ["ide", "app", "cli"],
  "preview": "./assets/poster.jpg",
  "backdrop": {
    "file": "./assets/backdrop.gif"
  },
  "cliBackdrop": "./assets/backdrop.gif",
  "fonts": [
    { "family": "My Display Font", "file": "./assets/my-font.woff2", "weight": "400 700" }
  ],
  "preset": {
    "colorMode": "dark",
    "surfaceTint": "ink",
    "accentColor": "#3b82f6",
    "animationPreset": "none",
    "dimming": 24,
    "wallpaperBlur": 0,
    "sidebarOpacity": 58,
    "editorOpacity": 66,
    "chatOpacity": 60,
    "tabsStyle": "default",
    "cornerRadius": 10
  },
  "cli": {
    "presetId": "tokyo-night",
    "colorScheme": "terminal",
    "runningLightSpeed": "medium",
    "statusLinePreset": "powerline"
  }
}
```

### Supported Categories & Media Formats

- **`category`**: `"anime"`, `"gif"`, `"video"`, `"landscape"`, or `"minimal"`.
- **IDE & App backdrops**: `.jpg`, `.png`, `.gif` (animated), and VP8 `.webm` (prebuilt Electron binaries decode VP8 natively without proprietary codecs).
- **Windows Terminal (`agy` CLI) backdrops**: `.jpg`, `.png`, and animated `.gif` (set via `cliBackdrop` when the main `backdrop.file` is a `.webm` video).
- **IDE `tabsStyle`**: `"default"` (stock tabs), `"underline"`, or `"minimal"` (top line).

### Local Assets in CSS

Relative `url("./assets/...")` paths inside `shared.css`, `ide.css`, or `app.css` are served through the local media server and converted to `blob:` URLs where required by CSP.

## CSS Variables (`--ag-*`)

| Variable | Purpose |
| :--- | :--- |
| `--ag-accent` / `--ag-accent-rgb` | Accent color hex and RGB triplet |
| `--ag-surface-rgb` | Base surface RGB triplet |
| `--ag-text-primary`, `--ag-text-secondary`, `--ag-text-muted` | Text colors |
| `--ag-border` | Divider/border color |
| `--ag-radius` | Corner radius |
| `--ag-font-ui` / `--ag-font-mono` | UI and monospace font stacks |
| `--ag-chat-font-size` | Chat body font size |
| `--ag-sidebar-bg`, `--ag-editor-bg`, `--ag-chat-bg` | Surface background colors |

## Common Selectors

- **Antigravity IDE**: `.monaco-workbench`, `.part.titlebar`, `.part.activitybar`, `.part.sidebar`, `.part.editor`, `.part.statusbar` (keep `.monaco-workbench .codicon { font-family: codicon !important; }` intact).
- **Antigravity App & Embedded Chat**: `.agy-shell`, `.agy-shell aside`, `.agy-shell [data-side-panel-body="true"]`, `[data-testid="agent-response"]`, `.agy-user-bubble`, `.surface-composer-card`.

## Cascade Order

1. Visual Studio tokens, `@font-face`, chrome presets, and animation preset
2. Enabled local `.theme.css` files and Theme Packs (`shared.css` + `ide.css` or `app.css`)
3. Online CSS links (`https://`)
4. `quickcss.css` (highest priority)
