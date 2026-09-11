/* ---------------------------------------------------------------------------------------
 * Flood mapping (Sentinel-1) — Flexible AOI + Flood probability + OPTIONAL SLC coherence
 * ---------------------------------------------------------------------------------------
 * GEE code: https://code.earthengine.google.com/f4ebbc6907ca02f7ea5ecf0d88c2b5b7
 *
 * PURPOSE
 * -------
 * Flood mapping workflow in Google Earth Engine to:
 *  - Detect likely floodwater using Sentinel-1 GRD (VV/VH) change + absolute backscatter evidence.
 *  - Support flexible AOI selection (GAUL admin boundaries, user asset, drawn geometry, or pasted geometry).
 *  - Stabilize results across AOI shapes (e.g., bounding box vs admin polygon) via optional histogram sampling masks.
 *  - Apply physics-aware plausibility masks (permanent water, slope, HAND) and simple post-processing.
 *  - Provide meteorology cross-check layers (IMERG precipitation and ECMWF IFS diagnostics).
 *  - Optionally fuse external Sentinel-1 SLC coherence evidence (computed outside GEE and uploaded as assets).
 *
 * DATASETS
 * --------
 *  - COPERNICUS/S1_GRD                : Sentinel-1 GRD backscatter (VV/VH) and incidence angle.
 *  - COPERNICUS/DEM/GLO30             : Copernicus DEM GLO-30 (for slope footprint/mask and slope derivatives).
 *  - MERIT/Hydro/v1_0_1               : HAND (hnd) — Height Above Nearest Drainage.
 *  - JRC/GSW1_4/GlobalSurfaceWater    : Surface water occurrence (permanent water masking).
 *  - NASA/GPM_L3/IMERG_V07            : IMERG precipitation (cross-check).
 *  - ECMWF/NRT_FORECAST/IFS/OPER      : ECMWF IFS NRT fields (cross-check).
 *  - (Optional user assets)           : External SLC coherence GeoTIFF(s) uploaded to GEE Assets.
 *
 * UNITS & CONVENTIONS
 * -------------------
 *  - Sentinel-1 VV/VH: dB (log scale).
 *  - ΔVV: dB (post - pre). Floodwater generally decreases VV (more negative ΔVV).
 *  - VH/VV ratio: computed as (VH - VV) in dB (water-like scattering tends to be more negative).
 *  - Probability outputs: 0–1 (higher = more flood-like).
 *  - Permanent water: GSW occurrence in % (0–100).
 *  - Slope: degrees.
 *  - HAND: meters.
 *  - IMERG accumulation: mm (converted from mm/hr using timestep hours).
 *  - IFS precipitation rate: mm/hr (converted from kg m^-2 s^-1 via *3600).
 *
 * METHOD (KEY IDEAS)
 * ------------------
 *  1) Multi-orbit ensemble:
 *     - Compute flood probability separately for ASCENDING and DESCENDING orbits,
 *       then take pixelwise MAX to reduce geometry-driven false negatives.
 *  2) Evidence ensemble (not a single threshold):
 *     - Otsu threshold on ΔVV (change-driven water detection).
 *     - Otsu threshold on VV_post (absolute low-backscatter water detection).
 *     - Soft VH/VV ratio constraint (water-like scattering signature).
 *     - Combine these into a continuous 0–1 probability surface.
 *  3) Physics-aware plausibility masks:
 *     - Mask permanent water using JRC GSW occurrence.
 *     - Restrict to plausible flooded terrain using slope (Copernicus DEM) + HAND (MERIT Hydro).
 *  4) AOI-shape robustness (optional):
 *     - Optional histogram sampling mask for Otsu threshold estimation (DEM land footprint + exclude permanent water),
 *       to reduce differences between DRAWN bbox and GAUL polygons in coastal areas.
 *  5) OPTIONAL coherence fusion:
 *     - Fuse GRD probability with external Sentinel-1 SLC coherence evidence (low coherence and/or coherence drop).
 *
 * USAGE
 * -----
 *  1) Set CONFIG: AOI mode, dates (event + baseline), and S1 reducers (pre median, post min recommended).
 *  2) Run script: inspect per-orbit layers (Pre/Post VV, ΔVV, FloodProb) to validate behavior.
 *  3) Inspect plausibility layers (Slope, HAND, Permanent water) to understand removals.
 *  4) Adjust thresholds/weights (CONFIG.SCORE, CONFIG.MASKS, CONFIG.POST) based on AOI and event.
 *  5) (Optional) enable EXPORT to Drive for probability, mask, and met cross-check rasters.
 *
 * LIMITATIONS / NOTES
 * -------------------
 *  - SAR flood mapping is challenging in dense urban areas, rough/windy water, and under vegetation canopy.
 *  - Radar shadow/layover and smooth manmade surfaces can mimic “dark water” if not constrained.
 *  - This script targets “floodwater likely” mapping (robust screening), not definitive inundation truth.
 *  - AOIs that include ocean/coastline can shift Otsu thresholds unless histogram sampling is constrained.
 *
 * PERFORMANCE NOTES
 * -----------------
 *  - Large AOIs + histogram reductions can trigger "Earth Engine memory capacity exceeded".
 *  - If you hit memory limits:
 *     - Prefer sampling-based histograms (instead of full reduceRegion histograms).
 *     - Keep histogram masks simple (DEM footprint + permanent water exclusion).
 *     - Increase tileScale in reductions; avoid unnecessary Map layers at full res.
 *     - Consider reducing AOI extent or using coarser histogram scale for Otsu estimation.
 *
 * CONTACT
 * -------
 *  Benny Istanto (Climate Geographer, GOST/DEC Data Group, The World Bank)
 *  Email: bistanto@worldbank.org
 *
 * LICENSE
 * -------
 *  Public domain.
 *
  * CHANGELOG
 * ---------
 * 2025-12-03T10:15+07:00  Baseline integrated script: flexible AOI modes (GAUL/ASSET/DRAWN/PASTE/AUTO),
 *                         multi-orbit GRD flood probability, plausibility masks, and met cross-check layers.
 * 2025-12-03T12:05+07:00  DEM/slope robustness: Copernicus DEM-only slope via Terrain.products, safe masking
 *                         to avoid slope=0 artifacts in Pixel Inspector.
 * 2025-12-03T13:10+07:00  AOI-shape consistency: optional histogram sampling mask (DEM footprint + exclude
 *                         permanent water) for more stable Otsu thresholds across GAUL vs bbox AOIs.
 * 2025-12-03T13:55+07:00  Performance note: histogram masking / extra reductions may trigger memory limits;
 *                         prefer sampling or coarser histogram scale when needed.
 *
 * ------------------------------------------------------------------------------
 */


/** #############################################
 *  0) CONFIG (EDIT ME)
 *  ############################################# 
 * 
 * QUICK START CHECKLIST:
 * ----------------------
 * 1. Set DATES (eventStart, eventEnd)           [Line 154]
 * 2. Choose AOI mode (DRAWN/GAUL/ASSET/PASTE)   [Line 184]
 * 3. If GAUL: Update gaul0/1/2_name             [Line 199]
 * 4. Review SCORE weights (w_change/abs/ratio)  [Line 307]
 * 5. Review MASKS thresholds (slope/HAND)       [Line 464]
 * 6. Review POST processing threshold           [Line 553]
 * 7. (Optional) Enable EXPORT to save outputs   [Line 692]
 * 
 * For detailed documentation on each section, 
 * see inline comments below.
 * ############################################# 
 */
 
