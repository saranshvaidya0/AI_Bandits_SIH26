from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import HTMLResponse
from typing import Dict, Any, List, Optional
import uuid
import json
from datetime import datetime

from app.models.schemas import (
    StudyArea, SimulationConfig, FullSimulationResponse,
    ComparisonResult, ValidationResult, SensitivityAnalysisResult,
    ImpactAssessmentResult, EvacuationDecisionSupport, SimulationHistoryItem,
    CustomStudyAreaCreate
)
from app.data.sample_study_areas import SAMPLE_STUDY_AREAS
from app.engines.mock_sph import MockSPHEngine
from app.engines.mock_delft3d import MockDelft3DEngine
from app.services.spatial_analysis import SpatialAnalysisService
from app.services.impact_service import ImpactService
from app.services.sensitivity_service import SensitivityService
from app.services.evacuation_service import EvacuationService
from app.services.pdf_report_service import PDFReportService

router = APIRouter(prefix="/api")

# Dynamic In-Memory Registries (Extensible with PostgreSQL DB)
DYNAMIC_STUDY_AREAS: Dict[str, Dict[str, Any]] = dict(SAMPLE_STUDY_AREAS)
SIMULATION_CACHE: Dict[str, FullSimulationResponse] = {}
SIMULATION_HISTORY: List[SimulationHistoryItem] = []
SCENARIO_CACHE: Dict[str, List[SimulationConfig]] = {}

@router.get("/study-areas", response_model=List[Dict[str, Any]])
def get_study_areas():
    """Returns catalog of all available demo and custom study areas."""
    return [
        {
            "study_area_id": key,
            "id": key,
            "name": val["name"],
            "state": val["state"],
            "dam": val["dam"],
            "bounds": val["bounds"],
            "status": val["status"]
        } for key, val in DYNAMIC_STUDY_AREAS.items()
    ]

@router.get("/dams", response_model=List[Dict[str, Any]])
def get_dams():
    """Alias endpoint for dams catalog."""
    return get_study_areas()

@router.get("/study-area/{id}")
def get_study_area(id: str):
    """Returns complete geospatial study area data (Dam, River, DEM range, Villages, Roads, Buildings, Satellite Layer)."""
    key = id.lower()
    if key not in DYNAMIC_STUDY_AREAS:
        raise HTTPException(status_code=404, detail=f"Study area '{id}' not found")
    return DYNAMIC_STUDY_AREAS[key]

@router.post("/study-areas/custom")
def create_custom_study_area(payload: CustomStudyAreaCreate):
    """
    Registers a brand new study area dynamically from user inputs & GeoJSON dataset uploads.
    """
    sa_id = f"custom_{str(uuid.uuid4())[:6]}"
    
    # Generate river polyline if not provided
    river_coords = []
    if payload.river_geojson and "geometry" in payload.river_geojson:
        river_coords = payload.river_geojson["geometry"].get("coordinates", [])
    if not river_coords:
        base_lat, base_lon = payload.lat, payload.lon
        river_coords = [
            [base_lat, base_lon],
            [base_lat + 0.010, base_lon + 0.015],
            [base_lat + 0.025, base_lon + 0.030],
            [base_lat + 0.040, base_lon + 0.045]
        ]

    # Generate custom study area dictionary
    new_area = {
        "id": sa_id,
        "name": payload.name,
        "state": payload.state,
        "dam": {
            "id": f"dam_{sa_id}",
            "name": payload.dam_name,
            "river_name": payload.river_name,
            "location": {"lat": payload.lat, "lon": payload.lon},
            "reservoir_level": payload.reservoir_level,
            "initial_water_volume": payload.initial_volume,
            "dam_elevation": payload.reservoir_level + 20.0,
            "dam_height": payload.dam_height,
            "country": "India",
            "description": "User-Uploaded Custom Study Area"
        },
        "river": {
            "id": f"river_{sa_id}",
            "name": payload.river_name,
            "study_area_id": sa_id,
            "polyline": river_coords
        },
        "bounds": [[payload.lat - 0.1, payload.lon - 0.1], [payload.lat + 0.1, payload.lon + 0.1]],
        "dem_resolution_m": 30.0,
        "crs": "EPSG:4326",
        "status": "User Uploaded Study Area",
        "river_polyline": river_coords,
        "villages": [
            {"id": f"c_v1", "name": f"{payload.name} Settlement Alpha", "lat": payload.lat + 0.012, "lon": payload.lon + 0.010, "population": 8500, "elevation": payload.reservoir_level - 50.0},
            {"id": f"c_v2", "name": f"{payload.name} Settlement Beta", "lat": payload.lat + 0.028, "lon": payload.lon + 0.025, "population": 4200, "elevation": payload.reservoir_level - 80.0}
        ],
        "roads": [
            {
                "id": "c_r1", "name": f"{payload.name} Access Road", "length_km": 15.0,
                "coordinates": [[payload.lat, payload.lon], [payload.lat + 0.020, payload.lon + 0.020]]
            }
        ],
        "buildings": [
            {"id": "c_b1", "name": f"{payload.name} Residential District", "lat": payload.lat + 0.015, "lon": payload.lon + 0.012, "count": 450}
        ],
        "bridges": [
            {"id": "c_br1", "name": f"{payload.river_name} Main Bridge", "lat": payload.lat + 0.018, "lon": payload.lon + 0.015, "length_m": 180.0}
        ],
        "critical_infrastructure": [
            {"id": "c_ci1", "name": f"{payload.dam_name} Power House", "category": "Power", "lat": payload.lat + 0.005, "lon": payload.lon + 0.005}
        ],
        "dem_grid_sample": {"min_elevation": payload.reservoir_level - 150.0, "max_elevation": payload.reservoir_level + 300.0, "dam_crest": payload.reservoir_level + 20.0, "river_bed": payload.reservoir_level - 120.0},
        "observed_satellite_flood": {
            "source": f"User Uploaded GeoJSON ({payload.name})",
            "acquisition_time": datetime.utcnow().isoformat(),
            "polygon_geojson": payload.observed_flood_geojson or {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [payload.lon, payload.lat], [payload.lon + 0.015, payload.lat + 0.010],
                        [payload.lon + 0.030, payload.lat + 0.025], [payload.lon + 0.020, payload.lat + 0.035],
                        [payload.lon, payload.lat]
                    ]]
                },
                "properties": {"name": f"Uploaded Observed Footprint ({payload.name})", "area_km2": 22.0}
            }
        }
    }

    DYNAMIC_STUDY_AREAS[sa_id] = new_area
    return {"study_area_id": sa_id, "status": "Registered Successfully", "study_area": new_area}

