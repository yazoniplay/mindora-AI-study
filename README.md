# Mindora

**Make every late night count.**

Mindora is an all-in-one study space for turning your own learning material into organized, useful study sessions.

## Working now

- Responsive public landing page and signed-in/local study workspace
- Create and delete subjects; organize materials by subject
- Import PDF, DOCX, PPTX, TXT, Markdown, CSV, and image files
- Paste and save personal notes
- Extract readable document text and read it inside Mindora
- Search material names and extracted content
- Local persistence through IndexedDB
- Quick practice from imported text: source-based fill-in flashcards and a self-check quiz
- Editable student profile with display name and avatar selection
- Levels and XP earned from completing tasks, finishing focus timers, and reviewing flashcards
- Activity-based study streaks and achievements (not pre-seeded/fake)
- Supabase account authentication and manual cloud sync for subjects, materials, and stored image files

## Data behavior

The library and student progress are stored locally on the current browser/device. Cloud sync currently covers subjects, materials, and stored images when signed in and manually synced. Planner tasks, profile settings, XP, streaks, and practice progress are not yet synced across devices. Clearing browser/site data can remove local-only progress. The current quick practice is generated from imported text locally; it is not an AI model call.

No demo subjects, fabricated XP, fake streaks, fake leaderboards, or pretend import actions are seeded into the app.

## Roadmap

These are planned features, not claims that they are already live. Build each as a real working flow and keep unfinished items out of the UI.

### Study engine
- [ ] AI study assistant that answers from the student's own material with source context
- [ ] AI summaries, structured notes, key concepts, and explanations from files/notes
- [ ] YouTube URL import with transcript/caption extraction where available
- [ ] Saved flashcard decks with editable cards
- [ ] Spaced repetition scheduling, due-card queue, confidence ratings, and review history
- [ ] Quiz builder with varied question types and answer explanations
- [ ] Timed practice tests, results, review of mistakes, and retakes
- [ ] Study games and interactive learning activities

### Planner and progress
- [ ] Weekly timetable and calendar view
- [ ] Exam dates, countdowns, assignment milestones, and revision plans
- [ ] Grade tracker and target grades
- [ ] Study analytics: time by subject, consistency, accuracy, and improvement
- [ ] Persisted study sessions and meaningful progress reports

### Student profiles and social learning
- [ ] Full profiles with customizable avatar, profile theme, banner, bio, and profile decorations
- [ ] Profile privacy and account controls
- [ ] Friend requests, friend list, and study together sessions
- [ ] Real leaderboards based on transparent earned progress, with privacy controls
- [ ] More achievements, badges, level rewards, streak milestones, and unlockables
- [ ] Optional profile/world customization and earned cosmetics

### Platform and polish
- [ ] Cloud sync for tasks, profiles, XP, streaks, decks, review schedules, and progress
- [ ] Reliable sync conflict handling and account data export/delete
- [ ] Push/local reminders for exams, due reviews, and planned study sessions
- [ ] Cross-device web + Android experience
- [ ] Carefully designed motion, sound effects, and reward feedback with settings to disable them

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
- IndexedDB for local library and study profile persistence
- Supabase Auth, Postgres, and private Storage for account-backed library sync

## Asset policy

Mindora uses established icon and font libraries and will source motion/illustration assets from real asset libraries with licensing and attribution tracked. No AI-generated artwork is used as app assets.