var CONFIG = {
  // ============================================================
  // DATES: Event Window + Baseline Reference
  // ------------------------------------------------------------
  // PURPOSE:
  //  - eventStart/eventEnd: Define the suspected flood period (when water was present)
  //  - baselineDays: Length of pre-flood reference window for change detection
  //
  // STRATEGY:
  //  - Baseline window: [eventStart - baselineDays, eventStart)
  //  - Event window: [eventStart, eventEnd + 1 day)  (filterDate uses end-exclusive)
  //  - Change detection: compare event composite vs baseline composite
  //
  // TUNING GUIDANCE:
  //  - eventStart/eventEnd: Set based on precipitation/news reports (±2-3 days uncertainty is OK)
  //  - baselineDays:
  //     * Too short (10-20 days): Baseline may include pre-flood rain → weak change signal
  //     * Too long (120+ days): Baseline may include seasonal changes → false positives
  //     * RECOMMENDED: 30-60 days for most events (balances stability vs seasonal drift)
  //     * Increase to 90-120 days if: sparse S1 coverage, need more acquisitions
  //     * Decrease to 14-30 days if: rapid seasonal change (monsoon onset, snowmelt)
  //
  // SENTINEL-1 REVISIT:
  //  - S1A+S1B combined: ~6-day revisit (Europe), ~12-day elsewhere
  //  - 60-day baseline typically gives: 5-10 acquisitions per orbit
  //  - Check Console prints for actual image counts per orbit
  //
  // EXAMPLE:
  //  Event: Nov 22-28, 2025 (post-storm flooding)
  //  Baseline: Sep 23 - Nov 22, 2025 (60 days before event)
  DATES: {
    eventStart: '2025-11-22',    // First day of suspected flooding (YYYY-MM-DD)
    eventEnd:   '2025-12-07',    // Last day of suspected flooding (inclusive)
    baselineDays: 60             // Pre-flood reference window length (days before eventStart)
  }, // End of DATES


  // ============================================================
  // AOI: Area of Interest Selection (FLEXIBLE MODES)
  // ------------------------------------------------------------
  // PURPOSE:
  //  - Define the geographic extent for flood analysis
  //  - Support multiple input methods to fit different workflows
  //
  // AVAILABLE MODES:
  //  - 'GAUL'  : Admin lookup using GAUL 2024 L2 (country/province/district names)
  //  - 'ASSET' : Load FeatureCollection from your GEE Assets
  //  - 'DRAWN' : Geometry drawn in Code Editor (Imports panel), variable named `geometry`
  //  - 'PASTE' : Geometry pasted as code below (var geometry = ee.Geometry...)
  //  - 'AUTO'  : Smart selection: ASSET → PASTE → GAUL (checks availability in order)
  //
  // IMPORTANT NOTES:
  //  - PASTE mode uses a code variable named `geometry` (see Lines 719-724)
  //  - DRAWN mode also uses `geometry` variable (created automatically by Code Editor)
  //  - Both PASTE and DRAWN expect the same variable name; CONFIG.AOI.mode controls which is used
  //  - Replace geometry coordinates at Lines 382-387 if using mode='PASTE'
  //
  AOI: {
    mode: 'DRAWN', // Choose 'GAUL' for admin boundaries, 'ASSET' for your uploaded FC,
                   // 'DRAWN' for Code Editor geometry, 'PASTE' for geometry code below, or 
                   // 'AUTO' for automatic selection
    
    // Fallback buffer when GAUL lookup fails or needs centroid approximation (meters)
    fallbackBufferM: 40000,

    // Debug output: prints GAUL matches + candidate lists to Console
    // Set true to see available admin names when debugging GAUL lookups
    debug: true,
    // Maximum number of GAUL candidates to print (prevents Console overflow)
    maxList: 50,

    // (A) GAUL
    // Check complete list of country, province and district from below link, and get GAUL 2024 L2 Metadata
    // https://data.apps.fao.org/catalog/iso/60b23906-f21a-49ef-8424-f3645e70264e
    GAUL: {
      adminDataset: 'projects/sat-io/open-datasets/FAO/GAUL/GAUL_2024_L2',
      gaul0_name: 'Indonesia',// change to your target country
      gaul1_name: 'Aceh',      // change to your target province/region
      gaul2_name: 'Aceh Utara' // change to your target district/city
    }, // CRITICAL: Update these three names to match your target area exactly
       // Use CONFIG.AOI.debug=true to see available admin name candidates printed in Console

    // (B) PASTE (geometry pasted as code)
    PASTE: { bufferM: 0 },

    // (C) DRAWN (geometry drawn in UI)
    DRAWN: { bufferM: 0 },

    // (D) ASSET
    // If using mode='ASSET', paste your GEE Asset path here, inside '' (e.g., 'users/yourname/aoi_fc')
    // The asset must be a FeatureCollection or single Feature
    // bufferM=0 means use geometry as-is; increase to expand AOI boundary
    ASSET: {
      assetId: '',   // e.g. 'users/yourname/my_aoi_fc'
      bufferM: 0
    }
  }, // End of AOI


  // ============================================================
  // SENTINEL-1 CONFIGURATION: Acquisition & Processing Settings
  // ------------------------------------------------------------
  // PURPOSE:
  //  - Control which Sentinel-1 data is used and how it's preprocessed
  //  - Balance between detection sensitivity and false positive rate
  //
  // KEY DECISIONS:
  //  - instrumentMode='IW': Standard land imaging mode (consistent geometry/resolution)
  //  - polarizations=['VV','VH']: Dual-pol enables ratio constraint (reduces false positives)
  //  - ORBITS=['ASCENDING','DESCENDING']: Multi-orbit reduces geometry-driven misses
  //
  S1: {
    collection: 'COPERNICUS/S1_GRD',
    
    // Sentinel-1 IW is the standard land mode; ensures consistent incidence-angle range & resolution.
    // If you change away from IW, you'll mix geometries and your thresholds/ratios become less stable.
    instrumentMode: 'IW',
    // Using both VV and VH gives you: VV strongest for open water darkening; VH helps discriminate veg/wet soils via ratio.
    // If you drop VH, ratio constraint disappears (often increases false positives in smooth surfaces).
    polarizations: ['VV', 'VH'],

    // Using both passes reduces geometry-driven misses (shadow/layover orientation effects).
    // Using only one orbit can increase false negatives depending on look direction relative to terrain/urban layout.
    ORBITS: ['ASCENDING', 'DESCENDING'],

    // ------------------------------------------------------------
    // PREPROCESSING: CRITICAL CHOICES
    // ------------------------------------------------------------
    // These settings directly affect backscatter uniformity and detection stability.
    //
    // Simple gamma0-by-angle correction reduces incidence-angle brightness gradient.
    // true  => more comparable backscatter across swath; better Otsu stability on big AOIs.
    // false => raw sigma0 in dB; thresholds can “track” the incidence-angle pattern (more artefacts).
    // Note: not full terrain flattening; in steep terrain you’ll still see geometry effects.
    applyGamma0AngleCorrection: true,
    
    // Masks border noise / scalloping (very low VV) at scene edges.
    // true  => fewer salt-and-pepper false floods on edges.
    // false => sometimes more false positives near borders.
    clipEdges: true,
    
    // VV dB cutoff for edge-mask. Pixels below are masked.
    // More negative (e.g., -40) => looser mask, keeps more pixels but may keep border noise.
    // Less negative (e.g., -30) => stricter mask, removes more edges; risk removing real dark water near edges.
    edgeDbThreshold: -35,
    
    // Pre-event composite reducer.
    // 'median' => robust baseline (less sensitive to one weird wet day); good for change detection stability.
    // 'mean'   => smoother but sensitive to outliers.
    // 'min'    => dangerous for baseline (would make baseline already “water-like”, reducing deltaVV signal).
    temporalReducerPre: 'median', 
    
    // Post-event composite reducer.
    // 'min' => intentionally “peak water” selector: any acquisition with very low VV will dominate -> higher recall.
    // 'median'/'mean' => closer to typical condition over window; can miss short-lived flood peaks.
    // 'min' may also pick wind-roughened water artefacts / shadow pockets (false positives) if not masked well.
    temporalReducerPost: 'min'        // IMPORTANT for flood
  }, // End of S1

  
  // ============================================================
  // FLOOD SCORING: EVIDENCE WEIGHTS + THRESHOLD SOFTNESS
  // ------------------------------------------------------------
  // PHILOSOPHY:
  //  - NOT a single hard threshold (brittle, noise-sensitive)
  //  - ENSEMBLE of three complementary evidence types (robust, interpretable)
  //  - SOFT transitions via sigmoid function (continuous probability 0-1)
  //
  // EVIDENCE TYPES:
  //  1) Change (ΔVV): Detects newly darkened pixels (flood over normally bright land)
  //  2) Absolute (VV_post): Detects intrinsically dark surfaces (open water)
  //  3) Ratio (VH/VV): Detects water-like scattering (rejects smooth manmade surfaces)
  //
  // TUNING STRATEGY:
  //  - Weights (w_*): Control which evidence matters most (should sum to ~1.0)
  //  - Softness (k_*): Control transition sharpness around Otsu thresholds (dB units)
  //  - Larger k = gentler (higher recall, more false positives)
  //  - Smaller k = sharper (higher precision, more false negatives)
  //
  // TYPICAL ADJUSTMENTS:
  //  - Urban flooding: Increase w_ratio (0.15→0.25) to reject smooth surfaces
  //  - Wetland flooding: Increase w_abs (0.35→0.50), decrease w_change (0.50→0.35)
  //  - Mountain flooding: Decrease k_change (1.5→1.0) for sharper change detection
  //
  SCORE: {
    // Weight for change-based evidence (deltaVV). Good for separating newly flooded from permanent water-like surfaces.
    // Higher => more sensitive to change; better for floods over normally bright land.
    // Lower  => relies more on absolute darkness; can miss floods if baseline already low (e.g., wetlands/rice).
    w_change: 0.50,
    
    // Weight for absolute low VV in post.
    // Higher => more “water is dark” detector; good for open water flood.
    // Too high => can mislabel smooth manmade surfaces, radar shadow, calm water in non-flood contexts.
    w_abs:    0.35,
    
    // Weight for VH/VV ratio evidence
    // Higher => ratio constraint matters more (stricter water-like scattering requirement)
    // Lower => ratio constraint matters less (can miss this evidence type)
    w_ratio:  0.15,

    // Softness (dB) around the Otsu-derived change threshold.
    // Larger => gentler transition -> more pixels get mid-probabilities (higher recall, lower precision).
    // Smaller => sharper decision -> crisper boundaries but more brittle to noise / speckle.
    k_change: 1.5,  // dB
    
    // Softness around the Otsu-derived absolute VV threshold.
    // Larger => more inclusive “darkness” evidence.
    // Smaller => stricter “must be very dark” evidence.
    k_abs:    1.5,  // dB
    
    // Softness around the ratio threshold.
    // Larger => ratio constraint becomes weak (lets more through).
    // Smaller => ratio constraint becomes hard (can reject valid water if VH noisy).
    k_ratio:  1.0,  // dB

    // Threshold for “water-like” VH/VV ratio in dB (VH - VV).
    // More negative (e.g., -10) => stricter (only very water-like ratio passes) -> fewer false positives, more misses.
    // Less negative (e.g., -6)  => looser -> more detections, more false positives (esp. wet vegetation/rough surfaces).
    ratioThreshDb: -8.0
  }, // End of SCORE


  // ============================================================
  // COHERENCE: Optional SLC Coherence Evidence (ADVANCED)
  // ------------------------------------------------------------
  // PURPOSE:
  //  - Fuse external Sentinel-1 SLC interferometric coherence with GRD flood probability.
  //  - Coherence measures phase similarity between two SAR acquisitions.
  //  - Low coherence indicates surface change (flood, landslide, vegetation growth, etc.)
  //
  // WHAT IS COHERENCE:
  //  - Range: 0 (completely decorrelated) to 1 (perfectly coherent)
  //  - High coherence (>0.7): Stable surface (bare soil, rock, urban)
  //  - Low coherence (<0.3): Surface changed between acquisitions (water, vegetation, snow)
  //  - Floodwater causes decorrelation → coherence drops
  //
  // WHY USE COHERENCE (benefits):
  //  - Complements GRD: GRD detects "dark water"; coherence detects "surface change"
  //  - Reduces false positives: Smooth surfaces (parking lots, roofs) are dark in GRD but stay coherent
  //  - Improves urban flood detection: Urban areas have complex GRD signatures; coherence drop is clearer
  //
  // LIMITATIONS:
  //  - Requires SLC processing outside GEE (SNAP, ASF HyP3, or custom InSAR processor)
  //  - Needs two SLC acquisitions with short temporal baseline (<12 days preferred)
  //  - Coherence can drop for non-flood reasons: wind-blown vegetation, soil moisture, agricultural activity
  //  - NOT available in GEE by default (must compute externally and upload as asset)
  //
  // WORKFLOW (if enabled=true):
  //  1) Process Sentinel-1 SLC pairs externally:
  //      - Event pair: Two acquisitions during flood (e.g., Nov 22 & Nov 28)
  //      - Pre-event pair (optional): Two acquisitions before flood (e.g., Oct 15 & Oct 21)
  //  2) Tools: SNAP (free), ASF HyP3 (automated), ISCE2, or Gamma
  //  3) Generate coherence GeoTIFF (values 0-1)
  //  4) Upload to GEE Assets (Assets tab → New → Image Upload)
  //  5) Update eventCohAssetId / preCohAssetId below with your asset paths
  //  6) Set enabled=true
  //
  // FUSION STRATEGY:
  //  - GRD probability weighted 0.75 (dominant signal)
  //  - Coherence probability weighted 0.25 (supporting evidence)
  //  - Final = w_grd * P_grd + w_coh * P_coh
  //  - Result: Coherence slightly boosts probability where both agree
  //
  // TUNING COHERENCE THRESHOLDS:
  //  - lowCohThresh (default 0.25):
  //     * Lower (0.15-0.20): More sensitive, detects subtle change (more false positives)
  //     * Higher (0.30-0.40): Stricter, requires strong decorrelation (fewer false positives)
  //  - cohDropThresh (default 0.15):
  //     * How much coherence must drop from pre to event to count as "new change"
  //     * Lower (0.10): Detects subtle changes
  //     * Higher (0.20-0.25): Only strong decorrelation events
  //  - k_low / k_drop (softness):
  //     * Larger = softer transitions (more pixels with medium probability)
  //     * Smaller = sharper decisions
  //
  // WHEN TO SKIP COHERENCE (keep enabled=false):
  //  - No SLC processing capability available
  //  - Very small AOI where GRD is already sufficient
  //  - Rapid event (<6 days) where finding good SLC pairs is difficult
  //  - Vegetated areas where coherence naturally low (dense forest, crops)
  //
  COH: {
    enabled: false, // Set to true ONLY if you have coherence assets uploaded

    // Band name in your uploaded coherence GeoTIFF
    // SNAP/HyP3 typically output band 'b1' or 'coherence'
    cohBand: 'b1', // Check your GeoTIFF metadata; adjust if needed

    // A) Event coherence asset (REQUIRED if enabled=true)
    //    - Coherence computed from SLC pair during flood event
    //    - Example: 'users/bistanto/aceh_flood_2025_coh_event'
    eventCohAssetId: 'users/yourname/lhokseumawe_coh_event_corr',

    // B) Pre-event coherence asset (OPTIONAL but recommended)
    //    - Coherence computed from SLC pair before flood (same season/conditions)
    //    - Enables coherence drop detection: Δcoh = coh_pre - coh_event
    //    - Leave empty ('') if unavailable; script will skip coherence drop
    preCohAssetId:   'users/yourname/lhokseumawe_coh_pre_corr',

    // Evidence thresholds (coherence units: 0-1 scale)
    lowCohThresh: 0.25,   // Coherence below this → evidence of surface change
                          // Lower = more sensitive; Higher = stricter
    
    cohDropThresh: 0.15,  // Coherence drop (pre - event) above this → evidence of NEW change
                          // Only used if preCohAssetId provided
                          // Lower = detects subtle change; Higher = only strong events

    // Softness parameters (coherence units: 0-1)
    k_low:  0.05,   // Softness around lowCohThresh (larger = gentler transition)
    k_drop: 0.05,   // Softness around cohDropThresh

    // Fusion weights: how to combine GRD and coherence probabilities
    FUSE: {
      w_grd: 0.75,     // Weight for GRD-based flood probability (DOMINANT signal)
      w_coh: 0.25,     // Weight for coherence-based probability (SUPPORTING evidence)
                       // w_grd + w_coh should = 1.0 for interpretable probabilities
                       
      clamp01: true    // Clamp final probability to [0,1] range (safety against overshoot)
                       // Recommended: keep true
    }
  }, // End of COH


  // ============================================================
  // PLAUSIBILITY MASKS: PHYSICS-BASED FLOOD CONSTRAINTS
  // ------------------------------------------------------------
  // PURPOSE:
  //  - Remove physically implausible flood detections (steep slopes, high terrain, permanent water)
  //  - Improve precision without sacrificing recall in valid flood zones
  //
  // MASK TYPES:
  //  1) Slope: Removes steep terrain (prone to radar shadow/layover artifacts)
  //  2) HAND: Keeps pixels near drainage network (vertical proximity to rivers)
  //  3) Permanent water: Excludes lakes/reservoirs (not "flood" but pre-existing water)
  //
  // TUNING GUIDANCE:
  //  - Adjust based on flood type (riverine vs coastal vs pluvial)
  //  - Adjust based on terrain (flat plains vs mountainous valleys)
  //  - If removing too much real flood: relax thresholds (increase maxSlopeDeg, maxHANDm)
  //  - If too many false positives remain: tighten thresholds (decrease maxSlopeDeg, maxHANDm)
  //
  MASKS: {
    // Max slope (degrees) allowed for flood.
    // Lower (e.g., 3) => stricter: removes mountain/steep artefacts; risk removing true flood on sloping riverbanks.
    // Higher (e.g., 8–10) => keeps more terrain; increases shadow/layover false positives.
    maxSlopeDeg: 5,
    
    // Max HAND (m) allowed: keeps pixels close (vertically) to drainage network.
    // Lower (e.g., 10–15) => very river/floodplain focused; can miss coastal/tidal floods or pluvial ponding away from rivers.
    // Higher (e.g., 40–80) => keeps more inland depressions; increases false positives in low-backscatter non-flood areas.
    maxHANDm: 25,
    
    // Permanent water occurrence (%) threshold from JRC GSW to mask “already water most of the time”.
    // Higher (e.g., 95) => masks only very permanent water; keeps seasonal water (better for flood, but more confusion).
    // Lower (e.g., 70–80) => masks lots of seasonal water; can accidentally remove real flood in wetlands/rice paddies.
    permWaterOcc: 85
  }, // End of MASKS


  // ============================================================
  // Histogram sampling (Otsu stability across AOI shapes)
  // ------------------------------------------------------------
  // PURPOSE:
  //  - Ensure consistent Otsu thresholds regardless of AOI geometry
  //  - Prevent ocean/permanent water from dominating histogram in coastal areas
  //
  // PROBLEM:
  //  - DRAWN bounding box often includes more ocean than GAUL polygon
  //  - Ocean's very dark VV shifts histogram → different thresholds → inconsistent flood extent
  //
  // SOLUTION:
  //  - Build dedicated histogram mask for threshold estimation only:
  //     (a) Land-like footprint from Copernicus DEM mask
  //     (b) Optionally exclude permanent water (JRC GSW occurrence >= permWaterOcc)
  //
  // PERFORMANCE:
  //  - Enable sampling (useSampling=true) for large AOIs (memory-safe)
  //  - Adjust sampleScaleM / samplePixels if hitting memory limits
  //
  HIST: {
    enabled: true,

    // Use Copernicus DEM footprint as "land-like" sampling area.
    // This is especially important for coastal AOIs where a bbox includes ocean.
    useCopDemLandMask: true,

    // Exclude permanent water from Otsu sampling
    // (prevents ocean/lakes from pulling VV_post histogram too dark).
    excludePermanentWater: true,

    // -------------------------------
    // MEMORY-SAFE OTSU SAMPLING
    // -------------------------------
    // Why:
    //  - reduceRegion(histogram) can exceed memory for big AOIs or complex masks (DEM+GSW).
    //  - Sampling caps the work to N pixels, so Otsu cost becomes bounded and predictable.
    useSampling: true,

    // Sampling scale (meters). Coarser scale = fewer candidates = cheaper.
    // 120–250m is a good range: still representative histograms, much lower cost.
    sampleScaleM: 200,

    // Max number of samples used to build histogram.
    // 40k–100k usually plenty for stable Otsu.
    samplePixels: 60000,

    // Histogram bucketing: 128 is usually enough for Otsu and cheaper than 255.
    maxBuckets: 128,

    // tileScale helps reduce per-tile memory footprint (higher = more tiles, less memory).
    tileScale: 8,

    // Diagnostic map layer of histMask
    debugLayers: false
  }, // End of HIST


  // ============================================================
  // POST-PROCESSING: FINAL MAP CLEANUP
  // ------------------------------------------------------------
  // PURPOSE:
  //  - Convert continuous probability to binary flood mask
  //  - Remove speckle noise (small isolated pixels)
  //  - Optionally smooth boundaries (morphological operations)
  //
  // WORKFLOW:
  //  1) Threshold: floodProb >= floodProbThreshold → binary mask
  //  2) Connected components: Remove blobs < minConnectedPixels
  //  3) Morphological smoothing: Dilation→Erosion (if morphRadiusPx > 0)
  //
  POST: {
    // Final probability threshold to declare “flood”.
    // TUNE THIS based on application:
    //     Lower    (e.g., 0.30-0.40) => more flood pixels (higher recall), but more false positives.
    //     Balanced (e.g., 0.40-0.50) => general use
    //     Higher   (e.g., 0.50–0.60) => cleaner map (higher precision), but misses vegetated/shallow/urban flood.
    floodProbThreshold: 0.50,
    
    // Minimum connected component size (in pixels) to keep.
    // TUNE THIS based on application:
    //     Lower    (e.g.,  1–10) => keeps small ponds / urban puddles; also keeps speckle noise.
    //     Balanced (e.g., 10–50) => Typical use
    //     Higher   (e.g., 50–200) => removes speckle; can delete genuine narrow river flooding or small inundation patches.
    minConnectedPixels: 25,
    
    // Morphological smoothing radius.
    // TUNE THIS based on application:
    //     0   => no dilation/erosion (keeps raw shapes; good for diagnostics).
    //     1–2 => fills holes / cleans edges; can merge nearby water bodies and slightly inflate area.
    morphRadiusPx: 1
  }, // End of POST


  // ============================================================
  // METEOROLOGY: Precipitation & Atmospheric Cross-Check
  // ------------------------------------------------------------
  // PURPOSE:
  //  - Verify flood plausibility with independent precipitation data
  //  - Cross-check SAR-detected "water" against rainfall evidence
  //  - Identify meteorological drivers (tropical cyclones, mesoscale convective systems)
  //
  // WHY CROSS-CHECK:
  //  - SAR can detect "dark surfaces" that aren't flood (smooth urban, shadow, wind roughening)
  //  - Strong precipitation correlation → increases flood confidence
  //  - No precipitation → suggests non-flood cause (dam release, tide, misdetection)
  //
  // DATASETS:
  //
  // 1) IMERG (Integrated Multi-satellitE Retrievals for GPM)
  //    - Source: NASA GPM (Global Precipitation Measurement) mission
  //    - Resolution: 0.1° (~11 km), 30-minute temporal
  //    - Coverage: Global 60°N-60°S
  //    - Band: 'precipitation' (mm/hr)
  //    - Best for: Tropical/subtropical flood events, high temporal resolution
  //    - Limitations: Lower accuracy over complex terrain (mountains, coasts)
  //
  // 2) ECMWF IFS (Integrated Forecasting System)
  //    - Source: European Centre for Medium-Range Weather Forecasts
  //    - Resolution: ~9 km, hourly
  //    - Coverage: Global
  //    - Bands available in this script:
  //       * total_precipitation_rate_sfc: Precip rate (kg m^-2 s^-1, converted to mm/hr)
  //       * vorticity_pl850: Low-level rotation (850 hPa, helps identify cyclones)
  //       * u/v_component_of_wind_10m_sfc: 10m wind (helps identify storm systems)
  //    - Best for: Synoptic-scale diagnostics, identifying atmospheric drivers
  //    - Limitations: Forecast model (not observations), may have biases
  //
  // OUTPUT LAYERS:
  //  - IMERG accumulation: Total rainfall (mm) over event window
  //  - IFS diagnostics: Mean precip rate, vorticity, wind speed over event window
  //  - Time series charts: Track precipitation evolution (when did heavy rain occur?)
  //
  // INTERPRETATION GUIDANCE:
  //  - SAR flood + 100-300mm IMERG accumulation → HIGH confidence flood
  //  - SAR flood + <20mm IMERG accumulation → CHECK: dam release? tidal? false positive?
  //  - SAR flood + strong vorticity (850 hPa) → tropical cyclone/monsoon depression
  //  - SAR flood + high wind speed → wind-roughened water may reduce VV (interpretation caution)
  //
  // CUSTOMIZATION:
  //  - Change imergCollection to 'NASA/GPM_L3/IMERG_MONTHLY_V07' for longer windows
  //  - Add IFS bands: 'mean_sea_level_pressure_sfc' (pressure systems), 'convective_inhibition_sfc' (storm potential)
  //
  MET: {
    imergCollection: 'NASA/GPM_L3/IMERG_V07',  // IMERG V07 30-minute product
    imergBand: 'precipitation',                // Precipitation rate (mm/hr)
    
    ifsCollection: 'ECMWF/NRT_FORECAST/IFS/OPER',  // ECMWF IFS Near-Real-Time operational forecast
    
    imergStepHours: 0.5,  // IMERG V07 timestep (30 minutes = 0.5 hours)
                          // Used to convert rate (mm/hr) → accumulation (mm) per image
                          // Formula: accum_mm = rate_mmhr * stepHours
    
    // ECMWF IFS bands to extract (can add more from IFS documentation)
    ifsBands: [
      'total_precipitation_rate_sfc',       // Precip rate at surface (kg m^-2 s^-1)
                                            // Converted to mm/hr via *3600 in script
      
      'vorticity_pl850',                    // Relative vorticity at 850 hPa (s^-1)
                                            // Positive = cyclonic rotation (NH: counterclockwise)
                                            // Useful for identifying tropical cyclones, lows
      
      'u_component_of_wind_10m_sfc',        // Zonal wind at 10m (m/s, eastward positive)
      'v_component_of_wind_10m_sfc'         // Meridional wind at 10m (m/s, northward positive)
                                            // Combined to compute wind speed: sqrt(u² + v²)
                                            // High wind → storm systems, can roughen water surface
    ]
  }, // End of MET
  
  
  // ============================================================
  // EXPORT: Save Outputs to Google Drive (OPTIONAL)
  // ------------------------------------------------------------
  // PURPOSE:
  //  - Export final flood maps and diagnostics as GeoTIFF rasters
  //  - Enables: offline analysis, GIS integration (ArcGIS/QGIS), report generation
  //
  // EXPORTED LAYERS (when enabled=true):
  //  1) FloodProb_Fused_YYYY-MM-DD.tif: Continuous flood probability (0-1, Float32)
  //  2) FloodMask_YYYY-MM-DD.tif: Binary flood extent (1=flood, 0=no flood, Byte)
  //  3) IMERGaccum_YYYY-MM-DD.tif: Total precipitation accumulation (mm, Float32)
  //  4) IFSdiagnostics_YYYY-MM-DD.tif: Multi-band (precip rate, vorticity, wind speed)
  //
  // WORKFLOW:
  //  1) Set enabled=true below
  //  2) Run script → check "Tasks" tab in Code Editor (orange icon, top-right)
  //  3) Click "RUN" on each export task (they queue but don't auto-start)
  //  4) Wait for completion (blue → green checkmark; time depends on AOI size)
  //  5) Find outputs in Google Drive → folder specified by 'folder' parameter
  //
  // PERFORMANCE TUNING:
  //  - scale (meters per pixel):
  //     * 10m: Sentinel-1 native resolution (best quality, largest files, slowest export)
  //     * 20-30m: Faster export, still useful for most applications
  //     * 100m: Regional overviews, very fast
  //  - maxPixels: Max allowed pixels per export (GEE limit: ~1e13)
  //     * If export fails with "too many pixels": Increase scale or reduce AOI size
  //  - folder: Google Drive folder (created automatically if doesn't exist)
  //
  // IMPORTANT NOTES:
  //  - Export does NOT happen automatically; you must click "RUN" in Tasks tab
  //  - Large AOIs (>5000 km²) at 10m may hit GEE's 50 MB single-file limit
  //     → Solution: Manually split AOI into tiles, or increase scale
  //  - Exports stay queued in Tasks tab for 7 days (then auto-cancel if not run)
  //
  // ALTERNATIVE EXPORT OPTIONS (not in this script):
  //  - Export.image.toAsset(): Save to GEE Assets (for later reuse in GEE)
  //  - Export.image.toCloudStorage(): Export to Google Cloud Storage (for large files)
  //
  EXPORT: {
    enabled: false,      // Set to true to enable exports (don't forget to RUN tasks!)
    
    folder: 'GEE_FLOOD', // Google Drive folder name (created automatically if missing)
                         // Path will be: Google Drive → GEE_FLOOD → [exported files]
    
    scale: 10,           // Export resolution (meters per pixel)
                         // TUNE THIS: 10=highest quality/slowest, 20-30=balanced, 100=fast/coarse
    
    maxPixels: 1e13      // Maximum pixels allowed per export (GEE hard limit)
                         // Increase if you get "too many pixels" error (rare)
                         // Default 1e13 is usually sufficient
  } // End of EXPORT
};


/** =========================
 *  (Optional) PASTE AOI GEOMETRY
 *  =========================
 * If CONFIG.AOI.mode = 'PASTE' (or 'AUTO' and you want AUTO to pick it),
 * paste geometry here as CODE.
 *
 * IMPORTANT:
 *  - Place this block ABOVE the `var aoi = getAOI();` line.
 *  - Comment it out if you use GAUL/ASSET/DRAWN, to avoid confusion.
 */
 
// var geometry = /* color: #98ff00 */ee.Geometry.Polygon(
//         [[[-116.6453125, 40.73451966966921],
//           [-121.655078125, 34.90818586132565],
//           [-87.90507812500002, 29.022261488477003],
//           [-103.95895284764096, 46.26418377057588]]]
// );

 // End of CONFIG
 
 


/** #############################################
 *  1) Helper functions
 *  ############################################# 
 */

/**
 * Logistic sigmoid for ee.Image.
 * 
 * PURPOSE:
 *  - Converts hard thresholds into soft probability transitions (0→1).
 *  - Prevents abrupt "on/off" decisions that are sensitive to noise.
 *  - Formula: 1/(1+exp(-x))
 * 
 * USAGE IN THIS SCRIPT:
 *  - Transforms Otsu threshold deviations into smooth flood probabilities.
 *  - Example: deltaVV = -3 dB below threshold → sigmoid → ~0.88 probability
 *            deltaVV = +3 dB above threshold → sigmoid → ~0.12 probability
 * 
 * WHY SIGMOID vs HARD THRESHOLD:
 *  - Hard: if (deltaVV < threshold) → 1, else → 0  [brittle, speckle-sensitive]
 *  - Soft: sigmoid((threshold - deltaVV) / k)      [gradual, robust to noise]
 * 
 * @param {ee.Image} x - input image
 * @return {ee.Image} 1/(1+exp(-x))
 */
function sigmoid(x) {
  return x.multiply(-1).exp().add(1).pow(-1);
}


/**
 * Safe, server-side label for printing without getInfo().
 * 
 * PURPOSE:
 *  - Builds human-readable labels entirely server-side (no client getInfo() calls).
 *  - Avoids triggering computations or hitting API rate limits.
 * 
 * WHY SERVER-SIDE STRINGS:
 *  - Using date.format() keeps dates as ee.String (not client-side JS strings).
 *  - Prevents accidental .getInfo() cascades that slow down script loading.
 * 
 * EXAMPLE OUTPUT:
 *  "S1 images (ASCENDING) 2025-10-01 → 2025-11-01"
 * 
 * @param {String} orbit
 * @param {ee.Date} start
 * @param {ee.Date} end
 * @return {ee.String}
 */
