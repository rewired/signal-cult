# GRID ROT native OpenFX

Windows x64 OpenFX 1.4 plug-in for DaVinci Resolve. The renderer supports a CPU reference path and optional CUDA acceleration. It requests up to 31 earlier source frames through the host and never relies on playback order, so temporal looks remain deterministic during play, seek, reverse navigation and export.

The Resolve page exposes preset, route, bypass, CUDA, core grid/drop controls and post damage. Pattern variation, clustering, fracture, targeting, infection, topology, temporal memory and operator-matrix values are stored as secret OFX parameters for Companion editing and project persistence. Use **Open GRID ROT Companion** to edit an isolated working copy; Apply commits the validated state as one host edit and Cancel changes nothing.

This development output is not an installer. Deploy `GridRot.ofx.bundle` and `GridRotCompanion.exe` together with `scripts/install-windows-user.ps1`, or copy the bundle manually and register the Companion path under `HKCU/Software/rewired-vfx/GRID ROT`. Restart Resolve after updating the OFX bundle. CUDA builds require a supported NVIDIA driver; CPU rendering remains available as a fallback.