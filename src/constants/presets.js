export const ACCENT_SWATCHES = [
  { name: 'Cobalt', hex: '#3b82f6' },
  { name: 'Sakura', hex: '#f472b6' },
  { name: 'Sky', hex: '#38bdf8' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Emerald', hex: '#22c55e' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Coral', hex: '#f97316' },
  { name: 'Rose', hex: '#e11d48' },
];

export const UI_FONTS = [
  { id: 'inter', label: 'Inter' },
  { id: 'geist', label: 'Geist' },
  { id: 'be_vietnam', label: 'Be Vietnam Pro' },
  { id: 'ibm_plex', label: 'IBM Plex Sans' },
  { id: 'system', label: 'System UI' },
];

export const MONO_FONTS = [
  { id: 'jetbrains', label: 'JetBrains Mono' },
  { id: 'cascadia', label: 'Cascadia Code' },
  { id: 'ibm_mono', label: 'IBM Plex Mono' },
  { id: 'system', label: 'System Monospace' },
];

export const ANIMATION_PRESETS = [
  {
    id: 'aurora-waves',
    label: 'Live Aurora Waves',
    desc: 'Flowing luminous aurora ribbons synced with your accent color',
    badge: 'DYNAMIC',
  },
  {
    id: 'shooting-stars',
    label: 'Shooting Stars',
    desc: 'Twinkling night starfield with glowing meteors streaking across',
    badge: 'LIVE',
  },
  {
    id: 'constellation',
    label: 'Star Constellation',
    desc: 'Connected glowing node mesh drifting smoothly across the canvas',
    badge: 'DYNAMIC',
  },
  {
    id: 'floating-bokeh',
    label: 'Ambient Bokeh Orbs',
    desc: 'Soft glowing depth bokeh orbs floating smoothly in accent tones',
    badge: 'LIVE',
  },
  {
    id: 'fireflies',
    label: 'Warm Fireflies',
    desc: 'Golden fireflies drifting with soft breathing radial bloom',
    badge: 'LIVE',
  },
  {
    id: 'snow',
    label: 'Winter Snowfall',
    desc: 'Parallax multi-depth snowfall with gentle wind drift',
    badge: 'LIVE',
  },
  {
    id: 'sakura',
    label: 'Sakura Petals',
    desc: 'Soft pink cherry blossom petals drifting gently',
    badge: 'LIVE',
  },
  {
    id: 'rain',
    label: 'Midnight Rain',
    desc: 'Delicate angled raindrop streaks for rainy scenes',
    badge: 'LIVE',
  },
  {
    id: 'water-ripples',
    label: 'Raindrop Ripples',
    desc: 'Expanding concentric water rings fading gently across the backdrop',
    badge: 'LIVE',
  },
  {
    id: 'matrix-rain',
    label: 'Neon Code Rain',
    desc: 'Subtle cascading monospace glyphs tinted by your accent color',
    badge: 'DYNAMIC',
  },
  {
    id: 'cyber-grid',
    label: 'Synthwave Grid',
    desc: 'Moving perspective horizon grid glowing subtly in your accent color',
    badge: 'DYNAMIC',
  },
  {
    id: 'stars',
    label: 'Starlight Drift',
    desc: 'Calm floating starlight glints across dark surfaces',
    badge: 'LIVE',
  },
  {
    id: 'ken-burns',
    label: 'Living Pan',
    desc: 'Slow zoom & drift motion on active backdrop artwork',
    badge: 'MOTION',
  },
  {
    id: 'ambient-shift',
    label: 'Ambient Glow',
    desc: 'Slow 16s brightness breathing on active backdrop',
    badge: 'MOTION',
  },
  {
    id: 'none',
    label: 'None',
    desc: 'No background canvas animation',
    badge: 'OFF',
  },
];

export const CLI_COLOR_SCHEMES = [
  { id: 'terminal', label: 'Terminal (inherit custom ANSI palette)' },
  { id: 'tokyo night', label: 'Tokyo Night' },
  { id: 'dark', label: 'Dark' },
  { id: 'solarized dark', label: 'Solarized Dark' },
  { id: 'colorblind-friendly dark', label: 'Colorblind-friendly Dark' },
  { id: 'light', label: 'Light' },
  { id: 'solarized light', label: 'Solarized Light' },
  { id: 'colorblind-friendly light', label: 'Colorblind-friendly Light' },
];

export const CLI_SPINNER_SPEEDS = [
  { id: 'fast', label: 'Fast' },
  { id: 'medium', label: 'Medium' },
  { id: 'slow', label: 'Slow' },
  { id: 'off', label: 'Off' },
];

export const CLI_STATUSLINE_PRESETS = [
  { id: 'powerline', label: 'Powerline blocks' },
  { id: 'badges', label: 'Bracketed badges' },
  { id: 'bordered', label: 'Bracketed segments' },
  { id: 'compact-mono', label: 'Compact monospace' },
  { id: 'minimal', label: 'Minimal dot-separated' },
];

export const CLI_ALT_SCREEN_MODES = [
  { id: 'auto', label: 'Auto' },
  { id: 'always', label: 'Always' },
  { id: 'never', label: 'Never' },
];

export const CLI_CURSOR_SHAPES = [
  { id: 'bar', label: 'Bar |' },
  { id: 'filledBox', label: 'Block' },
  { id: 'emptyBox', label: 'Outline' },
  { id: 'underscore', label: 'Line _' },
];

export const CLI_BG_STRETCH_MODES = [
  { id: 'uniformToFill', label: 'Fill' },
  { id: 'uniform', label: 'Fit' },
  { id: 'none', label: 'Original' },
];

export const CLI_BG_ALIGNMENTS = [
  { id: 'center', label: 'Center' },
  { id: 'right', label: 'Right' },
  { id: 'bottomRight', label: 'Bottom Right' },
  { id: 'topRight', label: 'Top Right' },
];

export const CLI_FONT_SUGGESTIONS = [
  'JetBrainsMono Nerd Font',
  'Cascadia Code',
  'Cascadia Mono',
  'Consolas',
];

export const CLI_PREFIX_SYMBOLS = ['◆', '▲', '›', '●', ''];

export const CLI_SHADER_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'subtle-vignette', label: 'Vignette' },
  { id: 'soft-bloom', label: 'Soft Bloom' },
  { id: 'crt-scanlines', label: 'CRT Lines' },
];

