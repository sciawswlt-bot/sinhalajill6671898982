firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const FieldValue = firebase.firestore.FieldValue;

const slug = location.pathname.replace(SITE_BASE_PATH, '').replace(/^\/+/, '');

// ADSTERRA — Smartlink used as the click-through ad for the final step.
const SMARTLINK_URL = 'https://evidentbummerhike.com/imu1y2x82s?key=5c61a9af9788f4c45395ad5332756652';

// KADAM — Direct Link popunder-style ads, one assigned to each click point.
const DIRECT_LINKS = [
  'https://viiukuhe.com/dc/?blockID=451000&tb=http%3A%2F%2F20112%2F&subID=Kandy&ref=23+%2C+batagalla+%2C+pujapitiya+%2C+kandy',
  'https://viiukuhe.com/dc/?blockID=451001&tb=http%3A%2F%2F20112%2F&subID=Kandy&ref=23+%2C+batagalla+%2C+pujapitiya+%2C+kandy',
  'https://viiukuhe.com/dc/?blockID=451002',
  'https://viiukuhe.com/dc/?blockID=451003',
  'https://viiukuhe.com/dc/?blockID=451004',
];
const START_AD = DIRECT_LINKS[0];
const STEP_ADS = [DIRECT_LINKS[1], DIRECT_LINKS[2], SMARTLINK_URL];

// KADAM — extra Direct Links, shown as visible clickable items.
const KADAM_EXTRA_LINKS = [
  'https://viiukuhe.com/dc/?blockID=451081',
  'https://viiukuhe.com/dc/?blockID=451082',
  'https://viiukuhe.com/dc/?blockID=451083',
  'https://viiukuhe.com/dc/?blockID=451084',
  'https://viiukuhe.com/dc/?blockID=451085',
  'https://viiukuhe.com/dc/?blockID=451086',
  'https://viiukuhe.com/dc/?blockID=451087',
  'https://viiukuhe.com/dc/?blockID=451088',
  'https://viiukuhe.com/dc/?blockID=451089',
];

(function renderKadamExtraLinks() {
  const container = document.getElementById('kadamExtraLinks');
  if (!container) return;
  KADAM_EXTRA_LINKS.forEach((url, i) => {
    const a = document.createElement('a');
    a.className = 'btn secondary';
    a.style.marginBottom = '10px';
    a.style.display = 'block';
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = `Offer ${i + 1}`;
    container.appendChild(a);
  });
})();

const flowEl = document.getElementById('flow');
const startCard = document.getElementById('startCard');
const startBtn = document.getElementById('startBtn');
const restartCard = document.getElementById('restartCard');
const restartBtn = document.getElementById('restartBtn');
const resultEl = document.getElementById('result');
const blockedEl = document.getElementById('blockedNotice');
const stepOverview = document.getElementById('stepOverview');
const stepRows = [document.getElementById('stepRow0'), document.getElementById('stepRow1'), document.getElementById('stepRow2')];
const stepLabel = document.getElementById('stepLabel');
const countdownEl = document.getElementById('countdown');
const adSlots = [document.getElementById('adSlotStep1'), document.getElementById('adSlotStep2'), document.getElementById('adSlotStep3')];
const actionBtn = document.getElementById('actionBtn');
const linkBox = document.getElementById('linkBox');
const openLinkBtn = document.getElementById('openLinkBtn');

let sessionRef = null;
let step = 0;
let timerId = null;
let secondsLeft = 10;

function openAd(url) {
  window.open(url, '_blank', 'noopener');
}

const STEP_LABELS = ['Step 1 of 3', 'Step 2 of 3', 'Step 3 of 3'];

function showBlocked(message) {
  blockedEl.style.display = 'block';
  blockedEl.textContent = message;
  startCard.style.display = 'none';
  restartCard.style.display = 'none';
  flowEl.style.display = 'none';
  resultEl.style.display = 'none';
  stepOverview.style.display = 'none';
}

