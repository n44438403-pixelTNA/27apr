import { getDatabase, ref, set, remove, runTransaction, query, orderByChild, limitToLast, onValue } from "firebase/database";

const rtdb = getDatabase();

export interface NoteStarEntry {
  hash: string;
  count: number;
  label: string;
  noteKey: string;
  lastUpdated: number;
}

const normalize = (s: string) =>
  (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

export const hashTopic = (topicText: string): string => {
  const norm = normalize(topicText).slice(0, 400);
  let h = 5381;
  for (let i = 0; i < norm.length; i++) {
    h = (h * 33) ^ norm.charCodeAt(i);
  }
  const positive = (h >>> 0).toString(36);
  const lenTag = norm.length.toString(36);
  return `t_${positive}_${lenTag}`;
};

const safeLabel = (text: string) =>
  (text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);

export const recordNoteStar = async (
  userId: string,
  noteKey: string,
  topicText: string
): Promise<void> => {
  if (!userId || !topicText) return;
  const hash = hashTopic(topicText);
  try {
    // IMPORTANT: write the full $hash node atomically via transaction FIRST.
    // RTDB rules on `note_stars/$hash` require `newData.hasChildren(['count'])`,
    // so a bare `set('users/$uid', true)` on a brand-new hash gets rejected
    // (since the merged node would only contain `users` and no `count`).
    // Doing the transaction first guarantees `count` exists alongside `users`.
    await runTransaction(ref(rtdb, `note_stars/${hash}`), (cur) => {
      if (!cur) {
        return {
          count: 1,
          label: safeLabel(topicText),
          noteKey,
          lastUpdated: Date.now(),
          users: { [userId]: true },
        };
      }
      const users = cur.users || {};
      users[userId] = true;
      cur.users = users;
      cur.count = Object.keys(users).length;
      cur.label = cur.label || safeLabel(topicText);
      cur.noteKey = cur.noteKey || noteKey;
      cur.lastUpdated = Date.now();
      return cur;
    });
    // Best-effort confirm — no-op if transaction already wrote it.
    await set(ref(rtdb, `note_stars/${hash}/users/${userId}`), true);
  } catch (e) {
    console.warn('recordNoteStar failed', e);
  }
};

export const recordNoteUnstar = async (
  userId: string,
  topicText: string
): Promise<void> => {
  if (!userId || !topicText) return;
  const hash = hashTopic(topicText);
  try {
    await remove(ref(rtdb, `note_stars/${hash}/users/${userId}`));
    await runTransaction(ref(rtdb, `note_stars/${hash}`), (cur) => {
      if (!cur) return cur;
      const users = cur.users || {};
      delete users[userId];
      cur.users = users;
      cur.count = Object.keys(users).length;
      cur.lastUpdated = Date.now();
      if (cur.count <= 0) return null;
      return cur;
    });
  } catch (e) {
    console.warn('recordNoteUnstar failed', e);
  }
};

/**
 * Subscribe to the most-saved notes globally. Callback fires with a map of
 * topic-hash -> entry (count, label, noteKey). Limited to top N for
 * performance. Use this map to display social-proof badges and to render the
 * "Most Saved" community leaderboard.
 */
export const subscribeToTopNoteStars = (
  topN: number,
  callback: (entries: Record<string, NoteStarEntry>) => void
): (() => void) => {
  try {
    const q = query(ref(rtdb, 'note_stars'), orderByChild('count'), limitToLast(topN));
    const unsub = onValue(q, (snap) => {
      const out: Record<string, NoteStarEntry> = {};
      snap.forEach((child) => {
        const v = child.val() || {};
        const c = typeof v.count === 'number' ? v.count : (v.users ? Object.keys(v.users).length : 0);
        if (c > 0) {
          out[child.key as string] = {
            hash: child.key as string,
            count: c,
            label: v.label || '',
            noteKey: v.noteKey || '',
            lastUpdated: v.lastUpdated || 0,
          };
        }
        return undefined;
      });
      callback(out);
    });
    return () => unsub();
  } catch (e) {
    console.warn('subscribeToTopNoteStars failed', e);
    return () => {};
  }
};
