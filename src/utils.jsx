// Utility functions: tree layout, color helpers, initials, etc.

// LV → color (mint LV1 → coral LV10)
const LV_COLORS = {
  1:  '#9FE3C8',
  2:  '#7BD9B5',
  3:  '#4FD1A5',
  4:  '#79CDA0',
  5:  '#FFC857',
  6:  '#FFA94D',
  7:  '#FF8A3D',
  8:  '#FF7449',
  9:  '#FF6B47',
  10: '#E04A2E',
};
function lvColor(lv) { return LV_COLORS[Math.max(1, Math.min(10, lv))] || '#FF6B47'; }

// Stable color from string (for avatar background)
const AVATAR_PALETTE = ['#FF6B47', '#FF8A3D', '#FFC857', '#4FD1A5', '#7CC4F0', '#B89BE5', '#FFB5BA', '#FF7449', '#5DAFA0'];
function colorFor(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

// hex → rgba
function rgba(hex, alpha) {
  const h = String(hex || '').replace('#', '');
  const full = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0').slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function initials(name) {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] || '') + (parts[parts.length - 1][0] || '');
}

// Build map id → person, parent → children
function buildTree(people) {
  // Defensive: ensure we always work with an array (Firestore / localStorage
  // can occasionally return null/undefined/object instead of an array).
  if (!Array.isArray(people)) people = [];
  const byId = {};
  const childrenOf = {};
  for (const p of people) {
    byId[p.id] = p;
    childrenOf[p.id] = childrenOf[p.id] || [];
  }
  for (const p of people) {
    if (p.parentId && byId[p.parentId]) {
      (childrenOf[p.parentId] = childrenOf[p.parentId] || []).push(p.id);
    }
  }
  for (const k in childrenOf) {
    childrenOf[k].sort((a, b) => {
      const pa = byId[a], pb = byId[b];
      if (pa.deptId !== pb.deptId) return pa.deptId.localeCompare(pb.deptId);
      return pb.lv - pa.lv || pa.name.localeCompare(pb.name, 'th');
    });
  }
  const roots = people.filter(p => !p.parentId || !byId[p.parentId]).map(p => p.id);
  return { byId, childrenOf, roots };
}

// Tree layout — tidy top-down.
// Returns { pos, roleGroups } for tree mode; plain pos object for other modes.
//
// "Role groups": when a parent has > ROLE_GROUP_THRESHOLD children that share
// the same role, the same LV, and are all effective leaves (no visible
// children), they are collapsed into ONE summary card (the "representative").
// All other members are "suppressed" — they have no layout position and are
// rendered as part of the summary card instead of individual cards.
function layoutTree(rootIds, childrenOf, byId, opts) {
  const { nodeW, nodeH, hGap, vGap, collapsed = {}, mode = 'tree' } = opts;
  const pos = {};

  // ── Vertical mode ──────────────────────────────────────────────────────────
  if (mode === 'vertical') {
    let y = 0;
    const recur = (id, depth) => {
      pos[id] = { x: depth * 60, y, depth, subtreeWidth: nodeW };
      y += nodeH + 8;
      if (collapsed[id]) return;
      for (const c of (childrenOf[id] || [])) recur(c, depth + 1);
    };
    for (const r of rootIds) recur(r, 0);
    return pos;
  }

  // ── Radial mode ────────────────────────────────────────────────────────────
  if (mode === 'radial') {
    const visit = (id, depth, parentAngle, span) => {
      const kids = collapsed[id] ? [] : (childrenOf[id] || []);
      if (depth === 0) {
        pos[id] = { x: 0, y: 0, depth, subtreeWidth: nodeW };
      } else {
        const radius = depth * 220;
        pos[id] = {
          x: Math.cos(parentAngle) * radius,
          y: Math.sin(parentAngle) * radius,
          depth,
          subtreeWidth: nodeW,
        };
      }
      if (kids.length === 0) return;
      const childSpan = span / kids.length;
      const start = parentAngle - span / 2 + childSpan / 2;
      kids.forEach((c, i) => visit(c, depth + 1, start + i * childSpan, childSpan));
    };
    rootIds.forEach((r, i) => {
      visit(r, 0, -Math.PI / 2 + i * (2 * Math.PI / rootIds.length), Math.PI * 2 / rootIds.length);
    });
    return pos;
  }

  // ── Tree mode ──────────────────────────────────────────────────────────────
  const ROLE_GROUP_THRESHOLD = 4; // group when count > this (i.e. 5+)

  // Step 1: detect role groups and build suppressedIds
  // roleGroups: repId → { parentId, lv, role, deptId, members[] }
  const roleGroups = {};
  const suppressedIds = new Set();

  for (const parentId in childrenOf) {
    if (collapsed[parentId]) continue;
    if (!byId[parentId]) continue;
    const allKids = (childrenOf[parentId] || []).filter(k => byId[k]);
    // Quick pre-filter: need at least threshold+1 kids to form any group
    if (allKids.length <= ROLE_GROUP_THRESHOLD) continue;

    // Group kids by role (skip empty roles)
    const byRole = {};
    for (const k of allKids) {
      const role = (byId[k].role || '').trim();
      if (!role) continue;
      (byRole[role] = byRole[role] || []).push(k);
    }

    for (const role in byRole) {
      const candidates = byRole[role];
      if (candidates.length <= ROLE_GROUP_THRESHOLD) continue;

      // All must share the same LV
      const lvSet = new Set(candidates.map(k => byId[k].lv));
      if (lvSet.size !== 1) continue;

      // All must be effective leaves (no visible children)
      const allLeaves = candidates.every(k =>
        (childrenOf[k] || []).length === 0 || collapsed[k]
      );
      if (!allLeaves) continue;

      const lv = [...lvSet][0];
      const rep = candidates[0];
      roleGroups[rep] = {
        parentId,
        lv,
        role,
        deptId: byId[rep].deptId,
        members: candidates,     // members[0] === rep
      };
      for (const m of candidates.slice(1)) suppressedIds.add(m);
    }
  }

  // Step 2: count visible nodes per LV (excluding suppressed)
  const ALL_LVS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const countByLv = {};
  for (const id in byId) {
    if (suppressedIds.has(id)) continue;
    const p = byId[id];
    countByLv[p.lv] = (countByLv[p.lv] || 0) + 1;
  }

  // Step 3: LV row Y positions
  const lvRowY = opts.lvRowY || (() => {
    const m = {};
    let cumY = 0;
    for (const lv of ALL_LVS) {
      m[lv] = cumY;
      const c = countByLv[lv] || 0;
      const rowH = c === 0
        ? Math.round(nodeH * 0.4)
        : nodeH + vGap + Math.max(0, c - 3) * 6;
      cumY += rowH;
    }
    return m;
  })();

  // Step 4: subtree widths (effective kids only — suppressed excluded)
  const subWidth = {};
  const computeWidth = (id) => {
    if (suppressedIds.has(id)) { subWidth[id] = nodeW; return nodeW; }
    const kids = (collapsed[id] ? [] : (childrenOf[id] || []))
      .filter(k => !suppressedIds.has(k));
    if (kids.length === 0) {
      subWidth[id] = nodeW;
      return nodeW;
    }
    let total = 0;
    for (const c of kids) total += computeWidth(c) + hGap;
    total -= hGap;
    subWidth[id] = Math.max(nodeW, total);
    return subWidth[id];
  };
  for (const r of rootIds) computeWidth(r);

  // Step 5: placement order (center-sort)
  const centerArrange = (items) => {
    const sorted = [...items].sort((a, b) => b.w - a.w);
    const out = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i % 2 === 0) out.push(sorted[i]);
      else out.unshift(sorted[i]);
    }
    return out;
  };
  const placementOrder = {};
  for (const parentId in childrenOf) {
    const kids = (childrenOf[parentId] || []).filter(k => !suppressedIds.has(k));
    if (kids.length <= 1) { placementOrder[parentId] = kids.slice(); continue; }
    const groups = {};
    const groupOrder = [];
    for (const k of kids) {
      const d = byId[k]?.deptId || '_';
      if (!groups[d]) { groups[d] = []; groupOrder.push(d); }
      groups[d].push(k);
    }
    const groupInfo = groupOrder.map(d => {
      const arranged = centerArrange(groups[d].map(id => ({ id, w: subWidth[id] || nodeW })));
      const totalW = arranged.reduce((s, x) => s + x.w, 0);
      return { d, kids: arranged.map(x => x.id), w: totalW };
    });
    const arrangedGroups = centerArrange(groupInfo);
    placementOrder[parentId] = arrangedGroups.flatMap(g => g.kids);
  }

  // Step 6: place nodes (skip suppressed)
  const place = (id, x) => {
    if (suppressedIds.has(id)) return;
    const w = subWidth[id];
    const person = byId[id];
    const y = lvRowY[person.lv] ?? 0;
    pos[id] = { x: x + (w - nodeW) / 2, y, depth: person.lv, subtreeWidth: w };
    if (collapsed[id]) return;
    const kidList = (placementOrder[id] || childrenOf[id] || [])
      .filter(k => !suppressedIds.has(k));
    let cursorX = x;
    for (const c of kidList) {
      const cw = subWidth[c];
      place(c, cursorX);
      cursorX += cw + hGap;
    }
  };
  let rootX = 0;
  for (const r of rootIds) {
    if (suppressedIds.has(r)) continue;
    place(r, rootX);
    rootX += subWidth[r] + hGap * 2;
  }

  return { pos, roleGroups };
}

// Path of ancestors for breadcrumb
function ancestorPath(byId, id) {
  const path = [];
  let cur = byId[id];
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? byId[cur.parentId] : null;
  }
  return path;
}

// Count descendants
function countDescendants(id, childrenOf) {
  const stack = [...(childrenOf[id] || [])];
  let n = 0;
  while (stack.length) {
    const x = stack.pop();
    n++;
    stack.push(...(childrenOf[x] || []));
  }
  return n;
}

// Format relative time
function relTime(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'เมื่อสักครู่';
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ชม.ที่แล้ว`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d} วันที่แล้ว`;
  return new Date(ts).toLocaleDateString('th-TH');
}

Object.assign(window, {
  LV_COLORS, lvColor, AVATAR_PALETTE, colorFor, initials,
  buildTree, layoutTree, ancestorPath, countDescendants, relTime, rgba,
});
