# Third-party notices

The root [SIGNAL CULT license](LICENSE) covers original SIGNAL CULT code. It does not
replace the licenses of third-party components or their distribution requirements.

- **OpenFX SDK:** BSD-3-Clause. CRT SIM includes SDK headers and their
  [license](plugins/crt-sim/native/third_party/openfx/LICENSE.md).
  BROKEN FM obtains the SDK during CMake configuration or uses a supplied checkout.
- **nlohmann/json:** MIT. Both OFX builds use this library; CRT SIM includes its
  [license notice](plugins/crt-sim/hosts/ofx/resources/JSON-LICENSE.MIT).
- **Tauri and Rust dependencies:** resolved through each Companion's Cargo manifest
  and lockfile, under their respective package licenses.
- **NVIDIA CUDA and Microsoft runtimes:** supplied by their vendors and subject to
  the applicable SDK/runtime distribution terms.

Build scripts and plugin documentation describe required dependencies and packaging.
Keep the applicable upstream notices when redistributing third-party components.
