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

## Recent Changes (Apr 27 — Session 7)
- **MCQ Practice Hub removed entirely** (`components/AiHub.tsx`, `components/StudentDashboard.tsx`):
  - Removed the AI Hub banner click handler that fired `OPEN_CATALOG_MCQ`.
  - Removed the matching `OPEN_CATALOG_MCQ` branch from `handleTabChangeWrapper` (no more way to open it).
  - Narrowed the `showAllNotesCatalog` type from `"PREMIUM" | "DEEP_DIVE" | "VIDEO" | "AUDIO" | "MCQ" | false` to drop `"MCQ"`.
  - Removed every `"MCQ"` conditional branch from the All-Notes-Catalog modal (header icon, title, subject-row CTA label) so `"MCQ Practice Hub"` no longer appears anywhere.
- **Tap-to-read TTS on every notes line** (`components/ChunkedNotesReader.tsx`):
  - Each non-heading topic is now a full-width `<button>`. Tapping anywhere on a line starts TTS from that line; tapping the active line stops. The little speaker icon at the right end stays as a visual indicator (always 60% visible on touch, pulses red when active).
  - Headings remain non-tappable static blocks.
- **Per-tab state preservation** (`components/StudentDashboard.tsx`):
  - Replaced the Session-6 `closeAllStudentOverlays()` (which wiped overlays on every tab tap) with a snapshot/restore system. Each bottom-nav tap captures the leaving tab's state (activeTab, all homework hierarchy + active note, GK expansion path, Comp MCQ Hub + index/selected, mcq player, all-notes catalog, viewed user, etc.) into a `tabSnapshots` map keyed by `currentLogicalTab` (HOME / HOMEWORK / GK / VIDEO / PROFILE / APP_STORE), then either restores the saved snapshot for the tapped tab or applies that tab's defaults on first visit.
  - Re-tapping the active tab is a no-op (just stops TTS) — preserves position rather than resetting.
  - All tab `isActive` predicates collapsed to `currentLogicalTab === <id>` (single source of truth).
  - Result: creating an MCQ on Home → tap Profile → tap Home → MCQ creator restores with same draft/index/selected. Reading a homework note → tap GK → tap Homework → lands back on the same note (Year/Month/Week/HwId all preserved).
- **Notes line resume after tab switch** (`components/ChunkedNotesReader.tsx`, `components/StudentDashboard.tsx`):
  - Reader now accepts `initialIndex` + `onPositionChange`. The homework note view stores last-read line per `hw.id` in `hwNotePositions` and feeds it back on remount, scrolling that line into view (no auto-play). The internal "reset on content change" effect now skips the first render so a restored index isn't immediately wiped.

## Recent Changes (Apr 27 — Session 6)
- **Bottom-nav tabs always navigate** (`StudentDashboard.tsx`):
  - Added a `closeAllStudentOverlays()` helper inside the bottom-nav IIFE that resets every overlay screen (mcqAppOpen, showDailyGkHistory, showHomeworkHistory, hwActiveHwId, hwTodayPickerSub, homeworkSubjectView, hwOpenedDirect, hwYear/Month/Week, homeworkPlayerHwId, showCompMcqHub, showAllNotesCatalog, viewingUserHistory, selectedSubject, lucentCategoryView), stops TTS and clears `speakingId`.
  - Every bottom-nav tab onClick now calls this helper FIRST, then sets its own target (e.g. GK tab opens `setShowDailyGkHistory(true)` afterwards). So a tap on Profile/Home/Video/Apps from inside a notes/MCQ/competition overlay always lands directly on that tab.
  - Each tab's `isActive` predicate now also requires `!hwActiveHwId && !showCompMcqHub` so tab highlighting stays correct while overlays are open.
  - Reduced the nav `hidden` condition to only `activeExternalApp || isDocFullscreen`. Previously it also hid for `mcqAppOpen / showAllNotesCatalog / viewingUserHistory / homeworkPlayerHwId`, which prevented the user from leaving those screens via tabs. The MCQ player and catalog still have their own back/X buttons.
- **Hindi-human number TTS** (`utils/textToSpeech.ts`):
  - Added `numberToHindiWords(n)` and `replaceNumbersWithHindiWords(text)`. Covers 0–9,999,999,999 with proper Hindi composition (`crore` → `laakh` → `hazaar` → `sau` → 0–99 word table). Decimals read digit-by-digit ("point ek do teen"), commas in numbers (`1,250`) are handled, beyond-crore numbers fall back to digit-wise.
  - `speakText()` now applies this preprocessor whenever `lang` starts with `hi` (after `stripHtml`, before chunking). Result: "2019" is read as "do hazaar unnees", "1.5 lakh" → "ek point paanch laakh", etc. — sounds like a human reading.
