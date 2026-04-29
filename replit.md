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

## Recent Changes (Apr 29 — Bottom Nav Cascading Slot System)
- **`types.ts`**: Added `starredPageHidden?: boolean` to SystemSettings.
- **`AdminDashboard.tsx`**: Added "Important Notes (GK)" toggle in Nav Settings section — when hidden, Video slides into GK's slot.
- **`StudentDashboard.tsx`**: Rewrote bottom nav with clean cascading slot logic:
  - **Home**: always visible
  - **Homework**: always visible when active homework exists (previously hidden when RevHub disabled — now reverted)
  - **Slot A (RevHub)**: shows if `revisionHubV2Enabled !== false`; else GK/Video/Profile slide left
  - **Slot B (GK)**: shows if `!starredPageHidden`; else Video/Profile slide left
  - **Slot C (Video/Profile)**: Video if `!universalVideoInTopBar`, Profile if `universalVideoInTopBar`
  - Removed old "Profile at end" fallback case (Profile only in Video slot now)

## Recent Changes (Apr 29 — TTS Hindi Fix)
- **`utils/textToSpeech.ts`**: Three fixes for choppy Hindi TTS reading:
  1. **Underscore bug fix**: `_` was being removed without space (causing "हर_सौ" → "हरसौ", read as "harsau"). Now replaced with space.
  2. **NFC normalization**: Devanagari matras (ी, ि, ु etc.) normalized to composed form before speaking — prevents "tor tor" choppy reading.
  3. **Devanagari number words**: When text is primarily Devanagari, numbers are now replaced with Devanagari words (एक, दो, सौ, हजार…) instead of Roman phonetics (ek, do, sau…). Mixed-script mode-switching was causing TTS engine to stutter between Hindi and English reading modes.
  4. **Zero-width char removal**: ZWJ, ZWNJ, BOM etc. removed before speaking.
  5. **₹ sign**: Replaced with "rupaye" so TTS reads it correctly.

## Recent Changes (Apr 29 — Revision Hub V2 Tabs + MCQ Bug Fix + Nav Fixes)
- **`RevisionHubV2.tsx` (tabs added)**: Two tabs — "Aaj Ka Kaam" (daily notes + MCQ due today) and "Schedule" (upcoming schedule + all tracked topics + "How it works" collapsible). "How it works" always available in Schedule tab (not just empty state).
- **`TodayMcqSession.tsx` (MCQ bug fix)**: Wrong answers from Revision MCQ sessions now call `recordAttempt` → they correctly appear in Revision Hub tracker. Previously these sessions were silently lost.
- **`StudentDashboard.tsx` bottom nav**: When `revisionHubV2Enabled === false`, Homework tab is also hidden from nav (GK/Important becomes more visible).

## Recent Changes (Apr 29 — Revision Hub V2: Pure Local Word-Match, No AI)
- **`utils/noteSearcher.ts` (NEW)**: Pure local-storage note searcher. AI ka use bilkul nahi. Scan karta hai saare `nst_content_*` cached chapters ko — wrong MCQ questions ke words se word-match karta hai. Jitna zyada match utna pehle result. Score = unique matching words count per note. `searchNotesByWords(queryWords, maxResults)` function.
- **`components/RevisionHubV2.tsx` (rewritten)**: "Notes Dhundo" button press karo → app apne saare locally cached notes scan karta hai → results match count ke order mein dikhata hai (4+ match pehle, phir 3, phir 2, phir 1). Matched words bhi highlight hote hain. Original chapter kholne ka fallback bhi hai. **No AI, no network call for note search.**

