import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import ToggleRow from './ui/ToggleRow.jsx';
import { CSS_TOKEN_REFERENCE, SELECTOR_SNIPPETS } from '../constants/presets.js';

export default function QuickCssView({
  t,
  quickCss,
  quickCssEnabled,
  quickCssLiveUpdate,
  onPatchConfig,
  onSaveQuickCss,
}) {
  const [draft, setDraft] = useState(quickCss || '');
  const [dirty, setDirty] = useState(false);
  const debounceRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    setDraft(quickCss || '');
    setDirty(false);
  }, [quickCss]);

  const handleChange = (nextText) => {
    setDraft(nextText);
    setDirty(true);
    if (quickCssLiveUpdate && quickCssEnabled) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSaveQuickCss(nextText, true, true);
        setDirty(false);
      }, 280);
    }
  };

  const handleSave = () => {
    clearTimeout(debounceRef.current);
    onSaveQuickCss(draft, true, false);
    setDirty(false);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = draft.slice(0, start) + '  ' + draft.slice(end);
      handleChange(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };

  const insertSnippet = (text) => {
    const el = textareaRef.current;
    if (!el) {
      handleChange(`${draft}\n${text}`);
      return;
    }
    const pos = el.selectionStart ?? draft.length;
    const next = draft.slice(0, pos) + text + draft.slice(el.selectionEnd ?? pos);
    handleChange(next);
    el.focus();
  };

  return (
    <div className="stack-md">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.quickCssTitle}</h1>
          <p className="page-subtitle">{t.quickCssSub}</p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => handleChange('')}
            title="Clear"
          >
            <RotateCcw size={15} strokeWidth={1.5} />
            <span>Clear</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            <Save size={15} strokeWidth={1.5} />
            <span>{dirty ? t.quickCssSave : 'OK'}</span>
            <span className="kbd" style={{ color: '#141415', borderColor: 'rgba(20,20,21,0.2)', background: 'rgba(20,20,21,0.08)' }}>
              Ctrl+S
            </span>
          </button>
        </div>
      </div>

      <div className="card">
        <div className="grid-2">
          <ToggleRow
            label={t.quickCssEnable}
            checked={quickCssEnabled !== false}
            onChange={(val) => onPatchConfig({ quickCssEnabled: val }, true)}
          />
          <ToggleRow
            label={t.quickCssLive}
            checked={quickCssLiveUpdate !== false}
            onChange={(val) => onPatchConfig({ quickCssLiveUpdate: val }, true)}
          />
        </div>
      </div>

      <div className="quickcss-layout">
        <div className="card" style={{ padding: 12, gap: 8 }}>
          <textarea
            ref={textareaRef}
            className="code-editor"
            spellCheck={false}
            value={draft}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="/* Write CSS targeting :root, .monaco-workbench, or .agy-shell */"
          />
        </div>

        <div className="card" style={{ padding: 16, gap: 12 }}>
          <div>
            <div className="card-title">CSS tokens</div>
            <div className="card-desc">Click any variable or selector to insert at cursor.</div>
          </div>

          <div className="stack-sm">
            {CSS_TOKEN_REFERENCE.map((item) => (
              <button
                key={item.token}
                type="button"
                className="token-item"
                onClick={() => insertSnippet(`\n:root {\n  ${item.sample}\n}\n`)}
              >
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                  {item.token}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.desc}</span>
              </button>
            ))}
          </div>

          <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }} className="stack-sm">
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Target selectors</div>
            {SELECTOR_SNIPPETS.map((s) => (
              <button
                key={s.label}
                type="button"
                className="token-item"
                onClick={() => insertSnippet(`\n${s.snippet}`)}
              >
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
