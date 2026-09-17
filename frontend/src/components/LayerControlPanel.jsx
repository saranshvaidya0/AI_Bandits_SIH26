import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';

export default function LayerControlPanel({ visibleLayers, setVisibleLayers }) {
  const [isOpen, setIsOpen] = useState(true);

  const toggleLayer = (layerKey) => {
    setVisibleLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const layersList = [
    { key: 'river', label: 'River Network', color: '#38bdf8' },
    { key: 'sph_flood', label: 'SPH Flood Extent (DualSPHysics)', color: '#0284c7' },
    { key: 'delft3d_flood', label: 'Delft3D Flood Extent (SWE)', color: '#0ea5e9' },
    { key: 'overlap', label: 'Spatial Overlap (SPH ∩ Delft3D)', color: '#0369a1' },
    { key: 'difference', label: 'Difference Map (Delft3D - SPH)', color: '#7dd3fc' },
    { key: 'satellite', label: 'Observed Satellite Flood (Sentinel-1)', color: '#00e5ff' },
    { key: 'villages', label: 'Villages & Settlements', color: '#10b981' },
    { key: 'evacuation', label: 'Evacuation Routes & Shelters', color: '#60a5fa' }
  ];

  return (
    <div className="absolute top-4 right-4 z-20 w-72 glass-panel rounded-2xl border border-[#38bdf8]/30 shadow-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 backdrop-blur-md flex items-center justify-between text-xs font-black uppercase tracking-wider"
        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-accent)', color: 'var(--fg-primary)' }}
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#38bdf8]" />
          <span>GIS Layers & Legend</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {isOpen && (
        <div className="p-3 space-y-3 max-h-96 overflow-y-auto" style={{ background: 'var(--bg-surface-solid)' }}>
          {/* Layer Visibility Checkboxes */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-extrabold uppercase text-[#38bdf8] tracking-wider">
              Layer Visibility
            </h4>
            {layersList.map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#0284c7]/20 cursor-pointer text-xs text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="truncate">{item.label}</span>
                </div>
                <input
                  type="checkbox"
                  checked={visibleLayers[item.key] || false}
                  onChange={() => toggleLayer(item.key)}
                  className="accent-[#38bdf8] w-3.5 h-3.5 rounded"
                />
              </label>
            ))}
          </div>

          {/* Depth Legend Scale (Matching Reference Mockup) */}
          <div className="pt-2 border-t border-[#38bdf8]/30 space-y-1">
            <h4 className="text-[10px] font-extrabold uppercase text-[#38bdf8] tracking-wider">
              Flood Depth (m)
            </h4>
            <div className="space-y-1 text-[11px] font-bold">
              <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#0c4a6e] inline-block border border-cyan-400/30" /> &gt; 5 m</span> <span className="text-slate-400">Extreme</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#0284c7] inline-block border border-cyan-400/30" /> 2 - 5 m</span> <span className="text-slate-400">High</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#0ea5e9] inline-block border border-cyan-400/30" /> 1 - 2 m</span> <span className="text-slate-400">Moderate</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#38bdf8] inline-block border border-cyan-400/30" /> 0.5 - 1 m</span> <span className="text-slate-400">Low</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#bae6fd] inline-block border border-cyan-400/30" /> 0 - 0.5 m</span> <span className="text-slate-400">Minimal</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
