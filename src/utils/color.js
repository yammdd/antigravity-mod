export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function hexToRgb(hex) {
  const clean = String(hex || '#3b82f6').replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (!Number.isFinite(num)) return '59, 130, 246';
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

export const PREVIEW_SURFACES = {
  dark: {
    graphite: { bg: '#141415', raised: '#19191b', rgb: '20, 20, 21', text: '#ededed', muted: '#85858b' },
    ink: { bg: '#0b0d14', raised: '#11141c', rgb: '11, 13, 20', text: '#eef0f5', muted: '#7a8296' },
    warm: { bg: '#161513', raised: '#1c1a18', rgb: '22, 21, 19', text: '#efe9de', muted: '#8a847a' },
  },
  light: {
    graphite: { bg: '#fafafa', raised: '#ffffff', rgb: '250, 250, 250', text: '#171717', muted: '#737373' },
    ink: { bg: '#f5f7fa', raised: '#ffffff', rgb: '245, 247, 250', text: '#111827', muted: '#6b7487' },
    warm: { bg: '#f7f4ee', raised: '#fdfbf7', rgb: '247, 244, 238', text: '#1f1b16', muted: '#7b7266' },
  },
};
