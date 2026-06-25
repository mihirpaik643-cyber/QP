# QP.ai PWA Prototype

This folder contains a dependency-free Progressive Web App prototype for the QP.ai PRD.

## What Is Included

- Mobile-first app shell with splash, auth, onboarding, dashboard, bottom navigation, and settings.
- Question paper creation flow: configuration, question types, AI-style generation, review, preview, save, and export.
- Question bank with filters, manual question entry, upload simulation, and internet-search import simulation.
- Saved papers, paper preview, answer-key toggle, print-based PDF export, dark mode, offline banner, manifest, and service worker.

## Open It

Open `index.html` in a browser for a quick preview.

For upload analysis with your Gemini API key, start the local app server:

```powershell
node server.js
```

Then open:

```text
http://127.0.0.1:4173/
```

This serves the mobile app and forwards upload-analysis requests through `/api/analyze`, which avoids browser "fetch failed" errors from direct API calls.
