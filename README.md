# Dam Break Inundation Modelling Platform

> **Smart India Hackathon 2026 Problem Statement ID**: 26161  
> **Title**: Dam Break Inundation Modelling Using Hydrodynamic Modelling of any River  
> **Domain**: Hydrodynamic Simulation, Geospatial Analysis, Disaster Support & Evacuation Intelligence

---

## Executive Overview

This web-based prototype provides an end-to-end flood simulation and decision-support platform for dam breach scenarios. The platform combines 3D Smoothed Particle Hydrodynamics (SPH - DualSPHysics concept) and 2D Depth-Averaged Shallow Water Equations (Delft3D FM concept) to model dam break wave propagation, inundation extent, water depth, flow velocity, and spatiotemporal progression.

---

## 🏗️ Software Architecture

```
                 React 18 + Vite + Leaflet Frontend
                                 │
                     FastAPI REST Backend (Python 3.13)
                                 │
     ┌───────────────────────────┴───────────────────────────┐
     ▼                                                       ▼
Geospatial & Hydrodynamic Core                      Decision Support Engine
 - GeoJSON / Raster spatial engine                  - Asset impact overlay (Villages, Roads)
 - Breach hydrograph generator                      - Evacuation routing & high ground
 - SPH Engine vs Delft3D Engine                     - Sensitivity / Uncertainty matrix
 - Spatial IoU calculator (Intersection/Union)      - PDF Report Generator
 - Satellite validation matching
```

---

## ⚡ Features & Capabilities

1. **Multi-Step Guided Workflow**:
   - **Step 1 — Study Area Selection**: Interactive demo study area (Idukki Dam & Periyar River Basin, Kerala / Tehri Dam, Uttarakhand).
   - **Step 2 — Data Catalog**: DEM, river network polylines, dam location, satellite observed flood footprint, villages, roads, buildings, bridges, and power infrastructure.
   - **Step 3 — Scenario Generation**: Configurable reservoir water level, storage volume (MCM), breach width, breach height, formation time, and presets (*Small Breach*, *Medium Breach*, *Large Breach*).
   - **Step 4 — Hydrodynamic Simulation Pipeline**: Multi-stage progress workflow generating spatiotemporal flood layers ($t = 1\text{h}, 2\text{h}, 4\text{h}, 8\text{h}, 12\text{h}, 24\text{h}$).
   - **Step 5 — SPH vs Delft3D Model Comparison**: Quantitative comparison matrix (Peak Flow $Q_{peak}$, Flood Area $\text{km}^2$, Max Depth, Max Velocity), % difference, and **Spatial Intersection over Union (IoU)**.
   - **Step 6 — Satellite Remote Sensing Validation**: Simulated flood vs observed Sentinel-1 SAR flood footprint matching with IoU, precision, and recall scores.
   - **Step 7 — Uncertainty & Sensitivity Analysis**: Multi-scenario breach parameter variation ($20\text{m} - 80\text{m}$ breach width) with interactive Recharts line graphs.
   - **Step 8 — Infrastructure Vulnerability Impact Assessment**: Automatic spatial overlay identifying submerged villages, roads ($\text{km}$), buildings, bridges, and critical facilities with risk ratings (*High*, *Medium*, *Low*, *Safe*).
   - **Step 9 — Evacuation Decision Support**: Identification of high-ground safe refuge shelters, clear vs flooded evacuation corridors, and official disaster management disclaimers.
   - **Executive PDF Report Export**: Automated report generator creating styled downloadable executive summaries.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Leaflet, React-Leaflet, Tailwind CSS, Lucide Icons, Recharts, html2pdf.js.
- **Backend**: Python 3.13, FastAPI, Uvicorn, Pydantic, NumPy, Shapely.
- **Database**: PostgreSQL / PostGIS (schema provided in `database/schema.sql`).

---

## 🚀 Quick Start & Running Locally

### 1. Backend Setup (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python start_backend.py
```
FastAPI server runs on `http://127.0.0.1:8000` (API Docs at `http://127.0.0.1:8000/docs`).

### 2. Frontend Setup (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔬 Scientific Honesty & Adapter Architecture

> [!NOTE]
> **Prototype Data Labeling**
> All outputs produced by the prototype are clearly labeled as **"Simulation / Prototype Data"**.

### Connecting Real Executables (DualSPHysics & Delft3D)
The backend employs a modular `BaseHydroEngine` abstraction:
- `MockSPHEngine` & `MockDelft3DEngine`: Generate deterministic hydrodynamic spatial distributions out of the box.
- `DualSPHysicsAdapter` (`backend/app/engines/adapters/dualsphysics_adapter.py`): CLI wrapper for GenCase and `DualSPHysics5.0_win64.exe`.
- `Delft3DAdapter` (`backend/app/engines/adapters/delft3d_adapter.py`): CLI wrapper for `dflowfm.exe --path=mdu_file`.

---

## 📐 Spatial IoU Formula

$$\text{IoU} = \frac{\text{Area}(\text{Polygon}_{\text{SPH}} \cap \text{Polygon}_{\text{Delft3D}})}{\text{Area}(\text{Polygon}_{\text{SPH}} \cup \text{Polygon}_{\text{Delft3D}})}$$

- **High IoU ($>75\%$)**: Strong spatial agreement between particle (SPH) and grid (Delft3D) hydrodynamic models.
- **Spatial Overlap & Difference Layers**: Toggled directly on the interactive Leaflet GIS map.
