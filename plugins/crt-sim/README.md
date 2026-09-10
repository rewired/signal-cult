# CRT SIM

A tweakable CRT and pixel-monitor effect for images and video, with a local web playground and a Windows OFX plugin for DaVinci Resolve.

BROKEN FM is the UI and architecture master. CRT SIM uses its dark/mint layout, toolbar, right-hand controls, Ctrl-drag snapping and explicit Apply/Cancel session. The web app uses **Vanilla JavaScript, CSS and WebGL 2**. The **OFX plugin is version 0.7.0**, with NVIDIA CUDA acceleration and a CPU fallback. The optional Tauri Companion follows the BROKEN FM editor workflow; native rendering remains independent of it. Both interfaces use English labels.

## Two independent stages

| Pixel / Sci-Fi | CRT | Result |
| --- | --- | --- |
| Off | Off | Unchanged input |
| On | Off | Pixel / Sci-Fi only |
| Off | On | CRT only |
| On | On | Pixel / Sci-Fi followed by CRT |

Use **Enable Pixel / Sci-Fi** and **Enable CRT** in either interface. Switching a stage off preserves its settings. The tube switch controls the entire CRT stage, including signal noise, optics, bloom and color adjustments. Pixel strength must be above zero for its enabled stage to have an effect.

- **CRT:** 12 phosphor masks, scanlines, beam width, bloom, exposure, gamma, saturation, curvature, vignette and RGB convergence.
- **Signal:** 10 noise types, adjustable grain structure, animated clustering with its own speed, interference bands, jitter, tracking and flicker.
- **Pixel / Sci-Fi:** 8 procedural raster forms and 6 palettes, with cell size, aspect, luminance response, fill, edge softness, tonal steps and background light.
- **Presets:** 24 complete JSON snapshots: 12 CRT looks and 12 Sci-Fi looks. Presets appear only in the dropdown.

## Start

