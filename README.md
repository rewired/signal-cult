# rewired-vfx SIGNAL CULT

Free video effects for DaVinci Resolve, with local browser tools and Windows OpenFX plugins.

**Free to use, including for paid video and VFX work.** Original code is licensed
under **BSD-3-Clause with Commons Clause 1.0**; see the complete [license](LICENSE).
Redistributions must retain the copyright notice, BSD terms and Commons Clause.
You may not sell products or services whose value derives entirely or substantially
from this software without separate permission. This protects against simply
rebranding and reselling the plugins; it does not prohibit every use in a larger
commercial product with substantial independent value. Rendered videos do not
require a SIGNAL CULT credit merely because the tools were used.

The combination is source-available, not OSI-approved open source.
See the [Commons Clause explanation](https://commonsclause.com/) and
[third-party notices](THIRD_PARTY_NOTICES.md). Third-party components retain
their own licenses.

Canonical repository: [rewired/signal-cult](https://github.com/rewired/signal-cult).
The collection is maintained here; the former standalone repositories are no longer required.

Two Windows OpenFX plugins and one browser-only effect study:

| Plugin | Sources and documentation | Processing |
| --- | --- | --- |
| BROKEN FM | [plugins/broken-fm](plugins/broken-fm/README.md) | PM/FM video-signal effects, CUDA |
| CRT SIM | [plugins/crt-sim](plugins/crt-sim/README.md) | CRT and Pixel / Sci-Fi, CUDA with CPU fallback |
| SIGNAL ROT | [plugins/signal-rot](plugins/signal-rot/README.md) | Motion-driven feedback, WebGL 2 browser preview |

## Repository structure

```text
plugins/
  broken-fm/       # Renderer, OFX host, companion, presets, tests and manual
  crt-sim/         # Renderer, OFX host, reference web UI, presets and tests
  signal-rot/      # Browser-only motion-feedback study
scripts/
  build-native.ps1 # Build and test either plugin or both
  test.ps1         # Run both plugins' JavaScript regression suites
  start-tools.ps1  # Start all local web tools
docs/             # Collection architecture and integration notes
CMakeLists.txt     # Shared native build entry
dist/             # Ignored collection build artifacts and local dependencies
```

Each native plugin owns its `CMakeLists.txt`, `README.md`, `native/`, `presets/`,
`tests/` and `scripts/`. Plugin-specific internal layouts stay with their owners:
BROKEN FM's companion and GLSL shaders are separate from CRT's generated shader
pipeline. Shared code should only be extracted when both plugins actually use it.
See [repository conventions](docs/repository-structure.md) and the
[CRT integration guide](docs/crt-sim-integration.md).

## Native build

Windows x64 prerequisites: Visual Studio 2022 C++ tools, CMake >=3.24,
Node.js >=22.13.0, and CUDA 12.8 for GPU builds. From this directory:

```powershell
./scripts/build-native.ps1
./scripts/build-native.ps1 -Plugin broken-fm
./scripts/build-native.ps1 -Plugin crt-sim
./scripts/build-native.ps1 -Plugin crt-sim -CpuOnly
```

Each command builds and runs the selected native tests. Output is
`dist/build/windows-x64-<selection>/bundle/` (`crt-sim-cpu` for CPU-only).
Use `-OpenFxRoot <sdk>` and `-NlohmannJsonRoot <json>` to provide existing
BROKEN FM dependency checkouts; otherwise its pinned dependency downloads apply.
The script uses `CUDA_PATH` as the CUDA toolset location when set.

These outputs are native bundles, not a complete collection installer.
BROKEN FM's companion packaging and installers live in
`plugins/broken-fm/scripts/`; CRT installation is documented in
[its native README](plugins/crt-sim/native/README.md).

## Start all tools

Run `start.bat` in the repository root and open the [plugin menu](http://localhost:8080/).
One local Python server serves the menu and every tool:

- [BROKEN FM](http://localhost:8080/broken-fm/)
- [CRT SIM](http://localhost:8080/crt-sim/)
- [SIGNAL ROT preview](http://localhost:8080/signal-rot/)

All tools can be open at the same time. Stop the server with Ctrl+C. The plugin-local
`start.bat` shortcuts also start the whole collection. Any future tool with an
`index.html` under `plugins/<name>/` is automatically available at `/<name>/`.

No npm install or frontend build is required. From PowerShell:

```powershell
./scripts/start-tools.ps1
./scripts/test.ps1
```

Tests and native/Companion builds use Node.js. CRT SIM follows BROKEN FM as the
UI and Companion master.

Each plugin has its own package/installer and Companion. A combined installer and live Resolve coexistence validation remain release work.
