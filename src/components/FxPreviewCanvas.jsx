import React, { useEffect, useRef } from 'react';

/**
 * Lightweight live Canvas preview for Sakura, Rain, and Starlight effects inside PreviewCanvas.
 */
export default function FxPreviewCanvas({ preset }) {
  const ref = useRef(null);

  useEffect(() => {
    if (preset !== 'sakura' && preset !== 'rain' && preset !== 'stars') return undefined;
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let rafId = 0;
    let w = 0;
    let h = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.round(w);
      canvas.height = Math.round(h);
    };
    resize();

    const count = preset === 'rain' ? 48 : preset === 'sakura' ? 22 : 28;
    const items = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: preset === 'sakura' ? 3 + Math.random() * 3.5 : preset === 'rain' ? 8 + Math.random() * 10 : 1 + Math.random() * 1.8,
      vx: preset === 'rain' ? -1.8 : preset === 'sakura' ? 0.4 + Math.random() * 0.6 : (Math.random() - 0.5) * 0.2,
      vy: preset === 'rain' ? 8 + Math.random() * 5 : preset === 'sakura' ? 0.6 + Math.random() * 0.7 : -(0.15 + Math.random() * 0.25),
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.04,
      alpha: preset === 'rain' ? 0.2 + Math.random() * 0.25 : 0.45 + Math.random() * 0.45,
    }));

    let last = 0;
    const draw = (ts) => {
      rafId = requestAnimationFrame(draw);
      if (ts - last < 32) return;
      last = ts;
      ctx.clearRect(0, 0, w, h);

      for (const p of items) {
        p.phase += 0.03;
        if (preset === 'sakura') {
          p.x += p.vx + Math.sin(p.phase) * 0.45;
          p.y += p.vy;
          p.rot += p.vrot;
          if (p.y > h + 10) { p.y = -8; p.x = Math.random() * w; }
          if (p.x > w + 10) p.x = -8;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = `rgba(249, 168, 212, ${p.alpha.toFixed(2)})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r, p.r * 0.58, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (preset === 'rain') {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y > h + 14) { p.y = -14; p.x = Math.random() * (w + 40); }
          if (p.x < -14) p.x = w + 8;
          ctx.strokeStyle = `rgba(186, 230, 253, ${p.alpha.toFixed(2)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 2.5, p.y + p.r);
          ctx.stroke();
        } else {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -6) { p.y = h + 6; p.x = Math.random() * w; }
          const a = p.alpha * (0.5 + 0.5 * Math.sin(p.phase * 1.4));
          ctx.fillStyle = `rgba(224, 242, 254, ${a.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [preset]);

  if (preset !== 'sakura' && preset !== 'rain' && preset !== 'stars') return null;

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
