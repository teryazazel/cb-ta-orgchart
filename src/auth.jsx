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
  // Default to 'pending' so unknown / new users are blocked by AuthGate until
  // their role is loaded from Firestore (or an admin approves them).
  const [role, setRole]       = React.useState('pending');
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
        setRole('pending');
        setLoading(false);
        return;
      }

      try {
        const userRef = window.fbDb.collection('users').doc(u.uid);
        const snap = await userRef.get();
        const adminList = (window.ADMIN_EMAILS || []).map(e => (e || '').toLowerCase());
        const isAdminEmail = u.email && adminList.includes(u.email.toLowerCase());

        if (!snap.exists) {
          // First sign-in — create user doc.
          // Admins-by-email bootstrap straight to 'admin'. Everyone else lands
          // in 'pending' and must be approved by an admin before they can
          // read the org chart (AuthGate blocks them until role changes).
          await userRef.set({
            email: u.email,
            displayName: u.displayName || (u.email || '').split('@')[0],
            role: isAdminEmail ? 'admin' : 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        } else if (isAdminEmail && snap.data().role !== 'admin') {
          // Promote to admin if email is in whitelist but doc wasn't
          await userRef.update({ role: 'admin' });
        }

        // Subscribe to live role changes — so admin approval / promotion is
        // reflected instantly without the user having to refresh.
        roleUnsub = userRef.onSnapshot((d) => {
          if (d.exists) {
            const r = d.data().role || 'pending';
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
        setRole('pending');
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
        try {
          await window.fbAuth.createUserWithEmailAndPassword(email.trim(), password);
        } catch (signupEx) {
          // Special case: the email already has a Firebase Auth account but
          // the corresponding Firestore user-doc may have been deleted by an
          // admin. In that case the user is effectively "deleted" from the
          // app's perspective and wants to re-register. We can't recreate
          // the auth account (Firebase rejects duplicate emails), but we CAN
          // sign them in with the same password — onAuthStateChanged in
          // AuthProvider will detect the missing doc and recreate it as
          // role='pending', putting them back in the approval queue.
          if (signupEx.code === 'auth/email-already-in-use') {
            try {
              await window.fbAuth.signInWithEmailAndPassword(email.trim(), password);
              // Success — AuthGate will swap to the pending-approval screen
              // automatically as soon as the new user-doc is created.
            } catch (signinEx) {
              // Wrong password — the auth account exists but they don't
              // remember the password they originally used. Steer them to
              // reset.
              if (signinEx.code === 'auth/wrong-password' || signinEx.code === 'auth/invalid-credential') {
                setErr('อีเมลนี้เคยใช้สมัครแล้ว และรหัสผ่านที่กรอกไม่ตรง — กด "ลืมรหัสผ่าน" เพื่อรีเซ็ต');
              } else {
                throw signinEx;
              }
            }
          } else {
            throw signupEx;
          }
        }
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
            หลังสมัคร — บัญชีจะเป็น <b style={{ color: '#B45309' }}>รออนุมัติ</b> จนกว่า Admin จะอนุมัติให้เข้าใช้งาน
            <br />
            <span style={{ fontSize: 10.5, opacity: 0.85 }}>
              ถ้าเคยสมัครแล้วถูกลบ — กรอก email + password เดิม กดสมัครได้เลย ระบบจะส่งคุณเข้าคิวอนุมัติใหม่
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pending-approval screen (shown to signed-in users with role === 'pending') ─
function PendingApprovalScreen({ user }) {
  return (
    <div className="splash">
      <div style={{ textAlign: 'center', maxWidth: 420, padding: 24 }}>
        <div style={{
          width: 72, height: 72, margin: '0 auto 16px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FFC857, #FF8A3D)',
          display: 'grid', placeItems: 'center',
          boxShadow: '0 6px 16px rgba(255,138,61,0.35)',
        }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="2" />
            <path d="M12 7v5l3 2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
          รอการอนุมัติจาก Admin
        </div>
        <div style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.55, marginBottom: 18 }}>
          บัญชีของคุณ <b style={{ color: '#0F172A' }}>{user?.email}</b> ลงทะเบียนเรียบร้อยแล้ว
          <br />
          กรุณาติดต่อ Admin เพื่อขอสิทธิ์เข้าใช้งาน Org Chart
          <br />
          เมื่อ Admin อนุมัติแล้ว หน้านี้จะเปลี่ยนให้อัตโนมัติ
        </div>
        <button
          onClick={() => window.fbAuth && window.fbAuth.signOut()}
          style={{
            padding: '10px 22px',
            fontSize: 13,
            fontWeight: 700,
            color: '#475569',
            background: '#F1F5F9',
            border: '1.5px solid #CBD5E1',
            borderRadius: 10,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}

// ── AuthGate — wraps app; blocks until login + approval complete ────────────
function AuthGate({ children }) {
  const { user, role, loading, error } = useAuth();
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
  // Signed in but waiting for admin approval — block access to the chart.
  if (role === 'pending') return <PendingApprovalScreen user={user} />;
  return children;
}

// ── User menu (top-right corner of toolbar) ─────────────────────────────────
function UserMenu({ onOpenUserMgmt }) {
  const { user, role } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [pendingCount, setPendingCount] = React.useState(0);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // Admin-only: live-subscribe to users with role=pending so the toolbar can
  // show a notification badge prompting the admin to review approvals.
  React.useEffect(() => {
    if (role !== 'admin' || !window.fbDb) {
      setPendingCount(0);
      return;
    }
    const unsub = window.fbDb.collection('users')
      .where('role', '==', 'pending')
      .onSnapshot(
        (snap) => setPendingCount(snap.size),
        (e) => console.warn('[user-menu] pending count subscribe failed:', e.message),
      );
    return unsub;
  }, [role]);

  if (!user) return null;

  const roleColors = { pending: '#FFC857', admin: '#E53935', editor: '#FF8A3D', viewer: '#5DADE2' };
  const roleLabels = { pending: 'รออนุมัติ', admin: 'Admin', editor: 'Editor', viewer: 'Viewer' };
  const initial = ((user.email || 'U')[0] || 'U').toUpperCase();

  return (
    <div className="user-menu" ref={ref} style={{ position: 'relative' }}>
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
        {/* Pending-approval notification badge (admin only). */}
        {pendingCount > 0 && (
          <span
            title={`มีผู้ใช้ ${pendingCount} คนรออนุมัติ`}
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              boxSizing: 'border-box',
              borderRadius: 9,
              background: '#E53935',
              color: '#fff',
              fontSize: 10,
              fontWeight: 800,
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 0 0 2px #fff',
              pointerEvents: 'none',
            }}
          >
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
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
              <span style={{ flex: 1, textAlign: 'left' }}>จัดการผู้ใช้</span>
              {pendingCount > 0 && (
                <span style={{
                  padding: '1px 7px',
                  borderRadius: 8,
                  background: '#E53935',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 800,
                }}>
                  {pendingCount} รออนุมัติ
                </span>
              )}
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
          // Pending users sort to the top so admins notice them immediately.
          const order = { pending: 0, admin: 1, editor: 2, viewer: 3 };
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

  // Delete a user's Firestore record. Note: this removes their role/profile
  // but does NOT delete their Firebase Auth account (that requires Admin SDK).
  // If the user signs back in, auth.jsx will recreate the doc with role
  // 'pending' — the admin can then reject again or, for permanent block,
  // disable the auth account in the Firebase Console.
  const deleteUser = async (u) => {
    const labelEmail = u.email || u.uid;
    if (!confirm(
      `ลบผู้ใช้ "${labelEmail}" ออกจากระบบ?\n\n` +
      `หมายเหตุ: การลบจะลบเฉพาะข้อมูลสิทธิ์เท่านั้น — บัญชี Firebase ` +
      `ยังคงอยู่ ถ้าผู้ใช้นี้เข้าระบบอีกครั้งจะกลับมาเป็น "รออนุมัติ" ใหม่ ` +
      `(ถ้าต้องการบล็อกถาวร ให้ปิดบัญชีที่ Firebase Console)`
    )) return;
    try {
      await window.fbDb.collection('users').doc(u.uid).delete();
    } catch (e) {
      alert('ลบผู้ใช้ไม่สำเร็จ: ' + e.message);
    }
  };

  const roleColors = { pending: '#FFC857', admin: '#E53935', editor: '#FF8A3D', viewer: '#5DADE2' };
  const roleLabels = { pending: 'รออนุมัติ', admin: 'Admin', editor: 'Editor', viewer: 'Viewer' };
  const pendingCount = users.filter(u => u.role === 'pending').length;
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
          <h3>
            จัดการผู้ใช้ <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>({users.length} คน)</span>
            {pendingCount > 0 && (
              <span style={{
                marginLeft: 10,
                padding: '2px 9px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
                background: '#FFC857',
                color: '#7C5300',
                verticalAlign: 'middle',
              }}>
                รออนุมัติ {pendingCount}
              </span>
            )}
          </h3>
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
              const isPending = u.role === 'pending';
              return (
                <div key={u.uid} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderBottom: '1px solid var(--line)',
                  background: isPending ? 'rgba(255,200,87,0.10)' : 'transparent',
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
                      {isPending && (
                        <span style={{
                          marginLeft: 8,
                          padding: '1px 7px',
                          borderRadius: 8,
                          fontSize: 10,
                          fontWeight: 700,
                          background: '#FFC857',
                          color: '#7C5300',
                        }}>
                          รออนุมัติ
                        </span>
                      )}
                    </div>
                    {u.displayName && u.displayName !== u.email && (
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{u.displayName}</div>
                    )}
                  </div>
                  {/* For pending users, show a fast "อนุมัติเป็น Viewer" button
                      alongside the regular role dropdown for finer control. */}
                  {isPending && !isSelf && (
                    <button
                      onClick={() => changeRole(u.uid, 'viewer')}
                      title="อนุมัติเป็น Viewer ทันที"
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: 'linear-gradient(135deg, #4FD1A5, #36B894)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        boxShadow: '0 2px 6px rgba(54,184,148,0.35)',
                      }}
                    >
                      อนุมัติ
                    </button>
                  )}
                  <select
                    value={u.role || 'pending'}
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
                    <option value="pending">รออนุมัติ</option>
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  {/* Delete button — admins only; never on themselves */}
                  <button
                    onClick={() => deleteUser(u)}
                    disabled={isSelf}
                    title={isSelf ? 'ไม่สามารถลบบัญชีตัวเองได้' : 'ลบผู้ใช้'}
                    aria-label="ลบผู้ใช้"
                    style={{
                      width: 30, height: 30,
                      display: 'grid', placeItems: 'center',
                      borderRadius: 6,
                      border: '1.5px solid var(--line)',
                      background: '#fff',
                      color: isSelf ? '#CBD5E1' : '#E53935',
                      cursor: isSelf ? 'not-allowed' : 'pointer',
                      opacity: isSelf ? 0.5 : 1,
                      transition: 'all 0.15s',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      if (isSelf) return;
                      e.currentTarget.style.background = '#FEE2E2';
                      e.currentTarget.style.borderColor = '#E53935';
                    }}
                    onMouseLeave={(e) => {
                      if (isSelf) return;
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = 'var(--line)';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M3 4h10M6.5 4V2.5h3V4M5 4l.5 9a1 1 0 001 1h3a1 1 0 001-1L11 4M7 7v4M9 7v4"
                        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: '10px 16px', fontSize: 11, color: 'var(--ink-3)', borderTop: '1px solid var(--line)', lineHeight: 1.6 }}>
          <b style={{ color: '#7C5300' }}>รออนุมัติ</b> = ยังเข้าใช้งานไม่ได้ &nbsp; · &nbsp;
          <b style={{ color: '#5DADE2' }}>Viewer</b> = ดูอย่างเดียว &nbsp; · &nbsp;
          <b style={{ color: '#FF8A3D' }}>Editor</b> = แก้ Org Chart ได้ &nbsp; · &nbsp;
          <b style={{ color: '#E53935' }}>Admin</b> = แก้ทุกอย่าง + จัดการผู้ใช้
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
