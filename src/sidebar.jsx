// Right-side detail panel with all per-person actions

// ── Group sidebar (shown when selected card is a role-group summary) ─────────
function GroupSidebar({ group, repId, byId, departments, onClose, onFocus, onSelect, onAddChild, onDelete }) {
  const dept = departments.find(d => d.id === group.deptId);
  const barColor = dept?.color || lvColor(group.lv);
  const parent = byId[group.parentId];

  return (
    <div
      className="sidebar"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="sb-header">
        <button className="sb-close" onClick={onClose} title="ปิด">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        <div className="sb-avatar-row">
          <div className="sb-avatar" style={{ background: barColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <circle cx="8"  cy="7.5" r="2.4" stroke="white" strokeWidth="1.5" />
              <circle cx="16" cy="7.5" r="2.4" stroke="white" strokeWidth="1.5" />
              <path d="M2 19c.7-3 2.8-4.5 6-4.5s5.3 1.5 6 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M16 14.5c2.8.4 4.5 1.8 5.2 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="sb-name-block">
            <div className="sb-name">{group.role}</div>
            <div className="sb-role">{group.members.length} คน · กลุ่มตำแหน่งเดียวกัน</div>
          </div>
        </div>
        <div className="sb-chips">
          <LvBadge lv={group.lv} />
          {dept && <span className="tag" style={{ background: barColor + '20', color: barColor }}>{dept.name}</span>}
        </div>
      </div>

      <div className="sb-body">
        {/* Member list */}
        <div className="sb-sect">
          <h4>รายชื่อสมาชิก · Members ({group.members.length})</h4>
          <div className="team-list">
            {group.members.map(id => {
              const member = byId[id];
              if (!member) return null;
              return (
                <div key={id} className="report-line group-member-row">
                  <div
                    className="avi"
                    style={{ background: colorFor(id), cursor: 'pointer' }}
                    onClick={() => { if (onSelect) onSelect(id); }}
                    title="เปิดรายละเอียด"
                  >
                    {member.photo ? <img src={member.photo} alt="" /> : initials(member.name)}
                  </div>
                  <div
                    className="info"
                    style={{ cursor: 'pointer' }}
                    onClick={() => { if (onSelect) onSelect(id); }}
                  >
                    <div className="nm">{member.name}</div>
                    <div className="rl">{member.id}</div>
                  </div>
                  <button
                    className="btn-icon-sm"
                    title="ดูรายละเอียด"
                    onClick={() => { if (onSelect) onSelect(id); }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="sb-sect">
          <h4>การดำเนินการ · Actions</h4>
          <div className="action-row">
            <button
              className="btn-sm primary"
              onClick={() => onAddChild && onAddChild(group.parentId)}
              title="เพิ่มคนใหม่ที่มีตำแหน่งนี้"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              เพิ่มสมาชิกในกลุ่ม
            </button>
          </div>
        </div>

        {/* Supervisor */}
        {parent && (
          <div className="sb-sect">
            <h4>ผู้บังคับบัญชา · Supervisor</h4>
            <div className="report-line" style={{ cursor: 'pointer' }} onClick={() => onFocus && onFocus(parent.id)}>
              <div className="avi" style={{ background: colorFor(parent.id) }}>
                {parent.photo ? <img src={parent.photo} alt="" /> : initials(parent.name)}
              </div>
              <div className="info">
                <div className="nm">{parent.name}</div>
                <div className="rl">{parent.role} · LV{parent.lv}</div>
              </div>
              <span className="arrow">→</span>
            </div>
          </div>
        )}

        {/* Note */}
        <div style={{ padding: '8px 16px 16px', fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.6 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle', marginRight: 4 }}>
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          คลิกชื่อสมาชิกเพื่อดู/แก้ไขรายละเอียดรายบุคคล
        </div>
      </div>
    </div>
  );
}

// ── Individual person sidebar ────────────────────────────────────────────────
function Sidebar({ person, byId, childrenOf, departments, onClose, onPatch, onChangeDept, onEditDept, onDetach, onDelete, onAddChild, onMoveTo, onPhotoUpload, onFocus, onSelect, allPeople, collaboratorIds = [], onAddCollaborator, onRemoveCollaborator, roleGroups = {} }) {
  if (!person) return null;

  // If this person is a role-group representative, show the group sidebar
  const group = roleGroups[person.id];
  if (group) {
    return (
      <GroupSidebar
        group={group}
        repId={person.id}
        byId={byId}
        departments={departments}
        onClose={onClose}
        onFocus={onFocus}
        onSelect={onSelect}
        onAddChild={onAddChild}
        onDelete={onDelete}
      />
    );
  }
  const dept = departments.find(d => d.id === person.deptId);
  const parent = person.parentId ? byId[person.parentId] : null;
  const kids = (childrenOf[person.id] || []).map(id => byId[id]);
  const fileRef = React.useRef(null);
  const [editName, setEditName] = React.useState(false);
  const [nameVal, setNameVal] = React.useState(person.name);
  const [movePickerOpen, setMovePickerOpen] = React.useState(false);
  const [moveQuery, setMoveQuery] = React.useState('');
  const [collabPickerOpen, setCollabPickerOpen] = React.useState(false);
  const [collabQuery, setCollabQuery] = React.useState('');

  React.useEffect(() => { setNameVal(person.name); setEditName(false); }, [person.id]);

  const onAvatarClick = () => fileRef.current?.click();
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onPhotoUpload(person.id, reader.result);
    reader.readAsDataURL(f);
  };

  const commitName = () => {
    if (nameVal.trim() && nameVal !== person.name) {
      onPatch(person.id, { name: nameVal.trim() }, `เปลี่ยนชื่อ → ${nameVal.trim()}`);
    }
    setEditName(false);
  };

  // Filtered candidates for "move under" — exclude self & descendants
  const blocked = new Set([person.id]);
  const collectDesc = (id) => {
    for (const c of (childrenOf[id] || [])) {
      blocked.add(c); collectDesc(c);
    }
  };
  collectDesc(person.id);
  const candidates = allPeople
    .filter(p => !blocked.has(p.id))
    .filter(p => !moveQuery || p.name.includes(moveQuery) || p.role.toLowerCase().includes(moveQuery.toLowerCase()))
    .slice(0, 30);

  return (
    <div
      className="sidebar"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="sb-header">
        <button className="sb-close" onClick={onClose} title="ปิด">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        <div className="sb-avatar-row">
          <div className="sb-avatar" style={{ background: colorFor(person.id) }} onClick={onAvatarClick}>
            {person.photo
              ? <img src={person.photo} alt="" />
              : <span>{initials(person.name)}</span>}
            <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={onFile} />
          </div>
          <div className="sb-name-block">
            {editName ? (
              <input
                autoFocus
                className="field"
                style={{ marginBottom: 0, width: '100%', padding: '6px 8px', borderRadius: 6, fontSize: 17, fontWeight: 700 }}
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitName();
                  if (e.key === 'Escape') { setNameVal(person.name); setEditName(false); }
                }}
              />
            ) : (
              <div className="sb-name editable" onClick={() => setEditName(true)} title="คลิกเพื่อแก้ไข">
                {person.name}
              </div>
            )}
            <div className="sb-role">{person.role}</div>
          </div>
        </div>
        <div className="sb-chips">
          <LvBadge lv={person.lv} />
          {dept && <span className="tag" style={{ background: dept.color + '20', color: dept.color }}>{dept.name}</span>}
          <span className="tag">{person.id}</span>
        </div>
      </div>

      <div className="sb-body">
        {/* Level */}
        <div className="sb-sect">
          <h4>ระดับตำแหน่ง · Level</h4>
          <div className="lv-control">
            <button className="demote" onClick={() => onPatch(person.id, { lv: Math.max(1, person.lv - 1) }, `ลดระดับ ${person.name} → LV${Math.max(1, person.lv - 1)}`)} disabled={person.lv <= 1}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              ลด
            </button>
            <div className="lv-display">
              <span style={{ background: lvColor(person.lv), width: 16, height: 16, borderRadius: 4 }} />
              <span>LV{person.lv}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-en)' }}>{lvLabel(person.lv)}</span>
            </div>
            <button className="promote" onClick={() => onPatch(person.id, { lv: Math.min(10, person.lv + 1) }, `เลื่อนตำแหน่ง ${person.name} → LV${Math.min(10, person.lv + 1)}`)} disabled={person.lv >= 10}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              เลื่อนขั้น
            </button>
          </div>
          <div className="lv-pip-row">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="lv-pip" style={{ background: i < person.lv ? lvColor(person.lv) : undefined }} />
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="sb-sect">
          <h4>ข้อมูล</h4>
          <div className="field">
            <label>ตำแหน่ง · Position</label>
            <input
              value={person.role || ''}
              onChange={(e) => onPatch(person.id, { role: e.target.value })}
              placeholder="เช่น Senior Manager / ผู้จัดการอาวุโส"
              onBlur={(e) => { if (e.target.value !== person.role) onPatch(person.id, { role: e.target.value }, `แก้ตำแหน่ง ${person.name} → ${e.target.value}`); }}
            />
          </div>
          <div className="field">
            <label>ฝ่าย / แผนก</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                style={{ flex: 1 }}
                value={person.deptId || ''}
                onChange={(e) => onChangeDept ? onChangeDept(person.id, e.target.value)
                                              : onPatch(person.id, { deptId: e.target.value }, `ย้ายฝ่าย ${person.name} → ${departments.find(d=>d.id===e.target.value)?.name}`)}
              >
                {!person.deptId && <option value="">— เลือกฝ่าย —</option>}
                {departments.map(d => <option key={d.id} value={d.id}>{d.name} · {d.nameEn}</option>)}
              </select>
              {person.deptId && onEditDept && (
                <button
                  type="button"
                  className="btn-sm"
                  onClick={() => onEditDept(person.deptId)}
                  title="แก้ไขชื่อ/สี ของฝ่ายนี้"
                  style={{ padding: '0 10px' }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 11l8-8 2 2-8 8H3v-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
                  แก้ฝ่าย
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reporting line */}
        <div className="sb-sect">
          <h4>ผู้บังคับบัญชา · Reporting line</h4>
          {parent ? (
            <div className="report-line" style={{ cursor: 'pointer' }} onClick={() => onFocus(parent.id)}>
              <div className="avi" style={{ background: colorFor(parent.id) }}>
                {parent.photo ? <img src={parent.photo} alt="" /> : initials(parent.name)}
              </div>
              <div className="info">
                <div className="nm">{parent.name}</div>
                <div className="rl">{parent.role}</div>
              </div>
              <span className="arrow">→</span>
            </div>
          ) : (
            <div style={{ padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 8, fontSize: 12, color: 'var(--ink-3)' }}>
              อยู่ระดับสูงสุดขององค์กร
            </div>
          )}
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button className="btn-sm" onClick={() => setMovePickerOpen(o => !o)}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8l6-6 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              เปลี่ยน reporting line
            </button>
            {person.parentId && onDetach && (
              <button className="btn-sm danger" onClick={() => onDetach(person.id)} title="ตัดสายผู้บังคับบัญชา — คนนี้จะกลายเป็น root ของแผนภูมิ">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                เอาผู้บังคับบัญชาออก
              </button>
            )}
          </div>
          {movePickerOpen && (
            <div style={{ marginTop: 8, background: 'var(--bg-2)', borderRadius: 8, padding: 8 }}>
              <input
                autoFocus
                placeholder="ค้นหาหัวหน้าใหม่..."
                value={moveQuery}
                onChange={(e) => setMoveQuery(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 12, marginBottom: 6, background: 'var(--surface)' }}
              />
              <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {candidates.map(c => (
                  <div key={c.id} onClick={() => { onMoveTo(person.id, c.id); setMovePickerOpen(false); setMoveQuery(''); }}
                    style={{ padding: '6px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: colorFor(c.id), color: '#fff', fontSize: 9, fontWeight: 600, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      {initials(c.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{c.role} · LV{c.lv}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Collaborators (dotted lines — bidirectional) */}
        <div className="sb-sect">
          <h4>ทำงานร่วมกัน · Collaborators ({collaboratorIds.length})</h4>
          {collaboratorIds.length === 0 ? (
            <div className="empty-state" style={{ padding: '8px 0', fontSize: 11 }}>ยังไม่มีผู้ร่วมงาน</div>
          ) : (
            <div className="team-list">
              {collaboratorIds.map(cid => {
                const c = byId[cid];
                if (!c) return null;
                return (
                  <div key={cid} className="report-line">
                    <div className="avi" style={{ background: colorFor(cid) }} onClick={() => onFocus(cid)} title="ดูในแผนภูมิ">
                      {c.photo ? <img src={c.photo} alt="" /> : initials(c.name)}
                    </div>
                    <div className="info" style={{ cursor: 'pointer' }} onClick={() => onFocus(cid)}>
                      <div className="nm">{c.name}</div>
                      <div className="rl">{c.role} · LV{c.lv}</div>
                    </div>
                    <button className="btn-sm danger" onClick={() => onRemoveCollaborator && onRemoveCollaborator(cid)} title="ลบความสัมพันธ์">
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <button className="btn-sm" onClick={() => setCollabPickerOpen(o => !o)}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              เพิ่มผู้ร่วมงาน
            </button>
          </div>
          {collabPickerOpen && (
            <div style={{ marginTop: 8, background: 'var(--bg-2)', borderRadius: 8, padding: 8 }}>
              <input
                autoFocus
                placeholder="ค้นหาคนเพื่อเพิ่ม..."
                value={collabQuery}
                onChange={(e) => setCollabQuery(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 12, marginBottom: 6, background: 'var(--surface)' }}
              />
              <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {allPeople
                  .filter(p => p.id !== person.id && !collaboratorIds.includes(p.id))
                  .filter(p => !collabQuery || p.name.includes(collabQuery) || p.role.toLowerCase().includes(collabQuery.toLowerCase()))
                  .slice(0, 12)
                  .map(c => (
                    <div key={c.id} onClick={() => { onAddCollaborator && onAddCollaborator(c.id); setCollabPickerOpen(false); setCollabQuery(''); }}
                      style={{ padding: '6px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: colorFor(c.id), color: '#fff', fontSize: 9, fontWeight: 600, display: 'grid', placeItems: 'center', flexShrink: 0, overflow: 'hidden' }}>
                        {c.photo ? <img src={c.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(c.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{c.role} · LV{c.lv}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="18" height="3" viewBox="0 0 18 3"><line x1="0" y1="1.5" x2="18" y2="1.5" stroke="var(--mint, #4FD1A5)" strokeWidth="1.6" strokeDasharray="3 3" /></svg>
            เส้นประสีเขียวบนแผนภูมิ = ผู้ร่วมงาน
          </div>
        </div>

        {/* Direct reports */}
        {kids.length > 0 && (
          <div className="sb-sect">
            <h4>ผู้ใต้บังคับบัญชาตรง · Direct reports ({kids.length})</h4>
            <div className="team-list">
              {kids.map(k => (
                <div key={k.id} className="report-line" style={{ cursor: 'pointer' }} onClick={() => onFocus(k.id)}>
                  <div className="avi" style={{ background: colorFor(k.id) }}>
                    {k.photo ? <img src={k.photo} alt="" /> : initials(k.name)}
                  </div>
                  <div className="info">
                    <div className="nm">{k.name}</div>
                    <div className="rl">{k.role} · LV{k.lv}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="sb-sect">
          <h4>การดำเนินการ · Actions</h4>
          <div className="action-row">
            <button className="btn-sm primary" onClick={() => onAddChild(person.id)}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              เพิ่มลูกทีม
            </button>
            <button className="btn-sm danger" onClick={() => {
              if (confirm(`ลบ ${person.name} ออกจากองค์กร?`)) onDelete(person.id);
            }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 5h8M6 5V4a1 1 0 011-1h2a1 1 0 011 1v1M5 5l.7 8.1A1 1 0 006.7 14h2.6a1 1 0 001-.9L11 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ปลดออก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function lvLabel(lv) {
  if (lv >= 9) return 'Executive';
  if (lv >= 7) return 'Senior Lead';
  if (lv >= 5) return 'Manager';
  if (lv >= 3) return 'Staff';
  return 'Trainee';
}

window.Sidebar = Sidebar;
