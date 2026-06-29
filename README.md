# Parley — translated calls (Firebase)

Call anyone with a Parley account and understand each other across languages.
Each side's phone transcribes its own microphone, and the **receiver** translates
the text into their own language — so you read subtitles and hear the translation,
both ways. Video and audio go peer‑to‑peer (WebRTC); Firebase handles accounts,
finding the other person, and the "you're being called" notification.

> **What's tested vs not:** the WebRTC call + the translation crossing the data
> channel are verified working. The Firebase wiring (Auth, Firestore signaling,
> Cloud Messaging) follows Firebase's documented patterns but needs *your*
> project to run — follow the steps below.

---

## What you need to fill in

1. **`index.html`** → `FIREBASE_CONFIG` (your web app config) and `VAPID_KEY`
   (Cloud Messaging Web Push key).
2. **`firebase-messaging-sw.js`** → the **same** `FIREBASE_CONFIG` values.

That's it for the client. The notification‑when‑closed feature also needs the
Cloud Function in `functions/` deployed (step 6).

---

## One‑time Firebase setup (free tier)

1. **Create a project** at <https://console.firebase.google.com> → *Add project*.
2. **Add a Web app** (the `</>` icon) → copy the `firebaseConfig` object it shows
   into `FIREBASE_CONFIG` in both `index.html` and `firebase-messaging-sw.js`.
3. **Authentication** → *Get started* → enable **Email/Password**.
   Also enable **Anonymous** (same screen) so people can join via an invite
   link without creating an account, and use **Try Parley** (trial) mode.
   *(Optional)* enable **Google** too if you want the "Continue with Google"
   button to work. After deploying, also add your hosting domain under
   *Authentication → Settings → Authorised domains* (`*.web.app`/`*.firebaseapp.com`
   are already there; add a custom domain or your GitHub Pages domain if you use one).
4. **Firestore Database** → *Create database* → start in *production mode*.
   Then paste the contents of `firestore.rules` into the **Rules** tab and publish
   (or deploy via CLI, step 6).
5. **Cloud Messaging** → in *Project settings → Cloud Messaging → Web Push
   certificates* → *Generate key pair* → copy it into `VAPID_KEY` in `index.html`.

## Deploy

You can host the static files anywhere (Firebase Hosting, Netlify, Vercel,
GitHub Pages). Easiest with the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase init        # choose Hosting, Firestore, Functions (use the existing files)
                     #  - Hosting public dir: . (this folder)
                     #  - keep firestore.rules
                     #  - Functions: JavaScript, don't overwrite index.js
firebase deploy
```

### 6. Deploy the call‑notification function (for ringing when the app is closed)

```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

This function watches for new call documents and pushes a notification to the
callee's device. **Without it**, calls still ring when the other person has
Parley open — you just don't get a notification when their app is closed.

> The Firestore notification trigger runs on the Blaze (pay‑as‑you‑go) plan.
> Usage at this scale is effectively free, but Firebase requires a billing
> account to deploy functions.

---

## Using it

1. Open the deployed URL, **create an account**, and pick your language.
2. Have the other person do the same on their device.
3. Enter their email and tap **call** — their Parley rings (or notifies).
   Or tap **Create an invite link** and send the link to anyone — they open it,
   type a name and pick a language, and join the call **without an account**.
4. On accept, you'll see each other and live‑translated captions; tap the speaker
   button to also hear the translation.

### Invite links
The host taps *Create an invite link*, shares the link, and waits on the call
screen. Whoever opens the link joins as a guest (signed in anonymously behind the
scenes) — no sign‑up. Good for calling someone once, or someone who'll never make
an account. Requires **Anonymous** auth to be enabled (step 3).

### iPhone notes (important)
- To receive **notifications**, the other person must **Add Parley to the Home
  Screen** (Share → *Add to Home Screen*) and allow notifications. iOS only
  delivers web push to installed web apps.
- It will be a **notification banner**, not a full‑screen FaceTime‑style ring —
  that lock‑screen ring is an Apple‑only (native‑app) capability.
- Voice captioning uses the browser's speech recognition, which works in Safari,
  Chrome, and Edge. Spoken translation works everywhere.

---

## Reliability: TURN servers

Peer‑to‑peer connects directly on most networks using the free Google STUN server.
On stricter networks (some mobile carriers, corporate Wi‑Fi) a **TURN relay** is
required to connect at all. The app ships with the free **Open Relay** TURN servers
already in `RTC_CONFIG` so it works out of the box on more networks — but those are
**best‑effort and capacity‑limited**, so for anything real, replace them with your
own in `index.html`:

```js
const RTC_CONFIG = { iceServers: [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "turn:YOUR_TURN_HOST:3478", username: "user", credential: "pass" }
]};
```

Managed TURN options: **Metered** (free tier + an API for short‑lived credentials),
**Twilio** Network Traversal, **Cloudflare Calls**, or self‑host **coturn**.

---

## Translation engine

Same setup as the rest of Parley: on‑device translation is used automatically on
Chrome when the language model is present, otherwise it falls back to a free
cloud translator (no key). Swap providers in the `TRANSLATE` object at the top of
the script (`mymemory` | `libre` | `google` | `custom`).

### Languages & voices (important)
A translated call has three parts, and they don't all support every language equally:
- **Captions always work** for every supported pair — the translated text shows on
  screen regardless of device.
- **Spoken audio** only plays if the *listener's device* has a voice installed for
  that language. If it doesn't, Parley now stays silent and shows a "captions only"
  note instead of reading the text in the wrong voice (which is what made calls
  sound like they "weren't translating"). To get spoken translation:
  - **iPhone/iPad:** Settings → Accessibility → Spoken Content → Voices → add the language.
  - **Mac:** System Settings → Accessibility → Spoken Content → System Voice → Manage Voices.
- **Speech‑to‑text** (capturing what you say) needs a browser that supports it —
  Safari, Chrome, and Edge do; Firefox does not.

Tip: the two people on a call must have **different** languages set, or there's
nothing to translate. Invite‑link guests are now defaulted to a language different
from the host to avoid this.

### Trial mode
The sign‑in screen has **Try Parley without an account** — it signs in anonymously
and drops you on the home screen so you can make calls and create invite links
immediately. Trial users can call others and use invite links, but can't be called
by *their* email until they create a real account (a banner offers the upgrade).

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app: auth, contacts, call screen, WebRTC + translation |
| `firebase-messaging-sw.js` | Background push handler (paste config) |
| `functions/index.js` | Cloud Function that sends the call notification |
| `firestore.rules` | Security rules for profiles + call signaling |
| `manifest.webmanifest`, `icon-*.png` | PWA install assets |
