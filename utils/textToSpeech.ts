
export const getAvailableVoices = (): Promise<SpeechSynthesisVoice[]> => {
    if (!('speechSynthesis' in window)) {
        return Promise.resolve([]);
    }
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        return Promise.resolve(voices);
    }

    return new Promise((resolve) => {
        const handler = () => {
            const v = window.speechSynthesis.getVoices();
            if (v.length > 0) {
                window.speechSynthesis.removeEventListener('voiceschanged', handler);
                resolve(v);
            }
        };
        
        window.speechSynthesis.addEventListener('voiceschanged', handler);

        setTimeout(() => {
             window.speechSynthesis.removeEventListener('voiceschanged', handler);
             resolve(window.speechSynthesis.getVoices());
        }, 1000);
    });
};

export const getCategorizedVoices = async () => {
    const voices = await getAvailableVoices();
    return {
        hindi: voices.filter(v => v.lang.includes('hi') || v.name.toLowerCase().includes('hindi')),
        indianEnglish: voices.filter(v => v.lang === 'en-IN' || (v.lang.includes('en') && v.name.toLowerCase().includes('india'))),
        others: voices.filter(v => !v.lang.includes('hi') && !v.name.toLowerCase().includes('hindi') && v.lang !== 'en-IN' && !v.name.toLowerCase().includes('india'))
    };
};

export const setPreferredVoice = (voiceURI: string) => {
    localStorage.setItem('nst_preferred_voice_uri', voiceURI);
};

export const getPreferredVoice = async (): Promise<SpeechSynthesisVoice | undefined> => {
    const uri = localStorage.getItem('nst_preferred_voice_uri');
    const voices = await getAvailableVoices();
    if (!uri) return undefined;
    return voices.find(v => v.voiceURI === uri);
};

export const stripHtml = (html: string): string => {
    if (!html) return "";

    let clean = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
    clean = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
    clean = clean.replace(/<[^>]*>?/gm, ' ');

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = clean;
    clean = tempDiv.textContent || tempDiv.innerText || "";

    clean = clean.replace(/\$\$/g, ' ');
    clean = clean.replace(/\$/g, ' ');

    clean = clean.replace(/^\s{0,3}#{1,6}\s+/gm, ' ');
    clean = clean.replace(/#+/g, ' ');
    clean = clean.replace(/\*+/g, ' ');
    clean = clean.replace(/(^|\s)_+(\S)/g, '$1$2');
    clean = clean.replace(/(\S)_+(\s|$)/g, '$1$2');
    clean = clean.replace(/~{2,}/g, ' ');
    clean = clean.replace(/`+/g, ' ');
    clean = clean.replace(/^\s*>+\s?/gm, ' ');
    clean = clean.replace(/^\s*[-+]\s+/gm, ' ');
    clean = clean.replace(/^\s*\d+\.\s+/gm, ' ');
    clean = clean.replace(/\|/g, ' ');
    clean = clean.replace(/\\([*_#`~])/g, '$1');

    clean = clean.replace(/\s+/g, ' ').trim();

    return clean;
};

// ---------------------------------------------------------------------------
// HINDI NUMBER → WORDS
// Reads digits the way a human Hindi speaker would: 2019 → "do hazaar unnees".
// Used as a TTS preprocessor when lang starts with "hi".
// ---------------------------------------------------------------------------
const HINDI_ONES_TEENS_TO_99 = [
    'shunya', 'ek', 'do', 'teen', 'chaar', 'paanch', 'chhah', 'saat', 'aath', 'nau',
    'das', 'gyaarah', 'baarah', 'terah', 'chaudah', 'pandrah', 'solah', 'satrah', 'athaarah', 'unnees',
    'bees', 'ikkees', 'baees', 'teiees', 'chaubees', 'pachchees', 'chhabbees', 'sattaees', 'atthaees', 'unatees',
    'tees', 'ikatees', 'battees', 'taintees', 'chautees', 'paintees', 'chhattees', 'sentees', 'adhtees', 'untaalees',
    'chaalees', 'iktaalees', 'bayaalees', 'taintaalees', 'chavaalees', 'paintaalees', 'chhiyaalees', 'saintaalees', 'adhtaalees', 'unchaas',
    'pachaas', 'ikyaavan', 'baavan', 'tirepan', 'chauvan', 'pachpan', 'chhappan', 'sattaavan', 'atthaavan', 'unsath',
    'saath', 'iksath', 'baasath', 'tirsath', 'chausath', 'paisath', 'chhiyaasath', 'sadsath', 'adhsath', 'unhattar',
    'sattar', 'ikahattar', 'bahattar', 'tihattar', 'chauhattar', 'pachhattar', 'chhihattar', 'satahattar', 'athahattar', 'unaasee',
    'assee', 'ikyaasee', 'bayaasee', 'tirasee', 'chauraasee', 'pachaasee', 'chhiyaasee', 'sataasee', 'athaasee', 'navaasee',
    'nabbe', 'ikyaanave', 'banaave', 'tiraanave', 'chauraanave', 'pachaanave', 'chhiyaanave', 'sataanave', 'athaanave', 'ninyaanave'
];