function labelOrbitWindow(orbit, start, end) {
  return ee.String('S1 images (').cat(orbit).cat(') ')
    .cat(start.format('YYYY-MM-dd')).cat(' → ').cat(end.format('YYYY-MM-dd'));
}


/**
 * Build a "land-like" mask using Copernicus DEM footprint.
 * 
 * PURPOSE:
 *  - Create a mask that represents areas where DEM data exists (typically land, not ocean)
 *  - Used to stabilize Otsu threshold estimation in coastal AOIs
 * 
 * WHY THIS MATTERS:
 *  - Problem: DRAWN bounding boxes often include large ocean areas
 *  - Ocean pixels have very dark VV (-25 to -30 dB) → dominate histogram
 *  - Result: Otsu threshold shifts darker → inconsistent flood detection
 *  - Solution: Sample histogram only over land-like areas (where DEM exists)
 * 
 * HOW IT WORKS:
 *  - Copernicus DEM GLO-30 has valid data over land, masked over open ocean
 *  - We use the DEM's own mask as a "land footprint" proxy
 *  - No elevation values used, just the presence/absence of DEM data
 * 
 * SAFETY FEATURES:
 *  - Checks if DEM tiles exist in AOI before processing
 *  - Falls back to "all ones" (no restriction) if DEM missing
 *  - Prevents crashes in edge cases (polar regions, small islands)
 * 
 * PERFORMANCE NOTES:
 *  - Does NOT clip here (clip deferred to buildHistogramMask)
 *  - Clipping early can bloat expression graph in large AOIs
 * 
 * @param {ee.Geometry} aoi - area of interest
 * @return {ee.Image} mask image (1 where DEM valid; masked elsewhere)
 */
 function buildCopDemLandMask(aoi) {
  var demIC = ee.ImageCollection('COPERNICUS/DEM/GLO30')
    .filterBounds(aoi)
    .select('DEM');

  var hasDem = demIC.size().gt(0);

  // IMPORTANT:
  //  - Do NOT clip here (clip is a geometry op and can bloat the expression graph).
  //  - Just use the DEM footprint mask; we’ll clip once at the very end of histMask.
  var landMask = ee.Image(ee.Algorithms.If(
    hasDem,
    demIC.mosaic().mask(), // Use DEM's native mask (valid over land, masked over ocean)
    ee.Image(1)            // Fallback: no restriction (prevents crash if DEM missing)
  )).rename('landMask');

  return landMask;
}


/**
 * Build the histogram sampling mask used ONLY for Otsu threshold estimation.
 * 
 * PURPOSE:
 *  - Create a restricted sampling area for computing Otsu thresholds
 *  - Ensures consistent thresholds across different AOI geometries (GAUL vs DRAWN bbox)
 * 
 * CRITICAL DISTINCTION:
 *  - This mask is NOT applied to final flood probability computation
 *  - It is ONLY used to compute stable Otsu thresholds (tAbs, tChange)
 *  - Final probability is computed over the full AOI, then masked by plausibility constraints
 * 
 * WHY THIS EXISTS:
 *  - Problem: Otsu thresholds depend on the histogram of your AOI
 *  - DRAWN bounding box: includes ocean → ocean's dark VV dominates histogram
 *  - GAUL admin polygon: excludes most ocean → histogram represents land
 *  - Result: Same location, different AOI shape → different thresholds → different flood extent
 *  - Solution: Force both to use same "land-like + not-permanent-water" sampling mask
 * 
 * MASK COMPONENTS (configurable in CONFIG.HIST):
 *  (A) Copernicus DEM footprint: "land-like" area (excludes open ocean)
 *  (B) Exclude permanent water: GSW occurrence >= permWaterOcc (excludes lakes/rivers)
 *  Result: Histogram sampled from "land that could flood" (not ocean, not permanent water)
 * 
 * EXAMPLE IMPACT:
 *  - AOI = coastal city
 *  - DRAWN bbox: 40% ocean, 10% lakes, 50% land → Otsu threshold = -18 dB (too dark)
 *  - With histMask: 0% ocean, 0% lakes, 100% land → Otsu threshold = -12 dB (stable)
 *  - Result: Consistent flood detection regardless of bbox vs polygon
 * 
 * WHEN TO DISABLE (CONFIG.HIST.enabled = false):
 *  - Small inland AOIs where ocean/permanent water not an issue
 *  - When you want ocean included in threshold estimation (rare)
 * 
 * @param {ee.Geometry} aoi - area of interest
 * @return {ee.Image} histMask (masked image), or null if CONFIG.HIST.enabled=false
 */
function buildHistogramMask(aoi) {
  // If HIST config missing or disabled: return null (caller decides fallback).
  if (!CONFIG.HIST || !CONFIG.HIST.enabled) return null;

  // Start from "no restriction" mask.
  // We'll refine it based on config toggles below.
  var m = ee.Image(1);

  // (A) Land-like sampling from Copernicus DEM footprint
  if (CONFIG.HIST.useCopDemLandMask) {
    var land = buildCopDemLandMask(aoi);
    // land is already a mask-y image (masked over ocean); updateMask respects its mask.
    m = m.updateMask(land);
  }

  // (B) Exclude permanent water from histogram sampling
  if (CONFIG.HIST.excludePermanentWater) {
    var gswOcc = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
      .select('occurrence');

    // Make "not permanent water" a true mask (0 becomes masked)
    // lt(permWaterOcc) means "occurrence < threshold" → not permanent
    var notPermMask = gswOcc.lt(CONFIG.MASKS.permWaterOcc).selfMask();
    m = m.updateMask(notPermMask);
  }

  // Single clip at end (cheaper than many clips)
  // Result: mask is 1 where valid, masked elsewhere
  return m.clip(aoi).rename('histMask');
}


/**
 * Build a histogram dictionary safely with automatic fallbacks.
 * 
 * PURPOSE:
 *  - Compute histogram for Otsu threshold estimation
 *  - Handle edge cases gracefully (empty collections, null results)
 *  - Route to memory-safe sampling if configured
 * 
 * TWO STRATEGIES:
 *  1) Sampling-based (CONFIG.HIST.useSampling=true):
 *      - Random sample N pixels at coarser scale
 *      - Memory-bounded, predictable cost
 *      - RECOMMENDED for large AOIs (>1000 km²)
 * 
 *  2) Full reduceRegion (CONFIG.HIST.useSampling=false):
 *      - Histogram over all unmasked pixels
 *      - More accurate for small AOIs
 *      - Can hit memory limits on large/complex AOIs
 * 
 * WHY SAFE:
 *  - Problem: reduceRegion can return null if no valid pixels (e.g., AOI entirely masked)
 *  - Consequence: Otsu function crashes on null histogram
 *  - Solution: Return dummy histogram {histogram: [1], bucketMeans: [0]} if null
 *  - Result: Otsu returns threshold=0 (harmless fallback, flood probability stays low)
 * 
 * OUTPUT FORMAT:
 *  Dictionary with two keys:
 *  - 'histogram': Array of pixel counts per bucket
 *  - 'bucketMeans': Array of mean values per bucket
 *  Example: {histogram: [100, 500, 300], bucketMeans: [-20, -15, -10]}
 * 
 * PERFORMANCE TUNING:
 *  - If hitting memory errors: Set CONFIG.HIST.useSampling=true
 *  - Adjust CONFIG.HIST.sampleScaleM (coarser = cheaper)
 *  - Adjust CONFIG.HIST.samplePixels (fewer = cheaper)
 * 
 * @param {ee.Image} img - single-band image to histogram
 * @param {String} bandName - band name (e.g., 'VV', 'deltaVV')
 * @param {ee.Geometry} aoi - area of interest
 * @param {Number} scale - pixel scale for reduceRegion (meters)
 * @param {Number} maxBuckets - number of histogram bins
 * @return {ee.Dictionary} {'histogram': [...], 'bucketMeans': [...]}
 */
function safeHistogram(img, bandName, aoi, scale, maxBuckets) {
  // If sampling is enabled, use bounded sampling (memory-safe).
  if (CONFIG.HIST && CONFIG.HIST.enabled && CONFIG.HIST.useSampling) {
    return safeHistogramSampled(img, bandName, aoi);
  }

  // Fallback: original reduceRegion histogram (OK for small AOIs)
  var rr = img.reduceRegion({
    reducer: ee.Reducer.histogram({maxBuckets: maxBuckets || 255}),
    geometry: aoi,
    scale: scale || 30,
    bestEffort: true,  // Allow coarser scale if needed to avoid timeout
    maxPixels: 1e8,    // Safety limit
    tileScale: 4       // Process in smaller tiles (reduces memory per tile)
  });

  var h = rr.get(bandName);

  // Safety: if h is null (no valid pixels), return dummy histogram
  // This prevents Otsu from crashing on edge cases
  return ee.Dictionary(ee.Algorithms.If(
    h,
    h,
    ee.Dictionary({histogram: [1], bucketMeans: [0]}) // Dummy: one bucket at value 0
  ));
}


/**
 * Memory-safe histogram via bounded random sampling.
 * 
 * PURPOSE:
 *  - Compute histogram for Otsu without exceeding GEE memory limits
 *  - Use bounded random sampling instead of full reduceRegion
 * 
 * WHY SAMPLING:
 *  - Problem: reduceRegion(histogram) on large AOIs can hit "Memory capacity exceeded"
 *  - Especially with complex masks (DEM footprint + permanent water exclusion)
 *  - Sampling bounds cost to N pixels regardless of AOI size
 * 
 * STRATEGY:
 *  1) Random sample up to N pixels at coarser scale (e.g., 200m)
 *  2) Run histogram reducer on the sampled FeatureCollection
 *  3) Result: representative histogram, predictable memory cost
 * 
 * SAMPLING PARAMETERS (from CONFIG.HIST):
 *  - sampleScaleM: Pixel spacing for sampling (200m default)
 *     * Coarser scale → fewer candidate pixels → faster
 *     * Still representative: 200m sampling gives ~60k pixels over 2400 km²
 *  - samplePixels: Max number of samples (60k default)
 *     * More samples → more accurate histogram → slower
 *     * 40k-100k is the sweet spot for stable Otsu
 *  - maxBuckets: Histogram bins (128 default)
 *     * Fewer bins → coarser histogram → faster
 *     * 128 is plenty for Otsu (cheaper than 255)
 *  - tileScale: Subdivide into more tiles (8 default)
 *     * Higher → more tiles → less memory per tile
 * 
 * OUTPUT FORMAT:
 *  Matches reduceRegion(histogram): {histogram: [...], bucketMeans: [...]}
 * 
 * PERFORMANCE:
 *  - Typical cost: 200m scale, 60k samples → ~2-5 seconds for large AOI
 *  - Compare to: Full reduceRegion on same AOI → "Memory exceeded" error
 * 
 * ACCURACY:
 *  - Otsu is robust to sampling: 60k samples gives nearly identical threshold to full histogram
 *  - Tested: <0.5 dB difference in threshold for most AOIs
 * 
 * @param {ee.Image} img - single-band image to histogram
 * @param {String} bandName - band name (e.g., 'VV', 'deltaVV')
 * @param {ee.Geometry} aoi - area of interest
 * @return {ee.Dictionary} {'histogram': [...], 'bucketMeans': [...]}
 */
function safeHistogramSampled(img, bandName, aoi) {
  // Read parameters from CONFIG (with sensible defaults)
  var scaleM    = CONFIG.HIST.sampleScaleM || 200;    // Sampling grid spacing (m)
  var nPix      = CONFIG.HIST.samplePixels || 60000;  // Max samples to use
  var buckets   = CONFIG.HIST.maxBuckets || 128;      // Histogram bins
  var tileScale = CONFIG.HIST.tileScale || 8;         // Tile subdivision factor

  // Sample only unmasked pixels
  // If histMask is applied to img, this respects it (samples only from valid land areas)
  var fc = img.select([bandName]).sample({
    region: aoi,
    scale: scaleM,        // Coarser scale = fewer candidate pixels
    numPixels: nPix,      // Cap at this many samples (memory-bounded)
    geometries: false,    // Don't store geometries (saves memory)
    tileScale: tileScale  // Process in smaller tiles
  });

  var has = fc.size().gt(0);

  // Build histogram from sampled FeatureCollection
  // reduceColumns returns: {histogram: {histogram: [...], bucketMeans: [...], ...}}
  var stats = ee.Dictionary(ee.Algorithms.If(
    has,
    fc.reduceColumns({
      reducer: ee.Reducer.histogram({maxBuckets: buckets}),
      selectors: [bandName]
    }),
    // Safety: if no samples (shouldn't happen), return dummy histogram
    ee.Dictionary({histogram: ee.Dictionary({histogram: [1], bucketMeans: [0]})})
  ));

  // Extract the nested histogram dictionary
  var h = ee.Dictionary(stats.get('histogram'));

  // Final safety: if anything is still null-ish, return dummy hist.
  return ee.Dictionary(ee.Algorithms.If(
    h,
    h,
    ee.Dictionary({histogram: [1], bucketMeans: [0]})
  ));
}


/**
 * Otsu threshold from an Earth Engine histogram dictionary (single-band).
 * 
 * ALGORITHM:
 *  - Otsu's method finds the optimal threshold that maximizes between-class variance (BCV).
 *  - Splits histogram into two classes at each possible threshold, computes variance separation.
 *  - Returns threshold at split point with maximum BCV.
 * 
 * WHY OTSU FOR FLOOD MAPPING:
 *  - Automatically adapts to each AOI's backscatter distribution (no manual threshold tuning).
 *  - Assumes bimodal histogram (dark water vs bright land) → robust for change detection.
 *  - Works well when flood creates clear separation in VV or deltaVV histograms.
 * 
 * ROBUSTNESS FEATURES:
 *  - Handles edge cases: 0-bucket (returns 0), 1-bucket (returns that value).
 *  - Computes BCV only over valid split points 1..(size-1) to avoid empty classes.
 *  - Safe against null/undefined histograms (returns fallback values).
 * 
 * INPUT FORMAT (from reduceRegion or reduceColumns):
 *  {
 *    histogram: [count1, count2, ...],     // pixel counts per bucket
 *    bucketMeans: [val1, val2, ...]        // mean value per bucket
 *  }
 * 
 * LIMITATIONS:
 *  - Fails on unimodal histograms (e.g., all water or all land) → picks arbitrary threshold.
 *  - Sensitive to histogram mask (ocean inclusion shifts threshold) → use HIST.enabled=true.
 * 
 * @param {ee.Dictionary} hist - dict with 'histogram' and 'bucketMeans'
 * @return {ee.Number} optimal threshold value
 */
function otsu(hist) {
  hist = ee.Dictionary(hist);

  var counts = ee.Array(hist.get('histogram'));
  var means  = ee.Array(hist.get('bucketMeans'));
  var size   = ee.Number(means.length().get([0]));

  // Edge case handling
  var threshold = ee.Algorithms.If(
    size.eq(0),
    ee.Number(0), // No buckets → return 0
    ee.Algorithms.If(
      size.eq(1),
      ee.Number(means.get([0])), // Single bucket → return that value
      _otsuCore(counts, means, size)
    )
  );

  return ee.Number(threshold);
}


/**
 * Core Otsu computation (expects size >= 2).
 * 
 * IMPLEMENTATION:
 *  - Iterate over all possible split points i = 1..(size-1)
 *  - For each split:
 *     - Class 1 (lower): buckets 0..(i-1)
 *     - Class 2 (upper): buckets i..(size-1)
 *  - Compute between-class variance: BCV = w1 * w2 * (μ1 - μ2)²
 *  - Return threshold at split with maximum BCV
 * 
 * WHY BCV (not within-class variance):
 *  - BCV directly measures separation between classes → larger BCV = better split.
 *  - Equivalent to minimizing within-class variance but simpler to compute.
 * 
 * NUMERICAL STABILITY:
 *  - Adds 1e-6 to totals to prevent division by zero (shouldn't happen with valid histograms).
 * 
 * @param {ee.Array} counts - pixel counts per bucket
 * @param {ee.Array} means - mean value per bucket
 * @param {ee.Number} size - number of buckets (>=2)
 * @return {ee.Number} threshold at optimal split point
 */
function _otsuCore(counts, means, size) {
  var total = ee.Number(counts.reduce(ee.Reducer.sum(), [0]).get([0])).add(1e-6);

  // Compute BCV for each split point
  var bcvList = ee.List.sequence(1, size.subtract(1)).map(function(i) {
    i = ee.Number(i);

    // Class 1: buckets [0, i)
    var c1 = counts.slice(0, 0, i);
    var m1 = means.slice(0, 0, i);
    
    // Class 2: buckets [i, size)
    var c2 = counts.slice(0, i);
    var m2 = means.slice(0, i);

    // Class weights
    var s1 = ee.Number(c1.reduce(ee.Reducer.sum(), [0]).get([0])).add(1e-6);
    var s2 = ee.Number(c2.reduce(ee.Reducer.sum(), [0]).get([0])).add(1e-6);

    // Class weights
    var w1 = s1.divide(total);
    var w2 = s2.divide(total);

    // Class means
    var mu1 = ee.Number(m1.multiply(c1).reduce(ee.Reducer.sum(), [0]).get([0])).divide(s1);
    var mu2 = ee.Number(m2.multiply(c2).reduce(ee.Reducer.sum(), [0]).get([0])).divide(s2);

    // Between-class variance: BCV = w1 * w2 * (μ1 - μ2)²
    return w1.multiply(w2).multiply(mu1.subtract(mu2).pow(2));
  });

  // Find split with maximum BCV
  var maxVal = ee.Number(bcvList.reduce(ee.Reducer.max()));
  var idx0   = ee.Number(bcvList.indexOf(maxVal)); // 0-indexed in list (split i=1 is at idx=0)
  var idx    = idx0.add(1);                        // Convert to bucket index

  return ee.Number(means.get([idx]));
}


/** 
 * AOI resolver (FLEXIBLE)
 *   
 * getAOI(): Multi-mode AOI resolver with rich debug output.
 *
 * Modes:
 *  - 'GAUL'  : GAUL 2024 L2 lookup (gaul0/1/2_name) with dynamic fallbacks
 *  - 'ASSET' : user asset FeatureCollection (CONFIG.AOI.ASSET.assetId)
 *  - 'DRAWN' : geometry drawn in UI (Imports panel), typically variable named `geometry`
 *  - 'PASTE' : geometry pasted as CODE: var geometry = ee.Geometry...
 *  - 'AUTO'  : ASSET (if provided) -> PASTE (if geometry var exists) -> GAUL
 *
 * Why both DRAWN and PASTE use `geometry`?
 *  - In GEE Code Editor, both features commonly create a variable named `geometry`.
 *  - We let CONFIG decide the user intent.
 *
 * Debug prints (when CONFIG.AOI.debug = true):
 *  - Which mode used, and availability flags
 *  - GAUL property names
 *  - GAUL matched names + candidate district list under province
 *
 * @return {ee.Geometry}
 */
