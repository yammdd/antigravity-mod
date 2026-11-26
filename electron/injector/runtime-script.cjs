'use strict';

/**
 * Minimal, CSP-safe & Trusted-Types-safe (zero innerHTML) DOM injector
 * supporting Antigravity IDE ('ide'), IDE embedded chat ('ide-chat'), and Antigravity App 2.0 ('app').
 */

function buildRemoveScript() {
  return `(() => {
    try {
      if (typeof window.__AG_THEME_CLEANUP__ === 'function') {
        window.__AG_THEME_CLEANUP__();
      }
      ['ag-theme-style', 'ag-theme-bg-layer', 'ag-theme-fx-layer'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.remove();
      });
      var shell = document.querySelector('.agy-shell');
      if (shell) {
        delete shell.dataset.agHole;
        shell.style.removeProperty('--ag-hole-clip');
      }
      return { ok: true, removed: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  })()`;
}

function runtimeMount(PAYLOAD) {
  var cfg = PAYLOAD.config || {};

  function cleanupPrevious(keepBlobCache) {
    if (window.__AG_THEME_AC__) {
      try { window.__AG_THEME_AC__.abort(); } catch (_) {}
      window.__AG_THEME_AC__ = null;
    }
    if (window.__AG_THEME_RO__) {
      try { window.__AG_THEME_RO__.disconnect(); } catch (_) {}
      window.__AG_THEME_RO__ = null;
    }
    if (window.__AG_THEME_MO__) {
      try { window.__AG_THEME_MO__.disconnect(); } catch (_) {}
      window.__AG_THEME_MO__ = null;
    }
    if (window.__AG_THEME_INTERVAL__) {
      clearInterval(window.__AG_THEME_INTERVAL__);
      window.__AG_THEME_INTERVAL__ = null;
    }
    if (window.__AG_THEME_VIDEO_TIMER__) {
      clearInterval(window.__AG_THEME_VIDEO_TIMER__);
      window.__AG_THEME_VIDEO_TIMER__ = null;
    }
    if (window.__AG_THEME_FX_RAF__) {
      cancelAnimationFrame(window.__AG_THEME_FX_RAF__);
      window.__AG_THEME_FX_RAF__ = null;
    }
    if (!keepBlobCache && window.__AG_THEME_BLOBS__) {
      var urls = Object.values(window.__AG_THEME_BLOBS__);
      for (var i = 0; i < urls.length; i++) {
        try { URL.revokeObjectURL(urls[i]); } catch (_) {}
      }
      window.__AG_THEME_BLOBS__ = {};
    }
  }

  window.__AG_THEME_CLEANUP__ = function() {
    cleanupPrevious(false);
    ['ag-theme-style', 'ag-theme-bg-layer', 'ag-theme-fx-layer'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
  };

  if (!cfg.enabled) {
    window.__AG_THEME_CLEANUP__();
    return { ok: true, disabled: true };
  }

  var isWorkbench = !!document.querySelector('.monaco-workbench') || location.protocol === 'vscode-file:';
  var isShell = !!document.querySelector('.agy-shell');
  var targetKind = PAYLOAD.targetOverride || (isWorkbench ? 'ide' : (isShell ? (window.self !== window.top ? 'ide-chat' : 'app') : 'other'));

  if (targetKind === 'other') return { ok: true, skipped: true };
  if (targetKind === 'ide' && cfg.applyToIde === false) {
    window.__AG_THEME_CLEANUP__();
    return { ok: true, target: 'ide', disabledForTarget: true };
  }
  if (targetKind === 'ide-chat' && cfg.applyToIdeChat === false) {
    window.__AG_THEME_CLEANUP__();
    return { ok: true, target: 'ide-chat', disabledForTarget: true };
  }
  if (targetKind === 'app' && cfg.applyToApp === false) {
    window.__AG_THEME_CLEANUP__();
    return { ok: true, target: 'app', disabledForTarget: true };
  }

  cleanupPrevious(true);
  var ac = new AbortController();
  window.__AG_THEME_AC__ = ac;
  window.__AG_THEME_BLOBS__ = window.__AG_THEME_BLOBS__ || {};

  function resolveCspSafeUrl(rawUrl, attempt) {
    var tries = attempt || 0;
    if (!rawUrl) return Promise.resolve('');
    if (!isWorkbench) return Promise.resolve(rawUrl);
    if (window.__AG_THEME_BLOBS__[rawUrl]) return Promise.resolve(window.__AG_THEME_BLOBS__[rawUrl]);
    return fetch(rawUrl)
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.blob();
      })
      .then(function(blob) {
        var u = URL.createObjectURL(blob);
        window.__AG_THEME_BLOBS__[rawUrl] = u;
        return u;
      })
      .catch(function() {
        if (tries < 2) {
          return new Promise(function(resolve) {
            setTimeout(function() { resolve(resolveCspSafeUrl(rawUrl, tries + 1)); }, 350 * (tries + 1));
          });
        }
        return '';
      });
  }

  // Rewrite any loopback http://127.0.0.1 urls inside CSS to blob: when on vscode-file://
  function resolveCssUrls(cssStr) {
    if (!isWorkbench || !cssStr) return Promise.resolve(cssStr || '');
    var matches = cssStr.match(/http:\/\/127\.0\.0\.1:\d+\/media\/[a-f0-9]{32}\/[^"')]+/g);
    if (!matches || !matches.length) return Promise.resolve(cssStr);
    var unique = Array.from(new Set(matches));
    return Promise.all(unique.map(function(u) { return resolveCspSafeUrl(u); })).then(function(resolved) {
      var out = cssStr;
      for (var i = 0; i < unique.length; i++) {
        if (resolved[i]) out = out.split(unique[i]).join(resolved[i]);
      }
      return out;
    });
  }

  // 1. Mount pre-compiled CSS
  var rawCss = targetKind === 'ide' ? (PAYLOAD.cssIde || '') : (targetKind === 'app' ? (PAYLOAD.cssApp || '') : (PAYLOAD.cssIdeChat || PAYLOAD.cssApp || ''));
  resolveCssUrls(rawCss).then(function(finalCss) {
    var styleEl = document.getElementById('ag-theme-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'ag-theme-style';
      document.head.appendChild(styleEl);
    }
    if (styleEl.textContent !== finalCss) {
      styleEl.textContent = finalCss;
    }
  });

  // 2. Optional wallpaper backdrop (image / GIF / short video)
  var wp = PAYLOAD.wallpaper || null;
  var isEmbeddedChat = targetKind === 'ide-chat' && window.self !== window.top;
  var unified = cfg.unifiedFullWindow !== false && cfg.applyToIde !== false;

  function applyCanvasGeometry(layout) {
    var stage = document.getElementById('ag-theme-bg-stage');
    if (!stage) return;
    if (isEmbeddedChat && unified && layout && layout.parentW > 0 && layout.parentH > 0) {
      var sx = layout.frameW > 20 ? (window.innerWidth / layout.frameW) : 1;
      var sy = layout.frameH > 20 ? (window.innerHeight / layout.frameH) : 1;
      var scale = Math.abs(sx - sy) <= 0.04 ? (sx + sy) * 0.5 : 1;
      stage.style.width = (layout.parentW * scale).toFixed(2) + 'px';
      stage.style.height = (layout.parentH * scale).toFixed(2) + 'px';
      stage.style.left = (-layout.offsetX * scale).toFixed(2) + 'px';
      stage.style.top = (-layout.offsetY * scale).toFixed(2) + 'px';
    } else {
      stage.style.width = '100%';
      stage.style.height = '100%';
      stage.style.left = '0px';
      stage.style.top = '0px';
    }
  }

  window.__AG_THEME_SYNC_LAYOUT__ = function(layout) {
    PAYLOAD.ideLayout = layout;
    applyCanvasGeometry(layout);
  };

  function reportIdeLayout(force) {
    if (!isWorkbench || typeof window.agThemeLayoutSync !== 'function') return;
    var f = document.querySelector('iframe.webview.ready') || document.querySelector('iframe.webview');
    var r = f ? f.getBoundingClientRect() : null;
    var payload = {
      parentW: window.innerWidth,
      parentH: window.innerHeight,
      offsetX: r ? Math.round(r.left) : 0,
      offsetY: r ? Math.round(r.top) : 0,
      frameW: r ? Math.round(r.width) : 0,
      frameH: r ? Math.round(r.height) : 0,
    };
    var sig = payload.parentW + ':' + payload.parentH + ':' + payload.offsetX + ':' + payload.offsetY;
    if (!force && window.__AG_LAST_LAYOUT_SIG__ === sig) return;
    window.__AG_LAST_LAYOUT_SIG__ = sig;
    try { window.agThemeLayoutSync(JSON.stringify(payload)); } catch (_) {}
  }

  function syncBrowserHole() {
    if ((targetKind !== 'ide-chat' && targetKind !== 'app') || cfg.splitBrowserSafe === false) return;
    var shell = document.querySelector('.agy-shell');
    if (!shell) return;
    var hasHole = document.body.getAttribute('data-has-browser-hole') === 'true';
    var holeEl = hasHole ? shell.querySelector('[data-browser-hole]:not([data-browser-hole="false"])') : null;
    if (holeEl) {
      var sRect = shell.getBoundingClientRect();
      var hRect = holeEl.getBoundingClientRect();
      if (hRect.width > 1 && hRect.height > 1) {
        var l = Math.max(0, Math.round(hRect.left - sRect.left));
        var t = Math.max(0, Math.round(hRect.top - sRect.top));
        var r = Math.max(l, Math.round(hRect.right - sRect.left));
        var b = Math.max(t, Math.round(hRect.bottom - sRect.top));
        shell.style.setProperty(
          '--ag-hole-clip',
          'polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ' + l + 'px ' + t + 'px, ' + r + 'px ' + t + 'px, ' + r + 'px ' + b + 'px, ' + l + 'px ' + b + 'px, ' + l + 'px ' + t + 'px)'
        );
        shell.dataset.agHole = '1';
        return;
      }
    }
    delete shell.dataset.agHole;
    shell.style.removeProperty('--ag-hole-clip');
  }

  function mountWallpaper() {
    var existing = document.getElementById('ag-theme-bg-layer');
    if (!wp || !wp.mediaUrl) {
      if (existing) existing.remove();
      window.__AG_VIDEO_DECK__ = null;
      return Promise.resolve();
    }

    var host = isWorkbench
      ? (document.querySelector('.monaco-workbench') || document.body)
      : (document.querySelector('.agy-shell') || document.body);
    if (!host) return Promise.resolve();

    var layer = existing;
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'ag-theme-bg-layer';
      layer.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;contain:strict;';
      host.insertBefore(layer, host.firstChild);
    }

    var isVideo = wp.mediaType === 'video';
    var fit = cfg.videoFit === 'contain' ? 'contain' : 'cover';
    var blurPx = Math.max(0, Math.min(28, Number(cfg.wallpaperBlur) || 0));
    var filterCss = blurPx > 0 ? ('blur(' + blurPx + 'px) scale(' + (1 + blurPx * 0.004).toFixed(3) + ')') : 'none';
    var dimAlpha = Math.max(0, Math.min(0.95, (Number(cfg.dimming ?? 32)) / 100));
    var scrimRgb = PAYLOAD.surfaceRgb || '20, 20, 21';

    return resolveCspSafeUrl(wp.mediaUrl).then(function(resolvedUrl) {
      if (!resolvedUrl) return;
      var mediaKey = (isVideo ? 'v:' : 'i:') + resolvedUrl;

      if (layer.dataset.mediaKey !== mediaKey) {
        while (layer.firstChild) layer.removeChild(layer.firstChild);
        layer.dataset.mediaKey = mediaKey;

        var stage = document.createElement('div');
        stage.id = 'ag-theme-bg-stage';
        stage.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;pointer-events:none;';
        layer.appendChild(stage);

        if (isVideo) {
          var vol = (isEmbeddedChat && unified) ? 0 : Math.max(0, Math.min(1, (Number(cfg.videoVolume) || 0) / 100));
          var spd = Math.max(0.25, Math.min(2.5, Number(cfg.videoSpeed) || 1));
          var createDeck = function(id, op, z) {
            var v = document.createElement('video');
            v.id = id;
            v.src = resolvedUrl;
            v.preload = 'auto';
            v.loop = false;
            v.playsInline = true;
            v.muted = vol === 0;
            v.volume = vol;
            v.playbackRate = spd;
            v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:' + fit + ';filter:' + filterCss + ';opacity:' + op + ';z-index:' + z + ';will-change:opacity;pointer-events:none;';
            return v;
          };
          var vA = createDeck('ag-theme-video-a', '1', '1');
          var vB = createDeck('ag-theme-video-b', '0', '0');
          stage.appendChild(vA);
          stage.appendChild(vB);
          window.__AG_VIDEO_DECK__ = { decks: [vA, vB], activeIdx: 0, fading: false };
          vB.load();
          vA.play().catch(function() { vA.muted = true; vA.play().catch(function() {}); });
        } else {
          window.__AG_VIDEO_DECK__ = null;
          var img = document.createElement('img');
          img.id = 'ag-theme-bg-img';
          img.src = resolvedUrl;
          img.alt = '';
          img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:' + fit + ';filter:' + filterCss + ';';
          stage.appendChild(img);
        }

        var scrim = document.createElement('div');
        scrim.id = 'ag-theme-bg-scrim';
        scrim.style.cssText = 'position:absolute;inset:0;z-index:3;pointer-events:none;';
        stage.appendChild(scrim);
      }

      applyCanvasGeometry(PAYLOAD.ideLayout);

      var scrimEl = document.getElementById('ag-theme-bg-scrim');
      if (scrimEl) scrimEl.style.background = 'rgba(' + scrimRgb + ', ' + dimAlpha.toFixed(2) + ')';

      var imgEl = document.getElementById('ag-theme-bg-img');
      if (imgEl) {
        imgEl.style.objectFit = fit;
        imgEl.style.filter = filterCss;
      }

      var deck = window.__AG_VIDEO_DECK__;
      if (deck && deck.decks.length === 2) {
        var volNow = (isEmbeddedChat && unified) ? 0 : Math.max(0, Math.min(1, (Number(cfg.videoVolume) || 0) / 100));
        var spdNow = Math.max(0.25, Math.min(2.5, Number(cfg.videoSpeed) || 1));
        deck.decks.forEach(function(dv) {
          dv.style.objectFit = fit;
          dv.style.filter = filterCss;
          dv.muted = volNow === 0;
          dv.volume = volNow;
          dv.playbackRate = spdNow;
        });

        window.__AG_THEME_VIDEO_TIMER__ = setInterval(function() {
          var d = window.__AG_VIDEO_DECK__;
          if (!d) return;
          var front = d.decks[d.activeIdx];
          var back = d.decks[1 - d.activeIdx];
          if (!front || !back || !front.duration || !Number.isFinite(front.duration) || front.duration <= 1.2) return;
          var fadeSec = Math.min(1.0, Math.max(0.35, front.duration * 0.12));

          if (d.fading) {
            if (back.currentTime >= fadeSec + 0.05 || front.ended) {
              d.activeIdx = 1 - d.activeIdx;
              d.fading = false;
              back.style.transition = 'none';
              back.style.opacity = '1';
              back.style.zIndex = '1';
              front.style.transition = 'none';
              front.style.opacity = '0';
              front.style.zIndex = '0';
              try { front.pause(); front.currentTime = 0; } catch (_) {}
            }
            return;
          }
          if (front.paused && !document.hidden && front.readyState >= 2) {
            front.play().catch(function() { front.muted = true; front.play().catch(function() {}); });
            return;
          }
          if (front.currentTime < front.duration - fadeSec - 0.2) return;
          d.fading = true;
          back.style.transition = 'none';
          back.style.opacity = '0';
          back.style.zIndex = '2';
          front.style.zIndex = '1';
          try { back.currentTime = 0; } catch (_) {}
          back.play().catch(function() { back.muted = true; back.play().catch(function() {}); });
          void back.offsetWidth;
          back.style.transition = 'opacity ' + fadeSec.toFixed(2) + 's linear';
          back.style.opacity = '1';
        }, 120);

        if (cfg.smartGpuPowerSaving !== false) {
          var syncVis = function() {
            var d = window.__AG_VIDEO_DECK__;
            if (!d) return;
            var activeV = d.decks[d.activeIdx];
            if (document.hidden) {
              d.decks.forEach(function(v) { if (!v.paused) v.pause(); });
            } else if (activeV && activeV.paused) {
              activeV.play().catch(function() {});
            }
          };
          document.addEventListener('visibilitychange', syncVis, { signal: ac.signal });
        }
      }
    });
  }

  function mountParticleFx() {
    var preset = cfg.animationPreset || 'none';
    var existingFx = document.getElementById('ag-theme-fx-layer');
    var supported = preset === 'sakura' || preset === 'rain' || preset === 'stars';
    var reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!supported || reduced) {
      if (existingFx) existingFx.remove();
      return;
    }

    var host = isWorkbench
      ? (document.querySelector('.monaco-workbench') || document.body)
      : (document.querySelector('.agy-shell') || document.body);
    if (!host) return;

    var fxLayer = existingFx;
    if (!fxLayer) {
      fxLayer = document.createElement('div');
      fxLayer.id = 'ag-theme-fx-layer';
      fxLayer.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;overflow:hidden;';
      host.insertBefore(fxLayer, host.firstChild);
    }

    var canvas = document.getElementById('ag-theme-fx-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'ag-theme-fx-canvas';
      canvas.style.cssText = 'width:100%;height:100%;display:block;pointer-events:none;';
      fxLayer.appendChild(canvas);
    }

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var w = 0;
    var h = 0;
    var resize = function() {
      var dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = Math.max(1, window.innerWidth);
      h = Math.max(1, window.innerHeight);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize, { signal: ac.signal });

    var count = preset === 'rain' ? 85 : (preset === 'sakura' ? 36 : 48);
    var items = [];
    for (var i = 0; i < count; i++) {
      items.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: preset === 'sakura' ? (5 + Math.random() * 5.5) : (preset === 'rain' ? (12 + Math.random() * 16) : (1.3 + Math.random() * 2.4)),
        vx: preset === 'rain' ? -2.4 : (preset === 'sakura' ? (0.5 + Math.random() * 0.75) : ((Math.random() - 0.5) * 0.25)),
        vy: preset === 'rain' ? (12 + Math.random() * 7) : (preset === 'sakura' ? (0.75 + Math.random() * 0.95) : -(0.2 + Math.random() * 0.4)),
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.035,
        alpha: preset === 'rain' ? (0.28 + Math.random() * 0.28) : (0.55 + Math.random() * 0.35),
      });
    }

    var lastTs = 0;
    var tick = function(ts) {
      if (ac.signal.aborted) return;
      window.__AG_THEME_FX_RAF__ = requestAnimationFrame(tick);
      if (document.hidden) return;
      if (ts - lastTs < 32) return;
      lastTs = ts;

      ctx.clearRect(0, 0, w, h);
      for (var j = 0; j < items.length; j++) {
        var p = items[j];
        p.phase += 0.025;
        if (preset === 'sakura') {
          p.x += p.vx + Math.sin(p.phase) * 0.55;
          p.y += p.vy;
          p.rot += p.vrot;
          if (p.y > h + 16) { p.y = -12; p.x = Math.random() * w; }
          if (p.x > w + 16) p.x = -12;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = 'rgba(249, 168, 212, ' + p.alpha.toFixed(2) + ')';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r, p.r * 0.58, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (preset === 'rain') {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y > h + 20) { p.y = -20; p.x = Math.random() * (w + 80); }
          if (p.x < -20) p.x = w + 10;
          ctx.strokeStyle = 'rgba(186, 230, 253, ' + p.alpha.toFixed(2) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 3, p.y + p.r);
          ctx.stroke();
        } else {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -8) { p.y = h + 8; p.x = Math.random() * w; }
          if (p.x < -8) p.x = w + 8;
          if (p.x > w + 8) p.x = -8;
          var pulse = p.alpha * (0.55 + 0.45 * Math.sin(p.phase * 1.4));
          ctx.fillStyle = 'rgba(224, 242, 254, ' + pulse.toFixed(2) + ')';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    window.__AG_THEME_FX_RAF__ = requestAnimationFrame(tick);
  }

  mountWallpaper().then(function() {
    mountParticleFx();
    syncBrowserHole();
    if (isWorkbench) {
      window.__AG_LAST_LAYOUT_SIG__ = '';
      reportIdeLayout(true);
      window.addEventListener('resize', function() { reportIdeLayout(false); }, { signal: ac.signal });
      if (typeof ResizeObserver !== 'undefined') {
        var ro = new ResizeObserver(function() { reportIdeLayout(false); });
        ro.observe(document.body);
        window.__AG_THEME_RO__ = ro;
      }
      window.__AG_THEME_INTERVAL__ = setInterval(function() { reportIdeLayout(false); }, 800);
    }
    if (targetKind === 'ide-chat' || targetKind === 'app') {
      window.addEventListener('resize', function() { applyCanvasGeometry(PAYLOAD.ideLayout); }, { signal: ac.signal });
      var mo = new MutationObserver(syncBrowserHole);
      mo.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-has-browser-hole', 'data-browser-hole'],
      });
      window.__AG_THEME_MO__ = mo;
    }
  });

  return { ok: true, target: targetKind };
}

function buildInjectScript(payload) {
  return '(' + runtimeMount.toString() + ')(' + JSON.stringify(payload) + ')';
}

module.exports = { buildInjectScript, buildRemoveScript };
