// Canvas with pan/zoom + edges + drag-drop

const NODE_W = 220;
const NODE_W_COMPACT = 180;
const NODE_W_DETAILED = 250;
const NODE_H = 96;
const NODE_H_COMPACT = 70;
const NODE_H_DETAILED = 110;
const H_GAP = 24;
const V_GAP = 48;

function getDims(density) {
  if (density === 'compact') return { nodeW: NODE_W_COMPACT, nodeH: NODE_H_COMPACT };
  if (density === 'detailed') return { nodeW: NODE_W_DETAILED, nodeH: NODE_H_DETAILED };
  return { nodeW: NODE_W, nodeH: NODE_H };
}

function Edges({ pos, parentOf, nodeW, nodeH, dragHighlight, mode, hoveredEdge, onEdgeHover, onEdgeClick, collaborations = [] }) {
  const paths = [];
  for (const childId in parentOf) {
    const pid = parentOf[childId];
    const ppos = pos[pid], cpos = pos[childId];
    if (!ppos || !cpos) continue;

    let d, midX, midY;
    if (mode === 'radial') {
      const x1 = ppos.x + nodeW / 2;
      const y1 = ppos.y + nodeH / 2;
      const x2 = cpos.x + nodeW / 2;
      const y2 = cpos.y + nodeH / 2;
      d = `M ${x1} ${y1} L ${x2} ${y2}`;
      midX = (x1 + x2) / 2; midY = (y1 + y2) / 2;
    } else if (mode === 'vertical') {
      const x1 = ppos.x + 30;
      const y1 = ppos.y + nodeH;
      const x2 = cpos.x + 16;
      const y2 = cpos.y + nodeH / 2;
      d = `M ${x1} ${y1} V ${y2} H ${x2}`;
      midX = x1; midY = (y1 + y2) / 2;
    } else {
      // tidy-tree default — but adapt to actual relative positions (custom
      // drag may put parent next to or below child).
      const pcx = ppos.x + nodeW / 2, pcy = ppos.y + nodeH / 2;
      const ccx = cpos.x + nodeW / 2, ccy = cpos.y + nodeH / 2;
      const dx = ccx - pcx, dy = ccy - pcy;
      const horizAligned = Math.abs(dy) < 6;
      const vertAligned = Math.abs(dx) < 6;
      if (horizAligned) {
        // Same row — connect inner sides with straight line
        const x1 = dx > 0 ? ppos.x + nodeW : ppos.x;
        const x2 = dx > 0 ? cpos.x : cpos.x + nodeW;
        d = `M ${x1} ${pcy} L ${x2} ${ccy}`;
        midX = (x1 + x2) / 2; midY = pcy;
      } else if (vertAligned) {
        // Same column — straight vertical
        const y1 = dy > 0 ? ppos.y + nodeH : ppos.y;
        const y2 = dy > 0 ? cpos.y : cpos.y + nodeH;
        d = `M ${pcx} ${y1} L ${ccx} ${y2}`;
        midX = pcx; midY = (y1 + y2) / 2;
      } else {
        // Diagonal — S-curve from the side facing the child
        const fromTop = dy < 0;
        const x1 = pcx, y1 = fromTop ? ppos.y : ppos.y + nodeH;
        const x2 = ccx, y2 = fromTop ? cpos.y + nodeH : cpos.y;
        const mY = (y1 + y2) / 2;
        d = `M ${x1} ${y1} C ${x1} ${mY}, ${x2} ${mY}, ${x2} ${y2}`;
        midX = (x1 + x2) / 2; midY = mY;
      }
    }
    paths.push({ id: childId, parentId: pid, d, midX, midY, hl: dragHighlight === childId, hovered: hoveredEdge === childId });
  }
  // Collaboration edges (dotted, undirected). If two cards are roughly aligned
  // (same row or same column), draw a straight line — curves look ugly there.
  const collabPaths = [];
  const ALIGN_TOL = 6;
  for (const c of collaborations) {
    const ap = pos[c.a], bp = pos[c.b];
    if (!ap || !bp) continue;
    let d;
    if (mode === 'tree' || mode === 'vertical') {
      // Connect on the nearest edges of the cards so the line doesn't run
      // through the card interiors.
      const acx = ap.x + nodeW / 2, acy = ap.y + nodeH / 2;
      const bcx = bp.x + nodeW / 2, bcy = bp.y + nodeH / 2;
      const dx = bcx - acx, dy = bcy - acy;
      const horizAligned = Math.abs(dy) < ALIGN_TOL;
      const vertAligned = Math.abs(dx) < ALIGN_TOL;
      let x1, y1, x2, y2;
      if (horizAligned) {
        // side-to-side
        y1 = acy; y2 = bcy;
        if (dx > 0) { x1 = ap.x + nodeW; x2 = bp.x; }
        else { x1 = ap.x; x2 = bp.x + nodeW; }
        d = `M ${x1} ${y1} L ${x2} ${y2}`;
      } else if (vertAligned) {
        // top-to-bottom
        x1 = acx; x2 = bcx;
        if (dy > 0) { y1 = ap.y + nodeH; y2 = bp.y; }
        else { y1 = ap.y; y2 = bp.y + nodeH; }
        d = `M ${x1} ${y1} L ${x2} ${y2}`;
      } else {
        // Diagonal — gentle arc; connect center-to-center
        x1 = acx; y1 = acy; x2 = bcx; y2 = bcy;
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const len = Math.hypot(dx, dy) || 1;
        const offset = Math.min(60, len * 0.18);
        const cx = mx - dy / len * offset;
        const cy = my + dx / len * offset;
        d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
      }
    } else {
      // Radial — straight line center to center
      const x1 = ap.x + nodeW / 2, y1 = ap.y + nodeH / 2;
      const x2 = bp.x + nodeW / 2, y2 = bp.y + nodeH / 2;
      d = `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    collabPaths.push({ id: `${c.a}|${c.b}`, d });
  }

  return (
    <svg className="edges">
      {paths.map(p => (
        <g key={p.id}>
          <path className={'edge' + (p.hl ? ' highlight' : '') + (p.hovered ? ' edge-hover' : '')} d={p.d} />
          <path
            className="edge-hit"
            d={p.d}
            onMouseEnter={() => onEdgeHover && onEdgeHover(p.id)}
            onMouseLeave={() => onEdgeHover && onEdgeHover(null)}
            onPointerDown={(e) => { e.stopPropagation(); }}
            onClick={(e) => { e.stopPropagation(); onEdgeClick && onEdgeClick(p.id, p.parentId, { x: p.midX, y: p.midY }); }}
          />
        </g>
      ))}
      {collabPaths.map(p => (
        <path key={`collab-${p.id}`} className="edge-collab" d={p.d} />
      ))}
    </svg>
  );
}

function Canvas({
  people, byId, childrenOf, departments, layout, parentOf,
  collapsed, onToggleCollapse, onToggleDept, onEditDept,
  selectedId, onSelect, searchHits,
  density, showPhoto, showLvBadge, layoutMode,
  onReparent, onPersonMove, onDetach, onChangeParent,
  collaborations = [],
  roleGroups = {},      // repId → { lv, role, deptId, members[] }
  onFocusNode,          // (id) → focus camera on node
  onTransformChange,    // (t) → notify parent of pan/zoom changes (for toolbar)
}) {
  const canvasRef = React.useRef(null);
  const innerRef = React.useRef(null);
  const [transform, setTransform] = React.useState({ x: 60, y: 60, k: 0.9 });
  const [panning, setPanning] = React.useState(false);
  const [drag, setDrag] = React.useState(null); // { id, dx, dy, sx, sy }
  const [hoverDrop, setHoverDrop] = React.useState(null);
  const [hoveredEdge, setHoveredEdge] = React.useState(null);
  const [edgeMenu, setEdgeMenu] = React.useState(null); // { childId, parentId, x, y }
  const [connectMode, setConnectMode] = React.useState(null); // childId waiting for new parent
  const [multiSelected, setMultiSelected] = React.useState(() => new Set());
  const [rubberBand, setRubberBand] = React.useState(null); // {x1,y1,x2,y2} in canvas-inner coords

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setEdgeMenu(null);
        setConnectMode(null);
        setHoveredEdge(null);
        setMultiSelected(new Set());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const screenToInner = React.useCallback((clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - transform.x) / transform.k,
      y: (clientY - rect.top - transform.y) / transform.k,
    };
  }, [transform]);

  const { nodeW, nodeH } = getDims(density);

  // LV row labels — always show all 10 LVs (LV10 → LV1, top → bottom).
  // Positions are derived directly from the actual layout coordinates so that
  // grid-wrapped groups (many subordinates arranged in a multi-row grid) are
  // handled automatically — the band height grows to fit the tallest grid.
  const lvLabels = React.useMemo(() => {
    if (layoutMode !== 'tree') return [];
    const ALL_LVS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

    // Derive per-LV Y extents from actual node positions in the layout
    const lvMinY = {}, lvMaxY = {};
    let minX = Infinity, maxX = -Infinity;
    for (const id in layout) {
      const node = layout[id];
      const person = byId[id];
      if (!person || !node) continue;
      const lv = person.lv;
      if (lvMinY[lv] === undefined || node.y < lvMinY[lv]) lvMinY[lv] = node.y;
      const bottom = node.y + nodeH;
      if (lvMaxY[lv] === undefined || bottom > lvMaxY[lv]) lvMaxY[lv] = bottom;
      if (node.x < minX) minX = node.x;
      if (node.x + nodeW > maxX) maxX = node.x + nodeW;
    }
    if (!isFinite(minX)) { minX = 0; maxX = nodeW; }

    const chipX = minX - 64;
    const dividerWidth = Math.max(200, maxX + 40 - chipX);

    const out = [];
    let cumY = 0; // fallback Y for empty LV bands
    ALL_LVS.forEach((lv, i) => {
      const hasNodes = lvMinY[lv] !== undefined;
      const y      = hasNodes ? lvMinY[lv] : cumY;
      const contentH = hasNodes ? (lvMaxY[lv] - lvMinY[lv]) : 0;
      // Row height = actual content + gap below; empty rows get a compact spacer
      const rowH   = hasNodes ? contentH + V_GAP : Math.round(nodeH * 0.4);

      out.push({
        lv,
        lvs: [lv],
        x: chipX,
        y,
        rowH,
        // Chip centre aligns with the top card row regardless of grid depth
        chipCenterY: y + nodeH / 2 - 12,
        dividerY: y + rowH - V_GAP / 2,
        dividerLeft: chipX,
        dividerWidth,
        isLast: i === ALL_LVS.length - 1,
      });
      cumY = y + rowH;
    });
    return out;
  }, [layout, byId, layoutMode, nodeH, nodeW]);


  // Department bands — colored backgrounds grouping people by dept
  const deptBands = React.useMemo(() => {
    const PAD_X = 12, PAD_TOP = 32, PAD_BOTTOM = 12;
    const map = {};
    const headsByDept = {};
    for (const p of people) {
      // Dept head: parent in a different dept (or no parent)
      const parentDept = p.parentId ? byId[p.parentId]?.deptId : null;
      if (parentDept !== p.deptId) {
        (headsByDept[p.deptId] = headsByDept[p.deptId] || []).push(p.id);
      }
      const pos = layout[p.id];
      if (!pos) continue;
      const m = map[p.deptId] = map[p.deptId] || { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, count: 0, total: 0 };
      if (pos.x < m.minX) m.minX = pos.x;
      if (pos.x + nodeW > m.maxX) m.maxX = pos.x + nodeW;
      if (pos.y < m.minY) m.minY = pos.y;
      if (pos.y + nodeH > m.maxY) m.maxY = pos.y + nodeH;
      m.count++;
    }
    // Count total dept members (visible + collapsed)
    const totalByDept = {};
    for (const p of people) totalByDept[p.deptId] = (totalByDept[p.deptId] || 0) + 1;

    return departments
      .map(d => {
        const m = map[d.id];
        if (!m) return null;
        const heads = headsByDept[d.id] || [];
        const headsWithKids = heads.filter(id => (childrenOf[id] || []).length > 0);
        const isCollapsed = headsWithKids.length > 0 && headsWithKids.every(id => collapsed[id]);
        return {
          ...d,
          count: m.count,
          total: totalByDept[d.id] || m.count,
          collapsed: isCollapsed,
          canCollapse: headsWithKids.length > 0,
          x: m.minX - PAD_X,
          y: m.minY - PAD_TOP,
          w: (m.maxX - m.minX) + PAD_X * 2,
          h: (m.maxY - m.minY) + PAD_TOP + PAD_BOTTOM,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b.w * b.h) - (a.w * a.h));
  }, [people, layout, departments, byId, childrenOf, collapsed, nodeW, nodeH, layoutMode]);

  // Pan or rubber-band: drag on empty canvas
  const onCanvasPointerDown = (e) => {
    if (e.button !== 0) return;
    if (e.target !== canvasRef.current && !e.target.classList?.contains('canvas-inner') && e.target.tagName !== 'svg' && e.target.tagName !== 'path') {
      const t = e.target;
      if (!t.classList?.contains('canvas') && !t.closest('.edges')) return;
    }

    // Shift+drag → rubber-band multi-select
    if (e.shiftKey) {
      const start = screenToInner(e.clientX, e.clientY);
      setRubberBand({ x1: start.x, y1: start.y, x2: start.x, y2: start.y });
      const move = (ev) => {
        const cur = screenToInner(ev.clientX, ev.clientY);
        const rb = { x1: start.x, y1: start.y, x2: cur.x, y2: cur.y };
        setRubberBand(rb);
        // Live-update selection as the user drags
        const left = Math.min(rb.x1, rb.x2), right = Math.max(rb.x1, rb.x2);
        const top = Math.min(rb.y1, rb.y2), bottom = Math.max(rb.y1, rb.y2);
        const next = new Set();
        for (const p of people) {
          const pos = layout[p.id];
          if (!pos) continue;
          const intersects = !(right < pos.x || left > pos.x + nodeW || bottom < pos.y || top > pos.y + nodeH);
          if (intersects) next.add(p.id);
        }
        setMultiSelected(next);
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        setRubberBand(null);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      return;
    }

    // Plain click on empty canvas: clear multi-select (if any), then pan.
    // On touch devices, bail out immediately if a second finger is already
    // down — let the pinch handler own the gesture instead.
    if (e.pointerType === 'touch' && touchPointersRef.current.size >= 2) return;
    if (multiSelected.size > 0) setMultiSelected(new Set());

    setPanning(true);
    const startX = e.clientX, startY = e.clientY;
    const { x, y, k } = transform;
    let panStartX = startX, panStartY = startY;
    let panOriginX = x, panOriginY = y;
    const move = (ev) => {
      // If a second finger landed, abort the single-pointer pan — pinch
      // takes over. We also re-anchor the pan baseline so that if the user
      // lifts the second finger and continues with one, the next move
      // doesn't snap back.
      if (touchPointersRef.current.size >= 2) {
        const curT = transformRef.current;
        panStartX = ev.clientX; panStartY = ev.clientY;
        panOriginX = curT.x;    panOriginY = curT.y;
        return;
      }
      setTransform({
        x: panOriginX + (ev.clientX - panStartX),
        y: panOriginY + (ev.clientY - panStartY),
        k: transformRef.current.k,
      });
    };
    const up = () => {
      setPanning(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Zoom on wheel (but let sidebar handle its own scroll)
  const onWheel = (e) => {
    // If the wheel event originates inside the sidebar, let it scroll normally
    if (e.target.closest && e.target.closest('.sidebar')) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = -e.deltaY * 0.001;
    setTransform(t => {
      const k = Math.max(0.2, Math.min(2.5, t.k * (1 + delta)));
      const scale = k / t.k;
      return {
        k,
        x: mx - (mx - t.x) * scale,
        y: my - (my - t.y) * scale,
      };
    });
  };

  // ── Pinch-to-zoom + 2-finger pan for touch devices ──────────────────────
  // Track active pointers; when ≥2 are down, treat them as a pinch gesture.
  // This sits on top of the canvas as its own listener stack so it doesn't
  // race with the single-pointer pan-drag handlers above.
  const touchPointersRef = React.useRef(new Map()); // pointerId → {x, y}
  const pinchStateRef = React.useRef(null); // { startDist, startMid, startT }
  // Mirror the latest transform so the gesture handlers (which mount once)
  // can read the current value without re-creating listeners on every render.
  const transformRef = React.useRef(transform);
  React.useEffect(() => { transformRef.current = transform; }, [transform]);
  React.useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const pointers = touchPointersRef.current;

    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

    const onDown = (e) => {
      if (e.pointerType !== 'touch') return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        // Pinch starts — snapshot the initial geometry. setTransform inside
        // onMove computes everything relative to this snapshot so it stays
        // stable even as the pointers move.
        const [a, b] = Array.from(pointers.values());
        const rect = el.getBoundingClientRect();
        pinchStateRef.current = {
          startDist: distance(a, b),
          startMid: { x: midpoint(a, b).x - rect.left, y: midpoint(a, b).y - rect.top },
          startT: { ...transformRef.current },
        };
      }
    };

    const onMove = (e) => {
      if (e.pointerType !== 'touch') return;
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size >= 2 && pinchStateRef.current) {
        const [a, b] = Array.from(pointers.values()).slice(0, 2);
        const dist = distance(a, b);
        const rect = el.getBoundingClientRect();
        const mid = { x: midpoint(a, b).x - rect.left, y: midpoint(a, b).y - rect.top };
        const { startDist, startMid, startT } = pinchStateRef.current;
        if (startDist > 4) {
          const ratio = dist / startDist;
          const k = Math.max(0.05, Math.min(3.0, startT.k * ratio));
          // Zoom around the original midpoint, then add pan from midpoint drift.
          const newX = startT.x + (startMid.x - startT.x) * (1 - k / startT.k) + (mid.x - startMid.x);
          const newY = startT.y + (startMid.y - startT.y) * (1 - k / startT.k) + (mid.y - startMid.y);
          setTransform({ k, x: newX, y: newY });
          e.preventDefault();
        }
      }
    };

    const onUp = (e) => {
      if (e.pointerType !== 'touch') return;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStateRef.current = null;
    };

    // Use capture so we see touch events before the single-pointer pan
    // handlers swallow them.
    el.addEventListener('pointerdown', onDown, { capture: true });
    el.addEventListener('pointermove', onMove, { capture: true });
    el.addEventListener('pointerup', onUp, { capture: true });
    el.addEventListener('pointercancel', onUp, { capture: true });
    return () => {
      el.removeEventListener('pointerdown', onDown, { capture: true });
      el.removeEventListener('pointermove', onMove, { capture: true });
      el.removeEventListener('pointerup', onUp, { capture: true });
      el.removeEventListener('pointercancel', onUp, { capture: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Expose zoom controls + notify parent
  React.useEffect(() => {
    window.__chartTransform = transform;
    window.__chartSetTransform = setTransform;
    onTransformChange && onTransformChange(transform.k);
  }, [transform]);

  // Node drag: start when pointerdown on .node and pointer moves > threshold
  const onNodePointerDown = (id) => (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    // Shift+click on a card → toggle membership in multi-select (no drag)
    if (e.shiftKey) {
      setMultiSelected(s => {
        const ns = new Set(s);
        if (ns.has(id)) ns.delete(id);
        else ns.add(id);
        return ns;
      });
      return;
    }

    // Determine drag group: if this card is part of the multi-selection,
    // drag the entire selection; otherwise drag just this card (and clear
    // any prior multi-select since the user is starting a fresh action).
    const isMulti = multiSelected.has(id) && multiSelected.size > 1;
    const group = isMulti ? [...multiSelected] : [id];
    if (!isMulti && multiSelected.size > 0) setMultiSelected(new Set());

    const startX = e.clientX, startY = e.clientY;
    let moved = false;
    let started = false;
    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!started && Math.hypot(dx, dy) > 6) {
        started = true;
        setDrag({ id, dx: 0, dy: 0, group });
      }
      if (started) {
        setDrag({ id, dx, dy, group });
        // Hit-test (only for single-card reparenting)
        if (group.length === 1) {
          const targetEl = document.elementFromPoint(ev.clientX, ev.clientY);
          const nodeEl = targetEl?.closest?.('.node');
          const targetId = nodeEl?.getAttribute('data-id');
          if (targetId && targetId !== id) {
            if (isDescendant(targetId, id, childrenOf)) setHoverDrop(null);
            else setHoverDrop(targetId);
          } else {
            setHoverDrop(null);
          }
        }
        moved = true;
      }
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (moved && started) {
        if (group.length === 1) {
          // Single drag — reparent OR save custom position
          const targetEl = document.elementFromPoint(ev.clientX, ev.clientY);
          const nodeEl = targetEl?.closest?.('.node');
          const targetId = nodeEl?.getAttribute('data-id');
          if (targetId && targetId !== id && !isDescendant(targetId, id, childrenOf)) {
            onReparent(id, targetId);
          } else if (onPersonMove) {
            const cur = layout[id];
            if (cur) {
              const dx = (ev.clientX - startX) / transform.k;
              const dy = (ev.clientY - startY) / transform.k;
              onPersonMove(id, cur.x + dx, cur.y + dy);
            }
          }
        } else if (onPersonMove) {
          // Group drag — apply the same delta to every selected card
          const dx = (ev.clientX - startX) / transform.k;
          const dy = (ev.clientY - startY) / transform.k;
          for (const cid of group) {
            const cur = layout[cid];
            if (cur) onPersonMove(cid, cur.x + dx, cur.y + dy);
          }
        }
        setDrag(null);
        setHoverDrop(null);
      } else {
        setDrag(null);
        setHoverDrop(null);
        // Click — connect mode override, or open sidebar
        if (connectMode && connectMode !== id && !isDescendant(id, connectMode, childrenOf)) {
          onChangeParent && onChangeParent(connectMode, id);
          setConnectMode(null);
        } else {
          onSelect(id);
        }
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div
      ref={canvasRef}
      className={'canvas' + (panning ? ' panning' : '') + (drag ? ' dragging' : '')}
      onPointerDown={onCanvasPointerDown}
      onWheel={onWheel}
    >
      <div
        ref={innerRef}
        className="canvas-inner"
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})` }}
      >
        <Edges
          pos={layout}
          parentOf={parentOf}
          nodeW={nodeW}
          nodeH={nodeH}
          dragHighlight={null}
          mode={layoutMode}
          hoveredEdge={hoveredEdge}
          onEdgeHover={setHoveredEdge}
          onEdgeClick={(childId, parentId, mid) => setEdgeMenu({ childId, parentId, x: mid.x, y: mid.y })}
          collaborations={collaborations}
        />
        {deptBands.map(b => (
          <React.Fragment key={b.id}>
            <div className="dept-band" style={{
              transform: `translate(${b.x}px, ${b.y}px)`,
              width: b.w, height: b.h,
              background: rgba(b.color, 0.08),
              borderColor: rgba(b.color, 0.45),
            }} />
            <div
              className={'dept-band-label' + (b.canCollapse ? ' interactive' : '')}
              style={{
                transform: `translate(${b.x + 12}px, ${b.y - 16}px)`,
                color: b.color,
                background: rgba(b.color, 0.14),
                borderColor: rgba(b.color, 0.35),
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="dept-band-toggle"
                disabled={!b.canCollapse}
                onClick={(e) => { e.stopPropagation(); if (b.canCollapse) onToggleDept(b.id); }}
                title={b.canCollapse ? (b.collapsed ? 'ขยายฝ่าย' : 'ย่อฝ่าย') : ''}
              >
                {b.canCollapse && (
                  <svg className="dept-chev" width="10" height="10" viewBox="0 0 10 10" fill="none"
                    style={{ transform: b.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                    <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <span className="dept-dot" style={{ background: b.color }} />
                {b.name}
                <span className="dept-band-count">{b.count}{b.total !== b.count ? `/${b.total}` : ''}</span>
              </button>
              <button
                type="button"
                className="dept-band-edit"
                onClick={(e) => { e.stopPropagation(); onEditDept && onEditDept(b.id); }}
                title="แก้ไข/ลบฝ่าย"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 11l8-8 2 2-8 8H3v-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </React.Fragment>
        ))}
        {lvLabels.map((l) => (
          !l.isLast && (
            <div
              key={`div-${l.lv}`}
              className="lv-divider"
              style={{
                transform: `translate(${l.dividerLeft}px, ${l.dividerY}px)`,
                width: l.dividerWidth,
              }}
            />
          )
        ))}
        {lvLabels.map(l => (
          <div key={l.lv} className="lv-row-label" style={{
            transform: `translate(${l.x}px, ${l.y}px)`,
            height: l.rowH,
          }}>
            {l.lvs.map(lv => (
              <span key={lv} className="lv-row-chip" style={{ '--lv-color': lvColor(lv) }}>
                LV{lv}
              </span>
            ))}
          </div>
        ))}
        {people.map(p => {
          const pos = layout[p.id];
          if (!pos) return null; // suppressed members have no position — skip
          const inDragGroup = drag && (drag.group ? drag.group.includes(p.id) : drag.id === p.id);
          const isDropTarget = hoverDrop === p.id;
          const isDimmed = drag && !inDragGroup && drag.id && isDescendant(p.id, drag.id, childrenOf);
          const dept = departments.find(d => d.id === p.deptId);
          const isMulti = multiSelected.has(p.id);
          let dragOffset = { x: 0, y: 0 };
          if (inDragGroup && drag) dragOffset = { x: drag.dx / transform.k, y: drag.dy / transform.k };
          const cardPos = { x: pos.x + dragOffset.x, y: pos.y + dragOffset.y };

          // Role group representative → render GroupCard
          const group = roleGroups[p.id];
          if (group) {
            return (
              <GroupCard
                key={p.id}
                group={group}
                byId={byId}
                pos={cardPos}
                width={nodeW}
                selected={selectedId === p.id || isMulti}
                density={density}
                showLvBadge={showLvBadge}
                dept={dept}
                onPointerDown={onNodePointerDown(p.id)}
                onClick={(e) => { e.stopPropagation(); onSelect(p.id); }}
              />
            );
          }

          // Regular individual card
          const hasChildren = (childrenOf[p.id] || []).length > 0;
          return (
            <NodeCard
              key={p.id}
              person={p}
              pos={cardPos}
              width={nodeW}
              selected={selectedId === p.id || isMulti}
              searchHit={searchHits.has(p.id)}
              dimmed={isDimmed || (searchHits.size > 0 && !searchHits.has(p.id) && !inDragGroup)}
              dropTarget={isDropTarget}
              dragging={inDragGroup}
              density={density}
              showPhoto={showPhoto}
              showLvBadge={showLvBadge}
              childCount={(childrenOf[p.id] || []).length}
              isCollapsed={!!collapsed[p.id]}
              hasChildren={hasChildren}
              dept={dept}
              onClick={(e) => { e.stopPropagation(); }}
              onPointerDown={onNodePointerDown(p.id)}
              onToggleCollapse={() => onToggleCollapse(p.id)}
            />
          );
        })}
        {rubberBand && (
          <div className="rubber-band" style={{
            left: Math.min(rubberBand.x1, rubberBand.x2),
            top: Math.min(rubberBand.y1, rubberBand.y2),
            width: Math.abs(rubberBand.x2 - rubberBand.x1),
            height: Math.abs(rubberBand.y2 - rubberBand.y1),
          }} />
        )}
        {people.filter(p => !p.parentId && layout[p.id]).map(p => {
          const pos = layout[p.id];
          return (
            <button
              key={`connect-${p.id}`}
              className="connect-handle"
              style={{ transform: `translate(${pos.x + nodeW - 12}px, ${pos.y - 12}px)` }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setConnectMode(p.id); }}
              title="ต่อสายไปยังหัวหน้าใหม่"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M6 10L10 6M7 4l3-3 4 4-3 3M9 12l-3 3-4-4 3-3M5 9l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          );
        })}
      </div>

      {people.length === 0 && (
        <div className="empty-canvas">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M4 20c1-4 4-6 8-6s7 2 8 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <div className="ec-title">ยังไม่มีคนในแผนผัง</div>
          <div className="ec-sub">กด <b>เพิ่มฝ่าย</b> และ <b>เพิ่มคน</b> ที่ toolbar ด้านบนเพื่อเริ่ม</div>
        </div>
      )}

      {edgeMenu && (() => {
        const child = byId[edgeMenu.childId];
        const parent = byId[edgeMenu.parentId];
        if (!child || !parent) return null;
        const sx = edgeMenu.x * transform.k + transform.x;
        const sy = edgeMenu.y * transform.k + transform.y;
        return (
          <>
            <div className="edge-menu-bg" onClick={() => setEdgeMenu(null)} />
            <div className="edge-menu" style={{ left: sx, top: sy }}>
              <div className="edge-menu-title">
                <b>{parent.name}</b><span style={{ opacity: .5 }}> → </span><b>{child.name}</b>
              </div>
              <button onClick={() => { onChangeParent && setConnectMode(edgeMenu.childId); setEdgeMenu(null); }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                เปลี่ยนหัวหน้า
              </button>
              <button className="danger" onClick={() => { onDetach && onDetach(edgeMenu.childId); setEdgeMenu(null); }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                ตัดสายนี้
              </button>
              <button className="ghost" onClick={() => setEdgeMenu(null)}>ปิด</button>
            </div>
          </>
        );
      })()}

      {multiSelected.size > 0 && !connectMode && (
        <div className="multi-banner">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" stroke="currentColor" strokeWidth="1.3" /></svg>
          <span>เลือก <b>{multiSelected.size}</b> การ์ด · ลากการ์ดใดก็ได้เพื่อย้ายพร้อมกัน</span>
          <button onClick={() => setMultiSelected(new Set())}>ยกเลิก (Esc)</button>
        </div>
      )}

      {connectMode && (
        <div className="connect-banner">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 10L10 6M7 4l3-3 4 4-3 3M9 12l-3 3-4-4 3-3M5 9l2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span>คลิกบนการ์ดเพื่อตั้งเป็นหัวหน้าใหม่ของ <b>{byId[connectMode]?.name}</b></span>
          <button onClick={() => setConnectMode(null)}>ยกเลิก (Esc)</button>
        </div>
      )}

      {drag && hoverDrop && (
        <div className="drag-hint">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ย้าย <b>{byId[drag.id]?.name}</b> → ภายใต้ <b>{byId[hoverDrop]?.name}</b>
        </div>
      )}
      {drag && !hoverDrop && (
        <div className="drag-hint">
          ลากไปวางบนการ์ดของหัวหน้าใหม่
        </div>
      )}
    </div>
  );
}

function isDescendant(maybeChild, ancestorId, childrenOf) {
  // returns true if maybeChild === ancestorId or is in subtree of ancestorId
  if (maybeChild === ancestorId) return true;
  const stack = [...(childrenOf[ancestorId] || [])];
  while (stack.length) {
    const x = stack.pop();
    if (x === maybeChild) return true;
    stack.push(...(childrenOf[x] || []));
  }
  return false;
}

window.Canvas = Canvas;
window.getDims = getDims;
window.NODE_W = NODE_W;
window.NODE_H = NODE_H;
window.H_GAP = H_GAP;
window.V_GAP = V_GAP;
window.isDescendant = isDescendant;
