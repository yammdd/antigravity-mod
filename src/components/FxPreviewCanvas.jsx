import React, { useEffect, useRef } from 'react';

const LIVE_CANVAS_PRESETS = new Set([
  'aurora-waves',
  'shooting-stars',
  'constellation',
  'floating-bokeh',
  'fireflies',
  'snow',
  'sakura',
  'rain',
  'water-ripples',
  'matrix-rain',
  'cyber-grid',
  'stars',
]);

/**
 * Lightweight live Canvas preview for all 12 dynamic FX presets inside PreviewCanvas.
 */
export default function FxPreviewCanvas({
  preset,
  accentRgb = '59, 130, 246',
  speed = 1,
  intensity = 100,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!LIVE_CANVAS_PRESETS.has(preset)) return undefined;
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const spd = Math.max(0.4, Math.min(2.2, Number(speed) || 1));
    const dens = Math.max(0.25, Math.min(1.5, (Number(intensity) || 100) / 100));

    let rafId = 0;
    let w = 0;
    let h = 0;
    let cols = 0;
    let drops = [];
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.round(w);
      canvas.height = Math.round(h);
      if (preset === 'matrix-rain') {
        cols = Math.max(10, Math.floor(w / 16));
        drops = Array.from({ length: cols }, () => Math.random() * (h / 14));
      }
    };
    resize();

    const baseCount =
      preset === 'rain' ? 48 :
      preset === 'snow' ? 40 :
      preset === 'constellation' ? 24 :
      preset === 'fireflies' ? 20 :
      preset === 'floating-bokeh' ? 12 :
      preset === 'water-ripples' ? 7 :
      preset === 'shooting-stars' ? 30 :
      preset === 'sakura' ? 22 : 28;
    const count = Math.max(4, Math.round(baseCount * Math.min(1.4, Math.max(0.4, dens))));

    const items = Array.from({ length: count }, (_, idx) => {
      const depth = 0.45 + Math.random() * 0.85;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r:
          preset === 'sakura' ? 3 + Math.random() * 3.5 :
          preset === 'rain' ? 8 + Math.random() * 10 :
          preset === 'snow' ? 1.2 + depth * 2 :
          preset === 'floating-bokeh' ? 14 + Math.random() * 28 :
          preset === 'water-ripples' ? Math.random() * 44 :
          preset === 'fireflies' ? 1.8 + Math.random() * 2.2 : 1.2 + Math.random() * 1.6,
        maxR: 28 + Math.random() * 42,
        vx:
          preset === 'rain' ? -1.8 :
          preset === 'sakura' ? 0.4 + Math.random() * 0.6 :
          preset === 'snow' ? (Math.random() - 0.35) * 0.55 * depth :
          preset === 'constellation' ? (Math.random() - 0.5) * 0.5 : (Math.random() - 0.5) * 0.35,
        vy:
          preset === 'rain' ? 8 + Math.random() * 5 :
          preset === 'sakura' ? 0.6 + Math.random() * 0.7 :
          preset === 'snow' ? 0.5 + depth * 1.1 :
          preset === 'floating-bokeh' ? -(0.16 + Math.random() * 0.25) :
          preset === 'constellation' ? (Math.random() - 0.5) * 0.5 :
          preset === 'fireflies' ? (Math.random() - 0.5) * 0.35 : -(0.15 + Math.random() * 0.25),
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.04,
        huePick: idx % 3,
        alpha: preset === 'rain' ? 0.2 + Math.random() * 0.25 : 0.45 + Math.random() * 0.45,
      };
    });

    const spawnMeteor = () => ({
      x: Math.random() * w * 1.15,
      y: Math.random() * h * 0.45,
      vx: -(6.5 + Math.random() * 5),
      vy: 3.2 + Math.random() * 2.8,
      len: 42 + Math.random() * 48,
      life: 0,
      maxLife: 22 + Math.floor(Math.random() * 18),
      delay: Math.floor(Math.random() * 48),
    });
    const meteors = preset === 'shooting-stars'
      ? Array.from({ length: Math.max(2, Math.round(3 * dens)) }, spawnMeteor)
      : [];

    const glyphs = '01<>{}[]/+-=#λΣ';
    let waveTick = 0;
    let gridOffset = 0;
    let last = 0;

    const draw = (ts) => {
      rafId = requestAnimationFrame(draw);
      if (ts - last < 32) return;
      last = ts;

      if (preset === 'matrix-rain') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
        ctx.fillRect(0, 0, w, h);
        ctx.font = '11px monospace';
        const ma = Math.min(0.8, 0.52 * dens).toFixed(2);
        for (let c = 0; c < cols; c++) {
          const ch = glyphs.charAt(Math.floor(Math.random() * glyphs.length));
          const mx = c * 16 + 4;
          const my = drops[c] * 14;
          ctx.fillStyle = `rgba(${accentRgb}, ${ma})`;
          ctx.fillText(ch, mx, my);
          if (my > h + 16 && Math.random() > 0.95) drops[c] = 0;
          drops[c] += 0.55 * spd;
        }
        return;
      }

      ctx.clearRect(0, 0, w, h);

      if (preset === 'aurora-waves') {
        waveTick += 0.02 * spd;
        const ribbons = [
          { yBase: h * 0.32, amp: 24, freq: 0.008, speed: 1.0, color: `rgba(${accentRgb}, ${Math.min(0.45, 0.32 * dens).toFixed(2)})` },
          { yBase: h * 0.52, amp: 30, freq: 0.006, speed: -0.75, color: `rgba(20, 184, 166, ${Math.min(0.36, 0.24 * dens).toFixed(2)})` },
          { yBase: h * 0.7, amp: 22, freq: 0.01, speed: 0.65, color: `rgba(139, 92, 246, ${Math.min(0.34, 0.22 * dens).toFixed(2)})` },
        ];
        for (let rb = 0; rb < ribbons.length; rb++) {
          const rCfg = ribbons[rb];
          const grad = ctx.createLinearGradient(0, rCfg.yBase - 46, 0, rCfg.yBase + 56);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(0.5, rCfg.color);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(0, rCfg.yBase + 60);
          for (let ax = 0; ax <= w + 20; ax += 20) {
            const ay =
              rCfg.yBase +
              Math.sin(ax * rCfg.freq + waveTick * rCfg.speed + rb) * rCfg.amp +
              Math.cos(ax * 0.004 - waveTick * 0.8) * 10;
            ctx.lineTo(ax, ay);
          }
          ctx.lineTo(w, rCfg.yBase + 70);
          ctx.lineTo(0, rCfg.yBase + 70);
          ctx.closePath();
          ctx.fill();
        }
        return;
      }

      if (preset === 'cyber-grid') {
        gridOffset = (gridOffset + 0.018 * spd) % 1;
        const horizon = h * 0.52;
        const gridH = h - horizon;
        const lineAlpha = Math.min(0.48, 0.28 * dens);
        const hGlow = ctx.createLinearGradient(0, horizon - 26, 0, horizon + 32);
        hGlow.addColorStop(0, `rgba(${accentRgb}, 0)`);
        hGlow.addColorStop(0.5, `rgba(${accentRgb}, ${(lineAlpha * 0.85).toFixed(2)})`);
        hGlow.addColorStop(1, `rgba(${accentRgb}, 0)`);
        ctx.fillStyle = hGlow;
        ctx.fillRect(0, horizon - 26, w, 58);

        ctx.strokeStyle = `rgba(${accentRgb}, ${lineAlpha.toFixed(2)})`;
        ctx.lineWidth = 1;
        const cx = w * 0.5;
        for (let vi = -12; vi <= 12; vi++) {
          ctx.beginPath();
          ctx.moveTo(cx + vi * (w / 22), horizon);
          ctx.lineTo(cx + vi * (w / 4.2), h);
          ctx.stroke();
        }
        const hLines = 10;
        for (let hi = 0; hi < hLines; hi++) {
          const t = (hi + gridOffset) / hLines;
          const y = horizon + Math.pow(t, 2.1) * gridH;
          ctx.strokeStyle = `rgba(${accentRgb}, ${(lineAlpha * t).toFixed(2)})`;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        return;
      }

      if (preset === 'constellation') {
        const maxDist = 82;
        for (let i = 0; i < items.length; i++) {
          const a = items[i];
          a.x += a.vx * spd;
          a.y += a.vy * spd;
          if (a.x < 0 || a.x > w) a.vx *= -1;
          if (a.y < 0 || a.y > h) a.vy *= -1;
          for (let j = i + 1; j < items.length; j++) {
            const b = items[j];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist < maxDist) {
              const la = Math.min(0.55, (1 - dist / maxDist) * 0.38 * dens);
              ctx.strokeStyle = `rgba(${accentRgb}, ${la.toFixed(2)})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
          ctx.fillStyle = `rgba(${accentRgb}, ${Math.min(0.95, a.alpha * dens).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }

      if (preset === 'shooting-stars') {
        for (const st of items) {
          st.phase += 0.03 * spd;
          const sa = Math.min(0.95, st.alpha * dens * (0.4 + 0.6 * Math.sin(st.phase)));
          ctx.fillStyle = `rgba(224, 242, 254, ${sa.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
          ctx.fill();
        }
        for (let i = 0; i < meteors.length; i++) {
          const m = meteors[i];
          if (m.delay > 0) { m.delay -= spd; continue; }
          m.x += m.vx * spd;
          m.y += m.vy * spd;
          m.life += spd;
          const prog = m.life / m.maxLife;
          const ma = Math.min(0.95, Math.sin(Math.min(1, prog) * Math.PI) * 0.9 * dens);
          if (ma > 0.02) {
            const mag = Math.hypot(m.vx, m.vy) || 1;
            const tx = m.x - (m.vx / mag) * m.len;
            const ty = m.y - (m.vy / mag) * m.len;
            const mg = ctx.createLinearGradient(m.x, m.y, tx, ty);
            mg.addColorStop(0, `rgba(255, 255, 255, ${ma.toFixed(2)})`);
            mg.addColorStop(0.35, `rgba(${accentRgb}, ${(ma * 0.7).toFixed(2)})`);
            mg.addColorStop(1, `rgba(${accentRgb}, 0)`);
            ctx.strokeStyle = mg;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();
          }
          if (m.life >= m.maxLife || m.x < -80 || m.y > h + 80) meteors[i] = spawnMeteor();
        }
        return;
      }

      if (preset === 'water-ripples') {
        for (const rp of items) {
          rp.r += 0.75 * spd;
          if (rp.r >= rp.maxR) {
            rp.r = 2;
            rp.x = Math.random() * w;
            rp.y = Math.random() * h;
            rp.maxR = 28 + Math.random() * 44;
          }
          const ra = Math.min(0.65, (1 - rp.r / rp.maxR) * 0.45 * dens);
          ctx.strokeStyle = `rgba(${accentRgb}, ${ra.toFixed(2)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
          ctx.stroke();
        }
        return;
      }

      if (preset === 'floating-bokeh') {
        const colors = [accentRgb, '56, 189, 248', '167, 139, 250'];
        for (const bk of items) {
          bk.phase += 0.02 * spd;
          bk.x += (bk.vx + Math.sin(bk.phase) * 0.22) * spd;
          bk.y += bk.vy * spd;
          if (bk.y < -bk.r * 2) { bk.y = h + bk.r; bk.x = Math.random() * w; }
          if (bk.x < -bk.r * 2) bk.x = w + bk.r;
          if (bk.x > w + bk.r * 2) bk.x = -bk.r;
          const col = colors[bk.huePick % colors.length];
          const ba = Math.min(0.36, (0.14 + 0.08 * Math.sin(bk.phase)) * dens);
          const bg = ctx.createRadialGradient(bk.x, bk.y, bk.r * 0.1, bk.x, bk.y, bk.r);
          bg.addColorStop(0, `rgba(${col}, ${ba.toFixed(2)})`);
          bg.addColorStop(0.7, `rgba(${col}, ${(ba * 0.45).toFixed(2)})`);
          bg.addColorStop(1, `rgba(${col}, 0)`);
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.arc(bk.x, bk.y, bk.r, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }

      for (const p of items) {
        p.phase += 0.03 * spd;
        const pa = Math.min(0.95, p.alpha * dens);
        if (preset === 'sakura') {
          p.x += (p.vx + Math.sin(p.phase) * 0.45) * spd;
          p.y += p.vy * spd;
          p.rot += p.vrot * spd;
          if (p.y > h + 10) { p.y = -8; p.x = Math.random() * w; }
          if (p.x > w + 10) p.x = -8;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = `rgba(249, 168, 212, ${pa.toFixed(2)})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r, p.r * 0.58, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (preset === 'rain') {
          p.x += p.vx * spd;
          p.y += p.vy * spd;
          if (p.y > h + 14) { p.y = -14; p.x = Math.random() * (w + 40); }
          if (p.x < -14) p.x = w + 8;
          ctx.strokeStyle = `rgba(186, 230, 253, ${pa.toFixed(2)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 2.5, p.y + p.r);
          ctx.stroke();
        } else if (preset === 'snow') {
          p.x += (p.vx + Math.sin(p.phase * 0.8) * 0.35) * spd;
          p.y += p.vy * spd;
          if (p.y > h + 8) { p.y = -8; p.x = Math.random() * w; }
          if (p.x > w + 8) p.x = -6;
          if (p.x < -8) p.x = w + 6;
          ctx.fillStyle = `rgba(241, 245, 249, ${(pa * 0.85).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else if (preset === 'fireflies') {
          p.x += (p.vx + Math.sin(p.phase * 0.9) * 0.35) * spd;
          p.y += (p.vy + Math.cos(p.phase * 0.7) * 0.3) * spd;
          if (p.x < -12) p.x = w + 12;
          if (p.x > w + 12) p.x = -12;
          if (p.y < -12) p.y = h + 12;
          if (p.y > h + 12) p.y = -12;
          const glow = pa * (0.35 + 0.65 * Math.abs(Math.sin(p.phase * 1.2)));
          const fg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          fg.addColorStop(0, `rgba(253, 224, 71, ${glow.toFixed(2)})`);
          fg.addColorStop(0.5, `rgba(251, 191, 36, ${(glow * 0.35).toFixed(2)})`);
          fg.addColorStop(1, 'rgba(251, 191, 36, 0)');
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          p.x += p.vx * spd;
          p.y += p.vy * spd;
          if (p.y < -6) { p.y = h + 6; p.x = Math.random() * w; }
          const a = pa * (0.5 + 0.5 * Math.sin(p.phase * 1.4));
          ctx.fillStyle = `rgba(224, 242, 254, ${a.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [preset, accentRgb, speed, intensity]);

  if (!LIVE_CANVAS_PRESETS.has(preset)) return null;

  return (
    <canvas
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 2,
        pointerEvents: 'none',
      }}
    />
  );
}
