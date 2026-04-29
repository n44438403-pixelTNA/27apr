// Revision Hub V2 — page-aware MCQ attempt tracker with spaced-repetition scheduling.
// Stores per-topic, per-chapter, per-page wrong-answer history + revision schedule so
// the Revision Hub can show students what to review today (notes) and what to practice
// tomorrow (MCQ), cycling until the topic is mastered.
//
// Storage: localStorage key `nst_revision_tracker_v2` → JSON map keyed by
// `${subjectId}::${chapterId}::${pageKey}::${topic}`.

import type { MCQItem } from '../types';
import type { RevisionConfig } from '../types';

export interface TopicBucket {
  subjectId: string;
  subjectName?: string;
  chapterId: string;
  chapterTitle?: string;
  pageKey: string;       // either an actual page id or a synthetic key when no pages exist
  pageLabel?: string;
  topic: string;
  total: number;
  correct: number;
  lastAttemptAt: number;
  // Up to 10 most-recent wrong question stems — used as extra search keywords.
  wrongQuestions: { question: string; correctOption?: string; explanation?: string; at: number }[];
  // Spaced-repetition schedule ------------------------------------------------
  // 'NOTES'  → student should read notes for this topic today
  // 'MCQ'    → student should practice MCQ for this topic today
  stage?: 'NOTES' | 'MCQ';
  // Unix ms timestamp when this item becomes due for the next review
  nextDueAt?: number;
  // How many full cycles (notes → MCQ) the student has completed for this topic
  cycleCount?: number;
}

export type TrackerMap = Record<string, TopicBucket>;

const STORAGE_KEY = 'nst_revision_tracker_v2';

function safeRead(): TrackerMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch { return {}; }
}

function safeWrite(map: TrackerMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch {}
}

export function bucketKey(subjectId: string, chapterId: string, pageKey: string, topic: string) {
  return `${subjectId}::${chapterId}::${pageKey}::${topic}`;
}

