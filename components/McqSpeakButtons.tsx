import React, { useEffect, useState } from 'react';
import { Volume2, Square, ListChecks } from 'lucide-react';
import { speakText, stopSpeech } from '../utils/textToSpeech';

interface AllQ {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface Props {
  question: string;
  options: string[];
  correctAnswer: number;
  className?: string;
  iconSize?: number;
  language?: string;
  /** Optional unique id used to coordinate between multiple instances on the page. */
  scopeId?: string;
  /**
   * If provided, tapping "Q+Ans" will chain-read every question's
   * question + correct answer (no options) from `index` onwards.
   * Falls back to single-question Q+A when omitted.
   */
  allQuestions?: AllQ[];
  index?: number;
}

const stripHtml = (s: string) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export const McqSpeakButtons: React.FC<Props> = ({
  question,
  options,
  correctAnswer,
  className,
  iconSize = 14,
  language = 'hi-IN',
  allQuestions,
  index = 0,
}) => {
  const [active, setActive] = useState<null | 'qa' | 'all'>(null);

  const cleanQ = stripHtml(question);
  const cleanOpts = options.map(o => stripHtml(o));
  const correctText = cleanOpts[correctAnswer] ?? '';

  const qaText = `Question: ${cleanQ}. Sahi jawab: ${correctText}.`;
  const allText = `Question: ${cleanQ}. Options ye hain: ${cleanOpts
    .map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${o}`)
    .join('. ')}. Sahi jawab: Option ${String.fromCharCode(65 + correctAnswer)}, ${correctText}.`;

  const stopAll = () => {
    stopSpeech();
    setActive(null);
  };

  // Sequential chain reader for the Q+Ans button (no options).
  const playQaChain = async () => {
    if (!allQuestions || allQuestions.length === 0) return;
    const start = Math.max(0, Math.min(index, allQuestions.length - 1));
    setActive('qa');
    let cancelled = false;
    const stopCheck = () => cancelled;
    // Allow user to cancel by clicking again — we listen via active state in closure.
    // The state-clear in stopAll() will set active=null which we check between items.
    for (let i = start; i < allQuestions.length; i++) {
      if (cancelled) break;
      const q = allQuestions[i];
      const cq = stripHtml(q.question);
      const ca = stripHtml(q.options[q.correctAnswer] ?? '');
      const text = `Question ${i + 1}: ${cq}. Sahi jawab: ${ca}.`;
      try {
        await new Promise<void>((resolve) => {
          speakText(text, null, 1.0, language, () => {}, () => resolve())
            .catch(() => resolve());
        });
      } catch {
        break;
      }
      // Re-check cancellation after each utterance — if user toggled off,
      // setActive(null) was called and we should stop the chain.
      // We approximate by reading from the closure-captured setter via a flag.
      if (typeof window !== 'undefined' && (window as any).__mcqQaChainStop) {
        cancelled = true;
        (window as any).__mcqQaChainStop = false;
        break;
      }
    }
    setActive((cur) => (cur === 'qa' ? null : cur));
  };

  const play = (mode: 'qa' | 'all') => {
    if (active === mode) {
      // Toggle off
      if (mode === 'qa' && allQuestions && allQuestions.length > 0 && typeof window !== 'undefined') {
        (window as any).__mcqQaChainStop = true;
      }
      stopAll();
      return;
    }
    stopSpeech();
    if (mode === 'qa' && allQuestions && allQuestions.length > 0) {
      // Chain through all questions (no options).
      playQaChain();
      return;
    }
    setActive(mode);
    const text = mode === 'qa' ? qaText : allText;
    speakText(
      text,
      null,
      1.0,
      language,
      () => setActive(mode),
      () => setActive(null)
    ).catch(() => setActive(null));
  };

  // Stop on hide / unmount
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && active) {
        stopAll();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [active]);

  useEffect(() => {
    return () => {
      if (active) stopSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baseBtn =
    'inline-flex items-center gap-1 px-2 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-colors active:scale-95';

  return (
    <div className={`flex items-center gap-1.5 shrink-0 ${className || ''}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); play('qa'); }}
        title={allQuestions && allQuestions.length > 1 ? "Saare questions + sahi jawab sune (bina options ke)" : "Sirf question + sahi jawab sune"}
        aria-label="Read all questions and answers"
        className={`${baseBtn} ${
          active === 'qa'
            ? 'bg-red-100 text-red-600 animate-pulse'
            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        }`}
      >
        {active === 'qa' ? <Square size={iconSize} fill="currentColor" /> : <Volume2 size={iconSize} />}
        Q+Ans
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); play('all'); }}
        title="Question + saare options + sahi jawab sune"
        aria-label="Read question, all options and answer"
        className={`${baseBtn} ${
          active === 'all'
            ? 'bg-red-100 text-red-600 animate-pulse'
            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
        }`}
      >
        {active === 'all' ? <Square size={iconSize} fill="currentColor" /> : <ListChecks size={iconSize} />}
        All
      </button>
    </div>
  );
};
