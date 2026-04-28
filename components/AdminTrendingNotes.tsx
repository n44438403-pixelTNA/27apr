import React, { useEffect, useState } from 'react';
import { Star, TrendingUp, Users } from 'lucide-react';
import { subscribeToTopNoteStars, NoteStarEntry } from '../services/noteStars';

export const AdminTrendingNotes: React.FC = () => {
  const [entries, setEntries] = useState<Record<string, NoteStarEntry>>({});

  useEffect(() => {
    const unsub = subscribeToTopNoteStars(50, setEntries);
    return () => { try { unsub(); } catch {} };
  }, []);

  const ranked = Object.values(entries)
    .filter(e => e.count > 0 && e.label)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const topCount = ranked[0]?.count || 0;
  const totalSaves = ranked.reduce((sum, e) => sum + e.count, 0);
  const uniqueStudents = ranked.reduce((set, e) => {
    Object.keys((e as any).users || {}).forEach(u => set.add(u));
    return set;
  }, new Set<string>()).size;

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4 mt-4">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-amber-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-sm">
          <TrendingUp size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
            Trending Important Notes
            <span className="text-[9px] font-black text-white bg-amber-500 px-1.5 py-0.5 rounded-full uppercase">Live</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-semibold">
            Students kis topic ko sabse jyada Important mark kar rahe hain
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[10px] font-bold text-slate-600">
          <div className="text-center">
            <div className="text-amber-600 font-black text-sm">{ranked.length}</div>
            <div className="uppercase tracking-widest">Topics</div>
          </div>
          <div className="text-center">
            <div className="text-amber-600 font-black text-sm">{totalSaves.toLocaleString('en-IN')}</div>
            <div className="uppercase tracking-widest">Saves</div>
          </div>
        </div>
      </div>

      {ranked.length === 0 ? (
        <div className="text-center py-8">
          <Star size={36} className="text-amber-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">Abhi koi student ne note save nahi kiya.</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Pehla ⭐ aate hi yahan dikhega.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {ranked.map((entry, idx) => {
            const pct = topCount > 0 ? Math.max(6, Math.round((entry.count / topCount) * 100)) : 0;
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
            return (
              <div
                key={entry.hash || idx}
                className="rounded-xl p-2.5 border border-amber-100 bg-gradient-to-r from-amber-50/50 to-white hover:from-amber-50 transition-all"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-amber-200 flex items-center justify-center text-amber-700 font-black text-[11px] shrink-0">
                    {medal || `#${idx + 1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[13px] text-slate-800 leading-snug line-clamp-2">{entry.label}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-amber-700 shrink-0 flex items-center gap-1">
                        <Users size={10} />
                        {entry.count.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
