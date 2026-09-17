"""
Real Delft3D FM Integration Adapter.
Provides CLI execution interface for calling actual Delft3D Flexible Mesh (dflowfm) binaries.
"""
import os
import subprocess
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class Delft3DAdapter:
    """
    Adapter interface for executing actual Delft3D FM solver binaries (`dflowfm.exe`).
    Workflow:
      1. Write MDU (Master Definition File) and netgen grid files.
      2. Set breach location and initial reservoir water level in structure file (`.ext`).
      3. Execute `dflowfm.exe --path=<mdu_file>`.
      4. Parse NetCDF map file output (`*_map.nc`) to extract inundation polygon and depth fields.
    """

    def __init__(self, executable_path: Optional[str] = None):
        self.executable_path = executable_path or os.getenv("DELFT3D_PATH", "C:\\Delft3D\\bin\\dflowfm.exe")

    def is_available(self) -> bool:
        """Checks if actual Delft3D executable exists on system."""
        return os.path.exists(self.executable_path)

    def prepare_mdu_config(self, scenario_config: Dict[str, Any], output_dir: str) -> str:
        """Generates Delft3D MDU configuration file."""
        mdu_path = os.path.join(output_dir, "dam_break_run.mdu")
        with open(mdu_path, "w") as f:
            f.write("[General]\nfileVersion = 1.01\nfileType = modelDef\n")
            f.write("[geometry]\nNetFile = grid_net.nc\nBathymetryFile = dem.xyz\n")
        return mdu_path

    def run_delft3d_executable(self, mdu_path: str, output_dir: str) -> bool:
        """Executes Delft3D CLI process."""
        if not self.is_available():
            logger.warning("Delft3D binary not found at %s. Falling back to MockDelft3DEngine.", self.executable_path)
            return False

        try:
            cmd = [self.executable_path, "--path=" + mdu_path]
            logger.info("Executing Delft3D CLI: %s", " ".join(cmd))
            process = subprocess.run(cmd, capture_output=True, text=True, check=True)
            logger.info("Delft3D execution complete: %s", process.stdout[:200])
            return True
        except Exception as e:
            logger.error("Delft3D execution failed: %s", str(e))
            return False
