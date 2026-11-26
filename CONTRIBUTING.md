# Contributing

Contributions are welcome for bug fixes, CSS selectors, terminal presets, and community themes.

## Scope & Principles

- **UI-only and non-invasive**: Styles for Antigravity IDE and App are injected at runtime over local CDP (`127.0.0.1`), and CLI customization edits standard configuration files with automatic backups. Pull requests must not patch Antigravity binaries or `app.asar`.
- **Reversible changes**: Any external settings edit (such as `argv.json`, `~/.gemini/antigravity-cli/settings.json`, or Windows Terminal `settings.json`) must preserve user keys and remain cleanly restorable.
- **English UI & docs**: Keep all source comments, UI strings, theme metadata, and documentation in English.

## Local Development

Requirements: Node.js 20+.

```bash
npm install
npm run dev
```

Before opening a pull request, run both checks:

```bash
npm test
npm run build:ui
```

## Submitting Themes

See [docs/THEME_AUTHORING.md](docs/THEME_AUTHORING.md) for the `.theme.css` and Theme Pack (`themes/<slug>/`) specifications.

- Include clear attribution (`author` and `source` fields) for any third-party artwork, GIF, or video assets.
- Use `.jpg` or `.png` for static images, `.gif` for animated backdrops compatible with Windows Terminal, and VP8 `.webm` for looping video backdrops.
- Keep individual assets reasonably sized (under ~3 MB where possible).

## Commit Messages

Use concise [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(cli): ...`
- `fix(ide): ...`
- `docs: ...`
- `chore: ...`
- `test: ...`
