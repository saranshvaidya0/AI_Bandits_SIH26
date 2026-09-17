import React, { useEffect, useRef } from 'react';
import {
  LayoutDashboard, MapPin, Database, Sliders, Cpu, GitCompare,
  CheckCircle2, LineChart, Building2, Compass, History, FileText
} from 'lucide-react';
import gsap from 'gsap';

export default function Sidebar({ activeTab, setActiveTab, hasSimulationResult }) {
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (sidebarRef.current) {
      gsap.fromTo(
        sidebarRef.current.querySelectorAll('.nav-item'),
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.04, ease: "power2.out" }
      );
    }
  }, []);

  const steps = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'study_area', label: 'Study Area', icon: MapPin },
    { id: 'data_catalog', label: 'Data & Layers', icon: Database },
    { id: 'scenario', label: 'Scenario', icon: Sliders },
    { id: 'simulation', label: 'Simulation', icon: Cpu },
    { id: 'history', label: 'Simulation History', icon: History },
    { id: 'comparison', label: 'Model Comparison', icon: GitCompare, requiresSim: true },
    { id: 'validation', label: 'Validation', icon: CheckCircle2, requiresSim: true },
    { id: 'sensitivity', label: 'Sensitivity Analysis', icon: LineChart },
    { id: 'impact', label: 'Impact Assessment', icon: Building2, requiresSim: true },
    { id: 'evacuation', label: 'Evacuation Support', icon: Compass, requiresSim: true },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  return (
    <aside ref={sidebarRef} className="w-64 backdrop-blur-2xl flex flex-col justify-between shrink-0 z-20 shadow-2xl"
      style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-default)' }}>
      <div className="p-3 overflow-y-auto space-y-1">
        <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'var(--fg-accent)' }}>
          Main Workflow Navigation
        </div>

        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = activeTab === step.id;
          const isDisabled = step.requiresSim && !hasSimulationResult;

          return (
            <button
              key={step.id}
              onClick={() => !isDisabled && setActiveTab(step.id)}
              disabled={isDisabled}
              className={`nav-item w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
                isActive
                  ? "bg-gradient-to-r from-[#0284c7] to-[#38bdf8] text-white shadow-[0_0_18px_rgba(56,189,248,0.5)] border border-[#38bdf8]/50 font-extrabold"
                  : isDisabled
                  ? "text-slate-600 cursor-not-allowed opacity-40"
                  : "text-slate-300 hover:bg-[#0284c7]/20 hover:text-white hover:border hover:border-[#38bdf8]/30"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : isDisabled ? "text-slate-600" : "text-[#38bdf8]"}`} />
              <span className="truncate">{step.label}</span>
              {step.requiresSim && hasSimulationResult && (
                <span className="ml-auto w-2 h-2 rounded-full bg-[#38bdf8] animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {/* Promo Poster Card at Bottom */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
        <div className="relative rounded-xl overflow-hidden p-4" style={{ border: '1px solid var(--border-accent)', background: 'linear-gradient(to bottom, rgba(2,132,199,0.12), var(--bg-base))' }}>
          <div className="relative z-10 space-y-1">
            <h4 className="text-sm font-black tracking-tight leading-tight" style={{ color: 'var(--fg-primary)' }}>
              From Data <br />
              to <span style={{ color: 'var(--fg-accent)' }}>Safer</span> <br />
              Communities
            </h4>
            <p className="text-[10px] font-medium" style={{ color: 'var(--fg-secondary)' }}>Predict. Prepare. Protect.</p>
          </div>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-[#38bdf8]/15 rounded-full blur-xl pointer-events-none" />
        </div>
      </div>
    </aside>
  );
}