## Recent Changes (Apr 29 — Admin in Profile + Notes Fix + Revision Hub V2)
- **Admin Panel in Profile tab** (`components/StudentDashboard.tsx`): Admin/Sub-Admin users ab Profile tab ke andar bhi "Admin Panel" button dekhenge (yellow card) — floating button ke saath yeh in-profile shortcut bhi available hai.
- **Notes "......" truncation fix** (`utils/notesSplitter.ts`): `splitIntoTopics` ab pure-dots/ellipsis lines ko filter karta hai (jaise "......" ya "…") — ye AI truncation artifacts ya admin placeholders hain jo notes ke end mein dikh rahe the. `stripTrailingDots` bhi apply hota hai har topic text ke end pe.
- **Revision Hub V2 — Spaced Repetition Cycle** (`components/RevisionHubV2.tsx`, `utils/revisionTrackerV2.ts`):
  - MCQ mein galat jawab → topic Revision Hub queue mein enter hota hai (`stage: 'NOTES'`, `nextDueAt: tomorrow`)
  - Agle din student ko "Aaj Notes Padhne Hain" mein woh topic milta hai → "Padho" button → chapter notes open, MCQ schedule ho jata hai
  - Uske baad "Aaj MCQ Practice Karni Hai" → "Practice" → MCQ open, phir self-rating (Weak/Average/Strong)
  - Self-rating ke basis pe next interval decide hota hai (admin-configurable)
  - MCQs + Notes dono book/page wise organized (Subject → Chapter → Page/Topic)
  - "Upcoming" section bhi hai jo aane wale 7 din ke items dikhata hai
  - Admin (Store Manager tab) ab full interval config kar sakta hai: score thresholds (Strong/Average/Mastery %) + per-tier intervals (Weak/Average/Strong/Mastered topics ke liye Notes aur MCQ due days)
  - `revisionTrackerV2.ts` me naye functions: `getDueItems()`, `getUpcomingItems()`, `markNotesReviewed()`, `markMcqDone()` with admin config support

## Recent Changes (Apr 29 — Splash Font Picker)
- **AppLoadingScreen.tsx** ab user ko app short name (e.g. "IIC") ka font choose karne deta hai. 14 stylish/branded/professional font choices: Default, Orbitron (Tech), Audiowide, Russo One, Bebas Neue, Black Ops One, Righteous, Monoton (Neon), Playfair Display (Elegant), Cinzel (Classic), Permanent Marker, Press Start 2P (Retro), Pacifico, Rajdhani.
- Picker access: bottom footer me "T Aa" button (version ke baad) — tap karke full-screen overlay khulta hai jisme har font ka live preview saath label dikhta hai.
- **Lazy-loaded Google Fonts**: chosen font on mount inject hota hai (`<link>` to fonts.googleapis.com); jab picker khulta hai tab sab fonts pre-load ho jate hain previews ke liye.
- **Persistence**: choice `localStorage.nst_splash_font_id` me save hoti hai — har splash pe yahi font dikhega.
- **Smart pause**: jab picker open hota hai progress timer pause ho jata hai (warna splash auto-complete ho jata aur user kick out ho jata). Picker close hone par timer current progress se resume hota hai (jump-back nahi).
- New constant `SPLASH_FONTS` array + `ensureGoogleFontLoaded()` helper at top of `AppLoadingScreen.tsx`.

## Recent Changes (Apr 29 — Lucent UX for Class 6-12 MCQ)
- **Notes ↔ MCQ tab strip** added at top of both `McqView` and `PdfView` (Class 6-12) for instant switching between Notes and MCQ for the same chapter (`onSwitchToNotes` / `onSwitchToMcq` props wired in `StudentDashboard`).
- **MCQ option re-enabled** for Class 6-12 in `LessonActionModal` (removed `hideMcq={isClass6to12}`).
- **Unified Lucent-style 3-mode selector** on the MCQ SELECTION view: 📝 MCQ · 💬 Q&A · 🃏 Flashcard. Each pill is a 1-tap launcher.
- **New `INTERACTIVE_LIST` view** in `McqView.tsx` replaces the old `QA_REVEAL` block. Single screen powers both MCQ mode (tap option → green/red feedback + explanation + score summary) and Q&A mode (tap to reveal answer). Header has a `READ ALL` chain reader plus a 3-pill in-view mode switcher (MCQ/Q&A/Flashcard).
- **Per-card speaker (compact variant)** added to `McqSpeakButtons.tsx` — single round 🔊 icon with new `revealAnswer` and `compact` props. Both per-card and READ ALL respect the TTS rule:
  - **MCQ mode**: speaker reads only the *question* until the user has answered ALL questions; once everything is answered, the speaker also reads the correct answer.
  - **Q&A mode**: speaker always reads question + correct answer.
