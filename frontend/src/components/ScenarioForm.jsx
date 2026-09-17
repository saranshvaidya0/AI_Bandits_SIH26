import React from 'react';
import { Sliders, AlertTriangle, Play } from 'lucide-react';

export default function ScenarioForm({
  scenarioConfig,
  setScenarioConfig,
  onSelectPreset,
  onRunSimulation,
  isSimulating
}) {
  const handleChange = (field, value) => {
    setScenarioConfig(prev => ({
      ...prev,
      [field]: parseFloat(value) || value
    }));
  };

  const handleBreachChange = (field, value) => {
    setScenarioConfig(prev => ({
      ...prev,
      breach: {
        ...prev.breach,
        [field]: parseFloat(value) || value
      }
    }));
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-[#38bdf8]/30 shadow-2xl space-y-5">
      <div className="flex items-center justify-between border-b border-[#38bdf8]/30 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[#38bdf8]" />
          <h2 className="text-base font-black text-slate-100">
            Current Scenario & Dam Breach Parameters
          </h2>
        </div>
        <span className="text-xs text-[#7dd3fc] bg-[#0284c7]/30 border border-[#38bdf8]/40 px-3 py-1 rounded-lg font-bold">
          Step 3 Configuration
        </span>
      </div>

      {/* Preset Selection Buttons */}
      <div className="space-y-1.5">
        <label className="text-xs font-black text-[#38bdf8] uppercase tracking-wider">
          Quick Preset Selection
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { name: "Small Breach", width: 20, height: 15, time: 45, border: "border-[#38bdf8]/30 bg-[#0284c7]/20 text-[#7dd3fc]" },
            { name: "Medium Breach", width: 40, height: 30, time: 30, border: "border-[#38bdf8] bg-[#0284c7]/60 text-white shadow-[0_0_12px_rgba(56,189,248,0.4)]" },
            { name: "Large Breach", width: 75, height: 45, time: 15, border: "border-[#00e5ff] bg-[#0369a1]/40 text-cyan-200" }
          ].map((preset) => (
            <button
              key={preset.name}
              onClick={() => onSelectPreset(preset.name)}
              className={`p-3 border rounded-xl text-xs font-bold transition-all hover:scale-[1.02] text-left ${preset.border}`}
            >
              <div className="font-extrabold">{preset.name}</div>
              <div className="text-[10px] opacity-80 font-medium mt-0.5">Width: {preset.width}m • Form: {preset.time}m</div>
            </button>
          ))}
        </div>
      </div>

      {/* Input Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 glass-card border border-[#38bdf8]/20 rounded-xl space-y-3">
          <h3 className="text-xs font-black text-[#38bdf8] uppercase tracking-wider">Reservoir Head & Volume</h3>
          
          <div>
            <label className="text-[11px] text-slate-300 font-bold block mb-1">Reservoir Level (m MSL)</label>
            <input
              type="number"
              value={scenarioConfig.reservoir_level}
              onChange={(e) => handleChange("reservoir_level", e.target.value)}
              className="w-full bg-[#061a38] border border-[#38bdf8]/40 rounded-lg p-2 text-xs text-slate-100 focus:border-[#38bdf8] focus:outline-none focus:ring-1 focus:ring-[#38bdf8]"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-300 font-bold block mb-1">Water Storage Volume (MCM)</label>
            <input
              type="number"
              value={scenarioConfig.initial_water_volume}
              onChange={(e) => handleChange("initial_water_volume", e.target.value)}
              className="w-full bg-[#061a38] border border-[#38bdf8]/40 rounded-lg p-2 text-xs text-slate-100 focus:border-[#38bdf8] focus:outline-none focus:ring-1 focus:ring-[#38bdf8]"
            />
          </div>
        </div>

        <div className="p-4 glass-card border border-[#38bdf8]/20 rounded-xl space-y-3">
          <h3 className="text-xs font-black text-[#38bdf8] uppercase tracking-wider">Breach Geometry & Time</h3>
          
          <div>
            <label className="text-[11px] text-slate-300 font-bold block mb-1">Average Breach Width (m)</label>
            <input
              type="number"
              value={scenarioConfig.breach.breach_width}
              onChange={(e) => handleBreachChange("breach_width", e.target.value)}
              className="w-full bg-[#061a38] border border-[#38bdf8]/40 rounded-lg p-2 text-xs text-slate-100 focus:border-[#38bdf8] focus:outline-none focus:ring-1 focus:ring-[#38bdf8]"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-300 font-bold block mb-1">Breach Height (m)</label>
            <input
              type="number"
              value={scenarioConfig.breach.breach_height}
              onChange={(e) => handleBreachChange("breach_height", e.target.value)}
              className="w-full bg-[#061a38] border border-[#38bdf8]/40 rounded-lg p-2 text-xs text-slate-100 focus:border-[#38bdf8] focus:outline-none focus:ring-1 focus:ring-[#38bdf8]"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-300 font-bold block mb-1">Breach Formation Time (min)</label>
            <input
              type="number"
              value={scenarioConfig.breach.breach_formation_time}
              onChange={(e) => handleBreachChange("breach_formation_time", e.target.value)}
              className="w-full bg-[#061a38] border border-[#38bdf8]/40 rounded-lg p-2 text-xs text-slate-100 focus:border-[#38bdf8] focus:outline-none focus:ring-1 focus:ring-[#38bdf8]"
            />
          </div>
        </div>

        <div className="p-4 glass-card border border-[#38bdf8]/20 rounded-xl space-y-3">
          <h3 className="text-xs font-black text-[#38bdf8] uppercase tracking-wider">Simulation Runtime</h3>
          
          <div>
            <label className="text-[11px] text-slate-300 font-bold block mb-1">Simulation Duration (Hours)</label>
            <input
              type="number"
              value={scenarioConfig.simulation_duration_hours}
              onChange={(e) => handleChange("simulation_duration_hours", e.target.value)}
              className="w-full bg-[#061a38] border border-[#38bdf8]/40 rounded-lg p-2 text-xs text-slate-100 focus:border-[#38bdf8] focus:outline-none focus:ring-1 focus:ring-[#38bdf8]"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-300 font-bold block mb-1">Time Step dt (sec)</label>
            <input
              type="number"
              value={scenarioConfig.time_step_seconds}
              onChange={(e) => handleChange("time_step_seconds", e.target.value)}
              className="w-full bg-[#061a38] border border-[#38bdf8]/40 rounded-lg p-2 text-xs text-slate-100 focus:border-[#38bdf8] focus:outline-none focus:ring-1 focus:ring-[#38bdf8]"
            />
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl flex items-center gap-2.5 text-xs" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-accent)', color: 'var(--fg-accent-dim)' }}>
        <AlertTriangle className="w-4 h-4 text-[#38bdf8] shrink-0" />
        <span className="font-medium">Notice: Breach parameters are scientific simulation assumptions used for dam safety screening.</span>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={onRunSimulation}
          disabled={isSimulating}
          className="px-6 py-3 btn-blue-gradient rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          Run Hydro Simulation (SPH & Delft3D)
        </button>
      </div>
    </div>
  );
}
