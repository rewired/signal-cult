# RASTER RUPTURE OFX 0.2.0

RASTER RUPTURE is a standalone SIGNAL CULT OpenFX image effect for DaVinci Resolve on Windows x64.

The OFX exposes the web study's 36 factory looks, ink and accent colors, optional float RGBA/alpha Mask input, Source as Mask, bipolar mask influence and local direction for all nine destinations. A missing Mask input is explicitly treated as No mask (full-frame white). Source and Mask frames are requested at the same host time. Sequential renders retain the previous rendered effect frame for the same feedback, Xerox and memory topology as the browser; seeks and host cache purges reset that state.

Use `scripts/build-windows.ps1` to stage `dist/windows-x64/RasterRupture.ofx.bundle`. Pass `-CpuOnly` for the CPU fallback. The normal build enables CUDA and automatically uses it when a compatible device is available. Install for the current user with `scripts/install-windows-user.ps1` while Resolve is closed.

The native path currently accepts 32-bit float RGBA Source/Output and float RGBA or Alpha Mask clips. Resolve performs media decoding, so video masks remain synchronized by host time instead of maintaining an independent decoder. Motion currently uses frame-to-frame temporal sampling; dense optical flow remains the next native stage.
