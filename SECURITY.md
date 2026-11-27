# Security Policy

## Local-Only Design

Antigravity Themes runs entirely on your local machine and follows a narrow, UI-only security model:

- **Sandboxed Electron renderer**: The desktop UI runs with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`, communicating with the main process strictly through `electron/preload/index.cjs`.
- **Loopback CDP only**: Live CSS injection for Antigravity IDE and App connects exclusively to local Chrome DevTools Protocol endpoints on `127.0.0.1`, and runtime DOM injection uses zero `innerHTML` / `outerHTML` / `insertAdjacentHTML` (Trusted-Types safe).
- **Authenticated loopback media server with DNS rebinding protection**: Local wallpapers, animated GIFs, videos, and custom fonts are served on `127.0.0.1` on an ephemeral port guarded by a per-session 128-bit random token, strict loopback `Host` header validation (`127.0.0.1` / `localhost` only), and local-only CORS origin checks.
- **Safe process handling**: Antigravity Themes never force-kills (`taskkill /F`) Antigravity IDE or App processes. If a host app is already running without CDP, the user is prompted to save and close it normally.
- **Online CSS restrictions**: Remote CSS theme URLs are restricted to `https://`, capped at 512 KB, timed out after 8 seconds, and rejected if HTML or `<script>` tags are detected.
- **No binary modification**: Antigravity executables and `app.asar` are never patched. Configuration edits (`argv.json`, `~/.gemini/antigravity-cli/settings.json`, Windows Terminal `settings.json`, Ghostty/WezTerm/Kitty/Alacritty configs) create `.agthemes.bak` backups before first modification.
- **Automated security & fitness gates**: Every push and pull request runs GitHub CodeQL (`javascript-typescript`) alongside automated CI checks verifying zero `innerHTML`, zero `taskkill`, zero `:has()` CSS regressions, balanced CSS braces, and loopback `Host`/`Origin` rejection.

## Reporting a Vulnerability

If you discover a security issue (such as path traversal, unsafe command construction, or sandbox escape):

1. Please avoid posting exploit details in a public issue.
2. Use GitHub's private vulnerability reporting on the repository's **Security** tab, or open a minimal contact issue requesting a private channel.
3. Include reproduction steps and affected files so a fix can be verified quickly.