function getAOI() {

  /** @return {Boolean} true if there is a variable named `geometry` in the script context. */
  function hasGeometryVar() {
    return (typeof geometry !== 'undefined');
  }

  /**
   * Convert any geometry-like object into ee.Geometry and optionally buffer it.
   * @param {ee.Geometry} geom
   * @param {Number} bufferM
   * @return {ee.Geometry}
   */
  function toBufferedGeometry(geom, bufferM) {
    geom = ee.Geometry(geom);
    bufferM = bufferM || 0;
    return bufferM > 0 ? geom.buffer(bufferM) : geom;
  }

  /**
   * AOI from ASSET FeatureCollection.
   * @return {ee.Geometry}
   */
  function aoiFromAsset() {
    var fc = ee.FeatureCollection(CONFIG.AOI.ASSET.assetId);
    return toBufferedGeometry(fc.geometry(), CONFIG.AOI.ASSET.bufferM);
  }

  /**
   * AOI from PASTED geometry code: var geometry = ee.Geometry...
   * @return {ee.Geometry}
   */
  function aoiFromPaste() {
    return toBufferedGeometry(ee.Geometry(geometry), CONFIG.AOI.PASTE.bufferM);
  }

  /**
   * AOI from DRAWN geometry in Code Editor (Imports panel).
   * @return {ee.Geometry}
   */
  function aoiFromDrawn() {
    return toBufferedGeometry(ee.Geometry(geometry), CONFIG.AOI.DRAWN.bufferM);
  }

  /**
   * AOI from GAUL 2024 L2 with debuggable matching + dynamic fallback.
   * @return {ee.Geometry}
   */
  function aoiFromGAUL() {
    var gaul = CONFIG.AOI.GAUL;
    var fc = ee.FeatureCollection(gaul.adminDataset);

    if (CONFIG.AOI.debug) {
      print('GAUL 2024 L2 property names (first feature):',
        ee.Feature(fc.first()).propertyNames());
    }

    // Stepwise filtering
    var c0 = fc.filter(ee.Filter.eq('gaul0_name', gaul.gaul0_name));
    var c1 = c0.filter(ee.Filter.eq('gaul1_name', gaul.gaul1_name));
    var c2 = c1.filter(ee.Filter.eq('gaul2_name', gaul.gaul2_name));

    // Debug prints (values + candidates)
    if (CONFIG.AOI.debug) {
      print('GAUL0 matched gaul0_name:', c0.aggregate_array('gaul0_name').distinct());
      print('GAUL1 matched gaul1_name (within gaul0):', c1.aggregate_array('gaul1_name').distinct());
      print('GAUL2 matched gaul2_name (within gaul1):', c2.aggregate_array('gaul2_name').distinct());

      var cand2 = c1.aggregate_array('gaul2_name').distinct().sort()
        .slice(0, CONFIG.AOI.maxList);
      print('GAUL2 candidates under province (first ' + CONFIG.AOI.maxList + '):', cand2);

      print('GAUL match counts:', ee.Dictionary({
        gaul0: c0.size(),
        gaul1: c1.size(),
        gaul2: c2.size()
      }));
    }

    // Best: exact district/city geometry
    var geomExact = ee.Feature(c2.first()).geometry();

    // Dynamic fallbacks:
    // - if gaul2 missing: province geometry bounds -> centroid -> buffer
    // - if province missing: country geometry bounds -> centroid -> buffer
    var geomProvFallback = c1.geometry().bounds(1000).centroid(1000).buffer(CONFIG.AOI.fallbackBufferM);
    var geomCtryFallback = c0.geometry().bounds(5000).centroid(5000).buffer(CONFIG.AOI.fallbackBufferM);

    // Last resort
    var geomLastResort = ee.Geometry.Point([0, 0]).buffer(1000);

    // Choose best available
    var geom = ee.Algorithms.If(
      c2.size().gt(0), geomExact,
      ee.Algorithms.If(
        c1.size().gt(0), geomProvFallback,
        ee.Algorithms.If(
          c0.size().gt(0), geomCtryFallback,
          geomLastResort
        )
      )
    );

    if (CONFIG.AOI.debug) {
      var used = ee.Algorithms.If(
        c2.size().gt(0), 'GAUL: gaul2 exact',
        ee.Algorithms.If(
          c1.size().gt(0), 'GAUL fallback: province centroid+buffer',
          ee.Algorithms.If(
            c0.size().gt(0), 'GAUL fallback: country centroid+buffer',
            'GAUL fallback: [0,0] (CHECK gaul0_name spelling)'
          )
        )
      );
      print('AOI selection used:', used);
    }

    return ee.Geometry(geom);
  }

  // -------------------------
  // Resolve mode
  // -------------------------
  var mode = (CONFIG.AOI.mode || 'AUTO').toUpperCase();

  // Client-side availability checks
  var assetProvided = (CONFIG.AOI.ASSET.assetId && CONFIG.AOI.ASSET.assetId.length > 0);
  var geomProvided  = hasGeometryVar();

  // AUTO priority: ASSET → PASTE (if geometry exists) → GAUL
  var chosen = mode;
  if (mode === 'AUTO') {
    chosen = assetProvided ? 'ASSET'
           : geomProvided  ? 'PASTE'
           : 'GAUL';
  }

  if (CONFIG.AOI.debug) {
    print('AOI mode requested:', mode, '→ AOI mode used:', chosen);
    if (mode === 'AUTO') print('AUTO availability:', {assetProvided: assetProvided, geometryProvided: geomProvided});
  }

  if (chosen === 'ASSET') return assetProvided ? aoiFromAsset() : aoiFromGAUL();
  if (chosen === 'PASTE') return geomProvided  ? aoiFromPaste() : aoiFromGAUL();
  if (chosen === 'DRAWN') return geomProvided  ? aoiFromDrawn() : aoiFromGAUL();

  // Default: GAUL
  return aoiFromGAUL();
}




/** #############################################
 *  2) Data preparation
 *  ############################################# 
 * 
 * OVERVIEW:
 *  - Preprocess individual Sentinel-1 GRD images (gamma0, edge masking)
 *  - Build temporal composites (pre-event baseline, post-event flood)
 *  - Handle empty collections gracefully (prevents crashes)
 * 
 * WORKFLOW:
 *  1) preprocessS1(): Apply corrections to each S1 image
 *  2) buildS1Composite(): Aggregate corrected images into single composite per orbit/window
 *  3) Used in MAIN: Build 4 composites (pre/post × ASCENDING/DESCENDING)
 * 
 * KEY DESIGN CHOICES:
 *  - Gamma0 correction: Reduces incidence angle brightness gradient
 *  - Edge masking: Removes border artifacts (scalloping)
 *  - Temporal reduction: Median (pre) for stability, Min (post) for peak flood
 *  - Empty collection handling: Masked placeholder prevents crashes
 */

/**
 * Preprocess Sentinel-1 GRD: corrections, masking, and band selection.
 * 
 * STEPS:
 *  1) Select VV, VH (dB), and incidence angle (degrees)
 *  2) OPTIONAL: Simple gamma0 angle correction (reduces brightness gradient across swath)
 *  3) OPTIONAL: Border/edge masking (removes low VV noise at scene edges)
 * 
 * BAND CONVENTIONS:
 *  - VV, VH: Already in dB (decibels, log scale) in COPERNICUS/S1_GRD
 *  - angle: Incidence angle in degrees (20°-45° for IW mode)
 *  - No unit conversion needed; GEE provides dB directly
 *  - Typical ranges: VV = -25 to 5 dB, VH = -35 to -5 dB (depends on target)
 * 
 * WHY GAMMA0 CORRECTION:
 *  - Raw sigma0 has brightness gradient: near range (steep angle) brighter than far range.
 *  - Formula: gamma0_dB ≈ sigma0_dB - 10*log10(cos(angle))
 *  - Result: More uniform backscatter across swath → more stable Otsu thresholds.
 *  - LIMITATION: This is NOT full terrain flattening; layover/shadow still present in mountains.
 * 
 * WHY EDGE MASKING:
 *  - GRD scenes have border artifacts ("scalloping") with anomalously low VV.
 *  - These dark edges can mimic water → false positives.
 *  - Masking pixels with VV < edgeDbThreshold (e.g., -35 dB) removes most border noise.
 *  - TRADE-OFF: May remove real dark water if it's genuinely < -35 dB (rare but possible).
 * 
 * MASKING STRATEGY:
 *  - Apply mask to VV only (VH can be noisier at edges; ratio constraint handles VH quality).
 *  - updateMask() propagates: masked pixels become transparent in all downstream ops.
 * 
* OUTPUT:
 *  - Image with bands: VV (dB), VH (dB), angle (degrees)
 *  - Preserves original metadata (system:time_start, orbitProperties_pass, etc.)
 * 
 * EXAMPLE VALUES (typical):
 *  INPUT (raw sigma0):
 *   - VV: -12 dB (near range, bright) to -18 dB (far range, darker)
 *   - VH: -20 dB (near range) to -26 dB (far range)
 *   - angle: 30° (near range) to 45° (far range)
 *  
 *  OUTPUT (after gamma0 correction):
 *   - VV: -11.5 dB (near range) to -16.5 dB (far range) — gradient reduced
 *   - VH: -19.5 dB (near range) to -24.5 dB (far range) — gradient reduced
 *   - angle: unchanged (30° to 45°)
 *  
 *  EDGE MASKING (edgeDbThreshold = -35 dB):
 *   - Keeps: VV > -35 dB (most valid land/water)
 *   - Masks: VV <= -35 dB (border scalloping artifacts)
 * 
 * @param {ee.Image} img - Sentinel-1 GRD image
 * @return {ee.Image} preprocessed image with VV,VH (dB) + angle (deg)
 */
function preprocessS1(img) {
  var vv = img.select('VV');
  var vh = img.select('VH');
  var ang = img.select('angle');

  // Edge mask: mask extremely low VV (border noise)
  var mask = ee.Image(1);
  if (CONFIG.S1.clipEdges) {
    mask = vv.gt(CONFIG.S1.edgeDbThreshold);
    // Result: pixels with VV <= -35 dB (or custom threshold) are masked out
  }

  // Approx gamma0 correction using incidence angle only:
  // gamma0_dB = sigma0_dB - 10*log10(cos(theta))
  if (CONFIG.S1.applyGamma0AngleCorrection) {
    // Convert angle (degrees) to radians
    var theta = ang.multiply(Math.PI / 180.0);
    // Correction term: 10*log10(cos(theta))
    var corr = theta.cos().log10().multiply(10);
    // Apply correction: gamma0_dB = sigma0_dB - correction
    vv = vv.subtract(corr);
    vh = vh.subtract(corr);
    // Physical interpretation:
    //  - Near range (small angle, ~20°): cos(20°) ≈ 0.94 → correction ≈ -0.27 dB → VV increases
    //  - Far range (large angle, ~45°): cos(45°) ≈ 0.71 → correction ≈ -1.49 dB → VV increases more
    //  - Result: Far range brightens more, reducing the brightness gradient
  }

  // Return preprocessed bands with mask applied
  return ee.Image.cat([vv.rename('VV'), vh.rename('VH'), ang.rename('angle')])
    .updateMask(mask)
    .copyProperties(img, img.propertyNames());
}


/**
 * Build a robust Sentinel-1 composite (pre or post) for a given orbit direction.
 * 
 * PURPOSE:
 *  - Aggregate multiple S1 acquisitions into a single representative image.
 *  - Handles empty collections gracefully (returns masked placeholder → prevents crashes).
 * 
 * FILTERING:
 *  1) Bounds: AOI intersection
 *  2) Date: [start, end) window
 *  3) Instrument mode: 'IW' (Interferometric Wide swath) for consistent geometry
 *  4) Orbit pass: 'ASCENDING' or 'DESCENDING' (processed separately to reduce geometry artifacts)
 *  5) Polarizations: Must have both VV and VH
 * 
 * REDUCER STRATEGIES:
 *  - 'median' (RECOMMENDED for pre-event baseline):
 *      Robust to outliers (wet days, noise bursts), stable reference for change detection.
 *  - 'mean':
 *      Smoother but can be biased by extreme values; less common for SAR.
 *  - 'min' (RECOMMENDED for post-event flood):
 *      Captures the darkest backscatter in the window → "peak flood extent" selector.
 *      CRITICAL for floods: one very dark acquisition indicates water presence.
 *      RISK: Also captures wind-roughened water, shadow pockets → needs plausibility masking.
 *  - 'max':
 *      Sometimes useful for detecting bright targets (urban, ice) but not for floods.
 * 
* ROBUSTNESS AGAINST EMPTY COLLECTIONS:
 *  - Problem: If no S1 images exist (wrong orbit, date range, or AOI), downstream ops crash.
 *     * Error type: "Image.select: Pattern 'VV' did not match any bands"
 *     * Cause: Empty collection → no image to reduce → missing bands
 *  - Solution: Return a fully-masked placeholder image with correct band names.
 *     * Placeholder values: VV=-999, VH=-999, angle=0 (arbitrary; will be masked)
 *     * updateMask(0) makes all pixels transparent (masked out)
 *  - Result: Flood probability becomes masked (no false detections from missing data).
 *     * Downstream ops see correct band names but zero valid pixels
 *     * floodProbability() returns masked probability → applyMasksAndPost() returns empty flood mask
 *  - Why this matters: Graceful degradation instead of hard crash
 *     * Script completes successfully (just with empty results)
 *     * User sees Console print "0 images" and knows to check date/orbit/AOI
 * 
* DEBUGGING:
 *  - Prints image count per orbit/window to Console → verify acquisitions exist.
 *  - If count = 0, check:
 *     - Date range (S1 launched 2014; full coverage by ~2015)
 *     - Orbit direction (some regions have sparse ASCENDING or DESCENDING coverage)
 *     - AOI location (polar regions / small islands may have gaps)
 * 
 * EXPECTED ACQUISITION COUNTS (60-day window):
 *  Region                    ASCENDING    DESCENDING    Total
 *  Europe                    10-12        10-12         20-24
 *  North America             6-8          6-8           12-16
 *  Southeast Asia            5-7          5-7           10-14
 *  Polar regions (>70° lat)  15-20        15-20         30-40 (frequent coverage)
 *  Small islands             2-4          2-4           4-8 (may have gaps)
 * 
 *  If your counts are significantly lower:
 *   - Check instrumentMode filter (should be 'IW' for land)
 *   - Check polarization filter (need both VV and VH)
 *   - Consider extending baseline window (60 → 90 days)
 * 
 * @param {ee.Geometry} aoi - area of interest
 * @param {String} orbit - 'ASCENDING' or 'DESCENDING'
 * @param {ee.Date} start - window start (inclusive)
 * @param {ee.Date} end - window end (exclusive)
 * @param {String} reducer - 'median'|'mean'|'min'|'max'
 * @return {ee.Image} composite with VV, VH, angle (all in dB except angle in deg)
 */
function buildS1Composite(aoi, orbit, start, end, reducer) {
  // Allow older configs to still work:
  // - If reducer passed in, use it
  // - Else fall back to CONFIG.S1.temporalReducer (if it exists)
  // - Else default to 'median'
  reducer = reducer || CONFIG.S1.temporalReducer || 'median';

  // Build filtered collection
  var ic = ee.ImageCollection(CONFIG.S1.collection)
    .filterBounds(aoi)
    .filterDate(start, end)
    .filter(ee.Filter.eq('instrumentMode', CONFIG.S1.instrumentMode))
    .filter(ee.Filter.eq('orbitProperties_pass', orbit))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
    .map(preprocessS1);

  // Debug: print image count (helps diagnose empty collection issues)
  print(labelOrbitWindow(orbit, start, end), ic.size(), 'reducer=', reducer);

  var has = ic.size().gt(0);

  // Choose reducer safely (client-side string switch; output is server-side ee.Image)
  // Why client-side switch: ee.Algorithms.If requires server-side logic, but string
  // comparison is client-side, so we build a nested If structure that gets evaluated
  // server-side once deployed. This avoids .getInfo() calls.
  var reduced = ee.Image(
    ee.Algorithms.If(
      reducer === 'mean', ic.mean(),
      ee.Algorithms.If(
        reducer === 'min', ic.min(),
        ee.Algorithms.If(
          reducer === 'max', ic.max(),
          ic.median() // default fallback
        )
      )
    )
  );

  // Safety: if collection is empty, return fully-masked placeholder
  // This prevents "band not found" errors and ensures no false flood detections
  var placeholder = ee.Image.constant([-999, -999, 0])
    .rename(['VV', 'VH', 'angle'])
    .updateMask(ee.Image(0)); // Fully masked → transparent in all ops

  var comp = ee.Image(ee.Algorithms.If(has, reduced, placeholder));

  return comp.clip(aoi);
}




/** #############################################
 *  3) Flood probability model (GRD ensemble)
 *  #############################################
 * 
 * OVERVIEW:
 *  - Core flood detection algorithm using Sentinel-1 GRD backscatter
 *  - Ensemble approach: combines three complementary evidence types
 *  - Optional coherence fusion for improved accuracy
 *  - Physics-based masking to remove implausible detections
 * 
 * WORKFLOW:
 *  1) floodProbability(): Compute continuous probability (0-1) from pre/post composites
 *  2) coherenceEvidence(): (Optional) Add SLC coherence evidence
 *  3) fuseFloodProbability(): Blend GRD + coherence probabilities
 *  4) applyMasksAndPost(): Apply plausibility masks + post-processing
 * 
 * KEY INNOVATION:
 *  - NOT a single hard threshold (brittle, noisy)
 *  - Ensemble of soft probabilities (robust, interpretable)
 *  - Automatic threshold adaptation via Otsu (no manual tuning)
 * 
 * EVIDENCE TYPES:
 *  1) Change (ΔVV): Newly darkened pixels → flood over normally bright land
 *  2) Absolute (VV_post): Intrinsically dark pixels → open water detection
 *  3) Ratio (VH/VV): Water-like scattering → rejects smooth manmade surfaces
 *  (4) Coherence (optional): Surface change → complements GRD darkness
 */

/**
 * Compute ensemble flood probability from pre & post composites (single orbit).
 * 
 * PURPOSE:
 *  - Transform backscatter evidence into continuous flood probability (0-1)
 *  - Combine three complementary evidence types with soft thresholds
 *  - Automatically adapt thresholds to each AOI via Otsu
 * 
 * ALGORITHM:
 *  1) Compute evidence images:
 *      - ΔVV = VV_post - VV_pre (change in backscatter, dB)
 *      - VV_post (absolute post-event backscatter, dB)
 *      - VH/VV ratio = VH_post - VV_post (water-like scattering, dB)
 *  2) Estimate thresholds via Otsu:
 *      - tChange: optimal ΔVV threshold (bimodal histogram: changed vs unchanged)
 *      - tAbs: optimal VV_post threshold (bimodal histogram: dark vs bright)
 *  3) Transform each evidence via sigmoid:
 *      - p_change = sigmoid((tChange - ΔVV) / k_change)
 *      - p_abs = sigmoid((tAbs - VV_post) / k_abs)
 *      - p_ratio = sigmoid((ratioThreshDb - VH/VV) / k_ratio)
 *      Result: continuous 0-1 probability (0=unlikely, 1=certain)
 *  4) Weighted ensemble:
 *      - floodProb = w_change*p_change + w_abs*p_abs + w_ratio*p_ratio
 *      - Weights from CONFIG.SCORE (sum to ~1.0)
 * 
 * WHY ENSEMBLE (vs single threshold):
 *  - Single evidence can fail:
 *     * ΔVV alone: misses floods over already-dark surfaces (wetlands, rice paddies)
 *     * VV_post alone: false positives on smooth surfaces (parking lots, calm lakes)
 *     * VH/VV alone: noisy in vegetation, unstable in urban areas
 *  - Ensemble is robust: multiple lines of evidence must agree
 *  - Weighted combination: emphasize most reliable evidence for each AOI type
 * 
 * WHY SIGMOID (vs hard threshold):
 *  - Hard threshold: if (ΔVV < tChange) → 1, else → 0
 *     * Brittle: single dB difference changes decision completely
 *     * Noise-sensitive: speckle causes salt-and-pepper artifacts
 *  - Soft sigmoid: probability gradually transitions around threshold
 *     * Robust: small deviations → small probability changes
 *     * Interpretable: probability = confidence in flood presence
 *     * Tunable: k parameter controls transition sharpness
 * 
 * HISTOGRAM MASKING (AOI shape robustness):
 *  - Problem: Otsu thresholds depend on histogram of AOI
 *     * DRAWN bbox: includes ocean → ocean's dark VV dominates histogram
 *     * GAUL polygon: excludes ocean → histogram represents land
 *     * Result: different thresholds → inconsistent flood extent
 *  - Solution: Use dedicated histMask for threshold estimation only
 *     * histMask = land-like (DEM footprint) + not-permanent-water (GSW)
 *     * Estimate tChange, tAbs from masked histogram (stable across AOI shapes)
 *     * Apply probabilities to full unmasked data (no data loss)
 *  - Implementation:
 *     * Create temporary masked copies: deltaVV_hist, postVV_hist
 *     * Use these ONLY for safeHistogram() → otsu()
 *     * Compute probabilities on original unmasked deltaVV, postVV
 * 
 * EXAMPLE THRESHOLDS (typical values):
 *  - tChange (ΔVV threshold):
 *     * -3 to -5 dB: Significant darkening (flood over land)
 *     * More negative (e.g., -7 dB): Strong flood signal (good separation)
 *     * Less negative (e.g., -2 dB): Weak signal (may include soil moisture changes)
 *  - tAbs (VV_post threshold):
 *     * -15 to -18 dB: Typical water/dark surface cutoff
 *     * More negative (e.g., -20 dB): Very strict (only open water)
 *     * Less negative (e.g., -12 dB): Looser (includes wet soil, urban shadow)
 * 
 * EXAMPLE PROBABILITIES:
 *  Scenario: tChange = -4 dB, k_change = 1.5 dB
 *  - Pixel A: ΔVV = -7 dB (3 dB below threshold) → sigmoid(2) ≈ 0.88 → HIGH flood probability
 *  - Pixel B: ΔVV = -4 dB (at threshold) → sigmoid(0) = 0.50 → MEDIUM flood probability
 *  - Pixel C: ΔVV = -1 dB (3 dB above threshold) → sigmoid(-2) ≈ 0.12 → LOW flood probability
 * 
 * OUTPUTS:
 *  Multiband image with:
 *  - floodProb: Final ensemble probability (0-1)
 *  - deltaVV: Change in VV (dB)
 *  - postVV: Post-event VV (dB)
 *  - ratioDb: VH/VV ratio (dB)
 *  - p_change, p_abs, p_ratio: Component probabilities (0-1, for diagnostics)
 * 
 * @param {ee.Image} pre - Pre-event composite with VV, VH (dB)
 * @param {ee.Image} post - Post-event composite with VV, VH (dB)
 * @param {ee.Geometry} aoi - Area of interest
 * @param {ee.Image=} histMask - OPTIONAL mask for Otsu histogram sampling (land + not-perm-water)
 * @return {ee.Image} Multiband image with floodProb and diagnostic bands
 */
