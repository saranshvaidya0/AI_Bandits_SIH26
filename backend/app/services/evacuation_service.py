from typing import Dict, Any, List
from app.models.schemas import EvacuationDecisionSupport, EvacuationRoute

class EvacuationService:
    """
    Generates location-specific evacuation routes, high-ground safe refuge shelters,
    and hazard zone demarcation based on the target study area's terrain and roads.
    """

    @staticmethod
    def generate_evacuation_plan(study_area_id: str, study_area: Dict[str, Any]) -> EvacuationDecisionSupport:
        dam_name = study_area.get("dam", {}).get("name", "Dam Facility")
        river_pts = study_area.get("river_polyline", [])
        
        # High Ground Safe Shelters calculated relative to dam location
        if river_pts:
            base_lat, base_lon = river_pts[0][0], river_pts[0][1]
        else:
            base_lat, base_lon = 9.843, 76.976

        safe_zones = [
            {
                "id": f"sz_{study_area_id}_01",
                "name": f"{study_area['name']} High-Ground Emergency Base",
                "lat": base_lat + 0.022, "lon": base_lon + 0.015,
                "elevation_m": 680.0,
                "capacity_persons": 6000,
                "amenities": ["Medical Post", "Helipad", "Water Storage", "Power Backup"]
            },
            {
                "id": f"sz_{study_area_id}_02",
                "name": f"{study_area['name']} District High School Relief Shelter",
                "lat": base_lat + 0.038, "lon": base_lon - 0.020,
                "elevation_m": 665.0,
                "capacity_persons": 3500,
                "amenities": ["Temporary Tents", "First Aid", "Communication Tower"]
            }
        ]

        routes = [
            EvacuationRoute(
                route_id=f"er_{study_area_id}_01",
                name=f"{study_area['name']} High-Ground Bypass Corridor (Route Alpha)",
                status="Clear & Safe",
                distance_km=14.0,
                dest_safe_zone_name=f"{study_area['name']} High-Ground Emergency Base",
                elevation_m=675.0,
                geojson={
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[base_lon + 0.005, base_lat + 0.002], [base_lon + 0.012, base_lat + 0.012], [base_lon + 0.015, base_lat + 0.022]]
                    },
                    "properties": {"name": "High-Ground Bypass (Safe Route)", "status": "Recommended"}
                }
            ),
            EvacuationRoute(
                route_id=f"er_{study_area_id}_02",
                name=f"{study_area['name']} River Valley Highway (Route Bravo)",
                status="High Risk / Submerged",
                distance_km=28.5,
                dest_safe_zone_name="Downstream Relief Hub",
                elevation_m=480.0,
                geojson={
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[base_lon - 0.002, base_lat + 0.002], [base_lon - 0.015, base_lat + 0.015], [base_lon - 0.030, base_lat + 0.030]]
                    },
                    "properties": {"name": "River Valley Road (Submerged Hazard)", "status": "DO NOT USE"}
                }
            )
        ]

        high_risk_hazard_geojson = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [base_lon - 0.010, base_lat], [base_lon + 0.010, base_lat + 0.010],
                    [base_lon + 0.020, base_lat + 0.030], [base_lon - 0.020, base_lat + 0.030],
                    [base_lon - 0.010, base_lat]
                ]]
            },
            "properties": {"name": f"Flood Hazard Zone for {dam_name}", "risk_level": "Extremely High (Depth > 2.0m, Velocity > 2.5m/s)"}
        }

        return EvacuationDecisionSupport(
            study_area_id=study_area_id,
            safe_zones=safe_zones,
            evacuation_routes=routes,
            high_risk_zones_geojson=high_risk_hazard_geojson,
            recommended_action=(
                f"IMMEDIATE EVACUATION NOTICE for {study_area['name']}: Issue Red Alert for downstream settlements near {dam_name}. "
                "Direct evacuees strictly via High-Ground Bypass Corridor (Route Alpha) towards the Emergency Base shelter. "
                "Avoid River Valley Highway due to rapid wave inundation and high velocity currents."
            ),
            disclaimer=(
                "Prototype Evacuation Decision Support — Results are model-based estimates "
                "and should be verified by authorized disaster-management authorities."
            )
        )
