# BROKEN FM OFX architecture

## Boundary

`contracts/parameters-v1.json` is the feature-freeze boundary. A parameter ID is a public project interface and must never be renamed or reused. Changes require a new contract version and an explicit migration. Render values are host-owned; loaded media, custom sample buffers, open dialogs, debug state, and the Transport retrigger origin are session-owned.

```text
Browser schema v16 ──generator──> parameter contract v1
                                      │
                     ┌────────────────┼────────────────┐
                     ▼                ▼                ▼
                Tauri controls   OFX parameters   Native values[82]
                                                        │
                                                CPU / CUDA core
                                                        │
                                            host-linear float RGBA
```

The Tauri process never renders Resolve frames and the OFX render action never depends on Tauri, JavaScript, a local server, or IPC. The editor opens only from an explicit OFX push button. It receives a versioned JSON snapshot, edits a working copy, and writes a result file only on Apply. OFX validates the result before changing its own parameters.

## Parameter ownership

- OFX owns persistent and animated render values. Every contract parameter is exposed with the same stable ID, type, range, default, and choice order.
- Presets own the same render values but not keyframes or session state.
- Timeline LFO phase is a pure function of host time. Transport phase is a pure function of time since its session retrigger origin. The OFX Retrigger button stores that non-animating origin separately from the 82 preset parameters, so preset exchange cannot accidentally move it.
- The renderer clamps effective matrix values at the same destination bounds as the browser.
- Output remains host-managed linear premultiplied float RGBA. No browser display transform is baked into OFX pixels.

## Native capability gate

The native v0.1 spine deliberately distinguishes implemented processing from preserved controls. PM/FM, threshold, procedural carriers, deterministic instability/failure, LFO modulation, color, and output response execute in CPU and CUDA. Audio analysis/imported sample data, custom wavetable bytes, finite feedback source history, and phosphor history require additional host/resource contracts. They remain valid preset fields and round-trip through Resolve/Companion, but cannot affect v0.1 native pixels yet.

The Companion host session disables unsupported carrier and modulation choices where possible. Resolve still presents the shared frozen parameter contract, so some enum or matrix combinations can remain selectable there. The renderer rejects those unsupported combinations instead of silently substituting another effect.

Sequential feedback will not enter the OFX render path because it depends on evaluation order. The production temporal implementation must use explicit `t−1…t−N` source requests for Finite Window and must pass seek, parallel-render, cache, and out-of-order tests before the capability is enabled.

## CUDA render context

Each OFX instance owns a `CudaRenderContext`. Its thread-safe, dynamically growing slot pool gives every concurrent render a separate CUDA stream, reusable device buffers, slot-local float parameter storage, and CUB workspace. `cudaAvailable()` is cached once per process. Buffers allocate only on first use or capacity growth and remain alive until their owning context is destroyed, so an equal-size or smaller render performs no CUDA allocations after warm-up.

The public contract remains 82 double values. At the render boundary those effective values are converted once to an internal float POD and copied into the acquired slot; image and parameter kernel pointers are restricted. Source and output use pitched `cudaMemcpy2DAsync` transfers with the host-provided strides. A normalized base address plus vertical mapping flags preserves correct orientation for both positive and negative `row_bytes`. Only the acquired slot's stream is synchronized before returning to the host. Release CUDA compilation enables fast math; debug builds retain diagnostic precision.

## Native FM pipeline

FM uses the same three-stage geometry on CPU and CUDA:

1. Compute the conditioned modulation field once per source pixel.
2. Map it into an atlas whose rows follow the selected scan axis.
3. Integrate each atlas row and let the final pixel stage read the accumulated value.

CUDA performs stage three with CUB segmented inclusive scan. The CPU fallback uses linear row-prefix sums and parallelizes independent rows and final pixels. PM bypasses the modulation atlas and scan because its final phase uses local modulation directly.

CPU, CUDA, and both GLSL shader copies share the same `hash21` coordinates and seed offsets for drift, noise, tear, and dropout decisions. Fast math and different execution units make bit-exact floating-point equality an invalid target; parity means matching event decisions and visually tolerant color values.