function floodProbability(pre, post, aoi, histMask) {
  var preVV  = pre.select('VV');
  var postVV = post.select('VV');
  var postVH = post.select('VH');

  var deltaVV = postVV.subtract(preVV).rename('deltaVV');
  var ratioDb = postVH.subtract(postVV).rename('ratioDb');

  // ------------------------------------------------------------
  // Histogram sampling (Otsu) — OPTIONAL stabilization
  // ------------------------------------------------------------
  // IMPORTANT:
  //  - Using the AOI directly can produce different thresholds for GAUL vs DRAWN bbox,
  //    especially near coasts (ocean dominates VV histogram).
  //  - We therefore allow passing a dedicated histMask (land-like & not-perm-water).
  //
  // We do NOT want to permanently mask deltaVV/postVV for probability computation,
  // so use dedicated masked copies ONLY for histogram estimation.
  var deltaVV_hist = deltaVV;
  var postVV_hist  = postVV;

  if (typeof histMask !== 'undefined' && histMask !== null) {
    deltaVV_hist = deltaVV.updateMask(histMask);
    postVV_hist  = postVV.updateMask(histMask);
  }

  // Histograms (safe)
  var deltaHist = safeHistogram(deltaVV_hist, 'deltaVV', aoi, 30, 255);
  var postHist  = safeHistogram(postVV_hist,  'VV',      aoi, 30, 255);

  // Otsu thresholds (scalar numbers)
  var tChange = otsu(deltaHist);
  var tAbs    = otsu(postHist);

  print('Otsu thresholds: tChange (deltaVV) =', tChange, 'tAbs (postVV) =', tAbs);

  // Promote scalars to images to keep image-space math (prevents ee.Number → rename errors)
  var tChangeImg = ee.Image.constant(tChange);
  var tAbsImg    = ee.Image.constant(tAbs);

  // Components (soft 0..1)
  var p_change = sigmoid(tChangeImg.subtract(deltaVV).divide(CONFIG.SCORE.k_change)).rename('p_change');
  var p_abs    = sigmoid(tAbsImg.subtract(postVV).divide(CONFIG.SCORE.k_abs)).rename('p_abs');
  var p_ratio  = sigmoid(
      ee.Image.constant(CONFIG.SCORE.ratioThreshDb).subtract(ratioDb).divide(CONFIG.SCORE.k_ratio)
    ).rename('p_ratio');

  // Weighted ensemble probability
  var floodProb = p_change.multiply(CONFIG.SCORE.w_change)
    .add(p_abs.multiply(CONFIG.SCORE.w_abs))
    .add(p_ratio.multiply(CONFIG.SCORE.w_ratio))
    .clamp(0, 1)
    .rename('floodProb');

  return ee.Image.cat([
    floodProb,
    deltaVV,
    postVV.rename('postVV'),
    ratioDb,
    p_change, p_abs, p_ratio
  ]);
}


/**
 * Load a coherence asset (external SLC coherence GeoTIFF uploaded to Assets).
 * 
 * PURPOSE:
 *  - Access pre-computed Sentinel-1 SLC interferometric coherence
 *  - Coherence computed externally (SNAP, HyP3, ISCE2) and uploaded to GEE
 * 
 * COHERENCE BACKGROUND:
 *  - Coherence = phase correlation between two SAR acquisitions
 *  - Range: 0 (completely decorrelated) to 1 (perfectly coherent)
 *  - High coherence (>0.7): Stable surface (bare soil, rock, urban)
 *  - Low coherence (<0.3): Surface changed (water, vegetation growth, landslide)
 * 
 * TYPICAL BAND NAMES:
 *  - SNAP: 'coh' or 'coherence'
 *  - ASF HyP3: 'corr' or 'b1' (single-band GeoTIFF)
 *  - Custom processing: varies (check metadata)
 *  - CONFIG.COH.cohBand controls which band to select (default 'b1')
 * 
 * EXPECTED FORMAT:
 *  - Single-band GeoTIFF
 *  - Values: 0-1 (float) or 0-255 (byte, needs rescaling)
 *  - Projection: same as Sentinel-1 (typically EPSG:4326 or UTM)
 *  - Resolution: 10-20m (depends on processing)
 * 
 * USAGE IN THIS SCRIPT:
 *  - Event coherence: computed from SLC pair during flood
 *  - Pre-event coherence (optional): computed from SLC pair before flood
 *  - Used by coherenceEvidence() to compute coherence-based flood probability
 * 
 * @param {String} assetId - GEE Asset path (e.g., 'users/yourname/flood_coherence')
 * @param {ee.Geometry} aoi - Area of interest (for clipping)
 * @return {ee.Image} Single-band image named 'coh' (values 0-1)
 */
function loadCoherence(assetId, aoi) {
  return ee.Image(assetId).select([CONFIG.COH.cohBand]).rename('coh').clip(aoi);
}


/**
 * Build coherence evidence probability for flood detection.
 * 
 * PURPOSE:
 *  - Compute flood probability from Sentinel-1 SLC coherence evidence
 *  - Combine two coherence-based signals: low coherence + coherence drop
 *  - Complement GRD backscatter evidence (detects surface change, not just darkness)
 * 
 * ALGORITHM:
 *  1) Low coherence evidence:
 *      - Event coherence < lowCohThresh (e.g., 0.25) → likely surface change
 *      - p_coh_low = sigmoid((lowCohThresh - coh_event) / k_low)
 *      - Example: coh_event = 0.15 → p_coh_low ≈ 0.84 (high probability)
 * 
 *  2) Coherence drop evidence (if pre-event coherence available):
 *      - Δcoh = coh_pre - coh_event (how much coherence dropped)
 *      - Δcoh > cohDropThresh (e.g., 0.15) → likely NEW surface change
 *      - p_coh_drop = sigmoid((Δcoh - cohDropThresh) / k_drop)
 *      - Example: coh_pre = 0.60, coh_event = 0.20 → Δcoh = 0.40 → p_coh_drop ≈ 0.99
 * 
 *  3) Combine evidences (if both available):
 *      - OR-logic: cohProb = 1 - (1 - p_low) * (1 - p_drop)
 *      - Interpretation: flood if EITHER low coherence OR coherence drop
 *      - If only event coherence: cohProb = p_low
 * 
 * WHY COHERENCE HELPS:
 *  - GRD detects "dark surfaces" → can't distinguish water from smooth manmade surfaces
 *  - Coherence detects "surface change" → distinguishes flood from pre-existing dark surfaces
 *  - Example: Parking lot
 *     * GRD: Very dark VV → FALSE POSITIVE flood
 *     * Coherence: Still high (0.8) → NOT decorrelated → NO flood
 *     * Result: Fusion reduces false positive
 * 
 * WHY COHERENCE DROP (pre vs event):
 *  - Problem: Some surfaces naturally have low coherence (vegetation, water bodies)
 *  - Low event coherence alone → can't distinguish flood from pre-existing low coherence
 *  - Solution: Compare to pre-event coherence
 *     * coh_pre high, coh_event low → NEW decorrelation → flood
 *     * coh_pre low, coh_event low → PERSISTENT low coherence → not flood (e.g., forest)
 * 
 * OR-COMBINE LOGIC:
 *  - Why OR (not AND): Flood can cause either low coherence OR coherence drop
 *     * Scenario A: Flood over bare soil → coh_pre = 0.8, coh_event = 0.2 → drop = 0.6 (DETECTED)
 *     * Scenario B: Flood over wetland → coh_pre = 0.3, coh_event = 0.15 → drop = 0.15 (MARGINAL)
 *     * But event coherence is low (0.15) → low coherence evidence DETECTED
 *  - Formula: P(A OR B) = 1 - P(not A) * P(not B) = 1 - (1-p_low)*(1-p_drop)
 * 
 * WHEN COHERENCE IS DISABLED (CONFIG.COH.enabled = false):
 *  - Return masked image with band 'cohProb'
 *  - updateMask(0) makes it fully transparent
 *  - fuseFloodProbability() ignores it (no contribution to final probability)
 *  - Prevents crashes when coherence assets not available
 * 
 * CHECKING FOR PRE-COHERENCE ASSET:
 *  - hasPre checks if assetId string starts with 'users/' or 'projects/'
 *  - If empty string '' or invalid: skip coherence drop computation
 *  - Return zero images for cohPre, dCoh, p_drop (won't contribute to cohProb)
 * 
 * OUTPUTS:
 *  Multiband image with:
 *  - cohProb: Final coherence probability (0-1)
 *  - coh_event: Event coherence (0-1)
 *  - coh_pre: Pre-event coherence (0-1, or 0 if not available)
 *  - dCoh: Coherence drop (pre - event, or 0 if pre not available)
 *  - p_coh_low: Low coherence probability (0-1)
 *  - p_coh_drop: Coherence drop probability (0-1, or 0 if pre not available)
 * 
 * @param {ee.Geometry} aoi - Area of interest
 * @return {ee.Image} Multiband image with cohProb and diagnostic bands
 */
function coherenceEvidence(aoi) {
  // Early return if coherence disabled: return masked dummy band
  if (!CONFIG.COH.enabled) {
    // Return masked band so selections won't crash but contributes nothing
    return ee.Image(0).rename('cohProb').clip(aoi).updateMask(ee.Image(0));
  }

  // Load event coherence (REQUIRED if enabled)
  var cohEvent = loadCoherence(CONFIG.COH.eventCohAssetId, aoi).rename('coh_event');

  // Compute low coherence evidence
  // sigmoid: higher probability when coh_event < lowCohThresh
  var p_low = sigmoid(
    ee.Image.constant(CONFIG.COH.lowCohThresh).subtract(cohEvent).divide(CONFIG.COH.k_low)
  ).rename('p_coh_low');

  // Check if pre-event coherence asset exists (enables coherence drop)
  // Valid asset IDs start with 'users/' or 'projects/'
  var hasPre = (CONFIG.COH.preCohAssetId &&
                (CONFIG.COH.preCohAssetId.indexOf('users/') === 0 || 
                 CONFIG.COH.preCohAssetId.indexOf('projects/') === 0));

  // Initialize pre-coherence bands (will stay zero if pre not available)
  var cohPre = ee.Image(0).rename('coh_pre').clip(aoi);
  var dCoh   = ee.Image(0).rename('dCoh').clip(aoi);
  var p_drop = ee.Image(0).rename('p_coh_drop').clip(aoi);

  // Compute coherence drop evidence if pre-coherence available
  if (hasPre) {
    cohPre = loadCoherence(CONFIG.COH.preCohAssetId, aoi).rename('coh_pre');
    dCoh   = cohPre.subtract(cohEvent).rename('dCoh');  // Positive = coherence decreased

    // sigmoid: higher probability when Δcoh > cohDropThresh
    p_drop = sigmoid(
      dCoh.subtract(ee.Image.constant(CONFIG.COH.cohDropThresh)).divide(CONFIG.COH.k_drop)
    ).rename('p_coh_drop');
  }

  // Combine evidences: OR-logic (flood if EITHER low coherence OR coherence drop)
  // Formula: P(A OR B) = 1 - (1-P(A))*(1-P(B))
  var cohProb = hasPre
    ? ee.Image(1).subtract(
        ee.Image(1).subtract(p_low).multiply(ee.Image(1).subtract(p_drop))
      ).rename('cohProb')
    : p_low.rename('cohProb');  // If no pre-coherence, use only low coherence evidence

  // Return all bands for diagnostics and fusion
  return ee.Image.cat([cohEvent, cohPre, dCoh, p_low, p_drop, cohProb]).clip(aoi);
}


/**
 * Fuse GRD flood probability with coherence probability (weighted linear blend).
 * 
 * PURPOSE:
 *  - Combine two independent flood evidence sources into single probability
 *  - GRD (dominant): backscatter-based detection (dark water)
 *  - Coherence (supporting): phase-based detection (surface change)
 * 
 * FUSION STRATEGY:
 *  - Linear weighted average: fused = w_grd * P_grd + w_coh * P_coh
 *  - Default weights: w_grd = 0.75, w_coh = 0.25 (GRD dominates)
 *  - Optional clamping: ensure result stays in [0,1] range
 * 
 * WHY LINEAR BLEND (not product or max):
 *  - Product (P_grd * P_coh): Too conservative, misses floods where one signal is weak
 *     * Example: Flood under vegetation → GRD = 0.6, Coherence = 0.9 → Product = 0.54 (too low)
 *  - Max (max(P_grd, P_coh)): Too liberal, allows false positives from single source
 *     * Example: Smooth urban → GRD = 0.8, Coherence = 0.1 → Max = 0.8 (false positive)
 *  - Linear blend: Balanced, coherence slightly boosts/suppresses GRD probability
 *     * Example: Flood evidence → GRD = 0.7, Coherence = 0.8 → Fused = 0.725 (modest boost)
 *     * Example: False positive → GRD = 0.7, Coherence = 0.2 → Fused = 0.575 (suppressed)
 * 
 * WHEN COHERENCE DISABLED (CONFIG.COH.enabled = false):
 *  - Return GRD probability unchanged
 *  - No fusion computation performed
 *  - cohProb band is ignored (masked, contributes nothing)
 * 
 * FUSION WEIGHTS TUNING:
 *  - More GRD weight (0.8-0.9): When GRD is highly reliable (open terrain, good acquisitions)
 *  - More coherence weight (0.3-0.4): When urban flood or coherence very reliable
 *  - Equal weights (0.5-0.5): When both equally reliable (rare)
 *  - IMPORTANT: w_grd + w_coh should = 1.0 for interpretable probabilities
 * 
 * CLAMPING (CONFIG.COH.FUSE.clamp01):
 *  - Why needed: Weighted sum can theoretically exceed [0,1] if weights don't sum to 1.0
 *  - Safety measure: clamp(0,1) ensures valid probability range
 *  - Recommended: keep enabled (clamp01 = true)
 * 
 * EXAMPLE FUSION:
 *  Config: w_grd = 0.75, w_coh = 0.25
 *  - Scenario A (strong flood):
 *     * GRD = 0.85, Coherence = 0.90 → Fused = 0.75*0.85 + 0.25*0.90 = 0.8625 (high confidence)
 *  - Scenario B (weak flood):
 *     * GRD = 0.40, Coherence = 0.50 → Fused = 0.75*0.40 + 0.25*0.50 = 0.425 (low confidence)
 *  - Scenario C (false positive suppression):
 *     * GRD = 0.70, Coherence = 0.20 → Fused = 0.75*0.70 + 0.25*0.20 = 0.575 (reduced from 0.70)
 * 
 * @param {ee.Image} grdProb - GRD-based flood probability (single band 'floodProb', 0-1)
 * @param {ee.Image} cohProb - Coherence-based flood probability (single band 'cohProb', 0-1, masked if disabled)
 * @return {ee.Image} Fused flood probability (single band 'floodProb', 0-1)
 */
function fuseFloodProbability(grdProb, cohProb) {
  // If coherence disabled, return GRD probability unchanged
  if (!CONFIG.COH.enabled) return grdProb.rename('floodProb');

  // Read fusion weights from config
  var wG = CONFIG.COH.FUSE.w_grd;
  var wC = CONFIG.COH.FUSE.w_coh;

  // Linear weighted blend
  var fused = grdProb.multiply(wG).add(cohProb.multiply(wC));
  // Optional clamping to [0,1] (safety against weight misconfiguration)
  if (CONFIG.COH.FUSE.clamp01) fused = fused.clamp(0, 1);

  return fused.rename('floodProb');
}


