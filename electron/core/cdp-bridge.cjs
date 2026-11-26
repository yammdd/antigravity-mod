'use strict';

const EventEmitter = require('events');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { buildInjectScript, buildRemoveScript } = require('../injector/runtime-script.cjs');

/**
 * Multi-surface non-invasive CDP bridge.
 * Simultaneously discovers and attaches to BOTH:
 *   - Antigravity IDE Workbench (kind: 'ide') + its embedded chat iframe (kind: 'ide-chat')
 *   - Standalone Antigravity App 2.0 (kind: 'app')
 */
class CdpBridge extends EventEmitter {
  constructor(getRuntimePayload) {
    super();
    this.getRuntimePayload = getRuntimePayload;
    this.sessions = new Map(); // `${port}:${targetId}` -> session
    this.activePorts = new Map(); // port -> file
    this.pollTimer = null;
    this.lastStatusJson = '';
    this.isDisabled = false;
    this.ideLayout = null;
    this._scanning = false;
  }

  getCandidatePortFiles() {
    const home = os.homedir();
    const list = [];
    if (process.env.AGY_PORT_FILE) list.push(process.env.AGY_PORT_FILE);

    if (process.platform === 'win32') {
      const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
      list.push(
        path.join(appData, 'Antigravity IDE', 'DevToolsActivePort'),
        path.join(appData, 'Antigravity', 'DevToolsActivePort'),
        path.join(appData, 'antigravity', 'DevToolsActivePort'),
        path.join(appData, 'Antigravity App', 'DevToolsActivePort')
      );
    } else if (process.platform === 'darwin') {
      const appSupport = path.join(home, 'Library', 'Application Support');
      list.push(
        path.join(appSupport, 'Antigravity IDE', 'DevToolsActivePort'),
        path.join(appSupport, 'Antigravity', 'DevToolsActivePort'),
        path.join(appSupport, 'antigravity', 'DevToolsActivePort'),
        path.join(appSupport, 'Antigravity App', 'DevToolsActivePort')
      );
    } else {
      const xdg = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
      list.push(
        path.join(xdg, 'Antigravity IDE', 'DevToolsActivePort'),
        path.join(xdg, 'Antigravity', 'DevToolsActivePort'),
        path.join(xdg, 'antigravity', 'DevToolsActivePort'),
        path.join(xdg, 'Antigravity App', 'DevToolsActivePort')
      );
    }
    return [...new Set(list)];
  }

