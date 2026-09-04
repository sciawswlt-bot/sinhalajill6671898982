# Sinhala Jil — GitHub Pages + Firestore edition

No Firebase Hosting. No Railway. No Cloud Functions. No card.
- **GitHub Pages** — serves the static `docs/` files (free)
- **Firestore** — the database, guarded by security rules (`firestore.rules`)
- **Firebase Authentication** — admin login (restricted to one Google account)

The browser talks to Firestore directly using the Firebase JS SDK — it
doesn't matter that the HTML/JS itself is hosted on GitHub Pages instead
of Firebase Hosting, Firestore works the same either way.

## 1. Push this repo to GitHub

```bash
cd sinhala-jil
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

## 2. Enable GitHub Pages

GitHub repo → **Settings** → **Pages** (left sidebar) → under "Build and
deployment": Source = **Deploy from a branch**, Branch = **main**,
folder = **/docs**. Save.

GitHub prints your live URL after a minute or two:
`https://<username>.github.io/<repo>/`

## 3. Firebase side (same as before)

```bash
firebase use --add        # pick sinhala-jil-push, alias default
firebase deploy --only firestore
```
(No `hosting` in this command anymore — GitHub Pages handles that part.)

`docs/firebase-config.js` already has your project's config filled in —
don't need to touch it again unless you create a different Firebase
project.

## 4. Test it

1. Open `https://<username>.github.io/<repo>/admin.html`
2. **Sign in with Google** using the one allowed account
   (`sciawswlt@gmail.com` — change this in `docs/admin.js`'s
   `ALLOWED_ADMIN_EMAIL` and `firestore.rules`'s `isAdmin()` if you want
   a different account)
3. Create a link, copy the generated locked link
4. Open it in a new tab, walk through the flow

## Redeploying after changes

- Changed `docs/*` (HTML/CSS/JS)? → `git add . && git commit -m "..." && git push` (GitHub Pages rebuilds automatically in ~1 min)
- Changed `firestore.rules`? → `firebase deploy --only firestore`

## Custom domain

GitHub repo → Settings → Pages → **Custom domain**. Add a CNAME record
at your domain registrar pointing to `<username>.github.io`.

## What's genuinely secure vs. what isn't

**Solid:** the 10-second waits — Firestore's own server clock enforces
them, can't be sped up from devtools.

**Weak:** the real destination URL isn't behind a server, so a
sufficiently technical visitor could query it early via the browser
console. See the comments in `firestore.rules` for the full explanation
— this is the accepted tradeoff of having no backend server at all.

## Still needs your input

1. **Ad invoke.js codes** — `docs/gate.html` and `docs/index.html` still
   have `INVOKE_JS_SRC_FROM_ADSTERRA_...` placeholders for the banner ads.
2. **Admin email** — change `sciawswlt@gmail.com` in `docs/admin.js` and
   `firestore.rules` if a different Google account should be the admin.

