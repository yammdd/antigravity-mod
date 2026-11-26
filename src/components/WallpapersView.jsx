import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Film, ImagePlus, Power, Terminal, Trash2, Upload } from 'lucide-react';
import SliderField from './ui/SliderField.jsx';
import ToggleRow from './ui/ToggleRow.jsx';

export default function WallpapersView({
  t,
  config,
  wallpapers,
  builtInWallpapers,
  showCli,
  onPatchConfig,
  onImportWallpapers,
  onDeleteWallpaper,
  onSyncCliWallpaper,
}) {
  const [filter, setFilter] = useState('all');
  const [hoveredId, setHoveredId] = useState('');
  const [showDetailedOpacity, setShowDetailedOpacity] = useState(false);

  const allItems = useMemo(() => {
    const userItems = (wallpapers || []).map((w) => ({
      ...w,
      category: 'user',
      builtin: false,
      isGif: Boolean(w.isGif || /\.gif$/i.test(w.filePath || '')),
      posterUrl: w.mediaUrl,
      cliBgFilePath: w.filePath,
    }));
    const builtIns = (builtInWallpapers || []).map((w) => ({ ...w, builtin: true }));
    return [...userItems, ...builtIns];
  }, [wallpapers, builtInWallpapers]);

  const filtered = useMemo(() => {
    if (filter === 'all') return allItems;
    if (filter === 'user') return allItems.filter((w) => !w.builtin);
    if (filter === 'gif') return allItems.filter((w) => w.isGif || w.category === 'gif');
    if (filter === 'video') return allItems.filter((w) => w.mediaType === 'video');
    return allItems.filter((w) => w.category === filter);
  }, [allItems, filter]);

  const activeItem = allItems.find((w) => w.id === config.wallpaperId) || null;
  const isVideoActive = Boolean(config.wallpaperEnabled && activeItem?.mediaType === 'video');
  const masterOpacity = Math.round(
    ((config.sidebarOpacity ?? 78) + (config.editorOpacity ?? 84) + (config.chatOpacity ?? 76)) / 3
  );

  const handleMasterOpacity = (v) => {
    onPatchConfig({
      sidebarOpacity: Math.max(0, Math.min(100, v - 2)),
      editorOpacity: Math.max(0, Math.min(100, v + 4)),
      chatOpacity: Math.max(0, Math.min(100, v - 4)),
    });
  };

  const tabs = [
    { id: 'all', label: `${t.wpTabAll} (${allItems.length})` },
    { id: 'anime', label: t.wpTabAnime },
    { id: 'gif', label: t.wpTabGif },
    { id: 'video', label: t.wpTabVideo },
    { id: 'landscape', label: t.wpTabLandscape },
    { id: 'user', label: `${t.wpTabUser} (${(wallpapers || []).length})` },
  ];

  return (
    <div className="stack-md">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.wpTitle}</h1>
          <p className="page-subtitle">{t.wpSub}</p>
        </div>

        <div className="header-actions">
          {config.wallpaperEnabled && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onPatchConfig({ wallpaperEnabled: false }, true)}
            >
              <Power size={15} strokeWidth={1.5} />
              <span>{t.wpTurnOff}</span>
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onImportWallpapers}>
            <ImagePlus size={16} strokeWidth={1.5} />
            <span>{t.wpPickBtn}</span>
          </button>
        </div>
      </div>

      {/* Big unmissable upload/drop banner */}
      <button type="button" className="upload-drop-banner" onClick={onImportWallpapers}>
        <div className="upload-icon-circle">
          <Upload size={18} strokeWidth={1.5} />
        </div>
        <div className="upload-banner-copy">
          <div className="upload-banner-title">{t.wpDropTitle}</div>
          <div className="upload-banner-desc">{t.wpDropDesc}</div>
        </div>
        <span className={`surface-pill ${config.wallpaperEnabled ? 'tone-ok' : 'tone-muted'}`}>
          {config.wallpaperEnabled ? t.wpStatusOn : t.wpStatusOff}
        </span>
      </button>

      {/* Category filter pills */}
      <div className="filter-pills">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`filter-pill ${filter === tab.id ? 'active' : ''}`}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Visual Wallpaper & Video Grid */}
      {filtered.length === 0 ? (
        <div className="card">
          <p className="card-desc">{t.wpEmptyUser}</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {filtered.map((item) => {
            const isSelected = config.wallpaperEnabled && config.wallpaperId === item.id;
            const title = item.name;
            const isVideo = item.mediaType === 'video';
            const isGif = Boolean(item.isGif);
            const showLiveGif = isGif && (hoveredId === item.id || isSelected);
            const cliTargetPath = item.cliBgFilePath || item.filePath;

            return (
              <article
                key={item.id}
                className={`gallery-card ${isSelected ? 'selected' : ''}`}
                onMouseEnter={() => isGif && setHoveredId(item.id)}
                onMouseLeave={() => isGif && setHoveredId('')}
                onClick={() => onPatchConfig({ wallpaperEnabled: true, wallpaperId: item.id }, true)}
              >
                <div className="gallery-media">
                  {isVideo ? (
                    <video
                      src={item.mediaUrl}
                      poster={item.posterUrl}
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
                  ) : (
                    <img
                      src={showLiveGif ? item.mediaUrl : (item.posterUrl || item.mediaUrl)}
                      alt={title}
                      loading="lazy"
                    />
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
                    {isSelected && (
                      <span className="media-badge active">
                        <Check size={11} strokeWidth={2.5} />
                        <span>{t.wpInUse}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="gallery-card-foot">
                  <div className="gallery-card-title" title={title}>
                    {title}
                  </div>
                  <div className="gallery-card-actions" onClick={(e) => e.stopPropagation()}>
                    {showCli && cliTargetPath && (
                      <button
                        type="button"
                        className="icon-btn"
                        title={t.wpUseForCli}
                        onClick={() => onSyncCliWallpaper(cliTargetPath)}
                      >
                        <Terminal size={14} strokeWidth={1.5} />
                      </button>
                    )}
                    {!item.builtin && (
                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Remove"
                        onClick={() => onDeleteWallpaper(item.id)}
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Clean Readability & Playback Sliders */}
      {config.wallpaperEnabled && (
        <div className="card">
          <div className="card-title">{t.wpAdjustTitle}</div>

          <div className="grid-2">
            <div className="stack-sm">
              <SliderField
                label={t.wpDimming}
                value={config.dimming ?? 32}
                min={0}
                max={90}
                unit="%"
                onChange={(v) => onPatchConfig({ dimming: v })}
              />
              <SliderField
                label={t.wpBlur}
                value={config.wallpaperBlur ?? 0}
                min={0}
                max={24}
                unit="px"
                onChange={(v) => onPatchConfig({ wallpaperBlur: v })}
              />
            </div>

            <div className="stack-sm">
              <SliderField
                label={t.wpMasterOpacity}
                value={masterOpacity}
                min={20}
                max={100}
                unit="%"
                onChange={handleMasterOpacity}
              />
              <button
                type="button"
                className="btn btn-ghost"
                style={{ alignSelf: 'flex-start', padding: '0 8px' }}
                onClick={() => setShowDetailedOpacity((v) => !v)}
              >
                {showDetailedOpacity ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                <span>{t.wpDetailedOpacity}</span>
              </button>
            </div>
          </div>

          {showDetailedOpacity && (
            <div className="grid-3" style={{ paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <SliderField
                label={t.wpSidebarOp}
                value={config.sidebarOpacity ?? 78}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => onPatchConfig({ sidebarOpacity: v })}
              />
              <SliderField
                label={t.wpEditorOp}
                value={config.editorOpacity ?? 84}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => onPatchConfig({ editorOpacity: v })}
              />
              <SliderField
                label={t.wpChatOp}
                value={config.chatOpacity ?? 76}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => onPatchConfig({ chatOpacity: v })}
              />
            </div>
          )}

          <div className="grid-2" style={{ paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            {isVideoActive ? (
              <>
                <SliderField
                  label={t.wpVideoSpeed}
                  value={config.videoSpeed ?? 1}
                  min={0.25}
                  max={2}
                  step={0.25}
                  unit="x"
                  onChange={(v) => onPatchConfig({ videoSpeed: v })}
                />
                <ToggleRow
                  label={t.wpPowerSave}
                  checked={config.smartGpuPowerSaving !== false}
                  onChange={(v) => onPatchConfig({ smartGpuPowerSaving: v }, true)}
                />
              </>
            ) : (
              <ToggleRow
                label={t.wpUnified}
                checked={config.unifiedFullWindow !== false}
                onChange={(v) => onPatchConfig({ unifiedFullWindow: v }, true)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
