# Sentinel-1 Flood Mapping

Google Earth Engine - Configurable, Probability-Based Workflow (with optional SLC coherence)

----

This Gist contains a Google Earth Engine (GEE) JavaScript script for rapid flood mapping using Sentinel-1 SAR (GRD), designed for **research, simulation, and operational prototyping** where you want **many tunable parameters** rather than a fixed “black box” result.

GEE link: https://code.earthengine.google.com/f4ebbc6907ca02f7ea5ecf0d88c2b5b7

## 1. Background and motivation

World Bank’s [GOST](https://worldbank.github.io/GOST/README.html) has used SAR for multiple applications, including flood mapping (see the broader tooling repo: https://github.com/worldbank/GOST_SAR/).

During hydrometeorological disasters, the United Nations Satellite Centre ([UNOSAT](https://unosat.org/)) often supports humanitarian response by releasing **free rapid satellite-derived flood/impact products**, frequently leveraging Sentinel-1 SAR. These products are extremely useful for rapid situational awareness, but—as with any Earth Observation workflow—results may **over-detect** or **miss** flooded areas depending on acquisition timing, land cover, wind/rough water, terrain artefacts, and thresholding assumptions. Field verification remains essential.

This script is intended to **fill the “tuning gap”**: it implements a transparent SAR flood-mapping workflow with **open configuration** so analysts can adjust AOI definition, compositing, thresholds, weighting, masking, and export settings for different events and landscapes.

---

## 2. What the script does (high level)

### Core mapping outputs
- Produces a **continuous flood probability** raster (0–1) by combining multiple SAR-based evidence layers.
- Produces a **binary flood extent** mask after plausibility masking and post-processing.

### Evidence layers (GRD)
The workflow uses Sentinel-1 GRD composites and combines:
1. **ΔVV (post − pre)** change detection with Otsu thresholding
2. **VV post-event darkness** (Otsu thresholding)
3. **VH/VV ratio** (where VH − VV in dB is large, typical for open water)

Each evidence term is converted into a soft probability and combined via configurable weights.

### Multi-orbit robustness
- Processes **ascending and descending** orbits separately.
- Fuses per-orbit probabilities using a **max** operator to reduce false negatives (configurable).

### Physics-based plausibility masks
To reduce artefacts and implausible detections, the script applies:
- **Slope** constraint (removes steep terrain where radar shadow/layover can mimic dark water)
- **HAND** (Height Above Nearest Drainage) constraint (keeps low terrain near drainage network)
- **Permanent water exclusion** using JRC Global Surface Water occurrence

### Meteorology cross-check layers
Adds optional diagnostic layers and time series to support plausibility checking:
- IMERG precipitation accumulation and time series (rate + cumulative)
- ECMWF IFS precipitation rate, vorticity (850 hPa), and 10m wind speed

### Optional: Sentinel-1 SLC coherence fusion (advanced)
If you compute coherence externally (SNAP / HyP3 / ISCE2 / Gamma) and upload to GEE, the script can fuse:
- GRD probability (dominant)
- Coherence-based probability (supporting evidence)

---

## 3. Example event context: Cyclone / Tropical Depression Senyar (late Nov 2025)

In late November 2025, Cyclone Senyar / TD-34W reportedly produced severe flooding and landslides across parts of Sumatra, including Aceh and North Sumatra. UNOSAT and other actors commonly publish rapid EO-derived extents in such events https://experience.arcgis.com/experience/21c23ad9ae04421ea818a34471143fcd/page/UNOSAT?views=Home, but analyst tuning and field validation remain crucial.

This script includes an example event window in `CONFIG.DATES` (you should adjust to your case).

### Case example: 

This example illustrates how the workflow can be configured and interpreted for an inland, mountainous AOI, where SAR artefacts (shadow/layover), steep slopes, and AOI geometry can influence thresholds and mapped extents. 

* **Blangkejeren (Gayo Lues, Aceh, Indonesia)**

  Blangkejeren town center is approximately at [3.995461°N, 97.341347°E](https://maps.app.goo.gl/X299DFATrqoWBXbR7).

  Figure 1 - GEE run (annotated)

  <img width="1919" height="1113" alt="Screenshot 2026-01-09 114552" src="https://gist.github.com/user-attachments/assets/4e65e848-d360-4f73-b5e9-8339770256ce" />

  *Figure 1. Screenshot from Google Earth Engine Code Editor showing the fused flood-probability output and/or flood mask for the Blangkejeren AOI. The **red circle** highlights a reference landmark (the bridge across the Aih Bobo River) that is reported to have collapsed, as shown in Figure 2.*

  Figure 2 - Field situation (reference photo)

  ![Figure 2 - Aerial view of flood damage in Desa Rigeb, Kecamatan Blangkejeren, Kabupaten Gayo Lues, Aceh (2 Dec 2025). Source: ANTARA Foto.](https://img.antaranews.com/cache/1200x800/2025/12/03/Dampak-banjir-bandang-di-Gayo-Lues-Aceh-02122025-thy-1.jpg)

  *Figure 2. Photo credit: **ANTARA FOTO/Taufik Hidayat/rwa**. Source page: https://www.antaranews.com/foto/5283929/banjir-bandang-putus-akses-utama-gayo-lues.*

* **Jembatan Kembar Silaing (Padang Panjang, Sumatera Barat, Indonesia)**

  The bridge location is at [-0.475659, 100.367263](https://maps.app.goo.gl/yQeiAHbTwQq8kAUK8)

  Figure 3 - GEE run (annotated)

  <img width="1919" height="1119" alt="Screenshot 2025-12-03 153849" src="https://gist.github.com/user-attachments/assets/11cc5ee6-63b2-43fd-a16d-277a5486e2f3" />

  *Figure 3. Screenshot from Google Earth Engine Code Editor showing the fused flood-probability output and/or flood mask for the Padang Panjang AOI. The **red circle** indicates the location of the damaged Jembatan Kembar Silaing, as shown in Figure 4.*

  Figure 4 - Field situation (reference photo)

  ![Figure 4 - Flood/debris impact around Padang Panjang (Nov 2025). Source: Wikimedia Commons.](https://upload.wikimedia.org/wikipedia/commons/7/71/Galodo_Padang_Panjang_-_Nov_2025.jpg)

  *Figure 4. Photo credit: **Rahmatdenas** (27 Nov 2025), licensed **CC BY 4.0** via Wikimedia Commons.  
Source page: https://commons.wikimedia.org/wiki/File:Galodo_Padang_Panjang_-_Nov_2025.jpg (License: https://creativecommons.org/licenses/by/4.0/).*

---

## 4. Datasets used (default)

- Sentinel-1 GRD: `COPERNICUS/S1_GRD`
- Copernicus DEM: `COPERNICUS/DEM/GLO30`
- MERIT Hydro HAND (via a public GEE asset collection used in-script)
- JRC Global Surface Water: `JRC/GSW1_4/GlobalSurfaceWater`
- NASA GPM IMERG v07 (Daily): `NASA/GPM_L3/IMERG_V07`
- ECMWF IFS (forecast archive): `ECMWF/IFS/0P25_HOURLY`

Note: dataset IDs are configurable in the script.

---

## 5. Outputs

### Map layers (in the GEE Map)
Primary:
- **Flood Probability (Fused)** (0–1)
- **Flood Extent (binary)** (0/1)

Diagnostics (toggle on as needed):
- Per-orbit layers (pre/post VV, ΔVV, flood probability)
- Plausibility mask layers: Permanent water, HAND, slope
- Meteorology layers: IMERG accumulation, IFS diagnostics

### Console outputs
- Image counts per orbit / window (useful sanity checks)
- Threshold diagnostics (Otsu)
- Flooded area summary (hectares)

### Optional exports (GeoTIFF to Google Drive)
When enabled, the script queues exports for:
1. `FloodProb_Fused_YYYY-MM-DD.tif` (Float32, 0–1)
2. `FloodMask_YYYY-MM-DD.tif` (Byte, 0/1)
3. `IMERGaccum_YYYY-MM-DD.tif` (Float32, mm)
4. `IFSdiagnostics_YYYY-MM-DD.tif` (Float32, multiband)

Important: exports appear in the **Tasks** tab and require manual **RUN**.

---

## 6. Quick start

1. Open Google Earth Engine Code Editor: https://code.earthengine.google.com/
2. Paste the script (or load from your Gist).
3. Edit **only the CONFIG block first**.

### Step 1 - Set dates
In `CONFIG.DATES`, set:
- `eventStart` (YYYY-MM-DD)
- `eventEnd` (YYYY-MM-DD, inclusive)
- `baselineDays` (recommended 30–60 for many events)

Example (already in script as a template):
```js
DATES: {
  eventStart: '2025-11-22',
  eventEnd:   '2025-12-07',
  baselineDays: 60
},
````

### Step 2 - Set AOI (5 modes)

`CONFIG.AOI.mode` supports:

* `GAUL`  : admin lookup using GAUL 2024 L2
* `ASSET` : your uploaded FeatureCollection
* `DRAWN` : draw geometry in the Code Editor (Imports panel) named `geometry`
* `PASTE` : paste `var geometry = ee.Geometry(...)`
* `AUTO`  : tries ASSET → PASTE → GAUL

If using `GAUL`, set:

```js
GAUL: {
  adminDataset: 'projects/sat-io/open-datasets/FAO/GAUL/GAUL_2024_L2',
  gaul0_name: 'Indonesia',
  gaul1_name: 'Aceh',
  gaul2_name: 'Aceh Utara'
}
```

### Step 3 - Run and inspect

* Run the script.
* Inspect the primary layers:

  * Flood Probability (Fused)
  * Flood Extent (binary)
* Toggle on diagnostics to understand behaviour:

  * Per-orbit ΔVV, post VV, and per-orbit probability
  * Permanent water, HAND, slope

---

## 7. Configuration guide (what you will most often tune)

### `CONFIG.SCORE` (probability fusion)

Controls weights for evidence layers:

* change detection (ΔVV)
* absolute darkness (VV post)
* VH/VV ratio

Typical tuning pattern:

* Increase `w_change` if your baseline is stable and flood is clearly “new water”
* Increase `w_abs` if post-event water is consistently dark and baseline is noisy
* Increase `w_ratio` when VH/VV separation is strong (often in open water / wetlands)

### `CONFIG.MASKS` (plausibility thresholds)

* `maxSlopeDeg`  (default ~5°)
* `maxHANDm`     (default ~40 m)
* permanent water occurrence threshold (e.g., 85%)

Typical tuning pattern:

* Coastal/pluvial flooding: HAND may be too strict → increase `maxHANDm` or disable HAND masking for testing
* Mountainous AOI: keep slope masking on; consider stricter slope threshold

### `CONFIG.POST` (final binary mask)

* `floodProbThreshold` (default around 0.35)
* `minConnectedPixels` (speckle removal)
* optional morphology (smoothing)

Typical tuning pattern:

* Too conservative (missing flood): lower `floodProbThreshold`
* Too much noise: increase `minConnectedPixels` and/or raise `floodProbThreshold`

### `CONFIG.HIST` (Otsu stability / performance)

If you hit memory limits or see unstable thresholds in coastal AOIs:

* enable sampling-based histograms
* constrain histogram masks (DEM footprint + exclude permanent water)
* increase `tileScale` in reductions

---

## 8. Optional: SLC coherence fusion (advanced)

GEE does not provide Sentinel-1 SLC coherence by default. If you want to add coherence evidence:

1. Compute coherence externally (SNAP / ASF HyP3 / ISCE2 / Gamma)
2. Export coherence GeoTIFF (0–1)
3. Upload GeoTIFF to GEE Assets
4. Update:

   * `CONFIG.COH.eventCohAssetId`
   * (optional) `CONFIG.COH.preCohAssetId`
5. Set `CONFIG.COH.enabled = true`

Fusion logic (default):

* Final = `w_grd * P_grd + w_coh * P_coh` (GRD dominant, coherence supporting)

Tuning:

* `lowCohThresh` (lower = more sensitive, higher = stricter)
* `cohDropThresh` (how much coherence must drop from pre to event)

When to skip coherence:

* No SLC processing capacity
* Dense vegetation / agriculture where coherence is naturally low
* Very rapid events where suitable SLC pairs are not available

---

## 9. Exporting results

1. Set:

```js
CONFIG.EXPORT.enabled = true
```

2. Re-run the script.
3. Open **Tasks** (top-right in Code Editor) and click **RUN** for each queued export.
4. Outputs appear in Google Drive under `CONFIG.EXPORT.folder` (default: `GEE_FLOOD`).

---

## 10. Recommended validation workflow (practical)

1. Compare the flood extent with:

   * Local situation reports / field photos / drone reconnaissance (if available)
   * High-resolution optical imagery (if cloud permits) for sanity checks
   * UNOSAT or other rapid-mapping products as a first-order reference

2. Use meteorology layers:
   * SAR flood + high IMERG accumulation supports plausibility
   * SAR flood + low rainfall suggests checking for artefacts, tides, dam releases, or misclassification

3. Tune parameters iteratively:
   * Adjust AOI, baselineDays, SCORE weights, MASKS, and POST threshold

---

## 11. Limitations (read this)

* SAR flood mapping is challenging in **dense urban areas**, **wind-roughened water**, and **under vegetation canopy**.
* Radar shadow/layover and smooth manmade surfaces can mimic “dark water” if not constrained.
* This script targets **“floodwater likely” screening**, not definitive inundation truth.
* AOIs including ocean/coastline can shift Otsu thresholds unless histogram sampling is constrained.

Field validation is mandatory for operational decision-making.

---

## 12. Troubleshooting

* **“No flood detected”**
  * Check precipitation cross-check layers; lower `floodProbThreshold`; confirm S1 coverage in event window.
* **“Too much flood / too many false positives”**
  * Tighten permanent water threshold; increase slope/HAND constraints; raise `floodProbThreshold`.
* **“Memory exceeded / timeout”**
  * Reduce AOI; enable sampling histograms; increase export scale; turn off extra layers.

---

## 13. References / useful links

* World Bank GOST SAR tools (Flood Analysis & Mapping):
  [https://github.com/worldbank/GOST_SAR/tree/master/Flood%20Analysis%20and%20Mapping](https://github.com/worldbank/GOST_SAR/tree/master/Flood%20Analysis%20and%20Mapping)
* UNOSAT (UNITAR) products portal:
  [https://unosat.org/](https://unosat.org/)
* Cyclone Senyar background:
  [https://en.wikipedia.org/wiki/Cyclone_Senyar](https://en.wikipedia.org/wiki/Cyclone_Senyar)

---

## 15. License

Public domain.
