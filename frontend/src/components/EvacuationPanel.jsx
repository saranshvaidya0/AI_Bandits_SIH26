import React from 'react';
import { Compass, ShieldCheck, AlertOctagon, CheckCircle, Navigation } from 'lucide-react';

export default function EvacuationPanel({ evacuationData }) {
  const evac = evacuationData || {
    safe_zones: [
      { id: "sz1", name: "High-Ground Emergency Shelter Base", elevation_m: 680.0, capacity_persons: 5000, amenities: ["Medical Post", "Water Supply", "Power Backup"] },
      { id: "sz2", name: "District High School Relief Ground", elevation_m: 665.0, capacity_persons: 3500, amenities: ["Tents", "Communication Tower"] }
    ],
    evacuation_routes: [
      { route_id: "er1", name: "High-Ground Bypass Corridor (Route Alpha)", status: "Clear & Safe", distance_km: 14.0, dest_safe_zone_name: "High-Ground Shelter" },
      { route_id: "er2", name: "River Valley Road (Route Bravo)", status: "High Risk / Submerged", distance_km: 28.5, dest_safe_zone_name: "Neriamangalam Relief Base" }
    ],
    recommended_action: "IMMEDIATE EVACUATION NOTICE: Issue Red Alert for downstream settlements. Direct evacuees strictly via High-Ground Bypass Corridor (Route Alpha) towards the High-Ground Emergency Shelter.",
    disclaimer: "Results are model-based estimates and should be verified by authorized disaster-management authorities."
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-[#38bdf8]/30 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-[#38bdf8]/30 pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-[#38bdf8]" />
          <h2 className="text-base font-black text-slate-100">
            Evacuation Decision Support & High-Ground Routing
          </h2>
        </div>
        <span className="text-xs text-[#38bdf8] bg-[#0284c7]/30 border border-[#38bdf8]/40 px-3 py-1 rounded-lg font-black">
          Evacuation Intelligence
        </span>
      </div>

      <div className="p-4 rounded-xl flex items-start gap-3 shadow-inner" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-accent)' }}>
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider">Recommended Emergency Directive</h3>
          <p className="text-xs text-slate-200 mt-1 font-medium leading-relaxed">{evac.recommended_action}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* High-Ground Safe Shelters */}
        <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(3,19,41,0.90)', border: '1px solid var(--border-accent)' }}>
          <h3 className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <CheckCircle className="w-4 h-4 text-[#38bdf8]" />
            High-Ground Safe Refuge Shelters
          </h3>
          <div className="space-y-2">
            {evac.safe_zones.map((sz, i) => (
              <div key={i} className="p-3 glass-card border border-[#38bdf8]/20 rounded-xl text-xs space-y-1">
                <div className="font-extrabold text-[#38bdf8]">{sz.name}</div>
                <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>Elevation: {sz.elevation_m}m MSL</span>
                  <span>Capacity: {sz.capacity_persons} persons</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Evacuation Corridors */}
        <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(3,19,41,0.90)', border: '1px solid var(--border-accent)' }}>
          <h3 className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Navigation className="w-4 h-4 text-[#38bdf8]" />
            Evacuation Corridor Status
          </h3>
          <div className="space-y-2">
            {evac.evacuation_routes.map((r, i) => {
              const isSafe = r.status.includes('Clear');
              return (
                <div key={i} className={`p-3 border rounded-xl text-xs space-y-1 ${isSafe ? 'bg-emerald-950/40 border-emerald-800' : 'bg-[#0284c7]/20 border-[#38bdf8]/40'}`}>
                  <div className="flex items-center justify-between font-extrabold">
                    <span className={isSafe ? 'text-emerald-300' : 'text-[#38bdf8]'}>{r.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black ${isSafe ? 'bg-emerald-900 text-emerald-200' : 'bg-[#0284c7] text-white'}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">Length: {r.distance_km} km • Dest: {r.dest_safe_zone_name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl flex items-center gap-2.5 text-xs" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-accent)', color: 'var(--fg-accent-dim)' }}>
        <AlertOctagon className="w-4 h-4 text-[#38bdf8] shrink-0" />
        <p className="text-[11px] leading-tight font-medium">
          <strong>DISCLAIMER:</strong> {evac.disclaimer}
        </p>
      </div>
    </div>
  );
}
