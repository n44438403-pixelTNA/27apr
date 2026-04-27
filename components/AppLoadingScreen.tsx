import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, HelpCircle, Video, Headphones, BrainCircuit, Bot, WifiOff, Users } from 'lucide-react';
import { APP_VERSION } from '../constants';

interface AppLoadingScreenProps {
  onComplete: () => void;
  isPremium?: boolean;
}

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({ onComplete, isPremium = false }) => {
  const [progress, setProgress] = useState(0);
  const [stepPhase1, setStepPhase1] = useState(-1); // -1: none, 0: notes, 1: mcq, 2: video, 3: audio
  const [stepPhase2, setStepPhase2] = useState(-1); // -1: none, 0: smart revision, 1: ai hub, 2: offline mode, 3: teacher mode

  const [appName, setAppName] = useState(() => {
    try {
        const settingsRaw = localStorage.getItem('nst_system_settings');
        const settingsObj = settingsRaw ? JSON.parse(settingsRaw) : null;
        return settingsObj?.appName || 'IIC';
    } catch(e) {
        return 'IIC';
    }
  });

  const onCompleteRef = useRef(onComplete);
  const appNameRef = useRef(appName);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    appNameRef.current = appName;
  }, [appName]);

  useEffect(() => {
    // Premium users get 1 second, free users get 3 seconds
    const duration = isPremium ? 1000 : 3000;
    const intervalTime = isPremium ? 33 : 100;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const currentProgress = Math.min(Math.floor((currentStep / steps) * 100), 100);
      setProgress(currentProgress);

      // Phase 1: 0 - 50%
      if (currentProgress < 50) {
        if (currentProgress >= 10) setStepPhase1(0); // Notes
        if (currentProgress >= 20) setStepPhase1(1); // MCQ
        if (currentProgress >= 30) setStepPhase1(2); // Video
        if (currentProgress >= 40) setStepPhase1(3); // Audio
      }

      // Phase 2: 50 - 100%
      if (currentProgress >= 50) {
        setStepPhase1(-1); // Hide phase 1 boxes

        if (currentProgress >= 50) setStepPhase2(0); // Smart Revision
        if (currentProgress >= 60) setStepPhase2(1); // AI Hub
        if (currentProgress >= 70) setStepPhase2(2); // Offline Mode
        if (currentProgress >= 80) setStepPhase2(3); // Teacher Mode
      }

      if (currentStep >= steps) {
        clearInterval(timer);
        try {
           const utterance = new SpeechSynthesisUtterance("Welcome to " + appNameRef.current);
           utterance.lang = "en-US";
           utterance.rate = 1;
           utterance.pitch = 1;
           window.speechSynthesis.cancel();
           window.speechSynthesis.speak(utterance);
        } catch(e) { console.error("Speech Synthesis Error:", e); }
        onCompleteRef.current();
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, []); // Empty dependency array prevents reset on App re-renders

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900 text-white overflow-hidden w-full mx-auto">
      {/* Background animated elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.3)_0%,transparent_50%)] animate-[spin_15s_linear_infinite]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full px-8">
        {/* Main Title */}
        <div className="mb-12 text-center animate-in slide-in-from-bottom-4 duration-700 fade-in">
          <h1 className="text-3xl font-black tracking-tight mb-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent uppercase text-center leading-tight">
            {appName}
          </h1>
          <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mt-2">
            Loading your experience...
          </p>
        </div>

        <div className="relative w-full h-64 perspective-1000 mb-4">
          {/* Phase 1: The 4 Feature Boxes (0 - 50%) */}
          <div className={`absolute inset-0 grid grid-cols-2 gap-4 w-full transition-all duration-500 ${progress < 50 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            {/* Box 1: Notes */}
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-800 border border-slate-700 shadow-lg transition-all duration-500 transform ${stepPhase1 >= 0 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <BookOpen size={32} className="text-blue-400 mb-3" />
              <span className="font-bold tracking-wide text-white">Notes</span>
            </div>

            {/* Box 2: MCQ */}
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-800 border border-slate-700 shadow-lg transition-all duration-500 transform ${stepPhase1 >= 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <HelpCircle size={32} className="text-purple-400 mb-3" />
              <span className="font-bold tracking-wide text-white">MCQ</span>
            </div>

            {/* Box 3: Video */}
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-800 border border-slate-700 shadow-lg transition-all duration-500 transform ${stepPhase1 >= 2 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <Video size={32} className="text-rose-400 mb-3" />
              <span className="font-bold tracking-wide text-white">Video</span>
            </div>

            {/* Box 4: Audio */}
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-800 border border-slate-700 shadow-lg transition-all duration-500 transform ${stepPhase1 >= 3 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <Headphones size={32} className="text-emerald-400 mb-3" />
              <span className="font-bold tracking-wide text-white">Audio</span>
            </div>
          </div>

          {/* Phase 2: The 4 Feature Boxes (50 - 100%) */}
          <div className={`absolute inset-0 grid grid-cols-2 gap-4 w-full transition-all duration-500 ${progress >= 50 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            {/* Box 1: Smart Revision */}
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-800 border border-slate-700 shadow-lg transition-all duration-500 transform ${stepPhase2 >= 0 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <BrainCircuit size={32} className="text-amber-400 mb-3" />
              <span className="font-bold tracking-wide text-center leading-tight text-white">Smart<br/>Revision</span>
            </div>

            {/* Box 2: AI Hub */}
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-800 border border-slate-700 shadow-lg transition-all duration-500 transform ${stepPhase2 >= 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <Bot size={32} className="text-indigo-400 mb-3" />
              <span className="font-bold tracking-wide text-white">AI Hub</span>
            </div>

            {/* Box 3: Offline Mode */}
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-800 border border-slate-700 shadow-lg transition-all duration-500 transform ${stepPhase2 >= 2 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <WifiOff size={32} className="text-teal-400 mb-3" />
              <span className="font-bold tracking-wide text-center leading-tight text-white">Offline<br/>Mode</span>
            </div>

            {/* Box 4: Teacher Mode */}
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-800 border border-slate-700 shadow-lg transition-all duration-500 transform ${stepPhase2 >= 3 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <Users size={32} className="text-orange-400 mb-3" />
              <span className="font-bold tracking-wide text-center leading-tight text-white">Teacher<br/>Mode</span>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="w-full flex flex-col items-center mt-4">
           <div className="flex flex-col items-center justify-center mb-2">
              <div className="text-4xl font-black text-white font-mono tracking-tighter drop-shadow-md">
                {progress}%
              </div>
           </div>
           <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2 shadow-inner border border-slate-700">
             <div
               className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-100 ease-linear shadow-sm"
               style={{ width: `${progress}%` }}
             ></div>
           </div>
           <div className="flex items-center justify-center gap-2 mt-1">
             <p className="text-[11px] font-bold text-slate-400 tracking-wide">
               Developed by Nadim Anwar
             </p>
             <span className="text-slate-600">|</span>
             <p className="text-[11px] text-slate-400 font-mono font-bold tracking-widest">
               v{APP_VERSION}
             </p>
           </div>
        </div>
      </div>
    </div>
  );
};
