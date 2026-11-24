# Mindora

**Make every late night count.**

Mindora is an all-in-one AI study space designed to make learning feel cozy, motivating, and genuinely fun. The goal is to help students turn notes, files, and videos into a personalized learning experience.

## Vision

- Android + web from a shared codebase
- Study from pasted notes, multiple files, and YouTube videos
- AI summaries, tutor, flashcards, quizzes, and practice tests
- Study games, subject progression, XP, streaks, and achievements
- Custom profiles, friends, and leaderboards
- A polished liquid-glass interface with rich, accessible motion
- Real, properly licensed assets sourced from established libraries (no AI-generated artwork used as app assets)

## Current status

The first commit establishes a responsive visual foundation and interactive dashboard prototype. Upload and study actions are UI placeholders; persistence, authentication, AI processing, and real study flows are next.

## Run locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Tech

- React + TypeScript + Vite
- Lucide icons
- CSS motion and glassmorphism
- Planned: Supabase for auth, database, and file storage
- Planned: Capacitor for Android packaging
