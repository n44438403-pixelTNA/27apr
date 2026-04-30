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
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 mt-4">
      {/* === HEADER === */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-amber-100">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md shrink-0">
          <TrendingUp size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-slate-800 text-base flex items-center gap-2 flex-wrap">
            Trending Important Notes
            <span className="text-[10px] font-black text-white bg-amber-500 px-2 py-0.5 rounded-full uppercase tracking-wider">Live</span>
          </h3>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Students kis topic ko sabse jyada Important mark kar rahe hain
          </p>
        </div>
      </div>

      {/* === TOP STATS — full width 3-column grid === */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 text-center">
          <div className="text-amber-700 font-black text-xl leading-none">{ranked.length}</div>
          <div className="text-[9px] uppercase tracking-widest text-amber-600 font-black mt-1.5">Topics</div>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-xl p-3 text-center">
          <div className="text-rose-700 font-black text-xl leading-none">{totalSaves.toLocaleString('en-IN')}</div>
          <div className="text-[9px] uppercase tracking-widest text-rose-600 font-black mt-1.5">Total Saves</div>
        </div>
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-3 text-center">
          <div className="text-violet-700 font-black text-xl leading-none">{uniqueStudents.toLocaleString('en-IN')}</div>
          <div className="text-[9px] uppercase tracking-widest text-violet-600 font-black mt-1.5">Students</div>
        </div>
      </div>

      {ranked.length === 0 ? (
        <div className="text-center py-12 bg-amber-50/50 rounded-2xl border border-dashed border-amber-200">
          <Star size={42} className="text-amber-300 mx-auto mb-2" />
          <p className="text-sm font-black text-slate-600">Abhi koi student ne note save nahi kiya</p>
          <p className="text-[11px] text-slate-400 mt-1 font-semibold">Pehla ⭐ aate hi yahan dikhega</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1 -mr-1">
          {ranked.map((entry, idx) => {
            const pct = topCount > 0 ? Math.max(8, Math.round((entry.count / topCount) * 100)) : 0;
            const isTop3 = idx < 3;
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
            return (
              <div
                key={entry.hash || idx}
                className={`rounded-2xl p-4 border-2 transition-all hover:shadow-md ${
                  isTop3
                    ? 'border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/40 to-white shadow-sm'
                    : 'border-slate-200 bg-white hover:border-amber-200'
                }`}
              >
                {/* Top row — rank + title + count */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black shrink-0 ${
                    isTop3
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white text-lg shadow-md'
                      : 'bg-slate-100 text-slate-600 text-sm border border-slate-200'
                  }`}>
                    {medal || `#${idx + 1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[14px] text-slate-800 leading-snug line-clamp-2">
                      {entry.label}
                    </p>
                  </div>
                  <div className={`shrink-0 text-right ${isTop3 ? 'text-amber-700' : 'text-slate-600'}`}>
                    <div className="font-black text-lg leading-none flex items-center gap-1 justify-end">
                      <Users size={13} />
                      {entry.count.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-wider mt-1 opacity-70">
                      Saves
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-amber-50 rounded-full overflow-hidden border border-amber-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isTop3
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                          : 'bg-gradient-to-r from-slate-300 to-slate-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-black tabular-nums shrink-0 w-10 text-right ${
                    isTop3 ? 'text-amber-700' : 'text-slate-500'
                  }`}>
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
