import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { LineChart as ChartIcon, AlertCircle } from 'lucide-react';
import { runSensitivityAnalysis } from '../services/api';
import gsap from 'gsap';

export default function SensitivityChart({ scenarioConfig, isDark = true }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current, { scale: 0.96, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "power2.out" });
    }
  }, []);

  useEffect(() => {
    async function loadSensitivity() {
      setLoading(true);
      const res = await runSensitivityAnalysis(scenarioConfig);
      if (res) setData(res);
      setLoading(false);
    }
    loadSensitivity();
  }, [scenarioConfig]);

  const chartData = data?.scenarios.map(s => ({
    width: `${s.breach_width_m}m`,
    q_peak: s.peak_discharge_m3s,
    area: s.flood_area_km2,
    depth: s.max_depth_m,
    villages: s.affected_villages
  })) || [
    { width: '20m', q_peak: 7800, area: 11.2, depth: 4.2, villages: 2 },
    { width: '40m', q_peak: 14200, area: 18.5, depth: 5.8, villages: 4 },
    { width: '60m', q_peak: 21500, area: 24.8, depth: 6.9, villages: 6 },
    { width: '80m', q_peak: 28400, area: 30.2, depth: 7.6, villages: 7 }
  ];

  // Theme-aware chart colors
  const chartAxisStroke   = isDark ? '#f8fafc' : '#455A64';
  const chartGridStroke   = isDark ? '#0284c7' : '#90A4AE';
  const chartAccentLine1  = isDark ? '#38bdf8' : '#0284c7';
  const chartAccentLine2  = isDark ? '#00e5ff' : '#0369a1';
  const tooltipBg         = isDark ? '#031329' : '#ECEFF1';
  const tooltipBorder     = isDark ? '#38bdf8' : '#0284c7';
  const tooltipTextColor  = isDark ? '#f8fafc' : '#263238';

  return (
    <div ref={containerRef} className="glass-panel rounded-2xl p-6 border border-[#38bdf8]/30 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-[#38bdf8]/30 pb-3">
        <div className="flex items-center gap-2">
          <ChartIcon className="w-5 h-5 text-[#38bdf8]" />
          <h2 className="text-base font-black text-slate-100">
            Uncertainty & Hydrodynamic Sensitivity Analysis
          </h2>
        </div>
        <span className="text-xs text-[#7dd3fc] bg-[#0284c7]/30 border border-[#38bdf8]/40 px-3 py-1 rounded-lg font-bold">
          Varied Parameter: Breach Width (20m - 80m)
        </span>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-xs text-slate-400">
          Running multi-scenario batch simulation...
        </div>
      ) : (
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} strokeOpacity={0.35} />
              <XAxis dataKey="width" stroke={chartAxisStroke} tick={{ fill: chartAxisStroke, fontSize: 11 }} />
              <YAxis yAxisId="left" stroke={chartAccentLine1} tick={{ fill: chartAccentLine1, fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" stroke={chartAccentLine2} tick={{ fill: chartAccentLine2, fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '10px', fontSize: '12px', color: tooltipTextColor }} />
              <Legend wrapperStyle={{ fontSize: '12px', color: chartAxisStroke }} />
              <Line yAxisId="left" type="monotone" dataKey="q_peak" name="Peak Flow Q_peak (m³/s)" stroke={chartAccentLine1} strokeWidth={3} dot={{ r: 6, fill: chartAccentLine1 }} />
              <Line yAxisId="right" type="monotone" dataKey="area" name="Flood Inundation Area (km²)" stroke={chartAccentLine2} strokeWidth={3} dot={{ r: 6, fill: chartAccentLine2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="p-3 bg-[#061a38] border border-[#38bdf8]/30 rounded-xl text-xs text-slate-200 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-[#38bdf8] shrink-0 mt-0.5" />
        <p className="leading-relaxed font-medium">
          {data?.explanation || "Sensitivity analysis illustrates that doubling breach width from 20m to 40m increases peak discharge by ~82%, significantly broadening downstream village inundation risk."}
        </p>
      </div>
    </div>
  );
}
