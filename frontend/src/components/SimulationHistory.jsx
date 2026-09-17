import React, { useState, useEffect } from 'react';
import { History, Eye } from 'lucide-react';
import { fetchSimulationHistory } from '../services/api';

export default function SimulationHistory({ studyAreaId, onLoadSimulation }) {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      const res = await fetchSimulationHistory(studyAreaId);
      setHistoryItems(res);
      setLoading(false);
    }
    loadHistory();
  }, [studyAreaId]);

  return (
    <div className="glass-panel rounded-2xl p-6 border border-[#38bdf8]/30 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-[#38bdf8]/30 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#38bdf8]" />
          <h2 className="text-base font-black text-slate-100">
            Recent Hydrodynamic Simulations
          </h2>
        </div>
        <span className="text-xs text-[#7dd3fc] bg-[#0284c7]/30 border border-[#38bdf8]/40 px-3 py-1 rounded-lg font-extrabold">
          {historyItems.length} Runs Logged
        </span>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400">Loading simulation history...</div>
      ) : historyItems.length === 0 ? (
        <div className="py-8 text-center text-xs font-medium rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-accent)', color: 'var(--fg-muted)' }}>
          No previous simulations recorded for this location yet. Click "Run Simulation" to execute a scenario.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#38bdf8]/30">
          <table className="w-full text-xs text-left text-slate-300">
            <thead style={{ background: 'var(--bg-input)', color: 'var(--fg-accent)' }} className="uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="p-3">Simulation ID</th>
                <th className="p-3">Dam Facility</th>
                <th className="p-3">Scenario Preset</th>
                <th className="p-3">Breach Width</th>
                <th className="p-3">Peak Discharge</th>
                <th className="p-3">Flood Area</th>
                <th className="p-3">Spatial IoU</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ background: 'rgba(3,19,41,0.6)' }}>
              {historyItems.map((item) => (
                <tr key={item.simulation_id} className="hover:bg-[#0284c7]/20 transition-colors">
                  <td className="p-3 font-mono text-[#38bdf8] font-bold">{item.simulation_id}</td>
                  <td className="p-3 font-extrabold text-slate-100">{item.dam_name}</td>
                  <td className="p-3 font-medium">{item.scenario_preset}</td>
                  <td className="p-3 font-bold">{item.breach_width_m} m</td>
                  <td className="p-3 font-bold text-[#38bdf8]">{item.peak_flow_m3s.toLocaleString()} m³/s</td>
                  <td className="p-3 font-bold text-[#7dd3fc]">{item.flooded_area_km2} km²</td>
                  <td className="p-3 font-bold text-cyan-300">{(item.iou_score * 100).toFixed(1)}%</td>
                  <td className="p-3 text-slate-400 font-medium">{item.created_at}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onLoadSimulation(item.simulation_id)}
                      className="px-3 py-1 btn-secondary-blue rounded-lg font-bold text-[11px] flex items-center gap-1 ml-auto shadow-sm transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Results
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
