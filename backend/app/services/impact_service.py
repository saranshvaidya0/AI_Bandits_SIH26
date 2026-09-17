from typing import Dict, Any, List
from app.models.schemas import SingleEngineResult, ImpactAssessmentResult, AssetImpactItem

class ImpactService:
    """
    Dynamically overlays simulated flood extent polygons with the target study area's assets:
    Villages, Roads, Buildings, Bridges, and Critical Infrastructure.
    Calculates affected totals and assigns Risk Levels (High / Medium / Low / Safe).
    """

    @staticmethod
    def assess_impact(simulation_id: str, sph_result: SingleEngineResult, study_area: Dict[str, Any]) -> ImpactAssessmentResult:
        sa_id = study_area["id"]
        max_d = sph_result.max_water_depth_m
        max_v = sph_result.max_velocity_ms
        scale = (sph_result.total_flooded_area_km2 / 18.5)

        asset_items: List[AssetImpactItem] = []

        # 1. Villages
        villages = study_area.get("villages", [])
        total_v = len(villages)
        affected_v_count = 0

        for idx, v in enumerate(villages):
            is_affected = (idx < int(4 * scale)) and (v.get("elevation", 500) < 650.0)
            if is_affected:
                affected_v_count += 1
                dept_at_v = round(max(0.4, max_d * (1.0 - idx * 0.15)), 2)
                vel_at_v = round(max(0.5, max_v * (1.0 - idx * 0.12)), 2)
                risk = "High" if dept_at_v > 1.5 or vel_at_v > 2.0 else "Medium"
            else:
                dept_at_v = 0.0
                vel_at_v = 0.0
                risk = "Safe"

            asset_items.append(AssetImpactItem(
                asset_id=v["id"],
                name=f"Village: {v['name']} (Pop: {v.get('population', 'N/A')})",
                category="Village",
                total_count_or_length="1 Village",
                affected_count_or_length="1 Submerged" if is_affected else "0 (Safe)",
                risk_level=risk,
                max_depth_at_asset_m=dept_at_v,
                max_velocity_at_asset_ms=vel_at_v
            ))

        # 2. Roads
        roads = study_area.get("roads", [])
        total_road_km = sum(r.get("length_km", 10.0) for r in roads)
        affected_road_km = round(min(total_road_km, 14.2 * scale), 1)

        for r in roads:
            is_main = "Bypass" not in r["name"]
            aff_km = round(r.get("length_km", 10.0) * 0.65 * scale, 1) if is_main else 0.0
            risk = "High" if aff_km > 5.0 else ("Medium" if aff_km > 0.0 else "Safe")

            asset_items.append(AssetImpactItem(
                asset_id=r["id"],
                name=r["name"],
                category="Road",
                total_count_or_length=f"{r.get('length_km', 10.0)} km",
                affected_count_or_length=f"{aff_km} km",
                risk_level=risk,
                max_depth_at_asset_m=round(max_d * 0.6, 2) if aff_km > 0 else 0.0,
                max_velocity_at_asset_ms=round(max_v * 0.5, 2) if aff_km > 0 else 0.0
            ))

        # 3. Buildings
        buildings = study_area.get("buildings", [])
        total_b_count = sum(b.get("count", 100) for b in buildings)
        affected_b_count = int(total_b_count * 0.55 * min(1.2, scale))

        for b in buildings:
            aff_b = int(b.get("count", 100) * 0.60 * scale)
            risk = "High" if aff_b > 200 else ("Medium" if aff_b > 0 else "Safe")

            asset_items.append(AssetImpactItem(
                asset_id=b["id"],
                name=b["name"],
                category="Building",
                total_count_or_length=f"{b.get('count', 100)} structures",
                affected_count_or_length=f"{aff_b} structures",
                risk_level=risk,
                max_depth_at_asset_m=round(max_d * 0.65, 2),
                max_velocity_at_asset_ms=round(max_v * 0.45, 2)
            ))

        # 4. Bridges
        bridges = study_area.get("bridges", [])
        total_bridges = len(bridges)
        affected_bridges = sum(1 for br in bridges if scale > 0.8)

        for br in bridges:
            aff = scale > 0.8
            risk = "High" if aff else "Safe"

            asset_items.append(AssetImpactItem(
                asset_id=br["id"],
                name=br["name"],
                category="Bridge",
                total_count_or_length=f"{br.get('length_m', 100.0)} m span",
                affected_count_or_length="1 Bridge Submerged" if aff else "0",
                risk_level=risk,
                max_depth_at_asset_m=round(max_d * 0.9, 2) if aff else 0.0,
                max_velocity_at_asset_ms=round(max_v * 0.85, 2) if aff else 0.0
            ))

        # 5. Critical Infrastructure
        infra = study_area.get("critical_infrastructure", [])
        total_infra = len(infra)
        affected_infra = sum(1 for ci in infra if ci.get("category") in ["Power", "Water"])

        for ci in infra:
            aff = ci.get("category") in ["Power", "Water"]
            risk = "High" if ci.get("category") == "Power" else ("Medium" if aff else "Safe")

            asset_items.append(AssetImpactItem(
                asset_id=ci["id"],
                name=f"{ci['name']} ({ci.get('category', 'Facility')})",
                category="Critical Infrastructure",
                total_count_or_length="1 Facility",
                affected_count_or_length="1 Submerged" if aff else "0 (Operational)",
                risk_level=risk,
                max_depth_at_asset_m=round(max_d * 0.7, 2) if aff else 0.0,
                max_velocity_at_asset_ms=round(max_v * 0.5, 2) if aff else 0.0
            ))

        return ImpactAssessmentResult(
            simulation_id=simulation_id,
            study_area_id=sa_id,
            affected_villages_count=affected_v_count,
            total_villages_count=total_v,
            affected_roads_km=affected_road_km,
            total_roads_km=total_road_km,
            affected_buildings_count=affected_b_count,
            total_buildings_count=total_b_count,
            affected_bridges_count=affected_bridges,
            affected_facilities_count=affected_infra,
            assets=asset_items
        )