- **Save (+ / ✓) button** per card persists bookmarks to `localStorage` key `mcq_saved_${board}_${classLevel}${streamKey}_${subject.name}_${chapter.id}`.
- **Legacy timed flow** (Free Practice + Premium Test cards) moved into a collapsible "Advanced Test Mode (Timed + Coins)" disclosure on the SELECTION view — hidden by default since the new 3-mode selector is now the primary entry.

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
  - **Class 6-12 page-wise notes (Apr 28)**: Lucent's page-wise notes/MCQ format is now reusable for Class 6-12 too (video/audio rendering untouched). `LucentNoteEntry` extended with `bookName?` (custom display name) and `classLevel?` (`'6'…'12' | 'COMPETITION'`). Admin "Add New Lucent" form + History edit panel now expose 🎯 Target Class, Subject Category, and 📖 Book Name fields. On the student side, when a Class 6-12 student opens any subject, admin Lucent books targeted to that class are injected at the top of the chapter list as `📘 {bookName} — {lessonTitle}` and tap → opens the same Competition-style page-wise viewer (existing `lucent_admin_` prefix handler in `onSelect`). Home search bar already indexes `lucentNotes` page content, so these Class 6-12 books are searchable too.
  - **Hide Class fix (Apr 28)**: Visibility toggle in Admin (`Visibility Mode` button on the class strip) was only mutating local state — `handleSaveSettings(next)` now runs on every flip, so hidden classes truly disappear for students immediately.
  - **Auto-fluctuating star boost (Apr 28)**: `applyStarBoost` now mixes the per-note seed with a 6-hour time bucket (`Math.floor(Date.now() / 6h)`), so the same note's display count drifts within the configured `[fakeStarBoost, fakeStarBoostMax]` range every 6 hours — kabhi 200, kabhi 500, kabhi 11K — looking like organic activity instead of a flat boost.
  - **Hindi danda (।) topic split (Apr 28)**: `utils/notesSplitter.ts` post-processes every non-heading line containing `।` and splits it on the danda (using a `(?<=।)\s*` lookbehind so the danda stays attached for natural TTS pauses). Effect: Class 6-12 / Competition / Lucent / homework notes that are written in Hindi now read sentence-by-sentence (each Hindi full-stop = next topic), matching how the English `.` already worked via line-based splitting.
  - **Firebase RTDB rules — student write paths (Apr 28)** (`database.rules.json`): Added explicit `note_stars` rule (read open, `$hash` writable by any auth user, `users/$uid` only writable by owning user, `count` validated as number) so the global "saved by N users" social-proof counter and "Most Saved" community feed work end-to-end without admin intervention. Added `community_mcqs` and `community_notes` paths (read open to all, write owned by `publisherUid` so only the original publisher or an admin can edit/delete) so students can publish their own MCQs / notes to the shared pool. Existing user-profile-scoped storage (`user.customMcqs`, saved notes) still flows through the existing `users/$uid` rule. Deploy with `firebase deploy --only database` after pulling.

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

## Recent Changes (Apr 28) — Flashcard redesign + History tracking
- **Flashcard view rewritten** (`components/FlashcardMcqView.tsx`): now samples **10 random questions** per session (Fisher-Yates shuffle) from the available pool and re-shuffles fresh each time the view opens.
  - Card UI shows **only the question by default**; tapping the card flips/reveals the answer block. Prev/Next arrows sit directly under the question card (compact mobile layout).
  - "Shuffle" picks a fresh random 10. On the last card, "Naye 10" appears if pool > 10.
  - Records a session to `localStorage` on unmount via the new `recordFlashcardSession()` helper.
- **Mode-button rename** in both Homework MCQ and Lucent flows in `StudentDashboard.tsx`:
  - "✋ Khud Banao" → **📝 MCQ**
  - "👁 Sidha" (Sidha Answer) → **💬 Q&A**
  - "🃏 Flashcard" label kept as-is.
