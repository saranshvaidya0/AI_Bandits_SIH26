import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import LayerControlPanel from './components/LayerControlPanel';
import MetricsPanel from './components/MetricsPanel';
import TimelineSlider from './components/TimelineSlider';
import ScenarioForm from './components/ScenarioForm';
import ComparisonDashboard from './components/ComparisonDashboard';
import SensitivityChart from './components/SensitivityChart';
import SatelliteValidation from './components/SatelliteValidation';
import ImpactTable from './components/ImpactTable';
import EvacuationPanel from './components/EvacuationPanel';
import SimulationHistory from './components/SimulationHistory';
import NewStudyAreaModal from './components/NewStudyAreaModal';
import ReportModal from './components/ReportModal';
import DashboardView from './components/DashboardView';

import {
  fetchStudyAreas, fetchStudyArea, runHydroSimulation, fetchSimulationHistory
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [studyAreas, setStudyAreas] = useState([]);
  const [selectedStudyAreaId, setSelectedStudyAreaId] = useState('idukki');
  const [studyArea, setStudyArea] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [isNewAreaModalOpen, setIsNewAreaModalOpen] = useState(false);
  // ── THEME STATE ───────────────────────────────────────────────────────────
  // isDark: true = Dark Mode (default), false = Light Mode
  // Initialized from localStorage to avoid flash on page reload
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('fg-theme');
    return saved ? saved === 'dark' : true; // default: dark
  });

  const handleToggleTheme = () => setIsDark(prev => !prev);

  // Sync theme to <html data-theme="..."> and persist to localStorage
  useEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fg-theme', theme);
  }, [isDark]);

  // Scenario Config State (Dynamically linked to studyAreaId)
  const [scenarioConfig, setScenarioConfig] = useState({
    study_area_id: 'idukki',
    breach: {
      breach_width: 40.0,
      breach_height: 30.0,
      breach_formation_time: 30.0,
      preset_name: 'Medium Breach'
    },
    reservoir_level: 700.5,
    initial_water_volume: 1996.0,
    simulation_duration_hours: 24.0,
    time_step_seconds: 1.0,
    engine_type: 'Both'
  });

  // Simulation Results & Progress State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgressStep, setSimProgressStep] = useState('');
  const [simulationResult, setSimulationResult] = useState(null);
  const [activeTimeHour, setActiveTimeHour] = useState(1.0);
  const [comparisonMode, setComparisonMode] = useState('both');
  const [isReportOpen, setIsReportOpen] = useState(false);

  // GIS Layer Visibility State
  const [visibleLayers, setVisibleLayers] = useState({
    terrain: true,
    river: true,
    sph_flood: true,
    delft3d_flood: true,
    overlap: false,
    difference: false,
    satellite: false,
    villages: true,
    evacuation: true
  });

  // 1. Initial Load of Study Areas Catalog & Default Idukki Location
  useEffect(() => {
    async function init() {
      const areas = await fetchStudyAreas();
      setStudyAreas(areas);
      const sa = await fetchStudyArea('idukki');
      if (sa) {
        setStudyArea(sa);
        setScenarioConfig(prev => ({
          ...prev,
          study_area_id: sa.id,
          reservoir_level: sa.dam.reservoir_level,
          initial_water_volume: sa.dam.initial_water_volume
        }));
      }
      const hist = await fetchSimulationHistory('idukki');
      if (hist) setHistoryItems(hist);
    }
    init();
  }, []);

  // Location Selector Switcher — STRICT SPATIAL ISOLATION
  const handleSelectStudyArea = async (areaId) => {
    setSelectedStudyAreaId(areaId);
    setSimulationResult(null); // Clear previous location's simulation results completely
    
    const sa = await fetchStudyArea(areaId);
    if (sa) {
      setStudyArea(sa);
      setScenarioConfig(prev => ({
        ...prev,
        study_area_id: sa.id,
        reservoir_level: sa.dam.reservoir_level,
        initial_water_volume: sa.dam.initial_water_volume
      }));
    }
    const hist = await fetchSimulationHistory(areaId);
    if (hist) setHistoryItems(hist);
  };

  // Preset Selection Handler
  const handleSelectPreset = (presetName) => {
    let w = 40.0, h = 30.0, t = 30.0;
    if (presetName === 'Small Breach') { w = 20.0; h = 15.0; t = 45.0; }
    if (presetName === 'Large Breach') { w = 75.0; h = 45.0; t = 15.0; }

    setScenarioConfig(prev => ({
      ...prev,
      breach: { breach_width: w, breach_height: h, breach_formation_time: t, preset_name: presetName }
    }));
  };

  // Run Simulation Handler with Progress Workflow Animation
  const handleRunSimulation = async () => {
    setIsSimulating(true);

    const progressSteps = [
      `Loading DEM & River Geometry for ${studyArea?.name || 'Selected Dam'}...`,
      "Calculating Breach Discharge Hydrograph (Q_peak)...",
      "Running DualSPHysics SPH Particle Solver...",
      "Running Delft3D Shallow Water Flow Engine...",
      "Processing Spatial Overlap & IoU Metric...",
      "Intersecting Vulnerable Infrastructure Assets...",
      "Generating Evacuation Intelligence..."
    ];

    for (let step of progressSteps) {
      setSimProgressStep(step);
      await new Promise(r => setTimeout(r, 350));
    }

    try {
      const res = await runHydroSimulation(scenarioConfig);
      setSimulationResult(res);
      const hist = await fetchSimulationHistory(selectedStudyAreaId);
      if (hist) setHistoryItems(hist);
      setActiveTab('comparison');
    } catch (err) {
      console.error("Simulation run error:", err);
    } finally {
      setIsSimulating(false);
      setSimProgressStep('');
    }
  };

  // Custom Study Area Created Handler
  const handleCustomStudyAreaCreated = (newArea) => {
    setStudyAreas(prev => [newArea, ...prev]);
    handleSelectStudyArea(newArea.id);
  };

  const handleLoadSimulation = async (simId) => {
    try {
      const r = await fetch(`/api/simulations/${simId}/results`);
      const res = await r.json();
      if (res) {
        setSimulationResult(res);
        setActiveTab('comparison');
      }
    } catch (e) {
      console.error("Error loading past simulation:", e);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)', backgroundImage: 'var(--body-gradient)' }}>
      {/* Top Navbar Header with Location Selector */}
      <Header
        studyAreas={studyAreas}
        selectedStudyAreaId={selectedStudyAreaId}
        onSelectStudyArea={handleSelectStudyArea}
        onOpenNewAreaModal={() => setIsNewAreaModalOpen(true)}
        onSelectPreset={handleSelectPreset}
        onRunSimulation={handleRunSimulation}
        isSimulating={isSimulating}
        onOpenReport={() => setIsReportOpen(true)}
        hasSimulationResult={!!simulationResult}
        onToggleTheme={handleToggleTheme}
        isDark={isDark}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          hasSimulationResult={!!simulationResult}
        />

        {/* Dashboard View OR Interactive GIS Map View */}
        {activeTab === 'dashboard' ? (
          <DashboardView
            studyArea={studyArea}
            simulationResult={simulationResult}
            onRunSimulation={handleRunSimulation}
            isSimulating={isSimulating}
            onNavigateTab={setActiveTab}
            onOpenReport={() => setIsReportOpen(true)}
            historyItems={historyItems}
            onLoadSimulation={handleLoadSimulation}
          />
        ) : (
          <div className="flex-1 flex overflow-hidden relative">
            {/* Center GIS Map View + Overlay Panels */}
            <main className="flex-1 relative flex flex-col" style={{ background: 'var(--bg-base)' }}>
              {/* Main Leaflet Map Component */}
              <MapView
                studyArea={studyArea}
                simulationResult={simulationResult}
                activeTimeHour={activeTimeHour}
                visibleLayers={visibleLayers}
                comparisonMode={comparisonMode}
              />

              {/* Map Floating Controls & Legend */}
              <LayerControlPanel
                visibleLayers={visibleLayers}
                setVisibleLayers={setVisibleLayers}
              />

              {/* Timeline Playback Slider */}
              {simulationResult && (
                <TimelineSlider
                  activeTimeHour={activeTimeHour}
                  setActiveTimeHour={setActiveTimeHour}
                />
              )}

              {/* Tab Modal / Overlay Panels */}
              {activeTab !== 'study_area' && activeTab !== 'data_catalog' && (
                <div className="absolute inset-4 z-30 overflow-y-auto pointer-events-none">
                  <div className="pointer-events-auto max-w-4xl mx-auto">
                    {activeTab === 'scenario' && (
                      <ScenarioForm
                        scenarioConfig={scenarioConfig}
                        setScenarioConfig={setScenarioConfig}
                        onSelectPreset={handleSelectPreset}
                        onRunSimulation={handleRunSimulation}
                        isSimulating={isSimulating}
                      />
                    )}

                    {activeTab === 'simulation' && isSimulating && (
                      <div className="glass-panel rounded-2xl p-8 shadow-2xl text-center space-y-4">
                        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--fg-accent)', borderTopColor: 'transparent' }} />
                        <h3 className="text-base font-bold" style={{ color: 'var(--fg-accent)' }}>Hydrodynamic Simulation Pipeline Active</h3>
                        <p className="text-xs" style={{ color: 'var(--fg-secondary)' }}>{simProgressStep}</p>
                      </div>
                    )}

                    {activeTab === 'history' && (
                      <SimulationHistory
                        studyAreaId={selectedStudyAreaId}
                        onLoadSimulation={handleLoadSimulation}
                      />
                    )}

                    {activeTab === 'comparison' && (
                      <ComparisonDashboard
                        simulationResult={simulationResult}
                        setComparisonMode={setComparisonMode}
                        comparisonMode={comparisonMode}
                      />
                    )}

                    {activeTab === 'sensitivity' && (
                      <SensitivityChart scenarioConfig={scenarioConfig} isDark={isDark} />
                    )}

                    {activeTab === 'validation' && (
                      <SatelliteValidation
                        validationResult={simulationResult?.validation}
                        onToggleSatelliteLayer={() => setVisibleLayers(p => ({ ...p, satellite: !p.satellite }))}
                        isSatelliteVisible={visibleLayers.satellite}
                      />
                    )}

                    {activeTab === 'impact' && (
                      <ImpactTable impactResult={simulationResult?.impact} />
                    )}

                    {activeTab === 'evacuation' && (
                      <EvacuationPanel evacuationData={simulationResult?.evacuation} />
                    )}
                  </div>
                </div>
              )}
            </main>

            {/* Right KPI Metrics Side Panel */}
            <MetricsPanel simulationResult={simulationResult} />
          </div>
        )}
      </div>

      {/* New Study Area Upload Modal */}
      <NewStudyAreaModal
        isOpen={isNewAreaModalOpen}
        onClose={() => setIsNewAreaModalOpen(false)}
        onCreated={handleCustomStudyAreaCreated}
      />

      {/* PDF Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        simulationResult={simulationResult}
      />
    </div>
  );
}
