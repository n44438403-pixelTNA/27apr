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
}


export const ChunkedNotesReader: React.FC<Props> = ({ content, className, language = 'hi-IN', topBarLabel, autoStart, onComplete }) => {
  const topics = useMemo(() => splitIntoTopics(content), [content]);

  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [isReading, setIsReading] = useState(false);
  const isReadingRef = useRef(false);
  useEffect(() => { isReadingRef.current = isReading; }, [isReading]);

  // Keep a stable ref to the latest onComplete so playFrom (memoised) always
  // calls the freshest version without retriggering its dependencies.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

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

  useEffect(() => {
    // Reset when content changes
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

      {/* Topic list */}
      <div className="space-y-1.5">
        {topics.map((topic, idx) => {
          const isActive = isReading && activeIdx === idx;
          // Insert a "Read from here" pill every 6 topics (i.e. on indices 5, 11, 17, ...)
          const showChunkAnchor = (idx + 1) % 6 === 0 && idx + 1 < topics.length;
          return (
            <React.Fragment key={`tp-${idx}`}>
              <div
                ref={(el) => { itemRefs.current[idx] = el; }}
                className={`group relative rounded-lg transition-colors ${
                  topic.isHeading
                    ? 'mt-4 mb-2 px-3 py-2 bg-gradient-to-r from-indigo-50 to-transparent border-l-4 border-indigo-400'
                    : `pl-4 pr-10 py-2 ${isActive ? 'bg-yellow-50 ring-2 ring-yellow-300' : 'hover:bg-slate-50'}`
                }`}
              >
                {topic.isHeading ? (
                  <p className="text-sm sm:text-base font-black text-indigo-800 uppercase tracking-wide">
                    {topic.text}
                  </p>
                ) : (
                  <p className={`text-sm sm:text-[15px] leading-relaxed ${isActive ? 'text-yellow-900 font-semibold' : 'text-slate-800'}`}>
                    <span className="text-indigo-400 font-bold mr-1.5">•</span>
                    {topic.text}
                  </p>
                )}

                {/* Per-topic TTS icon: hidden by default, visible only when this topic is active */}
                {!topic.isHeading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isActive) stopAll();
                      else startFromIndex(idx);
                    }}
                    aria-label={isActive ? 'Stop reading' : 'Read this topic'}
                    title={isActive ? 'Stop' : 'Read this topic'}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${
                      isActive
                        ? 'opacity-100 bg-red-100 text-red-600 animate-pulse'
                        : 'opacity-0 group-hover:opacity-100 bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600'
                    }`}
                  >
                    {isActive ? <Square size={12} fill="currentColor" /> : <Volume2 size={12} />}
                  </button>
                )}
              </div>

              {/* Chunk anchor: another Read All button every 6 topics */}
              {showChunkAnchor && (
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <button
                    onClick={() => (isReading ? stopAll() : startFromIndex(idx + 1))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 active:scale-95 transition"
                  >
                    {isReading ? <><Square size={11} /> Stop</> : <><Volume2 size={11} /> Read from here</>}
                  </button>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
