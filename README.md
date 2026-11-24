# Mindora

**Make every late night count.**

Mindora is an all-in-one study space for turning your own learning material into organized, useful study sessions.

## Working now

- Responsive study dashboard with counts derived from the user's library
- Create and delete subjects
- Import multiple PDF, DOCX, PPTX, TXT, Markdown, and CSV files
- Paste and save personal notes
- Extract readable document text and view it inside Mindora
- Search material names and extracted content
- Assign materials to subjects and remove materials
- Local persistence through IndexedDB
- Document parsers are loaded only when the corresponding format is imported

No demo subjects, fabricated XP, fake streaks, or pretend import actions are seeded into the app.

## Data behavior

The library currently saves on the browser/device where it is used. Clearing site data can remove local materials. Cloud accounts and sync are not connected, so Mindora does not claim that your content is backed up or shared between devices.

AI summaries, AI-generated flashcards/quizzes, YouTube transcript import, study games, and social features are not enabled yet. They will be connected as real flows before they appear as working controls.

## Web

Run locally:

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

The GitHub Pages workflow builds and deploys the web app. For first-time setup, open repository **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.

## Android

Mindora uses Capacitor to package the same web app for Android.

```bash
npm install
npm run build
npm run android:init
npm run android:sync
npm run android:open
```

The Android APK workflow builds a debug APK and uploads it as a workflow artifact. The generated native Android project is created during CI; run `npm run android:init` locally if you want the Android Studio project in your working copy.

## Stack

- React, TypeScript, Vite
- Capacitor Android runtime
- Lucide icons
- PDF.js, Mammoth, and JSZip for document text extraction
- IndexedDB for local library persistence

## Asset policy

Mindora uses established icon and font libraries and will source motion/illustration assets from real asset libraries with licensing and attribution tracked. No AI-generated artwork is used as app assets.