- **Notes-read time tracking** in `StudentDashboard.tsx`: two `useEffect`s record time spent inside (a) homework note view and (b) Lucent page viewer, calling `recordNotesReadSession()` on view exit.
- **New util** `utils/flashcardHistory.ts`: localStorage-backed trackers (`recordFlashcardSession`, `recordNotesReadSession`, getters/clearers, `formatDur`, types `FlashcardSession` / `NotesReadSession`). Capped at 200 entries each.
- **History page** (`components/HistoryPage.tsx`): new **"Flashcards"** tab between Reading and Saved.
  - Summary tiles: total flashcards viewed, sessions, flashcard time, notes-read time.
  - Subject-wise breakdown combining flashcard + notes-read activity.
  - Per-session lists for both flashcards (subject • lesson • viewed/total • duration • date) and notes-read (kind badge: Lucent/HW/Chapter, subject, lesson, duration, date) with individual "Clear all" buttons that confirm before deletion.
- `components/McqView.tsx` chapter-level Flashcard launcher now passes `subject={subject.name}` so chapter sessions are properly attributed in History.

## Recent Changes (Apr 28 — part 2)
- **Redeem code rules hardened** in both `database.rules.json` and `firestore.rules`:
  - **RTDB `redeem_codes/{codeId}`**: per-child `.validate` rules now lock the immutable reward fields (`type`, `amount`, `maxUses`, `subTier`, `subLevel`, `code`) so a student can only update `usedCount` (monotonic increase) and append to `redeemedBy`. Admin / sub-admin bypass the per-child lock so they can edit codes from the admin panel.
  - **Firestore `redeem_codes/{codeId}`**: existing `affectedKeys().hasOnly(['usedCount', 'isRedeemed', 'redeemedBy'])` rule kept (it already matches the `RedeemSection.tsx` write payload).
  - The strict old `.validate` that demanded `newData.hasChildren(['type'])` was removed — it was tripping during partial transactions and causing redeems to fail silently.
- **"Show All Answers" lifted to the TOP** of the Lucent Q&A list (`reveal` mode) so students don't have to scroll past the question stack to reveal everything. Old bottom button removed (no duplicate).
- **Daily GK Corner card** added as a fixed card at the top of the Homework page (`StudentDashboard.tsx` ~line 6529). Replaces the tiny header-strip GK button. Card shows the count of today's new GK questions (with a pulsing "New" badge) and gives two prominent buttons: **"Aaj ka GK"** and **"GK History"**, both opening the Daily GK / History page.

## Recent Changes (Apr 28 — part 3) — Homework Manager refactor
- **Standard (Class 6-12) homework simplified** in `components/AdminDashboard.tsx`:
  - When `targetSubject === 'none'`, the Add tab now shows ONLY Date, Title, Audio URL, Video URL, PDF URL. Notes textarea + entire MCQ (structured + raw paste) section are hidden behind `{newHomework.targetSubject !== 'none' && ...}`.
  - A small info card explains that Notes/MCQs ke liye admin ko Competition mode chunna hoga (Lucent / Speedy / Sar Sangrah / MCQ — wahaan page-wise structured chunked TTS milta hai).
  - Save handler also gates `notes`, `mcqText`, `parsedMcqs` to empty when `targetSubject === 'none'` so old form state can't leak into the saved record.
  - Same gating in the History tab inline editor: notes/MCQ-text/parsed-MCQ editor only renders when `hw.targetSubject` is a Competition subject.
- **History tab search** added in Admin → Homework Manager → History: free-text input above subject filter chips searches title / notes / pageNo / date case-insensitive (state: `homeworkHistorySearch`, filter: `searchFn`).
- **MCQ paste parser** (`normalizeMcqPaste` in `AdminDashboard.tsx`) extended to handle the new format:
  - `**प्रश्न N: text?**` → unwraps the bold question line.
  - `**सही उत्तर: A) text**` (answer INSIDE the bold) → split into `सही उत्तर: A)` + the option text on the next line.
  - `(Easy/Medium/Hard)` difficulty markers stripped from option lines.
  - `---` separators between blocks honored, `(नोट:...)` parentheticals preserved.
- **Save-count badge moved**: `components/ChunkedNotesReader.tsx` no longer shows the "X students ne save kiya" badge inline next to each line — the reading view stays clean. The count is now shown only on the existing "Important / Starred Notes" Global tab page in `StudentDashboard.tsx` (~line 9965 / 10155 area).
- **Chunked-notes** (topic-wise + page-wise) was already wired via `ChunkedNotesReader` for homework notes (~line 2867 in `StudentDashboard.tsx`); this session keeps that intact.

