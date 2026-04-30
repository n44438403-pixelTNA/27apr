import { stripHtml } from './textToSpeech';

export interface NotesTopic {
  text: string;
  isHeading: boolean;
}

/**
 * Returns true if the string is essentially just ellipsis / dots / placeholders
 * and carries no real content — these lines come from AI truncation artifacts
 * or admin placeholder text and should be hidden from students.
 */
function isPlaceholderLine(t: string): boolean {
  const stripped = t.replace(/[.\u2026\s…\-_*]/g, '').trim();
  return stripped.length === 0;
}

/**
 * Removes trailing ellipsis / dots from a string (e.g. "topic text......" → "topic text").
 */
function stripTrailingDots(t: string): string {
  return t.replace(/[\s.…]+$/, '').trim();
}

/**
 * Splits notes content into a list of topic lines.
 * Handles markdown bullets (`*`, `-`, `•`), numbered items, headings (`###`),
 * `SET - N` style section labels, and plain HTML / text. Each non-empty line
 * becomes one topic; an indented continuation is appended to the previous topic.
 */
export const splitIntoTopics = (raw: string): NotesTopic[] => {
  if (!raw) return [];

  let text = raw;
  if (/[<][a-zA-Z!\/]/.test(text)) {
    text = text
      .replace(/<\s*br\s*\/?\s*>/gi, '\n')
      .replace(/<\/\s*(p|div|li|h[1-6]|tr|section|article)\s*>/gi, '\n')
      .replace(/<\s*li[^>]*>/gi, '\n* ')
      .replace(/<\s*h[1-6][^>]*>/gi, '\n### ');
    text = stripHtml(text);
  }

  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

  const rawLines = text.split(/\r?\n/);
  const topics: NotesTopic[] = [];
  let buffer = '';
  let bufferIsHeading = false;

  const flush = () => {
    const trimmed = buffer.trim();
    if (trimmed) topics.push({ text: trimmed, isHeading: bufferIsHeading });
    buffer = '';
    bufferIsHeading = false;
  };

  for (let line of rawLines) {
    line = line.replace(/\s+$/g, '');
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }

    const isMdHeading = /^#{1,6}\s+/.test(trimmed);
    const isShortBoldHeading = /^\*\*[^*]+\*\*\s*$/.test(trimmed) && trimmed.length < 80;
    const isSectionLabel = /^(SET|MODEL\s*SET|UNIT|CHAPTER|PART)\s*[-–]?\s*\d+/i.test(trimmed);

    if (isMdHeading || isShortBoldHeading || isSectionLabel) {
      flush();
      const cleaned = trimmed.replace(/^#{1,6}\s+/, '').replace(/^\*\*|\*\*$/g, '').trim();
      topics.push({ text: cleaned, isHeading: true });
      continue;
    }

    const isBulletStart = /^([*\-•]|\d+[.)])\s+/.test(trimmed);
    if (isBulletStart) {
      flush();
      buffer = trimmed.replace(/^([*\-•]|\d+[.)])\s+/, '');
    } else {
      if (buffer) {
        const indented = /^\s+/.test(line) || /^[-–]/.test(trimmed);
        if (indented) {
          buffer += ' ' + trimmed.replace(/^[-–]\s*/, '').trim();
          continue;
        }
        flush();
        buffer = trimmed;
      } else {
        buffer = trimmed;
      }
    }
  }
  flush();

  // Post-process: explode any topic line into per-sentence chunks so the
  // reader shows tappable lines instead of one giant paragraph blob. We split
  // on multiple boundaries (in priority order):
  //   1. Hindi danda (।)  — primary Hindi sentence end.
  //   2. English . ! ?    — followed by whitespace + capital / Devanagari /
  //      digit (avoids false splits inside abbreviations like "Dr." or
  //      "e.g." because those aren't followed by such characters).
  //   3. Inline section markers like "(IMPORTANT FACTS)", "(PRIMARY SECTOR):",
  //      "PART 1:", "🎯", "📝", "✏️" etc. — many imported library blobs glue
  //      everything inside one <p> with these as the only structure.
  // Headings are left intact. Empty / placeholder fragments are dropped.
  const SENTENCE_BOUNDARY = /(?<=[।.!?])\s+(?=[A-Z\u0900-\u097F0-9(])/g;
  // Section markers that should each START a new topic line.
  const SECTION_MARKERS = /(?=(?:PART|UNIT|CHAPTER|SECTION|SET|MODEL\s*SET)\s*[-–]?\s*\d+\s*[:.)])|(?=\([A-Z][A-Z\s\/]{2,}\)\s*[:.)])|(?=📝|🎯|✏️|📌|⭐|💡|🔥|✨|📚|🎓|⚡)/g;

  const splitOneTopic = (raw: string): string[] => {
    let out: string[] = [raw];
    // 1. Sentence-end split (covers Hindi danda + English . ! ?)
    out = out.flatMap(s => s.split(SENTENCE_BOUNDARY));
    // 2. Section-marker split (only for fragments still > ~120 chars,
    //    avoid breaking already-short lines).
    out = out.flatMap(s => (s.length > 120 ? s.split(SECTION_MARKERS) : [s]));
    return out.map(s => s.trim()).filter(Boolean);
  };

  const exploded: NotesTopic[] = [];
  for (const t of topics) {
    const cleaned = t.text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;

    // Skip pure-placeholder lines (only dots, dashes, ellipsis etc.)
    if (isPlaceholderLine(cleaned)) continue;

    if (t.isHeading) {
      exploded.push({ ...t, text: cleaned });
      continue;
    }

    const parts = splitOneTopic(cleaned);
    if (parts.length <= 1) {
      const finalText = stripTrailingDots(cleaned);
      if (finalText) exploded.push({ ...t, text: finalText });
      continue;
    }
    for (const p of parts) {
      if (!isPlaceholderLine(p)) {
        const finalText = stripTrailingDots(p) || p;
        if (finalText) exploded.push({ text: finalText, isHeading: false });
      }
    }
  }
  return exploded;
};
