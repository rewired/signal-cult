# CRT SIM — OFX 0.7.0 (Windows x64)

A DaVinci Resolve OFX effect with host-native controls, NVIDIA CUDA acceleration and CPU fallback. Rendering does not depend on the optional Tauri Companion. The **Open CRT SIM Editor** button uses it for the BROKEN FM-style editor.

## Install or update

1. Close Resolve.
2. Copy the **entire** `RewiredCRT.ofx.bundle` folder into `C:\Program Files\Common Files\OFX\Plugins\` (administrator rights may be required).
3. Restart Resolve. Find **CRT SIM** in the **rewired-vfx** OpenFX group.

After building in `native/build`, you can use the project's updater from an administrator PowerShell at the repository root:

```powershell
New-Item -ItemType Directory -Path releases -Force | Out-Null
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-ofx.ps1
```

The updater refuses to run while Resolve is open, backs up replaced files under `releases/ofx-backup-<timestamp>`, and verifies copied files by hash. Its log is `releases/install-ofx.log`. It reads the bundle from `native/build`; for another build directory, install that bundle manually. Backups and compiled packages are not tracked in Git.

## Controls and presets

The Companion uses the same preset toolbar workflow as BROKEN FM: factory navigation,
Current / custom state, named JSON import/export and status feedback. CRT version-1
files remain compatible; technical color settings remain in Resolve. The Companion
preview has no comparison, PNG-export or timeline controls underneath.

The 24 factory presets use all ten noise types with individually tuned strength, scale, clustering, motion, chroma and seeds. Clean monitor looks remain subtle (PC VGA is noise-free); tape, reception and Sci-Fi looks feature distinct signal textures. Preset names, order and version-1 exchange stay unchanged. Saved project settings and exported presets keep their stored values.

- **Enable Pixel / Sci-Fi** independently enables the pixel stage: 8 raster forms, 6 palettes and 12 dedicated presets.
- **Enable CRT** enables the complete CRT stage: phosphor mask, scanlines, signal noise, optics, bloom and color adjustments.
- Both on combines the stages; both off passes the original input through unchanged. Switching off preserves all slider values. The global **Bypass** overrides both stages.
- Pixel strength must be above zero to see the pixel stage. Select a Sci-Fi preset to start with an active raster.
- 24 presets total, 12 phosphor masks, 10 noise types and independently animated noise clustering.
- Effect controls support host keyframes. Animation follows host time and frame rate, including still-image sources.

Resolve stores settings and keyframes in its project. The packaged `Contents/Resources/presets.json` records compiled preset values; changing that copy does not update the binary. Edit `presets/crt-presets.json` in the repository and rebuild. The original twelve preset indices remain unchanged.

## Build and test

Requires Node.js 22.13.0 or later, CMake 3.24 or later, Visual Studio 2022 C++ tools, and CUDA 12.8 for the CUDA build. Run from the repository root:

```powershell
cmake -S native -B native/build -G "Visual Studio 17 2022" -A x64 -T "cuda=C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.8"
cmake --build native/build --config Release --parallel 4
ctest --test-dir native/build -C Release --output-on-failure
```

CMake configuration runs `scripts/generate-native.mjs`, deriving native parameter definitions, presets and shader code from the web sources. **Re-run configuration after changing shared controls, presets or shader code**, then build. Do not edit `native/generated/` directly.

Output: `native/build/RewiredCRT.ofx.bundle`.

For a CPU-only build, use a separate directory:

```powershell
cmake -S native -B native/build-cpu -G "Visual Studio 17 2022" -A x64 -DCRT_ENABLE_CUDA=OFF
cmake --build native/build-cpu --config Release --parallel 4
ctest --test-dir native/build-cpu -C Release --output-on-failure
```

The CPU, CUDA, color-conversion and OFX load/descriptor tests passed locally for 0.7.0. Coverage includes all four stage combinations, 120 mask/noise pairs, 48 pixel/palette pairs, distinct Sci-Fi preset output, deterministic animation, alpha handling and signed/padded row strides. CUDA was checked on an RTX 2070. These checks do not replace a full host/version compatibility test matrix.

## Seed and deterministic rendering (0.7.0)

**Signal / Seed** is a non-animated integer parameter in the range 0–16,777,215. It is part of look presets and saved projects. Zero retains the previous pattern. Noise, clustering and random jitter detail are derived directly from the seed and host time; no random state is accumulated between frames. CPU and CUDA tests re-render seeded frames after out-of-order requests and compare exact results within each backend. Cross-backend equality is numerical, not bit-exact.

## Curvature (0.5.0)

The phosphor mask now uses the same curved tube surface as the image and scanlines. Signal jitter remains independent of the physical mask. This uses inverse coordinate mapping in the shared shader, without an additional render pass. Zero curvature keeps the mask in its original pixel coordinates. A regression check compares the curved output against flat rendering sampled at the corresponding surface position, across all twelve masks with and without the pixel stage.

## Color, GPU and current limits

Processing uses RGBA 32-bit float with preserved alpha and premultiplied handling. CUDA uses the host's stream when supplied and only processes GPU buffers through the CUDA path. CPU fallback can be slow.

The CUDA build targets sm_75, sm_86 and sm_89, with PTX. Users need a compatible NVIDIA driver but do not need the CUDA toolkit installed. There is no Metal or OpenCL implementation.

New instances default to **Color Managed**, with **Input Color Space: Rec.709** and **Input Gamma: Gamma 2.4**. Match these to the actual node input. The effect converts into signed linear working RGB and back to the same input encoding. Supported gamuts include DWG, ACES AP1/AP0, Rec.709/2020 and P3-D65; transfers include DaVinci Intermediate, ACEScct, sRGB and PQ/HLG. Output display rendering remains in Resolve.

See [COLOR_MANAGEMENT.md](COLOR_MANAGEMENT.md) for RCM/ACES settings, host Auto behavior, HDR reference levels, legacy compatibility and verification limits. Color settings remain independent of creative presets.

Native mask-edge smoothing approximates WebGL derivatives, so browser/native output is not guaranteed to match pixel for pixel. Bloom is spatial. There is no temporal phosphor persistence, proper interlace reconstruction or full PAL/NTSC decoder.


OpenFX SDK headers are vendored from the [Academy Software Foundation OpenFX project](https://github.com/AcademySoftwareFoundation/openfx) under BSD-3-Clause; see [the included license](third_party/openfx/LICENSE.md).

## Collection checkout

In the collection repository, the standalone commands above run from
`plugins/crt-sim/`, not from the collection root. The root CMake build places this
bundle alongside BROKEN FM at `<build>/bundle/RewiredCRT.ofx.bundle`.
The local updater above still targets only `plugins/crt-sim/native/build`.
See [the collection build guide](../../../docs/crt-sim-integration.md).

The plugin-level `plugins/crt-sim/CMakeLists.txt` is also a standalone entry.
It uses `<build>/bundle/RewiredCRT.ofx.bundle`, like the collection build.
The direct native entry retains `<build>/RewiredCRT.ofx.bundle` for compatibility.

## Companion package and architecture

The preferred complete package build now runs from `plugins/crt-sim`:

```powershell
./scripts/build-windows.ps1
./scripts/install-windows-user.ps1
```

The build also needs Rust/Cargo and the Tauri/WebView2 toolchain used by BROKEN FM.
It builds and tests native code and the Companion before staging `dist/windows-x64`.
The first Cargo build needs dependencies cached (`cargo fetch` if necessary).
Use `-NlohmannJsonRoot <checkout>` for an existing nlohmann/json dependency; otherwise
CMake fetches the pinned 3.11.3 version. Its MIT notice is included in the bundle.

The user installer registers `Software\rewired-vfx\CRT SIM / CompanionPath` and
adds the user OFX directory to `OFX_PLUGIN_PATH`. For system installation use
`./scripts/install-windows.ps1` from an elevated PowerShell. Both copy the Companion
along with the OFX bundle. The older `install-ofx.ps1` remains a native-only updater.

The effect core is in `native/src`; host, exchange and preview code are in
`hosts/ofx/src`. Creative JSON remains version 1 and the plugin ID remains
`com.rewiredvfx.crtlab`. Only the display name/group changes to CRT SIM / rewired-vfx.
The new editor/status parameters do not replace existing controls.

Apply is a host-owned edit; color-management controls and global bypass are not
part of the exchanged look. CPU and CUDA capture an SDR source thumbnail for the
editor, not a final managed Resolve image. See [architecture](../docs/ofx-architecture.md).

## Project license

Original code uses [BSD-3-Clause with Commons Clause 1.0](../../../LICENSE).
Paid video/VFX work is allowed. Redistributed software must retain copyright and
license notices; the Commons Clause restricts sales based entirely or substantially
on this software's functionality. See the [collection overview](../../../README.md).
Bundled dependencies retain their [upstream licenses](../../../THIRD_PARTY_NOTICES.md).
