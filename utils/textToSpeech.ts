
export const getAvailableVoices = (): Promise<SpeechSynthesisVoice[]> => {
    if (!('speechSynthesis' in window)) {
        return Promise.resolve([]);
    }
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        return Promise.resolve(voices);
    }

    return new Promise((resolve) => {
        // Voices might load asynchronously
        const handler = () => {
            const v = window.speechSynthesis.getVoices();
            if (v.length > 0) {
                window.speechSynthesis.removeEventListener('voiceschanged', handler);
                resolve(v);
            }
        };
        
        window.speechSynthesis.addEventListener('voiceschanged', handler);

        // Fallback timeout: If no voices after 1s, return empty (don't block too long)
        // Android WebView often has issues here, so we shouldn't wait forever.
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

    // 1. Remove style and script blocks entirely (we don't want TTS reading CSS/JS)
    let clean = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
    clean = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');

    // 2. Remove all HTML tags using regex as a first pass for safety
    clean = clean.replace(/<[^>]*>?/gm, ' ');

    // 3. Decode HTML entities (e.g. &nbsp; &amp;) using the DOM
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = clean;
    clean = tempDiv.textContent || tempDiv.innerText || "";

    // 4. Strip KaTeX/Math delimiters ($ and $$) so TTS doesn't say "dollar"
    clean = clean.replace(/\$\$/g, ' ');
    clean = clean.replace(/\$/g, ' ');

    // 5. Strip Markdown formatting characters so TTS doesn't read them aloud
    //    (e.g. "asterisk asterisk", "hash", "underscore", etc.)
    //    Order matters: handle multi-char tokens first.
    clean = clean.replace(/^\s{0,3}#{1,6}\s+/gm, ' '); // ATX headings: ###, ## etc at line start
    clean = clean.replace(/#+/g, ' ');                 // any other #
    clean = clean.replace(/\*+/g, ' ');                // *, **, ***, **** (bold/italic markers)
    clean = clean.replace(/(^|\s)_+(\S)/g, '$1$2');    // leading underscores around words
    clean = clean.replace(/(\S)_+(\s|$)/g, '$1$2');    // trailing underscores around words
    clean = clean.replace(/~{2,}/g, ' ');              // ~~ strikethrough
    clean = clean.replace(/`+/g, ' ');                 // `code`
    clean = clean.replace(/^\s*>+\s?/gm, ' ');         // > blockquotes
    clean = clean.replace(/^\s*[-+]\s+/gm, ' ');       // - / + list bullets at line start
    clean = clean.replace(/^\s*\d+\.\s+/gm, ' ');      // numbered list "1. " at line start (keep number reading? remove dot/space marker only — safer to drop)
    clean = clean.replace(/\|/g, ' ');                 // markdown table pipes
    clean = clean.replace(/\\([*_#`~])/g, '$1');       // unescape escaped markdown chars

    // 6. Clean up excessive whitespace and punctuation that TTS might misinterpret
    clean = clean.replace(/\s+/g, ' ').trim();

    return clean;
};

// Chrome bug workaround: speech stops after ~15s. Use a keep-alive interval.
let keepAliveInterval: any = null;
const startKeepAlive = () => {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    keepAliveInterval = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
            return;
        }
        // Pause + resume keeps Chrome's TTS alive past ~15s
        try {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
        } catch (e) {}
    }, 10000);
};
const stopKeepAlive = () => {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }
};

// Track the active TTS session so chunked playback can be cancelled cleanly.
let activeTtsSessionId = 0;

// Maximum characters per utterance chunk. Chrome / Android WebView often cuts off
// utterances around 200–300 chars or after ~15s. Keeping each chunk small
// (~180 chars) and chaining them yields reliable playback for very long notes
// without any visible chunking to the user.
const MAX_CHUNK_LENGTH = 180;

