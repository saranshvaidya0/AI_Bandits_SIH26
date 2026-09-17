from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class GeoCoordinates(BaseModel):
    lat: float
    lon: float

class DamInfo(BaseModel):
    id: str
    name: str
    river_name: str
    location: GeoCoordinates
    reservoir_level: float = Field(..., description="Reservoir water level in meters above sea level")
    initial_water_volume: float = Field(..., description="Reservoir volume in Million Cubic Meters (MCM)")
    dam_elevation: float = Field(..., description="Dam crest elevation in meters")
    dam_height: float = Field(..., description="Dam height in meters")
    country: str = "India"
    description: Optional[str] = "Demo Dam Facility"

class RiverInfo(BaseModel):
    id: str
    name: str
    study_area_id: str
    polyline: List[List[float]] # [[lat, lon], ...]

class StudyArea(BaseModel):
    id: str
    name: str
    state: str
    dam: DamInfo
    river: RiverInfo
    bounds: List[List[float]] # [[min_lat, min_lon], [max_lat, max_lon]]
    dem_resolution_m: float = 30.0
    crs: str = "EPSG:4326"
    status: str = "Active Demo Study Area"

class BreachConfig(BaseModel):
    breach_width: float = Field(40.0, description="Breach width in meters")
    breach_height: float = Field(30.0, description="Breach height in meters")
    breach_formation_time: float = Field(30.0, description="Formation time in minutes")
    preset_name: Optional[str] = "Medium Breach"

class SimulationConfig(BaseModel):
    scenario_id: Optional[str] = None
    study_area_id: str
    dam_id: Optional[str] = None
    breach: BreachConfig
    reservoir_level: float = 700.0
    initial_water_volume: float = 2000.0
    simulation_duration_hours: float = 24.0
    time_step_seconds: float = 1.0
    downstream_boundary: str = "Free Flow Outflow"
    engine_type: str = "Both" # "SPH", "Delft3D", "Both"

class HydroTimeFrame(BaseModel):
    time_hour: float
    max_depth_m: float
    max_velocity_ms: float
    flooded_area_km2: float
    flood_polygon_geojson: Dict[str, Any]
    depth_grid_geojson: Dict[str, Any]
    velocity_vectors_geojson: Dict[str, Any]

class SingleEngineResult(BaseModel):
    simulation_id: str
    study_area_id: str
    dam_id: str
    scenario_id: str
    engine_name: str
    model_type: str # "SPH" or "Delft3D"
    peak_flow_m3s: float
    total_flooded_area_km2: float
    max_water_depth_m: float
    max_velocity_ms: float
    peak_inundation_time_hours: float
    time_frames: List[HydroTimeFrame]

class ComparisonResult(BaseModel):
    study_area_id: str
    scenario_id: str
    sph_area_km2: float
    delft3d_area_km2: float
    absolute_diff_km2: float
    percentage_diff: float
    intersection_area_km2: float
    union_area_km2: float
    iou_score: float
    sph_max_depth_m: float
    delft3d_max_depth_m: float
    sph_max_velocity_ms: float
    delft3d_max_velocity_ms: float
    difference_grid_geojson: Dict[str, Any]
    overlap_polygon_geojson: Dict[str, Any]

class AssetImpactItem(BaseModel):
    asset_id: str
    name: str
    category: str # "Village", "Road", "Building", "Bridge", "Critical Infrastructure"
    total_count_or_length: str
    affected_count_or_length: str
    risk_level: str # "High", "Medium", "Low", "Safe"
    max_depth_at_asset_m: float
    max_velocity_at_asset_ms: float

class ImpactAssessmentResult(BaseModel):
    simulation_id: str
    study_area_id: str
    affected_villages_count: int
    total_villages_count: int
    affected_roads_km: float
    total_roads_km: float
    affected_buildings_count: int
    total_buildings_count: int
    affected_bridges_count: int
    affected_facilities_count: int
    assets: List[AssetImpactItem]

class ValidationResult(BaseModel):
    study_area_id: str
    observed_data_source: str
    simulated_area_km2: float
    observed_area_km2: float
    intersection_area_km2: float
    union_area_km2: float
    iou_score: float
    precision: float
    recall: float
    status_label: str = "Prototype / Simulated Validation"

class SensitivityScenarioResult(BaseModel):
    breach_width_m: float
    breach_formation_time_min: float
    peak_discharge_m3s: float
    flood_area_km2: float
    max_depth_m: float
    max_velocity_ms: float
    affected_villages: int

class SensitivityAnalysisResult(BaseModel):
    study_area_id: str
    parameter_varied: str = "Breach Width (m)"
    scenarios: List[SensitivityScenarioResult]
    explanation: str

class EvacuationRoute(BaseModel):
    route_id: str
    name: str
    status: str
    distance_km: float
    dest_safe_zone_name: str
    elevation_m: float
    geojson: Dict[str, Any]

class EvacuationDecisionSupport(BaseModel):
    study_area_id: str
    safe_zones: List[Dict[str, Any]]
    evacuation_routes: List[EvacuationRoute]
    high_risk_zones_geojson: Dict[str, Any]
    recommended_action: str
    disclaimer: str = "Prototype evacuation decision support — Results are model-based estimates and should be verified by authorized disaster-management authorities."

class SimulationHistoryItem(BaseModel):
    simulation_id: str
    study_area_id: str
    study_area_name: str
    dam_name: str
    scenario_preset: str
    breach_width_m: float
    engine_type: str
    peak_flow_m3s: float
    flooded_area_km2: float
    iou_score: float
    created_at: str

class FullSimulationResponse(BaseModel):
    simulation_id: str
    study_area_id: str
    dam_id: str
    scenario_id: str
    scenario: SimulationConfig
    sph_result: SingleEngineResult
    delft3d_result: SingleEngineResult
    comparison: ComparisonResult
    impact: ImpactAssessmentResult
    validation: ValidationResult
    evacuation: EvacuationDecisionSupport

class CustomStudyAreaCreate(BaseModel):
    name: str
    state: str
    dam_name: str
    river_name: str
    lat: float
    lon: float
    reservoir_level: float = 500.0
    dam_height: float = 100.0
    initial_volume: float = 1500.0
    river_geojson: Optional[Dict[str, Any]] = None
    assets_geojson: Optional[Dict[str, Any]] = None
    observed_flood_geojson: Optional[Dict[str, Any]] = None