@router.get("/scenarios")
def get_scenarios(studyAreaId: str = Query("idukki")):
    """Returns saved scenario configurations for a specific study area."""
    sa_id = studyAreaId.lower()
    return SCENARIO_CACHE.get(sa_id, [])

@router.post("/scenarios")
def create_scenario(scenario: SimulationConfig):
    """Saves a new scenario configuration for a study area."""
    sa_id = scenario.study_area_id.lower()
    scen_id = scenario.scenario_id or f"scen_{str(uuid.uuid4())[:6]}"
    scenario.scenario_id = scen_id

    if sa_id not in SCENARIO_CACHE:
        SCENARIO_CACHE[sa_id] = []
    SCENARIO_CACHE[sa_id].append(scenario)

    return {"scenario_id": scen_id, "scenario": scenario, "status": "Configured"}

@router.get("/simulations/history", response_model=List[SimulationHistoryItem])
def get_simulation_history(studyAreaId: Optional[str] = None):
    """Returns simulation execution history filtered optionally by studyAreaId."""
    if studyAreaId:
        return [h for h in SIMULATION_HISTORY if h.study_area_id.lower() == studyAreaId.lower()]
    return SIMULATION_HISTORY

@router.post("/simulations/run", response_model=FullSimulationResponse)
def run_simulation(scenario: SimulationConfig):
    """
    Runs location-aware hydrodynamic simulation pipeline:
    SPH Engine -> Delft3D Engine -> Spatial IoU -> Impact Assessment -> Evacuation Decision Support
    """
    area_id = scenario.study_area_id.lower()
    if area_id not in DYNAMIC_STUDY_AREAS:
        area_id = "idukki" # fallback to default

    study_area = DYNAMIC_STUDY_AREAS[area_id]
    sim_id = f"sim_{area_id}_{str(uuid.uuid4())[:6]}"
    scen_id = scenario.scenario_id or f"scen_{int(scenario.breach.breach_width)}m"
    scenario.scenario_id = scen_id
    scenario.dam_id = study_area["dam"]["id"]

    # 1. Run SPH Engine dynamically for location & terrain
    sph_engine = MockSPHEngine()
    sph_result = sph_engine.run_simulation(scenario, study_area)

    # 2. Run Delft3D Engine dynamically for location & terrain
    delft3d_engine = MockDelft3DEngine()
    delft3d_result = delft3d_engine.run_simulation(scenario, study_area)

    # 3. Spatial IoU & Model Comparison for location
    comparison = SpatialAnalysisService.calculate_iou(sph_result, delft3d_result)

    # 4. Location-Aware Vulnerability Impact Assessment
    impact = ImpactService.assess_impact(sim_id, sph_result, study_area)

    # 5. Location-Specific Satellite Validation
    sat_obs = study_area.get("observed_satellite_flood", {})
    obs_area = sat_obs.get("polygon_geojson", {}).get("properties", {}).get("area_km2", 24.5)

    inter_area = round(min(sph_result.total_flooded_area_km2, obs_area) * 0.91, 2)
    union_area = round(max(sph_result.total_flooded_area_km2, obs_area) * 1.06, 2)
    val_iou = round(inter_area / max(union_area, 1.0), 4)

    validation = ValidationResult(
        study_area_id=area_id,
        observed_data_source=sat_obs.get("source", f"Sentinel-1 SAR ({study_area['name']})"),
        simulated_area_km2=sph_result.total_flooded_area_km2,
        observed_area_km2=obs_area,
        intersection_area_km2=inter_area,
        union_area_km2=union_area,
        iou_score=val_iou,
        precision=round(inter_area / max(sph_result.total_flooded_area_km2, 1.0), 3),
        recall=round(inter_area / max(obs_area, 1.0), 3),
        status_label="Prototype / Simulated Validation"
    )

    # 6. Location-Aware Evacuation Intelligence
    evacuation = EvacuationService.generate_evacuation_plan(area_id, study_area)

    response = FullSimulationResponse(
        simulation_id=sim_id,
        study_area_id=area_id,
        dam_id=study_area["dam"]["id"],
        scenario_id=scen_id,
        scenario=scenario,
        sph_result=sph_result,
        delft3d_result=delft3d_result,
        comparison=comparison,
        impact=impact,
        validation=validation,
        evacuation=evacuation
    )

    SIMULATION_CACHE[sim_id] = response

    # Add to Simulation History
    history_item = SimulationHistoryItem(
        simulation_id=sim_id,
        study_area_id=area_id,
        study_area_name=study_area["name"],
        dam_name=study_area["dam"]["name"],
        scenario_preset=scenario.breach.preset_name or "Custom Breach",
        breach_width_m=scenario.breach.breach_width,
        engine_type="Both (SPH & Delft3D)",
        peak_flow_m3s=sph_result.peak_flow_m3s,
        flooded_area_km2=sph_result.total_flooded_area_km2,
        iou_score=comparison.iou_score,
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )
    SIMULATION_HISTORY.insert(0, history_item)

    return response