function markStepUnlocked(index) {
  const row = stepRows[index];
  if (!row) return;
  row.classList.remove('locked');
  row.querySelector('.step-lock').textContent = '✓ DONE';
}

function detectAdblock() {
  const bait = document.querySelector('.ad-banner.ads.ad-placement.adsbox');
  if (!bait) return true;
  const style = window.getComputedStyle(bait);
  return bait.offsetParent === null && (style.display === 'none' || bait.offsetHeight === 0);
}

async function runGuards() {
  await new Promise((r) => setTimeout(r, 150));
  if (detectAdblock()) {
    showBlocked('Ad blocker detected. Please disable it and reload this page to continue.');
    return false;
  }
  return true;
}

// Detects the user actually navigating back to this page (e.g. pressing
// the browser's back button after going to an ad, or after leaving and
// returning). This does NOT fire just because we opened an ad in a new
// tab — that only shifts focus, it never unloads/navigates this page. So
// there's no race condition here, unlike a visibilitychange-based check.
window.addEventListener('pageshow', (event) => {
  if (event.persisted && timerId) {
    clearInterval(timerId);
    timerId = null;
    flowEl.style.display = 'none';
    restartCard.style.display = 'block';
  }
});

restartBtn.onclick = () => {
  restartCard.style.display = 'none';
  flowEl.style.display = 'block';
  openAd(STEP_ADS[step]);
  beginStepTimer(step);
};

function beginStepTimer(index) {
  stepLabel.textContent = STEP_LABELS[index];
  adSlots.forEach((el, i) => { el.style.display = i === index ? 'block' : 'none'; });
  secondsLeft = 10;
  countdownEl.textContent = secondsLeft;
  actionBtn.disabled = true;
  actionBtn.textContent = 'Please wait…';
  clearInterval(timerId);
  timerId = setInterval(() => {
    secondsLeft -= 1;
    countdownEl.textContent = secondsLeft;
    if (secondsLeft <= 0) {
      clearInterval(timerId);
      timerId = null;
      actionBtn.disabled = false;
      actionBtn.textContent = index < 2 ? 'Next' : 'Get link';
      actionBtn.onclick = advanceStep;
    }
  }, 1000);
}

async function beginFlow() {
  startBtn.disabled = true;
  openAd(START_AD);
  try {
    const linkDoc = await db.collection('links').doc(slug).get();
    if (!linkDoc.exists) {
      showBlocked('This link could not be verified.');
      return;
    }

    sessionRef = db.collection('sessions').doc();
    await sessionRef.set({ slug, step: 0, t: FieldValue.serverTimestamp() });

    startCard.style.display = 'none';
    flowEl.style.display = 'block';
    beginStepTimer(0);
  } catch (err) {
    showBlocked('This link could not be verified.');
  }
}

async function advanceStep() {
  actionBtn.disabled = true;
  openAd(STEP_ADS[step]);
  try {
    await sessionRef.update({ slug, step: step + 1, t: FieldValue.serverTimestamp() });
    markStepUnlocked(step);
    step += 1;

    if (step >= 3) {
      resolveLink();
      return;
    }
    beginStepTimer(step);
  } catch (err) {
    beginStepTimer(step);
  }
}

async function resolveLink() {
  try {
    const secretDoc = await db.collection('links').doc(slug).collection('secret').doc('data').get();
    if (!secretDoc.exists) {
      showBlocked('The link could not be unlocked. Please try again from the start.');
      return;
    }
    await db.collection('links').doc(slug).update({ unlocks: FieldValue.increment(1) });

    const realUrl = secretDoc.data().realUrl;
    flowEl.style.display = 'none';
    stepOverview.style.display = 'none';
    resultEl.style.display = 'block';
    linkBox.textContent = realUrl;
    openLinkBtn.href = realUrl;
    window.location.href = realUrl;
  } catch (err) {
    showBlocked('The link could not be unlocked. Please try again from the start.');
  }
}

(async function init() {
  startCard.style.display = 'none';
  const ok = await runGuards();
  if (!ok) return;
  startCard.style.display = 'block';
  startBtn.onclick = beginFlow;
})();