## Recent Changes (Apr 28 — part 4) — Reverted: Standard homework gets full Competition format
- User clarified: Standard (Class 6-12) homework should ALSO get the full Competition-style structured Notes + MCQ + chunked TTS reader (Chapter Deep Dive / Save Offline / Auto Play layout). Earlier session (part 3) had hidden Notes/MCQ for Standard — that gating is now reverted.
- Reverted in `components/AdminDashboard.tsx`:
  - Removed the `{newHomework.targetSubject !== 'none' && (...)}` wrappers around the Notes textarea and MCQ section in the Add tab.
  - Removed the info card explaining Standard limitation.
  - Removed the `isStandard` early-empty gating in the Save handler so notes/mcqText/parsedMcqs persist for Standard entries too.
  - Removed the `{hw.targetSubject && hw.targetSubject !== 'none'}` wrapper in the History tab inline editor — Notes + MCQ-text + Parsed-MCQ editors now show for ALL homework entries again.
- Student side already used `ChunkedNotesReader` unconditionally for any homework with notes (StudentDashboard.tsx ~line 2867), so no changes needed — Class 6-12 entries automatically render with the same Competition-style topic-wise / page-wise chunked reader, TTS, Save Offline, Auto Play.
- Kept from part 3 (still valid): MCQ paste parser handles new format (`**प्रश्न N: text?**` / `**सही उत्तर: A) text**`), History tab free-text search, save-count badge moved off `ChunkedNotesReader` (only shows on the Important / Starred Notes Global tab).

## Recent Changes (Apr 28 — part 5) — Lucent form polish
- **Lucent (Page-wise) Target Class shrunk to Competition only**: `LUCENT_CLASS_TARGETS` in `components/AdminDashboard.tsx` (~line 461) now only exposes `'COMPETITION'` in the dropdown. Class 6-12 options removed because Class 6-12 students get the full Competition-style chunked Notes + MCQ + TTS reader directly through their own Homework path (admin uses Target Subject = None / MCQ / Speedy* / Sar Sangrah). The TS union type still includes `'6'..'12'` so any pre-existing saved Lucent entries with classLevel='6'..'12' load without breaking.
- **Lucent help text** updated to reflect Competition-only positioning and point admins to the Homework path for Class 6-12.
- **Note Content textarea enlarged**: each Lucent page row was a 3-column `[80px_120px_1fr]` grid where the Note Content textarea got squeezed to a vertical sliver on mobile (looked like "P / a / ge" stacked). Restructured into:
  - Row 1: 2-col grid `[100px_1fr]` for Page No. + Date.
  - Row 2: full-width textarea (`min-h-[200px]`, `resize-y`, `p-3`, `leading-relaxed`) on its own row with a tip line about chunked TTS.

## Recent Changes (Apr 28 — part 6) — PdfView (Class 6-12 chapters) chunked notes
- **Class 6-12 chapter notes (PdfView "Concept" / Deep Dive tab) now use the same Competition-style chunked reader.**
- Earlier the deep-dive topic content was rendered as one wall of HTML via `dangerouslySetInnerHTML` inside a `prose` block — every bullet / Hindi-danda sentence collapsed into a single paragraph, and there was no per-line tap-to-read TTS.
- `components/PdfView.tsx`:
  - Imported `ChunkedNotesReader`.
  - Replaced the single HTML block (~line 1503-1508) with `<ChunkedNotesReader content={topic.content} hideTopBar noteKey={"pdfview_${chapter.id}_topic_${idx}"} />`.
  - `splitIntoTopics` already handles HTML (strips tags + splits on Hindi danda `।`), so each bullet/sentence becomes its own tappable chunk with TTS — same as Lucent / Homework / Speedy notes.
  - Wrapped in `-mx-4 sm:-mx-6` so the chunked reader spans the card edge-to-edge (matches the screenshots aapne dikhaaye).

