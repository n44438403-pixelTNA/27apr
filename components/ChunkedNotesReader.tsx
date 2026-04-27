import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Volume2, Square, BookOpen } from 'lucide-react';
import { speakText, stopSpeech } from '../utils/textToSpeech';
import { splitIntoTopics, NotesTopic as Topic } from '../utils/notesSplitter';

interface Props {
  content: string;
  className?: string;
  language?: string;
  topBarLabel?: string;
  /** When true, the reader starts "Read All" automatically on mount / content change. */
  autoStart?: boolean;
  /** Fires after the last topic has finished being read aloud. */
  onComplete?: () => void;
  /** When true, hides the sticky "Read All" top bar (use when parent renders controls externally). */
  hideTopBar?: boolean;
  /** Topic index to scroll to / highlight on mount (used to restore reading position
   *  after a tab switch unmounts and remounts the reader). */
  initialIndex?: number | null;
  /** Fired with the latest topic index the user is at (tap-to-read or auto-advance)
   *  so the parent can persist it for later restoration. */
  onPositionChange?: (idx: number) => void;
}


export const ChunkedNotesReader: React.FC<Props> = ({ content, className, language = 'hi-IN', topBarLabel, autoStart, onComplete, hideTopBar, initialIndex, onPositionChange }) => {
  const topics = useMemo(() => splitIntoTopics(content), [content]);

  const [activeIdx, setActiveIdx] = useState<number | null>(initialIndex ?? null);
  const [isReading, setIsReading] = useState(false);
  const isReadingRef = useRef(false);
  useEffect(() => { isReadingRef.current = isReading; }, [isReading]);

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

  const startFromIndex = useCallback((startIdx: number) => {
    if (topics.length === 0) return;
    stopSpeech();
    isReadingRef.current = true;
    setIsReading(true);
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
      {/* Header with Read All */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm py-2 mb-3 flex items-center justify-between gap-3 border-b border-slate-100">
        <div className="text-xs font-bold text-slate-600 truncate">
          {topBarLabel || 'Notes'}
          <span className="text-slate-400 font-medium ml-2">
            {isReading && activeIdx !== null
              ? `${activeIdx + 1} / ${topics.length}`
              : `${topics.length} topics`}
          </span>
        </div>
        <button
          onClick={() => (isReading ? stopAll() : startFromIndex(0))}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm active:scale-95 transition ${
            isReading
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {isReading ? <><Square size={14} /> Stop</> : <><Volume2 size={14} /> Read All</>}
        </button>
      </div>

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
                <p className="text-sm sm:text-base font-black text-indigo-800 uppercase tracking-wide">
                  {topic.text}
                </p>
              </div>
            );
          }

          // Whole topic is a button so taps anywhere on the line start/stop TTS.
          return (
            <button
              key={`tp-${idx}`}
              ref={(el) => { itemRefs.current[idx] = el as any; }}
              type="button"
              onClick={() => {
                if (isActive) stopAll();
                else startFromIndex(idx);
              }}
              aria-label={isActive ? 'Stop reading this line' : 'Read from this line'}
              title={isActive ? 'Tap to stop' : 'Tap to read from here'}
              className={`group relative w-full text-left rounded-lg transition-colors pl-4 ${isActive ? 'pr-10' : 'pr-4'} py-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                isActive
                  ? 'bg-yellow-50 ring-2 ring-yellow-300'
                  : 'hover:bg-slate-50 active:bg-indigo-50'
              }`}
            >
              <p className={`text-sm sm:text-[15px] leading-relaxed ${isActive ? 'text-yellow-900 font-semibold' : 'text-slate-800'}`}>
                <span className="text-indigo-400 font-bold mr-1.5">•</span>
                {topic.text}
              </p>
              {/* Inline indicator: only visible while THIS line is being read; tapping the line itself triggers TTS */}
              {isActive && (
                <span
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-red-100 text-red-600 animate-pulse pointer-events-none"
                  aria-hidden="true"
                >
                  <Square size={12} fill="currentColor" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
