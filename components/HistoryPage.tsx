import React, { useState, useEffect, useMemo } from 'react';
import { LessonContent, User, SystemSettings, UsageHistoryEntry } from '../types';
import { BookOpen, Calendar, ChevronDown, ChevronUp, Trash2, Search, FileText, CheckCircle2, Lock, AlertCircle, Folder, Download } from 'lucide-react';
import { LessonView } from './LessonView';
import { saveUserToLive, getChapterData } from '../firebase';
import { storage } from '../utils/storage';
import { CustomAlert, CustomConfirm } from './CustomDialogs';
import { OfflineDownloads } from './OfflineDownloads';
import { saveOfflineItem } from '../utils/offlineStorage';
import { SubscriptionHistory } from './SubscriptionHistory';

interface Props {
    user: User;
    onUpdateUser: (u: User) => void;
    settings?: SystemSettings;
    initialTab?: 'ACTIVITY' | 'SAVED' | 'OFFLINE' | 'SUB_HISTORY';
}

export const HistoryPage: React.FC<Props> = ({ user, onUpdateUser, settings, initialTab }) => {
  const [activeTab, setActiveTab] = useState<'ACTIVITY' | 'SAVED' | 'OFFLINE' | 'SUB_HISTORY'>(initialTab || 'SAVED');
  
  // SAVED NOTES STATE
  const [history, setHistory] = useState<LessonContent[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<LessonContent | null>(null);

  // USAGE HISTORY STATE (ACTIVITY LOG)
  const [usageLog, setUsageLog] = useState<UsageHistoryEntry[]>([]);

  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, message: string}>({isOpen: false, message: ''});
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({
      isOpen: false, 
      message: '', 
      onConfirm: () => {}
  });

  useEffect(() => {

    // Helper: strip out any MCQ-type entries from a saved-notes list
    const stripMcq = (list: any[]) => list.filter((item: any) => {
        const t = (item?.type || '').toString();
        return !t.includes('MCQ');
    });

    const loadHistory = async () => {
        // Load Saved Notes
        const parsed = await storage.getItem<any[]>('nst_user_history');
        if (parsed) {
            try {
                const userHistory = parsed.filter((item: any) => !item.userId || item.userId === user.id);
                const cleaned = stripMcq(userHistory);
                // Persist cleaned list back if we removed anything
                if (cleaned.length !== userHistory.length) {
                    const all = parsed.filter((item: any) => !((item?.type || '').toString().includes('MCQ')));
                    await storage.setItem('nst_user_history', all);
                    try { localStorage.setItem('nst_user_history', JSON.stringify(all)); } catch {}
                }
                setHistory(cleaned.reverse()); // Newest first
            } catch (e) { console.error("History parse error", e); }
        }
    };
    loadHistory();

    // Load Saved Notes (legacy localStorage fallback)
    const stored = localStorage.getItem('nst_user_history');
    if (stored) {
        try {
            const list = JSON.parse(stored);
            const cleaned = stripMcq(list);
            if (cleaned.length !== list.length) {
                try { localStorage.setItem('nst_user_history', JSON.stringify(cleaned)); } catch {}
            }
            setHistory(cleaned.reverse()); // Newest first
        } catch (e) { console.error("History parse error", e); }
    }


    // Load Activity Log from User Object (filter out MCQ entries) and purge from user
    if (user.usageHistory) {
        const cleanedUsage = user.usageHistory.filter(e => (e?.type || '') !== 'MCQ');
        setUsageLog([...cleanedUsage].sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
        }));

        // Persist cleanup so old MCQ entries vanish from user object too
        if (cleanedUsage.length !== user.usageHistory.length || (user as any).mcqHistory?.length) {
            const updatedUser: any = { ...user, usageHistory: cleanedUsage, mcqHistory: [] };
            try { onUpdateUser(updatedUser); } catch {}
            try { saveUserToLive(updatedUser); } catch {}
            try { localStorage.setItem('nst_current_user', JSON.stringify(updatedUser)); } catch {}
        }
    }
  }, [user.usageHistory, user.id]);

  const checkAvailability = (log: any) => {
    // If it's a direct URL log (like from content generation), it's always available
    if (log.videoUrl || log.pdfUrl || log.content) return true;

    if (!settings?.subjects) return true;
    const subjectData = settings.subjects.find(s => s.name === log.subject);
    if (!subjectData) return false;

    const chapters = subjectData.chapters || [];
    const chapter = chapters.find(c => c.title === log.itemTitle || c.id === log.itemId);
    if (!chapter) return false;

    if (log.type === 'VIDEO') return !!chapter.videoPlaylist;
    if (log.type === 'PDF') return !!chapter.pdfLink;
    return true;
  };

  const recordUsage = (type: 'VIDEO' | 'PDF' | 'MCQ' | 'AUDIO', item: any) => {
    const entry: any = {
        id: `usage-${Date.now()}`,
        type,
        itemId: item.id,
        itemTitle: item.title,
        subject: item.subjectName || 'General',
        durationSeconds: 0,
        timestamp: new Date().toISOString()
    };
    const updatedHistory = [entry, ...(user.usageHistory || [])];
    const updatedUser: User = { ...user, usageHistory: updatedHistory } as User;
    onUpdateUser(updatedUser);
    saveUserToLive(updatedUser);
  };

  const handleSaveOfflineLog = async (log: any, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
          if (log.type === 'PDF' || log.type === 'NOTES') {
              // Attempt to fetch full notes from DB
              const chapterData = await getChapterData('nst_chapter_content', log.itemId);
              if (chapterData && chapterData.notesHtml) {
                  await saveOfflineItem({
                      id: `note_${log.itemId}_${Date.now()}`,
                      type: 'NOTE',
                      title: log.itemTitle || 'Saved Note',
                      subtitle: log.subject || 'Notes',
                      data: { html: chapterData.notesHtml }
                  });
                  window.alert("Note Saved Offline!");
              } else if (log.content) {
                  // Direct content log
                  await saveOfflineItem({
                      id: `note_${log.itemId}_${Date.now()}`,
                      type: 'NOTE',
                      title: log.itemTitle || 'Saved Note',
                      subtitle: log.subject || 'Notes',
                      data: { html: log.content }
                  });
                  window.alert("Note Saved Offline!");
              } else {
                  window.alert("Full note content not found. Open the note first to sync it.");
              }
          }
      } catch (err) {
          console.error("Offline Save Error:", err);
          window.alert("Error saving offline.");
      }
  };

  const executeOpenItem = (item: LessonContent, cost: number) => {
      if (cost > 0) {
          const updatedUser: any = { ...user, credits: user.credits - cost };
          onUpdateUser(updatedUser);
          localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
          saveUserToLive(updatedUser);
      }

      setSelectedLesson(item);
  };

  const handleOpenItem = (item: LessonContent) => {
      // 0. Enforce Type Restrictions: only allow notes/PDF/video (MCQ removed)
      const allowedTypes = ['NOTES_SIMPLE', 'NOTES_PREMIUM', 'PDF_VIEWER', 'VIDEO_LECTURE', 'PDF', 'VIDEO'];
      const itemType = item.type || '';
      if (!allowedTypes.includes(itemType) && !itemType.includes('NOTES')) {
          return; // Disable click for others (including MCQ)
      }

      // 1. Check Cost
      // If it's a VIDEO or PDF coming from History, it should follow pricing too
      let cost = 0;
      if (itemType === 'VIDEO_LECTURE') {
          cost = settings?.videoHistoryCost ?? 2; // Default to 2 if not set
      } else if (itemType === 'NOTES_SIMPLE' || itemType === 'NOTES_PREMIUM') {
          cost = settings?.pdfHistoryCost ?? 1; // Default to 1 if not set
      }
      
      if (cost > 0) {
          // 2. Check Exemption (Admin or Premium)
          const isExempt = user.role === 'ADMIN' || 
                          (user.isPremium && user.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date());
          
          if (!isExempt) {
              if (user.credits < cost) {
                  setAlertConfig({isOpen: true, message: `Insufficient Credits! Viewing ${item.title} costs ${cost} coins.`});
                  return;
              }

              setConfirmConfig({
                  isOpen: true,
                  message: `Re-opening ${item.title} will cost ${cost} Credits. Proceed?`,
                  onConfirm: () => executeOpenItem(item, cost)
              });
              return;
          }
      }

      executeOpenItem(item, 0);
  };

  const filteredHistory = history.filter(h =>
    !((h.type || '').includes('MCQ')) &&
    ((h.title || '').toLowerCase().includes((search || '').toLowerCase()) ||
     (h.subjectName || '').toLowerCase().includes((search || '').toLowerCase()))
  );

  const formatDuration = (seconds: number) => {
      if (seconds < 60) return `${seconds}s`;
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}m ${s}s`;
  };

  if (selectedLesson) {
      return (
          <div className="animate-in slide-in-from-right duration-300">
              <button
                onClick={() => setSelectedLesson(null)}
                className="mb-4 text-blue-600 font-bold hover:underline flex items-center gap-1"
              >
                  &larr; Back to History
              </button>
              {/* Reuse LessonView but mock props usually passed from API */}
              <LessonView 
                 content={selectedLesson}
                 subject={{id: 'hist', name: selectedLesson.subjectName, icon: 'book', color: 'bg-slate-100'} as any} 
                 classLevel={'10' as any} // Display only
                 chapter={{id: 'hist', title: selectedLesson.title} as any}
                 loading={false}
                 onBack={() => setSelectedLesson(null)}
                 user={user}
                 settings={settings}
              />
          </div>
      )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <CustomAlert
            isOpen={alertConfig.isOpen}
            message={alertConfig.message}
            onClose={() => setAlertConfig({...alertConfig, isOpen: false})}
        />
        <CustomConfirm
            isOpen={confirmConfig.isOpen}
            title="Confirm Action"
            message={confirmConfig.message}
            onConfirm={() => {
                confirmConfig.onConfirm();
                setConfirmConfig({...confirmConfig, isOpen: false});
            }}
            onCancel={() => setConfirmConfig({...confirmConfig, isOpen: false})}
        />
        
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                 <FileText className="text-blue-600" /> Downloads & History
            </h3>
        </div>

        {/* TABS */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-6 overflow-x-auto no-scrollbar gap-1">
            <button
                onClick={() => setActiveTab('SAVED')}
                className={`flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'SAVED' ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:text-slate-700'}`}
            >
                Saved Notes
            </button>
            <button
                onClick={() => setActiveTab('ACTIVITY')}
                className={`flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'ACTIVITY' ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:text-slate-700'}`}
            >
                Activity Log
            </button>
            <button
                onClick={() => setActiveTab('OFFLINE')}
                className={`flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'OFFLINE' ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:text-slate-700'}`}
            >
                Offline Saved
            </button>
            <button
                onClick={() => setActiveTab('SUB_HISTORY')}
                className={`flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'SUB_HISTORY' ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:text-slate-700'}`}
            >
                Sub History
            </button>
        </div>

        {activeTab === 'SUB_HISTORY' && (
            <div className="animate-in fade-in duration-300">
                <SubscriptionHistory user={user} onBack={() => setActiveTab('SAVED')} hideHeader={true} />
            </div>
        )}

        {activeTab === 'OFFLINE' && (
            <div className="animate-in fade-in duration-300">
                <OfflineDownloads onBack={() => setActiveTab('SAVED')} hideHeader={true} user={user} settings={settings} />
            </div>
        )}

        {activeTab === 'ACTIVITY' && (
            <div className="space-y-4">
                {usageLog.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                        <p>No study activity recorded yet.</p>
                    </div>
                ) : (
                    // GROUPED VIEW
                    Object.entries(usageLog.reduce((acc: any, log) => {
                        const d = new Date(log.timestamp);
                        const isValid = !isNaN(d.getTime());
                        const year = isValid ? d.getFullYear() : 'Unknown Year';
                        const month = isValid ? d.toLocaleString('default', { month: 'long' }) : 'Unknown Month';
                        if (!acc[year]) acc[year] = {};
                        if (!acc[year][month]) acc[year][month] = [];
                        acc[year][month].push(log);
                        return acc;
                    }, {})).sort((a,b) => Number(b[0]) - Number(a[0])).map(([year, months]: any) => (
                        <div key={year} className="mb-4">
                            <h4 className="text-sm font-black text-slate-500 uppercase mb-2 ml-1">{year} Files</h4>
                            {Object.entries(months).map(([month, logs]: any) => (
                                <div key={month} className="mb-3">
                                    <details open className="group">
                                        <summary className="flex items-center gap-2 cursor-pointer bg-slate-200 p-3 rounded-xl mb-2 list-none hover:bg-slate-300 transition-colors">
                                            <Folder className="text-slate-600" size={18} />
                                            <span className="font-bold text-slate-700 text-sm">{month}</span>
                                            <span className="text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full ml-auto">{logs.length}</span>
                                            <ChevronDown size={16} className="text-slate-600 group-open:rotate-180 transition-transform" />
                                        </summary>
                                        <div className="pl-2 space-y-2">
                                            {logs.map((log: any, i: number) => (
                                                <div
                                                    key={i}
                                                    // onClick removed to disable interaction
                                                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between opacity-90 transition-all group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${
                                                            log.type === 'VIDEO' ? 'bg-red-500' :
                                                            log.type === 'PDF' ? 'bg-blue-500' :
                                                            log.type === 'AUDIO' ? 'bg-green-500' :
                                                            log.type === 'GAME' ? 'bg-orange-500' :
                                                            log.type === 'PURCHASE' ? 'bg-emerald-500' :
                                                            log.type === 'MCQ' ? 'bg-purple-500' : 'bg-slate-500'
                                                        }`}>
                                                            {log.type === 'VIDEO' ? '▶' : log.type === 'PDF' ? '📄' : log.type === 'AUDIO' ? '🎵' : log.type === 'GAME' ? '🎰' : log.type === 'PURCHASE' ? '💰' : '👁️'}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-blue-700">{log.itemTitle}</p>
                                                                {log.type === 'MCQ' && log.score !== undefined && (
                                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                                                        (log.score / (log.totalQuestions || 1) * 100) >= 90 ? 'bg-green-100 text-green-700' :
                                                                        (log.score / (log.totalQuestions || 1) * 100) >= 75 ? 'bg-blue-100 text-blue-700' :
                                                                        (log.score / (log.totalQuestions || 1) * 100) >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                                                        'bg-red-100 text-red-700'
                                                                    }`}>
                                                                        {(log.score / (log.totalQuestions || 1) * 100) >= 90 ? 'Excellent' :
                                                                        (log.score / (log.totalQuestions || 1) * 100) >= 75 ? 'Good' :
                                                                        (log.score / (log.totalQuestions || 1) * 100) >= 50 ? 'Average' : 'Bad'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-600">
                                                                {log.type === 'PURCHASE' ? 'Transaction' : log.type === 'GAME' ? 'Play Zone' : log.subject} • {(!isNaN(new Date(log.timestamp).getTime()) ? new Date(log.timestamp).toLocaleDateString() : 'Unknown Date')}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {log.type !== 'PURCHASE' && log.type !== 'GAME' && (
                                                                    <>
                                                                        {checkAvailability(log) ? (
                                                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-emerald-100">
                                                                                <CheckCircle2 size={10} /> Available
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-rose-100">
                                                                                <AlertCircle size={10} /> Not Available
                                                                            </span>
                                                                        ) || null}
                                                                    </>
                                                                )}
                                                                {log.type === 'MCQ' && log.score !== undefined && (
                                                                    <p className="text-[10px] font-black text-indigo-600">Score: {Math.round((log.score / (log.totalQuestions || 1)) * 100)}% ({log.score}/{log.totalQuestions})</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        {log.type === 'MCQ' ? (
                                                            <div className="flex flex-col items-end gap-1">
                                                                {!user.isPremium && user.role !== 'ADMIN' && (
                                                                    <span className="text-[9px] font-black text-slate-500 italic">Cost: {settings?.mcqHistoryCost ?? 1} CR</span>
                                                                )}
                                                                <button onClick={(e) => handleSaveOfflineLog(log, e)} className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md hover:bg-slate-200 transition-colors">
                                                                    <Download size={10} /> Save
                                                                </button>
                                                            </div>
                                                        ) : log.type === 'GAME' ? (
                                                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-100">Played</span>
                                                        ) : log.type === 'PURCHASE' ? (
                                                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">Success</span>
                                                        ) : (
                                                            <div className="flex flex-col items-end">
                                                                <p className="font-black text-slate-700 text-sm">{formatDuration(log.durationSeconds || 0)}</p>
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Time Spent</p>
                                                                {!user.isPremium && user.role !== 'ADMIN' && (
                                                                    <span className="text-[9px] font-black text-slate-500 italic">
                                                                        Re-open: {log.type === 'VIDEO' ? (settings?.videoHistoryCost ?? 2) : (settings?.pdfHistoryCost ?? 1)} CR
                                                                    </span>
                                                                )}
                                                                {(log.type === 'PDF' || log.type === 'NOTES') && (
                                                                    <button onClick={(e) => handleSaveOfflineLog(log, e)} className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md hover:bg-slate-200 transition-colors">
                                                                        <Download size={10} /> Save
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>
        )}

        {activeTab === 'SAVED' && (
            <>
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-3 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search your notes..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>

                {filteredHistory.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                        <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
                        <p>No saved notes yet. Start learning to build your library!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredHistory.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => handleOpenItem(item)}
                                className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer group relative"
                            >
                                {/* COST BADGE */}
                                {!user.isPremium && (item.type || '').includes('MCQ') && (settings?.mcqHistoryCost ?? 1) > 0 && (
                                    <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1 z-10 border border-yellow-200">
                                        <Lock size={8} /> Pay {settings?.mcqHistoryCost ?? 1} CR
                                    </div>
                                )}

                                <div className="p-4 flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                item.score >= 90 ? 'bg-green-100 text-green-700' :
                                                item.score >= 75 ? 'bg-blue-100 text-blue-700' :
                                                item.score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {item.score >= 90 ? 'Excellent' :
                                                 item.score >= 75 ? 'Good' :
                                                 item.score >= 50 ? 'Average' : 'Bad'}
                                            </span>
                                            <h4 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">
                                                {item.title}
                                            </h4>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                                            <div className="flex items-center gap-1"><Calendar size={12} /> {!isNaN(new Date(item.dateCreated).getTime()) ? new Date(item.dateCreated).toLocaleDateString() : 'Unknown Date'}</div>
                                            <div className="font-bold text-blue-600">{item.score}% Score</div>
                                            <div className={`font-bold ${item.score >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                                                {item.score >= 60 ? 'Passed' : 'Needs Review'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Preview Footer */}
                                <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex justify-between items-center">
                                     <span className="text-xs text-slate-600 font-medium">Click to read full note</span>
                                     <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <ChevronDown size={16} className="-rotate-90" />
                                     </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </>
        )}
    </div>
  );
};