## Recent Changes (Apr 28 — part 7) — Global tab on Important Notes page fixed
- **Symptom**: Important Notes page → "Global" tab badge always showed `0`, even when the user had locally-saved notes (My Saved tab populated, "11,882 students saved" badge visible due to admin-set fake-boost). Tapping the Global tab worked (UI switched), but the community list was empty.
- **Root cause #1 — RTDB writes were silently rejected.** `services/noteStars.ts` `recordNoteStar` did `set(note_stars/$hash/users/$uid, true)` BEFORE the `runTransaction` that creates the `count` field. RTDB rules on `note_stars/$hash` require `newData.hasChildren(['count'])`, so the very first star for a brand-new topic-hash failed validation and the entire write was discarded. Result: `note_stars` stayed empty, subscription returned `{}`, Global tab showed 0.
  - Fix: in `services/noteStars.ts`, swap order — run the transaction first (which writes `count`+`label`+`users` atomically), then a best-effort `set` on the user flag.
- **Root cause #2 — wrong arg order on the Global tab Save/Unsave buttons.** In `components/StudentDashboard.tsx` (~line 10253 / 10272), the inline Save/Unsave buttons on community cards passed `(entry.label, user.id)` — but the service signatures are `recordNoteStar(userId, noteKey, topicText)` / `recordNoteUnstar(userId, topicText)`. So even when writes did go through, they were hashed under the user's UUID instead of the note text → no aggregation.
  - Fix: pass `(user.id, newEntry.noteKey, entry.label)` and `(user.id, entry.label)` respectively.
- **Backfill for existing users**: added a one-shot `useEffect` in `StudentDashboard.tsx` (~line 1163, gated by `didBackfillStarsRef`) that, after login, re-records each `starredNotes[i]` via the now-correct `recordNoteStar`. So users who had already saved notes during the bug period automatically get those notes registered in `note_stars` on next app open — making them appear on the Global tab.
- **`.indexOn` added** for `note_stars` in `database.rules.json` (`["count", "lastUpdated"]`) so the `orderByChild('count').limitToLast(200)` query in `subscribeToTopNoteStars` runs server-side instead of triggering Firebase's client-side fallback warning.
- **Note on rules deployment**: The local `database.rules.json` change must be pushed to Firebase via the Firebase console / CLI for the index hint to take effect in production. The query still works without it, just less efficiently.

## Recent Changes (Apr 28 — part 8) — Additional Notes + Teaching Strategy chunked reader
- Same treatment as part 7 (Deep Dive), now applied to the other two PdfView tabs in `components/PdfView.tsx`:
  - **Teaching Strategy** (TEACHER tab, ~line 1789): removed the broken `<SpeakButton text={currentNote.content}>` from the purple header and replaced the `dangerouslySetInnerHTML` HTML wall with `<ChunkedNotesReader content={currentNote.content} topBarLabel={currentNote.title} noteKey="pdfview_${chapter.id}_strategy_${currentStrategyIndex}">`. Each strategy bullet / Hindi-danda line is now its own tappable chunk with the reader's built-in "Read All" / "Stop" button, exactly like Deep Dive.
  - **Additional Notes / Resource overlay** (RESOURCES tab → tap a note, ~line 1287): the dark-mode `prose-invert` HTML block was replaced with a white-bg `<ChunkedNotesReader>` (white because the reader is styled for a light theme). The floating "Headphones / Pause" auto-play TTS button at the top is now hidden in text-only mode (`hasPdf && (...)` guard) — ChunkedNotesReader provides its own Read All. The button is preserved when a PDF is open alongside text content (PDF mode), since the reader can't render inside an iframe.
- Premium Audio buttons on both surfaces remain untouched.

## Recent Changes (Apr 29) — Lucent-style 3-mode MCQ for Class 6-12 + Notes ↔ MCQ tab switch
- **Goal**: Class 6-12 MCQ flow ko Lucent jaisa banana — top par **Notes ↔ MCQ** tab switch + Lucent-style **3-mode selector** (📝 MCQ · 💬 Q&A · 🃏 Flashcard).
- `components/StudentDashboard.tsx`:
  - Removed `hideMcq={isClass6to12}` from `LessonActionModal` so Class 6-12 students bhi modal me MCQ option dekhein.
  - Wired `onSwitchToNotes` → McqView and `onSwitchToMcq` → PdfView (both call `handleLessonOption`).
