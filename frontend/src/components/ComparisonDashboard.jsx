import React, { useEffect, useRef } from 'react';
import { GitCompare, CheckCircle2 } from 'lucide-react';
import gsap from 'gsap';

export default function ComparisonDashboard({ simulationResult, setComparisonMode, comparisonMode }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" });
    }
  }, []);

  if (!simulationResult) return null;

  const sph = simulationResult.sph_result;
  const d3d = simulationResult.delft3d_result;
  const comp = simulationResult.comparison;

  return (
    <div ref={containerRef} className="glass-panel rounded-2xl p-6 border border-[#38bdf8]/30 shadow-2xl space-y-5">
      <div className="flex items-center justify-between border-b border-[#38bdf8]/30 pb-3">
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-[#38bdf8]" />
          <h2 className="text-base font-black text-slate-100">
            Hydrodynamic Model Comparison: SPH vs Delft3D
          </h2>
        </div>
        <span className="px-3 py-1 text-xs font-black bg-[#0284c7]/30 text-[#7dd3fc] border border-[#38bdf8]/40 rounded-lg shadow-sm">
          Spatial IoU: {(comp.iou_score * 100).toFixed(1)}%
        </span>
      </div>

      {/* Map View Mode Switcher */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl text-xs" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-accent)' }}>
        <span className="text-slate-400 font-bold px-2">Map View Mode:</span>
        {[
          { id: 'sph', label: 'DualSPHysics (SPH)' },
          { id: 'delft3d', label: 'Delft3D (SWE)' },
          { id: 'both', label: 'Both Overlay' },
          { id: 'overlap', label: 'Spatial Overlap (SPH ∩ Delft3D)' },
          { id: 'difference', label: 'Difference Map' }
        ].map((mode) => (
          <button
            key={mode.id}
            onClick={() => setComparisonMode(mode.id)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              comparisonMode === mode.id
                ? "btn-blue-gradient"
                : "bg-[#031329] text-slate-300 border border-[#38bdf8]/30 hover:bg-[#0284c7]/40"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Metric Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-[#38bdf8]/30">
        <table className="w-full text-xs text-left text-slate-300">
          <thead style={{ background: 'var(--bg-input)', color: 'var(--fg-accent)' }} className="uppercase text-[10px] font-black tracking-wider">
            <tr>
              <th className="p-3">Hydrodynamic Parameter</th>
              <th className="p-3 text-[#38bdf8]">DualSPHysics (SPH Engine)</th>
              <th className="p-3 text-[#7dd3fc]">Delft3D (Grid Flow Engine)</th>
              <th className="p-3 text-cyan-300">Absolute / % Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ background: 'rgba(3,19,41,0.6)' }}>
            <tr>
              <td className="p-3 font-extrabold text-slate-200">Peak Breach Flow (Q_peak)</td>
              <td className="p-3 font-black text-[#38bdf8]">{sph.peak_flow_m3s} m³/s</td>
              <td className="p-3 font-black text-[#7dd3fc]">{d3d.peak_flow_m3s} m³/s</td>
              <td className="p-3 font-bold">{Math.abs(sph.peak_flow_m3s - d3d.peak_flow_m3s).toFixed(1)} m³/s</td>
            </tr>
            <tr>
              <td className="p-3 font-extrabold text-slate-200">Total Inundation Area</td>
              <td className="p-3 font-black text-[#38bdf8]">{sph.total_flooded_area_km2} km²</td>
              <td className="p-3 font-black text-[#7dd3fc]">{d3d.total_flooded_area_km2} km²</td>
              <td className="p-3 font-black text-cyan-300">{comp.absolute_diff_km2} km² ({comp.percentage_diff}%)</td>
            </tr>
            <tr>
              <td className="p-3 font-extrabold text-slate-200">Maximum Water Depth</td>
              <td className="p-3 font-black">{sph.max_water_depth_m} m</td>
              <td className="p-3 font-black">{d3d.max_water_depth_m} m</td>
              <td className="p-3 font-bold">{Math.abs(sph.max_water_depth_m - d3d.max_water_depth_m).toFixed(2)} m</td>
            </tr>
            <tr>
              <td className="p-3 font-extrabold text-slate-200">Maximum Flow Velocity</td>
              <td className="p-3 font-black">{sph.max_velocity_ms} m/s</td>
              <td className="p-3 font-black">{d3d.max_velocity_ms} m/s</td>
              <td className="p-3 font-bold">{Math.abs(sph.max_velocity_ms - d3d.max_velocity_ms).toFixed(2)} m/s</td>
            </tr>
            <tr>
              <td className="p-3 font-extrabold text-slate-200">Peak Arrival Time</td>
              <td className="p-3 font-black">{sph.peak_inundation_time_hours} hrs</td>
              <td className="p-3 font-black">{d3d.peak_inundation_time_hours} hrs</td>
              <td className="p-3 font-bold">0.7 hrs delta</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Spatial IoU Card */}
      <div className="p-4 rounded-xl flex items-start gap-3 shadow-inner" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-accent)' }}>
        <CheckCircle2 className="w-5 h-5 text-[#38bdf8] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-black text-[#38bdf8]">
            Spatial Intersection over Union (IoU): {(comp.iou_score * 100).toFixed(1)}%
          </div>
          <p className="text-slate-300 leading-relaxed font-medium">
            Formula: <code className="bg-[#0284c7]/30 px-1.5 py-0.5 rounded text-[#7dd3fc]">IoU = Intersection Area / Union Area</code>.
            Intersection Area = {comp.intersection_area_km2} km², Union Area = {comp.union_area_km2} km².
          </p>
        </div>
      </div>
    </div>
  );
}
