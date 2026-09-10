# CRT SIM OFX architecture

BROKEN FM is the master for product structure, visual styling and Companion workflow.

- Core: CrtSimCore, in native/src, has no UI or OFX dependency.
- Host: CrtSimOFX, in hosts/ofx, owns persistent parameters, keyframes and rendering.
- Contract: contracts/parameters-v1.json is generated from lib/crt-params.js.
- Editor: companion/ is adapted from BROKEN FM's Tauri editor and uses the same
  exchange arguments and commands. It is optional for native rendering.
- Master CSS and Ctrl-drag controls are synced from BROKEN FM at web/Companion build.
  CRT-specific markup and layout additions stay in this plugin.

The plugin ID com.rewiredvfx.crtlab, bundle name RewiredCRT.ofx.bundle, parameter IDs,
24 creative presets and renderer math are preserved. The displayed name is CRT SIM
in the rewired-vfx group. Static CRT runtimes and precise shader math are retained;
master conventions do not require changing numerical behavior or removing CPU fallback.

## Edit session

1. Open CRT SIM Editor serializes current creative parameters at host time and mask.
2. A unique LocalAppData/CRT SIM/Exchange session directory holds input/result JSON
   and an optional cached SDR BMP. CPU and CUDA snapshots never modify source pixels.
3. The registered CrtSimCompanion.exe receives --ofx-exchange, --ofx-result and,
   when available, --ofx-preview, matching the master protocol.
4. The Companion loads a working copy; Apply validates and atomically writes a result.
   Cancel or closing the window writes no result.
5. OFX validates the entire result before opening one host edit group. It updates
   only creative parameters/mask, sets the preset to Custom and removes session files.
   Color settings, bypass and stable parameter IDs remain host-owned.

The GUI waits for the Companion in the same manner as BROKEN FM. The editor is not a
live parameter bridge. The thumbnail is the most recent cached source, bounded to
960 × 540 and refreshed at most twice per second. It is decoded into working RGB
and encoded/clipped to SDR sRGB, without Resolve tone mapping or a display transform.
Browser/native mask antialiasing can also differ. If no thumbnail exists, the UI
explicitly identifies its test-pattern preview. Host-session media and time are locked.

## Checks and limits

Automated validation covers native CPU/CUDA effects, OFX descriptors/render actions,
strict native/Rust preset validation, browser preset navigation/reset, both viewport
sizes and a mocked Companion Apply/Cancel bridge. These do not establish interactive
Resolve compatibility. The full package is built locally; installation and a live
Resolve-to-Companion session remain unperformed until explicitly requested.

Completed local checks: 23 combined JavaScript tests, 2 Rust tests, 7 CRT native
tests (including CPU/CUDA thumbnail parity and source preservation), the existing
BROKEN FM smoke test, and the separate 5-test CRT CPU-only suite. Browser checks
passed at 1920×1080 and 1280×800. The complete OFX + Companion package was built.

## Static frontend

Like BROKEN FM, CRT SIM serves plain HTML, CSS and JavaScript modules with Python
on localhost:8080/crt-sim/, alongside BROKEN FM at /broken-fm/. There is no Vite, frontend package install or bundling step.
The Companion copies the same static files into its embedded frontend.
Preset JSON is loaded with fetch in the browser and built-in file I/O in Node.js.
