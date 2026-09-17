import React from 'react';
import { Waves, Search, Bell, ChevronDown, MapPin, PlusCircle, Play, FileText, Moon, Sun, Sparkles } from 'lucide-react';

export default function Header({
  studyAreas,
  selectedStudyAreaId,
  onSelectStudyArea,
  onOpenNewAreaModal,
  onSelectPreset,
  onRunSimulation,
  isSimulating,
  onOpenReport,
  hasSimulationResult,
  onToggleTheme,
  isDark
}) {
  return (
    <header
      className="h-16 backdrop-blur-2xl px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 shadow-lg"
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)'
      }}
    >
      {/* Brand Title Logo - Interactive Theme / Dark Mode Toggle */}
      <button
        onClick={onToggleTheme}
        className="flex items-center gap-3 p-1.5 -ml-1 rounded-2xl transition-all duration-300 group cursor-pointer text-left"
        style={{ border: '1px solid transparent' }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(2, 132, 199, 0.15)';
          e.currentTarget.style.borderColor = 'var(--border-accent)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'transparent';
        }}
        title={`Click to switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      >
        <div
          className="p-2 border rounded-xl shadow-lg group-hover:scale-110 transition-transform relative"
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            borderColor: 'rgba(56,189,248,0.40)',
            boxShadow: '0 0 15px rgba(56,189,248,0.35)'
          }}
        >
          <Waves className="w-5 h-5 animate-pulse" style={{ color: '#38bdf8' }} />
          <Sparkles className="w-2.5 h-2.5 text-cyan-300 absolute -top-1 -right-1 animate-spin" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-lg tracking-wide transition-colors" style={{ color: 'var(--fg-primary)' }}>
              Flood<span style={{ color: 'var(--fg-accent)' }}>Guard</span>
            </h1>
            <span
              className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md flex items-center gap-1"
              style={{
                background: 'rgba(2,132,199,0.18)',
                border: '1px solid var(--border-accent)',
                color: 'var(--fg-accent)'
              }}
            >
              {isDark ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>
          <p className="text-[11px] font-medium transition-colors" style={{ color: 'var(--fg-muted)' }}>
            Dam Break Modelling • <span className="underline decoration-dotted">Toggle Theme</span>
          </p>
        </div>
      </button>

      {/* Center Search Bar */}
      <div className="hidden md:flex items-center relative w-72 lg:w-96">
        <Search className="w-4 h-4 absolute left-3 pointer-events-none" style={{ color: 'var(--fg-muted)' }} />
        <input
          type="text"
          placeholder="Search dam, river or study area..."
          className="w-full rounded-full pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:ring-1 transition-all"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-primary)',
            '--tw-ring-color': 'var(--fg-accent)'
          }}
        />
      </div>

      {/* Location Selector Dropdown & New Location Button */}
      <div
        className="flex items-center gap-2 p-1.5 rounded-xl shadow-inner"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-accent)'
        }}
      >
        <MapPin className="w-4 h-4 ml-1 shrink-0" style={{ color: 'var(--fg-accent)' }} />
        <select
          value={selectedStudyAreaId}
          onChange={(e) => onSelectStudyArea(e.target.value)}
          className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer pr-2 max-w-[180px] sm:max-w-xs truncate"
          style={{ color: 'var(--fg-primary)' }}
        >
          {studyAreas.map((sa) => (
            <option
              key={sa.id || sa.study_area_id}
              value={sa.id || sa.study_area_id}
              style={{ background: 'var(--bg-surface-solid)', color: 'var(--fg-primary)' }}
            >
              {sa.name}
            </option>
          ))}
        </select>

        <button
          onClick={onOpenNewAreaModal}
          className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
          style={{
            background: 'rgba(2,132,199,0.25)',
            border: '1px solid var(--border-accent)',
            color: 'var(--fg-accent)'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#0284c7'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(2,132,199,0.25)'; e.currentTarget.style.color = 'var(--fg-accent)'; }}
          title="Add a new custom dam/river location"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">+ New Location</span>
        </button>
      </div>

      {/* Right Controls: Notifications, User Profile & Run Simulation */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button
          className="p-2 rounded-full relative transition-colors"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-accent)'
          }}
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 bg-sky-400 rounded-full absolute top-1 right-1 animate-ping" />
        </button>

        {/* User Profile Avatar */}
        <div
          className="hidden lg:flex items-center gap-2 pl-1 pr-2 py-1 rounded-full"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)'
          }}
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#0284c7] to-[#38bdf8] flex items-center justify-center font-extrabold text-xs text-white shadow-sm">
            SK
          </div>
          <div className="text-left text-[11px] leading-tight pr-1">
            <div className="font-bold" style={{ color: 'var(--fg-primary)' }}>Smit</div>
            <div className="text-[10px]" style={{ color: 'var(--fg-accent)' }}>Project Member</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
        </div>

        {/* Run Simulation Button */}
        <button
          onClick={onRunSimulation}
          disabled={isSimulating}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-lg ${
            isSimulating
              ? "cursor-not-allowed"
              : "btn-blue-gradient"
          }`}
          style={isSimulating ? {
            background: 'rgba(3,105,161,0.8)',
            border: '1px solid var(--border-accent)',
            color: 'var(--fg-accent-dim)'
          } : {}}
        >
          {isSimulating ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Simulating...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Simulation
            </>
          )}
        </button>

        {hasSimulationResult && (
          <button
            onClick={onOpenReport}
            className="px-3 py-2 text-white border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md hidden sm:flex"
            style={{
              background: 'var(--fg-accent)',
              borderColor: 'var(--border-accent)',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <FileText className="w-3.5 h-3.5" />
            Report
          </button>
        )}
      </div>
    </header>
  );
}
