// Department overview — root depts expanded into individual manager cards,
// non-root depts shown as dept cards below their direct manager.
console.log('%c[deptview.jsx] LOADED v19 — live zoom + no auto-jump', 'color:#ff6b47;font-weight:bold');
window.__deptviewVersion = 'v19';

const DEPT_W  = 220;
const DEPT_H  = 108;
const DEPT_HG = 44;
const DEPT_VG = 60;
// Sub-branch card dimensions (shared across layout, edges, render)
const BR_W    = 200;
const BR_H    = 84;
const BR_GAP  = 16;

// ── Manager person card ───────────────────────────────────────────────────────
function ManagerCard({ person, dept, deptCount, pos, selected, multiSelected, onPointerDown }) {
  const bar = dept?.color || lvColor(person.lv);
  const cls = ['node', 'mgr-ov-node', selected && 'selected', multiSelected && 'multi-selected'].filter(Boolean).join(' ');
  return (
    <div
      className={cls}
      style={{ transform: `translate(${pos.x}px,${pos.y}px)`, width: DEPT_W, '--bar-color': bar }}
      onPointerDown={onPointerDown}
    >
      <div className="node-strip" />
      <div className="node-body">
        <div className="node-avatar mgr-ov-avatar" style={{ background: colorFor(person.id) }}>
          {person.photo ? <img src={person.photo} alt="" /> : initials(person.name)}
        </div>
        <div className="node-info">
          <div className="node-role">{person.role}</div>
          <div className="node-name">{person.name}</div>
          {dept && <div className="node-dept">{dept.name}</div>}
        </div>
      </div>
      <div className="node-meta">
        <span className="lv-badge" style={{ '--lv-color': lvColor(person.lv) }}>LV{person.lv}</span>
        {deptCount > 0 && (
          <span className="count-pill">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="2"   width="5" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
              <rect x="9.5" y="2"   width="5" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
              <rect x="5"   y="10.5" width="6" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
              <path d="M4 5.5v2h8v-2M8 7.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            {deptCount} ฝ่าย
          </span>
        )}
      </div>
    </div>
  );
}

// ── Department card ───────────────────────────────────────────────────────────
function DeptOverviewCard({ dept, head, count, pos, selected, multiSelected, onPointerDown }) {
  const cls = ['node', 'dept-overview-node', selected && 'selected', multiSelected && 'multi-selected'].filter(Boolean).join(' ');
  const abbr = (dept.nameEn || dept.name).slice(0, 2).toUpperCase();
  const branches = dept.branches || [];
  const hasBranches = branches.length > 0;
  return (
    <div
      className={cls}
      style={{ transform: `translate(${pos.x}px,${pos.y}px)`, width: DEPT_W, '--bar-color': dept.color }}
      onPointerDown={onPointerDown}
    >
      <div className="node-strip" />
      <div className="node-body">
        <div
          className="dept-overview-icon"
          style={{ background: rgba(dept.color, 0.15), border: `1.5px solid ${rgba(dept.color, 0.38)}`, color: dept.color }}
        >
          {abbr}
        </div>
        <div className="node-info">
          <div
            className="node-role"
            style={{
              color: dept.color,
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: '-0.01em',
              lineHeight: 1.15,
              textShadow: `0 1px 0 ${rgba(dept.color, 0.08)}`,
            }}
          >
            {dept.name}
          </div>
          {dept.nameEn && dept.nameEn !== dept.name && (
            <div className="node-name" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)', marginTop: 1 }}>
              {dept.nameEn}
            </div>
          )}
          {head && <div className="node-dept">{head.name}</div>}
        </div>
      </div>
      <div className="node-meta">
        {hasBranches ? (
          <span className="count-pill" style={{ background: rgba(dept.color, 0.15), color: dept.color, border: `1px solid ${rgba(dept.color, 0.35)}` }}>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L2 5v6l6 3 6-3V5L8 2zM2 5l6 3 6-3M8 8v6" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            {branches.length} สาขา
          </span>
        ) : (
          <span className="count-pill">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              <circle cx="5" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="11" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M2 13c.5-1.6 1.7-2.4 3-2.4M14 13c-.5-1.6-1.7-2.4-3-2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            {count} คน
          </span>
        )}
        {head && <span className="tag">{head.role}</span>}
      </div>
    </div>
  );
}