Run `start.bat` in this directory, then open [localhost:8080](http://localhost:8080/crt-sim/).
This starts the entire collection with one local Python server. No npm install,
Vite or frontend build is needed. Alternatively run:

```powershell
../../start.bat
```

BROKEN FM and CRT SIM can be open at the same time. The browser needs WebGL 2. Images/video are
processed locally. Playback is controlled in the top toolbar; the preview has no controls underneath.
JSON presets are imported and exported from the preset toolbar. Video export is not implemented.

## OFX for DaVinci Resolve

Build output: `native/build/RewiredCRT.ofx.bundle`. Close Resolve, install the entire bundle into `C:\Program Files\Common Files\OFX\Plugins\`, then restart Resolve. Find **CRT SIM** in the **rewired-vfx** OpenFX group.

See [the native README](native/README.md) for build commands, the local update script, CUDA requirements and color handling. Compiled bundles, local ZIP packages and installation backups are excluded from Git.

## Render order

Pixel / Sci-Fi is sampled into the CRT signal, followed by RGB convergence, signal noise, scanlines/beam and the phosphor mask. Source-derived bloom is added before saturation, exposure and black level. Vignette and flicker precede output gamma. Bloom currently samples the pixel-processed source; it does not make mask or noise details glow independently.

Curvature applies to the complete tube surface, including the pixel raster, scanlines and phosphor mask. The renderer implements this through inverse-mapped coordinates in one pass. Signal jitter shifts the signal within that surface; it does not move the physical phosphor mask. Turning CRT off also disables curvature.

## Deterministic seed

**Signal / Seed** is an integer from 0 to 16,777,215, saved in every JSON preset and OFX project. It controls reception noise, evolving clusters and stochastic jitter/tracking detail. Zero preserves existing patterns; older JSON presets receive seed zero. Periodic flicker and tracking-band motion remain time-driven.

The pattern is a stateless function of seed, coordinates and effect time. Re-rendering the same frame with the same source/settings on the same backend reproduces the result regardless of render order. Video previews now use the video's source time, so looping returns to the same noise. Still-image animation uses the preview clock and pauses with transport. A seed does not freeze animation. CPU/CUDA/browser floating-point differences mean cross-backend bit-identical images are not guaranteed.

## OFX color management

Version 0.6.0 adds separate **Input Color Space** and **Input Gamma** controls, linear-light processing and conversion back to the node's input encoding. Supported workflows include DaVinci Wide Gamut / Intermediate, Rec.709, sRGB, ACEScct/ACEScg, P3-D65 and Rec.2020 PQ/HLG. Color settings are independent of look presets.

Automatic mode requires a recognized explicit host tag and never guesses from missing metadata. Manual mode must match the actual node input. Resolve keeps responsibility for the output display transform and tone/gamut mapping. See [the color-management guide](native/COLOR_MANAGEMENT.md) for exact settings, HDR reference levels, neutrality and host-validation limits. The browser preview remains an SDR look playground.

## Presets and source layout

The preset toolbar follows BROKEN FM: previous/next buttons wrap through factory looks,
with previous selecting the last and next the first look from **Current / custom**.
Parameter edits mark the look as custom. The status shows applied, loaded and saved
names; imported names are retained on export until a parameter is edited. JSON imports
are limited to 64 KB and validated before any settings change. Downloads use the preset
name as the filename. Each effect retains its own compatible preset format.

The 24 factory presets use all ten noise types with individually tuned strength, scale, clustering, motion, chroma and seeds. Clean monitor looks remain subtle (PC VGA is noise-free); tape, reception and Sci-Fi looks feature distinct signal textures. Preset names, order and version-1 exchange stay unchanged. Saved project settings and exported presets keep their stored values.

[presets/crt-presets.json](presets/crt-presets.json) is the shared preset source. Version-1 JSON exchange saves parameters, mask ID and stage switches. The web importer supplies compatible defaults for older files: missing switches are enabled, while files without pixel settings receive zero pixel strength. Existing CRT looks therefore remain unaffected.

The OFX plugin compiles these presets into the binary. Editing its packaged JSON alone does not change the dropdown defaults; rebuild the plugin after changing the source JSON. Resolve saves edited parameters and keyframes in its projects.

| File | Purpose |
| --- | --- |
| `src/main.js`, `css/style.css` | Vanilla interface, media loading and transport |
| `lib/crt-params.js` | Shared controls, choices and preset validation |
| `lib/crt-renderer.js` | WebGL effect pipeline |
| `scripts/generate-native.mjs` | Generate native parameters and shader from shared sources |
| `native/src/` | CPU/CUDA effect core |
| `hosts/ofx/src/` | OFX adapter, Companion exchange and source snapshot |
| `companion/` | Tauri editor based on BROKEN FM |
| `contracts/parameters-v1.json` | Generated creative parameter contract |
| `css/master.css`, `js/master-controls.js` | Synced from BROKEN FM; edit the master, then sync |
| `tests/`, `native/tests/` | Preset, rendering and OFX interface checks |

## Validation and limitations

```sh
node --test tests/*.test.mjs
```

Native checks cover CPU/CUDA rendering, 120 mask/noise combinations, 48 pixel/palette combinations, all four stage-switch combinations, preset output, alpha/strides and OFX loading. See the native README for the test command. Automated checks do not establish full compatibility with every Resolve version. Optional WebMCP preset selection is implemented but has not been interaction-tested.

The CRT model is artistic; managed OFX processing supports signed, wide-gamut and HDR values. It does not implement a calibrated tube, temporal phosphor persistence, proper interlace or a PAL/NTSC composite decoder. Native mask-edge smoothing approximates browser derivatives, so exact browser/native pixel equality is not guaranteed. Fine masks can produce moire when the preview is scaled down.

## Collection checkout

This source now lives at `plugins/crt-sim/` inside the rewired-vfx SIGNAL CULT.
Commands in this document are relative to that directory (use `cd plugins/crt-sim`
from the collection root). The collection's root CMake builds both effects;
see [the collection integration guide](../../docs/crt-sim-integration.md).
The web and Companion UI now follow BROKEN FM as the collection master.
The original Sites deployment association is intentionally not imported.

Both collection plugins now have a top-level CMake entry. You may configure CRT
with `cmake -S plugins/crt-sim -B <build>` from the collection root; output is
`<build>/bundle/RewiredCRT.ofx.bundle`. The original `native/` build commands
above remain valid. Shared build/test/preview commands are in the
[collection README](../../README.md).

## Master UI and Companion

Run `node scripts/sync-master-ui.mjs` after changing BROKEN FM styles or slider helpers.
Companion staging synchronizes them automatically; the checked-in files work directly in the browser.
The former CRT stylesheet has been replaced. The effect shader remains unchanged; the 24 factory presets now have individually tuned noise profiles.

Build the complete CRT package with `./scripts/build-windows.ps1` (Rust/Tauri build tools
required). This produces `dist/windows-x64/RewiredCRT.ofx.bundle`
and `dist/windows-x64/CrtSimCompanion.exe`. Install both with
`./scripts/install-windows-user.ps1`, or use `./scripts/install-windows.ps1` from an
elevated PowerShell. Close Resolve and the Companion first. The installers register
the CRT-specific Companion path; no installation is performed by the build command.

In Resolve choose **Open CRT SIM Editor**. The editor loads a creative working copy
and the most recent source snapshot. **Apply to Resolve** commits it as one edit;
**Cancel** or closing the editor leaves parameters unchanged. Preset values and mask
are validated by the web UI, Companion and OFX adapter. Input color settings and
global bypass stay in Resolve. Host sessions freeze preview time and media selection.
Snapshots are bounded to 960 × 540 on CPU/CUDA, sampled at most twice per second,
and converted to SDR sRGB; this preview is not a Resolve display-transform match.
If no snapshot is available the editor explicitly labels its test-pattern preview.

See [the OFX architecture](docs/ofx-architecture.md) for ownership and validation limits.

## License

Original code uses [BSD-3-Clause with Commons Clause 1.0](../../LICENSE).
Paid video/VFX production is allowed. Software redistribution must retain the
copyright and license notices. Selling a product or service whose value derives
entirely or substantially from this software requires separate permission;
not every integration into a larger commercial product is prohibited.
See the [collection overview](../../README.md) and
[third-party notices](../../THIRD_PARTY_NOTICES.md).
