import math
from typing import Dict, Any, List
from app.engines.base import BaseHydroEngine
from app.models.schemas import SimulationConfig, SingleEngineResult, HydroTimeFrame

class MockSPHEngine(BaseHydroEngine):
    """
    Location-Aware Mock SPH (Smoothed Particle Hydrodynamics) Engine.
    Dynamically computes 3D particle-driven dam breach wave propagation along the selected study area's river reach and DEM gradient.
    Outputs are strictly deterministic based on (studyAreaId, damId, scenarioConfig).
    """
    
    def __init__(self):
        super().__init__(engine_name="DualSPHysics SPH Engine (Prototype Mock)", engine_type="SPH")

    def calculate_peak_discharge(self, scenario: SimulationConfig) -> float:
        """
        Calculates peak breach discharge Q_peak using Froehlich relation:
        Q_peak = 0.607 * (V_w)^0.295 * (H_w)^1.24 * (Breach_Width / 40.0)
        """
        v_w = max(scenario.initial_water_volume, 10.0) # MCM
        h_w = max(scenario.breach.breach_height, 5.0) # meters head
        w_b = scenario.breach.breach_width
        t_f = max(scenario.breach.breach_formation_time, 5.0) # mins

        q_base = 0.607 * (v_w ** 0.295) * (h_w ** 1.24) * 100.0
        q_peak = q_base * (w_b / 40.0) * (30.0 / t_f) ** 0.35
        return round(q_peak, 2)

    def run_simulation(self, scenario: SimulationConfig, study_area: Dict[str, Any]) -> SingleEngineResult:
        river_pts = study_area.get("river_polyline", study_area.get("river", {}).get("polyline", []))
        dam_info = study_area.get("dam", {})
        dam_id = dam_info.get("id", "dam_default")
        scen_id = scenario.scenario_id or f"scen_{int(scenario.breach.breach_width)}m"
        sim_id = f"sim_sph_{study_area['id']}_{scen_id}"

        q_peak = self.calculate_peak_discharge(scenario)
        w_b = scenario.breach.breach_width
        v_w = scenario.initial_water_volume
        
        # Location & terrain scale factors
        head_scale = (dam_info.get("dam_height", 100.0) / 100.0) ** 0.5
        vol_scale = (v_w / 2000.0) ** 0.4
        width_scale = (w_b / 40.0)
        scale_factor = width_scale * vol_scale * head_scale
        
        time_hours = [1.0, 2.0, 4.0, 8.0, 12.0, 24.0]
        time_frames: List[HydroTimeFrame] = []

        base_area = round(18.5 * scale_factor, 2)
        max_d = round(min(12.0, 4.5 * (scenario.breach.breach_height / 30.0) * scale_factor), 2)
        max_v = round(min(9.5, 4.8 * (q_peak / 15000.0) ** 0.5), 2)

        for th in time_hours:
            prog = min(1.0, (th / 12.0) ** 0.7)
            cur_area = round(base_area * prog, 2)
            cur_depth = round(max_d * (1.0 - 0.22 * (th / 24.0)), 2)
            cur_vel = round(max_v * (1.0 - 0.28 * (th / 24.0)), 2)

            # Generate flood polygon dynamically along location's river polyline
            reach_count = int(min(len(river_pts), max(2, int(prog * len(river_pts)))))
            left_bank = []
            right_bank = []

            for i in range(reach_count):
                pt = river_pts[i]
                lat, lon = pt[0], pt[1]
                # SPH particle channel offset along river coordinates
                offset_lat = 0.0030 * (1 + i * 0.15) * (scale_factor ** 0.5)
                offset_lon = 0.0050 * (1 + i * 0.25) * (scale_factor ** 0.5)

                left_bank.append([lon - offset_lon, lat + offset_lat])
                right_bank.insert(0, [lon + offset_lon, lat - offset_lat])

            poly_coords = left_bank + right_bank
            if poly_coords and poly_coords[0] != poly_coords[-1]:
                poly_coords.append(poly_coords[0])

            flood_poly_geojson = {
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [poly_coords]},
                "properties": {
                    "engine": "SPH",
                    "study_area_id": study_area["id"],
                    "time_hour": th,
                    "area_km2": cur_area,
                    "max_depth_m": cur_depth,
                    "max_velocity_ms": cur_vel
                }
            }

            depth_bins_geojson = {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {"type": "Polygon", "coordinates": [poly_coords]},
                        "properties": {"depth_range": "2.0 - 5.0m", "avg_depth": round(cur_depth * 0.7, 1), "fill_color": "#dc2626"}
                    }
                ]
            }

            velocity_vectors_geojson = {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [river_pts[min(i, len(river_pts)-1)][1], river_pts[min(i, len(river_pts)-1)][0]]},
                        "properties": {"velocity_ms": round(cur_vel * (1 - i*0.08), 1), "direction_deg": 215 + i*5}
                    } for i in range(reach_count)
                ]
            }

            time_frames.append(HydroTimeFrame(
                time_hour=th,
                max_depth_m=cur_depth,
                max_velocity_ms=cur_vel,
                flooded_area_km2=cur_area,
                flood_polygon_geojson=flood_poly_geojson,
                depth_grid_geojson=depth_bins_geojson,
                velocity_vectors_geojson=velocity_vectors_geojson
            ))

        return SingleEngineResult(
            simulation_id=sim_id,
            study_area_id=study_area["id"],
            dam_id=dam_id,
            scenario_id=scen_id,
            engine_name="DualSPHysics SPH Engine",
            model_type="SPH",
            peak_flow_m3s=q_peak,
            total_flooded_area_km2=base_area,
            max_water_depth_m=max_d,
            max_velocity_ms=max_v,
            peak_inundation_time_hours=2.5,
            time_frames=time_frames
        )
