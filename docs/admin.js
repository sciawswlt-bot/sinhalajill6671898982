firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const FieldValue = firebase.firestore.FieldValue;

// Only this Google account is allowed into the admin panel. Change this
// to your own Gmail address.
const ALLOWED_ADMIN_EMAIL = 'sciawswlt@gmail.com';

const loginCard = document.getElementById('loginCard');
const panel = document.getElementById('panel');
const loginError = document.getElementById('loginError');
const tbody = document.querySelector('#linksTable tbody');
const generatedCard = document.getElementById('generatedCard');
const generatedLink = document.getElementById('generatedLink');

auth.onAuthStateChanged((user) => {
  if (user && user.email === ALLOWED_ADMIN_EMAIL) {
    loginCard.style.display = 'none';
    panel.style.display = 'block';
    loadLinks();
  } else if (user) {
    // Signed in with the wrong Google account — kick them out immediately.
    auth.signOut();
    loginError.style.display = 'block';
    loginError.textContent = 'That Google account is not authorized for this admin panel.';
  } else {
    loginCard.style.display = 'block';
    panel.style.display = 'none';
  }
});

document.getElementById('googleLoginBtn').onclick = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
    loginError.style.display = 'none';
  } catch (err) {
    loginError.style.display = 'block';
    loginError.textContent = 'Sign-in failed: ' + err.message;
  }
};

document.getElementById('logoutBtn').onclick = () => auth.signOut();

document.getElementById('createBtn').onclick = async () => {
  const slug = document.getElementById('newSlug').value.trim();
  const realUrl = document.getElementById('newUrl').value.trim();
  const title = document.getElementById('newTitle').value.trim();
  const subscribeUrl = document.getElementById('newSubscribe').value.trim();
  if (!slug || !realUrl) return alert('Slug and destination URL are both required.');

  try {
    const linkRef = db.collection('links').doc(slug);
    const existing = await linkRef.get();
    if (existing.exists) {
      alert('That slug is already taken.');
      return;
    }

    // Two documents, written together: public metadata (no real_url) and
    // the secret sub-document (real_url only). See firestore.rules for
    // why this split exists and its real limits.
    const secretRef = linkRef.collection('secret').doc('data');
    const batch = db.batch();
    batch.set(linkRef, {
      slug, title: title || '', subscribeUrl: subscribeUrl || '',
      unlocks: 0, createdAt: FieldValue.serverTimestamp(),
    });
    batch.set(secretRef, { realUrl });
    await batch.commit();

    document.getElementById('newSlug').value = '';
    document.getElementById('newUrl').value = '';
    document.getElementById('newTitle').value = '';
    document.getElementById('newSubscribe').value = '';

    const gateUrl = `${location.origin}${SITE_BASE_PATH}/${slug}`;
    generatedLink.textContent = gateUrl;
    generatedCard.style.display = 'block';
    generatedCard.scrollIntoView({ behavior: 'smooth' });

    loadLinks();
  } catch (err) {
    alert(err.message || 'Failed to create link');
  }
};

document.getElementById('copyBtn').onclick = () => {
  navigator.clipboard.writeText(generatedLink.textContent);
  const btn = document.getElementById('copyBtn');
  const original = btn.textContent;
  btn.textContent = 'Copied';
  setTimeout(() => (btn.textContent = original), 1200);
};

async function loadLinks() {
  const snap = await db.collection('links').orderBy('createdAt', 'desc').get();
  tbody.innerHTML = '';
  snap.forEach((doc) => {
    const link = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${link.slug}<br><small>${location.origin}${SITE_BASE_PATH}/${link.slug}</small></td>
      <td>${link.unlocks || 0}</td>
      <td><button data-slug="${link.slug}" class="btn secondary del-btn">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
  document.querySelectorAll('.del-btn').forEach((btn) => {
    btn.onclick = async () => {
      const slug = btn.dataset.slug;
      const linkRef = db.collection('links').doc(slug);
      const batch = db.batch();
      batch.delete(linkRef.collection('secret').doc('data'));
      batch.delete(linkRef);
      await batch.commit();
      loadLinks();
    };
  });
}