/**
 * Split a long string into TTS-friendly chunks at natural boundaries.
 * Priority of split points (in order): Hindi full stop (।), . ! ?, ; , : / newline, then space.
 * Falls back to a hard cut if no boundary is found within MAX_CHUNK_LENGTH.
 */
export const chunkTextForTts = (raw: string, maxLen: number = MAX_CHUNK_LENGTH): string[] => {
    const text = (raw || '').trim();
    if (!text) return [];
    if (text.length <= maxLen) return [text];

    const chunks: string[] = [];
    let remaining = text;

    const findSplitIndex = (s: string): number => {
        // Search backwards from maxLen for the best break point.
        const window = s.slice(0, maxLen);
        // 1. Sentence-ending punctuation (highest priority)
        const sentenceMatch = window.match(/[।.!?][^।.!?]*$/);
        if (sentenceMatch && sentenceMatch.index !== undefined) {
            const idx = sentenceMatch.index + 1; // include the punctuation
            if (idx >= 30) return idx;
        }
        // 2. Mid-sentence punctuation / newlines
        const midPunct = Math.max(
            window.lastIndexOf('\n'),
            window.lastIndexOf(';'),
            window.lastIndexOf(','),
            window.lastIndexOf(':'),
        );
        if (midPunct >= 30) return midPunct + 1;
        // 3. Word boundary
        const space = window.lastIndexOf(' ');
        if (space >= 30) return space + 1;
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

    // ROBUSTNESS: Cancel any existing speech immediately
    try {
        stopKeepAlive();
        window.speechSynthesis.cancel();
    } catch (e) {
        console.error("Error canceling speech:", e);
    }

    // Strip HTML if present
    const cleanText = stripHtml(text);
    if (!cleanText.trim()) {
        if (onEnd) onEnd();
        return null;
    }

    // Resolve preferred voice once (so all chunks share it)
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

    // Bump session id; any in-flight chunk callbacks from older sessions become no-ops.
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
        if (mySessionId !== activeTtsSessionId) return; // cancelled
        if (idx >= chunks.length) {
            stopKeepAlive();
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

        u.onstart = () => {
            if (mySessionId !== activeTtsSessionId) return;
            startKeepAlive();
            if (!firstStartFired) {
                firstStartFired = true;
                if (onStart) onStart();
            }
        };
        u.onend = () => {
            if (mySessionId !== activeTtsSessionId) return;
            // Move to the next chunk after a tiny gap so engines (esp. Android WebView)
            // don't drop it. We don't fire the user's onEnd until everything is done.
            setTimeout(() => speakChunk(idx + 1), 30);
        };
        u.onerror = (e: any) => {
            const err = e?.error || '';
            if (err !== 'interrupted' && err !== 'canceled') {
                console.error('Speech Error (TTS):', err || e);
            }
            // If cancelled or interrupted, the new session will handle onEnd.
            if (mySessionId !== activeTtsSessionId) return;
            // For real errors mid-stream, try to continue with the next chunk so
            // a single failed segment doesn't stop the whole reading.
            if (err && err !== 'interrupted' && err !== 'canceled') {
                setTimeout(() => speakChunk(idx + 1), 30);
            } else {
                stopKeepAlive();
                if (onEnd) onEnd();
            }
        };

        lastUtterance = u;
        try {
            window.speechSynthesis.speak(u);
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
        } catch (e) {
            console.error('Speech Synthesis Failed:', e);
            if (mySessionId !== activeTtsSessionId) return;
            // Try the next chunk so one bad segment doesn't kill the read.
            setTimeout(() => speakChunk(idx + 1), 30);
        }
    };

    // Android WebView / Chrome Workaround: small delay so cancel() flushes.
    setTimeout(() => speakChunk(0), 50);

    return lastUtterance;
};

export const stopSpeech = () => {
    if ('speechSynthesis' in window) {
        // Invalidate any in-flight chunked session so queued onend handlers stop chaining.
        activeTtsSessionId += 1;
        stopKeepAlive();
        try { window.speechSynthesis.cancel(); } catch (e) {}
    }
};