export const CLI_PALETTE_FIELDS = [
  { key: 'background', label: 'Background' },
  { key: 'foreground', label: 'Foreground' },
  { key: 'cursorColor', label: 'Cursor' },
  { key: 'selectionBackground', label: 'Selection' },
  { key: 'red', label: 'ANSI Red' },
  { key: 'green', label: 'ANSI Green' },
  { key: 'yellow', label: 'ANSI Yellow' },
  { key: 'blue', label: 'ANSI Blue' },
  { key: 'purple', label: 'ANSI Purple' },
  { key: 'cyan', label: 'ANSI Cyan' },
  { key: 'brightBlack', label: 'Muted / Gray' },
  { key: 'white', label: 'White' },
];

export const CSS_TOKEN_REFERENCE = [
  { token: '--ag-accent', sample: '--ag-accent: #3b82f6;', desc: 'Primary accent color' },
  { token: '--ag-surface-rgb', sample: '--ag-surface-rgb: 20, 20, 21;', desc: 'Base RGB surface tint' },
  { token: '--ag-sidebar-bg', sample: '--ag-sidebar-bg: rgba(20, 20, 21, 0.58);', desc: 'Sidebar and tab bar fill' },
  { token: '--ag-editor-bg', sample: '--ag-editor-bg: rgba(20, 20, 21, 0.66);', desc: 'IDE editor surface fill' },
  { token: '--ag-chat-bg', sample: '--ag-chat-bg: rgba(20, 20, 21, 0.60);', desc: 'App and chat surface fill' },
  { token: '--ag-border', sample: '--ag-border: rgba(237, 237, 237, 0.09);', desc: 'Divider color' },
  { token: '--ag-radius', sample: '--ag-radius: 10px;', desc: 'Global corner radius' },
  { token: '--ag-font-ui', sample: "--ag-font-ui: 'Inter', sans-serif;", desc: 'Interface font stack' },
  { token: '--ag-font-mono', sample: "--ag-font-mono: 'JetBrains Mono', monospace;", desc: 'Code editor font stack' },
  { token: '--ag-chat-font-size', sample: '--ag-chat-font-size: 14px;', desc: 'Chat body font size' },
];

export const SELECTOR_SNIPPETS = [
  {
    label: 'IDE Workbench Titlebar',
    snippet: `.monaco-workbench .part.titlebar {\n  /* Customize IDE titlebar */\n}\n`,
  },
  {
    label: 'IDE Active Editor Tab',
    snippet: `.monaco-workbench .part.editor .tab.active {\n  border-bottom: 2px solid var(--ag-accent) !important;\n}\n`,
  },
  {
    label: 'App & Chat Agent Response',
    snippet: `.agy-shell [data-testid="agent-response"] {\n  line-height: 1.7 !important;\n}\n`,
  },
  {
    label: 'App Side Panel',
    snippet: `.agy-shell [data-side-panel-body="true"] {\n  background: var(--ag-sidebar-bg) !important;\n}\n`,
  },
  {
    label: 'Chat Composer Card',
    snippet: `.surface-composer-card {\n  border: 1px solid var(--ag-border) !important;\n}\n`,
  },
];
