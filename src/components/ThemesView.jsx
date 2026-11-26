import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Check,
  Download,
  ExternalLink,
  Film,
  FolderOpen,
  FolderPlus,
  Globe,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import SegmentedControl from './ui/SegmentedControl.jsx';
import { ANIMATION_PRESETS } from '../constants/presets.js';

export default function ThemesView({
  t,
  themes,
  themesDir,
  enabledThemes,
  onlineThemeUrls,
  onlineThemes,
  busyAction,
  onApplyPresetPack,
  onCreateTheme,
  onDeleteTheme,
  onImportThemes,
  onImportPack,
  onImportPackZip,
  onExportPackZip,
  onReloadAll,
  onSetOnlineUrls,
}) {
  const [category, setCategory] = useState('all');
  const [hoveredId, setHoveredId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createKind, setCreateKind] = useState('pack');
  const [newName, setNewName] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [urlsText, setUrlsText] = useState((onlineThemeUrls || []).join('\n'));

  useEffect(() => {
    setUrlsText((onlineThemeUrls || []).join('\n'));
  }, [onlineThemeUrls]);

  const enabledSet = new Set(enabledThemes || []);

  const animLabelMap = useMemo(() => {
    const map = {};
    for (const a of ANIMATION_PRESETS) {
      map[a.id] = a.label;
    }
    return map;
  }, []);

  const filteredThemes = useMemo(() => {
    if (category === 'all') return themes;
    if (category === 'gif') {
      return themes.filter((th) => th.category === 'gif' || th.isGif);
    }
    if (category === 'video') {
      return themes.filter((th) => th.category === 'video' || th.backdropMediaType === 'video');
    }
    if (category === 'minimal') {
      return themes.filter((th) => th.category === 'minimal' || th.kind === 'css');
    }
    return themes.filter((th) => th.category === category);
  }, [themes, category]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await onCreateTheme({
      kind: createKind,
      name: newName.trim(),
      author: newAuthor.trim() || 'User',
      description: newDesc.trim() || 'Custom Antigravity theme',
    });
    setNewName('');
    setNewAuthor('');
    setNewDesc('');
    setShowCreate(false);
  };

  const handleSaveOnlineUrls = async () => {
    const urls = urlsText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    await onSetOnlineUrls(urls);
  };

  const categories = [
    { id: 'all', label: `${t.catAll} (${themes.length})` },
    { id: 'anime', label: t.catAnime },
    { id: 'gif', label: t.catGif },
    { id: 'video', label: t.catVideo },
    { id: 'landscape', label: t.catLandscape },
    { id: 'minimal', label: t.catMinimal },
    { id: 'online', label: `${t.catOnline}${onlineThemeUrls?.length ? ` (${onlineThemeUrls.length})` : ''}` },
  ];

  return (
    <div className="stack-md">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.themesTitle}</h1>
          <p className="page-subtitle">{t.themesSub}</p>
        </div>

        <div className="header-actions" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={onImportThemes}>
            <Upload size={15} strokeWidth={1.5} />
            <span>{t.importCss}</span>
          </button>
          <button type="button" className="btn" onClick={onImportPackZip}>
            <Archive size={15} strokeWidth={1.5} />
            <span>Import .zip</span>
          </button>
          <button type="button" className="btn" onClick={onImportPack}>
            <FolderPlus size={15} strokeWidth={1.5} />
            <span>{t.importPack}</span>
          </button>
          <button type="button" className="btn" onClick={() => window.themeAPI?.openThemesFolder()}>
            <FolderOpen size={15} strokeWidth={1.5} />
            <span>{t.openFolder}</span>
          </button>
          <button
            type="button"
            className="btn"
            disabled={busyAction === 'reload'}
            onClick={onReloadAll}
            title={t.reload}
          >
            <RefreshCw size={15} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreate((v) => !v)}
          >
            <Plus size={15} strokeWidth={1.5} />
            <span>{t.newTheme}</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="filter-pills">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`filter-pill ${category === c.id ? 'active' : ''}`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {showCreate && (
        <form className="card" onSubmit={handleCreateSubmit}>
          <div className="card-header">
            <div>
              <div className="card-title">Create new theme</div>
              <div className="card-desc">
                Saved inside <span className="mono">{themesDir}</span>
              </div>
            </div>
            <SegmentedControl
              value={createKind}
              onChange={setCreateKind}
              options={[
                { id: 'pack', label: 'Theme Pack' },
                { id: 'css', label: '.theme.css' },
              ]}
            />
          </div>

          <div className="grid-2">
            <div className="field">
              <label className="field-head" htmlFor="theme-name">
                Theme name
              </label>
              <input
                id="theme-name"
                className="input"
                placeholder="Sakura Night"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label className="field-head" htmlFor="theme-author">
                Author
              </label>
              <input
                id="theme-author"
                className="input"
                placeholder="Your handle"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label className="field-head" htmlFor="theme-desc">
              Description
            </label>
            <input
              id="theme-desc"
              className="input"
              placeholder="Short description of palette or backdrop"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </div>

          <div className="header-actions" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {createKind === 'pack' ? 'Create Theme Pack' : 'Create .theme.css'}
            </button>
          </div>
        </form>
      )}

      {category === 'online' ? (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t.onlineTitle}</div>
              <div className="card-desc">{t.onlineDesc}</div>
            </div>
            <Globe size={18} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
          </div>

          <textarea
            className="textarea mono"
            rows={5}
            placeholder="https://raw.githubusercontent.com/user/repo/main/theme.theme.css"
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
          />

          <div className="header-actions" style={{ justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busyAction === 'online'}
              onClick={handleSaveOnlineUrls}
            >
              {busyAction === 'online' ? t.fetching : t.saveAndLoad}
            </button>
          </div>

          {onlineThemes.length > 0 && (
            <div className="stack-sm" style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              {onlineThemes.map((item) => (
                <div key={item.url} className="meta-row">
                  <span className="mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name} ({item.url})
                  </span>
                  <span
                    className="mono"
                    style={{ color: item.error ? 'var(--negative)' : 'var(--positive)', flexShrink: 0 }}
                  >
                    {item.error ? item.error : item.loaded ? 'OK' : '...'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="theme-gallery-grid">
          {filteredThemes.map((theme) => {
            const themeId = theme.id || theme.fileName;
            const isActive = enabledSet.has(themeId);
            const title = theme.name;
            const desc = theme.description;
            const isVideo = theme.backdropMediaType === 'video';
            const isGif = Boolean(theme.isGif);
            const showLiveGif = isGif && theme.backdropUrl && (hoveredId === themeId || isActive);
            const accent = theme.accentColor || '#3b82f6';
            const animId = theme.preset?.animationPreset;
            const animBadge = animId && animId !== 'none' ? animLabelMap[animId] : '';

            return (
              <article
                key={themeId}
                className={`visual-theme-card ${isActive ? 'active' : ''}`}
                onMouseEnter={() => isGif && setHoveredId(themeId)}
                onMouseLeave={() => isGif && setHoveredId('')}
              >
                <div
                  className="visual-theme-cover"
                  onClick={() => onApplyPresetPack(themeId)}
                >
                  {isVideo && theme.backdropUrl ? (
                    <video
                      src={theme.backdropUrl}
                      poster={theme.previewUrl}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                      onMouseLeave={(e) => {
                        e.currentTarget.pause();
                        e.currentTarget.currentTime = 0;
                      }}
                    />
                  ) : theme.previewUrl || theme.backdropUrl ? (
                    <img
                      src={showLiveGif ? theme.backdropUrl : (theme.previewUrl || theme.backdropUrl)}
                      alt={title}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="minimal-cover-art"
                      style={{
                        backgroundColor: theme.colorMode === 'light' ? '#f5f5f5' : '#161618',
                        color: theme.colorMode === 'light' ? '#171717' : '#ededed',
                      }}
                    >
                      <div className="minimal-cover-bar" style={{ borderBottomColor: 'rgba(128,128,128,0.18)' }}>
                        <span className="minimal-dot" style={{ backgroundColor: accent }} />
                        <span className="mono" style={{ fontSize: 10, opacity: 0.65 }}>
                          {theme.kind === 'pack' ? 'IDE · App · CLI' : theme.fileName}
                        </span>
                      </div>
                      <div className="minimal-cover-lines">
                        <span style={{ width: '58%', backgroundColor: accent, opacity: 0.7 }} />
                        <span style={{ width: '82%', opacity: 0.22 }} />
                        <span style={{ width: '66%', opacity: 0.16 }} />
                      </div>
                    </div>
                  )}

                  <div className="gallery-media-badges">
                    {isVideo && (
                      <span className="media-badge video">
                        <Film size={11} strokeWidth={2} />
                        <span>{t.videoBadge}</span>
                      </span>
                    )}
                    {isGif && (
                      <span className="media-badge gif">
                        <span>{t.gifBadge}</span>
                      </span>
                    )}
                    {animBadge && <span className="media-badge">{animBadge}</span>}
                    {isActive && (
                      <span className="media-badge active">
                        <Check size={11} strokeWidth={2.5} />
                        <span>{t.activeTheme}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="visual-theme-body">
                  <div className="visual-theme-head">
                    <span className="accent-dot" style={{ backgroundColor: accent }} />
                    <div className="visual-theme-title" title={title}>
                      {title}
                    </div>
                  </div>
                  {desc && <p className="visual-theme-desc">{desc}</p>}

                  <div className="visual-theme-foot">
                    <button
                      type="button"
                      className={`btn ${isActive ? '' : 'btn-primary'}`}
                      style={{ flex: 1 }}
                      onClick={() => onApplyPresetPack(themeId)}
                    >
                      {isActive ? (
                        <>
                          <Check size={14} strokeWidth={2} />
                          <span>{t.activeTheme}</span>
                        </>
                      ) : (
                        <span>{t.useTheme}</span>
                      )}
                    </button>

                    {theme.kind === 'pack' && onExportPackZip && (
                      <button
                        type="button"
                        className="icon-btn"
                        title="Export shareable .zip pack"
                        onClick={() => onExportPackZip(themeId)}
                      >
                        <Download size={14} strokeWidth={1.5} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-btn"
                      title={t.openFolder}
                      onClick={() => window.themeAPI?.openThemeFile(themeId)}
                    >
                      <ExternalLink size={14} strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Delete"
                      onClick={() => onDeleteTheme(themeId)}
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