const numBelow1000ToHindi = (n: number): string => {
    if (n < 0) return '';
    if (n < 100) return HINDI_ONES_TEENS_TO_99[n];
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    const head = `${HINDI_ONES_TEENS_TO_99[hundreds]} sau`;
    return rest === 0 ? head : `${head} ${HINDI_ONES_TEENS_TO_99[rest]}`;
};

export const numberToHindiWords = (input: number | string): string => {
    let s = String(input).trim();
    if (!s) return '';
    const negative = s.startsWith('-');
    if (negative) s = s.slice(1);

    // Decimal handling: read digits after the point one-by-one ("point ek do teen")
    let decimalPart = '';
    if (s.includes('.')) {
        const [intPartRaw, decRaw] = s.split('.');
        s = intPartRaw || '0';
        if (decRaw) {
            decimalPart = ' point ' + decRaw.split('').map(d => HINDI_ONES_TEENS_TO_99[parseInt(d, 10)] || d).join(' ');
        }
    }

    // Strip non-digits (commas, spaces) before parsing
    s = s.replace(/[^0-9]/g, '');
    if (!s) return '';

    let n = parseInt(s, 10);
    if (!Number.isFinite(n)) return s;

    // Cap at crore-level. Anything beyond ~99,99,99,999 falls back to digit-by-digit.
    if (n > 9999999999) {
        const digitWise = s.split('').map(d => HINDI_ONES_TEENS_TO_99[parseInt(d, 10)] || d).join(' ');
        return (negative ? 'rina ' : '') + digitWise + decimalPart;
    }

    if (n === 0) return (negative ? 'rina ' : '') + 'shunya' + decimalPart;

    const parts: string[] = [];
    const crore = Math.floor(n / 10000000); n %= 10000000;
    const lakh  = Math.floor(n / 100000);   n %= 100000;
    const hazaar = Math.floor(n / 1000);    n %= 1000;
    const remainder = n;

    if (crore > 0) parts.push(`${numBelow1000ToHindi(crore)} crore`);
    if (lakh > 0)  parts.push(`${numBelow1000ToHindi(lakh)} laakh`);
    if (hazaar > 0) parts.push(`${numBelow1000ToHindi(hazaar)} hazaar`);
    if (remainder > 0) parts.push(numBelow1000ToHindi(remainder));

    return (negative ? 'rina ' : '') + parts.join(' ') + decimalPart;
};

/**
 * Replace every numeric token (e.g. "2019", "1,250", "7.5") in the input with its
 * spoken Hindi-words equivalent. Leaves non-numeric text untouched.
 */
/**
 * Read 4-digit year-like numbers in the natural Indian style:
 *   1901 → "unnees sau ek", 1947 → "unnees sau saintaalees",
 *   1501 → "pandrah sau ek", 2019 → "bees sau unnees".
 * Returns null if the value is not a clean 4-digit token in [1100, 9999].
 */
const yearStyleHindi = (cleaned: string): string | null => {
    if (!/^\d{4}$/.test(cleaned)) return null;
    const num = parseInt(cleaned, 10);
    if (num < 1100 || num > 9999) return null;
    const head = parseInt(cleaned.slice(0, 2), 10);
    const tail = parseInt(cleaned.slice(2, 4), 10);
    const headStr = HINDI_ONES_TEENS_TO_99[head];
    if (!headStr) return null;
    if (tail === 0) return `${headStr} sau`;
    const tailStr = HINDI_ONES_TEENS_TO_99[tail];
    return `${headStr} sau ${tailStr}`;
};

