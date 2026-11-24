# Mindora

**Make every late night count.**

Mindora is an all-in-one study space for turning your own learning material into organized, useful study sessions.

## Current working features

- Responsive study dashboard with real counts from the user's library
- Create and delete subjects
- Import multiple study files at once
- Paste and save personal notes
- Extract readable text from PDF, DOCX, PPTX, TXT, Markdown, and CSV
- Save materials and subjects in IndexedDB on the current browser/device
- Search material names and extracted content
- Read imported material inside the app
- Assign materials to subjects and remove materials
- Actual empty states instead of seeded demo data or fake progress

## Important data behavior

The current library is local to the browser and device. Clearing browser site data can remove it. Cloud accounts and sync are not connected yet, so the app does not claim that your materials are backed up or available on other devices.

AI-generated summaries, flashcards, quizzes, YouTube transcript import, study games, and Android packaging are not enabled yet. They will be added as working features, not fake buttons.

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Stack

- React, TypeScript, Vite
- Lucide icons
- PDF.js, Mammoth, and JSZip for document text extraction
- IndexedDB for local study-library persistence

## Asset policy

Mindora uses established icon and font libraries and will source motion/illustration assets from real asset libraries with their licensing and attribution tracked. No AI-generated artwork is used as app assets.
