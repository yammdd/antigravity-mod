import React, { useState } from 'react';
import { Check, FileOutput, Trash2, Type } from 'lucide-react';
import SliderField from './ui/SliderField.jsx';
import ToggleRow from './ui/ToggleRow.jsx';
import SegmentedControl from './ui/SegmentedControl.jsx';
import { ACCENT_SWATCHES, ANIMATION_PRESETS, MONO_FONTS, UI_FONTS } from '../constants/presets.js';

export default function StudioView({
  t,
  config,
  systemDark = true,
  fonts,
  onPatchConfig,
  onImportFonts,
  onDeleteFont,
  onExportStudioTheme,
}) {
  const [exportName, setExportName] = useState('');
  const [exportKind, setExportKind] = useState('pack');
  const [showExport, setShowExport] = useState(false);

  const handleExport = async (e) => {
    e.preventDefault();
    if (!exportName.trim()) return;
    await onExportStudioTheme({ name: exportName.trim(), kind: exportKind });
    setExportName('');
    setShowExport(false);
  };

  return (
    <div className="stack-md">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.appTitle}</h1>
          <p className="page-subtitle">{t.appSub}</p>
        </div>

        <div className="header-actions">
          <button type="button" className="btn" onClick={() => setShowExport((v) => !v)}>
            <FileOutput size={16} strokeWidth={1.5} />
            <span>{t.exportTheme}</span>
          </button>
        </div>
      </div>

      {showExport && (
        <form className="card" onSubmit={handleExport}>
          <div className="card-header">
            <div className="card-title">{t.exportTheme}</div>
            <SegmentedControl
              value={exportKind}
              onChange={setExportKind}
              options={[
                { id: 'pack', label: 'Theme Pack' },
                { id: 'css', label: '.theme.css' },
              ]}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              placeholder="Theme name (e.g. Rainy Glass)"
              value={exportName}
              onChange={(e) => setExportName(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary">
              Save to Themes
            </button>
          </div>
        </form>
      )}

      {/* Visual Live Animation Picker */}
      <div className="card">
        <div>
          <div className="card-title">{t.animSection}</div>
          <div className="card-desc">{t.animSectionDesc}</div>
        </div>

        <div className="anim-grid">
          {ANIMATION_PRESETS.map((preset) => {
            const selected = (config.animationPreset || 'aurora-waves') === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={`anim-card ${selected ? 'selected' : ''}`}
                onClick={() => onPatchConfig({ animationPreset: preset.id }, true)}
              >
                <div className="anim-card-top">
                  <span className="anim-card-title">{preset.label}</span>
                  {selected ? (
                    <span className="surface-check checked">
                      <Check size={11} strokeWidth={2.4} />
                    </span>
                  ) : (
                    <span className="surface-tag">{preset.badge}</span>
                  )}
                </div>
                <span className="anim-card-desc">{preset.desc}</span>
              </button>
            );
          })}
        </div>

        <div className="grid-2" style={{ paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <SliderField
            label="Animation speed"
            value={Number(config.animationSpeed ?? 1)}
            min={0.4}
            max={2.2}
            step={0.1}
            unit="x"
            onChange={(v) => onPatchConfig({ animationSpeed: Number(v) })}
          />
          <SliderField
            label="Animation intensity & density"
            value={Math.round(config.animationIntensity ?? 100)}
            min={25}
            max={150}
            step={5}
            unit="%"
            onChange={(v) => onPatchConfig({ animationIntensity: Math.round(v) })}
          />
        </div>

        <ToggleRow
          label="Dynamic UI motion (titlebar light glide, smooth replies & focus pulse)"
          hint="Runs alongside any live canvas animation; pauses automatically on reduced motion"
          checked={config.dynamicUiMotion !== false}
          onChange={(v) => onPatchConfig({ dynamicUiMotion: v }, true)}
        />
      </div>

      <div className="grid-2">
        {/* Colors & Frosted Glass */}
        <div className="card">
          <div className="card-title">Colors & Glass</div>

          <div className="field">
            <div className="field-head">
              <span>{t.colorMode}</span>
              {config.colorMode === 'auto' && (
                <span className="field-value">OS: {systemDark ? 'Dark' : 'Light'}</span>
              )}
            </div>
            <SegmentedControl
              full
              value={config.colorMode || 'dark'}
              onChange={(v) => onPatchConfig({ colorMode: v }, true)}
              options={[
                { id: 'dark', label: t.modeDark },
                { id: 'light', label: t.modeLight },
                { id: 'auto', label: 'Auto (OS)' },
              ]}
            />
          </div>

          <div className="field">
            <span className="field-head">{t.surfaceTint}</span>
            <SegmentedControl
              full
              value={config.surfaceTint || 'graphite'}
              onChange={(v) => onPatchConfig({ surfaceTint: v }, true)}
              options={[
                { id: 'graphite', label: t.tintGraphite },
                { id: 'ink', label: t.tintInk },
                { id: 'warm', label: t.tintWarm },
              ]}
            />
          </div>

          <div className="field">
            <div className="field-head">
              <span>{t.accentColor}</span>
              <span className="field-value">{config.accentColor}</span>
            </div>
            <div className="swatches">
              {ACCENT_SWATCHES.map((sw) => (
                <button
                  key={sw.hex}
                  type="button"
                  title={sw.name}
                  className={`swatch ${config.accentColor?.toLowerCase() === sw.hex ? 'selected' : ''}`}
                  style={{ backgroundColor: sw.hex }}
                  onClick={() => onPatchConfig({ accentColor: sw.hex }, true)}
                />
              ))}
              <label
                title="Custom color"
                className="swatch"
                style={{
                  border: '1px dashed var(--border-strong)',
                  backgroundColor: config.accentColor,
                  overflow: 'hidden',
                }}
              >
                <input
                  type="color"
                  value={config.accentColor || '#3b82f6'}
                  onChange={(e) => onPatchConfig({ accentColor: e.target.value })}
                  style={{ opacity: 0, width: 32, height: 32, cursor: 'pointer' }}
                />
              </label>
            </div>
          </div>

          <SliderField
            label="Frosted glass blur (popups, sidebar & composer)"
            value={config.glassBlur ?? 12}
            min={0}
            max={24}
            unit="px"
            onChange={(v) => onPatchConfig({ glassBlur: v })}
          />

          <SliderField
            label={t.cornerRadius}
            value={config.cornerRadius ?? 10}
            min={0}
            max={20}
            unit="px"
            onChange={(v) => onPatchConfig({ cornerRadius: v })}
          />

          <div className="field">
            <span className="field-head">{t.borders}</span>
            <SegmentedControl
              full
              value={config.borderStyle || 'hairline'}
              onChange={(v) => onPatchConfig({ borderStyle: v }, true)}
              options={[
                { id: 'hairline', label: t.borderHairline },
                { id: 'none', label: t.borderNone },
                { id: 'accent', label: t.borderAccent },
              ]}
            />
          </div>
        </div>

        {/* Fonts & Typography */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">{t.fontSection}</div>
            <button type="button" className="btn" onClick={onImportFonts}>
              <Type size={15} strokeWidth={1.5} />
              <span>{t.importFont}</span>
            </button>
          </div>

          <div className="grid-2">
            <div className="field">
              <label className="field-head" htmlFor="ui-font">
                {t.uiFont}
              </label>
              <select
                id="ui-font"
                className="select"
                value={config.uiFont === 'custom' ? `custom:${config.customUiFontId}` : config.uiFont || 'inter'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('custom:')) {
                    onPatchConfig({ uiFont: 'custom', customUiFontId: val.slice(7) }, true);
                  } else {
                    onPatchConfig({ uiFont: val }, true);
                  }
                }}
              >
                {UI_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
                {fonts.map((f) => (
                  <option key={f.id} value={`custom:${f.id}`}>
                    Local: {f.family}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field-head" htmlFor="mono-font">
                {t.codeFont}
              </label>
              <select
                id="mono-font"
                className="select"
                value={config.monoFont === 'custom' ? `custom:${config.customMonoFontId}` : config.monoFont || 'jetbrains'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('custom:')) {
                    onPatchConfig({ monoFont: 'custom', customMonoFontId: val.slice(7) }, true);
                  } else {
                    onPatchConfig({ monoFont: val }, true);
                  }
                }}
              >
                {MONO_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
                {fonts.map((f) => (
                  <option key={f.id} value={`custom:${f.id}`}>
                    Local: {f.family}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {fonts.length > 0 && (
            <div className="stack-sm">
              {fonts.map((f) => (
                <div key={f.id} className="meta-row">
                  <span className="mono">
                    {f.family} (.{f.format})
                  </span>
                  <button
                    type="button"
                    className="icon-btn danger"
                    style={{ width: 24, height: 24 }}
                    onClick={() => onDeleteFont(f.id)}
                    title="Remove font"
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <SliderField
            label={t.chatSize}
            value={config.chatFontSize ?? 14}
            min={12}
            max={18}
            unit="px"
            onChange={(v) => onPatchConfig({ chatFontSize: v })}
          />

          <div className="field">
            <span className="field-head">App chat bubble style</span>
            <SegmentedControl
              full
              value={config.chatBubbleStyle || 'glass'}
              onChange={(v) => onPatchConfig({ chatBubbleStyle: v }, true)}
              options={[
                { id: 'glass', label: 'Glass' },
                { id: 'minimal', label: 'Minimal' },
                { id: 'outlined', label: 'Outlined' },
                { id: 'floating', label: 'Floating' },
              ]}
            />
          </div>

          <div className="field">
            <span className="field-head">Chat reading width</span>
            <SegmentedControl
              full
              value={config.chatWidth || 'standard'}
              onChange={(v) => onPatchConfig({ chatWidth: v }, true)}
              options={[
                { id: 'compact', label: 'Compact' },
                { id: 'standard', label: 'Standard' },
                { id: 'wide', label: 'Wide' },
              ]}
            />
          </div>

          <ToggleRow
            label="Fold long code blocks in Chat"
            hint="Collapse code blocks over 22 lines in IDE Chat and Antigravity App"
            checked={Boolean(config.foldLongCodeBlocks)}
            onChange={(v) => onPatchConfig({ foldLongCodeBlocks: v }, true)}
          />
        </div>
      </div>

      {/* Deep IDE & Workbench Polish */}
      <div className="card">
        <div className="card-title">IDE Workbench & Clean Mode</div>
        <div className="grid-2">
          <div className="stack-sm">
            <div className="field">
              <span className="field-head">{t.ideTabs}</span>
              <SegmentedControl
                full
                value={config.tabsStyle || 'default'}
                onChange={(v) => onPatchConfig({ tabsStyle: v }, true)}
                options={[
                  { id: 'default', label: t.tabDefault },
                  { id: 'underline', label: t.tabUnderline },
                  { id: 'minimal', label: 'Top line' },
                ]}
              />
            </div>

            <div className="grid-2">
              <div className="field">
                <label className="field-head" htmlFor="act-style">
                  {t.actBar}
                </label>
                <select
                  id="act-style"
                  className="select"
                  value={config.activityBarStyle || 'subtle'}
                  onChange={(e) => onPatchConfig({ activityBarStyle: e.target.value }, true)}
                >
                  <option value="default">{t.tabDefault}</option>
                  <option value="subtle">Subtle indicator</option>
                  <option value="accent">Accent active</option>
                  <option value="minimal">{t.tabMinimal}</option>
                </select>
              </div>

              <div className="field">
                <label className="field-head" htmlFor="status-style">
                  {t.statusBar}
                </label>
                <select
                  id="status-style"
                  className="select"
                  value={config.statusBarStyle || 'clean'}
                  onChange={(e) => onPatchConfig({ statusBarStyle: e.target.value }, true)}
                >
                  <option value="default">{t.tabDefault}</option>
                  <option value="clean">Matched clean</option>
                  <option value="minimal">{t.tabMinimal}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="stack-sm">
            <ToggleRow
              label="Frosted popups, Command Palette & IntelliSense"
              hint="Apply glass blur and rounded corners to menus and overlays"
              checked={config.frostedPopups !== false}
              onChange={(v) => onPatchConfig({ frostedPopups: v }, true)}
            />
            <ToggleRow
              label="Rounded Explorer rows"
              checked={config.roundedTreeRows !== false}
              onChange={(v) => onPatchConfig({ roundedTreeRows: v }, true)}
            />
            <ToggleRow
              label="Smooth typing cursor animation"
              checked={config.smoothCursor !== false}
              onChange={(v) => onPatchConfig({ smoothCursor: v }, true)}
            />
            <ToggleRow
              label="Hide editor minimap"
              checked={Boolean(config.hideMinimap)}
              onChange={(v) => onPatchConfig({ hideMinimap: v }, true)}
            />
            <ToggleRow
              label="Hide breadcrumbs bar"
              checked={Boolean(config.compactBreadcrumbs)}
              onChange={(v) => onPatchConfig({ compactBreadcrumbs: v }, true)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
