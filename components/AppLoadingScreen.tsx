import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, HelpCircle, Video, Headphones, BrainCircuit, Bot, WifiOff, Users, Type, Check, X } from 'lucide-react';
import { APP_VERSION } from '../constants';

// === STYLISH BRANDED FONT CHOICES for the splash short name ===
// Each entry: { id, label, family, googleFontParam, weight }.
// We lazy-load the chosen font from Google Fonts on first use (and cache via
// localStorage). Default = the existing Inter/system stack so existing users
// see no change unless they pick something.
type SplashFont = {
  id: string;
  label: string;
  /** CSS font-family value for the h1 */
  family: string;
  /** Google Fonts URL family param (e.g. 'Orbitron:wght@900'). Empty = system. */
  gfontParam: string;
  /** Optional CSS letterSpacing override */
  letterSpacing?: string;
};

const SPLASH_FONTS: SplashFont[] = [
  { id: 'default',     label: 'Default',          family: '', gfontParam: '' },
  { id: 'orbitron',    label: 'Orbitron · Tech',  family: '"Orbitron", sans-serif', gfontParam: 'Orbitron:wght@900', letterSpacing: '0.05em' },
  { id: 'audiowide',   label: 'Audiowide',        family: '"Audiowide", sans-serif', gfontParam: 'Audiowide' },
  { id: 'russo',       label: 'Russo One · Bold', family: '"Russo One", sans-serif', gfontParam: 'Russo+One' },
  { id: 'bebas',       label: 'Bebas Neue',       family: '"Bebas Neue", sans-serif', gfontParam: 'Bebas+Neue', letterSpacing: '0.08em' },
  { id: 'blackops',    label: 'Black Ops · Military', family: '"Black Ops One", sans-serif', gfontParam: 'Black+Ops+One' },
  { id: 'righteous',   label: 'Righteous',        family: '"Righteous", sans-serif', gfontParam: 'Righteous' },
  { id: 'monoton',     label: 'Monoton · Neon',   family: '"Monoton", sans-serif', gfontParam: 'Monoton' },
  { id: 'playfair',    label: 'Playfair · Elegant', family: '"Playfair Display", serif', gfontParam: 'Playfair+Display:wght@900' },
  { id: 'cinzel',      label: 'Cinzel · Classic', family: '"Cinzel", serif', gfontParam: 'Cinzel:wght@900', letterSpacing: '0.06em' },
  { id: 'marker',      label: 'Permanent Marker', family: '"Permanent Marker", cursive', gfontParam: 'Permanent+Marker' },
  { id: 'pressstart',  label: 'Press Start · Retro', family: '"Press Start 2P", monospace', gfontParam: 'Press+Start+2P' },
  { id: 'pacifico',    label: 'Pacifico · Casual', family: '"Pacifico", cursive', gfontParam: 'Pacifico' },
  { id: 'rajdhani',    label: 'Rajdhani · Modern', family: '"Rajdhani", sans-serif', gfontParam: 'Rajdhani:wght@700' },
];

/** Inject a Google Fonts <link> for the given family param, only once per param. */
function ensureGoogleFontLoaded(gfontParam: string) {
  if (!gfontParam) return;
  const id = `gfont-${gfontParam.replace(/[^a-zA-Z0-9]/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${gfontParam}&display=swap`;
  document.head.appendChild(link);
}

interface AppLoadingScreenProps {
  onComplete: () => void;
  isPremium?: boolean;
}

type ThemeVariant = 'black' | 'blue' | 'light';

function detectTheme(): ThemeVariant {
  try {
    const isDark = localStorage.getItem('nst_dark_mode') === 'true';
    if (!isDark) return 'light';
    const type = localStorage.getItem('nst_dark_theme_type') || 'black';
    return type === 'blue' ? 'blue' : 'black';
  } catch {
    return 'black';
  }
}