/**
 * Apply plausibility masks and post-processing to flood probability.
 * 
 * PURPOSE:
 *  - Remove physically implausible flood detections (steep slopes, high terrain, permanent water)
 *  - Convert continuous probability to binary flood mask
 *  - Clean up result (remove speckle, smooth edges)
 * 
 * WORKFLOW:
 *  1) Load auxiliary datasets:
 *      - Copernicus DEM GLO-30: elevation, slope
 *      - MERIT Hydro: HAND (Height Above Nearest Drainage)
 *      - JRC Global Surface Water: permanent water occurrence
 *  2) Create plausibility masks:
 *      - Slope mask: keep pixels with slope <= maxSlopeDeg (e.g., 5°)
 *      - HAND mask: keep pixels with HAND <= maxHANDm (e.g., 40m)
 *      - Permanent water mask: remove pixels with GSW occurrence >= permWaterOcc (e.g., 85%)
 *      - DEM footprint mask: remove ocean/no-data areas
 *  3) Apply masks to flood probability:
 *      - Successive updateMask() calls (AND logic: must pass all tests)
 *      - Result: floodProbMasked (probability masked to plausible flood zones)
 *  4) Threshold to binary:
 *      - flood = floodProbMasked >= floodProbThreshold (e.g., 0.35)
 *  5) Post-processing:
 *      - Remove small connected components (< minConnectedPixels)
 *      - Optional morphological smoothing (dilation → erosion)
 *  6) Return diagnostic bands:
 *      - flood: binary flood mask
 *      - floodProbMasked: masked probability
 *      - slope, hand, permWater: plausibility layers for inspection
 * 
 * SLOPE MASKING (physics constraint):
 *  - Why: Steep terrain prone to radar shadow/layover artifacts
 *  - Threshold: maxSlopeDeg (default 5°)
 *     * Flat plains (<3°): Can use stricter threshold
 *     * Mountainous valleys (5-10°): Need looser threshold to keep riverbank flooding
 *  - How: ee.Terrain.products(dem) computes slope at ~30m resolution
 *  - Edge case handling:
 *     * slopeForMask.unmask(999): DEM voids → fail slope test (conservative)
 *     * slope display: .unmask(0) → show as 0° in Pixel Inspector (cleaner)
 * 
 * HAND MASKING (hydrological constraint):
 *  - What: Height Above Nearest Drainage (vertical distance to river)
 *  - Why: Flood water flows to low areas near rivers
 *  - Threshold: maxHANDm (default 40m)
 *     * Riverine flood: 10-20m (strict, floodplain-focused)
 *     * Coastal/pluvial flood: 40-80m (loose, includes inland depressions)
 *  - Dataset: MERIT Hydro 'hnd' band (90m resolution, global)
 *  - How: hand.lte(maxHANDm) creates mask (1=keep, 0=reject)
 * 
 * PERMANENT WATER MASKING (baseline exclusion):
 *  - What: JRC Global Surface Water occurrence (% of time pixel was water, 1984-2021)
 *  - Why: Exclude lakes/reservoirs/rivers (not "flood" but pre-existing water)
 *  - Threshold: permWaterOcc (default 85%)
 *     * High (95%): Mask only very permanent water (keeps seasonal wetlands)
 *     * Low (70-80%): Mask seasonal water too (may remove flood in rice paddies)
 *  - How: permWater.not() inverts mask (1=not permanent, 0=permanent)
 * 
 * DEM PROJECTION HANDLING:
 *  - setDefaultProjection(dem.projection(), null, 30):
 *     * Forces ~30m scale for terrain derivatives (prevents coarse pyramid computation)
 *     * Lighter than reproject() for large AOIs
 *     * Prevents "slope computed at 500m" artifacts
 * 
 * POST-PROCESSING:
 *  1) Thresholding:
 *      - floodProbMasked >= floodProbThreshold → binary (1=flood, 0=no flood)
 *  2) Connected components:
 *      - connectedPixelCount(100, true): count pixels in each blob (max 100)
 *      - Keep blobs with >= minConnectedPixels (e.g., 5)
 *      - Removes salt-and-pepper speckle noise
 *  3) Morphological smoothing (if morphRadiusPx > 0):
 *      - focal_max (dilation): expands edges, fills small holes
 *      - focal_min (erosion): shrinks back to original size, smooths boundaries
 *      - Result: cleaner edges, merged nearby water bodies
 *      - Trade-off: Slightly inflates area, can merge distinct flood patches
 * 
 * OUTPUTS:
 *  Multiband image with:
 *  - flood: Binary flood mask (1=flood, 0=no flood)
 *  - floodProbMasked: Continuous probability after masking (0-1)
 *  - slope: Slope in degrees (0-90, display layer)
 *  - hand: HAND in meters (0-1000+, display layer)
 *  - permWater: Permanent water binary (1=permanent, 0=not permanent)
 * 
 * @param {ee.Image} floodProbImg - Continuous flood probability (0-1, single band)
 * @param {ee.Geometry} aoi - Area of interest
 * @return {ee.Image} Multiband image with flood mask and diagnostic layers
 */
function applyMasksAndPost(floodProbImg, aoi) {
  // Load and prepare Copernicus DEM
  var demIC = ee.ImageCollection('COPERNICUS/DEM/GLO30').filterBounds(aoi);
  print('DEM tiles in AOI:', demIC.size());

  // Mosaic tiles and force consistent 30m projection for terrain derivatives
  // Why: Prevents slope computation at coarse pyramid levels (e.g., 500m)
  var dem = demIC.select('DEM').mosaic().rename('elev').clip(aoi);
  // NOTE: setDefaultProjection is lighter than reproject for large AOIs
  dem = dem.setDefaultProjection(dem.projection(), null, 30);

  // Extract DEM footprint mask (valid data over land, masked over ocean)
  var landMask = dem.mask();

  // Slope (keep float, computed at ~30m)
  // Terrain.products computes slope, aspect, hillshade in one call (more stable than Terrain.slope)
  var slopeRaw = ee.Terrain.products(dem).select('slope').rename('slope').toFloat();

  // Two versions of slope image:
  // For masking: DEM voids → 999° (guaranteed to fail slope test, conservative approach)
  var slopeForMask = slopeRaw.unmask(999);
  // For display: DEM voids → 0° (cleaner visualization in Pixel Inspector)
  var slope = slopeRaw.updateMask(landMask).unmask(0).toFloat();

  // Create slope plausibility mask: keep only pixels with slope <= maxSlopeDeg
  // unmask(1) ensures masked areas (outside DEM footprint) don't fail the test
  var maskSlope = slopeForMask.lte(CONFIG.MASKS.maxSlopeDeg).unmask(1);

  // Load HAND (Height Above Nearest Drainage)
  // MERIT Hydro HAND: vertical distance to nearest river (m)
  // Low HAND (e.g., <40m) = near rivers = likely to flood
  var hand = ee.Image('MERIT/Hydro/v1_0_1')
    .select('hnd').clip(aoi).rename('hand')
    .unmask(0); // Fill no-data with 0m (conservative: allows flood detection)
    
  // Create HAND plausibility mask: keep only pixels near drainage (HAND <= maxHANDm)
  var maskHand = hand.lte(CONFIG.MASKS.maxHANDm).unmask(1);

  // Load permanent water mask (JRC Global Surface Water)
  // GSW 'occurrence': % of time pixel was water during 1984-2021 (0-100%)
  var gsw = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
    .select('occurrence').clip(aoi);
  
  // Identify permanent water: occurrence >= permWaterOcc threshold (e.g., 85%)
  // Result: 1 = permanent water (lake/reservoir), 0 = not permanent water
  var permWater = gsw.gte(CONFIG.MASKS.permWaterOcc).rename('permWater');

  // Invert mask: we want to KEEP non-permanent water areas (potential flood zones)
  // not() flips: 1 (permanent) → 0 (mask out), 0 (not permanent) → 1 (keep)
  var maskNotPermWater = permWater.not().unmask(1);

  // Apply all plausibility masks to flood probability
  // Successive updateMask() calls implement AND logic:
  //  - Must pass DEM footprint test (not ocean)
  //  - Must pass slope test (not too steep)
  //  - Must pass HAND test (near drainage network)
  //  - Must pass permanent water test (not pre-existing water body)
  // Any pixel failing any test becomes masked (transparent)
  var floodProbMasked = floodProbImg.rename('floodProb')
    .updateMask(landMask)           // Remove ocean/no-data
    .updateMask(maskSlope)          // Remove steep terrain
    .updateMask(maskHand)           // Remove high terrain (far from rivers)
    .updateMask(maskNotPermWater);  // Remove permanent water bodies

  // Threshold probability to binary flood mask
  // Convert continuous probability (0-1) to binary (0 or 1)
  // Pixels with probability >= threshold become 1 (flood), others become 0 (no flood)
  var flood = floodProbMasked.gte(CONFIG.POST.floodProbThreshold).rename('flood');

  // Remove small connected components (speckle noise)
  // Count pixels in each connected flood blob (max count = 100 to limit computation)
  // eightConnected = true: diagonal neighbors count as connected
  var blobs = flood.connectedPixelCount(100, true);
  // Keep only blobs with >= minConnectedPixels (e.g., 5 pixels)
  // Removes isolated 1-4 pixel speckles caused by noise
  flood = flood.updateMask(blobs.gte(CONFIG.POST.minConnectedPixels));

  // OPTIONAL morphological smoothing
  if (CONFIG.POST.morphRadiusPx > 0) {
    // Create circular kernel with specified radius (pixels)
    var k = ee.Kernel.circle(CONFIG.POST.morphRadiusPx);
    // Dilation (focal_max): expand flood edges, fill small interior holes
    // Erosion (focal_min): shrink back to approximately original size
    // Net effect: smoother boundaries, merged nearby patches, filled holes
    // Trade-off: Slightly inflates area (typically 1-2 pixels per edge)
    flood = flood.focal_max({kernel: k, iterations: 1})  // Expand
                 .focal_min({kernel: k, iterations: 1}); // Contract
  }

  // Self-mask and return diagnostic bands
  // selfMask(): convert binary (0 or 1) to masked (0 → masked, 1 → unmasked)
  // Result: only flood pixels (value = 1) are visible; non-flood is transparent
  flood = flood.selfMask();

  return ee.Image.cat([
    flood.rename('flood'),                      // Binary flood extent (1 = flood)
    floodProbMasked.rename('floodProbMasked'),  // Masked probability (0-1)
    slope,                                      // Slope in degrees (diagnostic)
    hand,                                       // HAND in meters (diagnostic)
    permWater                                   // Permanent water binary (diagnostic)
  ]);
}




/** #############################################
 *  4) Rain + atmospheric cross-check
 *  #############################################
 * 
 * OVERVIEW:
 *  - Cross-validate SAR-detected flood with independent precipitation data
 *  - Verify flood plausibility (was there actually heavy rain?)
 *  - Identify meteorological drivers (tropical cyclones, frontal systems)
 *  - Temporal correlation: did precipitation peak align with flood timing?
 * 
 * DATASETS:
 *  1) IMERG (NASA GPM): Satellite-based precipitation estimates
 *      - Resolution: 0.1° (~11 km), 30-minute temporal
 *      - Best for: Tropical/subtropical events, detailed timing
 *  2) ECMWF IFS: Numerical weather model diagnostics
 *      - Resolution: ~9 km, hourly
 *      - Best for: Synoptic patterns, atmospheric circulation
 * 
 * WORKFLOW:
 *  1) imergAccumMm(): Total rainfall accumulation over event window
 *  2) ifsDiagnostics(): Mean atmospheric diagnostics (precip, vorticity, wind)
 *  3) imergSeriesWithCumulative(): Time series for temporal analysis
 * 
 * WHY CROSS-CHECK:
 *  - SAR can detect dark surfaces that aren't flood (smooth urban, shadow)
 *  - Strong precipitation + SAR detection → HIGH confidence flood
 *  - No precipitation + SAR detection → CHECK: dam release? tide? false positive?
 * 
 * INTERPRETATION:
 *  - 100-300mm IMERG + SAR flood → HIGH confidence (pluvial/riverine flood)
 *  - <20mm IMERG + SAR flood → INVESTIGATE (tidal? dam release? misdetection?)
 *  - Strong vorticity (850 hPa) → tropical cyclone or monsoon depression
 *  - High wind speed → wind roughening may affect VV backscatter
 */

/**
 * Compute total IMERG precipitation accumulation over event window.
 * 
 * PURPOSE:
 *  - Calculate total rainfall (mm) during suspected flood period
 *  - Primary cross-check for SAR-detected flood plausibility
 *  - Answers: "Was there enough rain to cause flooding?"
 * 
 * DATASET:
 *  - IMERG V07 (Integrated Multi-satellitE Retrievals for GPM)
 *  - Source: NASA Global Precipitation Measurement (GPM) mission
 *  - Resolution: 0.1° spatial (~11 km), 30-minute temporal
 *  - Band: 'precipitation' (mm/hr instantaneous rate)
 *  - Coverage: Global 60°N-60°S (no polar regions)
 * 
 * ALGORITHM:
 *  1) Filter IMERG images to AOI and time window
 *  2) Convert rate (mm/hr) to increment per timestep:
 *      - IMERG V07 timestep: 30 minutes = 0.5 hours
 *      - Increment (mm) = rate (mm/hr) × 0.5 hr
 *  3) Sum all increments to get total accumulation (mm)
 * 
 * EXAMPLE CALCULATION:
 *  Event window: Nov 22-28, 2025 (6 days)
 *  Timesteps: 6 days × 48 images/day = 288 images
 *  
 *  Image 1: rate = 2 mm/hr → increment = 1 mm
 *  Image 2: rate = 8 mm/hr → increment = 4 mm
 *  ...
 *  Image 288: rate = 0 mm/hr → increment = 0 mm
 *  
 *  Total accumulation = sum of all increments = 150 mm
 * 
 * INTERPRETATION GUIDANCE:
 *  - <20 mm: Light rain, unlikely to cause flooding (check for other causes)
 *  - 20-50 mm: Moderate rain, possible localized flooding (urban, poor drainage)
 *  - 50-100 mm: Heavy rain, likely flooding in vulnerable areas
 *  - 100-300 mm: Very heavy rain, widespread flooding expected
 *  - >300 mm: Extreme rain, catastrophic flooding likely
 * 
 * LIMITATIONS:
 *  - Lower accuracy over mountains (orographic enhancement underestimated)
 *  - Lower accuracy over complex coastlines (land/sea mixing)
 *  - Represents spatial average (~11 km), misses sub-grid convective cells
 *  - Satellite-based estimates (not rain gauge measurements)
 * 
 * TYPICAL VALUES:
 *  - Tropical cyclone: 200-500 mm over 3-5 days
 *  - Monsoon heavy rain: 100-300 mm over 2-3 days
 *  - Frontal system: 50-150 mm over 1-2 days
 *  - Convective storms: 30-80 mm over hours
 * 
 * OUTPUT:
 *  - Single-band image: 'imerg_mm' (total accumulation in millimeters)
 *  - Clipped to AOI for visualization and export
 * 
 * @param {ee.Geometry} aoi - Area of interest
 * @param {ee.Date} start - Event window start
 * @param {ee.Date} end - Event window end
 * @return {ee.Image} Single-band image with total precipitation (mm)
 */
function imergAccumMm(aoi, start, end) {
  // Filter IMERG collection to AOI and time window
  var ic = ee.ImageCollection(CONFIG.MET.imergCollection)
    .filterBounds(aoi)
    .filterDate(start, end)
    .select(CONFIG.MET.imergBand);  // 'precipitation' band (mm/hr)

  // Convert each image from rate (mm/hr) to increment (mm per 30-min timestep)
  // IMERG V07 has 30-minute timesteps (0.5 hours)
  // Increment (mm) = rate (mm/hr) × 0.5 hr
  return ic.map(function(img) { 
      return img.multiply(0.5);  // mm/hr × 0.5 hr = mm per timestep
    })
    .sum()  // Sum all increments to get total accumulation
    .rename('imerg_mm')
    .clip(aoi);
}


/**
 * Compute mean ECMWF IFS diagnostics over event window.
 * 
 * PURPOSE:
 *  - Extract synoptic-scale atmospheric diagnostics for flood context
 *  - Identify meteorological drivers (cyclones, fronts, wind patterns)
 *  - Complement IMERG with model-based precipitation and circulation info
 * 
 * DATASET:
 *  - ECMWF IFS (Integrated Forecasting System) NRT operational forecast
 *  - Source: European Centre for Medium-Range Weather Forecasts
 *  - Resolution: ~9 km horizontal, hourly temporal
 *  - Coverage: Global
 *  - Data type: Numerical weather model output (not observations)
 * 
 * DIAGNOSTICS COMPUTED:
 *  1) Precipitation rate:
 *      - Band: 'total_precipitation_rate_sfc' (kg m^-2 s^-1 at surface)
 *      - Conversion: kg m^-2 s^-1 × 3600 s/hr = mm/hr (since 1 kg/m² = 1 mm water depth)
 *      - Mean over event window → typical precip rate during event
 * 
 *  2) Vorticity at 850 hPa:
 *      - Band: 'vorticity_pl850' (s^-1 at 850 hPa pressure level, ~1.5 km altitude)
 *      - Physical meaning: Rotation of horizontal wind (cyclonic spin)
 *      - Positive (Northern Hemisphere) = counterclockwise rotation = low pressure system
 *      - Strong positive vorticity → tropical cyclone, monsoon depression, or frontal system
 * 
 *  3) 10-meter wind speed:
 *      - Bands: 'u_component_of_wind_10m_sfc' (eastward, m/s)
 *               'v_component_of_wind_10m_sfc' (northward, m/s)
 *      - Computation: speed = sqrt(u² + v²)  [vector magnitude]
 *      - High wind → storm system, can roughen water surface (affects SAR backscatter)
 * 
 * WHY THESE DIAGNOSTICS:
 *  - Precipitation rate: Model-based cross-check for IMERG (independent estimate)
 *  - Vorticity: Identifies organized storm systems (cyclones vs random convection)
 *  - Wind speed: Helps interpret SAR backscatter (wind roughening can darken water)
 * 
 * MEAN vs SUM:
 *  - Uses .mean() over time window (not .sum())
 *  - Result: "typical" or "average" condition during event
 *  - Rationale: Identifies persistent features (e.g., cyclone present throughout window)
 *  - For total precipitation, use imergAccumMm() instead (sum-based)
 * 
 * INTERPRETATION:
 *  Precipitation rate (ifs_prate_mmhr):
 *   - <2 mm/hr: Light/scattered rain
 *   - 2-5 mm/hr: Moderate continuous rain
 *   - 5-10 mm/hr: Heavy continuous rain (likely flooding)
 *   - >10 mm/hr: Extreme rain (catastrophic flooding)
 * 
 *  Vorticity (ifs_vort850, Northern Hemisphere):
 *   - Negative: Anticyclonic (high pressure, generally dry)
 *   - 0 to +5×10^-5 s^-1: Weak circulation
 *   - +5×10^-5 to +1×10^-4 s^-1: Moderate low pressure system
 *   - >+1×10^-4 s^-1: Strong cyclone (tropical cyclone, deep low)
 * 
 *  Wind speed (ifs_wspd10):
 *   - <5 m/s: Calm to light winds
 *   - 5-10 m/s: Moderate winds
 *   - 10-20 m/s: Strong winds (tropical storm force)
 *   - >20 m/s: Very strong winds (hurricane force)
 * 
 * LIMITATIONS:
 *  - Forecast model output (not direct observations)
 *  - May have biases (overestimate/underestimate precipitation)
 *  - Coarser effective resolution than stated (~30-50 km for convection)
 *  - Best for large-scale features, less reliable for small-scale convection
 * 
 * OUTPUTS:
 *  Multiband image with:
 *  - ifs_prate_mmhr: Mean precipitation rate (mm/hr)
 *  - ifs_vort850: Mean vorticity at 850 hPa (s^-1)
 *  - ifs_wspd10: Mean 10m wind speed (m/s)
 * 
 * @param {ee.Geometry} aoi - Area of interest
 * @param {ee.Date} start - Event window start
 * @param {ee.Date} end - Event window end
 * @return {ee.Image} Multiband image with atmospheric diagnostics
 */
function ifsDiagnostics(aoi, start, end) {
  // Filter IFS collection to AOI and time window
  var ic = ee.ImageCollection(CONFIG.MET.ifsCollection)
    .filterBounds(aoi)
    .filterDate(start, end)
    .select(CONFIG.MET.ifsBands);

  // Precipitation rate: convert kg m^-2 s^-1 to mm/hr
  //    Physics: 1 kg of water per m² = 1 mm water depth
  //    Units: kg m^-2 s^-1 × 3600 s/hr = kg m^-2 hr^-1 = mm/hr
  var prate = ic.select('total_precipitation_rate_sfc')
    .mean()         // Mean rate over event window
    .multiply(3600) // Convert s^-1 to hr^-1
    .rename('ifs_prate_mmhr');

  // Vorticity at 850 hPa: mean circulation strength
  //    Units: s^-1 (per second)
  //    Positive (NH) = cyclonic = low pressure
  var vort850 = ic.select('vorticity_pl850')
    .mean()
    .rename('ifs_vort850');

  // Wind speed at 10m: compute vector magnitude from components
  //    u = eastward component (m/s), v = northward component (m/s)
  //    speed = sqrt(u² + v²)
  var u10 = ic.select('u_component_of_wind_10m_sfc').mean();
  var v10 = ic.select('v_component_of_wind_10m_sfc').mean();
  var wspd = u10.hypot(v10).rename('ifs_wspd10');  // hypot = sqrt(u² + v²)

  // Return multiband diagnostic image
  return ee.Image.cat([prate, vort850, wspd]).clip(aoi);
}


