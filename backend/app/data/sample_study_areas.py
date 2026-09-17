"""
Multi-Location Geospatial Datasets for Dam Break Hydrodynamic Inundation Platform
Contains 4 Spatially Separated Demo Study Areas:
  1. Idukki Dam & Periyar River Reach (Kerala)
  2. Tehri Dam & Bhagirathi River Reach (Uttarakhand)
  3. Hirakud Dam & Mahanadi River Reach (Odisha)
  4. Bhakra Dam & Sutlej River Reach (Himachal Pradesh / Punjab)
"""

SAMPLE_STUDY_AREAS = {
    "idukki": {
        "id": "idukki",
        "name": "Idukki Dam & Periyar River Reach",
        "state": "Kerala",
        "dam": {
            "id": "dam_idukki_01",
            "name": "Idukki Arch Dam",
            "river_name": "Periyar River",
            "location": {"lat": 9.8430, "lon": 76.9760},
            "reservoir_level": 700.5,
            "initial_water_volume": 1996.0,
            "dam_elevation": 720.0,
            "dam_height": 168.91,
            "country": "India",
            "description": "Double-curvature arch dam on Periyar River in Kerala, India."
        },
        "river": {
            "id": "river_periyar_01",
            "name": "Periyar River Reach",
            "study_area_id": "idukki",
            "polyline": [
                [9.8430, 76.9760], [9.8510, 76.9710], [9.8600, 76.9620],
                [9.8680, 76.9530], [9.8760, 76.9410], [9.8850, 76.9280],
                [9.8930, 76.9120], [9.9020, 76.8950], [9.9100, 76.8800]
            ]
        },
        "bounds": [[9.750, 76.850], [9.950, 77.050]],
        "dem_resolution_m": 30.0,
        "crs": "EPSG:4326",
        "status": "Prototype Dataset (Idukki Demo)",
        "river_polyline": [
            [9.8430, 76.9760], [9.8510, 76.9710], [9.8600, 76.9620],
            [9.8680, 76.9530], [9.8760, 76.9410], [9.8850, 76.9280],
            [9.8930, 76.9120], [9.9020, 76.8950], [9.9100, 76.8800]
        ],
        "villages": [
            {"id": "id_v1", "name": "Cheruthoni", "lat": 9.8530, "lon": 76.9680, "population": 14200, "elevation": 630.0},
            {"id": "id_v2", "name": "Vazhathope", "lat": 9.8610, "lon": 76.9580, "population": 8500, "elevation": 625.0},
            {"id": "id_v3", "name": "Karimban", "lat": 9.8700, "lon": 76.9480, "population": 6200, "elevation": 610.0},
            {"id": "id_v4", "name": "Chelachuvadu", "lat": 9.8790, "lon": 76.9350, "population": 9800, "elevation": 590.0},
            {"id": "id_v5", "name": "Lower Periyar", "lat": 9.8880, "lon": 76.9200, "population": 11300, "elevation": 560.0},
            {"id": "id_v6", "name": "Neriamangalam", "lat": 9.8980, "lon": 76.9020, "population": 15400, "elevation": 510.0},
            {"id": "id_v7", "name": "Kanjiravelly Shelter Base", "lat": 9.8650, "lon": 76.9750, "population": 3100, "elevation": 680.0}
        ],
        "roads": [
            {
                "id": "id_r1", "name": "SH-40 Cheruthoni-Neriamangalam Highway", "length_km": 28.5,
                "coordinates": [[9.8450, 76.9740], [9.8550, 76.9650], [9.8700, 76.9450], [9.8850, 76.9200], [9.9000, 76.8950]]
            },
            {
                "id": "id_r2", "name": "NH-85 Kochi-Dhanushkodi Link", "length_km": 19.2,
                "coordinates": [[9.8750, 76.9300], [9.8800, 76.9400], [9.8900, 76.9600]]
            },
            {
                "id": "id_r3", "name": "High-Ground Evacuation Bypass Corridor", "length_km": 14.0,
                "coordinates": [[9.8450, 76.9800], [9.8600, 76.9850], [9.8750, 76.9700]]
            }
        ],
        "buildings": [
            {"id": "id_b1", "name": "Cheruthoni Residential Sector A", "lat": 9.8540, "lon": 76.9670, "count": 420},
            {"id": "id_b2", "name": "Cheruthoni Commercial District", "lat": 9.8520, "lon": 76.9690, "count": 280},
            {"id": "id_b3", "name": "Vazhathope Colony", "lat": 9.8620, "lon": 76.9570, "count": 310},
            {"id": "id_b4", "name": "Chelachuvadu Township", "lat": 9.8800, "lon": 76.9340, "count": 650},
            {"id": "id_b5", "name": "Lower Periyar Industrial Complex", "lat": 9.8890, "lon": 76.9180, "count": 190}
        ],
        "bridges": [
            {"id": "id_br1", "name": "Cheruthoni River Arch Bridge", "lat": 9.8515, "lon": 76.9705, "length_m": 120.0},
            {"id": "id_br2", "name": "Chelachuvadu Highway Bridge", "lat": 9.8780, "lon": 76.9370, "length_m": 85.0}
        ],
        "critical_infrastructure": [
            {"id": "id_ci1", "name": "Cheruthoni 220kV Electrical Substation", "category": "Power", "lat": 9.8560, "lon": 76.9640},
            {"id": "id_ci2", "name": "Idukki District General Hospital", "category": "Healthcare", "lat": 9.8500, "lon": 76.9720},
            {"id": "id_ci3", "name": "Periyar River Water Treatment Plant", "category": "Water", "lat": 9.8720, "lon": 76.9440},
            {"id": "id_ci4", "name": "Chelachuvadu Emergency Disaster Shelter", "category": "Shelter", "lat": 9.8810, "lon": 76.9500}
        ],
        "dem_grid_sample": {"min_elevation": 450.0, "max_elevation": 1100.0, "dam_crest": 720.0, "river_bed": 550.0},
        "observed_satellite_flood": {
            "source": "Sentinel-1 SAR Prototype Data (Idukki)",
            "acquisition_time": "2026-08-14T06:00:00Z",
            "polygon_geojson": {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [76.9760, 9.8430], [76.9690, 9.8520], [76.9570, 9.8620],
                        [76.9450, 9.8720], [76.9320, 9.8810], [76.9150, 9.8900],
                        [76.9000, 9.8990], [76.8920, 9.9050], [76.9080, 9.9120],
                        [76.9250, 9.8980], [76.9400, 9.8850], [76.9520, 9.8750],
                        [76.9650, 9.8650], [76.9740, 9.8550], [76.9800, 9.8450], [76.9760, 9.8430]
                    ]]
                },
                "properties": {"name": "Sentinel-1 Observed Flood Footprint (Idukki)", "area_km2": 24.5}
            }
        }
    },

    "tehri": {
        "id": "tehri",
        "name": "Tehri Dam & Bhagirathi River Reach",
        "state": "Uttarakhand",
        "dam": {
            "id": "dam_tehri_01",
            "name": "Tehri Hydro Development Dam",
            "river_name": "Bhagirathi River",
            "location": {"lat": 30.3780, "lon": 78.4800},
            "reservoir_level": 830.0,
            "initial_water_volume": 2600.0,
            "dam_elevation": 839.5,
            "dam_height": 260.5,
            "country": "India",
            "description": "Highest dam in India on Bhagirathi River in Tehri Garhwal, Uttarakhand."
        },
        "river": {
            "id": "river_bhagirathi_01",
            "name": "Bhagirathi River Reach",
            "study_area_id": "tehri",
            "polyline": [
                [30.3780, 78.4800], [30.3650, 78.4650], [30.3500, 78.4480],
                [30.3350, 78.4300], [30.3180, 78.4100], [30.3000, 78.3900], [30.2800, 78.3700]
            ]
        },
        "bounds": [[30.200, 78.300], [30.450, 78.550]],
        "dem_resolution_m": 30.0,
        "crs": "EPSG:4326",
        "status": "Prototype Dataset (Tehri Demo)",
        "river_polyline": [
            [30.3780, 78.4800], [30.3650, 78.4650], [30.3500, 78.4480],
            [30.3350, 78.4300], [30.3180, 78.4100], [30.3000, 78.3900], [30.2800, 78.3700]
        ],
        "villages": [
            {"id": "th_v1", "name": "Koteshwar Settlement", "lat": 30.3600, "lon": 78.4600, "population": 4200, "elevation": 610.0},
            {"id": "th_v2", "name": "New Tehri Suburb", "lat": 30.3720, "lon": 78.4720, "population": 25400, "elevation": 780.0},
            {"id": "th_v3", "name": "Panti Village", "lat": 30.3420, "lon": 78.4380, "population": 3100, "elevation": 560.0},
            {"id": "th_v4", "name": "Devprayag Confluence Town", "lat": 30.3150, "lon": 78.4100, "population": 7800, "elevation": 480.0},
            {"id": "th_v5", "name": "Kirti Nagar Relief Base", "lat": 30.2900, "lon": 78.3800, "population": 9200, "elevation": 450.0}
        ],
        "roads": [
            {
                "id": "th_r1", "name": "NH-34 Rishikesh-Tehri Garhwal Highway", "length_km": 34.2,
                "coordinates": [[30.3750, 78.4750], [30.3550, 78.4550], [30.3200, 78.4150], [30.2850, 78.3750]]
            },
            {
                "id": "th_r2", "name": "Devprayag High-Altitude Bypass", "length_km": 16.8,
                "coordinates": [[30.3700, 78.4850], [30.3400, 78.4600], [30.3100, 78.4200]]
            }
        ],
        "buildings": [
            {"id": "th_b1", "name": "Koteshwar Residential Colony", "lat": 30.3610, "lon": 78.4590, "count": 310},
            {"id": "th_b2", "name": "Devprayag Commercial Market", "lat": 30.3160, "lon": 78.4080, "count": 480}
        ],
        "bridges": [
            {"id": "th_br1", "name": "Devprayag Bhagirathi Suspension Bridge", "lat": 30.3160, "lon": 78.4090, "length_m": 110.0}
        ],
        "critical_infrastructure": [
            {"id": "th_ci1", "name": "Koteshwar Hydroelectric Power Station (400MW)", "category": "Power", "lat": 30.3580, "lon": 78.4620},
            {"id": "th_ci2", "name": "Devprayag Community Health Center", "category": "Healthcare", "lat": 30.3140, "lon": 78.4120}
        ],
        "dem_grid_sample": {"min_elevation": 420.0, "max_elevation": 1400.0, "dam_crest": 839.5, "river_bed": 580.0},
        "observed_satellite_flood": {
            "source": "Sentinel-1 SAR Prototype Data (Tehri)",
            "acquisition_time": "2026-07-20T10:00:00Z",
            "polygon_geojson": {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [78.4800, 30.3780], [78.4650, 30.3650], [78.4480, 30.3500],
                        [78.4300, 30.3350], [78.4100, 30.3180], [78.4200, 30.3150],
                        [78.4400, 30.3300], [78.4600, 30.3450], [78.4750, 30.3600],
                        [78.4850, 30.3750], [78.4800, 30.3780]
                    ]]
                },
                "properties": {"name": "Sentinel-1 Observed Footprint (Tehri)", "area_km2": 18.2}
            }
        }
    },

    "hirakud": {
        "id": "hirakud",
        "name": "Hirakud Dam & Mahanadi River Reach",
        "state": "Odisha",
        "dam": {
            "id": "dam_hirakud_01",
            "name": "Hirakud Multipurpose Dam",
            "river_name": "Mahanadi River",
            "location": {"lat": 21.5200, "lon": 83.8700},
            "reservoir_level": 192.0,
            "initial_water_volume": 5770.0,
            "dam_elevation": 200.0,
            "dam_height": 60.96,
            "country": "India",
            "description": "Longest earthen dam in the world across Mahanadi River in Sambalpur, Odisha."
        },
        "river": {
            "id": "river_mahanadi_01",
            "name": "Mahanadi River Reach",
            "study_area_id": "hirakud",
            "polyline": [
                [21.5200, 83.8700], [21.5050, 83.8900], [21.4880, 83.9100],
                [21.4700, 83.9350], [21.4500, 83.9600], [21.4300, 83.9900], [21.4100, 84.0200]
            ]
        },
        "bounds": [[21.350, 83.800], [21.600, 84.100]],
        "dem_resolution_m": 30.0,
        "crs": "EPSG:4326",
        "status": "Prototype Dataset (Hirakud Demo)",
        "river_polyline": [
            [21.5200, 83.8700], [21.5050, 83.8900], [21.4880, 83.9100],
            [21.4700, 83.9350], [21.4500, 83.9600], [21.4300, 83.9900], [21.4100, 84.0200]
        ],
        "villages": [
            {"id": "hk_v1", "name": "Burla Township", "lat": 21.5000, "lon": 83.8850, "population": 46000, "elevation": 165.0},
            {"id": "hk_v2", "name": "Sambalpur City Sector A", "lat": 21.4680, "lon": 83.9800, "population": 185000, "elevation": 150.0},
            {"id": "hk_v3", "name": "Maneswar Delta Village", "lat": 21.4400, "lon": 83.9700, "population": 12400, "elevation": 142.0},
            {"id": "hk_v4", "name": "Dhama Riverfront", "lat": 21.4150, "lon": 84.0100, "population": 8900, "elevation": 135.0}
        ],
        "roads": [
            {
                "id": "hk_r1", "name": "NH-53 Sambalpur-Bargarh Highway", "length_km": 42.0,
                "coordinates": [[21.5150, 83.8750], [21.4900, 83.9200], [21.4600, 83.9700], [21.4200, 84.0150]]
            },
            {
                "id": "hk_r2", "name": "Burla High-Ground Bypass", "length_km": 18.5,
                "coordinates": [[21.5250, 83.8800], [21.5100, 83.9100], [21.4800, 83.9500]]
            }
        ],
        "buildings": [
            {"id": "hk_b1", "name": "Burla Medical Colony", "lat": 21.4980, "lon": 83.8880, "count": 820},
            {"id": "hk_b2", "name": "Sambalpur Urban Sector", "lat": 21.4650, "lon": 83.9750, "count": 3400}
        ],
        "bridges": [
            {"id": "hk_br1", "name": "Mahanadi Railway & Road Bridge", "lat": 21.4650, "lon": 83.9450, "length_m": 1450.0}
        ],
        "critical_infrastructure": [
            {"id": "hk_ci1", "name": "Hirakud Hydro Power House 1 (275MW)", "category": "Power", "lat": 21.5180, "lon": 83.8750},
            {"id": "hk_ci2", "name": "VSSIMSAR Medical University & Hospital", "category": "Healthcare", "lat": 21.4950, "lon": 83.8920}
        ],
        "dem_grid_sample": {"min_elevation": 120.0, "max_elevation": 350.0, "dam_crest": 200.0, "river_bed": 135.0},
        "observed_satellite_flood": {
            "source": "Sentinel-1 SAR Prototype Data (Hirakud)",
            "acquisition_time": "2026-09-02T14:00:00Z",
            "polygon_geojson": {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [83.8700, 21.5200], [83.8900, 21.5050], [83.9100, 21.4880],
                        [83.9350, 21.4700], [83.9600, 21.4500], [83.9900, 21.4300],
                        [84.0200, 21.4100], [84.0400, 21.4000], [84.0250, 21.4250],
                        [83.9950, 21.4450], [83.9700, 21.4650], [83.9450, 21.4850],
                        [83.9200, 21.5000], [83.8950, 21.5150], [83.8700, 21.5200]
                    ]]
                },
                "properties": {"name": "Sentinel-1 Observed Footprint (Hirakud)", "area_km2": 48.6}
            }
        }
    },

    "bhakra": {
        "id": "bhakra",
        "name": "Bhakra Dam & Sutlej River Reach",
        "state": "Himachal Pradesh / Punjab",
        "dam": {
            "id": "dam_bhakra_01",
            "name": "Bhakra Concrete Gravity Dam",
            "river_name": "Sutlej River",
            "location": {"lat": 31.4120, "lon": 76.4350},
            "reservoir_level": 515.0,
            "initial_water_volume": 9340.0,
            "dam_elevation": 518.16,
            "dam_height": 225.55,
            "country": "India",
            "description": "Massive concrete gravity dam forming Gobind Sagar reservoir on Sutlej River."
        },
        "river": {
            "id": "river_sutlej_01",
            "name": "Sutlej River Reach",
            "study_area_id": "bhakra",
            "polyline": [
                [31.4120, 76.4350], [31.3950, 76.4500], [31.3780, 76.4700],
                [31.3600, 76.4900], [31.3400, 76.5150], [31.3200, 76.5400]
            ]
        },
        "bounds": [[31.250, 76.350], [31.500, 76.600]],
        "dem_resolution_m": 30.0,
        "crs": "EPSG:4326",
        "status": "Prototype Dataset (Bhakra Demo)",
        "river_polyline": [
            [31.4120, 76.4350], [31.3950, 76.4500], [31.3780, 76.4700],
            [31.3600, 76.4900], [31.3400, 76.5150], [31.3200, 76.5400]
        ],
        "villages": [
            {"id": "bk_v1", "name": "Nangal Township", "lat": 31.3700, "lon": 76.4800, "population": 48000, "elevation": 350.0},
            {"id": "bk_v2", "name": "Neilla Village", "lat": 31.3900, "lon": 76.4550, "population": 3400, "elevation": 380.0},
            {"id": "bk_v3", "name": "Anandpur Sahib Suburb", "lat": 31.3450, "lon": 76.5100, "population": 22500, "elevation": 320.0},
            {"id": "bk_v4", "name": "Kiratpur Sahib Settlement", "lat": 31.3200, "lon": 76.5450, "population": 16200, "elevation": 300.0}
        ],
        "roads": [
            {
                "id": "bk_r1", "name": "NH-205 Chandigarh-Manali Highway", "length_km": 38.0,
                "coordinates": [[31.4100, 76.4400], [31.3800, 76.4750], [31.3500, 76.5100], [31.3150, 76.5500]]
            }
        ],
        "buildings": [
            {"id": "bk_b1", "name": "Nangal Fertilizer Industrial Colony", "lat": 31.3680, "lon": 76.4820, "count": 1250},
            {"id": "bk_b2", "name": "Anandpur Residential Township", "lat": 31.3420, "lon": 76.5120, "count": 1890}
        ],
        "bridges": [
            {"id": "bk_br1", "name": "Nangal Dam Sutlej Aqueduct Bridge", "lat": 31.3720, "lon": 76.4780, "length_m": 420.0}
        ],
        "critical_infrastructure": [
            {"id": "bk_ci1", "name": "Bhakra Left & Right Bank Power Houses (1325MW)", "category": "Power", "lat": 31.4110, "lon": 76.4380},
            {"id": "bk_ci2", "name": "Nangal Water Intake & Treatment Facility", "category": "Water", "lat": 31.3650, "lon": 76.4850}
        ],
        "dem_grid_sample": {"min_elevation": 280.0, "max_elevation": 850.0, "dam_crest": 518.16, "river_bed": 310.0},
        "observed_satellite_flood": {
            "source": "Sentinel-1 SAR Prototype Data (Bhakra)",
            "acquisition_time": "2026-08-28T08:00:00Z",
            "polygon_geojson": {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [76.4350, 31.4120], [76.4500, 31.3950], [76.4700, 31.3780],
                        [76.4900, 31.3600], [76.5150, 31.3400], [76.5400, 31.3200],
                        [76.5550, 31.3100], [76.5350, 31.3300], [76.5050, 31.3500],
                        [76.4800, 31.3700], [76.4600, 31.3900], [76.4400, 31.4100], [76.4350, 31.4120]
                    ]]
                },
                "properties": {"name": "Sentinel-1 Observed Footprint (Bhakra)", "area_km2": 32.4}
            }
        }
    }
}