/** Returns the start-of-tomorrow (midnight) as a Unix ms timestamp. */
function tomorrowMidnight(): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Returns midnight today. */
function todayMidnight(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export interface RecordAttemptArgs {
  subjectId: string;
  subjectName?: string;
  chapterId: string;
  chapterTitle?: string;
  pageKey?: string;       // optional — defaults to chapterId so flat chapters still bucket correctly
  pageLabel?: string;
  questions: MCQItem[];
  userAnswers: (number | null)[];
}

export function recordAttempt(args: RecordAttemptArgs) {
  if (!args || !args.questions || !args.questions.length) return;
  const map = safeRead();
  const pageKey = args.pageKey || args.chapterId;
  const now = Date.now();
  args.questions.forEach((q, idx) => {
    const topic = (q.topic || 'General').trim() || 'General';
    const k = bucketKey(args.subjectId, args.chapterId, pageKey, topic);
    const prev: TopicBucket = map[k] || {
      subjectId: args.subjectId,
      subjectName: args.subjectName,
      chapterId: args.chapterId,
      chapterTitle: args.chapterTitle,
      pageKey, pageLabel: args.pageLabel,
      topic,
      total: 0, correct: 0,
      lastAttemptAt: now,
      wrongQuestions: [],
      stage: 'NOTES',
      nextDueAt: tomorrowMidnight(),
      cycleCount: 0,
    };
    prev.total += 1;
    const ans = args.userAnswers[idx];
    const isCorrect = ans !== null && ans !== undefined && ans === q.correctAnswer;
    if (isCorrect) {
      prev.correct += 1;
    } else {
      prev.wrongQuestions = [
        { question: q.question, correctOption: q.options?.[q.correctAnswer], explanation: q.explanation, at: now },
        ...prev.wrongQuestions,
      ].slice(0, 10);

      // Reset to NOTES stage if this is a new wrong answer and currently in MCQ or no stage
      if (!prev.stage || prev.stage === 'MCQ') {
        prev.stage = 'NOTES';
        // Only reschedule if not already due today or earlier
        const currentDue = prev.nextDueAt ?? 0;
        if (currentDue > now) {
          prev.nextDueAt = tomorrowMidnight();
        }
      } else if (!prev.nextDueAt) {
        prev.nextDueAt = tomorrowMidnight();
      }
    }
    prev.lastAttemptAt = now;
    // keep latest labels in case admin renames things later
    prev.subjectName = args.subjectName ?? prev.subjectName;
    prev.chapterTitle = args.chapterTitle ?? prev.chapterTitle;
    prev.pageLabel = args.pageLabel ?? prev.pageLabel;
    map[k] = prev;
  });
  safeWrite(map);
}

export function getAllBuckets(): TopicBucket[] {
  return Object.values(safeRead());
}

export interface WeakBucket extends TopicBucket {
  accuracy: number;   // 0..1
  wrongCount: number;
}

export function getWeakBuckets(opts?: { minAttempts?: number; maxAccuracy?: number }): WeakBucket[] {
  const minAttempts = opts?.minAttempts ?? 2;
  const maxAccuracy = opts?.maxAccuracy ?? 0.7;
  return getAllBuckets()
    .filter(b => b.total >= minAttempts)
    .map(b => ({ ...b, accuracy: b.correct / Math.max(b.total, 1), wrongCount: b.total - b.correct }))
    .filter(b => b.accuracy <= maxAccuracy)
    .sort((a, b) => a.accuracy - b.accuracy || b.wrongCount - a.wrongCount);
}

/** Returns items that are due for review today or overdue. */
export function getDueItems(): WeakBucket[] {
  const now = Date.now();
  return getAllBuckets()
    .filter(b => b.wrongQuestions.length > 0)                   // has at least one wrong question
    .filter(b => !b.nextDueAt || b.nextDueAt <= now)             // due today or overdue
    .map(b => ({ ...b, accuracy: b.correct / Math.max(b.total, 1), wrongCount: b.total - b.correct }))
    .sort((a, b) => (a.nextDueAt || 0) - (b.nextDueAt || 0));  // most overdue first
}

/** Returns items coming up in the next N days (but not due today). */
export function getUpcomingItems(days = 7): WeakBucket[] {
  const now = Date.now();
  const limit = now + days * 24 * 3600 * 1000;
  return getAllBuckets()
    .filter(b => b.wrongQuestions.length > 0)
    .filter(b => b.nextDueAt && b.nextDueAt > now && b.nextDueAt <= limit)
    .map(b => ({ ...b, accuracy: b.correct / Math.max(b.total, 1), wrongCount: b.total - b.correct }))
    .sort((a, b) => (a.nextDueAt || 0) - (b.nextDueAt || 0));
}

/** Mark a topic's notes as reviewed → schedule the MCQ for tomorrow. */
export function markNotesReviewed(key: string, config?: RevisionConfig) {
  const map = safeRead();
  const b = map[key];
  if (!b) return;
  const notesInterval = config?.intervals?.weak?.revision ?? 86400; // default 1 day
  // MCQ due tomorrow (or use weak.mcq if admin wants a gap after notes)
  const mcqGap = Math.min(config?.intervals?.weak?.mcq ?? 86400, 86400); // cap at 1 day for notes→MCQ
  b.stage = 'MCQ';
  b.nextDueAt = Date.now() + mcqGap * 1000;
  map[key] = b;
  safeWrite(map);
}

/** Mark an MCQ session done. accuracy = 0..1. Schedules next revision based on performance. */
export function markMcqDone(key: string, accuracy: number, config?: RevisionConfig) {
  const map = safeRead();
  const b = map[key];
  if (!b) return;

  const thresholds = config?.thresholds ?? { strong: 65, average: 50, mastery: 80 };
  const intervals = config?.intervals ?? {
    weak:     { revision: 86400,      mcq: 259200  },
    average:  { revision: 259200,     mcq: 432000  },
    strong:   { revision: 604800,     mcq: 864000  },
    mastered: { revision: 2592000,    mcq: 864000  },
  };

  const pct = accuracy * 100;
  let nextRevisionSecs: number;
  if (pct >= thresholds.mastery) {
    nextRevisionSecs = intervals.mastered.revision;
  } else if (pct >= thresholds.strong) {
    nextRevisionSecs = intervals.strong.revision;
  } else if (pct >= thresholds.average) {
    nextRevisionSecs = intervals.average.revision;
  } else {
    nextRevisionSecs = intervals.weak.revision;
  }

  b.stage = 'NOTES';
  b.nextDueAt = Date.now() + nextRevisionSecs * 1000;
  b.cycleCount = (b.cycleCount || 0) + 1;
  map[key] = b;
  safeWrite(map);
}

export function clearTracker() {
  safeWrite({});
}

// Build a list of search keywords for a weak bucket — topic name plus salient
// nouns from the wrong-question stems. The Revision Hub uses these to scan
// notes for matching content.
export function keywordsForBucket(b: TopicBucket): string[] {
  const stop = new Set(['the','a','an','of','and','or','to','in','on','with','for','is','are','was','were','be','been','by','from','as','at','that','this','these','those','it','its','which','who','whom','whose','what','how','when','where','why','about','into','than','then','also','any','all','some','most','more','less','one','two','three','four','five','first','second','third','because','if','but','not','no','do','does','did','have','has','had','can','could','should','would','may','might','will','shall','their','them','they','he','she','his','her','you','your','our','we','i','me','my','mine','option','options','correct','incorrect','answer','question','statement','statements','following','below','above','given','find','choose','select','mark','tick','example','examples','among','only','both','either','neither','many','much','very','well','best','worst','true','false']);
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: string | undefined) => {
    if (!raw) return;
    raw.toString().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).forEach(w => {
      if (!w || w.length < 3 || stop.has(w)) return;
      if (seen.has(w)) return;
      seen.add(w); out.push(w);
    });
  };
  push(b.topic);
  b.wrongQuestions.forEach(q => { push(q.question); push(q.correctOption); });
  return out.slice(0, 12);
}
