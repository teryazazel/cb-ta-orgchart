// Firestore real-time sync — wraps App state so all users see the same data live.
// Shared fields go to Firestore (orgs/main); per-user view state stays in localStorage.
console.log('%c[firestore-sync.jsx] LOADED', 'color:#FFA000;font-weight:bold');

const FS_ORG_PATH = ['orgs', 'main'];

// Deep equality via JSON stringify — fine for our serializable data
function fsDeepEq(a, b) {
  if (a === b) return true;
  try { return JSON.stringify(a) === JSON.stringify(b); }
  catch (e) { return false; }
}

// Hook arg shape:
//   syncedState  = { people, departments, collaborations, coOversight, deptLinks,
//                    orgName, logoUrl, history }
//   applyRemote  = function(data) — called when remote changes, should setX(...) for each field
//   canWrite     = boolean (true if user is admin/editor)
//   currentUserId = string (uid of logged-in user, for updatedBy stamping)
function useFirestoreSync(syncedState, applyRemote, canWrite, currentUserId) {
  const docRef = React.useMemo(() => {
    if (!window.fbDb) return null;
    return window.fbDb.collection(FS_ORG_PATH[0]).doc(FS_ORG_PATH[1]);
  }, []);

  // Keep latest applyRemote function in a ref so the subscribe effect doesn't re-run
  const applyRef = React.useRef(applyRemote);
  applyRef.current = applyRemote;

  // Stable signature of the state we want to push
  const stateJson = React.useMemo(() => JSON.stringify(syncedState), [syncedState]);

  // Track last value we either wrote OR received from remote, so we don't echo back
  const lastSyncedJsonRef = React.useRef(null);
  const isApplyingRemoteRef = React.useRef(false);

  const [syncStatus, setSyncStatus] = React.useState('connecting'); // connecting | synced | offline | no-doc
  const [didFirstLoad, setDidFirstLoad] = React.useState(false);

  // ── Subscribe to remote ──────────────────────────────────────────────────
  React.useEffect(() => {
    if (!docRef) return;
    const unsub = docRef.onSnapshot(
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.exists) {
          setSyncStatus('no-doc');
          setDidFirstLoad(true);
          return;
        }
        const data = snap.data() || {};

        // Build "remote view" of the synced state (only the keys we care about)
        const remoteView = {};
        for (const k of Object.keys(syncedState)) {
          remoteView[k] = data[k] !== undefined ? data[k] : (Array.isArray(syncedState[k]) ? [] : null);
        }
        const remoteJson = JSON.stringify(remoteView);

        // Skip if remote == what we already have locally (no need to apply)
        if (remoteJson === lastSyncedJsonRef.current) {
          setSyncStatus(snap.metadata.fromCache ? 'offline' : 'synced');
          setDidFirstLoad(true);
          return;
        }

        // Apply remote changes
        isApplyingRemoteRef.current = true;
        try {
          applyRef.current(remoteView);
          lastSyncedJsonRef.current = remoteJson;
        } finally {
          // Small delay so React commits state before our push-effect runs
          setTimeout(() => { isApplyingRemoteRef.current = false; }, 100);
        }
        setSyncStatus(snap.metadata.fromCache ? 'offline' : 'synced');
        setDidFirstLoad(true);
      },
      (err) => {
        console.error('[sync] snapshot error:', err);
        setSyncStatus('offline');
        setDidFirstLoad(true);
      }
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docRef]);

  // ── Push local changes to Firestore (debounced) ─────────────────────────
  React.useEffect(() => {
    if (!docRef || !canWrite || !didFirstLoad) return;
    if (isApplyingRemoteRef.current) return; // don't bounce remote-driven changes back
    if (stateJson === lastSyncedJsonRef.current) return; // identical to last sync

    const timer = setTimeout(() => {
      try {
        const payload = JSON.parse(stateJson); // deep clone of current synced state
        payload.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        payload.updatedBy = currentUserId || null;
        docRef.set(payload, { merge: true })
          .then(() => { lastSyncedJsonRef.current = stateJson; })
          .catch((e) => {
            console.error('[sync] write failed:', e);
            // Likely a permissions error — surface to user via status
            setSyncStatus('offline');
          });
      } catch (e) {
        console.error('[sync] push failed:', e);
      }
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateJson, docRef, canWrite, didFirstLoad, currentUserId]);

  // ── Bootstrap: if remote doc doesn't exist, upload local data ───────────
  const bootstrap = React.useCallback(async () => {
    if (!docRef) return { didBootstrap: false, reason: 'no-firebase' };
    try {
      const snap = await docRef.get();
      if (snap.exists) return { didBootstrap: false, reason: 'already-exists' };
      const payload = JSON.parse(stateJson);
      payload.updatedAt       = firebase.firestore.FieldValue.serverTimestamp();
      payload.bootstrappedAt  = firebase.firestore.FieldValue.serverTimestamp();
      payload.bootstrappedBy  = currentUserId || null;
      payload.updatedBy       = currentUserId || null;
      await docRef.set(payload);
      lastSyncedJsonRef.current = stateJson;
      console.log('%c[sync] BOOTSTRAPPED Firestore from local data', 'color:#4FD1A5;font-weight:bold');
      return { didBootstrap: true };
    } catch (e) {
      console.error('[sync] bootstrap failed:', e);
      return { didBootstrap: false, reason: e.message };
    }
  }, [docRef, stateJson, currentUserId]);

  // ── Force-write a payload (used to restore from seed when remote was wiped) ──
  // Bypasses the snap.exists check and the debounced push effect — writes
  // immediately so we can recover from a Firestore doc full of empty arrays.
  const forceWrite = React.useCallback(async (payload) => {
    if (!docRef) return { ok: false, reason: 'no-firebase' };
    try {
      const data = { ...payload };
      data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      data.updatedBy = currentUserId || null;
      data.restoredFromSeedAt = firebase.firestore.FieldValue.serverTimestamp();
      await docRef.set(data, { merge: true });
      // Update the sync ref so the push effect doesn't echo this back
      lastSyncedJsonRef.current = JSON.stringify(payload);
      console.log('%c[sync] FORCE-WROTE seed data to Firestore', 'color:#4FD1A5;font-weight:bold');
      return { ok: true };
    } catch (e) {
      console.error('[sync] forceWrite failed:', e);
      return { ok: false, reason: e.message };
    }
  }, [docRef, currentUserId]);

  return { syncStatus, didFirstLoad, bootstrap, forceWrite };
}

window.useFirestoreSync = useFirestoreSync;
