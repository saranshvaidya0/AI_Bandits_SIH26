# SPH & Delft3D Hydrodynamic Engine Integration Architecture

This document details the modular software architecture used to abstract Smoothed Particle Hydrodynamics (DualSPHysics) and Shallow Water Equations (Delft3D Flexible Mesh) engines in the Dam Break Inundation Modelling Platform.

---

## 1. Modular Engine Abstraction Architecture

```
                      BaseHydroEngine (Abstract Class)
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
   SPHEngine Interface                                 Delft3DEngine Interface
         │                                                       │
   ┌─────┴────────────────┐                                ┌─────┴────────────────┐
   ▼                      ▼                                ▼                      ▼
MockSPHEngine     DualSPHysicsAdapter                   MockDelft3DEngine     Delft3DAdapter
(Deterministic)   (CLI Executable)                      (Deterministic)       (CLI Executable)
```

---

## 2. Scientific Comparison Methodology

| Hydrodynamic Parameter | DualSPHysics (SPH Engine) | Delft3D FM (Shallow Water Engine) |
|---|---|---|
| **Formulation** | 3D Particle Lagrangian SPH | 2D Depth-Averaged Eulerian Grid |
| **Dam Breach Mechanics** | Free-surface 3D fluid jet & wave impact | Continuous fluid continuity & momentum equations |
| **Peak Flow Velocity** | Higher local peak velocity near breach ($4.5\text{--}6.5\text{ m/s}$) | Moderate velocity ($3.2\text{--}4.2\text{ m/s}$) |
| **Inundation Extent** | Concentrated high-momentum channel flow | Broader lateral diffusion across floodplain ($+10\text{--}12\%$) |
| **Spatial IoU Formula** | $$\text{IoU} = \frac{\text{Area}(\text{SPH} \cap \text{Delft3D})}{\text{Area}(\text{SPH} \cup \text{Delft3D})}$$ | Evaluates spatial model agreement |

---

## 3. How to Connect Actual DualSPHysics & Delft3D Executables

### Connecting DualSPHysics Executable:
1. Install **DualSPHysics v5.0** (or higher) with CUDA support.
2. Set environment variable or config parameter:
   `DUALSPHYSICS_PATH="C:\DualSPHysics\bin\windows\DualSPHysics5.0_win64.exe"`
3. The `DualSPHysicsAdapter` class in `backend/app/engines/adapters/dualsphysics_adapter.py` will execute `GenCase` and `DualSPHysics5.0_win64.exe` automatically.

### Connecting Delft3D FM Executable:
1. Install **Delft3D FM Suite** (Deltares).
2. Set environment variable or config parameter:
   `DELFT3D_PATH="C:\Delft3D\bin\dflowfm.exe"`
3. The `Delft3DAdapter` class in `backend/app/engines/adapters/delft3d_adapter.py` will invoke `dflowfm.exe --path=dam_break_run.mdu`.
