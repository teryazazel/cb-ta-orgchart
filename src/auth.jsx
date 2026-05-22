// Authentication — context, login screen, AuthGate, user menu, role management modal
console.log('%c[auth.jsx] LOADED', 'color:#FFA000;font-weight:bold');

const AuthContext = React.createContext({
  user: null,
  role: 'viewer',
  loading: true,
  error: null,
});

function useAuth() {
  return React.useContext(AuthContext);
}

// ── AuthProvider — listens to Firebase auth state, syncs role from Firestore ───
function AuthProvider({ children }) {
  const [user, setUser]       = React.useState(null);
  const [role, setRole]       = React.useState('viewer');
  const [loading, setLoading] = React.useState(true);
  const [error, setError]     = React.useState(null);

  React.useEffect(() => {
    if (!window.fbAuth) {
      setError('Firebase ยังโหลดไม่เสร็จ — ลอง refresh');
      setLoading(false);
      return;
    }

    let roleUnsub = null;

    const authUnsub = window.fbAuth.onAuthStateChanged(async (u) => {
      // Clean up previous role subscription
      if (roleUnsub) { roleUnsub(); roleUnsub = null; }

      if (!u) {
        setUser(null);
        setRole('viewer');
        setLoading(false);
        return;
      }

      try {
        const userRef = window.fbDb.collection('users').doc(u.uid);
        const snap = await userRef.get();
        const adminList = (window.ADMIN_EMAILS || []).map(e => (e || '').toLowerCase());
        const isAdminEmail = u.email && adminList.includes(u.email.toLowerCase());

        if (!snap.exists) {
          // First sign-in — create user doc; bootstrap admin role if email matches
          await userRef.set({
            email: u.email,
            displayName: u.displayName || (u.email || '').split('@')[0],
            role: isAdminEmail ? 'admin' : 'viewer',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        } else if (isAdminEmail && snap.data().role !== 'admin') {
          // Promote to admin if email is in whitelist but doc wasn't
          await userRef.update({ role: 'admin' });
        }

        // Subscribe to live role changes (so admin promotion is reflected instantly)
        roleUnsub = userRef.onSnapshot((d) => {
          if (d.exists) {
            const r = d.data().role || 'viewer';
            setRole(r);
          }
        });

        setUser({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || (u.email || '').split('@')[0],
        });
        setError(null);
      } catch (err) {
        console.error('[auth] user-doc bootstrap failed:', err);
        setError(err.message || String(err));
        setUser({ uid: u.uid, email: u.email });
        setRole('viewer');
      } finally {
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (roleUnsub) roleUnsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Splash screen (shown during auth check) ─────────────────────────────────
function Splash({ text }) {
  return (
    <div className="splash">
      <div>
        <div className="splash-spinner" />
        <div className="splash-text">{text || 'กำลังโหลด...'}</div>
      </div>
    </div>
  );
}

// ── Login / Signup screen ───────────────────────────────────────────────────
function LoginScreen() {
  const [mode, setMode]             = React.useState('login'); // 'login' | 'signup' | 'reset'
  const [email, setEmail]           = React.useState('');
  const [password, setPassword]     = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [err, setErr]               = React.useState('');
  const [info, setInfo]             = React.useState('');

  const errMap = {
    'auth/invalid-email':         'อีเมลไม่ถูกต้อง',
    'auth/user-not-found':        'ไม่พบบัญชีนี้ — ลอง "สมัครสมาชิก"',
    'auth/wrong-password':        'รหัสผ่านไม่ถูกต้อง',
    'auth/invalid-credential':    'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'auth/email-already-in-use':  'อีเมลนี้มีบัญชีอยู่แล้ว — กด "เข้าสู่ระบบ"',
    'auth/weak-password':         'รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร',
    'auth/network-request-failed':'ไม่มีเน็ต — ลองใหม่',
    'auth/too-many-requests':     'พยายามมากเกินไป — รอสักครู่',
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setInfo('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await window.fbAuth.createUserWithEmailAndPassword(email.trim(), password);
      } else if (mode === 'reset') {
        await window.fbAuth.sendPasswordResetEmail(email.trim());
        setInfo('ส่งลิงก์รีเซ็ตรหัสผ่านไปทาง email แล้ว — กดลิงก์ใน email');
      } else {
        await window.fbAuth.signInWithEmailAndPassword(email.trim(), password);
      }
    } catch (ex) {
      setErr(errMap[ex.code] || ex.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'signup' ? 'สมัครสมาชิก'
              : mode === 'reset'  ? 'รีเซ็ตรหัสผ่าน'
              :                     'เข้าสู่ระบบ';

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">CB TA TRADING</div>
        <div className="login-sub">Org Chart · {title}</div>

        <form onSubmit={submit}>
          <label className="login-label">อีเมล</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoFocus
            className="login-input"
            autoComplete="email"
          />

          {mode !== 'reset' && (
            <>
              <label className="login-label" style={{ marginTop: 14 }}>รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'อย่างน้อย 6 ตัวอักษร' : ''}
                required
                minLength={6}
                className="login-input"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </>
          )}

          {err  && <div className="login-error">{err}</div>}
          {info && <div className="login-info">{info}</div>}

          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? 'กำลัง...' : title}
          </button>
        </form>

        <div className="login-links">
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('signup'); setErr(''); setInfo(''); }}>สมัครสมาชิก</button>
              <span className="dot">·</span>
              <button onClick={() => { setMode('reset'); setErr(''); setInfo(''); }}>ลืมรหัสผ่าน</button>
            </>
          )}
          {mode === 'signup' && (
            <button onClick={() => { setMode('login'); setErr(''); setInfo(''); }}>← กลับไปเข้าสู่ระบบ</button>
          )}
          {mode === 'reset' && (
            <button onClick={() => { setMode('login'); setErr(''); setInfo(''); }}>← กลับไปเข้าสู่ระบบ</button>
          )}
        </div>

        {mode === 'signup' && (
          <div className="login-note">
            หลังสมัคร — บัญชีจะเป็น <b>Viewer</b> (ดูอย่างเดียว) จนกว่า Admin จะให้สิทธิ์เพิ่ม
          </div>
        )}
      </div>
    </div>
  );
}

// ── AuthGate — wraps app; blocks until login complete ───────────────────────
function AuthGate({ children }) {
  const { user, loading, error } = useAuth();
  if (loading) return <Splash text="กำลังตรวจสอบสิทธิ์..." />;
  if (error && !user) {
    return (
      <div className="splash">
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ color: '#C62828', fontWeight: 700, marginBottom: 8 }}>เกิดข้อผิดพลาด</div>
          <div style={{ color: '#475569', fontSize: 13 }}>{error}</div>
        </div>
      </div>
    );
  }
  if (!user) return <LoginScreen />;
  return children;
}

// ── User menu (top-right corner of toolbar) ─────────────────────────────────
function UserMenu({ onOpenUserMgmt }) {
  const { user, role } = useAuth();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!user) return null;

  const roleColors = { admin: '#E53935', editor: '#FF8A3D', viewer: '#5DADE2' };
  const roleLabels = { admin: 'Admin',   editor: 'Editor',  viewer: 'Viewer'  };
  const initial = ((user.email || 'U')[0] || 'U').toUpperCase();

  return (
    <div className="user-menu" ref={ref}>
      <button className="user-menu-trigger" onClick={() => setOpen(!open)} title={user.email}>
        <div className="user-avatar" style={{ background: roleColors[role] || '#FF6B47' }}>
          {initial}
        </div>
        <div className="user-info">
          <div className="user-email">{user.email}</div>
          <div className="user-role" style={{ color: roleColors[role] || '#94A3B8' }}>
            {roleLabels[role] || role}
          </div>
        </div>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 2 }}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <div style={{ fontWeight: 700, fontSize: 12.5 }}>{user.email}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
              สิทธิ์: <span style={{ color: roleColors[role], fontWeight: 700 }}>{roleLabels[role]}</span>
            </div>
          </div>

          {role === 'admin' && (
            <button className="user-menu-item" onClick={() => { setOpen(false); onOpenUserMgmt && onOpenUserMgmt(); }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              จัดการผู้ใช้
            </button>
          )}

          <button className="user-menu-item logout" onClick={() => window.fbAuth.signOut()}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6 3H3v10h3M10 5l3 3-3 3M6 8h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  );
}