const THEME_STYLES: Record<ThemeVariant, {
  bg: string; text: string; subtext: string; boxBg: string; boxBorder: string;
  trackBg: string; bar: string; badge: string;
}> = {
  black: {
    bg: 'bg-black',
    text: 'text-white',
    subtext: 'text-gray-500',
    boxBg: 'bg-gray-900',
    boxBorder: 'border-gray-800',
    trackBg: 'bg-gray-900',
    bar: 'from-indigo-500 via-violet-500 to-purple-600',
    badge: 'text-gray-500',
  },
  blue: {
    bg: 'bg-[#050d1f]',
    text: 'text-white',
    subtext: 'text-blue-400/70',
    boxBg: 'bg-blue-950/60',
    boxBorder: 'border-blue-900/60',
    trackBg: 'bg-blue-950',
    bar: 'from-blue-500 via-indigo-500 to-purple-500',
    badge: 'text-blue-400/60',
  },
  light: {
    bg: 'bg-white',
    text: 'text-slate-900',
    subtext: 'text-slate-500',
    boxBg: 'bg-slate-50',
    boxBorder: 'border-slate-200',
    trackBg: 'bg-slate-200',
    bar: 'from-blue-500 via-indigo-500 to-purple-500',
    badge: 'text-slate-400',
  },
};

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({ onComplete, isPremium = false }) => {
  const [progress, setProgress] = useState(0);
  const [stepPhase1, setStepPhase1] = useState(-1);
  const [stepPhase2, setStepPhase2] = useState(-1);
  const [logoTapped, setLogoTapped] = useState(false);

  const [themeVariant] = useState<ThemeVariant>(detectTheme);

  const [appName] = useState(() => {
    try {
      const settingsRaw = localStorage.getItem('nst_system_settings');
      const settingsObj = settingsRaw ? JSON.parse(settingsRaw) : null;
      // Prefer short name (used as the splash logo word) — falls back to long name, then "IIC".
      return settingsObj?.appShortName || settingsObj?.appName || 'IIC';
    } catch {
      return 'IIC';
    }
  });

  // Admin-controlled font-size for the splash short name (in pixels).
  // Reads from systemSettings.appShortNameSize. Clamped to [24, 120].
  const [appNameSize] = useState<number>(() => {
    try {
      const settingsRaw = localStorage.getItem('nst_system_settings');
      const settingsObj = settingsRaw ? JSON.parse(settingsRaw) : null;
      const raw = Number(settingsObj?.appShortNameSize);
      if (Number.isFinite(raw) && raw > 0) return Math.min(120, Math.max(24, raw));
      return 30; // default = matches old text-3xl
    } catch {
      return 30;
    }
  });

  // === Splash Font Picker (user-selectable, persisted in localStorage) ===
  const [splashFontId, setSplashFontId] = useState<string>(() => {
    try { return localStorage.getItem('nst_splash_font_id') || 'default'; }
    catch { return 'default'; }
  });
  const [showFontPicker, setShowFontPicker] = useState(false);
  const activeFont = SPLASH_FONTS.find(f => f.id === splashFontId) || SPLASH_FONTS[0];

  // Lazy-load the chosen Google Font on mount AND whenever it changes.
  useEffect(() => {
    if (activeFont.gfontParam) ensureGoogleFontLoaded(activeFont.gfontParam);
  }, [activeFont.gfontParam]);

  // When picker opens, eagerly preload ALL Google Fonts so previews look right.
  useEffect(() => {
    if (!showFontPicker) return;
    SPLASH_FONTS.forEach(f => { if (f.gfontParam) ensureGoogleFontLoaded(f.gfontParam); });
  }, [showFontPicker]);

  const onCompleteRef = useRef(onComplete);
  const appNameRef = useRef(appName);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { appNameRef.current = appName; }, [appName]);

  useEffect(() => {
    // Pause the auto-advance timer while the user is browsing the font picker
    // — otherwise the splash auto-completes and yanks them off the screen.
    if (showFontPicker) return;
    const duration = isPremium ? 1000 : 3000;
    const intervalTime = isPremium ? 33 : 100;
    const steps = duration / intervalTime;
    // Resume from current progress so reopening after picker doesn't jump back to 0%.
    let currentStep = Math.floor((progress / 100) * steps);

    const timer = setInterval(() => {
      currentStep++;
      const currentProgress = Math.min(Math.floor((currentStep / steps) * 100), 100);
      setProgress(currentProgress);

      if (currentProgress < 50) {
        if (currentProgress >= 10) setStepPhase1(0);
        if (currentProgress >= 20) setStepPhase1(1);
        if (currentProgress >= 30) setStepPhase1(2);
        if (currentProgress >= 40) setStepPhase1(3);
      }

      if (currentProgress >= 50) {
        setStepPhase1(-1);
        if (currentProgress >= 50) setStepPhase2(0);
        if (currentProgress >= 60) setStepPhase2(1);
        if (currentProgress >= 70) setStepPhase2(2);
        if (currentProgress >= 80) setStepPhase2(3);
      }

      if (currentStep >= steps) {
        clearInterval(timer);
        try {
          const utterance = new SpeechSynthesisUtterance('Welcome to ' + appNameRef.current);
          utterance.lang = 'en-US';
          utterance.rate = 1;
          utterance.pitch = 1;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        } catch {}
        onCompleteRef.current();
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [showFontPicker, isPremium]);

  const handleLogoTap = () => {
    if (logoTapped) return;
    try { if (navigator.vibrate) navigator.vibrate(40); } catch {}
    setLogoTapped(true);
    setTimeout(() => setLogoTapped(false), 600);
  };

  const t = THEME_STYLES[themeVariant];

  const iconColor1 = themeVariant === 'light' ? 'text-blue-500' : 'text-blue-400';
  const iconColor2 = themeVariant === 'light' ? 'text-violet-600' : 'text-purple-400';
  const iconColor3 = themeVariant === 'light' ? 'text-rose-500' : 'text-rose-400';
  const iconColor4 = themeVariant === 'light' ? 'text-emerald-600' : 'text-emerald-400';
  const iconColor5 = themeVariant === 'light' ? 'text-amber-500' : 'text-amber-400';
  const iconColor6 = themeVariant === 'light' ? 'text-indigo-600' : 'text-indigo-400';
  const iconColor7 = themeVariant === 'light' ? 'text-teal-600' : 'text-teal-400';
  const iconColor8 = themeVariant === 'light' ? 'text-orange-500' : 'text-orange-400';

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center ${t.bg} ${t.text} overflow-hidden w-full mx-auto`}>
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className={`absolute top-[-10%] left-[-10%] w-[120%] h-[120%] ${
          themeVariant === 'blue'
            ? 'bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.4)_0%,transparent_55%)]'
            : themeVariant === 'black'
            ? 'bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.25)_0%,transparent_55%)]'
            : 'bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_55%)]'
        } animate-[spin_15s_linear_infinite]`} />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full px-8">
        {/* Logo / App Name — tappable for scale-up animation */}
        <button
          type="button"
          onClick={handleLogoTap}
          className="mb-12 text-center animate-in slide-in-from-bottom-4 duration-700 fade-in focus:outline-none select-none"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <h1
            className={`font-black tracking-tight mb-2 uppercase text-center leading-tight transition-transform duration-300 ease-out ${
              logoTapped ? 'scale-[2.2]' : 'scale-100'
            } ${
              themeVariant === 'light'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'
                : 'bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent'
            }`}
            style={{
              fontSize: `${appNameSize}px`,
              // Apply the user-chosen branded font (if any).
              ...(activeFont.family ? { fontFamily: activeFont.family } : {}),
              ...(activeFont.letterSpacing ? { letterSpacing: activeFont.letterSpacing } : {}),
            }}
          >
            {appName}
          </h1>
          <p className={`text-xs font-bold tracking-widest ${t.subtext} uppercase mt-2 transition-opacity duration-300 ${logoTapped ? 'opacity-0' : 'opacity-100'}`}>
            Loading your experience...
          </p>
        </button>

        {/* Feature boxes */}
        <div className="relative w-full h-64 perspective-1000 mb-4">
          {/* Phase 1 */}
          <div className={`absolute inset-0 grid grid-cols-2 gap-4 w-full transition-all duration-500 ${progress < 50 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl ${t.boxBg} border ${t.boxBorder} shadow-lg transition-all duration-500 transform ${stepPhase1 >= 0 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <BookOpen size={32} className={`${iconColor1} mb-3`} />
              <span className={`font-bold tracking-wide ${t.text}`}>Notes</span>
            </div>
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl ${t.boxBg} border ${t.boxBorder} shadow-lg transition-all duration-500 transform ${stepPhase1 >= 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <HelpCircle size={32} className={`${iconColor2} mb-3`} />
              <span className={`font-bold tracking-wide ${t.text}`}>MCQ</span>
            </div>
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl ${t.boxBg} border ${t.boxBorder} shadow-lg transition-all duration-500 transform ${stepPhase1 >= 2 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <Video size={32} className={`${iconColor3} mb-3`} />
              <span className={`font-bold tracking-wide ${t.text}`}>Video</span>
            </div>
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl ${t.boxBg} border ${t.boxBorder} shadow-lg transition-all duration-500 transform ${stepPhase1 >= 3 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <Headphones size={32} className={`${iconColor4} mb-3`} />
              <span className={`font-bold tracking-wide ${t.text}`}>Audio</span>
            </div>
          </div>

          {/* Phase 2 */}
          <div className={`absolute inset-0 grid grid-cols-2 gap-4 w-full transition-all duration-500 ${progress >= 50 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl ${t.boxBg} border ${t.boxBorder} shadow-lg transition-all duration-500 transform ${stepPhase2 >= 0 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <BrainCircuit size={32} className={`${iconColor5} mb-3`} />
              <span className={`font-bold tracking-wide text-center leading-tight ${t.text}`}>Smart<br />Revision</span>
            </div>
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl ${t.boxBg} border ${t.boxBorder} shadow-lg transition-all duration-500 transform ${stepPhase2 >= 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <Bot size={32} className={`${iconColor6} mb-3`} />
              <span className={`font-bold tracking-wide ${t.text}`}>AI Hub</span>
            </div>
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl ${t.boxBg} border ${t.boxBorder} shadow-lg transition-all duration-500 transform ${stepPhase2 >= 2 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <WifiOff size={32} className={`${iconColor7} mb-3`} />
              <span className={`font-bold tracking-wide text-center leading-tight ${t.text}`}>Offline<br />Mode</span>
            </div>
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl ${t.boxBg} border ${t.boxBorder} shadow-lg transition-all duration-500 transform ${stepPhase2 >= 3 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <Users size={32} className={`${iconColor8} mb-3`} />
              <span className={`font-bold tracking-wide text-center leading-tight ${t.text}`}>Teacher<br />Mode</span>
            </div>
          </div>
        </div>

        {/* Progress section */}
        <div className="w-full flex flex-col items-center mt-4">
          <div className="flex flex-col items-center justify-center mb-2">
            <div className={`text-4xl font-black font-mono tracking-tighter drop-shadow-md ${t.text}`}>
              {progress}%
            </div>
          </div>
          <div className={`w-full h-2 ${t.trackBg} rounded-full overflow-hidden mb-2 shadow-inner`}>
            <div
              className={`h-full bg-gradient-to-r ${t.bar} rounded-full transition-all duration-100 ease-linear shadow-sm`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 mt-1">
            <p className={`text-[11px] font-bold ${t.badge} tracking-wide`}>
              Developed by Nadim Anwar
            </p>
            <span className={t.badge}>|</span>
            <p className={`text-[11px] ${t.badge} font-mono font-bold tracking-widest`}>
              v{APP_VERSION}
            </p>
            <span className={t.badge}>|</span>
            <button
              type="button"
              onClick={() => setShowFontPicker(true)}
              className={`text-[11px] font-black ${t.badge} tracking-wide flex items-center gap-1 hover:opacity-80 transition-opacity`}
              title="App name ka font change karein"
            >
              <Type size={11} /> Aa
            </button>
          </div>
        </div>
      </div>

      {/* === SPLASH FONT PICKER OVERLAY === */}
      {showFontPicker && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl ${themeVariant === 'light' ? 'bg-white' : 'bg-slate-900'}`}>
            <div className={`sticky top-0 z-10 px-5 py-4 flex items-center justify-between border-b ${themeVariant === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className="flex items-center gap-2">
                <Type size={18} className={themeVariant === 'light' ? 'text-indigo-600' : 'text-indigo-400'} />
                <h3 className={`font-black text-base ${themeVariant === 'light' ? 'text-slate-800' : 'text-white'}`}>
                  Splash Font
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFontPicker(false)}
                className={`p-1.5 rounded-full ${themeVariant === 'light' ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-300'}`}
              >
                <X size={18} />
              </button>
            </div>

            <p className={`px-5 pt-3 pb-1 text-[11px] font-bold tracking-wide ${themeVariant === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              {appName} ka style choose karein — branded · stylish · professional
            </p>

            <div className="p-3 space-y-2">
              {SPLASH_FONTS.map(f => {
                const isActive = f.id === splashFontId;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setSplashFontId(f.id);
                      try { localStorage.setItem('nst_splash_font_id', f.id); } catch {}
                      try { if (navigator.vibrate) navigator.vibrate(20); } catch {}
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left active:scale-[0.98] ${
                      isActive
                        ? (themeVariant === 'light'
                            ? 'bg-indigo-50 border-indigo-400 shadow-md'
                            : 'bg-indigo-900/40 border-indigo-500 shadow-md')
                        : (themeVariant === 'light'
                            ? 'bg-slate-50 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                            : 'bg-slate-800/50 border-slate-700 hover:border-indigo-500')
                    }`}
                  >
                    <span
                      className={`flex-1 text-2xl font-black ${
                        themeVariant === 'light' ? 'text-slate-800' : 'text-white'
                      }`}
                      style={{
                        ...(f.family ? { fontFamily: f.family } : {}),
                        ...(f.letterSpacing ? { letterSpacing: f.letterSpacing } : {}),
                      }}
                    >
                      {appName}
                    </span>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${
                        isActive
                          ? (themeVariant === 'light' ? 'text-indigo-700' : 'text-indigo-300')
                          : (themeVariant === 'light' ? 'text-slate-500' : 'text-slate-400')
                      }`}>
                        {f.label}
                      </span>
                      {isActive && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black ${
                          themeVariant === 'light' ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white'
                        }`}>
                          <Check size={10} /> Active
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className={`sticky bottom-0 px-5 py-3 border-t ${themeVariant === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <button
                type="button"
                onClick={() => setShowFontPicker(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-sm shadow-lg active:scale-95 transition-transform"
              >
                Done
              </button>
              <p className={`text-[10px] text-center mt-2 ${themeVariant === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
                Yeh font har baar splash screen pe save rahega
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
