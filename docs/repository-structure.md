# Repository structure

## Ownership

SIGNAL CULT is maintained at [rewired/signal-cult](https://github.com/rewired/signal-cult).
The main branch starts from one consolidated source snapshot of both effects.

- The repository root owns collection configuration, licensing and documentation.
- `plugins/broken-fm/` owns BROKEN FM sources, browser UI, native core, OFX adapter,
  Companion, contracts, presets, tests and manual.
- `plugins/crt-sim/` owns CRT SIM sources, browser UI, CPU/CUDA core, OFX adapter,
  Companion, source generators, presets, tests and dependency notices.
- `plugins/signal-rot/` owns a browser-only motion-feedback prototype. It has no native build or Companion.
- `plugins/bucket-rot/` owns a browser-only 64-stage video delay and modulation matrix.
- Each native plugin has a top-level CMake entry and can build independently.
- `scripts/` contains collection-wide commands. Product packaging and installation
  scripts stay with their plugin.

Keep public plugin IDs and parameter contracts stable. Rendering implementations,
creative presets and color transforms remain plugin-specific. Shared code should
only be extracted when both effects use it.

## Paths and outputs

Commands in plugin READMEs are relative to that plugin directory. Commands in the
root README are relative to the collection root. The outer checkout name is not
part of the build or runtime API.

The common build writes to `dist/build/windows-x64-<selection>/bundle/`.
Plugin package builds write to `plugins/<name>/dist/`. CRT's standalone native
build also supports `plugins/crt-sim/native/build/`.

Build output, downloaded dependencies, local backups, and generated Tauri schemas
are ignored. Cargo lockfiles, creative parameter contracts and native generated
sources remain tracked for reproducibility. BROKEN FM's PDF manual is a release
input tracked alongside its editable documentation sources.

Use a fresh build directory after moving a checkout; CMake caches contain absolute
paths. See the [root README](../README.md) for build, test and launch commands.

## UI and Companion

BROKEN FM is the collection's UI master. CRT SIM synchronizes the base stylesheet
and slider helper through `plugins/crt-sim/scripts/sync-master-ui.mjs`.
Both editors use the same preset toolbar workflow and explicit Apply/Cancel model.
Each plugin keeps its compatible preset format and independent native rendering.
See [CRT architecture](../plugins/crt-sim/docs/ofx-architecture.md).

GRID ROT (`plugins/grid-rot/`) owns its spatial grid model, current-frame renderer,
media UI, presets and tests. It shares the existing control styling and slider
helper. It has no delay buffers or native OFX target.
