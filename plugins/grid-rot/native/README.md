# GRID ROT native OpenFX

Windows x64 OpenFX 1.4 plug-in for DaVinci Resolve. The renderer supports a CPU reference path and optional CUDA acceleration. It requests up to 31 earlier source frames through the host and never relies on playback order, so temporal looks remain deterministic during play, seek, reverse navigation and export.

The Resolve page exposes preset, route, bypass, CUDA, core grid/drop controls and post damage. Pattern variation, clustering, fracture, targeting, infection, topology, temporal memory and operator-matrix values are stored as secret OFX parameters for Companion editing and project persistence.

This development bundle is not an installer. Copy `GridRot.ofx.bundle` to the normal per-user or system OpenFX plug-in directory, then restart Resolve. CUDA builds require a supported NVIDIA driver; CPU rendering remains available as a fallback.