export const replaceNumbersWithHindiWords = (text: string): string => {
    if (!text) return text;
    // Match optional minus, digits with optional commas, optional .decimals
    return text.replace(/-?\d+(?:,\d+)*(?:\.\d+)?/g, (match) => {
        const cleaned = match.replace(/,/g, '');
        // Use year-style "X sau Y" for plain 4-digit numbers (1100–9999)
        // so years like 1947, 1857, 2019 read naturally instead of as
        // "ek hazaar nau sau saintaalees".
        const yearForm = yearStyleHindi(cleaned);
        if (yearForm) return yearForm;
        const words = numberToHindiWords(cleaned);
        return words || match;
    });
};

// Track the active TTS session so chunked playback can be cancelled cleanly.
let activeTtsSessionId = 0;

// Watchdog timer: if an utterance hasn't ended in 20 seconds, force-advance.
// This replaces the old pause()/resume() keepAlive which was causing premature onend fires.
let watchdogTimer: any = null;

const clearWatchdog = () => {
    if (watchdogTimer) { clearTimeout(watchdogTimer); watchdogTimer = null; }
};

// Each chunk may take up to MAX_CHUNK_SECS seconds to speak before we force-advance.
const MAX_CHUNK_SECS = 60;

// 40000 chars per chunk — effectively "read entire notes as one utterance".
// Topics from notesSplitter are typically 100–400 chars, well within browser limits.
// For very long blocks, the watchdog (60s) will force-advance if the engine stalls.
const MAX_CHUNK_LENGTH = 40000;

/**
 * Split a long string into TTS-friendly chunks at natural boundaries.
 * Priority: Hindi full stop (।), sentence-end (.!?), mid-sentence (,;:/newline), word boundary, hard cut.
 */
