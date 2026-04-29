// Revision Hub V2 — auto-finds notes from the app's existing chapter content
// for topics where the student is weak (based on per-page MCQ tracking).
//
// Designed independently from the legacy components/RevisionHub.tsx — this is
// a fresh implementation. Notes are NEVER hand-added by admin; the app scans
// already-loaded chapter notes (and recently-read content) for keyword
// matches and presents them for revision.

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BrainCircuit, BookOpen, Trash2, ChevronRight, Sparkles, RefreshCw, Search } from 'lucide-react';
import type { SystemSettings, User } from '../types';
import { getWeakBuckets, keywordsForBucket, clearTracker, type WeakBucket } from '../utils/revisionTrackerV2';
import { fetchChapters } from '../services/groq';
import { getRecentChapters, type RecentChapterEntry } from '../utils/recentReads';

interface Props {
  user: User;
  settings?: SystemSettings;
  onBack: () => void;
  onOpenChapter?: (subjectId: string, chapterId: string, chapterTitle?: string) => void;
}

interface NoteHit {
  chapterId: string;
  chapterTitle: string;
  subjectId?: string;
  snippet: string;
  matchedKeywords: string[];
  source: 'recent' | 'chapter';
}

// Strip HTML and collapse whitespace.
function clean(html: string): string {
  if (!html) return '';
  const txt = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return txt.replace(/\s+/g, ' ').trim();
}

function findSnippet(text: string, keywords: string[]): { snippet: string; matched: string[] } | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  const matched: string[] = [];
  let firstHit = -1;
  for (const kw of keywords) {
    const i = lower.indexOf(kw);
    if (i >= 0) {
      matched.push(kw);
      if (firstHit < 0 || i < firstHit) firstHit = i;
    }
  }
  if (matched.length === 0) return null;
  const start = Math.max(0, firstHit - 80);
  const end = Math.min(text.length, firstHit + 240);
  let snippet = text.slice(start, end).trim();
  if (start > 0) snippet = '… ' + snippet;
  if (end < text.length) snippet = snippet + ' …';
  return { snippet, matched };
}