// ── User Management modal (Admin-only) ──────────────────────────────────────
function UserManagementModal({ onClose }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers]     = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr]         = React.useState('');
  const [filter, setFilter]   = React.useState('');

  React.useEffect(() => {
    if (!window.fbDb) return;
    const unsub = window.fbDb.collection('users').onSnapshot(
      (snap) => {
        const arr = [];
        snap.forEach((doc) => arr.push({ uid: doc.id, ...doc.data() }));
        arr.sort((a, b) => {
          const order = { admin: 0, editor: 1, viewer: 2 };
          return (order[a.role] ?? 9) - (order[b.role] ?? 9)
              || (a.email || '').localeCompare(b.email || '');
        });
        setUsers(arr);
        setLoading(false);
      },
      (e) => {
        console.error('[users] subscribe error:', e);
        setErr(e.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const changeRole = async (uid, newRole) => {
    try {
      await window.fbDb.collection('users').doc(uid).update({ role: newRole });
    } catch (e) {
      alert('เปลี่ยนสิทธิ์ไม่สำเร็จ: ' + e.message);
    }
  };

  const roleColors = { admin: '#E53935', editor: '#FF8A3D', viewer: '#5DADE2' };
  const filtered = users.filter(u =>
    !filter.trim() ||
    (u.email || '').toLowerCase().includes(filter.toLowerCase()) ||
    (u.displayName || '').toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}
           style={{ width: 580, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3>จัดการผู้ใช้ <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>({users.length} คน)</span></h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--line)' }}>
          <input
            type="text"
            placeholder="ค้นหาด้วยอีเมลหรือชื่อ..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', boxSizing: 'border-box',
              border: '1.5px solid var(--line)', borderRadius: 8,
              fontSize: 13, outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ overflow: 'auto', flex: 1, padding: 0 }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>กำลังโหลด...</div>
          ) : err ? (
            <div style={{ padding: 16, color: '#C62828', fontSize: 12 }}>{err}</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>ไม่พบผู้ใช้</div>
          ) : (
            filtered.map((u) => {
              const isSelf = currentUser && u.uid === currentUser.uid;
              return (
                <div key={u.uid} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderBottom: '1px solid var(--line)',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: roleColors[u.role] || '#94A3B8',
                    color: '#fff',
                    display: 'grid', placeItems: 'center',
                    fontWeight: 800, fontSize: 14, flexShrink: 0,
                  }}>
                    {((u.email || 'U')[0] || 'U').toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.email}
                      {isSelf && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--ink-3)', fontStyle: 'italic' }}>(คุณ)</span>}
                    </div>
                    {u.displayName && u.displayName !== u.email && (
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{u.displayName}</div>
                    )}
                  </div>
                  <select
                    value={u.role || 'viewer'}
                    onChange={(e) => changeRole(u.uid, e.target.value)}
                    disabled={isSelf}
                    title={isSelf ? 'ไม่สามารถเปลี่ยนสิทธิ์ตัวเองได้' : ''}
                    style={{
                      padding: '6px 10px', borderRadius: 6,
                      border: `1.5px solid ${roleColors[u.role] || '#94A3B8'}`,
                      color: roleColors[u.role] || '#475569',
                      fontWeight: 700, fontSize: 12,
                      background: '#fff', cursor: isSelf ? 'not-allowed' : 'pointer',
                      opacity: isSelf ? 0.6 : 1,
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: '10px 16px', fontSize: 11, color: 'var(--ink-3)', borderTop: '1px solid var(--line)' }}>
          <b>Admin</b> = แก้ทุกอย่าง + จัดการผู้ใช้ &nbsp; · &nbsp;
          <b>Editor</b> = แก้ Org Chart ได้ &nbsp; · &nbsp;
          <b>Viewer</b> = ดูอย่างเดียว
        </div>
      </div>
    </div>
  );
}

// ── Sync status pill (small indicator showing online/offline) ───────────────
function SyncBadge({ status }) {
  const map = {
    synced:    { color: '#4FD1A5', label: 'Online', icon: '●' },
    offline:   { color: '#FFC857', label: 'Offline', icon: '◐' },
    'no-doc':  { color: '#94A3B8', label: 'No data', icon: '○' },
    connecting:{ color: '#94A3B8', label: '...',     icon: '◌' },
  };
  const s = map[status] || map.connecting;
  return (
    <span title={'Firestore: ' + s.label} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 12,
      background: 'rgba(0,0,0,.04)',
      color: s.color, fontSize: 11, fontWeight: 700,
      lineHeight: 1,
    }}>
      <span style={{ fontSize: 10 }}>{s.icon}</span>
      <span>{s.label}</span>
    </span>
  );
}

window.AuthProvider          = AuthProvider;
window.AuthGate              = AuthGate;
window.useAuth               = useAuth;
window.UserMenu              = UserMenu;
window.UserManagementModal   = UserManagementModal;
window.SyncBadge             = SyncBadge;
window.Splash                = Splash;
