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

  function unwrapCodeBlockFolds() {
    try {
      var wraps = document.querySelectorAll('.ag-code-fold-wrap');
      for (var w = 0; w < wraps.length; w++) {
        var wrap = wraps[w];
        var pre = wrap.querySelector('pre');
        if (pre && wrap.parentNode) {
          delete pre.dataset.agFoldBound;
          wrap.parentNode.insertBefore(pre, wrap);
        }
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }
    } catch (_) {}
  }

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
    if (!keepBlobCache) {
      unwrapCodeBlockFolds();
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

  var windowFocused = typeof document.hasFocus === 'function' ? document.hasFocus() : true;
  var idleStateListeners = [];
  function isWindowIdle() {
    return document.hidden || !windowFocused;
  }
  function notifyIdleChange() {
    for (var idx = 0; idx < idleStateListeners.length; idx++) {
      try { idleStateListeners[idx](); } catch (_) {}
    }
  }
  window.addEventListener('blur', function() {
    windowFocused = false;
    notifyIdleChange();
  }, { signal: ac.signal });
  window.addEventListener('focus', function() {
    windowFocused = true;
    notifyIdleChange();
  }, { signal: ac.signal });
  document.addEventListener('visibilitychange', notifyIdleChange, { signal: ac.signal });

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
          if (front.paused && !(cfg.smartGpuPowerSaving !== false && isWindowIdle()) && front.readyState >= 2) {
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
            if (isWindowIdle()) {
              d.decks.forEach(function(v) { if (!v.paused) v.pause(); });
            } else if (activeV && activeV.paused) {
              activeV.play().catch(function() {});
            }
          };
          idleStateListeners.push(syncVis);
        }
      }
    });
  }

  function mountParticleFx() {
    var preset = cfg.animationPreset || 'none';
    var existingFx = document.getElementById('ag-theme-fx-layer');
    var supportedPresets = [
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
    ];
    var supported = supportedPresets.indexOf(preset) !== -1;
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

    var accentRgb = PAYLOAD.accentRgb || '59, 130, 246';
    var speed = Math.max(0.4, Math.min(2.2, Number(cfg.animationSpeed) || 1));
    var intensity = Math.max(0.25, Math.min(1.5, (Number(cfg.animationIntensity) || 100) / 100));
    var w = 0;
    var h = 0;
    var cols = 0;
    var drops = [];
    var resize = function() {
      var dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = Math.max(1, window.innerWidth);
      h = Math.max(1, window.innerHeight);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (preset === 'matrix-rain') {
        cols = Math.max(12, Math.floor(w / 22));
        drops = [];
        for (var c = 0; c < cols; c++) drops.push(Math.random() * (h / 18));
      }
    };
    resize();
    window.addEventListener('resize', resize, { signal: ac.signal });

    var baseCount =
      preset === 'rain' ? 85 :
      preset === 'snow' ? 68 :
      preset === 'constellation' ? 42 :
      preset === 'fireflies' ? 32 :
      preset === 'floating-bokeh' ? 18 :
      preset === 'water-ripples' ? 10 :
      preset === 'shooting-stars' ? 46 :
      preset === 'sakura' ? 36 : 48;
    var count = Math.max(6, Math.round(baseCount * Math.min(1.4, Math.max(0.4, intensity))));
    var items = [];
    for (var i = 0; i < count; i++) {
      var depth = 0.45 + Math.random() * 0.85;
      items.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: preset === 'sakura'
          ? (5 + Math.random() * 5.5)
          : preset === 'rain'
            ? (12 + Math.random() * 16)
            : preset === 'snow'
              ? (1.5 + depth * 2.6)
              : preset === 'floating-bokeh'
                ? (26 + Math.random() * 54)
                : preset === 'water-ripples'
                  ? (Math.random() * 75)
                  : preset === 'fireflies'
                    ? (2.2 + Math.random() * 2.6)
                    : preset === 'constellation' ? (1.6 + Math.random() * 1.4) : (1.1 + Math.random() * 2.0),
        maxR: 48 + Math.random() * 76,
        vx: preset === 'rain'
          ? -2.4
          : preset === 'sakura'
            ? (0.5 + Math.random() * 0.75)
            : preset === 'snow'
              ? ((Math.random() - 0.35) * 0.65 * depth)
              : preset === 'floating-bokeh'
                ? ((Math.random() - 0.5) * 0.35)
                : preset === 'constellation'
                  ? ((Math.random() - 0.5) * 0.55)
                  : preset === 'fireflies' ? ((Math.random() - 0.5) * 0.5) : ((Math.random() - 0.5) * 0.25),
        vy: preset === 'rain'
          ? (12 + Math.random() * 7)
          : preset === 'sakura'
            ? (0.75 + Math.random() * 0.95)
            : preset === 'snow'
              ? (0.65 + depth * 1.35)
              : preset === 'floating-bokeh'
                ? -(0.18 + Math.random() * 0.32)
                : preset === 'constellation'
                  ? ((Math.random() - 0.5) * 0.55)
                  : preset === 'fireflies' ? ((Math.random() - 0.5) * 0.45) : -(0.2 + Math.random() * 0.4),
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.035,
        huePick: i % 3,
        alpha: preset === 'rain' ? (0.28 + Math.random() * 0.28) : (0.45 + Math.random() * 0.4),
      });
    }

    var meteors = [];
    var spawnMeteor = function() {
      return {
        x: Math.random() * w * 1.15,
        y: Math.random() * h * 0.45,
        vx: -(10 + Math.random() * 8),
        vy: 5 + Math.random() * 4.5,
        len: 75 + Math.random() * 90,
        life: 0,
        maxLife: 26 + Math.floor(Math.random() * 24),
        delay: Math.floor(Math.random() * 70),
      };
    };
    if (preset === 'shooting-stars') {
      var mCount = Math.max(2, Math.round(4 * intensity));
      for (var mi = 0; mi < mCount; mi++) meteors.push(spawnMeteor());
    }

    var matrixGlyphs = '01<>{}[]/\\*+-=#λΣΔΩ';
    var waveTick = 0;
    var gridOffset = 0;
    var lastTs = 0;
    var scheduleFxFrame = function() {
      if (ac.signal.aborted || window.__AG_THEME_FX_RAF__) return;
      if (cfg.smartGpuPowerSaving !== false && isWindowIdle()) return;
      window.__AG_THEME_FX_RAF__ = requestAnimationFrame(tick);
    };
    var tick = function(ts) {
      window.__AG_THEME_FX_RAF__ = null;
      if (ac.signal.aborted) return;
      if (cfg.smartGpuPowerSaving !== false && isWindowIdle()) return;
      window.__AG_THEME_FX_RAF__ = requestAnimationFrame(tick);
      if (ts - lastTs < 32) return;
      lastTs = ts;

      if (preset === 'matrix-rain') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
        ctx.fillRect(0, 0, w, h);
        ctx.font = '13px monospace';
        var ma = Math.min(0.72, 0.42 * intensity).toFixed(2);
        for (var mc = 0; mc < cols; mc++) {
          var ch = matrixGlyphs.charAt(Math.floor(Math.random() * matrixGlyphs.length));
          var mx = mc * 22 + 6;
          var my = drops[mc] * 18;
          ctx.fillStyle = 'rgba(' + accentRgb + ', ' + ma + ')';
          ctx.fillText(ch, mx, my);
          if (my > h + 20 && Math.random() > 0.96) drops[mc] = 0;
          drops[mc] += 0.55 * speed;
        }
        return;
      }

      ctx.clearRect(0, 0, w, h);

      if (preset === 'aurora-waves') {
        waveTick += 0.012 * speed;
        var a1 = Math.min(0.4, 0.22 * intensity).toFixed(2);
        var a2 = Math.min(0.32, 0.17 * intensity).toFixed(2);
        var a3 = Math.min(0.3, 0.16 * intensity).toFixed(2);
        var ribbons = [
          { yBase: h * 0.28, amp: 52, freq: 0.0024, speed: 1.0, color: 'rgba(' + accentRgb + ', ' + a1 + ')' },
          { yBase: h * 0.44, amp: 66, freq: 0.0018, speed: -0.75, color: 'rgba(20, 184, 166, ' + a2 + ')' },
          { yBase: h * 0.62, amp: 46, freq: 0.0029, speed: 0.65, color: 'rgba(139, 92, 246, ' + a3 + ')' },
        ];
        for (var rb = 0; rb < ribbons.length; rb++) {
          var rCfg = ribbons[rb];
          var grad = ctx.createLinearGradient(0, rCfg.yBase - 110, 0, rCfg.yBase + 130);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(0.5, rCfg.color);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(0, rCfg.yBase + 130);
          for (var ax = 0; ax <= w + 40; ax += 40) {
            var ay = rCfg.yBase + Math.sin(ax * rCfg.freq + waveTick * rCfg.speed + rb) * rCfg.amp + Math.cos(ax * 0.0011 - waveTick * 0.8) * 24;
            ctx.lineTo(ax, ay);
          }
          ctx.lineTo(w, rCfg.yBase + 160);
          ctx.lineTo(0, rCfg.yBase + 160);
          ctx.closePath();
          ctx.fill();
        }
        return;
      }

      if (preset === 'cyber-grid') {
        gridOffset = (gridOffset + 0.014 * speed) % 1;
        var horizon = h * 0.56;
        var gridH = h - horizon;
        var lineAlpha = Math.min(0.42, 0.22 * intensity);
        var hGlow = ctx.createLinearGradient(0, horizon - 50, 0, horizon + 60);
        hGlow.addColorStop(0, 'rgba(' + accentRgb + ', 0)');
        hGlow.addColorStop(0.5, 'rgba(' + accentRgb + ', ' + (lineAlpha * 0.85).toFixed(2) + ')');
        hGlow.addColorStop(1, 'rgba(' + accentRgb + ', 0)');
        ctx.fillStyle = hGlow;
        ctx.fillRect(0, horizon - 50, w, 110);

        ctx.strokeStyle = 'rgba(' + accentRgb + ', ' + lineAlpha.toFixed(2) + ')';
        ctx.lineWidth = 1;
        var vLines = 18;
        var cx = w * 0.5;
        for (var vi = -vLines; vi <= vLines; vi++) {
          var topX = cx + vi * (w / 28);
          var botX = cx + vi * (w / 5.2);
          ctx.beginPath();
          ctx.moveTo(topX, horizon);
          ctx.lineTo(botX, h);
          ctx.stroke();
        }
        var hLines = 14;
        for (var hi = 0; hi < hLines; hi++) {
          var t = (hi + gridOffset) / hLines;
          var y = horizon + Math.pow(t, 2.2) * gridH;
          ctx.strokeStyle = 'rgba(' + accentRgb + ', ' + (lineAlpha * t).toFixed(2) + ')';
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        return;
      }

      if (preset === 'constellation') {
        var maxDist = 142;
        for (var ci = 0; ci < items.length; ci++) {
          var a = items[ci];
          a.x += a.vx * speed;
          a.y += a.vy * speed;
          if (a.x < 0 || a.x > w) a.vx *= -1;
          if (a.y < 0 || a.y > h) a.vy *= -1;
          for (var cj = ci + 1; cj < items.length; cj++) {
            var b = items[cj];
            var dx = a.x - b.x;
            var dy = a.y - b.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < maxDist) {
              var la = Math.min(0.45, (1 - dist / maxDist) * 0.28 * intensity);
              ctx.strokeStyle = 'rgba(' + accentRgb + ', ' + la.toFixed(2) + ')';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
          ctx.fillStyle = 'rgba(' + accentRgb + ', ' + Math.min(0.95, a.alpha * intensity).toFixed(2) + ')';
          ctx.beginPath();
          ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }

      if (preset === 'shooting-stars') {
        for (var si = 0; si < items.length; si++) {
          var st = items[si];
          st.phase += 0.025 * speed;
          var sa = Math.min(0.9, st.alpha * intensity * (0.4 + 0.6 * Math.sin(st.phase)));
          ctx.fillStyle = 'rgba(224, 242, 254, ' + sa.toFixed(2) + ')';
          ctx.beginPath();
          ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
          ctx.fill();
        }
        for (var mj = 0; mj < meteors.length; mj++) {
          var m = meteors[mj];
          if (m.delay > 0) {
            m.delay -= speed;
            continue;
          }
          m.x += m.vx * speed;
          m.y += m.vy * speed;
          m.life += speed;
          var prog = m.life / m.maxLife;
          var ma2 = Math.min(0.95, Math.sin(Math.min(1, prog) * Math.PI) * 0.85 * intensity);
          if (ma2 > 0.02) {
            var mag = Math.sqrt(m.vx * m.vx + m.vy * m.vy) || 1;
            var tx = m.x - (m.vx / mag) * m.len;
            var ty = m.y - (m.vy / mag) * m.len;
            var mg = ctx.createLinearGradient(m.x, m.y, tx, ty);
            mg.addColorStop(0, 'rgba(255, 255, 255, ' + ma2.toFixed(2) + ')');
            mg.addColorStop(0.3, 'rgba(' + accentRgb + ', ' + (ma2 * 0.7).toFixed(2) + ')');
            mg.addColorStop(1, 'rgba(' + accentRgb + ', 0)');
            ctx.strokeStyle = mg;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();
          }
          if (m.life >= m.maxLife || m.x < -140 || m.y > h + 140) {
            meteors[mj] = spawnMeteor();
          }
        }
        return;
      }

      if (preset === 'water-ripples') {
        for (var wi = 0; wi < items.length; wi++) {
          var rp = items[wi];
          rp.r += 0.95 * speed;
          if (rp.r >= rp.maxR) {
            rp.r = 2;
            rp.x = Math.random() * w;
            rp.y = Math.random() * h;
            rp.maxR = 48 + Math.random() * 82;
          }
          var ra = Math.min(0.55, (1 - rp.r / rp.maxR) * 0.36 * intensity);
          ctx.strokeStyle = 'rgba(' + accentRgb + ', ' + ra.toFixed(2) + ')';
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
          ctx.stroke();
        }
        return;
      }

      if (preset === 'floating-bokeh') {
        var bokehColors = [accentRgb, '56, 189, 248', '167, 139, 250'];
        for (var bi = 0; bi < items.length; bi++) {
          var bk = items[bi];
          bk.phase += 0.015 * speed;
          bk.x += (bk.vx + Math.sin(bk.phase) * 0.25) * speed;
          bk.y += bk.vy * speed;
          if (bk.y < -bk.r * 2) { bk.y = h + bk.r; bk.x = Math.random() * w; }
          if (bk.x < -bk.r * 2) bk.x = w + bk.r;
          if (bk.x > w + bk.r * 2) bk.x = -bk.r;
          var col = bokehColors[bk.huePick % bokehColors.length];
          var ba = Math.min(0.28, (0.09 + 0.06 * Math.sin(bk.phase)) * intensity);
          var bg = ctx.createRadialGradient(bk.x, bk.y, bk.r * 0.1, bk.x, bk.y, bk.r);
          bg.addColorStop(0, 'rgba(' + col + ', ' + ba.toFixed(2) + ')');
          bg.addColorStop(0.7, 'rgba(' + col + ', ' + (ba * 0.45).toFixed(2) + ')');
          bg.addColorStop(1, 'rgba(' + col + ', 0)');
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.arc(bk.x, bk.y, bk.r, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }

      for (var j = 0; j < items.length; j++) {
        var p = items[j];
        p.phase += 0.025 * speed;
        var pa = Math.min(0.95, p.alpha * intensity);
        if (preset === 'sakura') {
          p.x += (p.vx + Math.sin(p.phase) * 0.55) * speed;
          p.y += p.vy * speed;
          p.rot += p.vrot * speed;
          if (p.y > h + 16) { p.y = -12; p.x = Math.random() * w; }
          if (p.x > w + 16) p.x = -12;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = 'rgba(249, 168, 212, ' + pa.toFixed(2) + ')';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r, p.r * 0.58, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (preset === 'rain') {
          p.x += p.vx * speed;
          p.y += p.vy * speed;
          if (p.y > h + 20) { p.y = -20; p.x = Math.random() * (w + 80); }
          if (p.x < -20) p.x = w + 10;
          ctx.strokeStyle = 'rgba(186, 230, 253, ' + pa.toFixed(2) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 3, p.y + p.r);
          ctx.stroke();
        } else if (preset === 'snow') {
          p.x += (p.vx + Math.sin(p.phase * 0.8) * 0.45) * speed;
          p.y += p.vy * speed;
          if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
          if (p.x > w + 10) p.x = -8;
          if (p.x < -10) p.x = w + 8;
          ctx.fillStyle = 'rgba(241, 245, 249, ' + (pa * 0.85).toFixed(2) + ')';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else if (preset === 'fireflies') {
          p.x += (p.vx + Math.sin(p.phase * 0.9) * 0.4) * speed;
          p.y += (p.vy + Math.cos(p.phase * 0.7) * 0.35) * speed;
          if (p.x < -16) p.x = w + 16;
          if (p.x > w + 16) p.x = -16;
          if (p.y < -16) p.y = h + 16;
          if (p.y > h + 16) p.y = -16;
          var glow = pa * (0.35 + 0.65 * Math.abs(Math.sin(p.phase * 1.2)));
          var fg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4.5);
          fg.addColorStop(0, 'rgba(253, 224, 71, ' + glow.toFixed(2) + ')');
          fg.addColorStop(0.45, 'rgba(251, 191, 36, ' + (glow * 0.38).toFixed(2) + ')');
          fg.addColorStop(1, 'rgba(251, 191, 36, 0)');
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 4.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          p.x += p.vx * speed;
          p.y += p.vy * speed;
          if (p.y < -8) { p.y = h + 8; p.x = Math.random() * w; }
          if (p.x < -8) p.x = w + 8;
          if (p.x > w + 8) p.x = -8;
          var pulse = pa * (0.55 + 0.45 * Math.sin(p.phase * 1.4));
          ctx.fillStyle = 'rgba(224, 242, 254, ' + pulse.toFixed(2) + ')';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    idleStateListeners.push(function() {
      if (cfg.smartGpuPowerSaving !== false && isWindowIdle()) {
        if (window.__AG_THEME_FX_RAF__) {
          cancelAnimationFrame(window.__AG_THEME_FX_RAF__);
          window.__AG_THEME_FX_RAF__ = null;
        }
      } else {
        scheduleFxFrame();
      }
    });
    scheduleFxFrame();
  }

  function applyCodeBlockFolding() {
    if (targetKind !== 'ide-chat' && targetKind !== 'app') return;
    if (!cfg.foldLongCodeBlocks) {
      unwrapCodeBlockFolds();
      return;
    }
    var shell = document.querySelector('.agy-shell');
    if (!shell) return;
    var pres = shell.querySelectorAll('pre');
    for (var i = 0; i < pres.length; i++) {
      var pre = pres[i];
      if (!pre || pre.dataset.agFoldBound === '1' || !pre.parentNode) continue;
      if (pre.parentNode.classList && pre.parentNode.classList.contains('ag-code-fold-wrap')) {
        pre.dataset.agFoldBound = '1';
        continue;
      }
      var text = pre.textContent || '';
      var lineCount = text ? text.split(/\r?\n/).length : 0;
      if (lineCount <= 22 && pre.scrollHeight <= 380) continue;

      pre.dataset.agFoldBound = '1';
      var wrap = document.createElement('div');
      wrap.className = 'ag-code-fold-wrap ag-code-fold-collapsed';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ag-code-fold-btn';
      btn.textContent = 'Expand code (' + Math.max(lineCount, 1) + ' lines)';
      btn.addEventListener('click', (function(targetWrap, targetBtn, lines) {
        return function() {
          var collapsed = targetWrap.classList.toggle('ag-code-fold-collapsed');
          targetBtn.textContent = collapsed ? ('Expand code (' + Math.max(lines, 1) + ' lines)') : 'Collapse code';
        };
      })(wrap, btn, lineCount), { signal: ac.signal });

      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
      wrap.appendChild(btn);
    }
  }

  mountWallpaper().then(function() {
    mountParticleFx();
    syncBrowserHole();
    applyCodeBlockFolding();
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
      var foldScheduled = false;
      var mo = new MutationObserver(function() {
        syncBrowserHole();
        if (cfg.foldLongCodeBlocks && !foldScheduled) {
          foldScheduled = true;
          setTimeout(function() {
            foldScheduled = false;
            if (!ac.signal.aborted) applyCodeBlockFolding();
          }, 180);
        }
      });
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
