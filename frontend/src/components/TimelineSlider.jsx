import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

export default function TimelineSlider({ activeTimeHour, setActiveTimeHour }) {
  const timeSteps = [1.0, 2.0, 4.0, 8.0, 12.0, 24.0];
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setActiveTimeHour(prev => {
          const idx = timeSteps.indexOf(prev);
          if (idx >= 0 && idx < timeSteps.length - 1) {
            return timeSteps[idx + 1];
          } else {
            setIsPlaying(false);
            return timeSteps[0];
          }
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, setActiveTimeHour, timeSteps]);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-2xl glass-panel rounded-2xl p-3 border border-[#38bdf8]/30 shadow-2xl flex items-center gap-4">
      {/* Play/Pause Button */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="p-2.5 btn-blue-gradient rounded-xl shadow-lg transition-transform active:scale-95 shrink-0"
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      <button
        onClick={() => { setIsPlaying(false); setActiveTimeHour(1.0); }}
        className="p-2 bg-[#061a38] hover:bg-[#0284c7] text-slate-300 border border-[#38bdf8]/30 rounded-xl shrink-0 transition-colors"
        title="Reset to t=1h"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* Time Step Buttons & Slider */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-200">
          <span className="flex items-center gap-1.5 text-[#38bdf8]">
            <Clock className="w-3.5 h-3.5" />
            Flood Progression Timeline
          </span>
          <span className="text-[#38bdf8] font-black text-xs">
            t = {activeTimeHour} Hours Post-Breach
          </span>
        </div>

        <div className="flex items-center justify-between gap-1.5 mt-1">
          {timeSteps.map((th) => (
            <button
              key={th}
              onClick={() => { setIsPlaying(false); setActiveTimeHour(th); }}
              className={`flex-1 py-1.5 text-[11px] font-extrabold rounded-lg transition-all ${
                activeTimeHour === th
                  ? "bg-gradient-to-r from-[#0284c7] to-[#38bdf8] text-white shadow-[0_0_12px_rgba(56,189,248,0.6)] font-black"
                  : "bg-[#061a38] text-slate-400 border border-[#38bdf8]/30 hover:bg-[#0284c7]/40 hover:text-white"
              }`}
            >
              {th}h
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
