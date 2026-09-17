from typing import Dict, Any, List
from app.models.schemas import SimulationConfig, BreachConfig, SensitivityAnalysisResult, SensitivityScenarioResult
from app.engines.mock_sph import MockSPHEngine

class SensitivityService:
    """
    Performs hydrodynamic sensitivity & uncertainty analysis by varying breach parameters
    (e.g., Breach Width 20m, 40m, 60m, 80m).
    Generates scenario matrix demonstrating how peak discharge, flood area, and max depth change.
    """

    @staticmethod
    def run_sensitivity_analysis(study_area_id: str, base_scenario: SimulationConfig, study_area: Dict[str, Any]) -> SensitivityAnalysisResult:
        engine = MockSPHEngine()
        breach_widths = [20.0, 40.0, 60.0, 80.0]
        results: List[SensitivityScenarioResult] = []

        for bw in breach_widths:
            # Clone scenario with varied breach width
            test_scenario = SimulationConfig(
                study_area_id=study_area_id,
                breach=BreachConfig(
                    breach_width=bw,
                    breach_height=base_scenario.breach.breach_height,
                    breach_formation_time=base_scenario.breach.breach_formation_time,
                    preset_name=f"Breach Width {bw}m"
                ),
                reservoir_level=base_scenario.reservoir_level,
                initial_water_volume=base_scenario.initial_water_volume,
                simulation_duration_hours=base_scenario.simulation_duration_hours
            )

            res = engine.run_simulation(test_scenario, study_area)

            # Calculate affected village count for this breach width
            scale = (res.total_flooded_area_km2 / 18.5)
            aff_villages = min(len(study_area.get("villages", [])), int(5 * scale))

            results.append(SensitivityScenarioResult(
                breach_width_m=bw,
                breach_formation_time_min=base_scenario.breach.breach_formation_time,
                peak_discharge_m3s=res.peak_flow_m3s,
                flood_area_km2=res.total_flooded_area_km2,
                max_depth_m=res.max_water_depth_m,
                max_velocity_ms=res.max_velocity_ms,
                affected_villages=aff_villages
            ))

        return SensitivityAnalysisResult(
            study_area_id=study_area_id,
            parameter_varied="Breach Width (m)",
            scenarios=results,
            explanation=(
                "Hydrodynamic sensitivity analysis demonstrates near-linear scaling of peak discharge (Q_peak) "
                "with breach width, leading to non-linear expansion of downstream inundation area. "
                "Uncertainty in breach formation time and initial reservoir head strongly dictates emergency response window."
            )
        )
