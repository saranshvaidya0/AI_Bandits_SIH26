from abc import ABC, abstractmethod
from typing import Dict, Any
from app.models.schemas import SimulationConfig, SingleEngineResult

class BaseHydroEngine(ABC):
    """
    Abstract Base Class for Hydrodynamic Simulation Engines.
    Provides standard interface for both SPH (DualSPHysics) and Eulerian grid (Delft3D) engines.
    """
    
    def __init__(self, engine_name: str, engine_type: str):
        self.engine_name = engine_name
        self.engine_type = engine_type # "SPH" or "Delft3D"

    @abstractmethod
    def calculate_peak_discharge(self, scenario: SimulationConfig) -> float:
        """
        Calculates dam breach peak flow Q_peak (m3/s) using empirical dam break formulas (Froehlich / Macdonald).
        """
        pass

    @abstractmethod
    def run_simulation(self, scenario: SimulationConfig, study_area: Dict[str, Any]) -> SingleEngineResult:
        """
        Runs hydrodynamic solver workflow and returns full spatiotemporal outputs.
        """
        pass
