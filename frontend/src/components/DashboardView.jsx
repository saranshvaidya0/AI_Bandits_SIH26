import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Waves, Zap, Clock, Home, Route, MapPin, Sliders, Play, CheckCircle2,
  GitCompare, ShieldAlert, FileText, ChevronRight, Eye, Sparkles, Layers,
  Compass, ArrowUpRight, BarChart3, PieChart
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import gsap from 'gsap';

// Fix Leaflet Default Marker Icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const damIcon = L.divIcon({
  className: 'custom-dam-marker',
  html: `<div style="background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%); color:white; border:2px solid #7dd3fc; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-bold:bold; font-size:12px; box-shadow: 0 0 12px rgba(56,189,248,0.8);">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

export default function DashboardView({
  studyArea,
  simulationResult,
  onRunSimulation,
  isSimulating,
  onNavigateTab,
  onOpenReport,
  historyItems,
  onLoadSimulation
}) {
  const [mapTileType, setMapTileType] = useState('map'); // 'map' | 'satellite'
  const [activeThumb, setActiveThumb] = useState(2); // 0hr, 2hr, 4hr, 8hr, 12hr
  const dashboardRef = useRef(null);

  useEffect(() => {
    if (dashboardRef.current) {
      gsap.fromTo(
        dashboardRef.current.querySelectorAll('.animate-card'),
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: "power2.out" }
      );
    }
  }, [studyArea]);

  const center = studyArea?.dam?.location
    ? [studyArea.dam.location.lat, studyArea.dam.location.lon]
    : [18.5204, 73.8567];

  const riverPolyline = studyArea?.river_polyline || studyArea?.river?.polyline || [];
  const sph = simulationResult?.sph_result;
  const comp = simulationResult?.comparison;
  const impact = simulationResult?.impact;

  const areaVal = sph ? sph.total_flooded_area_km2 : 124.6;
  const depthVal = sph ? sph.max_water_depth_m : 4.8;
  const velVal = sph ? sph.max_velocity_ms : 3.2;
  const arrivalVal = sph ? sph.peak_inundation_time_hours : 2.4;
  const villagesVal = impact ? impact.affected_villages_count : 7;
  const totalVillagesVal = impact ? impact.total_villages_count : 20;
  const roadsVal = impact ? impact.affected_roads_km : 12;

  const tileUrl = mapTileType === 'satellite'
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const defaultHistory = [
    { id: '1', name: 'Koyna Dam', type: 'Medium', date: '16 Sep 2026', status: 'Completed' },
    { id: '2', name: 'Bhakra Dam', type: 'Large', date: '15 Sep 2026', status: 'Completed' },
    { id: '3', name: 'Tehri Dam', type: 'Small', date: '14 Sep 2026', status: 'Completed' },
    { id: '4', name: 'Sardar Sarovar', type: 'Medium', date: '12 Sep 2026', status: 'Completed' }
  ];

  const displayHistory = historyItems && historyItems.length > 0 ? historyItems.slice(0, 4) : defaultHistory;

  return (
    <div ref={dashboardRef} className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6" style={{ color: 'var(--fg-primary)' }}>
      {/* 1. Page Title Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#38bdf8]/20 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
              Dam Break Inundation Modelling
            </h1>
            <span className="px-2.5 py-1 text-[10px] font-black uppercase bg-[#0284c7]/30 border border-[#38bdf8]/40 text-[#7dd3fc] rounded-lg">
              Active Location: {studyArea?.name || 'Koyna Dam'}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Predict. Prepare. Protect. • Multi-hydrodynamic DualSPHysics & Delft3D Simulation
          </p>
        </div>

        {/* Decorative Watermark Tag */}
        <div className="hidden md:flex items-center gap-2 text-right">
          <span className="text-xs font-serif italic text-slate-400 opacity-80">Safer Tomorrow</span>
        </div>
      </div>

      {/* 2. Top Horizontal KPI Cards Row (6 Cards as shown in mock-up) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Flood Area', value: `${areaVal} km²`, trend: '↑ 12%', icon: AreaChart, color: 'text-[#38bdf8]' },
          { label: 'Max Depth', value: `${depthVal} m`, trend: '↑ 8%', icon: Waves, color: 'text-[#0ea5e9]' },
          { label: 'Max Velocity', value: `${velVal} m/s`, trend: '↑ 15%', icon: Zap, color: 'text-[#7dd3fc]' },
          { label: 'Arrival Time', value: `${arrivalVal} hrs`, trend: '↓ 5%', icon: Clock, color: 'text-cyan-300' },
          { label: 'Affected Villages', value: `${villagesVal} / ${totalVillagesVal}`, trend: '↑ 3', icon: Home, color: 'text-[#38bdf8]' },
          { label: 'Affected Roads', value: `${roadsVal} km`, trend: '↑ 4 km', icon: Route, color: 'text-emerald-400' }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="animate-card glass-card p-3.5 rounded-2xl border border-[#38bdf8]/20 glass-card-hover flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 ${kpi.color}`} />
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#0284c7]/20 border border-[#38bdf8]/30 text-[#7dd3fc]">
                  {kpi.trend}
                </span>
              </div>
              <div className="mt-3">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{kpi.label}</div>
                <div className={`text-lg font-black tracking-tight mt-0.5 ${kpi.color}`}>{kpi.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Middle Main Content Grid (Map 60% left, Scenario & History 40% right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Interactive GIS Map Container (7 cols on lg) */}
        <div className="animate-card lg:col-span-7 glass-panel rounded-2xl border border-[#38bdf8]/30 shadow-2xl relative overflow-hidden flex flex-col min-h-[420px]">
          {/* Map Top Header Controls */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 backdrop-blur-md p-1 rounded-xl shadow-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-accent)' }}>
            <button
              onClick={() => setMapTileType('map')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                mapTileType === 'map' ? 'btn-blue-gradient text-white' : 'text-slate-300 hover:bg-[#0284c7]/30'
              }`}
            >
              Map
            </button>
            <button
              onClick={() => setMapTileType('satellite')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                mapTileType === 'satellite' ? 'btn-blue-gradient text-white' : 'text-slate-300 hover:bg-[#0284c7]/30'
              }`}
            >
              Satellite
            </button>
          </div>

          {/* Map Depth Legend Box */}
          <div className="absolute top-3 right-3 z-20 backdrop-blur-md p-2.5 rounded-xl shadow-lg text-[11px] font-bold space-y-1" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-accent)' }}>
            <div className="text-[10px] uppercase text-[#38bdf8] font-black tracking-wider mb-1">
              Flood Depth (m)
            </div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#0c4a6e]" /> &gt; 5</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" /> 2 - 5</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9]" /> 1 - 2</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" /> 0.5 - 1</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#bae6fd]" /> 0 - 0.5</div>
          </div>

          {/* Leaflet Map Canvas */}
          <MapContainer
            center={center}
            zoom={12}
            className="w-full h-full min-h-[420px] flex-1 z-10"
            zoomControl={true}
          >
            <TileLayer url={tileUrl} maxZoom={19} />
            {riverPolyline.length > 0 && (
              <Polyline positions={riverPolyline} pathOptions={{ color: '#38bdf8', weight: 4, opacity: 0.85 }} />
            )}
            {studyArea?.dam && (
              <Marker position={[studyArea.dam.location.lat, studyArea.dam.location.lon]} icon={damIcon}>
                <Popup>
                  <div className="p-1 text-xs">
                    <strong className="text-[#38bdf8]">{studyArea.dam.name}</strong>
                    <br />River: {studyArea.dam.river_name}
                  </div>
                </Popup>
              </Marker>
            )}
            {sph?.time_frames?.[0]?.flood_polygon_geojson && (
              <GeoJSON
                data={sph.time_frames[0].flood_polygon_geojson}
                style={{ fillColor: '#0284c7', fillOpacity: 0.6, color: '#38bdf8', weight: 2 }}
              />
            )}
          </MapContainer>
        </div>

        {/* Right Column: Scenario & History (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Current Scenario Card */}
          <div className="animate-card glass-panel rounded-2xl p-5 border border-[#38bdf8]/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#38bdf8]/20 pb-2.5">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#38bdf8]" />
                Current Scenario
              </h3>
              <button onClick={() => onNavigateTab('scenario')} className="text-xs text-[#38bdf8] font-bold hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3.5 glass-card rounded-xl border border-[#38bdf8]/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-white">
                  Medium Breach - {studyArea?.dam?.name || 'Koyna Dam'}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-md">
                  Completed
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1 border-t border-[#38bdf8]/10">
                <div><span className="text-slate-400">Breach Width:</span> <strong className="text-slate-100">40 m</strong></div>
                <div><span className="text-slate-400">Breach Height:</span> <strong className="text-slate-100">25 m</strong></div>
                <div><span className="text-slate-400">Simulation Duration:</span> <strong className="text-slate-100">12 hrs</strong></div>
                <div><span className="text-slate-400">Created On:</span> <strong className="text-slate-100">16 Sep 2026</strong></div>
              </div>
            </div>

            <button
              onClick={onRunSimulation}
              disabled={isSimulating}
              className="w-full py-2.5 btn-blue-gradient rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg"
            >
              {isSimulating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Simulating...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Run New Simulation
                </>
              )}
            </button>
          </div>

          {/* Recent Simulations Log Card */}
          <div className="animate-card glass-panel rounded-2xl p-5 border border-[#38bdf8]/30 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#38bdf8]/20 pb-2.5">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#38bdf8]" />
                Recent Simulations
              </h3>
              <button onClick={() => onNavigateTab('history')} className="text-xs text-[#38bdf8] font-bold hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {displayHistory.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onLoadSimulation && onLoadSimulation(item.simulation_id || item.id)}
                  className="p-2.5 glass-card rounded-xl border border-[#38bdf8]/15 hover:border-[#38bdf8]/40 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
                    <span className="font-extrabold text-slate-100">{item.dam_name || item.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{item.scenario_preset || item.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">{item.created_at || item.date}</span>
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800 rounded">
                      Completed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Row Analytics Grid (4 cards in a row as shown in mock-up) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Flood Progression Thumbnails */}
        <div className="animate-card glass-panel rounded-2xl p-4 border border-[#38bdf8]/30 shadow-2xl space-y-3">
          <h3 className="text-xs font-black text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Flood Progression
          </h3>
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span>03:20 / 12:00 hrs</span>
            <span className="text-[#38bdf8]">Step 3/5</span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {['0 hr', '2 hr', '4 hr', '8 hr', '12 hr'].map((th, i) => (
              <button
                key={i}
                onClick={() => setActiveThumb(i)}
                className={`p-1 rounded-lg border text-center transition-all ${
                  activeThumb === i
                    ? 'border-[#38bdf8] bg-[#0284c7]/30 text-white font-bold'
                    : 'border-[#38bdf8]/20 bg-[#061a38] text-slate-400 hover:text-white'
                }`}
              >
                <div className="h-8 bg-[#0284c7]/20 rounded flex items-center justify-center text-[9px] font-mono">
                  🗺️
                </div>
                <div className="text-[9px] mt-1">{th}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Card 2: Model Comparison Mini Chart */}
        <div className="animate-card glass-panel rounded-2xl p-4 border border-[#38bdf8]/30 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Model Comparison
            </h3>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0284c7]" /> SPH</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#38bdf8]" /> Delft3D</span>
            </div>
          </div>

          {/* Mini Bar Comparison Representation */}
          <div className="space-y-2 pt-1 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-300"><span>Flood Area (km²)</span> <span>18.5 vs 20.8</span></div>
              <div className="h-2 bg-[#061a38] rounded-full overflow-hidden flex">
                <div className="bg-[#0284c7] h-full" style={{ width: '47%' }} />
                <div className="bg-[#38bdf8] h-full" style={{ width: '53%' }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-300"><span>Max Depth (m)</span> <span>4.8 vs 4.5</span></div>
              <div className="h-2 bg-[#061a38] rounded-full overflow-hidden flex">
                <div className="bg-[#0284c7] h-full" style={{ width: '52%' }} />
                <div className="bg-[#38bdf8] h-full" style={{ width: '48%' }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-300"><span>Max Velocity (m/s)</span> <span>3.2 vs 3.0</span></div>
              <div className="h-2 bg-[#061a38] rounded-full overflow-hidden flex">
                <div className="bg-[#0284c7] h-full" style={{ width: '51%' }} />
                <div className="bg-[#38bdf8] h-full" style={{ width: '49%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Impact Assessment Donut & Breakdown */}
        <div className="animate-card glass-panel rounded-2xl p-4 border border-[#38bdf8]/30 shadow-2xl space-y-3">
          <h3 className="text-xs font-black text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5" />
            Impact Assessment
          </h3>
          <div className="flex items-center gap-3">
            {/* Donut Badge */}
            <div className="w-16 h-16 rounded-full border-4 border-[#38bdf8] flex items-center justify-center text-center bg-[#0284c7]/20 shrink-0">
              <div>
                <div className="text-sm font-black text-[#38bdf8]">32%</div>
                <div className="text-[8px] text-slate-400 leading-tight">Affected</div>
              </div>
            </div>

            {/* List Stats */}
            <div className="space-y-1 text-[11px] font-bold text-slate-300 flex-1">
              <div className="flex justify-between"><span>Villages</span> <span className="text-[#38bdf8]">7 / 20</span></div>
              <div className="flex justify-between"><span>Buildings</span> <span className="text-slate-200">820 / 5000</span></div>
              <div className="flex justify-between"><span>Roads</span> <span className="text-slate-200">12 / 45 km</span></div>
              <div className="flex justify-between"><span>Bridges</span> <span className="text-slate-200">2 / 8</span></div>
            </div>
          </div>
        </div>

        {/* Card 4: Quick Actions */}
        <div className="animate-card glass-panel rounded-2xl p-4 border border-[#38bdf8]/30 shadow-2xl space-y-2.5">
          <h3 className="text-xs font-black text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Quick Actions
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => onNavigateTab('validation')}
              className="w-full py-2 px-3 bg-[#061a38] hover:bg-[#0284c7]/30 border border-[#38bdf8]/30 rounded-xl text-xs font-extrabold text-slate-200 hover:text-white flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#38bdf8]" /> Validate with Satellite</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => onNavigateTab('sensitivity')}
              className="w-full py-2 px-3 bg-[#061a38] hover:bg-[#0284c7]/30 border border-[#38bdf8]/30 rounded-xl text-xs font-extrabold text-slate-200 hover:text-white flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5 text-[#38bdf8]" /> Run Sensitivity Analysis</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={onOpenReport}
              className="w-full py-2 px-3 bg-[#0284c7] hover:bg-[#0369a1] text-white border border-[#38bdf8]/40 rounded-xl text-xs font-extrabold flex items-center justify-between shadow-md transition-colors"
            >
              <span className="flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> Generate Report</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Footer Technology Stack & Key Features (Matching bottom banner in mockup) */}
      <div className="animate-card glass-panel rounded-2xl p-6 border border-[#38bdf8]/30 shadow-2xl grid grid-cols-1 md:grid-cols-3 gap-6 text-xs mt-4">
        {/* Col 1: Key Features Checklist */}
        <div className="space-y-2">
          <h4 className="font-extrabold uppercase text-[#38bdf8] text-xs tracking-wider">
            Design & Key Features
          </h4>
          <ul className="space-y-1.5 text-slate-300 font-medium">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Multi-location dam support (Idukki, Tehri, Hirakud, Bhakra, Custom)</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Dual-hydrodynamic simulations (DualSPHysics SPH + Delft3D SWE)</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Observed Sentinel-1 satellite remote sensing validation</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Downstream asset vulnerability & high-ground evacuation intelligence</li>
          </ul>
        </div>

        {/* Col 2: Technology Stack Badge Grid */}
        <div className="space-y-2">
          <h4 className="font-extrabold uppercase text-[#38bdf8] text-xs tracking-wider">
            Technology Stack
          </h4>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
            <div className="p-2 bg-[#061a38] border border-[#38bdf8]/20 rounded-lg flex items-center gap-2 text-slate-200">
              <span className="text-[#38bdf8]">⚛️</span> React 18 & Vite
            </div>
            <div className="p-2 bg-[#061a38] border border-[#38bdf8]/20 rounded-lg flex items-center gap-2 text-slate-200">
              <span className="text-emerald-400">⚡</span> FastAPI Python
            </div>
            <div className="p-2 bg-[#061a38] border border-[#38bdf8]/20 rounded-lg flex items-center gap-2 text-slate-200">
              <span className="text-[#0284c7]">🌊</span> DualSPHysics 5.0
            </div>
            <div className="p-2 bg-[#061a38] border border-[#38bdf8]/20 rounded-lg flex items-center gap-2 text-slate-200">
              <span className="text-cyan-300">🗺️</span> Leaflet & OpenStreetMap
            </div>
          </div>
        </div>

        {/* Col 3: Our Mission Statement */}
        <div className="space-y-2">
          <h4 className="font-extrabold uppercase text-[#38bdf8] text-xs tracking-wider">
            Our Mission
          </h4>
          <blockquote className="p-3 bg-[#061a38]/80 border-l-2 border-[#38bdf8] rounded-r-xl italic text-slate-300 text-[11px] leading-relaxed">
            "From data to safer communities through scientific modelling and geospatial intelligence."
          </blockquote>
          <div className="text-[10px] text-slate-400 text-right font-bold pt-1">
            Built for a Safer Tomorrow • SIH 2026 PS 26161
          </div>
        </div>
      </div>
    </div>
  );
}
