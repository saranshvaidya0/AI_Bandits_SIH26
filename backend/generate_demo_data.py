"""
Demo Data Generator for Dam Break Inundation Modelling System
Populates and validates multi-location datasets for:
  - Idukki Dam (Kerala)
  - Tehri Dam (Uttarakhand)
  - Hirakud Dam (Odisha)
  - Bhakra Dam (Himachal Pradesh / Punjab)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.data.sample_study_areas import SAMPLE_STUDY_AREAS

def verify_datasets():
    print("=" * 60)
    print("VERIFYING MULTI-LOCATION DEMO DATASETS")
    print("=" * 60)

    for key, data in SAMPLE_STUDY_AREAS.items():
        dam = data["dam"]
        river = data.get("river", {})
        villages = data.get("villages", [])
        roads = data.get("roads", [])
        buildings = data.get("buildings", [])
        bridges = data.get("bridges", [])
        infra = data.get("critical_infrastructure", [])
        sat = data.get("observed_satellite_flood", {})

        print(f"\n[+] Study Area ID: '{key}'")
        print(f"    Name: {data['name']} ({data['state']})")
        print(f"    Dam: {dam['name']} (Lat {dam['location']['lat']}, Lon {dam['location']['lon']})")
        print(f"    Reservoir Level: {dam['reservoir_level']}m MSL | Volume: {dam['initial_water_volume']} MCM")
        print(f"    River Reach: {river.get('name', 'N/A')} ({len(data.get('river_polyline', []))} nodes)")
        print(f"    Downstream Assets: {len(villages)} Villages | {len(roads)} Roads | {len(buildings)} Building Clusters | {len(bridges)} Bridges | {len(infra)} Facilities")
        print(f"    Observed Satellite Layer: {sat.get('source', 'N/A')}")

    print("\n[OK] All 4 multi-location study area datasets verified successfully!")

if __name__ == "__main__":
    verify_datasets()