- `components/McqView.tsx`:
  - New `onSwitchToNotes?: () => void` prop.
  - New state: `selectionMode: 'MCQ' | 'QA' | 'CARD'`, plus Q&A reveal state (`qaData`, `qaRevealed`, `qaShowAll`).
  - New `handleStartQA()` — loads chapter MCQs (same fetch logic as Flashcard), enters new `'QA_REVEAL'` viewMode.
  - New **Q&A Reveal view** (Lucent-style): per-card "👁️ Tap to Reveal Answer" with green correct-answer card + explanation; top "Show All / Hide All" toggle.
  - SELECTION view header me added:
    - Notes/MCQ tab strip (visible only when `onSwitchToNotes` provided).
    - Lucent-style 3-mode selector strip (gradient pills with emoji icons + scale-up active state).
    - Q&A and Flashcard modes me 1-tap "Start" gradient button — directly launches.
    - MCQ mode me existing Free Practice + Premium Test cards conditionally render (`selectionMode === 'MCQ'`).
  - Removed standalone Flashcard card (now lives in the 3-mode selector).
- `components/PdfView.tsx`:
  - New `onSwitchToMcq?: () => void` prop.
  - Notes/MCQ tab strip inserted in sticky header (above existing School/Competition + Concept/Retention/Extended tabs), only when `onSwitchToMcq` provided and not in fullscreen.
- Reused `FlashcardMcqView` overlay (no new flashcard component needed).

