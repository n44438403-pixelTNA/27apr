import React, { useEffect, useRef, useState } from 'react';
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
   * If provided, both buttons chain-read every question from `index` onwards:
   *   - "Q+Ans" : question + correct answer (no options)
   *   - "All"   : question + every option + correct answer
   * Falls back to single-question reading when omitted.
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
  const cancelRef = useRef(false);

  const cleanQ = stripHtml(question);
  const cleanOpts = options.map(o => stripHtml(o));
  const correctText = cleanOpts[correctAnswer] ?? '';

  const qaText = `Question: ${cleanQ}. Sahi jawab: ${correctText}.`;
  const allText = `Question: ${cleanQ}. Options ye hain: ${cleanOpts
    .map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${o}`)
    .join('. ')}. Sahi jawab: Option ${String.fromCharCode(65 + correctAnswer)}, ${correctText}.`;

  const stopAll = () => {
    cancelRef.current = true;
    stopSpeech();
    setActive(null);
  };

  // Speak a single string and resolve when finished.
  const speakOnce = (text: string) =>
    new Promise<void>((resolve) => {
      speakText(text, null, 1.0, language, () => {}, () => resolve())
        .catch(() => resolve());
    });

  // Sequential chain reader. mode === 'qa' → no options, 'all' → with options.
  const playChain = async (mode: 'qa' | 'all') => {
    if (!allQuestions || allQuestions.length === 0) return;
    const start = Math.max(0, Math.min(index, allQuestions.length - 1));
    cancelRef.current = false;
    setActive(mode);
    for (let i = start; i < allQuestions.length; i++) {
      if (cancelRef.current) break;
      const q = allQuestions[i];
      const cq = stripHtml(q.question);
      const cOpts = (q.options || []).map((o) => stripHtml(o));
      const cAns = cOpts[q.correctAnswer] ?? '';
      const text =
        mode === 'qa'
          ? `Question ${i + 1}: ${cq}. Sahi jawab: ${cAns}.`
          : `Question ${i + 1}: ${cq}. Options ye hain: ${cOpts
              .map((o, oi) => `Option ${String.fromCharCode(65 + oi)}: ${o}`)
              .join('. ')}. Sahi jawab: Option ${String.fromCharCode(65 + q.correctAnswer)}, ${cAns}.`;
      try {
        await speakOnce(text);
      } catch {
        break;
      }
      if (cancelRef.current) break;
    }
    setActive((cur) => (cur === mode ? null : cur));
  };

  const play = (mode: 'qa' | 'all') => {
    if (active === mode) {
      // Toggle off — stop any in-flight chain or single utterance
      stopAll();
      return;
    }
    cancelRef.current = false;
    stopSpeech();
    if (allQuestions && allQuestions.length > 0) {
      // Chain through all questions
      playChain(mode);
      return;
    }
    // Fallback: single question
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
      if (active) stopSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baseBtn =
    'inline-flex items-center gap-1 px-2 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-colors active:scale-95';

  const isChainCapable = !!(allQuestions && allQuestions.length > 1);

  return (
    <div className={`flex items-center gap-1.5 shrink-0 ${className || ''}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); play('qa'); }}
        title={isChainCapable ? 'Saare questions + sahi jawab sune (bina options ke)' : 'Question + sahi jawab sune'}
        aria-label="Read question and answer"
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
        title={isChainCapable ? 'Saare questions + options + sahi jawab sune' : 'Question + saare options + sahi jawab sune'}
        aria-label="Read question, options and answer"
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
