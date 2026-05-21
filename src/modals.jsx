// History modal + Add Person modal + Add Department modal

function HistoryModal({ history, byId, onClose }) {
  const iconFor = (type) => {
    const map = {
      promote: { c: '#4FD1A5', d: 'M8 13V4M4 7l4-4 4 4' },
      demote:  { c: '#8A8174', d: 'M8 3v9M4 9l4 4 4-4' },
      move:    { c: '#7CC4F0', d: 'M3 8h10M9 4l4 4-4 4' },
      create:  { c: '#FFC857', d: 'M8 3v10M3 8h10' },
      delete:  { c: '#C03B2B', d: 'M4 4l8 8M12 4l-8 8' },
      rename:  { c: '#B89BE5', d: 'M3 11l8-8 2 2-8 8H3v-2z' },
      edit:    { c: '#B89BE5', d: 'M3 11l8-8 2 2-8 8H3v-2z' },
    };
    return map[type] || map.edit;
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>ประวัติการเปลี่ยนแปลง</h3>
          <button className="sb-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="modal-body">
          {history.length === 0 ? (
            <div className="empty-state">ยังไม่มีการเปลี่ยนแปลง</div>
          ) : (
            [...history].reverse().map((h, i) => {
              const ic = iconFor(h.type);
              return (
                <div key={i} className="history-row">
                  <div className="dot" style={{ background: ic.c + '20' }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d={ic.d} stroke={ic.c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div className="body">
                    <div className="msg">{h.msg}</div>
                    <div className="when">{relTime(h.ts)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-sm" onClick={onClose}>ปิด</button>
        </div>
      </div>
    </div>
  );
}

function AddPersonModal({ departments, allPeople, defaultParent, onCancel, onSubmit, onCreateDept }) {
  // ── Mode: 'single' | 'group' ──────────────────────────────────────────────
  const [mode, setMode] = React.useState('single');

  // Single-mode name
  const [name, setName] = React.useState('');

  // Group-mode names list (start with 5 empty slots)
  const [names, setNames] = React.useState(['', '', '', '', '']);

  // Shared fields
  const [role, setRole] = React.useState('');
  const [lv, setLv] = React.useState(3);
  const defaultParentObj = allPeople.find(p => p.id === defaultParent);
  const [deptId, setDeptId] = React.useState(defaultParentObj?.deptId || departments[0]?.id);
  const [parentId, setParentId] = React.useState(defaultParent || '');
  const [parentSearch, setParentSearch] = React.useState('');
  const [deptManual, setDeptManual] = React.useState(false);

  // ── Inline dept creation ──────────────────────────────────────────────────
  const DEPT_COLORS = ['#FF6B47','#FF8A3D','#FFC857','#4FD1A5','#7CC4F0','#B89BE5','#FFB5BA','#5C9BD6'];
  const [showNewDept, setShowNewDept] = React.useState(false);
  const [newDeptName, setNewDeptName]   = React.useState('');
  const [newDeptNameEn, setNewDeptNameEn] = React.useState('');
  const [newDeptColor, setNewDeptColor] = React.useState(DEPT_COLORS[3]);

  const handleCreateDept = () => {
    if (!newDeptName.trim()) return;
    const newId = onCreateDept && onCreateDept({
      name: newDeptName.trim(),
      nameEn: newDeptNameEn.trim() || newDeptName.trim(),
      color: newDeptColor,
    });
    if (newId) { setDeptId(newId); setDeptManual(true); }
    setShowNewDept(false);
    setNewDeptName('');
    setNewDeptNameEn('');
  };

  React.useEffect(() => {
    if (deptManual) return;
    const par = allPeople.find(p => p.id === parentId);
    if (par && par.deptId) setDeptId(par.deptId);
  }, [parentId, deptManual, allPeople]);

  const matches = allPeople
    .filter(p => !parentSearch || p.name.includes(parentSearch) || p.role.toLowerCase().includes(parentSearch.toLowerCase()))
    .slice(0, 8);

  const parent = allPeople.find(p => p.id === parentId);

  // Valid group names (non-empty after trim)
  const validNames = names.map(n => n.trim()).filter(Boolean);
  const canSubmit = role.trim() && (mode === 'single' ? name.trim() : validNames.length > 0);

  const handleSubmit = () => {
    if (mode === 'single') {
      onSubmit({ name: name.trim(), role: role.trim(), lv, deptId, parentId: parentId || null });
    } else {
      onSubmit(validNames.map(n => ({ name: n, role: role.trim(), lv, deptId, parentId: parentId || null })));
    }
  };

  const updateName = (i, val) => {
    const next = [...names];
    next[i] = val;
    setNames(next);
  };
  const removeName = (i) => setNames(names.filter((_, j) => j !== i));
  const addNameSlot = () => setNames([...names, '']);

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="modal-header">
          <h3>{mode === 'single' ? 'เพิ่มคนใหม่' : 'เพิ่มกลุ่มพนักงาน'}</h3>

          {/* Mode toggle pill */}
          <div className="add-mode-toggle">
            <button
              className={'add-mode-btn' + (mode === 'single' ? ' active' : '')}
              onClick={() => setMode('single')}
              type="button"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 14c.6-2.8 2.8-4.5 6-4.5s5.4 1.7 6 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              เดี่ยว
            </button>
            <button
              className={'add-mode-btn' + (mode === 'group' ? ' active' : '')}
              onClick={() => setMode('group')}
              type="button"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <circle cx="5.5" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="10.5" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M1 13c.5-2.2 2.1-3.5 4.5-3.5 1.5 0 2.7.6 3.5 1.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M10.5 9.5c2.2.3 3.6 1.6 4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              กลุ่ม
            </button>
          </div>

          <button className="sb-close" onClick={onCancel}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="modal-body">

          {/* ── Name(s) ── */}
          {mode === 'single' ? (
            <div className="field">
              <label>ชื่อ-นามสกุล *</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น สมชาย ใจดี"
              />
            </div>
          ) : (
            <div className="field">
              <label>
                รายชื่อพนักงาน *
                <span style={{ fontWeight: 400, color: 'var(--ink-3)', marginLeft: 6 }}>
                  — ตำแหน่งและเลเวลเดียวกัน
                </span>
              </label>
              <div className="group-names-list">
                {names.map((n, i) => (
                  <div key={i} className="group-name-row">
                    <span className="group-name-num">{i + 1}</span>
                    <input
                      autoFocus={i === 0}
                      value={n}
                      onChange={(e) => updateName(i, e.target.value)}
                      onKeyDown={(e) => {
                        // Enter on last row → add new slot
                        if (e.key === 'Enter' && i === names.length - 1) {
                          e.preventDefault();
                          addNameSlot();
                        }
                      }}
                      placeholder={`ชื่อ-นามสกุลคนที่ ${i + 1}`}
                    />
                    <button
                      type="button"
                      className="btn-icon-sm"
                      onClick={() => removeName(i)}
                      title="ลบออก"
                      disabled={names.length <= 1}
                      style={{ opacity: names.length <= 1 ? 0.3 : 1, flexShrink: 0 }}
                    >
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-sm group-add-name-btn"
                  onClick={addNameSlot}
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  เพิ่มชื่อ
                </button>
              </div>
              {validNames.length > 0 && (
                <div className="group-names-count-hint">
                  จะเพิ่มทั้งหมด <b>{validNames.length}</b> คน
                </div>
              )}
            </div>
          )}

          {/* ── Shared: role ── */}
          <div className="field">
            <label>ตำแหน่ง (Position EN) *</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="เช่น Server, Branch Manager"
            />
          </div>

          {/* ── Shared: LV + dept ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field">
              <label>ระดับ · Level (LV{lv})</label>
              <input type="range" min={1} max={10} value={lv} onChange={(e) => setLv(Number(e.target.value))} style={{ width: '100%' }} />
              <div className="lv-pip-row">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="lv-pip" style={{ background: i < lv ? lvColor(lv) : undefined }} />
                ))}
              </div>
            </div>
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                ฝ่าย / แผนก
                <button
                  type="button"
                  title="สร้างฝ่ายใหม่"
                  onClick={() => setShowNewDept(s => !s)}
                  style={{
                    width: 18, height: 18, borderRadius: 5, border: '1px solid var(--line)',
                    background: showNewDept ? 'var(--coral)' : 'var(--surface)',
                    color: showNewDept ? '#fff' : 'var(--ink-3)',
                    display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0, flexShrink: 0,
                  }}
                >
                  <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </button>
              </label>
              <select value={deptId || ''} onChange={(e) => { setDeptId(e.target.value); setDeptManual(true); }}>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>

              {/* Inline new-dept form */}
              {showNewDept && (
                <div style={{ marginTop: 8, padding: 10, background: 'var(--bg-2)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <input
                    autoFocus
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateDept(); }}
                    placeholder="ชื่อฝ่าย เช่น Branch, สาขา"
                    style={{ fontSize: 12.5 }}
                  />
                  <input
                    value={newDeptNameEn}
                    onChange={(e) => setNewDeptNameEn(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateDept(); }}
                    placeholder="EN name (ถ้ามี)"
                    style={{ fontSize: 12.5 }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    {DEPT_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setNewDeptColor(c)}
                        style={{ width: 22, height: 22, borderRadius: 6, background: c, padding: 0, cursor: 'pointer', border: c === newDeptColor ? '2.5px solid var(--ink)' : '2px solid transparent', flexShrink: 0 }} />
                    ))}
                    <div style={{ flex: 1 }} />
                    <button type="button" className="btn-sm" style={{ fontSize: 11, height: 24, padding: '0 8px' }} onClick={() => setShowNewDept(false)}>ยกเลิก</button>
                    <button type="button" className="btn-sm primary" style={{ fontSize: 11, height: 24, padding: '0 8px' }} disabled={!newDeptName.trim()} onClick={handleCreateDept}>
                      สร้างฝ่าย
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Shared: parent ── */}
          <div className="field">
            <label>หัวหน้า (Reporting line)</label>
            {parent ? (
              <div className="report-line" style={{ marginBottom: 6 }}>
                <div className="avi" style={{ background: colorFor(parent.id) }}>
                  {parent.photo ? <img src={parent.photo} alt="" /> : initials(parent.name)}
                </div>
                <div className="info">
                  <div className="nm">{parent.name}</div>
                  <div className="rl">{parent.role} · LV{parent.lv}</div>
                </div>
                <button className="btn-sm" onClick={() => setParentId('')}>เปลี่ยน</button>
              </div>
            ) : (
              <>
                <input value={parentSearch} onChange={(e) => setParentSearch(e.target.value)} placeholder="ค้นหาหัวหน้า..." />
                <div style={{ maxHeight: 180, overflowY: 'auto', marginTop: 6, background: 'var(--bg-2)', borderRadius: 8, padding: 4 }}>
                  {matches.map(p => (
                    <div key={p.id} onClick={() => setParentId(p.id)}
                      style={{ padding: '6px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: colorFor(p.id), color: '#fff', fontSize: 9, fontWeight: 600, display: 'grid', placeItems: 'center', flexShrink: 0, overflow: 'hidden' }}>
                        {p.photo ? <img src={p.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(p.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{p.role} · LV{p.lv}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="modal-footer">
          <button className="btn-sm" onClick={onCancel}>ยกเลิก</button>
          <button
            className="btn-sm primary"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {mode === 'single'
              ? 'เพิ่มเข้าองค์กร'
              : `เพิ่ม ${validNames.length > 0 ? validNames.length + ' คน' : '...'} เข้าองค์กร`}
          </button>
        </div>

      </div>
    </div>
  );
}

function AddDeptModal({ onCancel, onSubmit }) {
  const [name, setName] = React.useState('');
  const [nameEn, setNameEn] = React.useState('');
  const colors = ['#FF6B47', '#FF8A3D', '#FFC857', '#4FD1A5', '#7CC4F0', '#B89BE5', '#FFB5BA', '#FF7449'];
  const [color, setColor] = React.useState(colors[0]);
  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>สร้างฝ่ายใหม่</h3>
          <button className="sb-close" onClick={onCancel}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>ชื่อฝ่าย (ไทย) *</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ฝ่ายควบคุมคุณภาพ" />
          </div>
          <div className="field">
            <label>Department name (EN)</label>
            <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Quality Assurance" />
          </div>
          <div className="field">
            <label>สีประจำฝ่าย</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {colors.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  style={{ width: 32, height: 32, borderRadius: 8, background: c, border: c === color ? '2px solid var(--ink)' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-sm" onClick={onCancel}>ยกเลิก</button>
          <button className="btn-sm primary" disabled={!name.trim()} onClick={() => onSubmit({ name: name.trim(), nameEn: nameEn.trim() || name.trim(), color })}>
            สร้างฝ่าย
          </button>
        </div>
      </div>
    </div>
  );
}

function EditDeptModal({ dept, departments, peopleCount, onCancel, onSubmit, onDelete }) {
  const [name, setName] = React.useState(dept.name || '');
  const [nameEn, setNameEn] = React.useState(dept.nameEn || '');
  const colors = ['#FF6B47', '#FF8A3D', '#FFC857', '#4FD1A5', '#7CC4F0', '#B89BE5', '#FFB5BA', '#FF7449'];
  const [color, setColor] = React.useState(dept.color || colors[0]);
  const [confirmDel, setConfirmDel] = React.useState(false);
  const otherDepts = departments.filter(d => d.id !== dept.id);
  const [reassignTo, setReassignTo] = React.useState(otherDepts[0]?.id || '');

  const handleDelete = () => {
    if (peopleCount > 0 && !reassignTo) return;
    onDelete(dept.id, peopleCount > 0 ? reassignTo : null);
  };

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>แก้ไขฝ่าย</h3>
          <button className="sb-close" onClick={onCancel}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="modal-body">
          {!confirmDel ? (
            <>
              <div className="field">
                <label>ชื่อฝ่าย (ไทย) *</label>
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ฝ่ายควบคุมคุณภาพ" />
              </div>
              <div className="field">
                <label>Department name (EN)</label>
                <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Quality Assurance" />
              </div>
              <div className="field">
                <label>สีประจำฝ่าย</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {colors.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      style={{ width: 32, height: 32, borderRadius: 8, background: c, border: c === color ? '2px solid var(--ink)' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-2)', borderRadius: 8, fontSize: 12, color: 'var(--ink-2)' }}>
                ฝ่ายนี้มีพนักงาน <b>{peopleCount}</b> คน
              </div>
            </>
          ) : (
            <>
              <div style={{ padding: 14, background: '#FFF0EC', border: '1px solid #FFD0C2', borderRadius: 10, color: '#C03B2B', marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>ยืนยันการลบฝ่าย "{dept.name}"</div>
                <div style={{ fontSize: 12 }}>การลบไม่สามารถย้อนกลับได้</div>
              </div>
              {peopleCount > 0 && (
                <div className="field">
                  <label>ฝ่ายนี้มีพนักงาน {peopleCount} คน — ย้ายไปฝ่ายไหน? *</label>
                  {otherDepts.length === 0 ? (
                    <div style={{ padding: 10, background: 'var(--bg-2)', borderRadius: 8, fontSize: 12, color: 'var(--ink-3)' }}>
                      ไม่มีฝ่ายอื่นให้ย้าย — ต้องสร้างฝ่ายใหม่ก่อน หรือลบพนักงานออกก่อน
                    </div>
                  ) : (
                    <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
                      {otherDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          {!confirmDel ? (
            <>
              <button className="btn-sm danger" onClick={() => setConfirmDel(true)}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ marginRight: 4, verticalAlign: -1 }}><path d="M3 5h10M6 5V3h4v2M5 5l1 9h4l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ลบฝ่ายนี้
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-sm" onClick={onCancel}>ยกเลิก</button>
                <button
                  className="btn-sm primary"
                  disabled={!name.trim()}
                  onClick={() => onSubmit(dept.id, { name: name.trim(), nameEn: nameEn.trim() || name.trim(), color })}
                >
                  บันทึก
                </button>
              </div>
            </>
          ) : (
            <>
              <button className="btn-sm" onClick={() => setConfirmDel(false)}>ย้อนกลับ</button>
              <button
                className="btn-sm danger"
                disabled={peopleCount > 0 && (!reassignTo || otherDepts.length === 0)}
                onClick={handleDelete}
              >
                ยืนยันลบ
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

window.HistoryModal = HistoryModal;
window.AddPersonModal = AddPersonModal;
window.AddDeptModal = AddDeptModal;
window.EditDeptModal = EditDeptModal;
