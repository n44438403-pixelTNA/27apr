import { stripHtml } from './textToSpeech';

export interface NotesTopic {
  text: string;
  isHeading: boolean;
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

  return topics
    .map(t => ({ ...t, text: t.text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\s+/g, ' ').trim() }))
    .filter(t => t.text.length > 0);
};