@router.get("/simulations/{id}/results", response_model=FullSimulationResponse)
def get_simulation_results(id: str):
    """Retrieves specific historical simulation result by ID."""
    if id not in SIMULATION_CACHE:
        raise HTTPException(status_code=404, detail=f"Simulation result '{id}' not found")
    return SIMULATION_CACHE[id]

@router.post("/compare", response_model=ComparisonResult)
def compare_models(scenario: SimulationConfig):
    """Compares SPH and Delft3D engine outputs for a specific scenario & location."""
    area_id = scenario.study_area_id.lower()
    study_area = DYNAMIC_STUDY_AREAS.get(area_id, DYNAMIC_STUDY_AREAS["idukki"])
    
    sph = MockSPHEngine().run_simulation(scenario, study_area)
    d3d = MockDelft3DEngine().run_simulation(scenario, study_area)
    return SpatialAnalysisService.calculate_iou(sph, d3d)

@router.post("/uncertainty/run", response_model=SensitivityAnalysisResult)
def run_uncertainty_analysis(scenario: SimulationConfig):
    """Runs sensitivity analysis varying breach parameters for specified study area."""
    area_id = scenario.study_area_id.lower()
    study_area = DYNAMIC_STUDY_AREAS.get(area_id, DYNAMIC_STUDY_AREAS["idukki"])
    return SensitivityService.run_sensitivity_analysis(area_id, scenario, study_area)

@router.get("/impact/{simulation_id}", response_model=ImpactAssessmentResult)
def get_impact_assessment(simulation_id: str):
    """Returns infrastructure impact assessment for a simulation."""
    if simulation_id in SIMULATION_CACHE:
        return SIMULATION_CACHE[simulation_id].impact
    # Fallback to default
    study_area = DYNAMIC_STUDY_AREAS["idukki"]
    sph = MockSPHEngine().run_simulation(
        SimulationConfig(study_area_id="idukki", breach=BreachConfig()),
        study_area
    )
    return ImpactService.assess_impact(simulation_id, sph, study_area)

@router.post("/reports/generate", response_class=HTMLResponse)
def generate_report(sim_data: Dict[str, Any]):
    """Generates styled HTML executive report ready for PDF export."""
    return PDFReportService.generate_report_html(sim_data)
