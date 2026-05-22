// Firebase initialization — runs BEFORE any UI code so window.fbAuth/fbDb are ready
console.log('%c[firebase-init] starting', 'color:#FFA000;font-weight:bold');

const firebaseConfig = {
  apiKey: "AIzaSyC_VVlkoSTdT6tbdVdHZu1976VNS0925G8",
  authDomain: "cb-ta-orgchart.firebaseapp.com",
  projectId: "cb-ta-orgchart",
  storageBucket: "cb-ta-orgchart.firebasestorage.app",
  messagingSenderId: "327916154729",
  appId: "1:327916154729:web:7628ef5bcec28c60d997f8"
};

// Emails in this list automatically get the "admin" role on first sign-in.
// Add more emails as needed (one per line, lowercase).
window.ADMIN_EMAILS = [
  'teryazazel@gmail.com',
];

if (typeof firebase === 'undefined') {
  console.error('[firebase-init] firebase global is undefined — SDK scripts failed to load. Check internet / CSP.');
} else {
  try {
    firebase.initializeApp(firebaseConfig);
    window.fbAuth = firebase.auth();
    window.fbDb   = firebase.firestore();

    // Keep cached data so offline reload still shows the chart
    window.fbDb.enablePersistence({ synchronizeTabs: true }).catch((err) => {
      // Multi-tab persistence may fail in some browsers — that's OK
      console.warn('[firebase-init] persistence not enabled:', err.code || err.message);
    });

    console.log('%c[firebase-init] OK — project: ' + firebaseConfig.projectId,
      'color:#FFA000;font-weight:bold');
  } catch (e) {
    console.error('[firebase-init] initialization failed:', e);
  }
}
