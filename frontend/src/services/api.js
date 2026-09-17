const API_BASE = '/api';

export const fetchStudyAreas = async () => {
  try {
    const res = await fetch(`${API_BASE}/study-areas`);
    if (!res.ok) throw new Error("Failed to fetch study areas");
    return await res.json();
  } catch (err) {
    console.warn("Using local fallback study areas data:", err);
    return [
      { id: "idukki", study_area_id: "idukki", name: "Idukki Dam & Periyar River Reach (Kerala)", dam: { name: "Idukki Arch Dam", location: { lat: 9.843, lon: 76.976 } } },
      { id: "tehri", study_area_id: "tehri", name: "Tehri Dam & Bhagirathi River Reach (Uttarakhand)", dam: { name: "Tehri Hydro Dam", location: { lat: 30.378, lon: 78.480 } } },
      { id: "hirakud", study_area_id: "hirakud", name: "Hirakud Dam & Mahanadi River Reach (Odisha)", dam: { name: "Hirakud Multipurpose Dam", location: { lat: 21.520, lon: 83.870 } } },
      { id: "bhakra", study_area_id: "bhakra", name: "Bhakra Dam & Sutlej River Reach (HP / Punjab)", dam: { name: "Bhakra Concrete Gravity Dam", location: { lat: 31.412, lon: 76.435 } } }
    ];
  }
};

export const fetchDams = fetchStudyAreas;

export const fetchStudyArea = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/study-area/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch study area '${id}'`);
    return await res.json();
  } catch (err) {
    console.warn(`Using study area fallback for '${id}'`);
    return null;
  }
};

export const fetchScenarios = async (studyAreaId) => {
  try {
    const res = await fetch(`${API_BASE}/scenarios?studyAreaId=${studyAreaId}`);
    if (!res.ok) throw new Error("Failed to fetch scenarios");
    return await res.json();
  } catch (err) {
    return [];
  }
};

export const fetchSimulationHistory = async (studyAreaId = '') => {
  try {
    const url = studyAreaId ? `${API_BASE}/simulations/history?studyAreaId=${studyAreaId}` : `${API_BASE}/simulations/history`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch simulation history");
    return await res.json();
  } catch (err) {
    return [];
  }
};

export const createCustomStudyArea = async (customPayload) => {
  try {
    const res = await fetch(`${API_BASE}/study-areas/custom`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customPayload)
    });
    if (!res.ok) throw new Error("Failed to create custom study area");
    return await res.json();
  } catch (err) {
    console.error("Custom study area creation error:", err);
    throw err;
  }
};

export const runHydroSimulation = async (scenarioConfig) => {
  try {
    const res = await fetch(`${API_BASE}/simulations/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scenarioConfig)
    });
    if (!res.ok) throw new Error("Simulation execution failed");
    return await res.json();
  } catch (err) {
    console.error("Simulation API error:", err);
    throw err;
  }
};

export const runSensitivityAnalysis = async (scenarioConfig) => {
  try {
    const res = await fetch(`${API_BASE}/uncertainty/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scenarioConfig)
    });
    if (!res.ok) throw new Error("Sensitivity analysis failed");
    return await res.json();
  } catch (err) {
    console.error("Sensitivity API error:", err);
    return null;
  }
};

export const generateReportHTML = async (simData) => {
  try {
    const res = await fetch(`${API_BASE}/reports/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(simData)
    });
    if (!res.ok) throw new Error("Report generation failed");
    return await res.text();
  } catch (err) {
    console.error("Report API error:", err);
    return null;
  }
};
