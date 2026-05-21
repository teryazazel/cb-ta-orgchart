// NodeCard component — the org chart card

function Avatar({ person, size = 44 }) {
  const bg = colorFor(person.id || person.name);
  const style = { width: size, height: size, background: bg, fontSize: size * 0.36 };
  return (
    <div className="node-avatar" style={style}>
      {person.photo
        ? <img src={person.photo} alt="" />
        : <span>{initials(person.name)}</span>}
    </div>
  );
}

function LvBadge({ lv }) {
  return (
    <span className="lv-badge" style={{ '--lv-color': lvColor(lv) }}>
      LV{lv}
    </span>
  );
}

function NodeCard({
  person,
  pos,
  width,
  selected,
  searchHit,
  dimmed,
  dropTarget,
  dragging,
  density,
  showPhoto,
  showLvBadge,
  childCount,
  isCollapsed,
  hasChildren,
  dept,
  onClick,
  onPointerDown,
  onToggleCollapse,
}) {
  const cls = [
    'node',
    `dens-${density}`,
    density,
    selected && 'selected',
    searchHit && 'search-hit',
    dimmed && 'dimmed',
    dropTarget && 'drop-target',
    dragging && 'dragging',
    !showPhoto && 'no-photo',
  ].filter(Boolean).join(' ');

  const barColor = dept?.color || lvColor(person.lv);

  return (
    <div
      className={cls}
      data-id={person.id}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        width,
        '--bar-color': barColor,
      }}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      <div className="node-strip" />
      <div className="node-body">
        {showPhoto && (
          <Avatar
            person={person}
            size={density === 'compact' ? 32 : density === 'detailed' ? 52 : 44}
          />
        )}
        <div className="node-info">
          <div className="node-role">{person.role}</div>
          <div className="node-name">{person.name}</div>
          {density !== 'compact' && dept && (
            <div className="node-dept">{dept.name}</div>
          )}
        </div>
      </div>
      <div className="node-meta">
        {showLvBadge && <LvBadge lv={person.lv} />}
        {hasChildren && childCount > 0 && (
          <span className="count-pill">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              <circle cx="5" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="11" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M2 13c.5-1.6 1.7-2.4 3-2.4M14 13c-.5-1.6-1.7-2.4-3-2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            {childCount}
          </span>
        )}
      </div>
      {hasChildren && (
        <button
          className="node-expand"
          onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
          title={isCollapsed ? 'ขยาย' : 'ยุบ'}
        >
          {isCollapsed ? '+' : '–'}
        </button>
      )}
    </div>
  );
}

// GroupCard — shown instead of individual cards when a parent has > 4
// children sharing the same role + LV. Displays count + name preview.
function GroupCard({
  group,        // { lv, role, deptId, members[] }
  byId,         // map id → person (for name preview)
  pos,
  width,
  selected,
  density,
  showLvBadge,
  dept,
  onPointerDown,
  onClick,
}) {
  const barColor = dept?.color || lvColor(group.lv);
  const count = group.members.length;
  // Resolve first few members for name preview
  const preview = group.members
    .slice(0, density === 'compact' ? 2 : 3)
    .map(id => byId?.[id])
    .filter(Boolean);
  const remaining = count - preview.length;

  const cls = [
    'node', 'group-card', `dens-${density}`,
    selected && 'selected',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cls}
      data-id={group.members[0]}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, width, '--bar-color': barColor }}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <div className="node-strip" />
      {/* Top section: icon + role + count */}
      <div className="node-body">
        <div className="group-avatar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="8"  cy="7.5" r="2.4" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="16" cy="7.5" r="2.4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 19c.7-3 2.8-4.5 6-4.5s5.3 1.5 6 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M16 14.5c2.8.4 4.5 1.8 5.2 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="node-info">
          <div className="node-role">{group.role}</div>
          <div className="group-count-label">{count} คน</div>
        </div>
      </div>

      {/* Name preview list */}
      <div className="group-member-preview">
        {preview.map(p => (
          <div key={p.id} className="group-member-line">
            <span
              className="group-member-dot"
              style={{ background: colorFor(p.id) }}
            />
            <span className="group-member-name">{p.name}</span>
          </div>
        ))}
        {remaining > 0 && (
          <div className="group-member-more">+{remaining} คน</div>
        )}
      </div>

      <div className="node-meta">
        {showLvBadge && <LvBadge lv={group.lv} />}
        {dept && density !== 'compact' && (
          <span className="group-dept-tag" style={{ color: barColor }}>
            {dept.name}
          </span>
        )}
      </div>
    </div>
  );
}

window.NodeCard = NodeCard;
window.GroupCard = GroupCard;
window.Avatar = Avatar;
window.LvBadge = LvBadge;