## Recent Changes (Apr 29 — part 2) — Splash font moved to Admin + Important Notes drill-down
- **Splash font picker MOVED from user-facing splash → Admin > General Settings (admin-only, applies to all users):**
  - New `utils/splashFonts.ts` — single source of truth for `SPLASH_FONTS` list, `ensureGoogleFontLoaded`, `getSplashFontById`. Used by both `AppLoadingScreen.tsx` and `AdminDashboard.tsx`.
  - `types.ts`: added `splashFontId?: string` to `SystemSettings` (line 514).
  - `components/AppLoadingScreen.tsx`: removed inline `SPLASH_FONTS`, removed user-facing "Aa" picker button + overlay UI, removed `Type/Check/X` icon imports. Now reads `splashFontId` from `localStorage.nst_system_settings` (admin's choice), falls back to legacy `nst_splash_font_id`, then `'default'`. No more `showFontPicker` state — splash auto-progress timer no longer pauses.
  - `components/AdminDashboard.tsx`: imported splash font helpers; added a new "Loading Screen Font" picker tile in General Settings right after the "Loading Screen Logo Text Size" slider (~line 6678). Renders all 14 fonts as a 2-col live-preview grid using the admin's current `appShortName`. Hover preloads the Google Font; tap saves to `localSettings.splashFontId` (persists with the existing settings save flow).
- **Important Notes (saved/starred) page — 3-level page-wise drill-down for the "By Book / Page" view:**
  - `components/StudentDashboard.tsx`: added `drillBookKey` and `drillPageKey` state (~line 1099) reset whenever `importantNotesView` changes; imported `ChevronLeft` from lucide-react.
  - Replaced the always-expanded `bybook` render block (~line 10795) with a 3-level flow:
    1. **Books list** — each book card shows total notes + page count, click to drill in.
    2. **Pages of selected book** — breadcrumb + grid of page tiles each showing star count, click to drill in.
    3. **Notes of selected page** — breadcrumb (Books / Book / Page N) + ordered list of important notes for that exact page; tap a note opens the existing `setOpenNotePrompt` confirmation popup which jumps the user to the source.
  - The flat "List View" (which already shows book name + page number per note) is unchanged — drill-down is additive on the bybook tab only.

## Recent Changes (Apr 29 — part 3) — Pruned dead admin tiles & toggles
- `components/AdminDashboard.tsx`:
  - **General Settings** — removed: Welcome Popup toggle + target dropdown, Terms Popup toggle, Student AI Chat toggle, 3D Models in Notes toggle, MCQ Maker Card (Home) toggle, MCQ Maker App URL field, Maintenance Mode toggle. Kept: Competition Mode + Continue Reading Filter Chips toggles (now in a clean 2-col grid right after the Force Update button).
  - Removed the entire `activeTab === 'DOCUMENTATION'` render block (was unreachable — no tile pointed to it).
  - Removed the entire `activeTab === 'REVISION_LOGIC'` render block (~155 lines — also unreachable; thresholds/intervals/mastery configs deleted from the admin UI).
- `utils/featureRegistry.ts`: removed the `ADMIN_POPUPS` entry (Popup Config tile) — it pointed to a non-existent `CONFIG_POPUPS` route, so tapping it was a dead-end.
- Deleted orphan files: `components/admin/DocumentationTab.tsx` and `utils/appDocumentation.ts` (only consumer was the removed DOCUMENTATION tab).
- Verified: AI Center, Standalone AI Feature, Chat System Mode, Watermark Opacity, Loading Screen Intro Video URL — already absent from the codebase (no edits needed).
- Untouched (intentional): the **Revision Logic Toggle** inside Store Manager → Advanced Store Events (different feature — controls store events, not the deleted REVISION_LOGIC tab); the **Chat Room Manager** under `CONFIG_CHAT` (this is room CRUD, not "Chat System Mode").

## Recent Changes (Apr 29 — part 4) — Revision Hub V2, Universal Video top-bar toggle, 200+ splash fonts
- **Splash font picker expanded to 200+ Google Fonts (admin-only):**
  - `utils/splashFonts.ts`: rewrote `SPLASH_FONTS` to 205 entries covering display, serif, sans, handwriting, monospace, script, decorative families. `ensureGoogleFontLoaded()` lazy-injects each `<link>` only once on hover/save. Picker still lives on the Admin Loading Screen settings tile (no student exposure).
- **Universal Video — top-bar admin toggle:**
  - `types.ts`: added `universalVideoInTopBar?: boolean` to `SystemSettings`.
  - `components/AdminDashboard.tsx`: new General Settings toggle "Universal Video in Top Bar" (right before the Competition Mode block).
  - `components/StudentDashboard.tsx`: when toggle is ON, a `Video` icon button appears in the top header that opens the existing Universal Video flow; the bottom-nav `VIDEO` tab is hidden so it isn't duplicated.
- **Revision Hub V2 — page-aware MCQ tracking → auto note search (fresh code, no admin notes):**
  - `utils/revisionTrackerV2.ts` (new): localStorage-backed tracker keyed by `${subjectId}::${chapterId}::${pageKey}::${topic}` where `pageKey = pg-${chapter.pageNo}` if present else `chapterId`. Exposes `recordAttempt`, `getWeakBuckets` (sorted by wrong-rate × volume), `keywordsForBucket` (extracts salient keywords from topic + chapter title), and `clearTracker`.
  - `components/McqView.tsx`: imported `recordRevisionAttempt`; on submit, every wrong answer is logged with subjectId, chapterId, pageNo, and the question's topic/chapterTitle so weak-area buckets accumulate.
  - `components/RevisionHubV2.tsx` (new): lists weak buckets, then for the active bucket auto-searches recent chapters (`getRecentChapters`) and the live catalog (`fetchChapters`) for matching titles/descriptions and surfaces snippets the student can tap to jump straight into that chapter via `handleChapterSelect`. No admin-curated notes are involved.
  - `components/StudentDashboard.tsx`: added `LogicalTab 'REVISION_V2'` + native-active-tabs entry; render branch wires `onOpenChapter → handleChapterSelect` (lightweight stub; chapter view loads its own content); REVISION tab inserted in bottom nav right after HOMEWORK, gated by `settings.revisionHubV2Enabled !== false`.
- **Profile-in-menu admin toggle:**
  - `types.ts`: added `revisionHubV2Enabled?: boolean` and `profileInMenuForced?: boolean`.
  - `components/AdminDashboard.tsx`: two new General Settings toggles — "Revision Hub V2" (master switch for the new tab) and "Force Profile in Menu Drawer" (moves Profile out of the bottom nav even when V2 is off).
  - `components/StudentDashboard.tsx`: PROFILE bottom tab is suppressed when V2 is enabled OR `profileInMenuForced` is true; in either case a Profile entry is added to the sidebar drawer under the "Account" category so the user can still reach it.
