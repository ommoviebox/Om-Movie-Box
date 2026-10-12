# Om Movie Box — starter project

A responsive, dark-neon movie and web-series information site with client-side search/filters, title detail dialog, official streaming links, and a Firebase-backed admin area.

## Files
- `index.html` — public homepage
- `style.css` — responsive dark/neon UI (2 columns on phones, 4 on wider screens)
- `app.js` — demo data, search, filters, detail dialog, Firestore public catalogue loading
- `admin.html` / `admin.js` — Firebase email/password sign-in and title CRUD
- `firebase-config.js` — paste your Firebase web-app configuration here
- `firestore.rules` — sample rules: public reads only published titles; writes limited to one configured admin UID

## Run locally
Because the JavaScript uses ES modules, do not open `index.html` as a `file://` URL. From this folder run one of:
- `python -m http.server 8000` then visit `http://localhost:8000`
- VS Code Live Server

The public site shows fictional sample titles until Firebase is configured. Sample external URLs are generic service homepages; replace them with the exact official title pages you are authorized to link to.

## Firebase setup
1. Create a project at https://console.firebase.google.com/
2. Add a Web App and copy its config into `firebase-config.js`.
3. Enable **Authentication → Sign-in method → Email/Password**.
4. Create your admin user under **Authentication → Users**. Do not add public sign-up to the site.
5. Open the admin user's details and copy its UID.
6. Replace `REPLACE_WITH_ADMIN_UID` in `firestore.rules` with that UID, then publish the rules in **Firestore Database → Rules**.
7. Create a Firestore database. The rules let visitors read only documents where `published == true`. Only the configured admin UID can create/update/delete documents.
8. Host the folder on a static host that supports HTTPS. Firebase config's web API key is not a server secret; never place service-account private keys in browser code.

## Firestore data
Collection: `titles`. The admin form creates fields for `title`, `type` (`movie` or `series`), `year`, `genre`, `language`, `quality`, `poster`, `description`, `officialUrl`, `published`, timestamps, and creator UID.

## Deploy (simple route)
- Upload these files to a GitHub repository.
- Enable GitHub Pages in repository settings, or use another static host.
- Add your custom domain in the hosting settings, then configure the DNS records exactly as your host instructs. DNS propagation may take time.
- Keep HTTPS enabled.
- Firebase Authentication authorized domains must include your live domain.

## Security checklist
- The admin UI is not the security boundary; Firestore Security Rules are.
- Replace the sample admin UID and test reads/writes while signed out and signed in.
- Do not expose service-account JSON, private keys, or admin passwords.
- Use a strong unique password and enable available account protections.
- This starter does not include file uploads. For posters, use an authorized image URL; if adding Firebase Storage uploads, configure Storage Security Rules too.
- Only publish information and links you are authorized to share. Do not host or link to unauthorized movie copies.
