import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Coffee, Brain, Minimize2, Maximize2, Settings2 } from 'lucide-react';

export default function PomodoroWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  
  const [tempWork, setTempWork] = useState(25);
  const [tempBreak, setTempBreak] = useState(5);

  const [timeLeft, setTimeLeft] = useState(workDuration * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      // Auto switch mode when timer ends
      if (mode === 'work') {
        setMode('break');
        setTimeLeft(breakDuration * 60);
      } else {
        setMode('work');
        setTimeLeft(workDuration * 60);
      }
      setIsActive(false);
      // Play sound here if needed
      new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode, workDuration, breakDuration]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'work' ? workDuration * 60 : breakDuration * 60);
  };

  const switchMode = (newMode: 'work' | 'break') => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(newMode === 'work' ? workDuration * 60 : breakDuration * 60);
  };

  const saveSettings = () => {
    const newWork = Math.max(1, Math.min(120, tempWork));
    const newBreak = Math.max(1, Math.min(60, tempBreak));
    
    setWorkDuration(newWork);
    setBreakDuration(newBreak);
    setShowSettings(false);
    setIsActive(false);
    
    if (mode === 'work') {
      setTimeLeft(newWork * 60);
    } else {
      setTimeLeft(newBreak * 60);
    }
  };

  const openSettings = () => {
    setTempWork(workDuration);
    setTempBreak(breakDuration);
    setShowSettings(true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Progress circle
  const totalSeconds = mode === 'work' ? workDuration * 60 : breakDuration * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-primary-600 hover:bg-primary-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
      >
        <Brain className="w-6 h-6" />
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-full shadow-xl border border-zinc-200/80 dark:border-zinc-800/80 p-2 flex items-center gap-3 pr-4 animate-in slide-in-from-bottom-4">
        <button 
          onClick={toggleTimer}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${mode === 'work' ? 'bg-primary-600' : 'bg-emerald-500'}`}
        >
          {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
        </button>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            {mode === 'work' ? 'FOCUS' : 'BREAK'}
          </span>
          <span className="text-lg font-mono font-bold text-zinc-900 dark:text-zinc-100 leading-none">
            {formatTime(timeLeft)}
          </span>
        </div>
        <div className="flex items-center gap-1 ml-2 border-l border-zinc-200/80 dark:border-zinc-800/80 pl-2">
          <button onClick={() => setIsMinimized(false)} className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 text-zinc-400 hover:text-red-500 rounded-md hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden animate-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
        <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary-500 dark:text-primary-400" />
          </div>
          뽀모도로 타이머
        </h3>
        <div className="flex items-center gap-1">
          {!showSettings && (
            <button onClick={openSettings} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="설정">
              <Settings2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setIsMinimized(true)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="최소화">
            <Minimize2 className="w-4 h-4" />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-2 text-zinc-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="닫기">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {showSettings ? (
        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">집중 시간 (분)</label>
            <input 
              type="number" 
              value={tempWork} 
              onChange={e => setTempWork(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white"
              min="1"
              max="120"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">휴식 시간 (분)</label>
            <input 
              type="number" 
              value={tempBreak} 
              onChange={e => setTempBreak(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white"
              min="1"
              max="60"
            />
          </div>
          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => setShowSettings(false)}
              className="flex-1 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              취소
            </button>
            <button 
              onClick={saveSettings}
              className="flex-1 py-2.5 text-sm font-bold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
            >
              저장
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 flex flex-col items-center">
          {/* Mode Switch */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1.5 rounded-xl mb-8 w-full">
            <button
              onClick={() => switchMode('work')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'work' ? 'bg-white dark:bg-zinc-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              집중 ({workDuration}분)
            </button>
            <button
              onClick={() => switchMode('break')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${mode === 'break' ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <Coffee className="w-4 h-4" /> 휴식 ({breakDuration}분)
            </button>
          </div>

          {/* Timer Circle */}
          <div className="relative w-48 h-48 mb-8">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" className="stroke-zinc-100 dark:stroke-zinc-800" strokeWidth="4" fill="none" />
              <circle 
                cx="50" cy="50" r="45" 
                className={`${mode === 'work' ? 'stroke-primary-500' : 'stroke-emerald-500'} transition-all duration-1000 ease-linear`}
                strokeWidth="4" 
                fill="none" 
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-mono font-light text-zinc-900 dark:text-zinc-100 tracking-tighter">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTimer}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${mode === 'work' ? 'bg-primary-600 hover:bg-primary-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}
            >
              {isActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>
            <button
              onClick={resetTimer}
              className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              title="초기화"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
