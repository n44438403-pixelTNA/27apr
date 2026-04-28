import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Volume2, Square, BookOpen, Star } from 'lucide-react';
import { speakText, stopSpeech } from '../utils/textToSpeech';
import { splitIntoTopics, NotesTopic as Topic } from '../utils/notesSplitter';

const FONT_SIZES = [13, 15, 17, 20] as const;
const FONT_SIZE_KEY = 'nst_reading_font_size';

const getStoredFontIdx = (): number => {
  try {
    const v = parseInt(localStorage.getItem(FONT_SIZE_KEY) || '1', 10);
    return isNaN(v) || v < 0 || v > 3 ? 1 : v;
  } catch { return 1; }
};

interface Props {
  content: string;
  className?: string;
  language?: string;
  topBarLabel?: string;
  /** When true, the reader starts "Read All" automatically on mount / content change. */
  autoStart?: boolean;
  /** Fires after the last topic has finished being read aloud. */
  onComplete?: () => void;
  /** Fires the moment "Read All" / tap-to-read TTS begins (start of any read session).
   *  Used to immediately mark a note as "in progress" in Continue Reading. */
  onReadingStart?: () => void;
  /** When true, hides the sticky "Read All" top bar (use when parent renders controls externally). */
  hideTopBar?: boolean;
  /** Topic index to scroll to / highlight on mount (used to restore reading position
   *  after a tab switch unmounts and remounts the reader). */
  initialIndex?: number | null;
  /** Fired with the latest topic index the user is at (tap-to-read or auto-advance)
   *  so the parent can persist it for later restoration. */
  onPositionChange?: (idx: number) => void;
  /** Unique key for this note (e.g. "hw_abc123") to namespace saved stars. */
  noteKey?: string;
  /** Returns true if a topic text is currently starred. */
  isStarred?: (text: string) => boolean;
  /** Called when user taps the star on a topic. */
  onStarToggle?: (text: string) => void;
}


