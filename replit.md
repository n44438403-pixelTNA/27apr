# IIC - Educational Learning Platform

## Overview
An AI-driven Educational Platform and Learning Management System (LMS) tailored for Indian education (CBSE, BSEB, Competitive Exams). Built as a Progressive Web App (PWA).

## Tech Stack
- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (CDN + PostCSS)
- **Backend/DB**: Firebase Firestore + Firebase Realtime Database + Firebase Auth
- **AI**: Groq API (primary), Google Gemini (fallback)
- **PWA**: vite-plugin-pwa

## Architecture
- `App.tsx` - Central entry point with auth, routing logic
- `components/StudentDashboard.tsx` - Main student UI
- `components/AdminDashboard.tsx` - Admin management UI
- `components/SubjectSelection.tsx` - Subject picker
- `services/groq.ts` - AI content generation (fetchChapters)
- `constants.ts` - Subject definitions, feature config
- `types.ts` - TypeScript interfaces
- `firebase.ts` - Firebase setup and helpers

## Key Features
- Competition Mode: Lucent Book, Speedy Science, Speedy Social Science, Sar Sangrah, MCQ Practice
- Class 6-12: Notes / Video / Audio only (MCQ option hidden in lesson action modal)
- Homework System: Admin assigns content by date/title/subject
- Profile: Settings sheet with Light Mode, Recovery, Data
- External Apps: Open inside the app via in-app iframe overlay (not new browser tab)

## Recent Changes (Apr 24)
- Removed MCQ option from per-chapter lesson modal for classes 6-12 (still available in Competition mode and homework)
- Removed "Revision" bottom-nav tab and Revision Hub rendering from student dashboard
- Removed "Study Goal" bottom-nav tab entry (AI Hub page still reachable from catalog overlays)
- Removed "My Marksheets" entry and "Download Report" PDF button from profile/settings sheet
- Removed MonthlyMarksheet full-screen rendering trigger
- Removed "Premium Revision Hub" feature banner from AI Hub event slides

## Recent Changes (Apr 27 — Session 2)
- **TTS fix — reads full notes now (not just 2 lines)**:
  - `MAX_CHUNK_LENGTH` increased from 180 → 500 chars. Fewer chunk-chain links = far fewer failure points, especially on Android WebView / Chrome.
  - Initial delay before first chunk raised 50ms → 100ms; inter-chunk gap raised 30ms → 80ms for more reliable sequencing.
  - `onerror` handler for `"interrupted"` / `"canceled"` errors now retries the **same chunk** (with 150ms delay) instead of calling `onEnd()`. Fixes a bug where Chrome's keepAlive pause/resume triggered `onerror` → premature topic advancement.
  - All other real errors now skip to the next chunk instead of stopping entirely.
- **Admin code generation PERMISSION_DENIED fixed** (`AdminDashboard.tsx`):
  - `generateCodes` now writes to **Firestore first** (`setDoc`) — admin has guaranteed `create` permission via Firestore rules.
  - Falls back to RTDB if Firestore fails; also mirrors to RTDB after Firestore success for fast reads.
  - Added `setDoc` import from firebase/firestore.
- **Redeem "Connection Error" fixed** (`RedeemSection.tsx`):
  - `saveUserToLive` is now wrapped in its own try/catch so a cloud-sync failure doesn't abort the redeem and show "Connection Error".
  - Reward is saved to localStorage first (always succeeds), then synced to cloud best-effort.
  - Outer catch now gives specific messages: Permission Error / Network Error / generic.
- **GK page TTS — "Read All" button added** (`StudentDashboard.tsx`):
  - New "Read All" button in the Daily GK page header. Reads all GK entries (Q+A) sequentially in one continuous TTS pass using the improved chunked speakText engine.
  - Stop button appears when reading; Back button also stops TTS on close.
- **Home page UI — premium button design** (`StudentDashboard.tsx`):
  - Class selection buttons: thicker accent bar (3px), larger class number (text-3xl), "Tap to open" hint, stronger shadows.
  - Competition/Govt. Exams button: full gradient card with colored trophy icon, subtitle text, hover animation.

## Recent Changes (Apr 27)
- **Lucent viewer now uses the same reader as Speedy notes** (`ChunkedNotesReader`):
  - The custom `SpeakButton` + manual chained-onEnd toolbar inside the Lucent page-wise viewer was replaced with `<ChunkedNotesReader />`, the exact component Speedy/homework notes use. This gives Lucent the proven topic-by-topic split, per-topic highlight, "Read All" / "Read from here" pills, and chunked TTS that already works reliably.
  - Added two optional props to `ChunkedNotesReader`:
    - `autoStart?: boolean` — when true, the reader fires "Read All" automatically on mount/content change (deferred 200 ms so the previous-page cancel flushes first).
    - `onComplete?: () => void` — fires after the last topic of the current content finishes being read.
  - Auto-Read & Sync flow: the toggle in the Lucent viewer header now just sets `lucentAutoSync`. The reader is keyed on `entry.id + pageIndex + autoSync`, so flipping the toggle or changing pages remounts it with `autoStart={autoSyncOn}`. When the page finishes, `onComplete` advances `lucentPageIndex`, which remounts the reader on the new page and the cycle continues — same robust pattern Speedy uses for chained note reading.
  - Toggling Auto-Sync OFF (or closing the viewer) calls `stopSpeech()`, and the reader's own `useEffect` cleanup also stops speech on unmount.