export const RevisionHubV2: React.FC<Props> = ({ user, settings, onBack, onOpenChapter }) => {
  const [buckets, setBuckets] = useState<WeakBucket[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [hits, setHits] = useState<NoteHit[]>([]);
  const [scanning, setScanning] = useState(false);

  // Reload weak topics whenever the page is opened or after a clear.
  useEffect(() => { setBuckets(getWeakBuckets()); }, []);

  const active = useMemo(() => buckets.find(b => `${b.chapterId}::${b.pageKey}::${b.topic}` === activeKey) || null, [buckets, activeKey]);

  // When a weak topic is selected, scan recently-read chapters' content
  // (already cached locally) for keyword matches and surface snippets.
  useEffect(() => {
    let cancelled = false;
    if (!active) { setHits([]); return; }
    setScanning(true);
    const keywords = keywordsForBucket(active);

    (async () => {
      const out: NoteHit[] = [];

      // 1) Scan recent chapters' titles + descriptions cheaply.
      const recents: RecentChapterEntry[] = (() => { try { return getRecentChapters(); } catch { return []; } })();
      recents.forEach(r => {
        const ct = r.chapter?.title || '';
        const cd = (r.chapter as any)?.description || '';
        const sn = r.subject?.name || '';
        const blob = clean(`${ct} ${cd} ${sn}`);
        const hit = findSnippet(blob, keywords);
        if (hit) out.push({
          chapterId: r.chapter?.id || r.id,
          chapterTitle: ct || 'Chapter',
          subjectId: r.subject?.id,
          snippet: hit.snippet,
          matchedKeywords: hit.matched,
          source: 'recent',
        });
      });

      // 2) Pull fresh chapter list from the catalog and scan titles + descriptions.
      try {
        const board = (user.board || 'CBSE') as any;
        const lang = ((user as any).preferredLanguage || 'English') as any;
        const stream = (user.stream || 'Science') as any;
        const cls = ((user as any).classLevel || (user as any).class || '10') as any;
        const subjectStub = { id: active.subjectId, name: active.subjectName || active.subjectId } as any;
        const data = await fetchChapters(board, cls, stream, subjectStub, lang).catch(() => []);
        (data || []).forEach((ch: any) => {
          const blob = clean(`${ch.title || ''} ${ch.description || ''}`);
          const hit = findSnippet(blob, keywords);
          if (hit && !out.find(o => o.chapterId === ch.id)) {
            out.push({
              chapterId: ch.id,
              chapterTitle: ch.title || 'Chapter',
              subjectId: active.subjectId,
              snippet: hit.snippet,
              matchedKeywords: hit.matched,
              source: 'chapter',
            });
          }
        });
      } catch {/* network optional */}

      if (!cancelled) {
        setHits(out.slice(0, 30));
        setScanning(false);
      }
    })();

    return () => { cancelled = true; };
  }, [active, user]);

  const handleClear = () => {
    if (!confirm('Clear all Revision Hub tracking data? Weak-topic buckets will be reset.')) return;
    clearTracker();
    setBuckets([]);
    setActiveKey(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <BrainCircuit size={20} className="text-indigo-600" />
            {settings?.appName ? `${settings.appName} Revision Hub` : 'Revision Hub'}
          </h2>
          <p className="text-[11px] text-slate-500 -mt-0.5">Auto-finds notes for your weakest topics</p>
        </div>
        {buckets.length > 0 && (
          <button onClick={handleClear} className="p-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600" title="Clear tracker">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {!active && (
        <div className="p-4 space-y-3">
          {buckets.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <Sparkles size={32} className="mx-auto text-indigo-400 mb-3" />
              <p className="font-bold text-slate-700 mb-1">No weak topics yet</p>
              <p className="text-sm text-slate-500">
                Solve some MCQs first. As you attempt questions, the app tracks per-page accuracy and surfaces topics where you struggle here — along with notes from your chapters to revise.
              </p>
            </div>
          )}

          {buckets.length > 0 && (
            <p className="text-[11px] uppercase font-bold text-slate-500 px-1">{buckets.length} weak {buckets.length === 1 ? 'topic' : 'topics'} — sorted by lowest accuracy</p>
          )}

          {buckets.map(b => {
            const k = `${b.chapterId}::${b.pageKey}::${b.topic}`;
            const pct = Math.round(b.accuracy * 100);
            const tone = pct < 30 ? 'rose' : pct < 50 ? 'orange' : 'amber';
            return (
              <button
                key={k}
                onClick={() => setActiveKey(k)}
                className={`w-full text-left rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition p-4 flex items-center gap-3`}
              >
                <div className={`w-12 h-12 rounded-xl bg-${tone}-50 text-${tone}-600 flex flex-col items-center justify-center font-black shrink-0`}>
                  <span className="text-base leading-none">{pct}%</span>
                  <span className="text-[8px] uppercase tracking-wide">acc</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate">{b.topic}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {b.subjectName || 'Subject'} · {b.chapterTitle || 'Chapter'}
                    {b.pageLabel ? ` · ${b.pageLabel}` : ''}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{b.wrongCount} wrong / {b.total} attempted</p>
                </div>
                <ChevronRight size={18} className="text-slate-400 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {active && (
        <div className="p-4 space-y-4">
          <button onClick={() => setActiveKey(null)} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
            <ArrowLeft size={14} /> Back to weak topics
          </button>

          <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 p-4">
            <p className="text-[10px] font-bold uppercase text-indigo-700">Weak Topic</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">{active.topic}</h3>
            <p className="text-xs text-slate-600 mt-1">
              {active.subjectName || 'Subject'} · {active.chapterTitle || 'Chapter'}
              {active.pageLabel ? ` · ${active.pageLabel}` : ''}
            </p>
            <div className="mt-2 text-[11px] text-indigo-700 font-bold">
              Accuracy {Math.round(active.accuracy * 100)}% · {active.wrongCount} wrong / {active.total} attempted
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-2 flex items-center gap-1">
              <Search size={12} /> Notes auto-found from your chapters
              {scanning && <RefreshCw size={11} className="animate-spin ml-1" />}
            </p>

            {!scanning && hits.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <p className="text-sm text-slate-500">
                  No matching notes found yet. Try opening a related chapter so its content gets cached, then come back.
                </p>
              </div>
            )}

            <div className="space-y-2">
              {hits.map((h, i) => (
                <button
                  key={i}
                  onClick={() => onOpenChapter?.(h.subjectId || active.subjectId, h.chapterId, h.chapterTitle)}
                  className="w-full text-left rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm p-3 transition"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen size={14} className="text-emerald-600 shrink-0" />
                    <span className="font-bold text-sm text-slate-800 truncate">{h.chapterTitle}</span>
                    <span className="ml-auto text-[9px] uppercase font-bold text-slate-400">{h.source === 'recent' ? 'Recent' : 'Catalog'}</span>
                  </div>
                  <p className="text-[12px] text-slate-600 leading-snug">{h.snippet}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {h.matchedKeywords.slice(0, 4).map(kw => (
                      <span key={kw} className="text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">{kw}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {active.wrongQuestions.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-500 mb-2">Recent wrong questions</p>
              <div className="space-y-2">
                {active.wrongQuestions.slice(0, 5).map((q, i) => (
                  <div key={i} className="rounded-xl bg-rose-50 border border-rose-200 p-3">
                    <p className="text-sm text-slate-800">{q.question}</p>
                    {q.correctOption && (
                      <p className="text-[11px] text-emerald-700 mt-1"><span className="font-bold">Correct:</span> {q.correctOption}</p>
                    )}
                    {q.explanation && (
                      <p className="text-[11px] text-slate-600 mt-1">{q.explanation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RevisionHubV2;
