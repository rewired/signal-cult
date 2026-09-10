# CRT SIM in SIGNAL CULT

CRT SIM is the collection's second independent Windows OpenFX plugin, maintained
in `plugins/crt-sim/`. Its CPU/CUDA renderer is independent of BROKEN FM and of the
optional Companion. The browser UI and Companion follow BROKEN FM's layout and
preset workflow. See [CRT architecture](../plugins/crt-sim/docs/ofx-architecture.md)
and [build/install instructions](../plugins/crt-sim/README.md).

Both effects live in this repository; neither standalone GitHub repository is
needed to build or use the collection. CRT's source originated from version 0.7.0,
commit `c82819f35c2f66c420b7c77ba33c4ff97860e5be`. Deployment associations and
build artifacts are not part of the source snapshot.

## Compatibility assessment

| Area | Finding / consequence |
| --- | --- |
| Plugin identity | BROKEN FM remains `com.rewired-vfx.broken-fm`; CRT remains `com.rewiredvfx.crtlab`. Bundles and exported modules are separate, so both can coexist. |
| Host controls | Existing CRT parameters, preset indices and version are retained. No migration of saved settings is introduced. |
| Rendering | CRT has its own CPU/CUDA implementation, independent stages, deterministic seed/time, 24 presets and managed color processing. No forced merge with the FM signal model. |
| Color | CRT manages its own input decoding/encoding. A common color contract and visual chain validation remain future work. |
| Runtime | BROKEN FM uses shared CUDA runtime; CRT uses static CUDA runtime and static MSVC runtime. Their CMake settings remain scoped to their own targets/directories. |
| Source generation | CRT native code is generated from `lib/crt-params.js`, `lib/crt-renderer.js` and presets using Node.js. Keep these even when replacing the web UI. No npm install is needed for native generation or preset tests. |
| Dependencies | CRT vendors OpenFX SDK headers with their BSD-3-Clause notice; that notice remains in source and is copied into its bundle. The preview now uses the same Python/static-file setup as BROKEN FM. |
| Platform | Current integration is Windows x64. CRT has CPU fallback; BROKEN FM requires CUDA. Metal/OpenCL and a macOS release are not implemented here. |
| Product presentation | Existing labels and host groups are retained (`rewired-vfx` / `REWIRED`). The browser/Companion UI is aligned; a combined collection installer remains future work. |

## Build both plugins from this repository

Requires Visual Studio 2022 C++ tools, CMake >=3.24, Node.js >=22.13.0 and CUDA 12.8.
From the collection root:

```powershell
cmake -S . -B dist/build/collection -G "Visual Studio 17 2022" -A x64 -T "cuda=C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.8"
cmake --build dist/build/collection --config Release --parallel 4
ctest --test-dir dist/build/collection -C Release --output-on-failure
./scripts/test.ps1
```

BROKEN FM can use existing dependency checkouts with `-DOPENFX_ROOT=<sdk>` and
`-DNLOHMANN_JSON_ROOT=<json>`; otherwise its existing FetchContent downloads apply.
Reconfigure after editing CRT shared shaders, parameters or presets.

Outputs:

- `dist/build/collection/bundle/BrokenFM.ofx.bundle`
- `dist/build/collection/bundle/RewiredCRT.ofx.bundle`

These are build outputs, not a complete installer. BROKEN FM still needs its
companion and shared CUDA runtime staged by `plugins/broken-fm/scripts/build-windows.ps1`.
That existing build/install workflow explicitly remains BROKEN-FM-only, preventing
an installer from claiming to install CRT when it does not. CRT's bundle contains
its presets, SDK notice and native documentation and can be installed using its
[native instructions](../plugins/crt-sim/native/README.md).

Both root build options default to ON. Use `-DREWIRED_BUILD_CRT_SIM=OFF` for only
BROKEN FM. CRT can also be built and tested without CUDA or the BROKEN FM dependencies:

```powershell
cmake -S . -B dist/build/collection-crt-cpu -G "Visual Studio 17 2022" -A x64 -DREWIRED_BUILD_BROKEN_FM=OFF -DCRT_ENABLE_CUDA=OFF
cmake --build dist/build/collection-crt-cpu --config Release --parallel 4
ctest --test-dir dist/build/collection-crt-cpu -C Release --output-on-failure
```

The original standalone `cmake -S plugins/crt-sim/native ...` also remains supported;
its bundle stays directly under that build directory, preserving its updater path.

## Release validation

Build outputs are local artifacts, not published releases. Before distributing a
combined package, stage both plugins and their Companion/runtime dependencies and
validate coexistence, saved-project reopening and chained output in Resolve.
Automated source tests do not replace interactive host/version validation.