// ── Manager sidebar ───────────────────────────────────────────────────────────
function ManagerViewSidebar({ person, dept, directDepts, coManagedDepts, onClose, onSwitchToPeople }) {
  const DeptRow = ({ d, isCoManaged }) => (
    <div className="report-line">
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: rgba(d.color, 0.15),
        border: `1.5px solid ${rgba(d.color, 0.38)}`,
        display: 'grid', placeItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{ color: d.color, fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-en)', letterSpacing: '-.02em' }}>
          {(d.nameEn || d.name).slice(0, 2).toUpperCase()}
        </span>
      </div>
      <div className="info">
        <div className="nm" style={{ color: d.color }}>{d.name}</div>
        {d.nameEn && d.nameEn !== d.name && <div className="rl">{d.nameEn}</div>}
      </div>
      {isCoManaged ? (
        <span className="tag" style={{ fontSize: 9.5, padding: '0 5px', background: rgba(d.color, 0.12), color: d.color, flexShrink: 0 }}>ร่วม</span>
      ) : (
        <div style={{ width: 9, height: 9, borderRadius: 3, background: d.color, flexShrink: 0 }} />
      )}
    </div>
  );

  return (
    <div
      className="sidebar"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="sb-header">
        <button className="sb-close" onClick={onClose} title="ปิด">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <div className="sb-avatar-row">
          <div className="sb-avatar" style={{ background: colorFor(person.id) }}>
            {person.photo ? <img src={person.photo} alt="" /> : initials(person.name)}
          </div>
          <div className="sb-name-block">
            <div className="sb-name">{person.name}</div>
            <div className="sb-role">{person.role}</div>
          </div>
        </div>
        <div className="sb-chips">
          <span className="lv-badge" style={{ '--lv-color': lvColor(person.lv) }}>LV{person.lv}</span>
          {dept && (
            <span className="tag" style={{ background: rgba(dept.color, 0.15), color: dept.color }}>
              {dept.name}
            </span>
          )}
        </div>
      </div>

      <div className="sb-body">
        <div className="sb-sect">
          <h4>ฝ่าย/แผนกที่ดูแล ({directDepts.length + (coManagedDepts || []).length})</h4>
          {directDepts.length === 0 && (coManagedDepts || []).length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 12, fontStyle: 'italic', padding: '8px 0' }}>
              ไม่มีฝ่ายที่รายงานตรง
            </div>
          ) : (
            <div className="team-list">
              {directDepts.map(d => <DeptRow key={d.id} d={d} isCoManaged={false} />)}
              {(coManagedDepts || []).map(d => <DeptRow key={'co-' + d.id} d={d} isCoManaged={true} />)}
            </div>
          )}
        </div>

        <div className="sb-sect">
          <button
            className="btn-sm primary"
            style={{ justifyContent: 'center', width: '100%' }}
            onClick={onSwitchToPeople}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <circle cx="5" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="11" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M2 13c.5-1.6 1.7-2.4 3-2.4M14 13c-.5-1.6-1.7-2.4-3-2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            ดูใน Org Chart
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dept detail sidebar ───────────────────────────────────────────────────────
function DeptViewSidebar({ dept, head, members, coManagers, availableManagers, primaryManagerId, allDepartments, managingDepts, onAddManagingDept, onRemoveManagingDept, onAddBranch, onEditBranch, onDeleteBranch, onPatchDept, onClose, onSwitchToPeople, onEditDept, onDeleteDept, onAddCoManager, onRemoveCoManager }) {
  const [showPicker, setShowPicker]         = React.useState(false);
  const [showDeptPicker, setShowDeptPicker] = React.useState(false);
  const [newBranchName, setNewBranchName]   = React.useState('');
  const [showBranchInput, setShowBranchInput] = React.useState(false);
  const [editingBranchId, setEditingBranchId] = React.useState(null);
  const [editBranchName, setEditBranchName] = React.useState('');
  // Inline editing of dept name / nameEn
  const [editingDeptName, setEditingDeptName] = React.useState(false);
  const [deptNameDraft, setDeptNameDraft]     = React.useState('');
  const [editingDeptNameEn, setEditingDeptNameEn] = React.useState(false);
  const [deptNameEnDraft, setDeptNameEnDraft]     = React.useState('');
  // Which branch's color picker is open
  const [colorPickerBranchId, setColorPickerBranchId] = React.useState(null);
  // Dept color picker
  const [showDeptColorPicker, setShowDeptColorPicker] = React.useState(false);
  const branches = dept.branches || [];

  // Dept color palette
  const DEPT_COLORS = [
    '#E53935', // red
    '#FF6B47', // coral
    '#FF8A3D', // orange
    '#FFC857', // butter
    '#4FD1A5', // mint
    '#5DADE2', // blue
    '#7CC4F0', // sky
    '#B89BE5', // purple
    '#FFB5BA', // rose
    '#4ECDC4', // cyan
    '#95A5A6', // gray
    '#1F2937', // slate
  ];

  // Branch color palette
  const BRANCH_COLORS = [
    '#E53935', // red
    '#4FD1A5', // mint
    '#FF6B47', // coral
    '#FFC857', // butter
    '#5DADE2', // blue
    '#B591E8', // purple
    '#FF94B5', // pink
    '#4ECDC4', // cyan
    '#FF8A65', // orange
    '#A8E6CF', // light green
    '#95A5A6', // gray
  ];

  const commitDeptName = () => {
    const v = deptNameDraft.trim();
    if (v && v !== dept.name) onPatchDept && onPatchDept({ name: v });
    setEditingDeptName(false);
  };
  const commitDeptNameEn = () => {
    const v = deptNameEnDraft.trim();
    if (v !== (dept.nameEn || '')) onPatchDept && onPatchDept({ nameEn: v });
    setEditingDeptNameEn(false);
  };
  const deleteBtnRef = React.useRef(null);

  // Attach a NATIVE DOM listener (bypasses React synthetic events entirely)
  React.useEffect(() => {
    const el = deleteBtnRef.current;
    if (!el) {
      console.warn('[delete v5] no ref element');
      return;
    }
    const handler = (ev) => {
      console.log('%c[delete v5] NATIVE CLICK fired', 'background:#ff6b47;color:#fff;padding:2px 6px',
        { deptId: dept.id, deptName: dept.name, members: members.length, handler: typeof onDeleteDept });
      window.__lastDeleteClick = Date.now();
      ev.preventDefault();
      ev.stopPropagation();
      if (typeof onDeleteDept !== 'function') {
        console.error('[delete v5] onDeleteDept is not a function:', onDeleteDept);
        return;
      }
      try {
        onDeleteDept(dept.id, null);
        console.log('[delete v5] onDeleteDept called OK');
      } catch (err) {
        console.error('[delete v5] threw:', err);
      }
      onClose();
    };
    el.addEventListener('click', handler);
    el.addEventListener('mousedown', () => console.log('[delete v5] mousedown'));
    console.log('[delete v5] native listener attached for dept:', dept.id);
    return () => {
      el.removeEventListener('click', handler);
    };
  }, [dept.id, onDeleteDept, onClose, members.length]);

  const sorted  = [...members].sort((a, b) => b.lv - a.lv);
  const preview = sorted.slice(0, 8);
  const more    = members.length - preview.length;

  // Managers not yet added as co-manager and not the primary manager
  const pickable = (availableManagers || []).filter(m =>
    m.id !== primaryManagerId &&
    !(coManagers || []).some(c => c.id === m.id)
  );

  return (
    <div
      className="sidebar"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="sb-header">
        <button className="sb-close" onClick={onClose} title="ปิด">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <div className="sb-avatar-row">
          <button
            type="button"
            className="sb-avatar"
            title="เปลี่ยนสีฝ่าย"
            onClick={() => setShowDeptColorPicker(v => !v)}
            style={{
              background: dept.color, color: '#fff',
              fontSize: 22, fontFamily: 'var(--font-en)', fontWeight: 800, letterSpacing: '-.02em',
              padding: 0, border: 0, cursor: 'pointer', position: 'relative',
              boxShadow: showDeptColorPicker
                ? `0 0 0 3px ${rgba(dept.color, 0.35)}, 0 4px 12px ${rgba(dept.color, 0.4)}`
                : `0 4px 12px ${rgba(dept.color, 0.3)}`,
              transition: 'box-shadow .15s',
            }}
          >
            {(dept.nameEn || dept.name).slice(0, 2).toUpperCase()}
            {/* Small palette indicator at bottom-right corner */}
            <span style={{
              position: 'absolute', right: -3, bottom: -3,
              width: 18, height: 18, borderRadius: '50%',
              background: '#fff', border: `1.5px solid ${dept.color}`,
              display: 'grid', placeItems: 'center',
              pointerEvents: 'none',
            }}>
              <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
                <circle cx="4" cy="6"  r="1.5" fill={dept.color} />
                <circle cx="8" cy="4"  r="1.5" fill={dept.color} opacity=".75" />
                <circle cx="12" cy="6" r="1.5" fill={dept.color} opacity=".5" />
                <circle cx="6" cy="11" r="1.5" fill={dept.color} opacity=".4" />
                <circle cx="11" cy="11" r="1.5" fill={dept.color} opacity=".25" />
              </svg>
            </span>
          </button>
          <div className="sb-name-block">
            {editingDeptName ? (
              <input
                autoFocus
                type="text"
                value={deptNameDraft}
                onChange={(e) => setDeptNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitDeptName();
                  else if (e.key === 'Escape') setEditingDeptName(false);
                }}
                onBlur={commitDeptName}
                style={{
                  fontSize: 17, fontWeight: 800, fontFamily: 'inherit',
                  padding: '4px 8px', border: `1.5px solid ${dept.color}`,
                  borderRadius: 6, outline: 'none', background: '#fff',
                  width: '100%', boxSizing: 'border-box',
                }}
              />
            ) : (
              <div
                className="sb-name"
                title="คลิกเพื่อแก้ไขชื่อ"
                style={{ cursor: 'pointer' }}
                onClick={() => { setDeptNameDraft(dept.name); setEditingDeptName(true); }}
              >
                {dept.name}
              </div>
            )}
            {editingDeptNameEn ? (
              <input
                autoFocus
                type="text"
                placeholder="ชื่อภาษาอังกฤษ (ถ้ามี)"
                value={deptNameEnDraft}
                onChange={(e) => setDeptNameEnDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitDeptNameEn();
                  else if (e.key === 'Escape') setEditingDeptNameEn(false);
                }}
                onBlur={commitDeptNameEn}
                style={{
                  fontSize: 12, fontFamily: 'inherit',
                  padding: '3px 6px', border: `1.5px solid ${dept.color}`,
                  borderRadius: 5, outline: 'none', background: '#fff',
                  width: '100%', boxSizing: 'border-box', marginTop: 4,
                }}
              />
            ) : (
              <div
                className="sb-role"
                title="คลิกเพื่อแก้ไขชื่อภาษาอังกฤษ"
                style={{ cursor: 'pointer', minHeight: 14 }}
                onClick={() => { setDeptNameEnDraft(dept.nameEn || ''); setEditingDeptNameEn(true); }}
              >
                {dept.nameEn && dept.nameEn !== dept.name ? dept.nameEn : <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>+ เพิ่มชื่อภาษาอังกฤษ</span>}
              </div>
            )}
          </div>
        </div>
        <div className="sb-chips">
          {branches.length > 0 ? (
            <span className="count-pill" style={{ background: rgba(dept.color, 0.15), color: dept.color, border: `1px solid ${rgba(dept.color, 0.35)}` }}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L2 5v6l6 3 6-3V5L8 2zM2 5l6 3 6-3M8 8v6" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              {branches.length} สาขา
            </span>
          ) : (
            <span className="count-pill">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <circle cx="5" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="11" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.4" />
                <path d="M2 13c.5-1.6 1.7-2.4 3-2.4M14 13c-.5-1.6-1.7-2.4-3-2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {members.length} คน
            </span>
          )}
          <span className="tag" style={{ background: rgba(dept.color, 0.15), color: dept.color }}>
            {dept.nameEn || dept.name}
          </span>
        </div>

        {/* Dept color picker popover */}
        {showDeptColorPicker && (
          <div style={{
            marginTop: 14,
            padding: '10px 12px',
            background: 'var(--surface-2)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            display: 'flex', flexWrap: 'wrap', gap: 7,
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginRight: 4 }}>
              สีฝ่าย
            </span>
            {DEPT_COLORS.map(c => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => {
                  onPatchDept && onPatchDept({ color: c });
                  setShowDeptColorPicker(false);
                }}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: c,
                  border: dept.color === c ? '2.5px solid var(--ink-1, #0F172A)' : '2px solid #fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  cursor: 'pointer', padding: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="sb-body">
        {/* Sub-branches section */}
        <div className="sb-sect">
          <h4>สาขาย่อย · Sub-branches ({branches.length})</h4>
          <div className="team-list">
            {branches.map(b => {
              const bc = b.color || dept.color;
              const isPickerOpen = colorPickerBranchId === b.id;
              return (
              <div key={b.id} style={{ position: 'relative' }}>
              <div className="report-line">
                <button
                  type="button"
                  title="เปลี่ยนสีการ์ด"
                  onClick={() => setColorPickerBranchId(isPickerOpen ? null : b.id)}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: rgba(bc, 0.15),
                    border: `1.5px solid ${rgba(bc, 0.5)}`,
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                    cursor: 'pointer', padding: 0, position: 'relative',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: bc }}>
                    <path d="M8 2L2 5v6l6 3 6-3V5L8 2zM2 5l6 3 6-3M8 8v6" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                  {/* Small dot indicator at corner */}
                  <span style={{
                    position: 'absolute', right: -2, bottom: -2,
                    width: 10, height: 10, borderRadius: '50%',
                    background: bc, border: '1.5px solid #fff',
                    pointerEvents: 'none',
                  }} />
                </button>
                {editingBranchId === b.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={editBranchName}
                    onChange={(e) => setEditBranchName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && editBranchName.trim()) {
                        onEditBranch && onEditBranch(b.id, { name: editBranchName.trim() });
                        setEditingBranchId(null);
                      } else if (e.key === 'Escape') {
                        setEditingBranchId(null);
                      }
                    }}
                    onBlur={() => {
                      if (editBranchName.trim()) {
                        onEditBranch && onEditBranch(b.id, { name: editBranchName.trim() });
                      }
                      setEditingBranchId(null);
                    }}
                    style={{ flex: 1, padding: '6px 8px', border: `1.5px solid ${dept.color}`, borderRadius: 6, fontSize: 12.5, fontFamily: 'inherit' }}
                  />
                ) : (
                  <div className="info" style={{ cursor: 'pointer' }} onClick={() => { setEditingBranchId(b.id); setEditBranchName(b.name); }}>
                    <div className="nm">{b.name}</div>
                    {b.nameEn && <div className="rl">{b.nameEn}</div>}
                  </div>
                )}
                <button
                  className="btn-icon-sm"
                  title="ลบสาขา"
                  onClick={() => onDeleteBranch && onDeleteBranch(b.id)}
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                    <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Color picker popover */}
              {isPickerOpen && (
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 6,
                  padding: '8px 10px', marginTop: 4,
                  background: 'var(--surface-2, #fafafa)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, marginRight: 2 }}>สี:</span>
                  {BRANCH_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      onClick={() => {
                        onEditBranch && onEditBranch(b.id, { color: c });
                        setColorPickerBranchId(null);
                      }}
                      style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: c,
                        border: bc === c ? '2.5px solid var(--ink-1)' : '2px solid #fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        cursor: 'pointer', padding: 0,
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    title="ใช้สีของฝ่าย"
                    onClick={() => {
                      onEditBranch && onEditBranch(b.id, { color: null });
                      setColorPickerBranchId(null);
                    }}
                    style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: '#fff',
                      border: !b.color ? `2.5px solid ${dept.color}` : '2px dashed var(--ink-3)',
                      cursor: 'pointer', padding: 0,
                      display: 'grid', placeItems: 'center',
                      fontSize: 9, color: 'var(--ink-3)', fontWeight: 700,
                    }}
                  >↺</button>
                </div>
              )}
              </div>
              );
            })}

            {showBranchInput ? (
              <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                <input
                  autoFocus
                  type="text"
                  placeholder="ชื่อสาขา (เช่น สาขาสีลม)"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newBranchName.trim()) {
                      onAddBranch && onAddBranch(newBranchName.trim(), '');
                      setNewBranchName('');
                    } else if (e.key === 'Escape') {
                      setShowBranchInput(false);
                      setNewBranchName('');
                    }
                  }}
                  style={{ flex: 1, padding: '7px 10px', border: `1.5px solid ${dept.color}`, borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit' }}
                />
                <button
                  className="btn-sm primary"
                  style={{ padding: '0 12px' }}
                  onClick={() => {
                    if (newBranchName.trim()) {
                      onAddBranch && onAddBranch(newBranchName.trim(), '');
                      setNewBranchName('');
                    }
                  }}
                >เพิ่ม</button>
                <button
                  className="btn-sm"
                  style={{ padding: '0 10px' }}
                  onClick={() => { setShowBranchInput(false); setNewBranchName(''); }}
                >×</button>
              </div>
            ) : (
              <button
                className="btn-sm"
                style={{ justifyContent: 'center', borderStyle: 'dashed', color: 'var(--ink-3)', marginTop: 2 }}
                onClick={() => setShowBranchInput(true)}
              >
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                เพิ่มสาขาย่อย
              </button>
            )}
          </div>
        </div>

        {head && (
          <div className="sb-sect">
            <h4>หัวหน้าฝ่าย · Head</h4>
            <div className="report-line">
              <div className="avi" style={{ background: colorFor(head.id) }}>
                {head.photo ? <img src={head.photo} alt="" /> : initials(head.name)}
              </div>
              <div className="info">
                <div className="nm">{head.name}</div>
                <div className="rl">{head.role} · LV{head.lv}</div>
              </div>
              <span className="lv-badge" style={{ '--lv-color': lvColor(head.lv) }}>LV{head.lv}</span>
            </div>
          </div>
        )}

        <div className="sb-sect">
          <h4>สมาชิก · Members ({members.length})</h4>
          <div className="team-list">
            {preview.map(p => (
              <div key={p.id} className="report-line">
                <div className="avi" style={{ background: colorFor(p.id) }}>
                  {p.photo ? <img src={p.photo} alt="" /> : initials(p.name)}
                </div>
                <div className="info">
                  <div className="nm">{p.name}</div>
                  <div className="rl">{p.role} · LV{p.lv}</div>
                </div>
              </div>
            ))}
            {more > 0 && (
              <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                + {more} คนอื่น
              </div>
            )}
          </div>
        </div>

        {/* Co-managers section */}
        <div className="sb-sect">
          <h4>ผู้ดูแลร่วม · Co-managers</h4>
          <div className="team-list">
            {(coManagers || []).map(mgr => (
              <div key={mgr.id} className="report-line">
                <div className="avi" style={{ background: colorFor(mgr.id) }}>
                  {mgr.photo ? <img src={mgr.photo} alt="" /> : initials(mgr.name)}
                </div>
                <div className="info">
                  <div className="nm">{mgr.name}</div>
                  <div className="rl">{mgr.role}</div>
                </div>
                <button
                  className="btn-icon-sm"
                  title="ลบผู้ดูแลร่วม"
                  onClick={() => onRemoveCoManager && onRemoveCoManager(mgr.id)}
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                    <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}

            {showPicker ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
                {pickable.length === 0 ? (
                  <div style={{ color: 'var(--ink-3)', fontSize: 12, fontStyle: 'italic', padding: '4px 8px' }}>
                    ไม่มีผู้จัดการที่เพิ่มได้
                  </div>
                ) : pickable.map(mgr => (
                  <div
                    key={mgr.id}
                    className="report-line"
                    style={{ cursor: 'pointer' }}
                    onClick={() => { onAddCoManager && onAddCoManager(mgr.id); setShowPicker(false); }}
                  >
                    <div className="avi" style={{ background: colorFor(mgr.id) }}>
                      {mgr.photo ? <img src={mgr.photo} alt="" /> : initials(mgr.name)}
                    </div>
                    <div className="info">
                      <div className="nm">{mgr.name}</div>
                      <div className="rl">{mgr.role}</div>
                    </div>
                  </div>
                ))}
                <button className="btn-sm" style={{ marginTop: 2 }} onClick={() => setShowPicker(false)}>
                  ยกเลิก
                </button>
              </div>
            ) : (
              <button
                className="btn-sm"
                style={{ justifyContent: 'center', borderStyle: 'dashed', color: 'var(--ink-3)', marginTop: 2 }}
                onClick={() => setShowPicker(true)}
              >
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                เพิ่มผู้ดูแลร่วม
              </button>
            )}
          </div>
        </div>

        {/* Managed-by-depts section — dashed dept→dept oversight links */}
        <div className="sb-sect">
          <h4>ฝ่ายที่ดูแลร่วม · Managed by depts</h4>
          <div className="team-list">
            {(managingDepts || []).map(d => (
              <div key={d.id} className="report-line">
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: rgba(d.color, 0.15),
                  border: `1.5px solid ${rgba(d.color, 0.38)}`,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <span style={{ color: d.color, fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-en)', letterSpacing: '-.02em' }}>
                    {(d.nameEn || d.name).slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="info">
                  <div className="nm" style={{ color: d.color }}>{d.name}</div>
                  {d.nameEn && d.nameEn !== d.name && <div className="rl">{d.nameEn}</div>}
                </div>
                <button
                  className="btn-icon-sm"
                  title="ลบสายดูแล"
                  onClick={() => onRemoveManagingDept && onRemoveManagingDept(d.id)}
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                    <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}

            {(() => {
              const pickableDepts = (allDepartments || []).filter(d =>
                d.id !== dept.id && !(managingDepts || []).some(m => m.id === d.id)
              );
              if (showDeptPicker) {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
                    {pickableDepts.length === 0 ? (
                      <div style={{ color: 'var(--ink-3)', fontSize: 12, fontStyle: 'italic', padding: '4px 8px' }}>
                        ไม่มีฝ่ายที่เพิ่มได้
                      </div>
                    ) : pickableDepts.map(d => (
                      <div
                        key={d.id}
                        className="report-line"
                        style={{ cursor: 'pointer' }}
                        onClick={() => { onAddManagingDept && onAddManagingDept(d.id); setShowDeptPicker(false); }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: rgba(d.color, 0.15),
                          border: `1.5px solid ${rgba(d.color, 0.38)}`,
                          display: 'grid', placeItems: 'center', flexShrink: 0,
                        }}>
                          <span style={{ color: d.color, fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-en)', letterSpacing: '-.02em' }}>
                            {(d.nameEn || d.name).slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="info">
                          <div className="nm" style={{ color: d.color }}>{d.name}</div>
                          {d.nameEn && d.nameEn !== d.name && <div className="rl">{d.nameEn}</div>}
                        </div>
                      </div>
                    ))}
                    <button className="btn-sm" style={{ marginTop: 2 }} onClick={() => setShowDeptPicker(false)}>
                      ยกเลิก
                    </button>
                  </div>
                );
              }
              return (
                <button
                  className="btn-sm"
                  style={{ justifyContent: 'center', borderStyle: 'dashed', color: 'var(--ink-3)', marginTop: 2 }}
                  onClick={() => setShowDeptPicker(true)}
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  เพิ่มฝ่ายที่ดูแล (เส้นปะ)
                </button>
              );
            })()}
          </div>
        </div>

        <div className="sb-sect">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="btn-sm primary" style={{ justifyContent: 'center' }} onClick={onSwitchToPeople}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <circle cx="5" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="11" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.4" />
                <path d="M2 13c.5-1.6 1.7-2.4 3-2.4M14 13c-.5-1.6-1.7-2.4-3-2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              ดู Org Chart ของฝ่ายนี้
            </button>
            <button className="btn-sm" style={{ justifyContent: 'center' }} onClick={() => onEditDept && onEditDept(dept.id)}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M3 11l8-8 2 2-8 8H3v-2z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              แก้ไขชื่อ / สี
            </button>
            <div
              ref={deleteBtnRef}
              role="button"
              tabIndex={0}
              style={{
                background: '#e53935',
                color: '#fff',
                padding: '12px 14px',
                cursor: 'pointer',
                pointerEvents: 'auto',
                userSelect: 'none',
                fontSize: 13.5,
                fontWeight: 800,
                textAlign: 'center',
                borderRadius: 8,
                border: '3px solid #fbc02d',
                boxShadow: '0 4px 12px rgba(229,57,53,0.35)',
                letterSpacing: '0.02em',
              }}
            >
              🗑 ลบฝ่ายนี้ v5 (native)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Department overview canvas ─────────────────────────────────────────────────
function DeptCanvas({ departments, people, byId, coOversight, onAddCoOversight, onRemoveCoOversight, deptLinks, onAddDeptLink, onRemoveDeptLink, onAddBranch, onEditBranch, onDeleteBranch, onPatchDept, onEditDept, onDeleteDept, onSwitchToPeople, onTransformChange }) {
  const canvasRef = React.useRef(null);
  const [transform, setTransform]   = React.useState(() => {
    try {
      const raw = localStorage.getItem('orgDeptTransform');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { x: 60, y: 60, k: 1 };
  });
  const hasSavedTransform = React.useRef(
    (() => { try { return !!localStorage.getItem('orgDeptTransform'); } catch (e) { return false; } })()
  );
  const [panning, setPanning]        = React.useState(false);

  // Persist pan/zoom transform (debounced so we don't spam localStorage during drag)
  React.useEffect(() => {
    const id = setTimeout(() => {
      try { localStorage.setItem('orgDeptTransform', JSON.stringify(transform)); } catch (e) {}
    }, 200);
    return () => clearTimeout(id);
  }, [transform]);
  // selected: null | { type: 'mgr', id } | { type: 'dept', id }
  const [selected, setSelected]      = React.useState(null);

  // ── Hierarchy computation ───────────────────────────────────────────────────
  const data = React.useMemo(() => {
    const membersByDept = {};
    const entryByDept   = {}; // highest-LV entry point per dept
    const deptParentDept = {}; // deptId → parentDeptId

    for (const p of people) {
      if (!p.deptId) continue;
      (membersByDept[p.deptId] = membersByDept[p.deptId] || []).push(p);
      const par     = p.parentId ? byId[p.parentId] : null;
      const isEntry = !par || par.deptId !== p.deptId;
      if (isEntry) {
        if (!entryByDept[p.deptId] || p.lv > entryByDept[p.deptId].lv) entryByDept[p.deptId] = p;
        const pDept = par?.deptId;
        if (pDept && pDept !== p.deptId && !deptParentDept[p.deptId]) deptParentDept[p.deptId] = pDept;
      }
    }

    const deptIds     = departments.map(d => d.id);
    const rootDeptIds = deptIds.filter(id => !deptParentDept[id]);

    // ── Expand root depts into individual manager persons ───────────────────
    const managerPool  = new Set(); // person IDs in root depts
    const managerDeptId = {};        // personId → deptId (which root dept)
    for (const rootId of rootDeptIds) {
      for (const p of (membersByDept[rootId] || [])) {
        managerPool.add(p.id);
        managerDeptId[p.id] = rootId;
      }
    }

    // ── Map each non-root dept to its direct manager person ─────────────────
    const deptManager = {}; // deptId → personId
    for (const deptId of deptIds) {
      if (rootDeptIds.includes(deptId)) continue;
      const head = entryByDept[deptId];
      if (!head || !head.parentId) continue;
      const mgr = byId[head.parentId];
      if (mgr && managerPool.has(mgr.id)) deptManager[deptId] = mgr.id;
    }

    // ── Manager hierarchy within root depts ─────────────────────────────────
    const mgrParent = {}; // personId → parentPersonId (within manager pool)
    for (const mgId of managerPool) {
      const mg = byId[mgId];
      if (!mg || !mg.parentId) continue;
      const par = byId[mg.parentId];
      if (par && managerPool.has(par.id)) mgrParent[mgId] = par.id;
    }

    // ── Group depts by manager ───────────────────────────────────────────────
    const mgrDepts = {}; // personId → [deptId]
    for (const [deptId, mgId] of Object.entries(deptManager)) {
      (mgrDepts[mgId] = mgrDepts[mgId] || []).push(deptId);
    }

    // ── Build unified node tree ('mgr:id' | 'dept:id') ──────────────────────
    const childrenOf = {};
    const mgrIds     = [...managerPool];

    // Manager → sub-manager
    for (const mgId of mgrIds) {
      const kids = mgrIds.filter(id => mgrParent[id] === mgId);
      childrenOf['mgr:' + mgId] = [
        ...kids.map(k => 'mgr:' + k),
        ...(mgrDepts[mgId] || []).map(d => 'dept:' + d),
      ];
    }

    // Root nodes: managers with no parent manager
    const rootNodes = [
      ...mgrIds.filter(id => !mgrParent[id]).map(id => 'mgr:' + id),
    ];
    // Orphan depts: not under any manager AND not a root dept that has members
    // (root depts with members are already expanded into manager cards above)
    for (const deptId of deptIds) {
      const hasMembers = (membersByDept[deptId] || []).length > 0;
      if (rootDeptIds.includes(deptId) && hasMembers) continue; // already expanded
      if (deptManager[deptId]) continue; // already placed under a manager
      rootNodes.push('dept:' + deptId);
      childrenOf['dept:' + deptId] = [];
    }

    // ── Top-down tree layout ─────────────────────────────────────────────────
    const subW = {};
    const computeW = (id) => {
      const kids = childrenOf[id] || [];
      if (!kids.length) { subW[id] = DEPT_W; return DEPT_W; }
      let tot = -DEPT_HG;
      for (const c of kids) tot += computeW(c) + DEPT_HG;
      subW[id] = Math.max(DEPT_W, tot);
      return subW[id];
    };
    for (const r of rootNodes) computeW(r);

    const layout = {}; // nodeId → {x, y}
    const place = (id, x, depth) => {
      const w = subW[id] || DEPT_W;
      layout[id] = { x: x + (w - DEPT_W) / 2, y: depth * (DEPT_H + DEPT_VG) };
      const kids = childrenOf[id] || [];
      let cx = x;
      for (const c of kids) { place(c, cx, depth + 1); cx += (subW[c] || DEPT_W) + DEPT_HG; }
    };
    let rx = 0;
    for (const r of rootNodes) { place(r, rx, 0); rx += (subW[r] || DEPT_W) + DEPT_HG * 2; }

    // Build parent map for edges
    const parentOf = {};
    for (const [nodeId, kids] of Object.entries(childrenOf)) {
      for (const k of kids) parentOf[k] = nodeId;
    }

    // Co-oversight lookup: deptId → [personId]
    const coOversightByDept = {};
    for (const { deptId, personId } of (coOversight || [])) {
      (coOversightByDept[deptId] = coOversightByDept[deptId] || []).push(personId);
    }

    // Default sub-branch positions (below parent dept, spread horizontally)
    const branchToDept = {};
    for (const dept of departments) {
      const parentPos = layout['dept:' + dept.id];
      const brs = dept.branches || [];
      if (!parentPos || brs.length === 0) continue;
      const totalW = brs.length * BR_W + (brs.length - 1) * BR_GAP;
      const startX = parentPos.x + DEPT_W / 2 - totalW / 2;
      const y = parentPos.y + DEPT_H + 60;
      brs.forEach((b, i) => {
        layout['branch:' + b.id] = { x: startX + i * (BR_W + BR_GAP), y };
        branchToDept[b.id] = dept.id;
      });
    }

    return { layout, parentOf, childrenOf, managerPool, mgrDepts, managerDeptId, deptManager, membersByDept, entryByDept, coOversightByDept, branchToDept };
  }, [departments, people, byId, coOversight]);

  // ── Extra state ─────────────────────────────────────────────────────────────
  const [multiSel, setMultiSel]         = React.useState(new Set()); // lasso-selected node IDs
  const [customPos, setCustomPos]       = React.useState(() => {     // nodeId → {x,y} overrides (persisted)
    try {
      const raw = localStorage.getItem('orgDeptCustomPos');
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  });
  const [lasso, setLasso]               = React.useState(null);       // rubber-band rect in canvas coords
  const [hudDelConfirm, setHudDelConfirm] = React.useState(false);    // HUD bulk-delete confirm step
  const [hudDelError, setHudDelError]   = React.useState('');         // HUD inline error message
  const [editingBranchId, setEditingBranchId] = React.useState(null); // sub-branch inline edit
  const [editBranchText, setEditBranchText]   = React.useState('');
  const [snapGuides, setSnapGuides]           = React.useState([]);   // alignment guides while dragging

  // Persist dept-view custom positions
  React.useEffect(() => {
    try { localStorage.setItem('orgDeptCustomPos', JSON.stringify(customPos)); } catch (e) {}
  }, [customPos]);

  // Effective positions = computed layout + manual drag overrides
  const effectivePos = React.useMemo(() => {
    const pos = {};
    for (const [id, p] of Object.entries(data.layout)) {
      pos[id] = customPos[id] || p;
    }
    return pos;
  }, [data.layout, customPos]);

  // Reset HUD confirm state whenever selection changes
  React.useEffect(() => {
    setHudDelConfirm(false);
    setHudDelError('');
  }, [multiSel]);

  // Register with toolbar zoom + notify parent on every transform change
  window.__chartTransform = transform;
  React.useEffect(() => { window.__chartSetTransform = setTransform; }, []);
  React.useEffect(() => {
    onTransformChange && onTransformChange(transform.k);
  }, [transform]);

  // Auto-fit ONLY on first mount (never re-fit on data changes — user's view is sticky)
  const didInitialFit = React.useRef(false);
  React.useEffect(() => {
    if (didInitialFit.current) return;
    if (hasSavedTransform.current) {
      // User had a saved pan/zoom — don't override
      didInitialFit.current = true;
      return;
    }
    const positions = Object.values(data.layout);
    if (!positions.length || !canvasRef.current) return; // wait until layout is ready
    const el = canvasRef.current;
    const cw = el.clientWidth, ch = el.clientHeight;
    const xs = positions.map(p => p.x), ys = positions.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs) + DEPT_W;
    const minY = Math.min(...ys), maxY = Math.max(...ys) + DEPT_H;
    const w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY);
    const pad = 64;
    const k = Math.max(0.35, Math.min(1.1, Math.min((cw - pad * 2) / w, (ch - pad * 2) / h)));
    setTransform({
      k,
      x: pad - minX * k + Math.max(0, ((cw - pad * 2) - w * k) / 2),
      y: pad - minY * k + Math.max(0, ((ch - pad * 2) - h * k) / 2),
    });
    didInitialFit.current = true;
  }, [data.layout]);

  // Scroll → zoom (but let sidebar handle its own scroll)
  const onWheel = React.useCallback((e) => {
    // If the wheel happens inside the sidebar, let the browser scroll it
    if (e.target.closest && e.target.closest('.sidebar')) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const delta = -e.deltaY * 0.001;
    setTransform(t => {
      const k = Math.max(0.2, Math.min(2.5, t.k * (1 + delta)));
      const scale = k / t.k;
      return { k, x: mx - (mx - t.x) * scale, y: my - (my - t.y) * scale };
    });
  }, []);
  React.useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  // Sidebar toggle
  const toggle = (type, id) =>
    setSelected(prev => prev?.type === type && prev.id === id ? null : { type, id });

  // Helper: get card width/height for a node id
  const dimsForNode = (nid) => nid.startsWith('branch:')
    ? { w: BR_W, h: BR_H }
    : { w: DEPT_W, h: DEPT_H };

  // ── Card pointer handler: click → select/sidebar, drag → move cards (with snap) ─
  const onCardPointerDown = (e, type, id) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const nodeId = type + ':' + id;
    const isInMulti = multiSel.has(nodeId) && multiSel.size > 1;
    const movingIds = isInMulti ? [...multiSel] : [nodeId];

    // Snapshot positions at drag start
    const snapPos = {};
    for (const mid of movingIds) {
      snapPos[mid] = { ...(effectivePos[mid] || { x: 0, y: 0 }) };
    }
    const sx = e.clientX, sy = e.clientY;
    const k0 = transform.k;
    let moved = false;

    // Cache candidate edges from other (non-moving) cards for snap detection
    const movingSet = new Set(movingIds);
    const primary   = dimsForNode(nodeId);
    const candX = []; // { value, edges: [yTop, yBot] }
    const candY = [];
    for (const [nid, p] of Object.entries(effectivePos)) {
      if (movingSet.has(nid)) continue;
      const d = dimsForNode(nid);
      const l = p.x, r = p.x + d.w, cx = p.x + d.w / 2;
      const t = p.y, b = p.y + d.h, cy = p.y + d.h / 2;
      candX.push({ value: l,  edges: [t, b] });
      candX.push({ value: r,  edges: [t, b] });
      candX.push({ value: cx, edges: [t, b] });
      candY.push({ value: t,  edges: [l, r] });
      candY.push({ value: b,  edges: [l, r] });
      candY.push({ value: cy, edges: [l, r] });
    }

    const move = (ev) => {
      const dx0 = (ev.clientX - sx) / k0;
      const dy0 = (ev.clientY - sy) / k0;
      if (!moved && Math.hypot(dx0, dy0) > 4) moved = true;
      if (!moved) return;

      // Primary card's would-be position
      const px = snapPos[nodeId].x + dx0;
      const py = snapPos[nodeId].y + dy0;
      const myL = px, myR = px + primary.w, myCX = px + primary.w / 2;
      const myT = py, myB = py + primary.h, myCY = py + primary.h / 2;

      // Snap threshold in canvas units (≈ 8px on screen)
      const T = 8 / k0;
      let bestX = null, bestY = null;

      for (const c of candX) {
        for (const myV of [myL, myCX, myR]) {
          const diff = c.value - myV;
          if (Math.abs(diff) < T && (!bestX || Math.abs(diff) < Math.abs(bestX.diff))) {
            bestX = { diff, x: c.value, edges: c.edges, myV };
          }
        }
      }
      for (const c of candY) {
        for (const myV of [myT, myCY, myB]) {
          const diff = c.value - myV;
          if (Math.abs(diff) < T && (!bestY || Math.abs(diff) < Math.abs(bestY.diff))) {
            bestY = { diff, y: c.value, edges: c.edges, myV };
          }
        }
      }

      const snapDX = bestX ? bestX.diff : 0;
      const snapDY = bestY ? bestY.diff : 0;

      // Compute guides (extents span both my card and the other card)
      const guides = [];
      if (bestX) {
        const finalY = py + snapDY;
        const yMin = Math.min(bestX.edges[0], finalY);
        const yMax = Math.max(bestX.edges[1], finalY + primary.h);
        guides.push({ type: 'v', x: bestX.x, y1: yMin - 6, y2: yMax + 6 });
      }
      if (bestY) {
        const finalX = px + snapDX;
        const xMin = Math.min(bestY.edges[0], finalX);
        const xMax = Math.max(bestY.edges[1], finalX + primary.w);
        guides.push({ type: 'h', y: bestY.y, x1: xMin - 6, x2: xMax + 6 });
      }
      setSnapGuides(guides);

      const dx = dx0 + snapDX;
      const dy = dy0 + snapDY;
      setCustomPos(prev => {
        const next = { ...prev };
        for (const mid of movingIds) {
          next[mid] = { x: snapPos[mid].x + dx, y: snapPos[mid].y + dy };
        }
        return next;
      });
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setSnapGuides([]); // clear guides
      if (!moved) {
        // Click (not drag)
        if (type === 'branch') {
          // Enter edit mode for the branch
          const deptId = data.branchToDept[id];
          const dept = departments.find(d => d.id === deptId);
          const branch = dept?.branches?.find(b => b.id === id);
          if (branch) {
            setEditingBranchId(id);
            setEditBranchText(branch.name);
          }
        } else {
          // Sidebar + single selection (depts and managers)
          setMultiSel(new Set([nodeId]));
          toggle(type, id);
        }
      }
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // ── Canvas pointer handler ────────────────────────────────────────────────────
  // Normal left-drag = pan | Shift+left-drag = lasso | right/middle = pan
  const onCanvasPointerDown = (e) => {
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;

    if (e.button === 0 && e.shiftKey) {
      // ── Shift + left drag = lasso ──
      const rect = canvasRef.current.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY;
      const startCX = (sx - rect.left - transform.x) / transform.k;
      const startCY = (sy - rect.top  - transform.y) / transform.k;
      let curLasso = null;
      let moved = false;

      const move = (ev) => {
        const ex = (ev.clientX - rect.left - transform.x) / transform.k;
        const ey = (ev.clientY - rect.top  - transform.y) / transform.k;
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) moved = true;
        if (moved) { curLasso = { sx: startCX, sy: startCY, ex, ey }; setLasso({ ...curLasso }); }
      };

      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        setLasso(null);
        if (moved && curLasso) {
          const minX = Math.min(curLasso.sx, curLasso.ex);
          const maxX = Math.max(curLasso.sx, curLasso.ex);
          const minY = Math.min(curLasso.sy, curLasso.ey);
          const maxY = Math.max(curLasso.sy, curLasso.ey);
          const sel = new Set();
          for (const [nid, p] of Object.entries(effectivePos)) {
            if (p.x + DEPT_W > minX && p.x < maxX && p.y + DEPT_H > minY && p.y < maxY) sel.add(nid);
          }
          setMultiSel(sel);
          if (sel.size > 0) setSelected(null);
        } else if (!moved) {
          setMultiSel(new Set());
          setSelected(null);
        }
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      return;
    }

    // ── Normal left-drag / right / middle = pan ──
    if (e.button === 2 || e.button === 1 || e.button === 0) {
      const sx = e.clientX, sy = e.clientY, st = { ...transform };
      let moved = false;
      const move = (ev) => {
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 4) { moved = true; setPanning(true); }
        if (moved) setTransform({ ...st, x: st.x + ev.clientX - sx, y: st.y + ev.clientY - sy });
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        setPanning(false);
        if (!moved && e.button === 0) {
          // Plain click on empty canvas → clear selection
          setMultiSel(new Set());
          setSelected(null);
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }
  };

  // ── Sidebar state ────────────────────────────────────────────────────────────
  const selectedMgr  = selected?.type === 'mgr'  ? byId[selected.id] : null;
  const selectedDept = selected?.type === 'dept' ? departments.find(d => d.id === selected.id) : null;

  return (
    <div
      ref={canvasRef}
      className={'canvas' + (panning ? ' panning' : '') + (lasso ? ' lasso-mode' : '')}
      onPointerDown={onCanvasPointerDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="canvas-inner" style={{ transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.k})` }}>

        {/* ── Edges ── */}
        <svg className="edges">
          {/* Primary tree edges */}
          {Object.entries(data.parentOf).map(([childId, parentId]) => {
            const p = effectivePos[parentId], c = effectivePos[childId];
            if (!p || !c) return null;
            const x1 = p.x + DEPT_W / 2, y1 = p.y + DEPT_H;
            const x2 = c.x + DEPT_W / 2, y2 = c.y;
            const my = (y1 + y2) / 2;
            const deptId = childId.startsWith('dept:') ? childId.slice(5) : null;
            const dept   = deptId ? departments.find(d => d.id === deptId) : null;
            return (
              <path
                key={childId}
                d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
                className="edge"
                style={dept ? { stroke: rgba(dept.color, 0.45), strokeWidth: 1.5 } : {}}
              />
            );
          })}
          {/* Dept→Dept co-oversight dashed edges */}
          {(deptLinks || []).map(({ from, to }) => {
            const fromPos = effectivePos['dept:' + from];
            const toPos   = effectivePos['dept:' + to];
            if (!fromPos || !toPos) return null;
            const x1 = fromPos.x + DEPT_W / 2, y1 = fromPos.y + DEPT_H;
            const x2 = toPos.x   + DEPT_W / 2, y2 = toPos.y;
            const my = (y1 + y2) / 2;
            const fromDept = departments.find(d => d.id === from);
            return (
              <path
                key={`deptlink-${from}-${to}`}
                d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
                className="edge"
                style={{ stroke: fromDept ? rgba(fromDept.color, 0.6) : 'var(--line-2)', strokeWidth: 2, strokeDasharray: '7 4' }}
              />
            );
          })}
          {/* Edges from dept to each of its sub-branches */}
          {departments.flatMap(dept => {
            const parentPos = effectivePos['dept:' + dept.id];
            if (!parentPos || !(dept.branches?.length)) return [];
            return dept.branches.map(b => {
              const bp = effectivePos['branch:' + b.id];
              if (!bp) return null;
              const bc = b.color || dept.color;
              const x1 = parentPos.x + DEPT_W / 2;
              const y1 = parentPos.y + DEPT_H;
              const x2 = bp.x + BR_W / 2;
              const y2 = bp.y;
              const my = (y1 + y2) / 2;
              return (
                <path
                  key={'br-edge-' + b.id}
                  d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
                  className="edge"
                  style={{ stroke: rgba(bc, 0.5), strokeWidth: 1.5 }}
                />
              );
            });
          })}
          {/* Snap-alignment dashed guides (drawn last so they sit on top of edges) */}
          {snapGuides.map((g, i) => {
            const sw = Math.max(0.8, 1.2 / transform.k);
            const dash = `${6 / transform.k} ${4 / transform.k}`;
            return g.type === 'v' ? (
              <line
                key={'guide-v-' + i}
                x1={g.x} y1={g.y1} x2={g.x} y2={g.y2}
                stroke="#FF3D7A"
                strokeWidth={sw}
                strokeDasharray={dash}
                style={{ pointerEvents: 'none' }}
              />
            ) : (
              <line
                key={'guide-h-' + i}
                x1={g.x1} y1={g.y} x2={g.x2} y2={g.y}
                stroke="#FF3D7A"
                strokeWidth={sw}
                strokeDasharray={dash}
                style={{ pointerEvents: 'none' }}
              />
            );
          })}
          {/* Co-oversight dashed edges */}
          {(coOversight || []).map(({ deptId, personId }) => {
            const mgrPos  = effectivePos['mgr:' + personId];
            const deptPos = effectivePos['dept:' + deptId];
            if (!mgrPos || !deptPos) return null;
            const x1 = mgrPos.x  + DEPT_W / 2, y1 = mgrPos.y  + DEPT_H;
            const x2 = deptPos.x + DEPT_W / 2, y2 = deptPos.y;
            const my = (y1 + y2) / 2;
            const dept = departments.find(d => d.id === deptId);
            return (
              <path
                key={`co-${deptId}-${personId}`}
                d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
                className="edge"
                style={{ stroke: dept ? rgba(dept.color, 0.5) : 'var(--line-2)', strokeWidth: 1.8, strokeDasharray: '6 4' }}
              />
            );
          })}
        </svg>

        {/* ── Manager cards ── */}
        {[...data.managerPool].map(mgId => {
          const pos    = effectivePos['mgr:' + mgId];
          const person = byId[mgId];
          if (!pos || !person) return null;
          const dept  = departments.find(d => d.id === data.managerDeptId[mgId]);
          const count = (data.mgrDepts[mgId] || []).length;
          const nodeId = 'mgr:' + mgId;
          return (
            <ManagerCard
              key={mgId}
              person={person}
              dept={dept}
              deptCount={count}
              pos={pos}
              selected={selected?.type === 'mgr' && selected.id === mgId}
              multiSelected={multiSel.has(nodeId)}
              onPointerDown={(e) => onCardPointerDown(e, 'mgr', mgId)}
            />
          );
        })}

        {/* ── Dept cards ── */}
        {departments.map(dept => {
          const pos = effectivePos['dept:' + dept.id];
          if (!pos) return null;
          const nodeId = 'dept:' + dept.id;
          return (
            <DeptOverviewCard
              key={dept.id}
              dept={dept}
              head={data.entryByDept[dept.id]}
              count={(data.membersByDept[dept.id] || []).length}
              pos={pos}
              selected={selected?.type === 'dept' && selected.id === dept.id}
              multiSelected={multiSel.has(nodeId)}
              onPointerDown={(e) => onCardPointerDown(e, 'dept', dept.id)}
            />
          );
        })}

        {/* ── Sub-branch cards (draggable + editable, 2-line text, custom color) ── */}
        {departments.flatMap(dept =>
          (dept.branches || []).map(b => {
            const pos = effectivePos['branch:' + b.id];
            if (!pos) return null;
            const bc = b.color || dept.color;
            const isEditing = editingBranchId === b.id;
            const commitEdit = () => {
              const trimmed = editBranchText.replace(/\s+$/, '');
              if (trimmed && trimmed !== b.name) {
                onEditBranch && onEditBranch(dept.id, b.id, { name: trimmed });
              }
              setEditingBranchId(null);
            };
            return (
              <div
                key={'br-card-' + b.id}
                className="node sub-branch-card"
                style={{
                  transform: `translate(${pos.x}px,${pos.y}px)`,
                  width: BR_W, height: BR_H,
                  background: '#fff',
                  border: `1.5px solid ${rgba(bc, 0.4)}`,
                  borderLeft: `4px solid ${bc}`,
                  borderRadius: 12,
                  padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: 'var(--shadow-sm)',
                  cursor: isEditing ? 'text' : 'grab',
                }}
                onPointerDown={isEditing ? undefined : (e) => onCardPointerDown(e, 'branch', b.id)}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: rgba(bc, 0.15),
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: bc }}>
                    <path d="M8 2L2 5v6l6 3 6-3V5L8 2zM2 5l6 3 6-3M8 8v6" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  {isEditing ? (
                    <textarea
                      autoFocus
                      rows={2}
                      value={editBranchText}
                      onChange={(e) => setEditBranchText(e.target.value)}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) => {
                        // Move caret to end on focus
                        const v = e.target.value;
                        e.target.value = '';
                        e.target.value = v;
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          commitEdit();
                        } else if (e.key === 'Escape') {
                          setEditingBranchId(null);
                        }
                      }}
                      onBlur={commitEdit}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        border: `1.5px solid ${bc}`,
                        borderRadius: 6,
                        fontSize: 12.5,
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        lineHeight: 1.3,
                        outline: 'none',
                        background: '#fff',
                        resize: 'none',
                        boxSizing: 'border-box',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div
                      title={b.name}
                      style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: 'var(--ink-1)',
                        lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {b.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* ── Lasso rectangle ── */}
        {lasso && (
          <div style={{
            position: 'absolute',
            left:   Math.min(lasso.sx, lasso.ex),
            top:    Math.min(lasso.sy, lasso.ey),
            width:  Math.abs(lasso.ex - lasso.sx),
            height: Math.abs(lasso.ey - lasso.sy),
            border: '1.5px solid var(--coral)',
            background: 'rgba(255,107,71,0.07)',
            borderRadius: 4,
            pointerEvents: 'none',
          }} />
        )}

        {/* ── Empty state ── */}
        {departments.length === 0 && (
          <div className="empty-canvas" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" color="var(--ink-3)">
              <rect x="2.5" y="3" width="8" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <rect x="13.5" y="3" width="8" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <rect x="7" y="15.5" width="10" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M6.5 8.5V12h11V8.5M12 12v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <div className="ec-title">ยังไม่มีฝ่าย/แผนก</div>
            <div className="ec-sub">กลับไปหน้า <b>Org Chart</b> เพื่อสร้างฝ่าย</div>
          </div>
        )}
      </div>

      {/* ── Manager sidebar ── */}
      {selectedMgr && (
        <ManagerViewSidebar
          person={selectedMgr}
          dept={departments.find(d => d.id === data.managerDeptId[selectedMgr.id])}
          directDepts={(data.mgrDepts[selectedMgr.id] || []).map(id => departments.find(d => d.id === id)).filter(Boolean)}
          coManagedDepts={
            Object.entries(data.coOversightByDept || {})
              .filter(([, ids]) => ids.includes(selectedMgr.id))
              .map(([deptId]) => departments.find(d => d.id === deptId))
              .filter(Boolean)
          }
          onClose={() => setSelected(null)}
          onSwitchToPeople={() => onSwitchToPeople && onSwitchToPeople(null, selectedMgr.id)}
        />
      )}

      {/* ── Dept sidebar ── */}
      {selectedDept && (
        <DeptViewSidebar
          dept={selectedDept}
          head={data.entryByDept[selectedDept.id]}
          members={data.membersByDept[selectedDept.id] || []}
          coManagers={(data.coOversightByDept[selectedDept.id] || []).map(id => byId[id]).filter(Boolean)}
          availableManagers={[...data.managerPool].map(id => byId[id]).filter(Boolean)}
          primaryManagerId={data.deptManager[selectedDept.id]}
          allDepartments={departments}
          managingDepts={(deptLinks || []).filter(l => l.to === selectedDept.id).map(l => departments.find(d => d.id === l.from)).filter(Boolean)}
          onAddManagingDept={(fromId) => onAddDeptLink && onAddDeptLink(fromId, selectedDept.id)}
          onRemoveManagingDept={(fromId) => onRemoveDeptLink && onRemoveDeptLink(fromId, selectedDept.id)}
          onAddBranch={(name, nameEn) => onAddBranch && onAddBranch(selectedDept.id, name, nameEn)}
          onEditBranch={(branchId, patch) => onEditBranch && onEditBranch(selectedDept.id, branchId, patch)}
          onDeleteBranch={(branchId) => onDeleteBranch && onDeleteBranch(selectedDept.id, branchId)}
          onPatchDept={(patch) => onPatchDept && onPatchDept(selectedDept.id, patch)}
          onClose={() => setSelected(null)}
          onSwitchToPeople={() => onSwitchToPeople && onSwitchToPeople(selectedDept.id, null)}
          onEditDept={onEditDept}
          onDeleteDept={onDeleteDept}
          onAddCoManager={(personId) => onAddCoOversight && onAddCoOversight(selectedDept.id, personId)}
          onRemoveCoManager={(personId) => onRemoveCoOversight && onRemoveCoOversight(selectedDept.id, personId)}
        />
      )}

      {/* ── Multi-selection HUD (shows for 2+ cards) ── */}
      {multiSel.size > 1 && (() => {
        const selDeptIds    = [...multiSel].filter(n => n.startsWith('dept:')).map(n => n.slice(5));
        const emptyDeptIds  = selDeptIds.filter(id => (data.membersByDept[id] || []).length === 0);
        const filledDeptIds = selDeptIds.filter(id => (data.membersByDept[id] || []).length > 0);

        return (
          <div className="dept-multi-hud">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
              <rect x="9"   y="1.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
              <rect x="1.5" y="9"   width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
              <rect x="9"   y="9"   width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
            <span>เลือก {multiSel.size} การ์ด</span>

            {/* Inline error when some selected depts have members */}
            {hudDelError && (
              <span style={{ color: 'var(--coral)', fontSize: 11 }}>{hudDelError}</span>
            )}

            {selDeptIds.length > 0 && !hudDelConfirm && (
              <button
                className="btn-sm danger"
                style={{ height: 24, padding: '0 10px', fontSize: 11 }}
                onClick={() => {
                  if (filledDeptIds.length > 0) {
                    setHudDelError(`${filledDeptIds.length} ฝ่ายมีสมาชิก — คลิกทีละฝ่ายแล้วกด "ลบ / ย้ายสมาชิก..."`);
                    setTimeout(() => setHudDelError(''), 4000);
                    return;
                  }
                  setHudDelConfirm(true);
                }}
              >
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M3 5h10M6 5V3h4v2M5 5l1 9h4l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                ลบฝ่าย ({emptyDeptIds.length})
              </button>
            )}

            {hudDelConfirm && (
              <>
                <span style={{ fontSize: 11, color: 'var(--coral)', fontWeight: 600 }}>
                  ยืนยันลบ {emptyDeptIds.length} ฝ่าย?
                </span>
                <button
                  className="btn-sm danger"
                  style={{ height: 24, padding: '0 10px', fontSize: 11 }}
                  onClick={() => {
                    for (const id of emptyDeptIds) onDeleteDept && onDeleteDept(id, null);
                    setMultiSel(new Set());
                    setSelected(null);
                    setHudDelConfirm(false);
                    setHudDelError('');
                  }}
                >
                  ลบเลย
                </button>
                <button
                  className="btn-sm"
                  style={{ height: 24, padding: '0 10px', fontSize: 11 }}
                  onClick={() => setHudDelConfirm(false)}
                >
                  ยกเลิก
                </button>
              </>
            )}

            {!hudDelConfirm && (
              <button
                className="btn-sm"
                style={{ height: 24, padding: '0 10px', fontSize: 11 }}
                onClick={() => { setMultiSel(new Set()); setSelected(null); setHudDelError(''); }}
              >
                ยกเลิก
              </button>
            )}
          </div>
        );
      })()}
    </div>
  );
}

window.DeptOverviewCard  = DeptOverviewCard;
window.ManagerCard       = ManagerCard;
window.DeptViewSidebar   = DeptViewSidebar;
window.ManagerViewSidebar = ManagerViewSidebar;
window.DeptCanvas        = DeptCanvas;
