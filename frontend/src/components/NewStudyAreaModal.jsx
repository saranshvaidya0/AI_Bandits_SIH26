import React, { useState } from 'react';
import { PlusCircle, Upload, X } from 'lucide-react';
import { createCustomStudyArea } from '../services/api';

export default function NewStudyAreaModal({ isOpen, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    state: '',
    dam_name: '',
    river_name: '',
    lat: 18.5204,
    lon: 73.8567,
    reservoir_level: 600.0,
    dam_height: 120.0,
    initial_volume: 2500.0
  });

  const [riverGeoJson, setRiverGeoJson] = useState(null);
  const [observedGeoJson, setObservedGeoJson] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e, setTargetState) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        setTargetState(parsed);
      } catch (err) {
        console.warn("File parsed fallback.");
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        river_geojson: riverGeoJson,
        observed_flood_geojson: observedGeoJson
      };
      const res = await createCustomStudyArea(payload);
      if (res && res.study_area_id) {
        onCreated(res.study_area);
        onClose();
      }
    } catch (err) {
      alert("Error creating custom study area: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md z-50 flex items-center justify-center p-4" style={{ background: 'var(--bg-overlay)' }}>
      <div className="glass-panel rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden" style={{ border: '1px solid var(--border-strong)' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-accent)', background: 'var(--bg-elevated)' }}>
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-[#38bdf8]" />
            <h2 className="text-base font-black text-slate-100">
              Create New Custom Study Area & Location
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto" style={{ background: 'var(--bg-surface)' }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#38bdf8] uppercase">Study Area Name</label>
              <input
                required
                type="text"
                placeholder="e.g. Koyna Dam Reach"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full mt-1 bg-[#061a38] border border-[#38bdf8]/40 rounded-lg p-2 text-xs text-slate-100 focus:border-[#38bdf8] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#38bdf8] uppercase">State / Region</label>
              <input
                required
                type="text"
                placeholder="e.g. Maharashtra"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full mt-1 bg-[#061a38] border border-[#38bdf8]/40 rounded-lg p-2 text-xs text-slate-100 focus:border-[#38bdf8] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#38bdf8] uppercase">Dam Facility Name</label>
              <input
                required
                type="text"
                placeholder="e.g. Koyna Hydro Dam"
                value={formData.dam_name}
                onChange={(e) => setFormData({ ...formData, dam_name: e.target.value })}
                className="w-full mt-1 bg-[#061a38] border border-[#38bdf8]/40 rounded-lg p-2 text-xs text-slate-100 focus:border-[#38bdf8] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#38bdf8] uppercase">River Name</label>
              <input
                required
                type="text"
                placeholder="e.g. Koyna River"
                value={formData.river_name}
                onChange={(e) => setFormData({ ...formData, river_name: e.target.value })}
                className="w-full mt-1 bg-[#061a38] border border-[#38bdf8]/40 rounded-lg p-2 text-xs text-slate-100 focus:border-[#38bdf8] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#38bdf8] uppercase">Dam Latitude</label>
              <input
                required
                type="number" step="any"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 bg-[#061a38] border border-[#38bdf8]/40 rounded-lg p-2 text-xs text-slate-100 focus:border-[#38bdf8] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#38bdf8] uppercase">Dam Longitude</label>
              <input
                required
                type="number" step="any"
                value={formData.lon}
                onChange={(e) => setFormData({ ...formData, lon: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 bg-[#061a38] border border-[#38bdf8]/40 rounded-lg p-2 text-xs text-slate-100 focus:border-[#38bdf8] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-300 uppercase">Reservoir Level (m)</label>
              <input
                type="number"
                value={formData.reservoir_level}
                onChange={(e) => setFormData({ ...formData, reservoir_level: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 bg-[#061a38] border border-[#38bdf8]/40 rounded-lg p-2 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-300 uppercase">Dam Height (m)</label>
              <input
                type="number"
                value={formData.dam_height}
                onChange={(e) => setFormData({ ...formData, dam_height: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 bg-[#061a38] border border-[#38bdf8]/40 rounded-lg p-2 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-300 uppercase">Volume (MCM)</label>
              <input
                type="number"
                value={formData.initial_volume}
                onChange={(e) => setFormData({ ...formData, initial_volume: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 bg-[#061a38] border border-[#38bdf8]/40 rounded-lg p-2 text-xs text-slate-100"
              />
            </div>
          </div>

          <div className="p-4 bg-[#061a38] border border-[#38bdf8]/30 rounded-xl space-y-2">
            <h4 className="text-xs font-black text-[#38bdf8] uppercase flex items-center gap-1.5">
              <Upload className="w-4 h-4" />
              Upload Geospatial Files (Optional GeoJSON / GeoTIFF)
            </h4>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">River Geometry / DEM</label>
                <input
                  type="file"
                  accept=".geojson,.json,.tif,.tiff"
                  onChange={(e) => handleFileUpload(e, setRiverGeoJson)}
                  className="text-[10px] text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:bg-[#0284c7] file:text-white hover:file:bg-[#0369a1]"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Observed Flood GeoJSON</label>
                <input
                  type="file"
                  accept=".geojson,.json"
                  onChange={(e) => handleFileUpload(e, setObservedGeoJson)}
                  className="text-[10px] text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:bg-[#0284c7] file:text-white hover:file:bg-[#0369a1]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#061a38] border border-[#38bdf8]/30 text-slate-300 rounded-xl text-xs font-bold hover:bg-[#0284c7]/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 btn-blue-gradient rounded-xl text-xs font-black shadow-lg"
            >
              {isSubmitting ? "Registering Location..." : "Register Location"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