- **Homework navigation: Week step removed** (`StudentDashboard.tsx`, MONTH VIEW):
  - The homework hierarchy used to be Year → Month → Week → Date → Note. The intermediate "Week 1 / Week 2 / …" cards added an unnecessary tap.
  - Month View now renders the date-wise note list directly (sorted ascending by date), reusing the same date-card UI from the previous Week View. Subtitle shows "N notes added" for the whole month.
  - Behavior is automatic everywhere this homework hierarchy is used (MCQ, Sar Sangrah, Speedy Social Science, Speedy Science, etc.).
  - The Week View code path remains intact in case any sub-flow still routes to it, but the Month View no longer sets `hwWeek`, so it is effectively bypassed.

- **TTS chunked playback for long notes** (`utils/textToSpeech.ts`):
  - Browser SpeechSynthesis (esp. Chrome/Android WebView) cuts off utterances at ~200–300 chars / 15 s, so previously long admin notes (e.g. multi-paragraph Lucent History pages) stopped after ~2 lines.
  - Added `chunkTextForTts()` which splits any text into ≤180-char chunks at natural boundaries (Hindi `।`, then `.!?`, then `,;:` / newline, then word boundary, then hard cut).
  - `speakText()` now queues the chunks back-to-back via chained `onend` callbacks while preserving voice/rate/pitch. The user-supplied `onStart` fires once on the first chunk; `onEnd` fires only after the final chunk.
  - Session-id guard ensures `stopSpeech()` cleanly cancels in-flight chunked playback (and a new `speakText` call) without orphaned chunks resuming.
  - On a non-fatal mid-stream error, playback automatically advances to the next chunk so a single bad segment doesn't abort the whole reading.
  - **No UI/visual change** — the full note is still rendered as one block; chunking happens entirely under the hood.
- Added page-wise notes support for the **Lucent Book** in Competition mode:
  - Admin → Homework Manager: When `Target Subject = "Lucent GK"`, a special form replaces the standard homework form. Admin picks Lucent Subject (Biology / Chemistry / Physics / Economics / Geography / Polity / History) → enters Lesson Title → adds notes page-no wise (multiple pages with Page No. + content).
  - Admin → Homework Manager → History: A new "Saved Lucent Lessons" panel for editing/deleting existing Lucent lessons and adding/removing pages.
  - Student → Competition → Lucent Book → Subject: Admin-added lessons appear at the top of the chapter list (above AI-generated chapters) with a 📘 badge and page count. Tapping one opens a full-screen page-wise notes viewer (Prev/Next + page picker dropdown) — does NOT use the year/month/week homework view.
  - **Lucent viewer TTS**: The page-wise viewer now has a Speak button (per page) plus an "Auto-Read & Sync" toggle. With Auto-Sync ON, each page is read aloud automatically and, when finished, the viewer auto-advances to the next page and reads it — chained until the last page. Prev/Next/page-picker and Close all call `stopSpeech()` first so playback doesn't bleed across pages. Auto-Sync uses a **local component state** (`lucentAutoSync`) seeded from `settings.isAutoTtsEnabled`, mirroring the LessonView pattern (StudentDashboard receives `settings` as a read-only prop with no setter). The SpeakButton is keyed on `entry-page-autoSync` so it remounts and re-triggers `autoPlay` whenever the page or toggle changes.
  - **Built-in syllabus visibility (default: hidden)**: New `SystemSettings.hideLucentSyllabus` (defaults to `true` when unset). When hidden, the student Lucent flow shows ONLY admin-added lessons — Subject (Biology / Chemistry / …) → Lesson → Page-wise viewer. Admin can flip this OFF from the new toggle inside Admin → Homework Manager → History → "📘 Saved Lucent Lessons" panel to also include AI-generated chapters underneath the admin lessons.
  - New types: `LucentPageNote`, `LucentNoteEntry`; new `lucentNotes?: LucentNoteEntry[]` on `SystemSettings`.

## Recent Changes (Apr 25)
- Removed the "MCQ" tab from the student bottom navigation
- Added a new "Apps" tab (App Store page) after Profile in the bottom navigation
  - New `components/AppStore.tsx` renders the page with search, app cards, and store-specific styling
  - New `DownloadApp` type + `downloadApps` and `appStorePageHidden` fields in `SystemSettings`
  - Supports Play Store, App Store (iOS), Google Drive, MediaFire, and Other links
  - Tapping Download opens the link in a new browser tab (so MediaFire/Drive/Play Store all work natively)
- Added Admin → Advanced Settings → "App Store Page" panel
  - Toggle to hide/show the page for students
  - Add / edit / delete download apps (name, store, URL, icon, version, size, description)
  - Registered as `CONFIG_APP_STORE` in the feature registry

## Running
- Dev: `npm run dev` on port 5000
- Build: `npm run build` → `dist/`

## Deployment
- Static site deployment via Vite build
- Public dir: `dist`