export const ChunkedNotesReader: React.FC<Props> = ({ content, className, language = 'hi-IN', topBarLabel, autoStart, onComplete, onReadingStart, hideTopBar, initialIndex, onPositionChange, noteKey, isStarred, onStarToggle }) => {
  const topics = useMemo(() => splitIntoTopics(content), [content]);

  const [activeIdx, setActiveIdx] = useState<number | null>(initialIndex ?? null);
  const [isReading, setIsReading] = useState(false);
  const isReadingRef = useRef(false);
  useEffect(() => { isReadingRef.current = isReading; }, [isReading]);

  // Font scaling
  const [fontIdx, setFontIdx] = useState<number>(getStoredFontIdx);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const fontSize = FONT_SIZES[fontIdx];

  const changeFontSize = (delta: number) => {
    setFontIdx(prev => {
      const next = Math.max(0, Math.min(3, prev + delta));
      try { localStorage.setItem(FONT_SIZE_KEY, String(next)); } catch {}
      return next;
    });
    try { if (navigator.vibrate) navigator.vibrate(30); } catch {}
  };

  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Notify parent whenever the active line changes so position can be persisted.
  const onPositionChangeRef = useRef(onPositionChange);
  useEffect(() => { onPositionChangeRef.current = onPositionChange; }, [onPositionChange]);
  useEffect(() => {
    if (activeIdx !== null && onPositionChangeRef.current) {
      onPositionChangeRef.current(activeIdx);
    }
  }, [activeIdx]);

  // On first mount, scroll the saved line into view (without auto-playing).
  useEffect(() => {
    if (initialIndex == null) return;
    const t = setTimeout(() => {
      itemRefs.current[initialIndex]?.scrollIntoView({ behavior: 'auto', block: 'center' });
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep a stable ref to the latest onComplete so playFrom (memoised) always
  // calls the freshest version without retriggering its dependencies.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const playFrom = useCallback((idx: number) => {
    if (!isReadingRef.current) return;
    if (idx >= topics.length) {
      isReadingRef.current = false;
      setIsReading(false);
      setActiveIdx(null);
      if (onCompleteRef.current) onCompleteRef.current();
      return;
    }
    setActiveIdx(idx);
    setTimeout(() => {
      itemRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
    speakText(
      topics[idx].text,
      undefined,
      1.0,
      language,
      undefined,
      () => {
        if (isReadingRef.current) playFrom(idx + 1);
      }
    );
  }, [topics, language]);

  // Stable ref to the latest onReadingStart so we can call it from startFromIndex
  // without making the callback identity unstable.
  const onReadingStartRef = useRef(onReadingStart);
  useEffect(() => { onReadingStartRef.current = onReadingStart; }, [onReadingStart]);

  const startFromIndex = useCallback((startIdx: number) => {
    if (topics.length === 0) return;
    stopSpeech();
    isReadingRef.current = true;
    setIsReading(true);
    // Notify parent so it can flag this note as "in progress" right away.
    if (onReadingStartRef.current) {
      try { onReadingStartRef.current(); } catch {}
    }
    // Defer to next tick so cancel() flushes before speak()
    setTimeout(() => playFrom(startIdx), 80);
  }, [playFrom, topics.length]);

  const stopAll = useCallback(() => {
    isReadingRef.current = false;
    setIsReading(false);
    setActiveIdx(null);
    stopSpeech();
  }, []);

  // Stop on unmount or when content changes
  useEffect(() => {
    return () => {
      isReadingRef.current = false;
      stopSpeech();
    };
  }, []);

  // Reset position only when content actually changes after the first render
  // (so a fresh mount with restored initialIndex isn't immediately wiped).
  const contentChangedOnce = useRef(false);
  useEffect(() => {
    if (!contentChangedOnce.current) {
      contentChangedOnce.current = true;
      return;
    }
    stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Auto-start "Read All" when the autoStart prop is true (used by Lucent's
  // Auto-Read & Sync mode to chain pages together). Defer slightly so that the
  // stopAll() above on content change has a chance to flush first.
  useEffect(() => {
    if (!autoStart) return;
    if (topics.length === 0) return;
    const t = setTimeout(() => startFromIndex(0), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, content]);

  if (topics.length === 0) {
    return (
      <div className={`text-center py-10 text-slate-400 ${className || ''}`}>
        <BookOpen size={36} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm font-medium">No readable text</p>
      </div>
    );
  }

  return (
    <div className={className || ''}>
      {/* Header with font controls + Read All */}
      {!hideTopBar && (
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm py-2 mb-3 border-b border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-bold text-slate-600 truncate min-w-0">
              {topBarLabel || 'Notes'}
              <span className="text-slate-400 font-medium ml-2">
                {isReading && activeIdx !== null
                  ? `${activeIdx + 1} / ${topics.length}`
                  : `${topics.length} topics`}
              </span>
            </div>

            {/* Font size controls */}
            <div className="flex items-center gap-1 shrink-0">
              <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => changeFontSize(-1)}
                  disabled={fontIdx === 0}
                  className="px-2 py-1.5 text-slate-600 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-30 transition text-xs font-black"
                  title="Font chhota karein"
                  aria-label="Font chhota"
                >
                  A-
                </button>
                <span className="w-px h-4 bg-slate-300" />
                <button
                  type="button"
                  onClick={() => changeFontSize(1)}
                  disabled={fontIdx === 3}
                  className="px-2 py-1.5 text-slate-600 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-30 transition text-sm font-black"
                  title="Font bada karein"
                  aria-label="Font bada"
                >
                  A+
                </button>
              </div>

              <button
                onClick={() => {
                  if (isReading) {
                    try { if (navigator.vibrate) navigator.vibrate(30); } catch {}
                    stopAll();
                  } else {
                    try { if (navigator.vibrate) navigator.vibrate(50); } catch {}
                    startFromIndex(initialIndex ?? 0);
                  }
                }}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm active:scale-95 transition ${
                  isReading
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isReading ? <><Square size={13} /> Stop</> : initialIndex ? <><Volume2 size={13} /> Continue</> : <><Volume2 size={13} /> Read All</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Topic list — tap any line to start TTS from that line */}
      <div className="space-y-1.5">
        {topics.map((topic, idx) => {
          const isActive = isReading && activeIdx === idx;
          // Headings are non-readable so keep them as static blocks.
          if (topic.isHeading) {
            return (
              <div
                key={`tp-${idx}`}
                ref={(el) => { itemRefs.current[idx] = el; }}
                className="mt-4 mb-2 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-50 to-transparent border-l-4 border-indigo-400"
              >
                <p
                  className="font-black text-indigo-800 uppercase tracking-wide"
                  style={{ fontSize: `${Math.min(fontSize + 2, 20)}px` }}
                >
                  {topic.text}
                </p>
              </div>
            );
          }

          // Whole topic is a button so taps anywhere on the line start/stop TTS.
          const starred = isStarred ? isStarred(topic.text) : false;
          return (
            <div
              key={`tp-${idx}`}
              ref={(el) => { itemRefs.current[idx] = el as any; }}
              className={`group relative w-full rounded-lg transition-colors ${
                isActive
                  ? 'bg-yellow-50 ring-2 ring-yellow-300'
                  : starred
                    ? 'bg-amber-50'
                    : 'hover:bg-slate-50'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  try { if (navigator.vibrate) navigator.vibrate(isActive ? 30 : 50); } catch {}
                  if (isActive) stopAll();
                  else startFromIndex(idx);
                }}
                aria-label={isActive ? 'Stop reading this line' : 'Read from this line'}
                title={isActive ? 'Tap to stop' : 'Tap to read from here'}
                className="w-full text-left pl-4 pr-10 py-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              >
                <p
                  className={`leading-relaxed ${isActive ? 'text-yellow-900 font-semibold' : 'text-slate-800'}`}
                  style={{ fontSize: `${fontSize}px` }}
                >
                  <span className={`font-bold mr-1.5 ${starred ? 'text-amber-400' : 'text-indigo-400'}`}>•</span>
                  {topic.text}
                </p>
              </button>
              {/* TTS active indicator */}
              {isActive && (
                <span
                  className="absolute right-8 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-red-100 text-red-600 animate-pulse pointer-events-none"
                  aria-hidden="true"
                >
                  <Square size={12} fill="currentColor" />
                </span>
              )}
              {/* Star button — only show when onStarToggle is provided */}
              {onStarToggle && (
                <button
                  type="button"
                  onClick={() => onStarToggle(topic.text)}
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${
                    starred
                      ? 'text-amber-400 bg-amber-100 hover:bg-amber-200'
                      : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50'
                  }`}
                  aria-label={starred ? 'Remove star' : 'Star this note'}
                  title={starred ? 'Starred' : 'Star this note'}
                >
                  <Star size={13} className={starred ? 'fill-amber-400' : ''} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
