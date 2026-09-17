-- PostgreSQL / PostGIS Schema for Dam Break Inundation Modelling Platform
-- SIH 2026 Problem Statement ID 26161

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Study Areas & Dams
CREATE TABLE dams (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    river_name VARCHAR(255) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    reservoir_level_m DOUBLE PRECISION NOT NULL,
    initial_water_volume_mcm DOUBLE PRECISION NOT NULL,
    dam_elevation_m DOUBLE PRECISION NOT NULL,
    dam_height_m DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE study_areas (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    dam_id VARCHAR(50) REFERENCES dams(id),
    bounds_geojson JSONB NOT NULL,
    dem_resolution_m DOUBLE PRECISION DEFAULT 30.0,
    crs VARCHAR(50) DEFAULT 'EPSG:4326'
);

-- 2. Scenarios
CREATE TABLE scenarios (
    id VARCHAR(50) PRIMARY KEY,
    study_area_id VARCHAR(50) REFERENCES study_areas(id),
    breach_width_m DOUBLE PRECISION NOT NULL,
    breach_height_m DOUBLE PRECISION NOT NULL,
    breach_formation_time_min DOUBLE PRECISION NOT NULL,
    preset_name VARCHAR(100),
    reservoir_level_m DOUBLE PRECISION NOT NULL,
    initial_water_volume_mcm DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Simulations
CREATE TABLE simulations (
    id VARCHAR(50) PRIMARY KEY,
    scenario_id VARCHAR(50) REFERENCES scenarios(id),
    status VARCHAR(50) NOT NULL, -- 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED'
    sph_peak_flow_m3s DOUBLE PRECISION,
    delft3d_peak_flow_m3s DOUBLE PRECISION,
    sph_area_km2 DOUBLE PRECISION,
    delft3d_area_km2 DOUBLE PRECISION,
    iou_score DOUBLE PRECISION,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Inundation Spatial Outputs (PostGIS Polygons)
CREATE TABLE simulation_spatial_results (
    id SERIAL PRIMARY KEY,
    simulation_id VARCHAR(50) REFERENCES simulations(id),
    engine_name VARCHAR(50) NOT NULL, -- 'SPH' or 'Delft3D'
    time_hour DOUBLE PRECISION NOT NULL,
    flooded_area_km2 DOUBLE PRECISION NOT NULL,
    max_depth_m DOUBLE PRECISION NOT NULL,
    max_velocity_ms DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Polygon, 4326) NOT NULL
);

-- Spatial Indices
CREATE INDEX idx_dams_geom ON dams USING GIST(location);
CREATE INDEX idx_spatial_results_geom ON simulation_spatial_results USING GIST(geom);