  fetchJson(url, timeoutMs = 1000) {
    return new Promise((resolve, reject) => {
      const req = http.get(url, { timeout: timeoutMs }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      });
      req.on('timeout', () => req.destroy(new Error('HTTP timeout')));
      req.on('error', reject);
    });
  }

  async discoverAllLivePorts() {
    const files = this.getCandidatePortFiles().filter((p) => fs.existsSync(p));
    const discovered = [];
    const seenPorts = new Set();

    for (const file of files) {
      try {
        const firstLine = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/)[0];
        const port = parseInt(firstLine, 10);
        if (!Number.isFinite(port) || port <= 0 || seenPorts.has(port)) continue;
        const targets = await this.fetchJson(`http://127.0.0.1:${port}/json`, 900);
        if (Array.isArray(targets)) {
          seenPorts.add(port);
          discovered.push({ port, file, targets });
        }
      } catch (_) {}
    }
    return discovered;
  }

  classifyTarget(target, portHasWorkbench) {
    if (!target || (target.type !== 'page' && target.type !== 'iframe') || !target.webSocketDebuggerUrl) {
      return null;
    }
    const url = String(target.url || '');
    if (
      url.startsWith('devtools://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('vscode-webview://')
    ) {
      return null;
    }
    if (url.includes('workbench') || url.startsWith('vscode-file://')) return 'ide';
    if (url.includes('127.0.0.1') || url.includes('launchpad') || url.includes('antigravity')) {
      return portHasWorkbench ? 'ide-chat' : 'app';
    }
    return null;
  }

  buildEnrichedPayload(basePayload, kind) {
    return {
      ...basePayload,
      targetOverride: kind,
      ideLayout: this.ideLayout,
    };
  }

  async queryIdeLayout() {
    for (const s of this.sessions.values()) {
      if (s.kind !== 'ide' || !s.ready) continue;
      try {
        const res = await s.evaluate(`(() => {
          const f = document.querySelector('iframe.webview.ready') || document.querySelector('iframe.webview');
          const r = f ? f.getBoundingClientRect() : null;
          return {
            parentW: window.innerWidth,
            parentH: window.innerHeight,
            offsetX: r ? Math.round(r.left) : 0,
            offsetY: r ? Math.round(r.top) : 0,
            frameW: r ? Math.round(r.width) : 0,
            frameH: r ? Math.round(r.height) : 0
          };
        })()`, true);
        const val = res?.result?.value;
        if (val && val.parentW > 0) {
          this.ideLayout = val;
          return val;
        }
      } catch (_) {}
    }
    return this.ideLayout;
  }

  broadcastLayoutToIdeChats(layout) {
    if (!layout || !layout.parentW) return;
    const expr = `if (typeof window.__AG_THEME_SYNC_LAYOUT__ === 'function') { window.__AG_THEME_SYNC_LAYOUT__(${JSON.stringify(layout)}); }`;
    for (const s of this.sessions.values()) {
      if (s.kind === 'ide-chat' && s.ready) {
        s.evaluate(expr, false);
      }
    }
  }

  async refreshPreloadScript(session, scriptOrNull) {
    if (!session || !session.ready) return;
    if (session.preloadScriptId) {
      await session
        .send('Page.removeScriptToEvaluateOnNewDocument', { identifier: session.preloadScriptId })
        .catch(() => {});
      session.preloadScriptId = null;
    }
    if (scriptOrNull) {
      const added = await session
        .send('Page.addScriptToEvaluateOnNewDocument', { source: scriptOrNull })
        .catch(() => null);
      if (added?.identifier) {
        session.preloadScriptId = added.identifier;
      }
    }
  }

  createSession(sessionKey, port, target, kind) {
    const ws = new globalThis.WebSocket(target.webSocketDebuggerUrl);
    let nextId = 1;
    const pending = new Map();

    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        if (ws.readyState !== 1) {
          reject(new Error('WebSocket not open'));
          return;
        }
        const id = nextId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });

    const evaluate = async (expression, returnByValue = false) => {
      try {
        return await send('Runtime.evaluate', { expression, returnByValue, awaitPromise: false });
      } catch (_) {
        return null;
      }
    };

    const session = {
      key: sessionKey,
      id: target.id,
      port,
      kind,
      url: target.url,
      title: target.title,
      ws,
      send,
      evaluate,
      ready: false,
      preloadScriptId: null,
      lastHealAt: 0,
    };
    this.sessions.set(sessionKey, session);

    ws.addEventListener('message', async (event) => {
      let msg;
      try {
        msg = JSON.parse(String(event.data));
      } catch (_) {
        return;
      }

      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message || 'CDP error'));
        else p.resolve(msg.result);
        return;
      }

      if (msg.method === 'Runtime.bindingCalled' && msg.params?.name === 'agThemeLayoutSync') {
        try {
          const layout = JSON.parse(msg.params.payload || '{}');
          if (layout && layout.parentW > 0) {
            this.ideLayout = layout;
            this.broadcastLayoutToIdeChats(layout);
          }
        } catch (_) {}
        return;
      }

      if (
        (msg.method === 'Page.frameNavigated' && msg.params?.frame && !msg.params.frame.parentId) ||
        msg.method === 'Page.loadEventFired'
      ) {
        if (!this.isDisabled) {
          const payload = this.getRuntimePayload();
          if (payload?.config?.enabled) {
            if (kind === 'ide-chat') await this.queryIdeLayout();
            await evaluate(buildInjectScript(this.buildEnrichedPayload(payload, kind)));
            if (kind === 'ide' && this.ideLayout) this.broadcastLayoutToIdeChats(this.ideLayout);
          }
        }
      }
    });

    ws.addEventListener('open', async () => {
      try {
        await send('Page.enable');
        await send('Runtime.enable');
        if (kind === 'ide') {
          await send('Runtime.addBinding', { name: 'agThemeLayoutSync' }).catch(() => {});
        }
        session.ready = true;
        if (kind === 'ide' || kind === 'ide-chat') await this.queryIdeLayout();

        if (!this.isDisabled) {
          const payload = this.getRuntimePayload();
          if (payload?.config?.enabled) {
            const script = buildInjectScript(this.buildEnrichedPayload(payload, kind));
            await this.refreshPreloadScript(session, script);
            await evaluate(script);
            session.lastHealAt = Date.now();
          }
        }

        if (kind === 'ide' && this.ideLayout) {
          this.broadcastLayoutToIdeChats(this.ideLayout);
        }
        this.emitStatus();
      } catch (_) {}
    });

    const cleanup = () => {
      for (const p of pending.values()) p.reject(new Error('Closed'));
      pending.clear();
      this.sessions.delete(sessionKey);
      this.emitStatus();
    };
    ws.addEventListener('close', cleanup);
    ws.addEventListener('error', cleanup);
  }

  async scan() {
    if (this._scanning) return;
    this._scanning = true;
    try {
      const livePorts = await this.discoverAllLivePorts();
      this.activePorts.clear();

      const liveKeys = new Set();
      const pendingTargets = [];

      for (const { port, file, targets } of livePorts) {
        this.activePorts.set(port, file);
        const portHasWorkbench = targets.some(
          (t) =>
            t &&
            (String(t.url || '').includes('workbench') || String(t.url || '').startsWith('vscode-file://'))
        );

        for (const target of targets) {
          const kind = this.classifyTarget(target, portHasWorkbench);
          if (!kind) continue;
          const key = `${port}:${target.id}`;
          liveKeys.add(key);
          pendingTargets.push({ key, port, target, kind });
        }
      }

      for (const [key, session] of this.sessions.entries()) {
        if (!liveKeys.has(key)) {
          try { session.ws.close(); } catch (_) {}
          this.sessions.delete(key);
        }
      }

      for (const { key, port, target, kind } of pendingTargets) {
        if (!this.sessions.has(key)) {
          this.createSession(key, port, target, kind);
        }
      }

      if (!this.isDisabled) {
        const payload = this.getRuntimePayload();
        if (payload?.config?.enabled) {
          const now = Date.now();
          for (const s of this.sessions.values()) {
            if (!s.ready || now - s.lastHealAt < 2500) continue;
            const chk = await s.evaluate(`!!document.getElementById('ag-theme-style')`, true);
            if (chk?.result?.value === false) {
              s.lastHealAt = now;
              const script = buildInjectScript(this.buildEnrichedPayload(payload, s.kind));
              await this.refreshPreloadScript(s, script);
              await s.evaluate(script, false);
            }
          }
        }
      }

      this.emitStatus();
    } finally {
      this._scanning = false;
    }
  }

  getStatus() {
    const targets = Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      port: s.port,
      kind: s.kind,
      ready: s.ready,
      title: s.title,
      url: s.url,
    }));
    const ideCount = targets.filter((t) => t.kind === 'ide' && t.ready).length;
    const ideChatCount = targets.filter((t) => t.kind === 'ide-chat' && t.ready).length;
    const appCount = targets.filter((t) => t.kind === 'app' && t.ready).length;
    const ports = [...this.activePorts.keys()];

    return {
      connected: ideCount > 0 || ideChatCount > 0 || appCount > 0,
      port: ports[0] || null,
      ports,
      ideConnected: ideCount > 0,
      ideChatConnected: ideChatCount > 0,
      appConnected: appCount > 0,
      ideCount,
      ideChatCount,
      appCount,
      targets,
    };
  }

  emitStatus() {
    const status = this.getStatus();
    const json = JSON.stringify(status);
    if (json !== this.lastStatusJson) {
      this.lastStatusJson = json;
      this.emit('status', status);
    }
  }

  async applyNow(payload) {
    this.isDisabled = !payload?.config?.enabled;
    await this.queryIdeLayout();

    const results = [];
    for (const s of this.sessions.values()) {
      if (!s.ready) continue;
      const script = this.isDisabled
        ? buildRemoveScript()
        : buildInjectScript(this.buildEnrichedPayload(payload, s.kind));
      try {
        await this.refreshPreloadScript(s, this.isDisabled ? null : script);
        const res = await s.evaluate(script, true);
        s.lastHealAt = Date.now();
        results.push({ id: s.id, kind: s.kind, value: res?.result?.value || null });
      } catch (err) {
        results.push({ id: s.id, kind: s.kind, error: err.message });
      }
    }
    return { ok: true, count: results.length, results };
  }

  async disableAll() {
    this.isDisabled = true;
    const script = buildRemoveScript();
    const results = [];
    for (const s of this.sessions.values()) {
      if (!s.ready) continue;
      try {
        await this.refreshPreloadScript(s, null);
        const res = await s.evaluate(script, true);
        results.push({ id: s.id, kind: s.kind, value: res?.result?.value || null });
      } catch (err) {
        results.push({ id: s.id, kind: s.kind, error: err.message });
      }
    }
    return { ok: true, count: results.length, results };
  }

  async inspectTargets() {
    const expr = `(() => ({
      url: location.href.slice(0, 120),
      hasStyle: !!document.getElementById('ag-theme-style'),
      styleBytes: (document.getElementById('ag-theme-style')?.textContent || '').length,
      hasBackdrop: !!document.getElementById('ag-theme-bg-layer'),
      hasShell: !!document.querySelector('.agy-shell'),
      hasWorkbench: !!document.querySelector('.monaco-workbench'),
      hasBrowserHole: document.body.getAttribute('data-has-browser-hole') || null
    }))()`;
    const list = [];
    for (const s of this.sessions.values()) {
      if (!s.ready) continue;
      const res = await s.evaluate(expr, true);
      list.push({ id: s.id, port: s.port, kind: s.kind, info: res?.result?.value || null });
    }
    return list;
  }

  start() {
    this.scan();
    this.pollTimer = setInterval(() => this.scan(), 1500);
  }

  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    for (const s of this.sessions.values()) {
      try { s.ws.close(); } catch (_) {}
    }
    this.sessions.clear();
  }
}

module.exports = { CdpBridge };
