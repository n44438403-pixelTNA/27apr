import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, ChevronRight, RotateCw, Volume2, Square, Shuffle, BookOpen } from 'lucide-react';
import type { MCQItem } from '../types';
import { speakText, stopSpeech } from '../utils/textToSpeech';
import { McqSpeakButtons } from './McqSpeakButtons';

interface Props {
  questions: MCQItem[];
  title?: string;
  subtitle?: string;
  onBack: () => void;
}

const stripHtml = (s: string) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export const FlashcardMcqView: React.FC<Props> = ({ questions, title, subtitle, onBack }) => {
  const [order, setOrder] = useState<number[]>(() => questions.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState<null | 'q' | 'a'>(null);
  const lastSpokenRef = useRef<string>('');

  // Reset on questions change
  useEffect(() => {
    setOrder(questions.map((_, i) => i));
    setPos(0);
    setFlipped(false);
  }, [questions]);

  // Stop TTS on unmount or tab hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        stopSpeech();
        setAutoSpeak(null);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopSpeech();
    };
  }, []);

  const total = order.length;
  const currentQ = useMemo(() => questions[order[pos]] || null, [questions, order, pos]);

  if (!currentQ) {
    return (
      <div className="fixed inset-0 z-[200] bg-white flex flex-col h-[100dvh]">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-full active:scale-95 transition" aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-base font-black text-slate-800">Flashcards</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <BookOpen size={48} className="text-slate-300 mb-3" />
          <p className="font-black text-slate-700">Koi MCQ available nahi hai</p>
          <p className="text-xs text-slate-500 mt-1">Pehle is chapter ka content load karein.</p>
        </div>
      </div>
    );
  }

  const goNext = () => {
    stopSpeech();
    setAutoSpeak(null);
    setFlipped(false);
    setPos(p => Math.min(total - 1, p + 1));
  };
  const goPrev = () => {
    stopSpeech();
    setAutoSpeak(null);
    setFlipped(false);
    setPos(p => Math.max(0, p - 1));
  };
  const reshuffle = () => {
    stopSpeech();
    setAutoSpeak(null);
    setFlipped(false);
    const shuffled = [...order];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setOrder(shuffled);
    setPos(0);
  };
  const flip = () => {
    stopSpeech();
    setAutoSpeak(null);
    setFlipped(f => !f);
  };

  const playSide = (side: 'q' | 'a') => {
    const cleanQ = stripHtml(currentQ.question);
    const opts = (currentQ.options || []).map(o => stripHtml(o));
    const text = side === 'q'
      ? `Question: ${cleanQ}. Options ye hain: ${opts.map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${o}`).join('. ')}`
      : `Sahi jawab: Option ${String.fromCharCode(65 + currentQ.correctAnswer)}, ${opts[currentQ.correctAnswer] || ''}.${currentQ.explanation ? ` Explanation: ${stripHtml(currentQ.explanation)}` : ''}`;
    if (autoSpeak === side && lastSpokenRef.current === text) {
      stopSpeech();
      setAutoSpeak(null);
      return;
    }
    stopSpeech();
    setAutoSpeak(side);
    lastSpokenRef.current = text;
    speakText(text, null, 1.0, 'hi-IN', () => setAutoSpeak(side), () => setAutoSpeak(null)).catch(() => setAutoSpeak(null));
  };

  return (
    <div className="fixed inset-0 z-[200] bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col h-[100dvh]">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-full active:scale-95 transition" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest truncate">Flashcard Mode</p>
          <h2 className="text-base font-black text-slate-800 truncate">{title || 'MCQ Flashcards'}</h2>
          {subtitle && <p className="text-[10px] font-bold text-slate-500 truncate">{subtitle}</p>}
        </div>
        <button
          onClick={reshuffle}
          className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-full active:scale-95 transition"
          title="Shuffle"
          aria-label="Shuffle questions"
        >
          <Shuffle size={16} />
        </button>
      </div>

      {/* Progress */}
      <div className="bg-white/70 border-b border-slate-100 px-4 py-2 flex items-center justify-between">
        <div className="text-[11px] font-bold text-slate-600">
          <span className="text-indigo-600 font-black">{pos + 1}</span>
          <span className="text-slate-400"> / {total}</span>
          <span className="text-slate-400 ml-2 font-bold">{flipped ? 'Answer side' : 'Question side'}</span>
        </div>
        <div className="flex-1 mx-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
            style={{ width: `${((pos + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex items-start justify-center">
        <div className="w-full max-w-2xl">
          <button
            type="button"
            onClick={flip}
            className="w-full text-left bg-white rounded-3xl shadow-xl border-2 border-slate-200 p-5 sm:p-7 active:scale-[0.99] transition-transform min-h-[320px] flex flex-col"
            title="Tap karke flip karein"
          >
            {!flipped ? (
              // Front: Question + options
              <>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <span className="bg-indigo-100 text-indigo-700 text-[11px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                    Q {pos + 1}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); playSide('q'); }}
                    className={`p-2 rounded-full shrink-0 transition ${autoSpeak === 'q' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700'}`}
                    title="Question + options sune"
                  >
                    {autoSpeak === 'q' ? <Square size={14} /> : <Volume2 size={14} />}
                  </button>
                </div>
                <p className="text-base sm:text-lg font-black text-slate-800 leading-snug mb-4">
                  {currentQ.question}
                </p>
                {currentQ.statements && currentQ.statements.length > 0 && (
                  <div className="mb-3 space-y-1.5 pl-3 border-l-2 border-slate-200">
                    {currentQ.statements.map((s, i) => (
                      <p key={i} className="text-sm text-slate-600">{s}</p>
                    ))}
                  </div>
                )}
                <div className="space-y-2 mb-4">
                  {(currentQ.options || []).map((opt, oi) => (
                    <div
                      key={oi}
                      className="flex items-start gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700"
                    >
                      <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black bg-white border border-slate-300 text-slate-600">
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto flex items-center justify-center gap-2 text-[11px] font-black text-indigo-500 uppercase tracking-wider">
                  <RotateCw size={13} /> Tap karke answer dekhein
                </div>
              </>
            ) : (
              // Back: Answer + explanation
              <>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <span className="bg-emerald-100 text-emerald-700 text-[11px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                    Answer
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); playSide('a'); }}
                    className={`p-2 rounded-full shrink-0 transition ${autoSpeak === 'a' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700'}`}
                    title="Answer + explanation sune"
                  >
                    {autoSpeak === 'a' ? <Square size={14} /> : <Volume2 size={14} />}
                  </button>
                </div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Sahi Jawab</p>
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 mb-3">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-black bg-emerald-600 text-white">
                      {String.fromCharCode(65 + currentQ.correctAnswer)}
                    </span>
                    <p className="text-base font-black text-emerald-900 leading-snug">
                      {currentQ.options?.[currentQ.correctAnswer] || '—'}
                    </p>
                  </div>
                </div>
                {currentQ.explanation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-700 mb-1">Explanation</p>
                    <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{currentQ.explanation}</p>
                  </div>
                )}
                {currentQ.concept && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-purple-700 mb-1">Concept</p>
                    <p className="text-sm text-purple-900 leading-relaxed whitespace-pre-wrap">{currentQ.concept}</p>
                  </div>
                )}
                {currentQ.examTip && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1">Exam Tip</p>
                    <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{currentQ.examTip}</p>
                  </div>
                )}
                {currentQ.mnemonic && (
                  <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 mb-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-pink-700 mb-1">Memory Trick</p>
                    <p className="text-sm text-pink-900 leading-relaxed whitespace-pre-wrap">{currentQ.mnemonic}</p>
                  </div>
                )}
                <div className="mt-auto flex items-center justify-center gap-2 text-[11px] font-black text-emerald-600 uppercase tracking-wider pt-3">
                  <RotateCw size={13} /> Tap karke wapas question dekhein
                </div>
              </>
            )}
          </button>

          {/* Quick speak buttons (independent of card flip) */}
          <div className="mt-4 flex justify-center">
            <McqSpeakButtons
              question={currentQ.question}
              options={currentQ.options || []}
              correctAnswer={currentQ.correctAnswer}
            />
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <button
          disabled={pos === 0}
          onClick={goPrev}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm transition-all ${
            pos === 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 active:scale-95'
          }`}
        >
          <ChevronRight size={16} className="rotate-180" /> Prev
        </button>
        <button
          onClick={flip}
          className="shrink-0 px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md active:scale-95 transition flex items-center gap-1.5"
        >
          <RotateCw size={14} /> Flip
        </button>
        <button
          disabled={pos >= total - 1}
          onClick={goNext}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm transition-all ${
            pos >= total - 1
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-95'
          }`}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
