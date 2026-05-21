// Toolbar: brand, search, zoom controls, action buttons

function Toolbar({
  searchQ, setSearchQ, searchResults, onSelectSearch,
  zoom, onZoomIn, onZoomOut, onZoomFit, onZoomTo,
  onAddPerson, onAddDept, onOpenHistory, onExport,
  totalPeople, totalDepts,
  orgName, onOrgNameChange, logoUrl, onLogoUpload,
  viewMode, onViewModeChange,
}) {
  const [searchFocus, setSearchFocus] = React.useState(false);
  const fileRef = React.useRef(null);
  const nameRef = React.useRef(null);
  // Zoom input
  const [editingZoom, setEditingZoom] = React.useState(false);
  const [zoomDraft, setZoomDraft]     = React.useState('');
  const commitZoom = () => {
    const n = parseFloat(zoomDraft);
    if (isFinite(n) && n > 0) {
      const clamped = Math.max(20, Math.min(250, n));
      onZoomTo && onZoomTo(clamped / 100);
    }
    setEditingZoom(false);
  };

  const handleLogoPick = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => onLogoUpload && onLogoUpload(ev.target.result);
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  return (
    <div className="toolbar">
      <div className="brand">
        <button
          type="button"
          className="brand-logo"
          onClick={() => fileRef.current && fileRef.current.click()}
          title="คลิกเพื่ออัปโหลดโลโก้"
        >
          {logoUrl ? (
            <img src={logoUrl} alt="logo" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" fill="#fff" />
              <circle cx="18" cy="18" r="3" fill="#fff" />
            </svg>
          )}
          <span className="brand-logo-overlay">เปลี่ยน</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleLogoPick}
        />
        <div style={{ minWidth: 0 }}>
          <input
            ref={nameRef}
            className="brand-name"
            type="text"
            value={orgName || ''}
            placeholder="ชื่อองค์การ"
            onChange={(e) => onOrgNameChange && onOrgNameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            title="คลิกเพื่อแก้ไขชื่อองค์การ"
          />
          <div className="brand-sub">Org Chart · {totalPeople} people · {totalDepts} depts</div>
        </div>
      </div>

      {/* View mode tabs */}
      <div className="view-tab-group">
        <button
          className={'view-tab' + (viewMode === 'people' ? ' active' : '')}
          onClick={() => onViewModeChange && onViewModeChange('people')}
          title="แผนผังบุคคล"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="11" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.4" />
            <path d="M1 13c.5-2.2 2.1-3.4 4-3.4s3.5 1.2 4 3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M11 9.6c1.8.3 3.1 1.5 3.7 3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Org Chart
        </button>
        <button
          className={'view-tab' + (viewMode === 'depts' ? ' active' : '')}
          onClick={() => onViewModeChange && onViewModeChange('depts')}
          title="ภาพรวมฝ่าย/แผนก"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="2" width="5.5" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
            <rect x="9" y="2" width="5.5" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
            <rect x="4.5" y="10" width="7" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
            <path d="M4.25 6v1.5H8M11.75 6v1.5H8M8 7.5V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          ฝ่าย/แผนก
        </button>
      </div>

      <div className="tb-search">
        <span className="ico">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" /><path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        </span>
        <input
          placeholder="ค้นหาคน ตำแหน่ง หรือฝ่าย..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          onFocus={() => setSearchFocus(true)}
          onBlur={() => setTimeout(() => setSearchFocus(false), 150)}
        />
        {searchFocus && searchQ && searchResults.length > 0 && (
          <div className="tb-search-results">
            {searchResults.map(p => (
              <div key={p.id} className="row" onClick={() => onSelectSearch(p.id)}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: colorFor(p.id), color: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-en)', fontSize: 11, fontWeight: 600, overflow: 'hidden', flexShrink: 0 }}>
                  {p.photo ? <img src={p.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(p.name)}
                </div>
                <div className="info">
                  <div className="name">{p.name}</div>
                  <div className="meta">{p.role} · LV{p.lv}</div>
                </div>
                <span className="lv-badge" style={{ '--lv-color': lvColor(p.lv) }}>LV{p.lv}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="tb-spacer" />

      <button className="tb-btn" onClick={onOpenHistory} title="ประวัติการเปลี่ยนแปลง">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 4v4l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /></svg>
        ประวัติ
      </button>

      <button className="tb-btn" onClick={onExport} title="พิมพ์ A4 + ฟอร์มเซ็นอนุมัติ">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M4 5V2h8v3M4 11H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1M4 9h8v5H4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          <circle cx="11.5" cy="7.5" r="0.5" fill="currentColor" />
        </svg>
        พิมพ์
      </button>

      <div className="tb-zoom">
        <button onClick={onZoomOut} title="Zoom out">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        {editingZoom ? (
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            value={zoomDraft}
            onChange={(e) => setZoomDraft(e.target.value.replace(/[^\d.]/g, ''))}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitZoom();
              else if (e.key === 'Escape') setEditingZoom(false);
              else if (e.key === 'ArrowUp')   { e.preventDefault(); setZoomDraft(String(Math.min(250, (parseFloat(zoomDraft)||0) + 10))); }
              else if (e.key === 'ArrowDown') { e.preventDefault(); setZoomDraft(String(Math.max( 20, (parseFloat(zoomDraft)||0) - 10))); }
            }}
            onBlur={commitZoom}
            title="พิมพ์ % แล้วกด Enter (20–250)"
            style={{
              width: 44, height: 24,
              padding: '0 4px',
              border: '1.5px solid var(--coral)',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'inherit',
              color: 'var(--ink)',
              background: '#fff',
              outline: 'none',
              textAlign: 'center',
            }}
          />
        ) : (
          <span
            className="val"
            title="คลิกเพื่อพิมพ์เปอร์เซ็นต์"
            style={{ cursor: 'text', userSelect: 'none' }}
            onClick={() => { setZoomDraft(String(Math.round((zoom || 1) * 100))); setEditingZoom(true); }}
          >
            {Math.round(zoom * 100)}%
          </span>
        )}
        <button onClick={onZoomIn} title="Zoom in">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        <button onClick={onZoomFit} title="Fit to screen" style={{ width: 32 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 5V3h2M11 3h2v2M13 11v2h-2M5 13H3v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        </button>
      </div>

      <button className="tb-btn" onClick={onAddDept} title="สร้างฝ่ายใหม่">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.3" /><rect x="2" y="9" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.3" /></svg>
        เพิ่มฝ่าย
      </button>

      <button className="tb-btn accent" onClick={() => onAddPerson(null)} title="เพิ่มคนใหม่">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.4" /><path d="M2.5 13c.5-2.2 2.2-3.4 3.5-3.4M11 7v4M9 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        เพิ่มคน
      </button>
    </div>
  );
}

window.Toolbar = Toolbar;
