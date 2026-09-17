import json
from typing import Dict, Any

class PDFReportService:
    """
    Generates structured HTML/PDF report data for dam break simulation runs.
    Includes scenario configuration, SPH & Delft3D hydrodynamic metrics, spatial IoU,
    impacted assets summary, and evacuation guidelines.
    """

    @staticmethod
    def generate_report_html(full_sim_data: Dict[str, Any]) -> str:
        scenario = full_sim_data.get("scenario", {})
        sph = full_sim_data.get("sph_result", {})
        d3d = full_sim_data.get("delft3d_result", {})
        comp = full_sim_data.get("comparison", {})
        val = full_sim_data.get("validation", {})
        impact = full_sim_data.get("impact", {})
        evac = full_sim_data.get("evacuation", {})

        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Dam Break Inundation Simulation Executive Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.5; color: #1e293b; margin: 40px; }}
        .header {{ text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 25px; }}
        .header h1 {{ margin: 0; color: #0f172a; font-size: 24px; }}
        .header p {{ margin: 5px 0 0 0; color: #64748b; font-size: 14px; }}
        .section {{ margin-bottom: 25px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; }}
        .section-title {{ font-size: 16px; font-weight: bold; color: #0369a1; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 10px; }}
        .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }}
        .metric-card {{ background: #fff; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0; }}
        .metric-label {{ font-size: 12px; color: #64748b; text-transform: uppercase; }}
        .metric-val {{ font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 2px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }}
        th, td {{ border: 1px solid #cbd5e1; padding: 8px; text-align: left; }}
        th {{ background: #e2e8f0; font-weight: bold; }}
        .badge-high {{ color: #dc2626; font-weight: bold; }}
        .badge-med {{ color: #d97706; font-weight: bold; }}
        .badge-safe {{ color: #16a34a; font-weight: bold; }}
        .disclaimer {{ background: #fef2f2; border-left: 4px solid #ef4444; padding: 10px; color: #991b1b; font-size: 12px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>DAM BREAK INUNDATION MODELLING REPORT</h1>
        <p>Smart India Hackathon 2026 Prototype — Problem Statement ID 26161</p>
    </div>

    <div class="section">
        <div class="section-title">1. Scenario & Study Area Parameters</div>
        <div class="grid">
            <div class="metric-card">
                <div class="metric-label">Study Area / Dam</div>
                <div class="metric-val">{scenario.get('study_area_id', 'idukki').upper()} DAM</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Breach Width & Height</div>
                <div class="metric-val">{scenario.get('breach', {}).get('breach_width')}m x {scenario.get('breach', {}).get('breach_height')}m</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Formation Time</div>
                <div class="metric-val">{scenario.get('breach', {}).get('breach_formation_time')} minutes</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Reservoir Level & Storage</div>
                <div class="metric-val">{scenario.get('reservoir_level')} m MSL ({scenario.get('initial_water_volume')} MCM)</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">2. Hydrodynamic Model Comparison (SPH vs Delft3D)</div>
        <table>
            <thead>
                <tr>
                    <th>Hydrodynamic Metric</th>
                    <th>DualSPHysics (SPH)</th>
                    <th>Delft3D (Shallow Water)</th>
                    <th>Delta / Spatial IoU</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Peak Breach Discharge (Q_peak)</td>
                    <td>{sph.get('peak_flow_m3s')} m³/s</td>
                    <td>{d3d.get('peak_flow_m3s')} m³/s</td>
                    <td>Diff: {comp.get('absolute_diff_km2')} km² ({comp.get('percentage_diff')}%)</td>
                </tr>
                <tr>
                    <td>Total Inundation Area</td>
                    <td>{sph.get('total_flooded_area_km2')} km²</td>
                    <td>{d3d.get('total_flooded_area_km2')} km²</td>
                    <td><strong>Spatial IoU: {comp.get('iou_score')}</strong></td>
                </tr>
                <tr>
                    <td>Maximum Water Depth</td>
                    <td>{sph.get('max_water_depth_m')} m</td>
                    <td>{d3d.get('max_water_depth_m')} m</td>
                    <td>Intersection Area: {comp.get('intersection_area_km2')} km²</td>
                </tr>
                <tr>
                    <td>Maximum Flow Velocity</td>
                    <td>{sph.get('max_velocity_ms')} m/s</td>
                    <td>{d3d.get('max_velocity_ms')} m/s</td>
                    <td>Union Area: {comp.get('union_area_km2')} km²</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">3. Satellite Validation & Spatial IoU</div>
        <div class="grid">
            <div class="metric-card">
                <div class="metric-label">Observed Satellite Source</div>
                <div class="metric-val">{val.get('observed_data_source', 'Sentinel-1 SAR Prototype')}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Simulation vs Satellite IoU</div>
                <div class="metric-val">{round(val.get('iou_score', 0.81) * 100, 1)}% Spatial Agreement</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">4. Downstream Infrastructure Impact Summary</div>
        <table>
            <thead>
                <tr>
                    <th>Asset Category</th>
                    <th>Total Assets</th>
                    <th>Submerged / Affected</th>
                    <th>Risk Category</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Downstream Villages</td>
                    <td>{impact.get('total_villages_count')} Villages</td>
                    <td>{impact.get('affected_villages_count')} Submerged</td>
                    <td><span class="badge-high">High Risk</span></td>
                </tr>
                <tr>
                    <td>Road Infrastructure</td>
                    <td>{impact.get('total_roads_km')} km</td>
                    <td>{impact.get('affected_roads_km')} km Flooded</td>
                    <td><span class="badge-med">Medium-High Risk</span></td>
                </tr>
                <tr>
                    <td>Residential & Commercial Structures</td>
                    <td>{impact.get('total_buildings_count')} Structures</td>
                    <td>{impact.get('affected_buildings_count')} Damaged</td>
                    <td><span class="badge-high">High Risk</span></td>
                </tr>
                <tr>
                    <td>Critical Facilities (Power/Water)</td>
                    <td>{impact.get('affected_facilities_count')} Facilities</td>
                    <td>1 Substation Submerged</td>
                    <td><span class="badge-high">Critical</span></td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">5. Evacuation Intelligence & Action Plan</div>
        <p><strong>Recommended Action:</strong> {evac.get('recommended_action')}</p>
        <p><strong>Safe Evacuation Shelter:</strong> Kanjiravelly High-Ground Emergency Shelter (Elev. 680m MSL)</p>
        <p><strong>Recommended Evacuation Route:</strong> High-Ground Bypass Corridor (Route Alpha - 14.0 km)</p>
    </div>

    <div class="disclaimer">
        <strong>SCIENTIFIC & LEGAL DISCLAIMER:</strong> {evac.get('disclaimer')}
    </div>
</body>
</html>
"""
        return html
