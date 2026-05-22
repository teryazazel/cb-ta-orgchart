// Main app component — state, actions, glue
console.log('%c[app.jsx] LOADED v5', 'color:#4FD1A5;font-weight:bold');

// Global click logger to debug click event flow
if (!window.__globalClickLoggerInstalled) {
  window.__globalClickLoggerInstalled = true;
  document.addEventListener('click', (e) => {
    const t = e.target;
    const tag = t.tagName;
    const cls = t.className && typeof t.className === 'string' ? t.className.slice(0, 60) : '';
    const txt = (t.innerText || t.textContent || '').slice(0, 40).replace(/\n/g, ' ');
    console.log('%c[global click]', 'color:#888', tag, cls, '|', txt);
  }, true); // capture phase, so we always see clicks
  console.log('[global click logger] installed');
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "layout": "tree",
  "density": "normal",
  "showPhoto": true,
  "showLvBadge": true,
  "dark": false,
  "palette": ["#FF6B47", "#FFC857", "#4FD1A5"]
}/*EDITMODE-END*/;

function App() {
  // ── Auth ─────────────────────────────────────────────
  const { user, role } = (typeof useAuth === 'function') ? useAuth() : { user: null, role: 'admin' };
  const canWrite = role === 'admin' || role === 'editor';
  const [showUserMgmt, setShowUserMgmt] = React.useState(false);

  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply theme
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', t.dark ? 'dark' : 'light');
  }, [t.dark]);
  React.useEffect(() => {
    if (Array.isArray(t.palette) && t.palette.length >= 1) {
      document.documentElement.style.setProperty('--coral', t.palette[0]);
      if (t.palette[1]) document.documentElement.style.setProperty('--butter', t.palette[1]);
      if (t.palette[2]) document.documentElement.style.setProperty('--mint', t.palette[2]);
    }
  }, [t.palette]);

  // Data state — load from localStorage if present, else fall back to seed
  const loadSaved = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      // If we expect an array fallback, force an array result (defends against
      // corrupted localStorage that stored null / an object / the wrapped
      // {value:[...]} shape PowerShell-ConvertTo-Json produces).
      if (Array.isArray(fallback)) {
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.value)) return parsed.value;
        return fallback;
      }
      return parsed;
    } catch (e) { return fallback; }
  };
  // Helper: coerce arbitrary value to an array (used when applying remote state).
  // Also unwraps PowerShell-ConvertTo-Json's {value:[...], Count:N} shape that
  // a previous bake/migration step may have written into Firestore.
  const asArr = (v) => {
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object' && Array.isArray(v.value)) return v.value;
    return [];
  };
  const SEED = window.SEED_DATA || {};
  const [people, setPeople] = React.useState(() => asArr(loadSaved('orgPeople', SEED.people || [])));
  const [departments, setDepartments] = React.useState(() => asArr(loadSaved('orgDepartments', SEED.departments || [])));
  const [history, setHistory] = React.useState(() => asArr(loadSaved('orgHistory', SEED.history || [])));
  // Non-hierarchical "works with / coordinates with" links — bidirectional pairs
  const [collaborations, setCollaborations] = React.useState(() => asArr(loadSaved('orgCollaborations', SEED.collaborations || [])));
  // Co-oversight: [{deptId, personId}] — extra management links for the dept overview
  const [coOversight, setCoOversight] = React.useState(() => asArr(loadSaved('orgCoOversight', SEED.coOversight || [])));
  // Dept-to-dept oversight links: [{from, to}] — dashed edges in dept overview
  const [deptLinks, setDeptLinks] = React.useState(() => asArr(loadSaved('orgDeptLinks', SEED.deptLinks || [])));

  // Persist on every change
  React.useEffect(() => {
    try { localStorage.setItem('orgPeople', JSON.stringify(people)); } catch (e) {
      console.warn('Could not persist people:', e);
    }
  }, [people]);
  React.useEffect(() => {
    try { localStorage.setItem('orgDepartments', JSON.stringify(departments)); } catch (e) {}
  }, [departments]);
  React.useEffect(() => {
    try {
      // Keep last 500 entries to avoid unbounded growth
      const trimmed = history.length > 500 ? history.slice(-500) : history;
      localStorage.setItem('orgHistory', JSON.stringify(trimmed));
    } catch (e) {}
  }, [history]);
  React.useEffect(() => {
    try { localStorage.setItem('orgCollaborations', JSON.stringify(collaborations)); } catch (e) {}
  }, [collaborations]);
  React.useEffect(() => {
    try { localStorage.setItem('orgCoOversight', JSON.stringify(coOversight)); } catch (e) {}
  }, [coOversight]);
  React.useEffect(() => {
    try { localStorage.setItem('orgDeptLinks', JSON.stringify(deptLinks)); } catch (e) {}
  }, [deptLinks]);

  // Branding (persists in localStorage, falls back to seed)
  const [orgName, setOrgName] = React.useState(() => {
    try { return localStorage.getItem('orgName') || SEED.name || 'CB TA TRADING'; }
    catch (e) { return SEED.name || 'CB TA TRADING'; }
  });
  const [logoUrl, setLogoUrl] = React.useState(() => {
    try {
      const stored = localStorage.getItem('orgLogo');
      if (stored !== null) return stored;
      return SEED.logo || '';
    } catch (e) { return SEED.logo || ''; }
  });
  React.useEffect(() => {
    try { localStorage.setItem('orgName', orgName || ''); } catch (e) {}
    document.title = (orgName || 'CB TA TRADING') + ' · Org Chart';
  }, [orgName]);
  React.useEffect(() => {
    try {
      if (logoUrl) localStorage.setItem('orgLogo', logoUrl);
      else localStorage.removeItem('orgLogo');
    } catch (e) {}
  }, [logoUrl]);

  // ── Firestore real-time sync ─────────────────────────
  // Push/pull these fields between every connected client.
  // Per-user view state (zoom, custom positions, collapsed) stays local.
  const syncedState = React.useMemo(() => ({
    people, departments, collaborations, coOversight, deptLinks,
    orgName, logoUrl, history,
  }), [people, departments, collaborations, coOversight, deptLinks, orgName, logoUrl, history]);

  const applyRemote = React.useCallback((data) => {
    // Coerce array-typed fields so a malformed remote payload can't crash the
    // app with "X is not iterable" later in render.
    if (data.people         !== undefined) setPeople(asArr(data.people));
    if (data.departments    !== undefined) setDepartments(asArr(data.departments));
    if (data.collaborations !== undefined) setCollaborations(asArr(data.collaborations));
    if (data.coOversight    !== undefined) setCoOversight(asArr(data.coOversight));
    if (data.deptLinks      !== undefined) setDeptLinks(asArr(data.deptLinks));
    if (data.history        !== undefined) setHistory(asArr(data.history));
    if (data.orgName        !== undefined) setOrgName(data.orgName);
    if (data.logoUrl        !== undefined) setLogoUrl(data.logoUrl);
  }, []);

  const { syncStatus, didFirstLoad, bootstrap, forceWrite } = (typeof useFirestoreSync === 'function')
    ? useFirestoreSync(syncedState, applyRemote, canWrite, user?.uid)
    : { syncStatus: 'no-doc', didFirstLoad: true, bootstrap: async () => ({ didBootstrap: false }), forceWrite: async () => ({ ok: false }) };

  // Build a payload from the SEED constant (used by both auto-restore and the
  // manual "Restore from seed" admin button).
  const buildSeedPayload = React.useCallback(() => ({
    people:         asArr(SEED.people),
    departments:    asArr(SEED.departments),
    collaborations: asArr(SEED.collaborations),
    coOversight:    asArr(SEED.coOversight),
    deptLinks:      asArr(SEED.deptLinks),
    history:        asArr(SEED.history),
    orgName:        SEED.name || 'CB TA TRADING',
    logoUrl:        SEED.logo || '',
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply a payload to all local state slots (used after a successful
  // restore-from-seed write to Firestore — so the UI updates immediately
  // without waiting for the onSnapshot round-trip).
  const applyPayloadLocal = React.useCallback((payload) => {
    setPeople(asArr(payload.people));
    setDepartments(asArr(payload.departments));
    setCollaborations(asArr(payload.collaborations));
    setCoOversight(asArr(payload.coOversight));
    setDeptLinks(asArr(payload.deptLinks));
    setHistory(asArr(payload.history));
    if (payload.orgName) setOrgName(payload.orgName);
    if (payload.logoUrl) setLogoUrl(payload.logoUrl);
  }, []);

  // Manual "Restore from seed" — admin can click this if auto-recovery missed
  const handleRestoreFromSeed = React.useCallback(async () => {
    console.log('%c[restore-seed] clicked', 'color:#FF6B47;font-weight:bold', {
      seedKeys: Object.keys(SEED),
      seedPeopleLen: Array.isArray(SEED.people) ? SEED.people.length : 'not-array',
      seedDeptsLen: Array.isArray(SEED.departments) ? SEED.departments.length : 'not-array',
      role,
      canWrite,
    });
    const seedPeople = Array.isArray(SEED.people) ? SEED.people : [];
    if (seedPeople.length === 0) {
      flashToast('ไม่พบ seed data — window.SEED_DATA.people ว่าง');
      console.error('[restore-seed] SEED.people is empty or not an array', SEED);
      return;
    }
    if (!confirm(`คืนค่าข้อมูลจาก seed (${seedPeople.length} คน) ทับข้อมูลปัจจุบัน?`)) {
      console.log('[restore-seed] user cancelled');
      return;
    }
    const payload = buildSeedPayload();
    console.log('[restore-seed] payload built', {
      peopleLen: payload.people.length,
      deptsLen: payload.departments.length,
    });
    const r = await forceWrite(payload);
    console.log('[restore-seed] forceWrite result', r);
    if (r.ok) {
      applyPayloadLocal(payload);
      flashToast(`คืนค่าจาก seed สำเร็จ (${seedPeople.length} คน)`);
    } else {
      flashToast('คืนค่าไม่สำเร็จ: ' + (r.reason || 'unknown'));
    }
  }, [buildSeedPayload, applyPayloadLocal, forceWrite, role, canWrite]); // eslint-disable-line react-hooks/exhaustive-deps

  // First-time migration: if Firestore is empty and we're admin, push local data up.
  // Also handles "doc exists but contains empty arrays" — happens when a previous
  // buggy version pushed empty/corrupted data up to Firestore.
  const bootstrapDoneRef = React.useRef(false);
  React.useEffect(() => {
    if (!didFirstLoad || role !== 'admin' || bootstrapDoneRef.current) return;
    if (syncStatus === 'connecting') return;

    const seedPeople = Array.isArray(SEED.people) ? SEED.people : [];
    console.log('[bootstrap-check]', {
      didFirstLoad, syncStatus, role,
      seedPeopleLen: seedPeople.length,
      peopleLen: people.length,
    });
    if (seedPeople.length === 0) return; // no seed → nothing to restore

    // Case A: doc doesn't exist yet → run normal bootstrap (push current state up)
    if (syncStatus === 'no-doc') {
      bootstrapDoneRef.current = true;
      bootstrap().then((r) => {
        if (r && r.didBootstrap) {
          flashToast('นำข้อมูล local ขึ้น Firestore — ทุกอุปกรณ์เห็นเหมือนกันแล้ว');
        }
      });
      return;
    }

    // Case B: doc exists but people array is empty → restore from seed.
    // Use forceWrite (direct Firestore set) instead of relying on the debounced
    // push effect, which can race with isApplyingRemoteRef and skip the write.
    if ((syncStatus === 'synced' || syncStatus === 'offline') && people.length === 0) {
      bootstrapDoneRef.current = true;
      console.log('%c[bootstrap] Restoring from seed (remote was empty)', 'color:#FF6B47;font-weight:bold');
      const payload = buildSeedPayload();
      forceWrite(payload).then((r) => {
        if (r.ok) {
          applyPayloadLocal(payload);
          flashToast(`คืนค่าจาก seed (${payload.people.length} คน) ซิงก์ขึ้น Firestore แล้ว`);
        } else {
          console.error('[bootstrap] forceWrite failed', r);
          flashToast('คืนค่าจาก seed ไม่สำเร็จ: ' + (r.reason || ''));
          bootstrapDoneRef.current = false; // allow retry
        }
      });
    }
  }, [didFirstLoad, syncStatus, role, people.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const [selectedId, setSelectedId] = React.useState(null);
  const [searchQ, setSearchQ] = React.useState('');
  // Live zoom level (mirrored from whichever canvas is mounted, used for toolbar display)
  const [currentZoom, setCurrentZoom] = React.useState(0.9);

  // Custom positions: when user drags a card onto empty canvas, we save where
  // they dropped it. Layout always honors customPos before falling back to the
  // tree-computed position.
  const [customPos, setCustomPos] = React.useState(() => loadSaved('orgCustomPos', SEED.customPos || {}));
  React.useEffect(() => {
    try { localStorage.setItem('orgCustomPos', JSON.stringify(customPos)); } catch (e) {}
  }, [customPos]);
  const setPersonPos = (id, x, y) => {
    setCustomPos(c => ({ ...c, [id]: { x, y } }));
  };
  const clearAllCustomPos = () => setCustomPos({});
  // Start with nodes at depth >= 2 collapsed so the initial view is readable
  const [collapsed, setCollapsed] = React.useState(() => {
    const saved = loadSaved('orgCollapsed', null);
    if (saved) return saved;
    if (SEED.collapsed && Object.keys(SEED.collapsed).length > 0) return SEED.collapsed;
    const tree = buildTree(SEED.people || []);
    const c = {};
    const recur = (id, depth) => {
      const kids = tree.childrenOf[id] || [];
      if (depth >= 2 && kids.length > 0) c[id] = true;
      for (const k of kids) recur(k, depth + 1);
    };
    for (const r of tree.roots) recur(r, 0);
    return c;
  });
  React.useEffect(() => {
    try { localStorage.setItem('orgCollapsed', JSON.stringify(collapsed)); } catch (e) {}
  }, [collapsed]);
  // View mode: 'people' = full org chart, 'depts' = department overview
  const [viewMode, setViewModeRaw] = React.useState('people');
  const setViewMode = (mode) => {
    setViewModeRaw(mode);
    setSelectedId(null); // clear selection when switching views
  };

  const [showHistory, setShowHistory] = React.useState(false);
  const [showAddPerson, setShowAddPerson] = React.useState(false);
  const [addPersonParent, setAddPersonParent] = React.useState(null);
  const [showAddDept, setShowAddDept] = React.useState(false);
  const [editDeptId, setEditDeptId] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  // ID of newly-added person — triggers auto-focus once they appear in layout
  const [pendingFocusId, setPendingFocusId] = React.useState(null);
  const toastTimer = React.useRef(null);

  // Derived
  const tree = React.useMemo(() => buildTree(people), [people]);
  const { byId, childrenOf, roots } = tree;

  const parentOf = React.useMemo(() => {
    const m = {};
    for (const p of people) if (p.parentId) m[p.id] = p.parentId;
    return m;
  }, [people]);

  const { nodeW, nodeH } = getDims(t.density);

  // Layout
  // layoutTree returns { pos, roleGroups } in tree mode, or plain pos in other modes.
  const { layout, roleGroups } = React.useMemo(() => {
    const result = layoutTree(roots, childrenOf, byId, {
      nodeW, nodeH,
      hGap: H_GAP,
      vGap: V_GAP,
      collapsed,
      mode: t.layout,
    });
    // Handle both return formats (tree → object, other modes → plain pos map)
    const base = (result && result.pos) ? result.pos : result;
    const groups = (result && result.roleGroups) ? result.roleGroups : {};

    // Apply custom positions. In tree mode, Y is locked to the LV row (so the
    // rule "same LV = same row" holds even after user drags); only X is free.
    for (const id in customPos) {
      if (!base[id]) continue;
      if (t.layout === 'tree') {
        base[id] = { ...base[id], x: customPos[id].x };
      } else {
        base[id] = { ...base[id], x: customPos[id].x, y: customPos[id].y };
      }
    }
    return { layout: base, roleGroups: groups };
  }, [roots, childrenOf, byId, nodeW, nodeH, collapsed, t.layout, customPos]);

  // Search hits
  const searchHits = React.useMemo(() => {
    const set = new Set();
    if (!searchQ.trim()) return set;
    const q = searchQ.toLowerCase();
    for (const p of people) {
      const dept = departments.find(d => d.id === p.deptId);
      if (
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        `LV${p.lv}`.toLowerCase().includes(q) ||
        dept?.name.toLowerCase().includes(q) ||
        dept?.nameEn.toLowerCase().includes(q)
      ) set.add(p.id);
    }
    return set;
  }, [people, departments, searchQ]);

  const searchResults = React.useMemo(() => {
    if (!searchQ.trim()) return [];
    return people.filter(p => searchHits.has(p.id)).slice(0, 8);
  }, [people, searchHits, searchQ]);

  const flashToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  const log = (type, who, msg) => {
    setHistory(h => [...h, { ts: Date.now(), type, who, msg }]);
  };

  // Permission guard — call at the top of any mutating action
  const requireWrite = () => {
    if (canWrite) return true;
    flashToast('🔒 โหมดดูอย่างเดียว — ติดต่อ Admin เพื่อขอสิทธิ์แก้ไข');
    return false;
  };

  // ── Actions ─────────────────────────────────────────
  const patchPerson = (id, patch, logMsg) => {
    if (!requireWrite()) return;
    setPeople(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p));
    if (logMsg) {
      const type = patch.lv != null
        ? (patch.lv > (byId[id]?.lv ?? 0) ? 'promote' : 'demote')
        : patch.parentId !== undefined ? 'move'
        : patch.name ? 'rename'
        : 'edit';
      log(type, id, logMsg);
      flashToast(logMsg);
    }
  };

  const reparent = (id, newParentId) => {
    if (!requireWrite()) return;
    if (id === newParentId) return;
    if (isDescendant(newParentId, id, childrenOf)) return;
    const p = byId[id], np = byId[newParentId];
    if (!p || !np) return;
    setPeople(ps => ps.map(x => x.id === id ? { ...x, parentId: newParentId, deptId: np.deptId } : x));
    log('move', id, `ย้าย ${p.name} → ภายใต้ ${np.name}`);
    flashToast(`ย้าย ${p.name} → ${np.name}`);
  };

  // Normalize a collaboration pair so order doesn't matter (a,b) === (b,a)
  const collabKey = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;

  const addCollaboration = (a, b) => {
    if (!requireWrite()) return;
    if (!a || !b || a === b) return;
    const key = collabKey(a, b);
    if (collaborations.some(c => collabKey(c.a, c.b) === key)) return;
    setCollaborations(cs => [...cs, { a, b }]);
    const pa = byId[a], pb = byId[b];
    log('edit', a, `เพิ่มผู้ร่วมงาน: ${pa?.name} ↔ ${pb?.name}`);
    flashToast(`เพิ่มผู้ร่วมงาน ${pa?.name} ↔ ${pb?.name}`);
  };

  const removeCollaboration = (a, b) => {
    if (!requireWrite()) return;
    const key = collabKey(a, b);
    setCollaborations(cs => cs.filter(c => collabKey(c.a, c.b) !== key));
    const pa = byId[a], pb = byId[b];
    log('edit', a, `ลบผู้ร่วมงาน: ${pa?.name} ↔ ${pb?.name}`);
    flashToast(`ลบผู้ร่วมงาน ${pa?.name} ↔ ${pb?.name}`);
  };

  // Co-oversight — secondary management links for the dept overview
  const addCoOversight = (deptId, personId) => {
    if (!requireWrite()) return;
    setCoOversight(cs => {
      if (cs.some(c => c.deptId === deptId && c.personId === personId)) return cs;
      return [...cs, { deptId, personId }];
    });
  };
  const removeCoOversight = (deptId, personId) => {
    if (!requireWrite()) return;
    setCoOversight(cs => cs.filter(c => !(c.deptId === deptId && c.personId === personId)));
  };

  // Sub-branches inside a dept (e.g., Branch dept → physical branch locations)
  const addBranch = (deptId, name, nameEn) => {
    if (!requireWrite()) return;
    if (!deptId || !name) return;
    const newBranch = { id: 'br-' + Math.random().toString(36).slice(2, 7), name, nameEn: nameEn || '' };
    setDepartments(ds => ds.map(d => d.id === deptId
      ? { ...d, branches: [...(d.branches || []), newBranch] }
      : d
    ));
    const dept = departments.find(d => d.id === deptId);
    log('create', null, `เพิ่มสาขา "${name}" ใน "${dept?.name}"`);
    flashToast(`เพิ่มสาขา ${name}`);
  };
  const editBranch = (deptId, branchId, patch) => {
    if (!requireWrite()) return;
    setDepartments(ds => ds.map(d => d.id === deptId
      ? { ...d, branches: (d.branches || []).map(b => b.id === branchId ? { ...b, ...patch } : b) }
      : d
    ));
  };
  const deleteBranch = (deptId, branchId) => {
    if (!requireWrite()) return;
    const dept = departments.find(d => d.id === deptId);
    const br = (dept?.branches || []).find(b => b.id === branchId);
    setDepartments(ds => ds.map(d => d.id === deptId
      ? { ...d, branches: (d.branches || []).filter(b => b.id !== branchId) }
      : d
    ));
    if (br) {
      log('delete', null, `ลบสาขา "${br.name}" ใน "${dept?.name}"`);
      flashToast(`ลบสาขา ${br.name}`);
    }
  };

  // Dept→dept oversight links (e.g., Operation + Operation Support both manage Branch)
  const addDeptLink = (fromDeptId, toDeptId) => {
    if (!requireWrite()) return;
    if (!fromDeptId || !toDeptId || fromDeptId === toDeptId) return;
    setDeptLinks(ls => {
      if (ls.some(l => l.from === fromDeptId && l.to === toDeptId)) return ls;
      return [...ls, { from: fromDeptId, to: toDeptId }];
    });
    const fd = departments.find(d => d.id === fromDeptId);
    const td = departments.find(d => d.id === toDeptId);
    log('edit', null, `เชื่อม "${fd?.name}" ดูแล "${td?.name}"`);
    flashToast(`เชื่อม ${fd?.name} ดูแล ${td?.name}`);
  };
  const removeDeptLink = (fromDeptId, toDeptId) => {
    if (!requireWrite()) return;
    setDeptLinks(ls => ls.filter(l => !(l.from === fromDeptId && l.to === toDeptId)));
  };

  // Get list of collaborator IDs for a given person
  const collaboratorsOf = React.useMemo(() => {
    const m = {};
    for (const c of collaborations) {
      (m[c.a] = m[c.a] || []).push(c.b);
      (m[c.b] = m[c.b] || []).push(c.a);
    }
    return m;
  }, [collaborations]);

  // Change a person's dept, propagating to descendants who currently share the
  // same old dept (so a whole team moves with its manager — matches what
  // happens when a person is first created under a parent and inherits dept).
  const changeDept = (id, newDeptId) => {
    if (!requireWrite()) return;
    const p = byId[id];
    if (!p) return;
    const oldDeptId = p.deptId;
    if (oldDeptId === newDeptId) return;
    const newDept = departments.find(d => d.id === newDeptId);
    const toMove = new Set([id]);
    const stack = [...(childrenOf[id] || [])];
    while (stack.length) {
      const cid = stack.pop();
      const c = byId[cid];
      if (c && c.deptId === oldDeptId) {
        toMove.add(cid);
        stack.push(...(childrenOf[cid] || []));
      }
    }
    setPeople(ps => ps.map(x => toMove.has(x.id) ? { ...x, deptId: newDeptId } : x));
    const n = toMove.size;
    log('move', id, `ย้ายฝ่าย ${p.name}${n > 1 ? ` + ลูกทีม ${n - 1} คน` : ''} → "${newDept?.name || '-'}"`);
    flashToast(n > 1
      ? `ย้าย ${p.name} + ลูกทีม ${n - 1} คน → ${newDept?.name}`
      : `ย้าย ${p.name} → ${newDept?.name}`);
  };

  // Cut the reporting line: child becomes a root (no parent). Used by the
  // edge-click menu in the canvas.
  const detach = (id) => {
    if (!requireWrite()) return;
    const p = byId[id];
    if (!p || !p.parentId) return;
    const oldParent = byId[p.parentId];
    setPeople(ps => ps.map(x => x.id === id ? { ...x, parentId: null } : x));
    log('move', id, `ตัดสาย ${p.name} ออกจาก ${oldParent?.name || 'หัวหน้าเดิม'}`);
    flashToast(`ตัดสาย — ${p.name} กลายเป็นรากใหม่`);
  };

  const deletePerson = (id) => {
    if (!requireWrite()) return;
    const p = byId[id];
    if (!p) return;
    const kids = (childrenOf[id] || []).map(kid => byId[kid]);

    // Pick a successor: highest-LV child in same dept; fallback to highest-LV overall;
    // tiebreak by largest sub-team size.
    let successor = null;
    if (kids.length > 0) {
      const sameDept = kids.filter(k => k.deptId === p.deptId);
      const pool = sameDept.length > 0 ? sameDept : kids;
      const teamSize = (rootId) => {
        let n = 0;
        const stk = [...(childrenOf[rootId] || [])];
        while (stk.length) { n++; stk.push(...(childrenOf[stk.pop()] || [])); }
        return n;
      };
      pool.sort((a, b) =>
        (b.lv || 0) - (a.lv || 0) ||
        teamSize(b.id) - teamSize(a.id) ||
        a.name.localeCompare(b.name, 'th')
      );
      successor = pool[0];
    }

    setPeople(ps => ps
      .map(x => {
        if (x.parentId !== id) return x;
        if (successor && x.id === successor.id) {
          // Successor moves up to take deleted person's spot. Keep their LV
          // intact — no auto-promotion (user can promote manually if desired).
          return { ...x, parentId: p.parentId };
        }
        // Other children report to the successor (or grandparent if no successor exists)
        return { ...x, parentId: successor ? successor.id : p.parentId };
      })
      .filter(x => x.id !== id)
    );
    // Drop any collaboration links involving this person
    setCollaborations(cs => cs.filter(c => c.a !== id && c.b !== id));

    let msg = `ปลด ${p.name} ออกจากองค์กร`;
    if (successor) msg += ` · ${successor.name} รับผู้ใต้บังคับบัญชาแทน`;
    log('delete', id, msg);
    flashToast(successor
      ? `ลบ ${p.name} แล้ว — ${successor.name} รับผู้ใต้บังคับบัญชาแทน`
      : `ลบ ${p.name} แล้ว`);
    setSelectedId(null);
  };

  const addPerson = (data) => {
    if (!requireWrite()) return;
    // data may be a single object OR an array (group add from modal)
    const items = Array.isArray(data) ? data : [data];

    // Generate IDs up-front so we can use them for position + selection
    const additions = items.map(item => ({
      id: 'p' + Math.random().toString(36).slice(2, 8),
      ...item,
    }));

    // In tree mode: give new cards an initial X near their parent so they
    // don't fly off to a far corner. Y is always locked to the LV row.
    const firstParentId = additions[0]?.parentId;
    if (firstParentId && layout[firstParentId] && t.layout === 'tree') {
      const parentPos = layout[firstParentId];
      setCustomPos(cp => {
        const next = { ...cp };
        additions.forEach((a, i) => {
          next[a.id] = { x: parentPos.x + i * 14, y: parentPos.y };
        });
        return next;
      });
    }

    setPeople(ps => [...ps, ...additions]);

    if (additions.length === 1) {
      log('create', additions[0].id, `เพิ่ม ${additions[0].name} (${additions[0].role}) เข้าองค์กร`);
      flashToast(`เพิ่ม ${additions[0].name} แล้ว`);
    } else {
      additions.forEach(a => log('create', a.id, `เพิ่ม ${a.name} (${a.role}) เข้าองค์กร`));
      flashToast(`เพิ่ม ${additions.length} คนเข้าองค์กรแล้ว`);
    }

    setShowAddPerson(false);
    setSelectedId(additions[0].id);
    // Schedule camera pan — fires once the first new node appears in the layout
    setPendingFocusId(additions[0].id);
  };

  const addDept = (data) => {
    if (!requireWrite()) return;
    const id = 'd-' + Math.random().toString(36).slice(2, 7);
    setDepartments(ds => [...ds, { id, ...data }]);
    log('create', null, `สร้างฝ่าย "${data.name}"`);
    flashToast(`สร้างฝ่าย ${data.name}`);
    setShowAddDept(false);
  };

  // Inline dept creation from AddPersonModal — returns the new dept ID
  const addDeptInline = (data) => {
    if (!requireWrite()) return null;
    const id = 'd-' + Math.random().toString(36).slice(2, 7);
    setDepartments(ds => [...ds, { id, ...data }]);
    log('create', null, `สร้างฝ่าย "${data.name}"`);
    flashToast(`สร้างฝ่าย ${data.name}`);
    return id;
  };

  const editDept = (id, patch) => {
    if (!requireWrite()) return;
    const prev = departments.find(d => d.id === id);
    setDepartments(ds => ds.map(d => d.id === id ? { ...d, ...patch } : d));
    if (prev && patch.name && prev.name !== patch.name) {
      log('rename', null, `เปลี่ยนชื่อฝ่าย "${prev.name}" → "${patch.name}"`);
      flashToast(`เปลี่ยนชื่อฝ่ายแล้ว`);
    } else {
      log('edit', null, `แก้ไขฝ่าย "${patch.name || prev?.name}"`);
      flashToast(`อัปเดตฝ่ายแล้ว`);
    }
    setEditDeptId(null);
  };

  const deleteDept = (id, reassignToId) => {
    if (!requireWrite()) return;
    console.log('[app] deleteDept called', { id, reassignToId });
    const dept = departments.find(d => d.id === id);
    if (!dept) {
      console.warn('[app] deleteDept: dept not found', id, 'available:', departments.map(d => d.id));
      return;
    }
    const affected = people.filter(p => p.deptId === id);

    if (affected.length > 0 && reassignToId) {
      // Reassign members to another dept
      const targetHead = people
        .filter(p =>
          p.deptId === reassignToId &&
          (!p.parentId || (byId[p.parentId] && byId[p.parentId].deptId !== id))
        )
        .sort((a, b) => (b.lv || 0) - (a.lv || 0))[0];

      setPeople(ps => ps.map(p => {
        if (p.deptId !== id) return p;
        const next = { ...p, deptId: reassignToId };
        if (!p.parentId && targetHead && p.id !== targetHead.id) {
          next.parentId = targetHead.id;
        }
        return next;
      }));
    } else if (affected.length > 0) {
      // No reassignment target — orphan the members (clear their deptId)
      setPeople(ps => ps.map(p => p.deptId === id ? { ...p, deptId: null } : p));
    }
    setDepartments(ds => {
      const next = ds.filter(d => d.id !== id);
      console.log('[app] deleteDept: departments before:', ds.length, 'after:', next.length);
      return next;
    });

    const target = reassignToId ? departments.find(d => d.id === reassignToId) : null;
    log('delete', null, `ลบฝ่าย "${dept.name}"` + (target ? ` · ย้าย ${affected.length} คน → "${target.name}"` : (affected.length > 0 ? ` · ${affected.length} คนกลายเป็นไม่มีฝ่าย` : '')));
    flashToast(`ลบฝ่าย ${dept.name} แล้ว` + (target ? ` (ย้าย ${affected.length} คน → ${target.name})` : ''));
    setEditDeptId(null);
  };

  const setPhoto = (id, dataUrl) => {
    if (!requireWrite()) return;
    const p = byId[id];
    setPeople(ps => ps.map(x => x.id === id ? { ...x, photo: dataUrl } : x));
    log('edit', id, `อัปเดตรูป ${p.name}`);
    flashToast(`อัปเดตรูปแล้ว`);
  };

  const toggleCollapse = (id) => {
    setCollapsed(c => ({ ...c, [id]: !c[id] }));
  };

  // Toggle every "head" person of a department (those whose parent is in another dept)
  const toggleDept = (deptId) => {
    const heads = [];
    for (const p of people) {
      const parentDept = p.parentId ? byId[p.parentId]?.deptId : null;
      if (p.deptId === deptId && parentDept !== deptId && (childrenOf[p.id] || []).length > 0) {
        heads.push(p.id);
      }
    }
    if (heads.length === 0) return;
    const allCollapsed = heads.every(id => collapsed[id]);
    setCollapsed(c => {
      const next = { ...c };
      for (const id of heads) next[id] = !allCollapsed;
      return next;
    });
  };

  // Focus camera on a node
  const focusOn = (id) => {
    const pos = layout[id];
    if (!pos || !window.__chartSetTransform) return;
    setSelectedId(id);
    const canvasEl = document.querySelector('.canvas');
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const cx = pos.x + nodeW / 2;
    const cy = pos.y + nodeH / 2;
    const k = Math.max(0.6, Math.min(1.2, window.__chartTransform?.k || 0.9));
    window.__chartSetTransform({
      k,
      x: rect.width / 2 - cx * k,
      y: rect.height / 2 - cy * k,
    });
  };

  // Auto-pan camera to a newly added person once they appear in layout
  React.useEffect(() => {
    if (!pendingFocusId || !layout[pendingFocusId]) return;
    focusOn(pendingFocusId);
    setPendingFocusId(null);
  }, [pendingFocusId, layout]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomBy = (factor) => {
    if (!window.__chartSetTransform) return;
    const t = window.__chartTransform || { x: 0, y: 0, k: 1 };
    const k = Math.max(0.2, Math.min(2.5, t.k * factor));
    const canvasEl = document.querySelector('.canvas');
    const rect = canvasEl.getBoundingClientRect();
    const mx = rect.width / 2, my = rect.height / 2;
    const scale = k / t.k;
    window.__chartSetTransform({
      k,
      x: mx - (mx - t.x) * scale,
      y: my - (my - t.y) * scale,
    });
  };

  // Set zoom to an exact level (1.0 = 100%), keeping viewport center as anchor
  const zoomTo = (targetK) => {
    if (!window.__chartSetTransform || !isFinite(targetK)) return;
    const t = window.__chartTransform || { x: 0, y: 0, k: 1 };
    const k = Math.max(0.2, Math.min(2.5, targetK));
    const canvasEl = document.querySelector('.canvas');
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const mx = rect.width / 2, my = rect.height / 2;
    const scale = k / t.k;
    window.__chartSetTransform({
      k,
      x: mx - (mx - t.x) * scale,
      y: my - (my - t.y) * scale,
    });
  };

  const zoomFit = () => {
    if (!window.__chartSetTransform) return;
    const canvasEl = document.querySelector('.canvas');
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    // Bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const id in layout) {
      const p = layout[id];
      if (p.x < minX) minX = p.x;
      if (p.x + nodeW > maxX) maxX = p.x + nodeW;
      if (p.y < minY) minY = p.y;
      if (p.y + nodeH > maxY) maxY = p.y + nodeH;
    }
    if (!isFinite(minX) || !isFinite(maxX)) {
      // Empty chart — center the viewport at origin
      window.__chartSetTransform({ k: 1, x: rect.width / 2, y: rect.height / 2 });
      return;
    }
    // Make room for LV row labels on the left (~80px scaled space)
    if (t.layout === 'tree') minX -= 80;
    const w = maxX - minX, h = maxY - minY;
    const pad = 60;
    const usableW = rect.width - pad * 2;
    const usableH = rect.height - pad * 2;
    const k = Math.min(usableW / w, usableH / h, 1.1);
    const kFinal = Math.max(0.32, k);
    const centerX = w * kFinal < usableW ? (usableW - w * kFinal) / 2 : 0;
    const centerY = h * kFinal < usableH ? (usableH - h * kFinal) / 2 : 0;
    window.__chartSetTransform({
      k: kFinal,
      x: pad - minX * kFinal + centerX,
      y: pad - minY * kFinal + centerY,
    });
  };

  // Auto-fit on mount + layout change
  React.useEffect(() => {
    const id = setTimeout(zoomFit, 100);
    return () => clearTimeout(id);
  }, [t.layout]);

  // Print — A4 landscape with approval signatures.
  // Strategy: compute fit-to-print-area transform, set it as a CSS variable on
  // .canvas-inner (which the @media print rule reads). The screen view is NOT
  // affected — no jumping/flicker.
  const onExport = () => {
    flashToast('กำลังเตรียมหน้าพิมพ์...');
    const innerEl = document.querySelector('.canvas-inner');
    if (innerEl) {
      // Collect bounding box of all positioned cards inside canvas-inner.
      // Cards use `transform: translate(x, y)` so we parse it from inline style.
      const cards = innerEl.querySelectorAll('.node, .sub-branch-card');
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      cards.forEach(c => {
        const m = (c.style.transform || '').match(/translate\(([-\d.]+)px[,\s]+([-\d.]+)px\)/);
        if (!m) return;
        const x = parseFloat(m[1]), y = parseFloat(m[2]);
        const w = c.offsetWidth  || 220;
        const h = c.offsetHeight || 108;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x + w > maxX) maxX = x + w;
        if (y + h > maxY) maxY = y + h;
      });
      if (isFinite(minX)) {
        const cw = maxX - minX, ch = maxY - minY;
        // Print canvas inner area at 96dpi (A4 landscape minus margins, header, footer).
        // Width:  277mm (page - 2×10mm margins) ≈ 1047 px
        // Height: 194mm app − 13mm header − 27mm footer − 6mm padding ≈ 148mm ≈ 560 px
        const printW = 1040, printH = 550;
        const fitK = Math.min(printW / cw, printH / ch, 1.5);
        const tx = (printW - cw * fitK) / 2 - minX * fitK;
        const ty = (printH - ch * fitK) / 2 - minY * fitK;
        innerEl.style.setProperty('--print-transform',
          `translate(${tx}px, ${ty}px) scale(${fitK})`);
      }
    }
    setTimeout(() => window.print(), 200);
  };

  const onSearchSelect = (id) => {
    setSearchQ('');
    focusOn(id);
  };

  const selected = selectedId ? byId[selectedId] : null;

  // Build the focused subtree label for breadcrumb
  const breadcrumbPath = selected ? ancestorPath(byId, selected.id) : [];

  // Print-only header/footer text
  const printDate = (() => {
    const d = new Date();
    const yy = d.getFullYear() + 543;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${yy}`;
  })();
  const printTitle = viewMode === 'depts' ? 'ผังโครงสร้างฝ่าย · Department Overview' : 'ผังโครงสร้างองค์กร · Organization Chart';

  return (
    <div className="app">
      {/* ── Print-only header (top of A4 page) ───────────────────────────── */}
      <div className="print-only print-header">
        <div className="ph-left">
          {logoUrl
            ? <img src={logoUrl} alt="" className="ph-logo" />
            : <div className="ph-logo ph-logo-fallback">{(orgName||'O').slice(0,1)}</div>}
          <div>
            <div className="ph-org">{orgName || 'องค์กร'}</div>
            <div className="ph-title">{printTitle}</div>
          </div>
        </div>
        <div className="ph-right">
          <div className="ph-meta">วันที่จัดทำ · Date</div>
          <div className="ph-date">{printDate}</div>
          <div className="ph-meta" style={{ marginTop: 4 }}>
            {viewMode === 'depts'
              ? `จำนวนฝ่าย: ${departments.length}`
              : `จำนวนพนักงาน: ${people.length} · ฝ่าย: ${departments.length}`}
          </div>
        </div>
      </div>

      <Toolbar
        searchQ={searchQ}
        setSearchQ={setSearchQ}
        searchResults={searchResults}
        onSelectSearch={onSearchSelect}
        zoom={currentZoom}
        onZoomIn={() => zoomBy(1.2)}
        onZoomOut={() => zoomBy(1 / 1.2)}
        onZoomFit={zoomFit}
        onZoomTo={zoomTo}
        onAddPerson={(parentId) => { if (!requireWrite()) return; setAddPersonParent(parentId); setShowAddPerson(true); }}
        onAddDept={() => { if (!requireWrite()) return; setShowAddDept(true); }}
        onOpenHistory={() => setShowHistory(true)}
        onExport={onExport}
        totalPeople={people.length}
        totalDepts={departments.length}
        orgName={orgName}
        onOrgNameChange={canWrite ? setOrgName : () => {}}
        logoUrl={logoUrl}
        onLogoUpload={(url) => { if (!requireWrite()) return; setLogoUrl(url); flashToast('อัปเดตโลโก้แล้ว'); }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        canWrite={canWrite}
        syncStatus={syncStatus}
        onOpenUserMgmt={() => setShowUserMgmt(true)}
        onRestoreFromSeed={role === 'admin' ? handleRestoreFromSeed : null}
      />

      {!canWrite && (
        <div className="readonly-banner">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <rect x="3.5" y="7" width="9" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
            <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          โหมดดูอย่างเดียว · คุณเป็น <b>Viewer</b> — ติดต่อ Admin เพื่อขอสิทธิ์แก้ไข
        </div>
      )}

      <div className="chart-area" style={{ position: 'relative', overflow: 'hidden', minHeight: 0 }}>

        {viewMode === 'people' ? (
          <>
            <Canvas
              onTransformChange={setCurrentZoom}
              people={people}
              byId={byId}
              childrenOf={childrenOf}
              departments={departments}
              layout={layout}
              parentOf={parentOf}
              collapsed={collapsed}
              onToggleCollapse={toggleCollapse}
              onToggleDept={toggleDept}
              onEditDept={(id) => setEditDeptId(id)}
              selectedId={selectedId}
              onSelect={setSelectedId}
              searchHits={searchHits}
              density={t.density}
              showPhoto={t.showPhoto}
              showLvBadge={t.showLvBadge}
              layoutMode={t.layout}
              onReparent={reparent}
              onDetach={detach}
              onChangeParent={reparent}
              onPersonMove={setPersonPos}
              collaborations={collaborations}
              roleGroups={roleGroups}
              onFocusNode={focusOn}
            />

            {breadcrumbPath.length > 0 && (
              <div className="breadcrumb">
                {breadcrumbPath.map((p, i) => (
                  <React.Fragment key={p.id}>
                    {i > 0 && <span className="sep">›</span>}
                    <span className="crumb" onClick={() => focusOn(p.id)} style={{ cursor: 'pointer' }}>
                      {i === 0 && <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M2 8L8 3l6 5v6a1 1 0 01-1 1H3a1 1 0 01-1-1V8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>}
                      {p.name}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}

            {selected && (
              <Sidebar
                person={selected}
                byId={byId}
                childrenOf={childrenOf}
                departments={departments}
                allPeople={people}
                onClose={() => setSelectedId(null)}
                onPatch={patchPerson}
                onChangeDept={changeDept}
                onEditDept={(id) => setEditDeptId(id)}
                onDetach={detach}
                collaboratorIds={collaboratorsOf[selected.id] || []}
                onAddCollaborator={(otherId) => addCollaboration(selected.id, otherId)}
                onRemoveCollaborator={(otherId) => removeCollaboration(selected.id, otherId)}
                onDelete={deletePerson}
                onAddChild={(parentId) => { setAddPersonParent(parentId); setShowAddPerson(true); }}
                onMoveTo={reparent}
                onPhotoUpload={setPhoto}
                onFocus={focusOn}
                onSelect={setSelectedId}
                roleGroups={roleGroups}
              />
            )}
          </>
        ) : (
          <DeptCanvas
            onTransformChange={setCurrentZoom}
            departments={departments}
            people={people}
            byId={byId}
            coOversight={coOversight}
            onAddCoOversight={addCoOversight}
            onRemoveCoOversight={removeCoOversight}
            deptLinks={deptLinks}
            onAddDeptLink={addDeptLink}
            onRemoveDeptLink={removeDeptLink}
            onAddBranch={addBranch}
            onEditBranch={editBranch}
            onDeleteBranch={deleteBranch}
            onPatchDept={editDept}
            onEditDept={(id) => setEditDeptId(id)}
            onDeleteDept={deleteDept}
            onSwitchToPeople={(deptId, personId) => {
              setViewMode('people');
              if (personId) {
                // Manager card: focus directly on the person
                setSelectedId(personId);
                setPendingFocusId(personId);
              } else if (deptId) {
                // Dept card: find the dept head and focus on them
                const deptMembers = people.filter(p => p.deptId === deptId);
                const head = deptMembers.reduce((best, p) => {
                  const par = p.parentId ? byId[p.parentId] : null;
                  const isEntry = !par || par.deptId !== p.deptId;
                  return isEntry && (!best || p.lv > best.lv) ? p : best;
                }, null);
                if (head) {
                  setSelectedId(head.id);
                  setPendingFocusId(head.id);
                }
              }
            }}
          />
        )}

        {toast && <div className="toast">{toast}</div>}
      </div>

      {/* ── Print-only footer (signature block — sits below the chart) ───── */}
      <div className="print-only print-footer">
        <div className="pf-row">
          {['ผู้จัดทำ · Prepared by', 'ผู้ตรวจสอบ · Reviewed by', 'ผู้อนุมัติ · Approved by'].map((label, i) => (
            <div className="pf-cell" key={i}>
              <div className="pf-line" />
              <div className="pf-role">{label}</div>
              <div className="pf-name">( ........................................... )</div>
              <div className="pf-date">วันที่ ............ / ............ / ............</div>
            </div>
          ))}
        </div>
        <div className="pf-note">เอกสารฉบับนี้พิมพ์จากระบบ Org Chart — {orgName || ''} · {printDate}</div>
      </div>

      {showHistory && (
        <HistoryModal history={history} byId={byId} onClose={() => setShowHistory(false)} />
      )}

      {showAddPerson && (
        <AddPersonModal
          departments={departments}
          allPeople={people}
          defaultParent={addPersonParent}
          onCancel={() => setShowAddPerson(false)}
          onSubmit={addPerson}
          onCreateDept={addDeptInline}
        />
      )}

      {showAddDept && (
        <AddDeptModal
          onCancel={() => setShowAddDept(false)}
          onSubmit={addDept}
        />
      )}

      {editDeptId && (() => {
        const d = departments.find(x => x.id === editDeptId);
        if (!d) return null;
        const cnt = people.filter(p => p.deptId === editDeptId).length;
        return (
          <EditDeptModal
            dept={d}
            departments={departments}
            peopleCount={cnt}
            onCancel={() => setEditDeptId(null)}
            onSubmit={editDept}
            onDelete={deleteDept}
          />
        );
      })()}

      {showUserMgmt && typeof UserManagementModal === 'function' && (
        <UserManagementModal onClose={() => setShowUserMgmt(false)} />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Layout">
          <TweakRadio label="รูปแบบ" value={t.layout}
            options={[{ value: 'tree', label: 'Tree' }, { value: 'vertical', label: 'List' }, { value: 'radial', label: 'Radial' }]}
            onChange={(v) => setTweak('layout', v)} />
          <TweakRadio label="ความหนาแน่น" value={t.density}
            options={[{ value: 'compact', label: 'Compact' }, { value: 'normal', label: 'Normal' }, { value: 'detailed', label: 'Detailed' }]}
            onChange={(v) => setTweak('density', v)} />
        </TweakSection>
        <TweakSection label="แสดงผล">
          <TweakToggle label="แสดงรูปโปรไฟล์" value={t.showPhoto} onChange={(v) => setTweak('showPhoto', v)} />
          <TweakToggle label="แสดง LV badge" value={t.showLvBadge} onChange={(v) => setTweak('showLvBadge', v)} />
          <TweakToggle label="Dark mode" value={t.dark} onChange={(v) => setTweak('dark', v)} />
        </TweakSection>
        <TweakSection label="Theme palette">
          <TweakColor label="สีหลัก" value={t.palette}
            options={[
              ['#FF6B47', '#FFC857', '#4FD1A5'],
              ['#2A6FDB', '#FFC857', '#7CC4F0'],
              ['#7A5AE0', '#FFB5BA', '#B89BE5'],
              ['#1F8A5B', '#FFC857', '#4FD1A5'],
              ['#E04A2E', '#FFC857', '#FF8A3D'],
            ]}
            onChange={(v) => setTweak('palette', v)} />
        </TweakSection>
        <TweakSection label="Quick reset">
          <TweakButton label="ยุบทุกแผนก (Collapse all)" secondary
            onClick={() => {
              const c = {};
              for (const id of Object.keys(childrenOf)) if ((childrenOf[id] || []).length > 0) c[id] = true;
              // Keep top level open
              for (const r of roots) c[r] = false;
              setCollapsed(c);
            }} />
          <div style={{ height: 6 }} />
          <TweakButton label="ขยายทั้งหมด" secondary onClick={() => setCollapsed({})} />
        </TweakSection>
        <TweakSection label="ตำแหน่งการ์ด">
          <TweakButton label={`คืนตำแหน่งอัตโนมัติ${Object.keys(customPos).length > 0 ? ` (${Object.keys(customPos).length} การ์ด)` : ''}`}
            secondary onClick={() => {
              if (Object.keys(customPos).length === 0) {
                flashToast('ไม่มีการ์ดที่ตั้งตำแหน่งเอง');
                return;
              }
              clearAllCustomPos();
              flashToast('คืนตำแหน่งการ์ดเป็นตามต้นไม้แล้ว');
            }} />
        </TweakSection>
        <TweakSection label="ข้อมูล">
          <TweakButton label="ล้าง chart ทั้งหมด (เริ่มจากศูนย์)" secondary
            onClick={() => {
              if (!window.confirm('ล้าง chart ทั้งหมด? คน/ฝ่าย/ประวัติทั้งหมดจะถูกลบและเริ่มจากศูนย์ — การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
              setSelectedId(null);
              setCollapsed({});
              setCustomPos({});
              setCollaborations([]);
              setDepartments([]);
              setPeople([]);
              setHistory([{ ts: Date.now(), type: 'create', who: null, msg: 'ล้าง chart และเริ่มจากศูนย์' }]);
              flashToast('ล้าง chart แล้ว — กด "เพิ่มฝ่าย" และ "เพิ่มคน" ใน toolbar เพื่อเริ่ม');
            }} />
          <div style={{ height: 6 }} />
          <TweakButton label="รีเซ็ตเป็นข้อมูลตัวอย่าง (seed)" secondary
            onClick={() => {
              if (!window.confirm('ลบข้อมูลทั้งหมดและคืนค่าเริ่มต้น? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
              try {
                ['orgPeople','orgDepartments','orgHistory','orgCollapsed','orgName','orgLogo','orgCustomPos','orgTidyVersion','orgCollaborations']
                  .forEach(k => localStorage.removeItem(k));
              } catch (e) {}
              window.location.reload();
            }} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// Wrap with AuthProvider + AuthGate so login is required before App renders.
// If auth.jsx didn't load (e.g., Firebase SDK failed), fall back to plain App.
if (typeof AuthProvider === 'function' && typeof AuthGate === 'function') {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <AuthProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </AuthProvider>
  );
} else {
  console.warn('[app] Auth not available — rendering without login gate');
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
}
