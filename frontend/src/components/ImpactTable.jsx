import React from 'react';
import { Building2 } from 'lucide-react';

export default function ImpactTable({ impactResult }) {
  const assets = impactResult?.assets || [
    { asset_id: 'v1', name: 'Cheruthoni Village (Pop: 14,200)', category: 'Village', total_count_or_length: '1 Village', affected_count_or_length: '1 Submerged', risk_level: 'High', max_depth_at_asset_m: 3.4, max_velocity_at_asset_ms: 2.8 },
    { asset_id: 'v2', name: 'Vazhathope Colony (Pop: 8,500)', category: 'Village', total_count_or_length: '1 Village', affected_count_or_length: '1 Submerged', risk_level: 'High', max_depth_at_asset_m: 2.8, max_velocity_at_asset_ms: 2.2 },
    { asset_id: 'r1', name: 'SH-40 Cheruthoni-Neriamangalam Highway', category: 'Road', total_count_or_length: '28.5 km', affected_count_or_length: '14.2 km', risk_level: 'High', max_depth_at_asset_m: 2.1, max_velocity_at_asset_ms: 1.9 },
    { asset_id: 'br1', name: 'Cheruthoni River Arch Bridge', category: 'Bridge', total_count_or_length: '120 m span', affected_count_or_length: '1 Bridge Submerged', risk_level: 'High', max_depth_at_asset_m: 4.8, max_velocity_at_asset_ms: 3.9 },
    { asset_id: 'ci1', name: 'Cheruthoni 220kV Substation', category: 'Critical Infrastructure', total_count_or_length: '1 Facility', affected_count_or_length: '1 Submerged', risk_level: 'High', max_depth_at_asset_m: 2.9, max_velocity_at_asset_ms: 2.1 },
    { asset_id: 'ci4', name: 'Chelachuvadu Emergency Shelter', category: 'Critical Infrastructure', total_count_or_length: '1 Facility', affected_count_or_length: '0 (Safe High Ground)', risk_level: 'Safe', max_depth_at_asset_m: 0.0, max_velocity_at_asset_ms: 0.0 }
  ];

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'High':
        return <span className="px-2.5 py-1 text-[10px] font-black bg-[#0284c7]/30 text-[#38bdf8] border border-[#38bdf8]/50 rounded-lg shadow-sm">HIGH RISK</span>;
      case 'Medium':
        return <span className="px-2.5 py-1 text-[10px] font-black bg-amber-950 text-amber-300 border border-amber-800 rounded-lg shadow-sm">MEDIUM RISK</span>;
      default:
        return <span className="px-2.5 py-1 text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-lg shadow-sm">SAFE</span>;
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-[#38bdf8]/30 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-[#38bdf8]/30 pb-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#38bdf8]" />
          <h2 className="text-base font-black text-slate-100">
            Downstream Infrastructure Vulnerability & Impact Matrix
          </h2>
        </div>
        <span className="text-xs text-[#7dd3fc] bg-[#0284c7]/30 border border-[#38bdf8]/40 px-3 py-1 rounded-lg font-extrabold">
          {impactResult?.affected_villages_count || 4} Villages Submerged
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#38bdf8]/30">
        <table className="w-full text-xs text-left text-slate-300">
          <thead style={{ background: 'var(--bg-input)', color: 'var(--fg-accent)' }} className="uppercase text-[10px] font-black tracking-wider">
            <tr>
              <th className="p-3">Asset Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Total Inventory</th>
              <th className="p-3">Affected Extent</th>
              <th className="p-3">Max Depth (m)</th>
              <th className="p-3">Max Velocity (m/s)</th>
              <th className="p-3">Risk Assessment</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ background: 'rgba(3,19,41,0.6)', borderColor: 'var(--border-default)' }}>
            {assets.map((item, idx) => (
              <tr key={idx} className="hover:bg-[#0284c7]/20 transition-colors">
                <td className="p-3 font-extrabold text-slate-100">{item.name}</td>
                <td className="p-3 text-slate-400 font-medium">{item.category}</td>
                <td className="p-3 font-medium">{item.total_count_or_length}</td>
                <td className="p-3 font-black text-[#38bdf8]">{item.affected_count_or_length}</td>
                <td className="p-3 font-bold">{item.max_depth_at_asset_m > 0 ? `${item.max_depth_at_asset_m} m` : '0 m'}</td>
                <td className="p-3 font-bold">{item.max_velocity_at_asset_ms > 0 ? `${item.max_velocity_at_asset_ms} m/s` : '0 m/s'}</td>
                <td className="p-3">{getRiskBadge(item.risk_level)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