- **Competition mode: Save Offline / Download (HTML / MHTML)** (`StudentDashboard.tsx`, `utils/downloadUtils.ts`):
  - Imported existing `downloadAsMHTML` from `utils/downloadUtils`.
  - Added two off-screen printable containers (`#comp-mcq-printable` and `#hw-note-printable`) rendered at `position: fixed; left: -99999px;` with full-quality formatting (titles, options highlighted with the correct answer, explanations).
  - **Competition MCQ Hub header** now has a green "📥 Save Offline" button (only when MCQs exist). Tap → downloads all admin + user MCQs as a self-contained HTML file (named `Competition_MCQs_YYYY-MM-DD.html`).
  - **Homework note view header** (used for both school + competition homework, since both go through the same `hwActiveHwId` flow) now has a Download icon next to the page-counter pill. Tap → downloads the current lesson's notes + MCQs as `<lesson_title>_YYYY-MM-DD.html`. Works whether the user is in Notes mode, MCQ mode, or the chooser.

## Recent Changes (Apr 27 — Session 5)
- **Notes view: switch button moved to TOP** (`StudentDashboard.tsx`):
  - The big bottom "MCQ Practice par jao" button has been removed.
  - Notes view now shows a small top header row (mirrors MCQ view): a "NOTES" label on the left and a small `MCQ (n)` pill on the right when MCQ also exists. Tapping it switches to the MCQ view (same UX as the MCQ→Notes switch button).
- **GK page: today's banner is now tappable + collapsible** (`StudentDashboard.tsx`):
  - Added `gkTodayExpanded` state (default false).
  - The "Today's GK" card on the GK page now renders as a single tappable button: shows a count ("Aaj ka GK · N questions") and a chevron. Tapping it expands to reveal today's Q&A inline; tapping again collapses.
- **Offline support — app no longer locks out** (`App.tsx`, `index.tsx`):
  - Removed the full-screen "Internet Not Connected" lockout in `App.tsx`. Cached Firestore data (already enabled via `enableMultiTabIndexedDbPersistence`) keeps working offline.
  - Added a thin amber top banner ("Offline mode — saved content available") that appears whenever `navigator.onLine` is false. It's `pointer-events-none` so it never blocks UI.
  - Added global `unhandledrejection` and `error` listeners in `index.tsx` that suppress Firebase / network errors (codes `unavailable`, `failed-precondition`, `deadline-exceeded`, `cancelled`, `AbortError`, etc., and messages mentioning "network"/"offline"/"failed to fetch"/"client is offline"). This prevents the app from crashing into the ErrorBoundary when the connection drops.

## Recent Changes (Apr 27 — Session 4)
- **Notes/MCQ chooser screen redesigned** (`StudentDashboard.tsx`):
  - Removed the Hindi heading text ("Kya kholna chahte hain?") and the subtitle.
  - Now shows the **app logo** (`settings.appLogo`, falling back to `/pwa-192x192.png`) at the top.
  - Two big square buttons in a 2-column grid: **Notes** and **MCQ**. Tap either to open that view directly.
- **Direct Back from notes → straight back to Homework page** (`StudentDashboard.tsx`):
  - Added `hwOpenedDirect` state. Set to `true` whenever a homework is opened via the today banner / today picker.
  - When pressing Back inside the active note view, if `hwOpenedDirect` is true, the app jumps straight back to the Homework page instead of the Year/Month hierarchy.
  - The flag is reset whenever a subject is opened via the year hierarchy (so the original course flow keeps its existing back behavior).

## Recent Changes (Apr 27 — Session 3)
- **Homework page cleanup + new tap flow** (`StudentDashboard.tsx`):
  - **Removed "Subject-wise History"** section from the Homework page entirely (with the now-unused `bySubject` / `subjectKeys` aggregations).
  - **Today banner cards now skip the year/month/date hierarchy.** Tapping a subject card on the "Aaj ka Homework" banner:
    - If the subject has only **1** homework today → opens the note directly (`hwActiveHwId` set, `hwYear/Month/Week` left null so Back returns to homework page).
    - If the subject has **multiple** today → opens a new bottom-sheet **Today Picker modal** listing those notes; tapping one opens it directly.
  - **Year/Month-wise hierarchy is preserved** when entering homework via the home-page Course flow (catalog/subject route is unchanged).
- **Notes / MCQ chooser + switch button** (`StudentDashboard.tsx`, `hwActiveHwId` view):
  - New `hwViewMode` state (`'notes' | 'mcq' | 'choose'`).
  - When opening a homework that has **both notes and MCQ**, a chooser screen appears asking *"Kya kholna chahte hain? — Notes Padhein / MCQ Practice"* before any content is shown.
  - When viewing **Notes**, a prominent "MCQ Practice par jao" button appears at the bottom (only if MCQ exists).
  - When viewing **MCQ**, a "← Notes" pill appears in the header (only if notes exist).
  - Defaults sensibly when only one of the two exists (no chooser, no switch button).
  - `goToHw()` (Prev/Next nav inside the reader) re-evaluates view mode for the new item.

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
