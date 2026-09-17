import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet Default Icon Paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons with Cyan-Blue Theme
const damIcon = L.divIcon({
  className: 'custom-dam-marker',
  html: `<div style="background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%); color:white; border:2px solid #7dd3fc; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-bold:bold; font-size:14px; box-shadow: 0 0 15px rgba(56,189,248,0.85);">📍</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const villageIcon = (isAffected) => L.divIcon({
  className: 'custom-village-marker',
  html: `<div style="background-color:${isAffected ? '#ef4444' : '#10b981'}; color:white; border:2px solid white; width:22px; height:22px; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:11px; box-shadow: 0 0 10px ${isAffected ? 'rgba(239,68,68,0.8)' : 'rgba(16,185,129,0.5)'};">🏘️</div>`,
  iconSize: [22, 22]
});

const shelterIcon = L.divIcon({
  className: 'custom-shelter-marker',
  html: `<div style="background-color:#0284c7; color:white; border:2px solid #38bdf8; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; box-shadow: 0 0 12px rgba(56,189,248,0.6);">🏥</div>`,
  iconSize: [26, 26]
});

function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 12, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

export default function MapView({
  studyArea,
  simulationResult,
  activeTimeHour,
  visibleLayers,
  comparisonMode
}) {
  const saId = studyArea?.id || 'idukki';

  const center = useMemo(() => {
    if (studyArea?.dam?.location) {
      return [studyArea.dam.location.lat, studyArea.dam.location.lon];
    }
    return [9.8430, 76.9760];
  }, [studyArea]);

  const activeSimResult = useMemo(() => {
    if (simulationResult && simulationResult.study_area_id === saId) {
      return simulationResult;
    }
    return null;
  }, [simulationResult, saId]);

  const sphTimeFrame = useMemo(() => {
    if (!activeSimResult?.sph_result?.time_frames) return null;
    return activeSimResult.sph_result.time_frames.find(tf => tf.time_hour === activeTimeHour) || activeSimResult.sph_result.time_frames[0];
  }, [activeSimResult, activeTimeHour]);

  const d3dTimeFrame = useMemo(() => {
    if (!activeSimResult?.delft3d_result?.time_frames) return null;
    return activeSimResult.delft3d_result.time_frames.find(tf => tf.time_hour === activeTimeHour) || activeSimResult.delft3d_result.time_frames[0];
  }, [activeSimResult, activeTimeHour]);

  const riverPolyline = studyArea?.river_polyline || studyArea?.river?.polyline || [];

  return (
    <div className="relative w-full h-full glass-panel overflow-hidden border border-[#38bdf8]/25 shadow-2xl">
      <MapContainer
        center={center}
        zoom={12}
        className="w-full h-full z-10"
        zoomControl={false}
      >
        <MapController center={center} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          maxNativeZoom={19}
        />

        {/* River Polyline */}
        {visibleLayers.river && riverPolyline.length > 0 && (
          <Polyline
            key={`river_${saId}`}
            positions={riverPolyline}
            pathOptions={{ color: '#38bdf8', weight: 4, opacity: 0.85 }}
          />
        )}

        {/* Dam Location Marker */}
        {studyArea?.dam && (
          <Marker
            key={`dam_${saId}_${studyArea.dam.id}`}
            position={[studyArea.dam.location.lat, studyArea.dam.location.lon]}
            icon={damIcon}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-sm text-[#38bdf8]">{studyArea.dam.name}</h3>
                <p className="text-xs text-slate-300">River: {studyArea.dam.river_name}</p>
                <p className="text-xs text-slate-300">Reservoir Level: {studyArea.dam.reservoir_level} m MSL</p>
                <p className="text-xs text-slate-300">Dam Height: {studyArea.dam.dam_height} m</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* SPH Flood Extent GeoJSON */}
        {visibleLayers.sph_flood && sphTimeFrame && (comparisonMode === 'sph' || comparisonMode === 'both') && (
          <GeoJSON
            key={`sph_${saId}_${activeTimeHour}_${sphTimeFrame.flooded_area_km2}`}
            data={sphTimeFrame.flood_polygon_geojson}
            style={{
              fillColor: '#0284c7',
              fillOpacity: 0.65,
              color: '#38bdf8',
              weight: 2
            }}
          />
        )}

        {/* Delft3D Flood Extent GeoJSON */}
        {visibleLayers.delft3d_flood && d3dTimeFrame && (comparisonMode === 'delft3d' || comparisonMode === 'both') && (
          <GeoJSON
            key={`d3d_${saId}_${activeTimeHour}_${d3dTimeFrame.flooded_area_km2}`}
            data={d3dTimeFrame.flood_polygon_geojson}
            style={{
              fillColor: '#0ea5e9',
              fillOpacity: 0.5,
              color: '#7dd3fc',
              weight: 2,
              dashArray: '4, 4'
            }}
          />
        )}

        {/* Overlap Layer */}
        {visibleLayers.overlap && activeSimResult?.comparison?.overlap_polygon_geojson && (
          <GeoJSON
            key={`overlap_${saId}_${activeSimResult.simulation_id}`}
            data={activeSimResult.comparison.overlap_polygon_geojson}
            style={{
              fillColor: '#0369a1',
              fillOpacity: 0.75,
              color: '#38bdf8',
              weight: 2.5
            }}
          />
        )}

        {/* Difference Map Layer */}
        {visibleLayers.difference && activeSimResult?.comparison?.difference_grid_geojson && (
          <GeoJSON
            key={`diff_${saId}_${activeSimResult.simulation_id}`}
            data={activeSimResult.comparison.difference_grid_geojson}
            style={{
              fillColor: '#38bdf8',
              fillOpacity: 0.55,
              color: '#7dd3fc',
              weight: 1.5
            }}
          />
        )}

        {/* Satellite Observed Layer */}
        {visibleLayers.satellite && studyArea?.observed_satellite_flood && (
          <GeoJSON
            key={`sat_${saId}`}
            data={studyArea.observed_satellite_flood.polygon_geojson}
            style={{
              fillColor: '#38bdf8',
              fillOpacity: 0.45,
              color: '#0284c7',
              weight: 2,
              dashArray: '6, 6'
            }}
          />
        )}

        {/* Downstream Villages Markers */}
        {visibleLayers.villages && studyArea?.villages?.map((v) => {
          const isAff = activeSimResult?.impact?.assets?.some(a => a.asset_id === v.id && a.risk_level !== 'Safe');
          return (
            <Marker key={`v_${saId}_${v.id}`} position={[v.lat, v.lon]} icon={villageIcon(isAff)}>
              <Popup>
                <div className="p-1">
                  <h4 className="font-bold text-xs text-slate-100">{v.name}</h4>
                  <p className="text-[11px] text-slate-300">Population: {v.population}</p>
                  <p className="text-[11px] text-slate-300">Elevation: {v.elevation}m MSL</p>
                  <p className="text-[11px] font-semibold mt-1" style={{ color: isAff ? '#ef4444' : '#10b981' }}>
                    Status: {isAff ? 'INUNDATED (HIGH RISK)' : 'SAFE'}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Evacuation Safe Refuge Shelters */}
        {visibleLayers.evacuation && activeSimResult?.evacuation?.safe_zones?.map((sz) => (
          <Marker key={`sz_${saId}_${sz.id}`} position={[sz.lat, sz.lon]} icon={shelterIcon}>
            <Popup>
              <div className="p-1">
                <h4 className="font-bold text-xs text-[#38bdf8]">{sz.name}</h4>
                <p className="text-[11px] text-slate-300">Elevation: {sz.elevation_m}m MSL</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Evacuation Routes */}
        {visibleLayers.evacuation && activeSimResult?.evacuation?.evacuation_routes?.map((route) => (
          <GeoJSON
            key={`er_${saId}_${route.route_id}`}
            data={route.geojson}
            style={{
              color: route.status.includes('Clear') ? '#10b981' : '#ef4444',
              weight: route.status.includes('Clear') ? 4 : 3,
              dashArray: route.status.includes('Clear') ? null : '6, 6'
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