export const chunkTextForTts = (raw: string, maxLen: number = MAX_CHUNK_LENGTH): string[] => {
    const text = (raw || '').trim();
    if (!text) return [];
    if (text.length <= maxLen) return [text];

    const chunks: string[] = [];
    let remaining = text;

    const findSplitIndex = (s: string): number => {
        const win = s.slice(0, maxLen);
        // 1. Sentence-ending punctuation (highest priority)
        const sentenceMatch = win.match(/[।.!?][^।.!?]*$/);
        if (sentenceMatch && sentenceMatch.index !== undefined) {
            const idx = sentenceMatch.index + 1;
            if (idx >= 40) return idx;
        }
        // 2. Mid-sentence punctuation / newlines
        const midPunct = Math.max(
            win.lastIndexOf('\n'),
            win.lastIndexOf(';'),
            win.lastIndexOf(','),
            win.lastIndexOf(':'),
        );
        if (midPunct >= 40) return midPunct + 1;
        // 3. Word boundary
        const space = win.lastIndexOf(' ');
        if (space >= 40) return space + 1;
        // 4. Hard cut
        return maxLen;
    };

    while (remaining.length > maxLen) {
        const idx = findSplitIndex(remaining);
        const piece = remaining.slice(0, idx).trim();
        if (piece) chunks.push(piece);
        remaining = remaining.slice(idx).trim();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
};

export const speakText = async (
    text: string,
    voice?: SpeechSynthesisVoice | null,
    rate: number = 1.0,
    lang: string = 'en-US',
    onStart?: () => void,
    onEnd?: () => void
): Promise<SpeechSynthesisUtterance | null> => {
    if (!('speechSynthesis' in window)) {
        console.warn('Text-to-speech not supported.');
        if (onEnd) onEnd();
        return null;
    }

    // Cancel any existing speech and clear watchdog
    clearWatchdog();
    try {
        window.speechSynthesis.cancel();
    } catch (e) {
        console.error("Error canceling speech:", e);
    }

    let cleanText = stripHtml(text);
    if (!cleanText.trim()) {
        if (onEnd) onEnd();
        return null;
    }

    // For Hindi reading, convert digit sequences to Hindi words so the engine
    // pronounces "2019" as "do hazaar unnees" instead of spelling it out
    // ("two zero one nine") which sounds robotic. Applied before chunking so
    // expanded text still respects the chunk boundaries.
    if ((lang || '').toLowerCase().startsWith('hi')) {
        try {
            cleanText = replaceNumbersWithHindiWords(cleanText);
        } catch (e) {
            console.warn('Hindi number normalization failed:', e);
        }
    }

    // Resolve preferred voice
    let selectedVoice = voice || null;
    if (!selectedVoice) {
        try {
             const voices = window.speechSynthesis.getVoices();
             if (voices.length > 0) {
                 const uri = localStorage.getItem('nst_preferred_voice_uri');
                 if (uri) selectedVoice = voices.find(v => v.voiceURI === uri) || null;
             }
        } catch (e) {
            console.warn("Failed to retrieve voices synchronously:", e);
        }
    }

    // Bump session id — old chunk callbacks become no-ops
    activeTtsSessionId += 1;
    const mySessionId = activeTtsSessionId;

    const chunks = chunkTextForTts(cleanText);
    if (chunks.length === 0) {
        if (onEnd) onEnd();
        return null;
    }

    let firstStartFired = false;
    let lastUtterance: SpeechSynthesisUtterance | null = null;

    const speakChunk = (idx: number) => {
        if (mySessionId !== activeTtsSessionId) { clearWatchdog(); return; }
        if (idx >= chunks.length) {
            clearWatchdog();
            if (onEnd) onEnd();
            return;
        }

        const u = new SpeechSynthesisUtterance(chunks[idx]);
        if (selectedVoice) {
            u.voice = selectedVoice;
            u.lang = selectedVoice.lang;
        } else {
            u.lang = lang;
        }
        u.rate = rate;
        u.pitch = 1.0;

        // Set a watchdog: if onend/onerror don't fire within MAX_CHUNK_SECS, force-advance.
        const armWatchdog = () => {
            clearWatchdog();
            watchdogTimer = setTimeout(() => {
                if (mySessionId !== activeTtsSessionId) return;
                console.warn(`TTS watchdog fired for chunk ${idx} — forcing advance`);
                try { window.speechSynthesis.cancel(); } catch (_) {}
                // Small delay to let cancel flush, then go to next chunk
                setTimeout(() => speakChunk(idx + 1), 200);
            }, MAX_CHUNK_SECS * 1000);
        };

        u.onstart = () => {
            if (mySessionId !== activeTtsSessionId) return;
            armWatchdog(); // reset watchdog on each chunk start
            if (!firstStartFired) {
                firstStartFired = true;
                if (onStart) onStart();
            }
        };

        u.onend = () => {
            if (mySessionId !== activeTtsSessionId) { clearWatchdog(); return; }
            clearWatchdog();
            // Small gap (50ms) between chunks — enough for the engine to reset without losing state
            setTimeout(() => speakChunk(idx + 1), 50);
        };

        u.onerror = (e: any) => {
            const err = (e?.error || '') as string;
            // Always clear watchdog on any error event
            clearWatchdog();

            if (mySessionId !== activeTtsSessionId) return;

            if (err === 'interrupted' || err === 'canceled') {
                // This chunk was cancelled by our own stopSpeech — just stop cleanly.
                // Do NOT advance to next chunk; new session will handle it.
                return;
            }

            if (err === 'network') {
                // Temporary network issue — retry same chunk once after a short delay
                console.warn(`TTS network error on chunk ${idx}, retrying...`);
                setTimeout(() => speakChunk(idx), 300);
                return;
            }

            // Any other real error: skip to next chunk so one bad segment doesn't kill the whole read
            console.error('Speech Error (TTS):', err || e);
            setTimeout(() => speakChunk(idx + 1), 100);
        };

        lastUtterance = u;
        try {
            window.speechSynthesis.speak(u);
            // On some Android WebViews the utterance can silently queue but not start.
            // If onstart hasn't fired within 3s, trigger watchdog early.
            setTimeout(() => {
                if (mySessionId !== activeTtsSessionId) return;
                if (!firstStartFired) {
                    // Force resume in case synthesis is paused
                    try {
                        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
                    } catch (_) {}
                }
            }, 3000);
        } catch (e) {
            console.error('Speech Synthesis Failed:', e);
            clearWatchdog();
            if (mySessionId !== activeTtsSessionId) return;
            setTimeout(() => speakChunk(idx + 1), 100);
        }
    };

    // Longer initial delay (120ms) to ensure cancel() fully flushes before first chunk
    setTimeout(() => speakChunk(0), 120);

    return lastUtterance;
};

export const stopSpeech = () => {
    if ('speechSynthesis' in window) {
        activeTtsSessionId += 1;
        clearWatchdog();
        try { window.speechSynthesis.cancel(); } catch (e) {}
    }
};
