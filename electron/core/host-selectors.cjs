'use strict';

/**
 * Centralized 3-surface host selector contract registry (Antigravity IDE + App + IDE Chat).
 * Enables read-only DOM compatibility probes so Antigravity UI updates can be diagnosed in seconds.
 */

const HOST_SELECTOR_CONTRACTS = Object.freeze({
  ide: [
    {
      id: 'monacoWorkbench',
      label: 'IDE Workbench Shell',
      tier: 'critical',
      primary: ['.monaco-workbench'],
      fallback: ['[role="application"]'],
    },
    {
      id: 'titlebar',
      label: 'IDE Titlebar',
      tier: 'major',
      primary: ['.monaco-workbench .part.titlebar'],
      fallback: ['.titlebar-container'],
    },
    {
      id: 'sidebar',
      label: 'IDE Explorer Sidebar',
      tier: 'critical',
      primary: ['.monaco-workbench .part.sidebar'],
      fallback: ['.part.sidebar'],
    },
    {
      id: 'editor',
      label: 'IDE Editor Group',
      tier: 'critical',
      primary: ['.monaco-workbench .part.editor'],
      fallback: ['.monaco-editor'],
    },
    {
      id: 'integratedTerminal',
      label: 'IDE Integrated Terminal',
      tier: 'optional',
      primary: ['.monaco-workbench .part.panel .xterm-viewport'],
      fallback: ['.xterm'],
    },
    {
      id: 'statusbar',
      label: 'IDE Status Bar',
      tier: 'major',
      primary: ['.monaco-workbench .part.statusbar'],
      fallback: ['footer.part.statusbar'],
    },
  ],
  shell: [
    {
      id: 'agyShell',
      label: 'Antigravity Shell Root',
      tier: 'critical',
      primary: ['.agy-shell'],
      fallback: ['#root'],
    },
    {
      id: 'sidebarSplit',
      label: 'App Sidebar',
      tier: 'critical',
      primary: ['.agy-shell [data-testid="sidebar-split"]', '.agy-shell [data-sidebar="true"]'],
      fallback: ['.agy-shell aside'],
    },
    {
      id: 'conversationView',
      label: 'Conversation Stream',
      tier: 'major',
      primary: ['.agy-shell [data-testid="conversation-view"]', '.agy-shell [data-testid="agent-response"]'],
      fallback: ['.agy-shell main', '.agy-shell [role="main"]'],
    },
    {
      id: 'composerInput',
      label: 'Chat Composer Card',
      tier: 'critical',
      primary: ['.agy-shell [data-testid="agent-input-box"]', '.agy-shell .surface-composer-card'],
      fallback: ['.agy-shell .surface-composer', '.agy-shell textarea'],
    },
    {
      id: 'sidePanel',
      label: 'Auxiliary / Overview Pane',
      tier: 'optional',
      primary: ['.agy-shell [data-side-panel-body="true"]', '.agy-shell [data-testid="overview-panel-host"]'],
      fallback: ['.agy-shell [data-testid="aux-pane-split"]'],
    },
    {
      id: 'stepPlan',
      label: 'Agent Plan & Step Cards',
      tier: 'optional',
      primary: ['.agy-shell [data-testid="step-plan"]'],
      fallback: ['.agy-shell [data-testid="autoscroll-viewport"]'],
    },
    {
      id: 'radixPopover',
      label: 'Floating Popovers & Menus',
      tier: 'optional',
      primary: ['[data-radix-popper-content-wrapper]', '.agy-shell [role="menu"]'],
      fallback: ['.agy-shell [role="dialog"]'],
    },
  ],
});

/**
 * Builds a strictly read-only DOM compatibility probe expression (0 DOM mutations, 0 innerHTML).
 */
function buildDomCompatProbeScript(kind) {
  const contracts = kind === 'ide' ? HOST_SELECTOR_CONTRACTS.ide : HOST_SELECTOR_CONTRACTS.shell;
  return `(() => {
    const contracts = ${JSON.stringify(contracts)};
    const checks = contracts.map((c) => {
      let primaryHits = 0;
      let fallbackHits = 0;
      for (const sel of c.primary) {
        try { primaryHits += document.querySelectorAll(sel).length; } catch (_) {}
      }
      if (primaryHits === 0) {
        for (const sel of c.fallback) {
          try { fallbackHits += document.querySelectorAll(sel).length; } catch (_) {}
        }
      }
      const status = primaryHits > 0 ? 'OK' : (fallbackHits > 0 ? 'FALLBACK' : (c.tier === 'optional' ? 'IDLE' : 'MISSING'));
      return { id: c.id, label: c.label, tier: c.tier, status, hits: primaryHits || fallbackHits };
    });
    return {
      url: location.href.slice(0, 120),
      styleInjected: !!document.getElementById('ag-theme-style'),
      styleBytes: (document.getElementById('ag-theme-style')?.textContent || '').length,
      backdropInjected: !!document.getElementById('ag-theme-bg-layer'),
      checks,
    };
  })()`;
}

module.exports = {
  HOST_SELECTOR_CONTRACTS,
  buildDomCompatProbeScript,
};
