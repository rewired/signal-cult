# RASTER RUPTURE

An independent SIGNAL CULT browser study for directional raster destruction,
print-like surface damage, motion-guided tears and temporal feedback.

Start the collection with the repository start.bat, then open
http://localhost:8080/raster-rupture/. There is no package install or frontend
build. The preview uses vanilla JavaScript, the shared SIGNAL CULT interface and
WebGL 2.

## Current preview

- Thirty-six factory presets across five effect characters, including ten per-destination direction studies, with JSON preset import/export
- Preset-aware ink and accent colors mapped to float RGB shader parameters
- Two-stage GPU framegraph: coherent ink/paper construction followed by rupture and temporal deposition
- Aspect-correct free-angle rupture shared by bands, displacement, smearing, echoes, fibers, feedback, Xerox strips and accent signals
- Optional perpendicular cross-rupture system for intersecting damage fields
- Multi-scale tear layers, anisotropic dry fibers, toner stipple and edge-aware photo detail
- Same-scanline micro echoes with repeated sampling, progressive density loss and perforation
- Animated multi-generation Xerox strips with temporal rebirth, registration drift and cumulative dropout
- Rupture-local procedural dirt masks with coarse clumps, pinholes, dry streaks and hard erosion
- Ruptured spot-color bloom with a hot signal core, displaced halo and dirt-driven breakup
- Ping-pong temporal feedback with separate write and read routes
- Frame-difference motion proxy at the future optical-flow boundary
- One image or MP4 mask routed continuously to nine effect destinations
- One XY pad per selected destination: X is bipolar mask influence and Y is a −90° to +90° local direction offset
- Factory presets use distinct routing characters for portrait, inverse, split-memory, surface, echo, accent and motion treatments
- Float32 internal mask texture with selectable luminance, RGB or alpha channel
- Normalized browser image masks, including low-bit-depth PNG
- MP4 mask clips with source-mastered play, pause, seek and loop synchronization
- Persistent Source → mask link using the exact current source frame without a second video decoder
- Explicit No mask mode, interpreted as a full-frame white mask

The browser uploads decoded integer still masks into a 32-bit float texture before
routing. MP4 masks are normalized by GPU sampling and follow the source transport.

OpenEXR is represented in the file picker and parameter boundary, but the initial
web study intentionally does not bundle an EXR decoder. The UI reports that case
without silently interpreting EXR as a display image. A later OpenEXR/WASM adapter
can populate the same float texture. In OFX, the matching input is intended to be
a native float clip and does not require browser decoding.

## Resolve OFX

The first standalone Windows x64 OFX implementation now lives beside the web study. It preserves all 36 factory presets, ink/accent colors, the optional float mask input, Source as Mask and the nine bipolar influence/local-angle routes. Resolve supplies Source and Mask at the same timeline time, so video masks remain synchronized. A CUDA build and CPU fallback share the same deterministic render contract.

Build through the collection with `scripts/build-native.ps1 -Plugin raster-rupture`, or use `plugins/raster-rupture/scripts/build-windows.ps1`. Install the staged bundle with `plugins/raster-rupture/scripts/install-windows-user.ps1` while Resolve is closed.

## Native boundary

The web renderer is for look development, not the final native implementation.
The following contracts should remain stable when an OFX/CUDA renderer is added:

- normalized effect parameters with stable string IDs;
- nine mask XY pairs containing continuous bipolar influence and local direction offset;
- distinct feedback-write and feedback-read masks;
- masks treated as linear data, never display-referred color;
- deterministic seed and time inputs;
- a replaceable motion-field input.

The current OFX samples the previous source frame for deterministic motion and memory. Dense optical flow can replace that provisional field without changing preset and routing semantics.

## Test

Run the contract suite with `node --test plugins/raster-rupture/tests/*.test.mjs`.
`tests/runtime.html` additionally compiles and renders the complete WebGL framegraph in a browser.