/**
 * Build IMERG time series with both instantaneous rate (mm/hr) and cumulative accumulation (mm).
 * 
 * PURPOSE:
 *  - Track precipitation evolution over time (when did heavy rain start/end?)
 *  - Compute running total accumulation (how much rain fell by each timestep?)
 *  - Helps diagnose flood trigger timing and verify SAR-detected flood plausibility
 * 
 * ALGORITHM:
 *  1) For each IMERG image (30-min timestep):
 *      - Extract rate (mm/hr)
 *      - Compute increment: rate * stepHours (typically 0.5 hr) → mm
 *  2) Use ee.List.iterate() to maintain running cumulative sum:
 *      - Start with cum = 0 mm
 *      - Each step: cum_new = cum_old + increment
 *      - Store both rate and cum as bands in output image
 *  3) Return ImageCollection with bands: rate_mmhr, accum_mm
 * 
 * WHY ITERATE (not reduce):
 *  - Need time-stamped cumulative values (not just final total).
 *  - iterate() carries forward "state" (running sum) across images in temporal order.
 * 
 * OUTPUT USAGE:
 *  - Chart.image.series() to visualize rate + accumulation on dual Y-axes
 *  - Identify precipitation peaks → correlate with SAR acquisition timing
 * 
 * EXAMPLE:
 *  - IMERG image at T0: rate = 5 mm/hr → increment = 2.5 mm → cum = 2.5 mm
 *  - IMERG image at T1: rate = 10 mm/hr → increment = 5 mm → cum = 7.5 mm
 *  - IMERG image at T2: rate = 2 mm/hr → increment = 1 mm → cum = 8.5 mm
 * 
 * @param {ee.Geometry} aoi
 * @param {ee.Date} start
 * @param {ee.Date} end
 * @return {ee.ImageCollection} images with bands: rate_mmhr (mm/hr), accum_mm (mm cumulative)
 */
function imergSeriesWithCumulative(aoi, start, end) {
  var stepH = CONFIG.MET.imergStepHours || 0.5; // IMERG V07 is 30-min (0.5 hr per image)

  // Build filtered collection (sorted by time)
  var ic = ee.ImageCollection(CONFIG.MET.imergCollection)
    .filterBounds(aoi)
    .filterDate(start, end)
    .select(CONFIG.MET.imergBand)
    .sort('system:time_start');

  var list = ic.toList(ic.size());

  // Initialize state: cumulative = 0, output list = []
  var initState = ee.Dictionary({
    cum: ee.Image(0),          // running cumulative (mm)
    out: ee.List([])           // output images
  });

  // Iterate: carry forward running sum
  var finalState = ee.Dictionary(list.iterate(function(img, state) {
    img = ee.Image(img);
    state = ee.Dictionary(state);

    var cum = ee.Image(state.get('cum')); // Previous cumulative total

    var rate = img.rename('rate_mmhr'); // Current rate (mm/hr)
    var incr = rate.multiply(stepH);    // Increment for this timestep (mm)

    var cum2 = cum.add(incr).rename('accum_mm'); // Updated cumulative

    // Build output image with both bands
    var outImg = ee.Image.cat([rate, cum2])
      .copyProperties(img, ['system:time_start']); // Preserve timestamp

    // Update state for next iteration
    return ee.Dictionary({
      cum: cum2,
      out: ee.List(state.get('out')).add(outImg)
    });
  }, initState));

  // Convert output list back to ImageCollection
  return ee.ImageCollection.fromImages(ee.List(finalState.get('out')));
}




/** #############################################
 *  5) Stats + Export
 *  #############################################
 * 
 * OVERVIEW:
 *  - Compute flood statistics (area, pixel counts)
 *  - Export results to Google Drive for offline analysis
 *  - Generate downloadable GeoTIFF rasters
 * 
 * WORKFLOW:
 *  1) printFloodAreaHa(): Calculate and print flood area to Console
 *  2) exportToDrive(): Queue export tasks for final outputs
 * 
 * WHY STATISTICS:
 *  - Quantify flood extent for reporting (hectares, square kilometers)
 *  - Compare events ("2024 flood was 2x larger than 2020")
 *  - Validate against ground truth or other datasets
 * 
 * WHY EXPORT:
 *  - Enable offline analysis in GIS software (ArcGIS, QGIS)
 *  - Archive results for future reference
 *  - Share with stakeholders (government agencies, NGOs)
 *  - Generate publication-quality maps
 * 
 * IMPORTANT:
 *  - Area calculations use pixel-accurate ee.Image.pixelArea()
 *  - Exports queue in Tasks tab but don't auto-run (must click "RUN")
 *  - Large AOIs may take 5-30 minutes to export
 */

/**
 * Compute and print flooded area in hectares to Console.
 * 
 * PURPOSE:
 *  - Quantify total flood extent for reporting and validation
 *  - Quick area check without needing to export data
 *  - Compare multiple scenarios (different thresholds, dates)
 * 
 * ALGORITHM:
 *  1) Multiply flood mask (binary: 0 or 1) by pixel area (m²)
 *      - Result: each flood pixel carries its actual area in m²
 *      - Non-flood pixels (0) contribute 0 m² to sum
 *  2) Sum all pixel areas via reduceRegion
 *      - Result: total flooded area in m²
 *  3) Convert m² to hectares (1 hectare = 10,000 m²)
 *  4) Print to Console
 * 
 * WHY PIXELAREA():
 *  - Accounts for map projection distortion (pixels not square in degrees)
 *  - Gives true ground area regardless of latitude
 *  - Example: At 45° latitude, 1° longitude ≈ 78 km (not 111 km like at equator)
 *  - Result: Accurate area calculations globally
 * 
 * WHY HECTARES (not km² or acres):
 *  - International standard for agricultural/environmental reporting
 *  - Easier to interpret for medium-scale floods (10-10,000 ha)
 *  - Conversion: 1 ha = 10,000 m² = 0.01 km² = 2.47 acres
 * 
 * SCALE PARAMETER:
 *  - Uses CONFIG.EXPORT.scale (default 10m) for computation
 *  - Finer scale (10m): More accurate but slower
 *  - Coarser scale (30m): Faster but less accurate
 *  - Trade-off: 10m vs 30m typically differs by <2% for large floods
 * 
 * TILESCALE:
 *  - tileScale=4: Processes in smaller tiles (reduces memory per tile)
 *  - Higher values (8-16): Use if hitting memory limits
 *  - Lower values (1-2): Faster but more memory-intensive
 * 
 * SAFETY (ee.Algorithms.If):
 *  - Checks if areaM2 exists (not null) before dividing
 *  - Prevents crash if flood mask is entirely masked (no valid pixels)
 *  - Returns 0 ha if no flood detected (clean output)
 * 
 * TYPICAL VALUES:
 *  - Small urban flood: 10-100 ha (0.1-1 km²)
 *  - Riverine flood: 100-10,000 ha (1-100 km²)
 *  - Major basin flood: 10,000-1,000,000 ha (100-10,000 km²)
 *  - Catastrophic event: >1,000,000 ha (>10,000 km²)
 * 
 * EXAMPLE OUTPUT:
 *  Console: "Flooded area (ha): 4523.7"
 *  Interpretation: 4,523.7 hectares = 45.2 km² = 17.5 square miles
 * 
 * LIMITATIONS:
 *  - Includes only pixels passing all masks (slope, HAND, permanent water)
 *  - Does not account for flood depth (2D extent only, not volume)
 *  - Depends on threshold choice (lower threshold → larger area)
 * 
 * @param {ee.Image} floodMask - Binary flood mask (1=flood, 0=no flood), self-masked
 * @param {ee.Geometry} aoi - Area of interest (computation boundary)
 */
function printFloodAreaHa(floodMask, aoi) {
  // Multiply flood mask by pixel area: each flood pixel now carries its area in m²
  // pixelArea() returns actual ground area accounting for projection distortion
  var d = floodMask.rename('flood')
    .multiply(ee.Image.pixelArea())  // Binary (0 or 1) × area (m²) = 0 or area
    .reduceRegion({
      reducer: ee.Reducer.sum(),     // Sum all pixel areas → total flooded area (m²)
      geometry: aoi,
      scale: CONFIG.EXPORT.scale,    // Pixel scale for computation (m)
      maxPixels: CONFIG.EXPORT.maxPixels,  // Safety limit (default 1e13)
      tileScale: 4                   // Process in smaller tiles (reduces memory)
    });

  // Extract total area in m² (may be null if no flood pixels)
  var areaM2 = ee.Number(d.get('flood'));
  
  // Convert m² to hectares: 1 ha = 10,000 m²
  // Safety check: if areaM2 is null (no flood), return 0 instead of crashing
  var ha = ee.Number(ee.Algorithms.If(areaM2, areaM2.divide(10000), 0));
  
  // Print to Console (server-side evaluation)
  print('Flooded area (ha):', ha);
}


/**
 * Export image to Google Drive as GeoTIFF (queues task, does not auto-run).
 * 
 * PURPOSE:
 *  - Save final outputs for offline analysis and sharing
 *  - Enable GIS integration (ArcGIS, QGIS, other tools)
 *  - Archive results for future comparison
 *  - Generate publication-quality maps
 * 
 * WORKFLOW:
 *  1) Script calls this function with image, AOI, and name
 *  2) If CONFIG.EXPORT.enabled = false: function returns immediately (no export)
 *  3) If enabled = true: Export.image.toDrive() queues task (DOES NOT RUN YET)
 *  4) User must manually click "RUN" in Tasks tab (orange icon, top-right)
 *  5) Task executes (blue → running, green → complete)
 *  6) GeoTIFF appears in Google Drive folder
 * 
 * CRITICAL: TASKS DON'T AUTO-RUN
 *  - Common mistake: "I enabled export but nothing happened"
 *  - Reason: Tasks queue but wait for manual confirmation
 *  - Solution: Check Tasks tab (orange) → click "RUN" on each task
 *  - Why: Prevents accidental exports, gives user control over what to export
 * 
 * EXPORT PARAMETERS:
 * 
 *  image:
 *   - Can be single-band (flood mask) or multiband (diagnostics)
 *   - Data type preserved: Float32, Byte, Int16, etc.
 * 
 *  description:
 *   - Task name shown in Tasks tab and filename in Drive
 *   - Example: 'FloodProb_Fused_2025-11-22'
 *   - Keep short (<50 chars), avoid special characters
 * 
 *  folder:
 *   - Google Drive folder name (created automatically if missing)
 *   - Path: Google Drive root → [folder] → [exported files]
 *   - Default: 'GEE_FLOOD'
 * 
 *  region:
 *   - AOI geometry defining export extent
 *   - Must be ee.Geometry, not FeatureCollection
 *   - Large regions: may hit 50 MB file limit → increase scale or split AOI
 * 
 *  scale:
 *   - Export pixel size (meters)
 *   - 10m: Sentinel-1 native resolution (best quality, largest files)
 *   - 20-30m: Balanced (faster, still useful)
 *   - 100m: Regional overview (fast, small files)
 * 
 *  maxPixels:
 *   - Maximum pixels allowed per export (GEE hard limit)
 *   - Default 1e13 usually sufficient
 *   - If export fails: "Too many pixels" → increase scale or reduce AOI
 * 
 * OUTPUT FORMAT:
 *  - GeoTIFF (.tif extension added automatically)
 *  - Projection: Original image projection (typically EPSG:4326 or UTM)
 *  - Compression: LZW (lossless, reduces file size ~50%)
 *  - Bands: Preserve original band names and count
 *  - NoData: Masked pixels encoded as NoData (not 0)
 * 
 * FILE SIZE ESTIMATES:
 *  Scale  | 1000 km² AOI | 10,000 km² AOI
 *  -------|--------------|----------------
 *  10m    | ~10 MB       | ~100 MB (may hit limit)
 *  20m    | ~2.5 MB      | ~25 MB
 *  30m    | ~1 MB        | ~10 MB
 *  100m   | ~0.1 MB      | ~1 MB
 * 
 * TYPICAL EXPORTS FROM THIS SCRIPT:
 *  1) FloodProb_Fused_YYYY-MM-DD.tif: Continuous probability (Float32, 0-1)
 *  2) FloodMask_YYYY-MM-DD.tif: Binary extent (Byte, 0 or 1)
 *  3) IMERGaccum_YYYY-MM-DD.tif: Precipitation total (Float32, mm)
 *  4) IFSdiagnostics_YYYY-MM-DD.tif: Multiband atmospheric data (Float32)
 * 
 * TROUBLESHOOTING:
 * 
 *  Problem: "Export timed out"
 *  - Solution: Increase scale (30 → 100m), reduce AOI size, or increase tileScale
 * 
 *  Problem: "Too many pixels"
 *  - Solution: Increase scale (10 → 20-30m), or manually split AOI into tiles
 * 
 *  Problem: "User memory limit exceeded"
 *  - Solution: Reduce image complexity (fewer bands), increase scale, or use sampling
 * 
 *  Problem: "Export completed but file is empty/corrupt"
 *  - Solution: Check if all pixels masked (flood mask empty), verify band names
 * 
 * ALTERNATIVE EXPORT METHODS (not used in this script):
 *  - Export.image.toAsset(): Save to GEE Assets (for reuse within GEE)
 *  - Export.image.toCloudStorage(): Export to Google Cloud Storage (for large files >50 MB)
 * 
 * @param {ee.Image} img - Image to export (single or multiband)
 * @param {ee.Geometry} aoi - Export extent (clipping boundary)
 * @param {String} name - Task/file name (without .tif extension)
 */
function exportToDrive(img, aoi, name) {
  // Early return if export disabled in CONFIG
  // Prevents unnecessary task queuing when user just wants Map visualization
  if (!CONFIG.EXPORT.enabled) return;

  // Queue export task (DOES NOT RUN automatically)
  // User must click "RUN" in Tasks tab to execute
  Export.image.toDrive({
    image: img,                      // Image to export
    description: name,               // Task name + filename (without extension)
    folder: CONFIG.EXPORT.folder,    // Google Drive folder (created if missing)
    region: aoi,                     // Export boundary (must be ee.Geometry)
    scale: CONFIG.EXPORT.scale,      // Pixel size (meters)
    maxPixels: CONFIG.EXPORT.maxPixels,  // Safety limit (pixels)
    crs: 'EPSG:4326',               // Output projection (WGS84 lat/lon)
    fileFormat: 'GeoTIFF',           // Format (implicit, GEE default)
    formatOptions: {
      cloudOptimized: true          // Export a Cloud Optimized GeoTIFF (COG)
    }
  });
  
  // Note: No return value; task is queued server-side
  // Check Tasks tab (orange icon) to see queued exports
}




/** #############################################
 *  6) MAIN WORKFLOW
 *  #############################################
 * 
 * OVERVIEW:
 *  This is the main execution script that orchestrates the entire flood mapping workflow.
 *  It calls all helper functions in sequence to produce final flood maps and diagnostics.
 * 
 * EXECUTION FLOW:
 *  1) Setup: Define AOI, histogram mask, date windows
 *  2) GRD Processing: Build pre/post composites, compute flood probability per orbit
 *  3) Ensemble: Combine ASCENDING + DESCENDING via pixelwise MAX
 *  4) Coherence (optional): Load and fuse SLC coherence evidence
 *  5) Masking: Apply physics-based plausibility constraints
 *  6) Post-processing: Threshold, clean, smooth final flood mask
 *  7) Statistics: Compute flooded area in hectares
 *  8) Meteorology: Cross-validate with precipitation data
 *  9) Visualization: Add all layers to Map for inspection
 *  10) Export: Queue GeoTIFF export tasks (if enabled)
 * 
 * EXPECTED RUNTIME:
 *  - Small AOI (<500 km²): 10-30 seconds
 *  - Medium AOI (500-5000 km²): 30-120 seconds
 *  - Large AOI (>5000 km²): 2-5 minutes
 *  - Note: First run slower (caching), subsequent runs faster
 * 
 * VISUALIZATION STRATEGY:
 *  - Critical layers visible by default (floodProb, flood extent)
 *  - Diagnostic layers hidden (click checkbox to show)
 *  - Per-orbit layers hidden (for advanced debugging)
 *  - Meteorology layers hidden (toggle on for cross-validation)
 * 
 * DEBUGGING WORKFLOW:
 *  1) Check Console prints: image counts, thresholds, area
 *  2) Inspect per-orbit layers: verify data availability
 *  3) Check deltaVV range: should show darkening in flood areas
 *  4) Inspect plausibility masks: understand what's being removed
 *  5) Toggle meteorology layers: verify precipitation correlation
 *  6) Use Pixel Inspector: click flooded areas to see all band values
 * 
 * CUSTOMIZATION:
 *  - All tuning parameters in CONFIG (Section 0)
 *  - Map layer visibility: change 'false' to 'true' in Map.addLayer()
 *  - Visualization palettes: modify {palette: [...]} arrays
 *  - Chart options: modify .setOptions({...}) blocks
 */
 
// ------------------------------------------------------------
// AOI Setup and Map Initialization
// ------------------------------------------------------------
// Resolve AOI based on CONFIG.AOI.mode (GAUL / ASSET / DRAWN / PASTE / AUTO)
// getAOI() handles all mode logic and fallbacks (see Section 1b)
var aoi = getAOI();

// Center map on AOI with automatic zoom calculation
// GEE automatically determines appropriate zoom based on AOI bounds
// Small AOI (city district) → zooms in more (level 12-14)
// Large AOI (province/region) → zooms out more (level 8-10)
Map.centerObject(aoi);  // No zoom parameter → automatic
// Set base layer to satellite imagery (better context than terrain/roadmap)
Map.setOptions('SATELLITE');
// Display AOI boundary in yellow (highly visible against satellite imagery)
Map.addLayer(aoi, {color: 'yellow'}, 'AOI');


// ------------------------------------------------------------
// Histogram Mask (Optional Otsu Stabilization)
// ------------------------------------------------------------
// PURPOSE:
//  - Ensures consistent Otsu thresholds across AOI shapes (GAUL polygon vs DRAWN bbox)
//  - Problem: Ocean in bbox → shifts histogram → different thresholds
//  - Solution: Sample histogram only from land-like + not-permanent-water areas
// 
// HOW IT WORKS:
//  - buildHistogramMask() creates mask from DEM footprint + GSW exclusion
//  - This mask is passed to floodProbability() for Otsu threshold estimation ONLY
//  - Final probability is computed on full unmasked data (no data loss)
// 
// WHEN TO USE:
//  - ALWAYS recommended for coastal AOIs (DRAWN bounding boxes near ocean)
//  - Less critical for inland AOIs (but doesn't hurt)
//  - See CONFIG.HIST for detailed tuning (sampling, memory limits)
var histMask = null;
if (CONFIG.HIST && CONFIG.HIST.enabled) {
  histMask = buildHistogramMask(aoi);

  // Optional debug layer: visualize what areas are being sampled for Otsu
  // Useful for verifying that ocean/lakes are properly excluded
  if (CONFIG.HIST.debugLayers) {
    // Display as 0/1 so Pixel Inspector shows clear values
    Map.addLayer(histMask.unmask(0), // unmask(0): show masked areas as 0 (black) for clarity
    {min: 0, max: 1}, 
    'Histogram mask (Otsu sampling)', 
    false // Hidden by default (toggle on for debugging)
    );
  }
}


// ------------------------------------------------------------
// Date Window Setup
// ------------------------------------------------------------
// Define temporal windows for compositing:
//  - Event window: suspected flood period (when water was present)
//  - Baseline window: pre-flood reference (normal conditions for change detection)
// 
// IMPORTANT:
//  - filterDate() uses half-open intervals: [start, end)
//  - We add +1 day to eventEnd to make it inclusive in user terms
//  - Example: eventEnd = '2025-11-28' → filterDate uses '2025-11-29' → includes Nov 28
var eventStart = ee.Date(CONFIG.DATES.eventStart);
var eventEnd   = ee.Date(CONFIG.DATES.eventEnd).advance(1, 'day'); // end-exclusive for filterDate
var baseStart  = eventStart.advance(-CONFIG.DATES.baselineDays, 'day');
var baseEnd    = eventStart;

