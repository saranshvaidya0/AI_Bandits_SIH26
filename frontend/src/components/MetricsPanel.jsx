import React, { useEffect, useRef } from 'react';
import { AreaChart, Waves, Zap, Clock, Home, Route } from 'lucide-react';
import gsap from 'gsap';

export default function MetricsPanel({ simulationResult }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (panelRef.current) {
      gsap.fromTo(
        panelRef.current.querySelectorAll('.kpi-card'),
        { y: 25, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.08, ease: "back.out(1.2)" }
      );
    }
  }, [simulationResult]);

  const sph = simulationResult?.sph_result;
  const comp = simulationResult?.comparison;
  const impact = simulationResult?.impact;

  const area = sph ? sph.total_flooded_area_km2 : 124.6;
  const depth = sph ? sph.max_water_depth_m : 4.8;
  const vel = sph ? sph.max_velocity_ms : 3.2;
  const arrival = sph ? sph.peak_inundation_time_hours : 2.4;
  const villages = impact ? impact.affected_villages_count : 7;
  const totalVillages = impact ? impact.total_villages_count : 20;
  const roads = impact ? impact.affected_roads_km : 12;

  const kpis = [
    {
      label: 'FLOOD AREA',
      value: `${area} km²`,
      subtext: `Delft3D: ${comp ? comp.delft3d_area_km2 : 20.8} km²`,
      trend: '↑ 12%',
      icon: AreaChart,
      color: 'text-[#38bdf8]',
      border: 'border-[#38bdf8]/30'
    },
    {
      label: 'MAX DEPTH',
      value: `${depth} m`,
      subtext: 'High Risk (>2.0m)',
      trend: '↑ 8%',
      icon: Waves,
      color: 'text-[#0ea5e9]',
      border: 'border-[#0ea5e9]/30'
    },
    {
      label: 'MAX VELOCITY',
      value: `${vel} m/s`,
      subtext: 'Peak Wave Velocity',
      trend: '↑ 15%',
      icon: Zap,
      color: 'text-[#7dd3fc]',
      border: 'border-[#7dd3fc]/30'
    },
    {
      label: 'ARRIVAL TIME',
      value: `${arrival} hrs`,
      subtext: 'First Wave Inundation',
      trend: '↓ 5%',
      icon: Clock,
      color: 'text-cyan-300',
      border: 'border-cyan-400/30'
    },
    {
      label: 'AFFECTED VILLAGES',
      value: `${villages} / ${totalVillages}`,
      subtext: 'Submerged Settlements',
      trend: '↑ 3',
      icon: Home,
      color: 'text-[#38bdf8]',
      border: 'border-[#38bdf8]/30'
    },
    {
      label: 'AFFECTED ROADS',
      value: `${roads} km`,
      subtext: `Total: ${impact ? impact.total_roads_km : 45} km`,
      trend: '↑ 4 km',
      icon: Route,
      color: 'text-emerald-400',
      border: 'border-emerald-500/30'
    }
  ];

  return (
    <aside ref={panelRef} className="w-72 backdrop-blur-2xl p-4 flex flex-col gap-3 shrink-0 z-20 overflow-y-auto"
      style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-default)' }}>
      <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid var(--border-accent)' }}>
        <h2 className="text-xs font-black uppercase tracking-wider text-[#38bdf8]">
          Hydrodynamic Metrics
        </h2>
        <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-ping" />
      </div>

      <div className="space-y-2.5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`kpi-card glass-card p-3 rounded-2xl border ${kpi.border} glass-card-hover relative overflow-hidden`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold tracking-wider text-slate-400">{kpi.label}</span>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>

              <div className="flex items-baseline justify-between mt-1.5">
                <div className={`text-xl font-black tracking-tight ${kpi.color}`}>
                  {kpi.value}
                </div>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#0284c7]/20 border border-[#38bdf8]/30 text-[#7dd3fc]">
                  {kpi.trend}
                </span>
              </div>

              <p className="text-[10px] text-slate-400 font-medium mt-1">{kpi.subtext}</p>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
