import React from 'react';
import { CheckCircle2, Upload, Eye } from 'lucide-react';

export default function SatelliteValidation({ validationResult, onToggleSatelliteLayer, isSatelliteVisible }) {
  const val = validationResult || {
    observed_data_source: "Sentinel-1 SAR Prototype Data",
    simulated_area_km2: 18.5,
    observed_area_km2: 24.5,
    intersection_area_km2: 16.8,
    union_area_km2: 26.2,
    iou_score: 0.6412,
    precision: 0.908,
    recall: 0.685,
    status_label: "Prototype / Simulated Validation"
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-[#38bdf8]/30 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-[#38bdf8]/30 pb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[#38bdf8]" />
          <h2 className="text-base font-black text-slate-100">
            Observed Satellite Remote Sensing Validation
          </h2>
        </div>
        <span className="text-xs bg-[#0284c7]/30 text-[#7dd3fc] border border-[#38bdf8]/40 px-3 py-1 rounded-lg font-bold">
          {val.status_label}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-3.5 glass-card rounded-xl border border-[#38bdf8]/20">
          <div className="text-[10px] text-slate-400 font-extrabold uppercase">Satellite Data Source</div>
          <div className="text-sm font-black text-slate-100 mt-1">{val.observed_data_source}</div>
          <div className="text-[10px] text-[#38bdf8] mt-0.5">Observed: {val.observed_area_km2} km²</div>
        </div>

        <div className="p-3.5 glass-card rounded-xl border border-[#38bdf8]/20">
          <div className="text-[10px] text-slate-400 font-extrabold uppercase">Spatial IoU Score</div>
          <div className="text-xl font-black text-[#38bdf8] mt-1">{(val.iou_score * 100).toFixed(1)}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Intersection / Union</div>
        </div>

        <div className="p-3.5 glass-card rounded-xl border border-[#38bdf8]/20">
          <div className="text-[10px] text-slate-400 font-extrabold uppercase">Model Precision</div>
          <div className="text-xl font-black text-emerald-400 mt-1">{(val.precision * 100).toFixed(1)}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Simulated flooded matching SAR</div>
        </div>

        <div className="p-3.5 glass-card rounded-xl border border-[#38bdf8]/20">
          <div className="text-[10px] text-slate-400 font-extrabold uppercase">Model Recall</div>
          <div className="text-xl font-black text-cyan-300 mt-1">{(val.recall * 100).toFixed(1)}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Observed footprint covered</div>
        </div>
      </div>

      <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-accent)' }}>
        <div className="flex items-center gap-2 text-xs text-slate-200 font-medium">
          <Upload className="w-4 h-4 text-[#38bdf8]" />
          <span>Upload custom observed flood raster / GeoJSON polygon:</span>
        </div>
        <button
          onClick={onToggleSatelliteLayer}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 border transition-all ${
            isSatelliteVisible
              ? "btn-blue-gradient"
              : "bg-[#031329] text-slate-300 border-[#38bdf8]/30 hover:bg-[#0284c7]/40"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          {isSatelliteVisible ? "Satellite Layer ON" : "Toggle Satellite Layer"}
        </button>
      </div>
    </div>
  );
}