// Print to Console for verification (helps catch date entry errors)
print('Event window:', eventStart, '→', eventEnd);
print('Baseline window:', baseStart, '→', baseEnd);


// ------------------------------------------------------------
// Multi-Orbit GRD Flood Probability Ensemble
// ------------------------------------------------------------
// WHY MULTI-ORBIT ENSEMBLE:
//  - Sentinel-1 has two orbit directions: ASCENDING (southward) and DESCENDING (northward)
//  - Each orbit "sees" terrain from different angle → different shadow/layover patterns
//  - Geometry artifacts can make flood invisible in one orbit but visible in other
//  - Example: East-facing slope
//     * ASCENDING: sensor looks east → slope in shadow → dark (false flood)
//     * DESCENDING: sensor looks west → slope illuminated → bright (no flood)
//     * MAX: Takes DESCENDING value → avoids false positive
//  - Example: Real flood in valley
//     * ASCENDING: visible (dark water)
//     * DESCENDING: in shadow (missed)
//     * MAX: Takes ASCENDING value → keeps detection
// 
// IMPLEMENTATION:
//  - Process each orbit separately (separate pre/post composites)
//  - Compute flood probability for each orbit independently
//  - Combine via pixelwise MAX (keeps highest probability from any orbit)
//  - Result: Reduced geometry-driven false negatives AND false positives
// 
// IMPORTANT BAND NAMING:
//  - Each orbit's floodProbability() returns multiband image
//  - We extract ONLY 'floodProb' band for ensemble (common name across orbits)
//  - This ensures .max() works correctly (same band name in all images)
// 
var probPerOrbit = CONFIG.S1.ORBITS.map(function(orbit) {
  // Build temporal composites for this orbit
  // Pre: median over baseline (stable reference)
  // Post: min over event (captures peak flood / darkest backscatter)
  var pre  = buildS1Composite(aoi, orbit, baseStart, baseEnd,  CONFIG.S1.temporalReducerPre);
  var post = buildS1Composite(aoi, orbit, eventStart, eventEnd, CONFIG.S1.temporalReducerPost);

  // DEBUG LAYERS: Per-orbit VV backscatter
  // Useful for diagnosing:
  //  - Data availability (are there S1 images for this orbit?)
  //  - Spatial patterns (where is VV dark? where is it bright?)
  //  - Temporal change (is post darker than pre in flood areas?)
  // Hidden by default (toggle on for advanced debugging)
  Map.addLayer(
    pre.select('VV'),  
    {min:-25, max:0}, // VV range: -25 dB (very dark water) to 0 dB (bright urban/bare soil)
    'Pre VV ('  + orbit + ')', 
    false // Hidden (turn on to inspect baseline backscatter)
  );
  Map.addLayer(
    post.select('VV'), 
    {min:-25, max:0},  
    'Post VV (' + orbit + ')', 
    false // Hidden (turn on to inspect flood-time backscatter)
  );

  // Compute flood probability for this orbit
  // Combines three evidence types: change (ΔVV), absolute (VV_post), ratio (VH/VV)
  // histMask: optional mask for stable Otsu threshold estimation
  var probImg = floodProbability(pre, post, aoi, histMask);

  // DEBUG LAYERS: Per-orbit flood probability and change
  // Useful for:
  //  - Comparing orbit performance (which orbit detects flood better?)
  //  - Understanding change patterns (where did VV decrease most?)
  //  - Validating Otsu thresholds (check Console prints)
  Map.addLayer(
    probImg.select('floodProb'), 
    {min:0, max:1}, // Probability: 0 (unlikely) to 1 (certain)
    'FloodProb (' + orbit + ')', 
    false // Hidden (turn on to compare per-orbit probabilities)
  );
  Map.addLayer(
    probImg.select('deltaVV'),   
    {min:-10, max:5},   // ΔVV: -10 dB (strong darkening) to +5 dB (brightening)
    'ΔVV dB (' + orbit + ')', 
    false // Hidden (turn on to see change magnitude)
  );

  // Return ONLY the flood probability band with standardized name
  // This ensures all orbits have same band name for .max() ensemble
  return probImg.select('floodProb').rename('floodProb');
});


// ENSEMBLE: Pixelwise MAX across all orbits
// For each pixel: take highest flood probability from any orbit
// Result: Robust detection that uses best evidence from each orbit
var grdProbEns = ee.ImageCollection.fromImages(probPerOrbit).max().rename('floodProb');

// MAIN LAYER: GRD Ensemble Flood Probability
// This is the primary output before coherence fusion
// Visible by default (core result layer)
Map.addLayer(
  grdProbEns, 
  {min:0, max:1},  // 0 = no flood evidence, 1 = strong flood evidence
  'Flood Probability (GRD Ensemble MAX)', 
  true  // VISIBLE by default
);


// ------------------------------------------------------------
// Optional Coherence Evidence (SLC-derived)
// ------------------------------------------------------------
// WHY COHERENCE:
//  - Coherence measures phase similarity between two SAR acquisitions
//  - Low coherence indicates surface change (flood, landslide, vegetation growth)
//  - Complements GRD: GRD detects "dark surfaces", coherence detects "surface change"
//  - Reduces false positives: smooth surfaces (parking lots) are dark in GRD but stay coherent
// 
// COHERENCE DROP:
//  - Compare pre-event coherence to event coherence
//  - Large drop (e.g., 0.7 → 0.2) indicates NEW surface change (flood)
//  - Helps distinguish flood from persistent low-coherence areas (vegetation, water bodies)
// 
// LIMITATION:
//  - Requires external SLC processing outside GEE (SNAP, ASF HyP3, ISCE2)
//  - Must upload processed coherence GeoTIFF to GEE Assets
//  - Not available by default (most users skip this step)
// 
// USAGE:
//  - Set CONFIG.COH.enabled = true
//  - Provide CONFIG.COH.eventCohAssetId (REQUIRED)
//  - Optionally provide CONFIG.COH.preCohAssetId (enables coherence drop)
var cohEv = coherenceEvidence(aoi);

// Display coherence layers only if enabled
// Hidden by default even if enabled (advanced diagnostic layers)
if (CONFIG.COH.enabled) {
  Map.addLayer(
    cohEv.select('coh_event'), 
    {min:0, max:1},  // Coherence: 0 (decorrelated) to 1 (coherent)
    'Coherence (event)', 
    false  // Hidden (turn on to inspect event coherence)
  );
  Map.addLayer(
    cohEv.select('cohProb'),   
    {min:0, max:1},  // Coherence-based flood probability
    'Coherence Probability', 
    false  // Hidden (turn on to see coherence contribution)
  );
  Map.addLayer(
    cohEv.select('dCoh'),      
    {min:-0.2, max:0.6},  // Coherence drop: negative = increased coherence (rare), positive = decreased
    'ΔCoherence (pre - event)', 
    false  // Hidden (turn on to see coherence change)
  );
}


// ------------------------------------------------------------
// Fusion (GRD + Coherence)
// ------------------------------------------------------------
// Weighted linear blend of GRD and coherence probabilities
// Default weights: GRD = 0.75 (dominant), Coherence = 0.25 (supporting)
// 
// WHY WEIGHTED (not equal):
//  - GRD is more reliable for most flood types (open water, riverine)
//  - Coherence is most useful for urban flooding and false positive reduction
//  - Coherence can be noisy over vegetation (temporal decorrelation not just flood)
// 
// BEHAVIOR:
//  - If CONFIG.COH.enabled = false: returns GRD probability unchanged (no fusion)
//  - If enabled: fused = 0.75 * P_grd + 0.25 * P_coh
//  - Result: Coherence slightly boosts/suppresses GRD probability
var finalProb = fuseFloodProbability(grdProbEns, cohEv.select('cohProb'));

// MAIN LAYER: Fused Flood Probability (GRD + optional coherence)
// This is the final probability before masking
// Visible by default (final result layer)
Map.addLayer(
  finalProb, 
  {min:0, max:1}, 
  'Flood Probability (Fused)', 
  true  // VISIBLE by default
);


// ------------------------------------------------------------
// Plausibility Masking + Post-Processing
// ------------------------------------------------------------
// Apply physics-based constraints to remove implausible flood detections:
//  1) Slope: Remove steep terrain (>5° default)
//      - Why: Radar shadow/layover artifacts on mountains
//      - Trade-off: May remove real flood on riverbanks in hilly terrain
//  2) HAND: Keep only low terrain near rivers (<=40m default)
//      - Why: Floodwater flows to low areas near drainage network
//      - Trade-off: May miss coastal/pluvial flooding away from rivers
//  3) Permanent water: Exclude lakes/reservoirs (GSW occurrence >= 85%)
//      - Why: Not "flood" but pre-existing water
//      - Trade-off: May remove flood in seasonal wetlands if threshold too low
// 
// Post-processing:
//  - Threshold continuous probability → binary mask (>= 0.35 default)
//  - Remove small connected components (< 5 pixels default = speckle noise)
//  - Optional morphological smoothing (dilation → erosion, if enabled)
var masked = applyMasksAndPost(finalProb, aoi);
var floodMask = masked.select('flood');

// LAYER: Masked flood probability (continuous 0-1, after plausibility masks)
// Useful for understanding what was removed by masking
Map.addLayer(
  masked.select('floodProbMasked'), 
  {min:0, max:1}, 
  'Flood Prob (masked)', 
  false  // Hidden (turn on to see masked probability)
);

// MAIN LAYER: Binary flood extent (final result)
// Cyan color highly visible against satellite imagery
// Visible by default (PRIMARY OUTPUT)
Map.addLayer(
  floodMask, 
  {palette:['00FFFF']},  // Cyan (RGB: 0,255,255)
  'Flood Extent (binary)', 
  true  // VISIBLE by default
);


// ------------------------------------------------------------
// Diagnostic Layers (Plausibility Masks)
// ------------------------------------------------------------

// Visualize what was masked out and why
// Hidden by default (toggle on to understand mask behavior)

// Permanent water mask (JRC Global Surface Water)
// Black = not permanent, Blue = permanent water (masked out)
Map.addLayer(
  masked.select('permWater'), 
  {min:0, max:1, palette:['000000','0000FF']}, 
  'Permanent water (GSW)', // Black to Blue
  false // Hidden (turn on to see what was masked as permanent water)
);

// HAND: Height Above Nearest Drainage (meters)
// Blue (low, near rivers) → Yellow → Red (high, far from rivers)
// Shows which areas passed HAND test (<= maxHANDm)
Map.addLayer(
  masked.select('hand'),
  {
    min: 0, 
    max: 50,  // 0-50m range (most flood-relevant HAND values)
    palette: [
      '0b1d51',  // Dark blue (0m, river level)
      '1e6db2',  // Blue (10m)
      '2fb47c',  // Cyan (20m)
      'a6d96a',  // Green (30m)
      'fdae61',  // Yellow (40m)
      'd7191c'   // Red (50m, high/far from rivers)
    ], 
    opacity: 0.85  // Slightly transparent to see satellite underneath
  },
  'HAND (m)',
  false  // Hidden (turn on to see terrain proximity to rivers)
);

// Slope: Terrain steepness (degrees)
// Dark blue (flat) → Yellow → Red (steep)
// Shows which areas passed slope test (<= maxSlopeDeg)
Map.addLayer(
  masked.select('slope'),
  {
    min: 0, 
    max: 15,  // 0-15° range (most flood-relevant slope values)
    palette: [
      '001219',  // Dark blue (0°, flat)
      '005f73',  // Blue (3°)
      '0a9396',  // Cyan (5°)
      '94d2bd',  // Light cyan (7°)
      'e9d8a6',  // Beige (9°)
      'ee9b00',  // Orange (11°)
      'ca6702',  // Dark orange (13°)
      'bb3e03',  // Red-orange (14°)
      'ae2012'   // Red (15°, steep)
    ], 
    opacity: 0.85
  },
  'Slope (deg)',
  false  // Hidden (turn on to see terrain steepness)
);


// ------------------------------------------------------------
// Flood Area Statistics
// ------------------------------------------------------------
// Compute and print total flooded area to Console
// Uses pixel-accurate area calculation (accounts for projection distortion)
// Output: "Flooded area (ha): XXXX.X"
printFloodAreaHa(floodMask, aoi);


// ------------------------------------------------------------
// Meteorology Cross-Check Layers
// ------------------------------------------------------------
// PURPOSE:
//  - Verify flood plausibility with independent precipitation data
//  - Cross-validate: Did it actually rain enough to cause flooding?
//  - Identify meteorological drivers: Tropical cyclone? Frontal system?
// 
// DATASETS:
//  - IMERG (NASA GPM): Satellite precipitation estimates (30-min, ~11 km)
//  - ECMWF IFS: Numerical weather model (hourly, ~9 km)
// 
// INTERPRETATION:
//  - SAR flood + 100-300mm IMERG → HIGH confidence (pluvial/riverine flood)
//  - SAR flood + <20mm IMERG → INVESTIGATE (dam release? tide? false positive?)
//  - Strong vorticity (850 hPa) → tropical cyclone or monsoon depression

// IMERG: Total precipitation accumulation over event window
var imerg = imergAccumMm(aoi, eventStart, eventEnd);
Map.addLayer(
  imerg, 
  {min:0, max:300},  // 0-300mm range (typical flood-producing rainfall)
  'IMERG precip accumulation (mm)', 
  false  // Hidden (turn on to see rainfall total)
);

// ECMWF IFS: Mean atmospheric diagnostics over event window
var ifs = ifsDiagnostics(aoi, eventStart, eventEnd);
// IFS precipitation rate (mm/hr, mean over window)
Map.addLayer(
  ifs.select('ifs_prate_mmhr'), 
  {min:0, max:10},  // 0-10 mm/hr (0=dry, 5-10=heavy continuous rain)
  'ECMWF IFS precip rate (mm/hr)', 
  false  // Hidden
);

// IFS vorticity at 850 hPa (s^-1, cyclonic rotation indicator)
// Positive (NH) = counterclockwise = low pressure system
Map.addLayer(
  ifs.select('ifs_vort850'), 
  {min:-0.0005, max:0.0005},  // Negative = anticyclonic, Positive = cyclonic
  'ECMWF IFS vorticity 850hPa', 
  false  // Hidden
);

// IFS 10m wind speed (m/s, storm intensity indicator)
Map.addLayer(
  ifs.select('ifs_wspd10'), 
  {min:0, max:15},  // 0-15 m/s (0=calm, >10=strong winds, >20=hurricane force)
  'ECMWF IFS 10m wind speed', 
  false  // Hidden
);


// ------------------------------------------------------------
// Precipitation Time Series (with Cumulative)
// ------------------------------------------------------------
// Chart shows both:
//  1) Instantaneous rate (mm/hr, left Y-axis) → when did heavy rain occur?
//  2) Running accumulation (mm, right Y-axis) → how much rain total?
// 
// USAGE:
//  - Correlate precipitation peaks with SAR acquisition times
//  - Verify flood timing: Did peak rain occur before/during SAR acquisition?
//  - Understand storm evolution: Single burst? Prolonged event?
var imergTS = imergSeriesWithCumulative(aoi, eventStart, eventEnd);

// IMERG time series chart (dual Y-axis)
// NOTE: GEE Charts quirk - vAxes[0]=RIGHT, vAxes[1]=LEFT (counterintuitive!)
print(ui.Chart.image.series({
  imageCollection: imergTS,
  region: aoi,
  reducer: ee.Reducer.mean(),
  scale: 10000
}).setOptions({
  title: 'IMERG precipitation (AOI mean) — rate (mm/hr) + cumulative (mm)',
  lineWidth: 2,
  pointSize: 0,
  
  // Data routing (indices REVERSED from visual position)
  series: {
    0: {targetAxisIndex: 0},  // rate_mmhr → axis 0 → RIGHT axis (visual)
    1: {targetAxisIndex: 1}   // accum_mm → axis 1 → LEFT axis (visual)
  },
  
  // Axis labels (indices MATCH visual position)
  vAxes: {
    0: {title: 'Cumulative (mm)', minValue: 0},  // vAxes[0] → LEFT axis (where accum displays)
    1: {title: 'Rate (mm/hr)', minValue: 0}      // vAxes[1] → RIGHT axis (where rate displays)
  },
  
  hAxis: {title: 'Date'},
  interpolateNulls: false
}));

// ECMWF IFS precipitation time series (single axis)
// Shows model-based precipitation rate over time
var ifsIC = ee.ImageCollection(CONFIG.MET.ifsCollection)
  .filterBounds(aoi)
  .filterDate(eventStart, eventEnd)
  .select('total_precipitation_rate_sfc');

print(ui.Chart.image.series({
  imageCollection: ifsIC.map(function(img){
    // Convert kg m^-2 s^-1 to mm/hr (×3600)
    return img.multiply(3600).rename('mmhr').copyProperties(img, ['system:time_start']);
  }),
  region: aoi,
  reducer: ee.Reducer.mean(),
  scale: 28000  // ~30 km resolution (IFS effective resolution for precip)
}).setOptions({
  title: 'ECMWF IFS precip rate (AOI mean, mm/hr) — event window',
  lineWidth: 2,
  pointSize: 1,  // Small points (hourly data, fewer timesteps than IMERG)
  hAxis: {title: 'Date'},
  vAxis: {title: 'Precipitation rate (mm/hr)'}
}));


// ------------------------------------------------------------
// Optional Export to Google Drive
// ------------------------------------------------------------
// Export final outputs as GeoTIFF rasters for offline analysis
// 
// CRITICAL: Tasks don't auto-run!
//  1) This code QUEUES export tasks (adds them to Tasks tab)
//  2) Tasks tab shows orange icon (top-right) when tasks are queued
//  3) You MUST click "RUN" on each task to execute export
//  4) Tasks turn blue (running) → green (complete) when done
//  5) Find outputs in Google Drive → GEE_FLOOD folder
// 
// OUTPUTS (if CONFIG.EXPORT.enabled = true):
//  1) FloodProb_Fused_YYYY-MM-DD.tif: Continuous probability (Float32, 0-1)
//  2) FloodMask_YYYY-MM-DD.tif: Binary extent (Byte, 0 or 1)
//  3) IMERGaccum_YYYY-MM-DD.tif: Total precipitation (Float32, mm)
//  4) IFSdiagnostics_YYYY-MM-DD.tif: Multiband atmospheric data (Float32)
// 
// TUNING:
//  - Scale (CONFIG.EXPORT.scale): 10m=best quality, 30m=faster
//  - Large AOIs: May need to increase scale or split into tiles
//  - Check Tasks tab for export progress and error messages
// 
exportToDrive(finalProb, aoi, 'FloodProb_Fused_' + CONFIG.DATES.eventStart);
exportToDrive(floodMask, aoi, 'FloodMask_' + CONFIG.DATES.eventStart);
exportToDrive(imerg, aoi, 'IMERGaccum_' + CONFIG.DATES.eventStart);
exportToDrive(ifs, aoi, 'IFSdiagnostics_' + CONFIG.DATES.eventStart);




/** #############################################
 *  END OF SCRIPT
 *  ############################################# 
 * 
 * NEXT STEPS:
 *  1) Inspect Map layers (toggle visibility to explore results)
 *  2) Check Console prints (image counts, thresholds, flooded area)
 *  3) Use Pixel Inspector (click flooded areas to see all band values)
 *  4) Review time series charts (precipitation timing and accumulation)
 *  5) Adjust CONFIG parameters if needed (thresholds, weights, masks)
 *  6) Re-run script to see effects of parameter changes
 *  7) Enable exports (CONFIG.EXPORT.enabled=true) when satisfied
 *  8) Click "RUN" in Tasks tab to download results
 * 
 * TROUBLESHOOTING:
 *  - "No flood detected": Check precipitation (was there rain?), lower threshold
 *  - "Too much flood": Check permanent water mask, increase threshold
 *  - "Computation timeout": Reduce AOI size, increase scale, or simplify masks
 *  - "Memory exceeded": Enable histogram sampling (CONFIG.HIST.useSampling=true)
 */