'use strict';

// Carbon Studio custom statusLine script for agy CLI (~/.gemini/antigravity-cli/settings.json)
const path = require('path');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let data = {};
  try { data = JSON.parse(raw || '{}'); } catch (_) {}

  const cwd = data.cwd || data.workspace || process.cwd();
  const folder = path.basename(cwd) || cwd;
  const model = data.model?.display_name || data.model?.name || data.model || 'Antigravity';
  const branch = data.git?.branch || data.branch || '';
  const ctxPct = data.context_window?.used_percentage ?? data.contextPercentage ?? null;

  const RST = '\x1b[0m';
  const ACCENT_BG = '\x1b[48;2;59;130;246m\x1b[38;2;15;15;16m';
  const SURFACE_BG = '\x1b[48;2;32;32;36m\x1b[38;2;237;237;237m';
  const MUTED = '\x1b[38;2;133;133;139m';

  const parts = [
    `${ACCENT_BG} ${model} ${RST}`,
    `${SURFACE_BG} ${folder}${branch ? ` (${branch})` : ''} ${RST}`,
  ];
  if (ctxPct !== null) {
    parts.push(`${MUTED}ctx ${Math.round(ctxPct)}%${RST}`);
  }
  process.stdout.write(parts.join(' ') + '\n');
});
