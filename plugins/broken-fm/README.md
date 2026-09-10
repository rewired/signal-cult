# BROKEN FM

Part of the [rewired-vfx SIGNAL CULT](../../README.md). Commands and source paths
in this document are relative to this plugin directory: run `cd plugins/broken-fm`
from the collection root first.

BROKEN FM is a video-signal effect with a WebGL2 reference UI and a native OpenFX/CUDA implementation for DaVinci Resolve. It does not overlay lines on an image: the source image modulates the phase or spatial frequency of a periodic carrier, and the image becomes readable through deformation of that carrier.

The prototype now contains the stable PM reference and a separately implemented spatial FM path:

`INPUT → MODULATION SOURCE → PHASE/FREQUENCY INTEGRATION → CARRIER → LINE SHAPING`

There is no positional RGB splitting or VHS/CRT treatment. Instability, signal failure, and feedback operate inside the signal model and are never composited as image overlays.

## User manual

The illustrated end-user manual is available as [HTML](docs/user-manual/index.html), [Markdown](docs/user-manual/BROKEN_FM_USER_MANUAL.md), and a print-ready [PDF](output/pdf/BROKEN_FM_USER_MANUAL_0.1.0.pdf). It documents all 82 parameters in the frozen contract and clearly marks the current native OFX capability boundaries.

## Start

Run `start.bat` on Windows, then open <http://localhost:8080/broken-fm/>.

BROKEN FM can generate flashing, flickering, and high-contrast moving patterns. A photosensitivity warning is shown before the renderer or test pattern starts. Its checkbox can suppress future warnings on the same device; clearing the site's local storage restores the warning.

The same collection server can be started from this directory with:

```powershell
../../start.bat
```

An HTTP server is required because the GLSL files are loaded with `fetch()`. A current desktop browser with WebGL2 support is required. MP4/WebM support depends on the codecs provided by the browser and operating system. The interface targets a 1920 × 1080 editing workspace and remains usable at smaller browser sizes.

## Pipeline

1. **Preprocess pass** — reads the video at its native pixel dimensions without scaling or cropping, or generates a 1920 × 1080 GPU test pattern with grayscale, geometry, fine-line, and color-bar targets. Stores RGB and Rec. 709 luminance.
2. **Modulation pass** — conditions luminance with gain/bias, derives central-difference edges and six-pixel local contrast, selects Luma, Inverted Luma, Edges, Local Contrast, or Luma + Edges, then applies optional hard/soft thresholding. Threshold zero is an exact bypass.
3. **FM seed pass** — only in FM mode, rotates dry and routed-wet modulation into a two-channel scan-aligned `RG32F` atlas. Modulation-routed feedback and Modulator-stage dropout enter here before integration.
4. **FM prefix passes** — calculate inclusive parallel prefix sums for both channels along every scan line in `ceil(log2(scanWidth))` passes.
5. **Signal pass** — constructs dry and wet carrier phases, applies PM or the accumulated FM phase, introduces scan-coordinate tears and carrier dropouts, and displays either the raw sine or pixel-width line representation.
6. **Feedback pass** — either updates the recursive sequential `RG16F` waveform/quadrature state or writes the current dry pair into an eight-frame history and reduces the selected finite window.
7. **Phosphor persistence pass** — optional RGB peak-hold storage decays by an explicit millisecond half-life; it never feeds back into modulation, phase, or signal history.
8. **Display pass** — presents either the current signal or the stored phosphor emission.

## Deterministic instability

The preview supplies an explicit integer frame index. A loaded video's frame index is derived from its playback position; pausing the video therefore freezes instability. A user-visible integer Seed offsets every stochastic field. Given identical input, parameters, frame index, and Seed, the shader returns the same result.

Instability affects signal parameters only:

- **Frequency Drift** slowly varies the base carrier frequency.
- **Phase Jitter** adds a smooth spatiotemporal perturbation to the phase field.
- **Signal Noise** injects deterministic broadband disturbance into the carrier phase; it is never composited as visible grain.
- **Line Jitter** offsets the scan coordinate in bands perpendicular to the scan direction; Scale controls band width and Speed controls temporal motion.
- **Horizontal / Vertical Drift** move generated signal coordinates through two independent low-frequency fields without resampling the source texture.
- **Time Jitter** perturbs the internal signal clock while leaving the selected source frame untouched.
- **Instability** scales these contributions and returns the exact clean PM/FM path at zero.

## Signal failure

- **Dropout** uses deterministic bands with an angle independent of the carrier Scan Angle. **Modulator** removes image modulation while leaving the base carrier; **Signal Loop** removes carrier energy and feeds neutral input into the feedback state; **Output** blacks out only the visible result while the loop continues underneath. It never covers the source with a noise layer.
- **Line Tear** creates intermittent discontinuities in the scan coordinate. PM carrier phase and the FM integral lookup move together, preserving the signal model instead of shifting final image pixels.
- Both controls have exact neutral paths at zero and use the same Seed and explicit frame index as instability. Their math is stateless and maps directly to a CUDA kernel.

## Feedback models

**Sequential Loop** recursively retains the previous bipolar wet signal according to Decay. It is the most unstable realtime-preview model, but its result depends on evaluation order. **Finite Window** combines up to eight previous dry signals with normalized exponential weights. Because feedback is not written back into its own history, output frame `t` depends only on a bounded set of dry frames `t−1…t−N`. **Phase** injection adds the selected state directly to phase; **Modulation** injection adds it to the modulation field before PM or FM prefix integration. Amount is a dimensionless coupling value. Feedback Displacement translates the stored signal in pixel-space per age step before it is reinjected: recursively per frame for Sequential Loop and by `age × displacement` for each Finite Window tap. Feedback Phase rotates a stored waveform/quarter-cycle pair by turns before reinjection, rather than disguising phase as a gain knob. This is exact quadrature for Sine and an intentional two-sample phase-plane transform for complex carrier shapes. Samples outside the frame become neutral signal rather than smeared clamp edges. The previous display image is never alpha-blended over the current image.

Browser history advances once per explicit preview frame index. Pausing freezes it; Reset, source switching, backwards movement, and large timeline jumps clear it. The browser can only populate history during linear playback, so arbitrary browser seeks start with an empty window. The deterministic OFX history implementation remains a parity gate after the initial native signal-path build; the plugin does not silently substitute render-order-dependent state. Sequential Loop remains preview-only.

## Color and output

- **Mono** emits the shaped carrier as grayscale.
- **Input Color** extracts normalized source chroma and applies it only to generated carrier energy. Source luminance is not recomposited into the output.
- **RGB Phase** evaluates the same phase field at positive, zero, and negative channel offsets. It does not spatially offset RGB pixels.

Black Level adds or removes pedestal before shaping. Contrast expands the signal around 0.5, Signal Gamma applies the nonlinear response, and Brightness is the final gain. Phosphor Persistence stores per-channel peak emission after shaping and decays it by a half-life in milliseconds. It is disabled in diagnostic views and cannot alter the carrier or feedback loop. These controls affect only Output LINE/RAW; diagnostic views remain unshaped.

All image processing remains on the GPU. JavaScript handles only video texture upload, parameters, and pass orchestration.

## Signal model

The scan coordinate is measured in centered output pixels:

```text
dir = normalize(cos(angle), sin(angle))
p   = dot(pixelPositionCentered, dir)
```

Frequency is expressed as cycles per 100 output pixels. Phase depth is expressed in full turns:

```text
carrierPhase = TAU * (frequency * p / 100 + carrierPhaseOffset)
modulation   = (selectedSource - 0.5) * modulationGain
phase        = carrierPhase + TAU * phaseDepth * modulation
signal       = sin(phase)
```

At `Modulation Gain = 0` or `Phase Depth = 0`, the input contributes no information to the output. This is the primary integrity test.

The LINE display does not use a fixed sine threshold. It measures the wrapped angular distance to the nearest phase line and divides by the screen-space phase derivative. This makes Line Width approximately pixel-based and stable as carrier frequency changes. GLSL derivatives are only used for preview line shaping/antialiasing, not as part of the underlying signal model. A CUDA implementation can replace this with explicit phase gradients.

## PM versus FM

PM applies the modulation value directly to phase:

```text
phase(p) = carrierPhase(p) + modulation(p) * phaseDepth
```

FM accumulates local frequency deviation along the scan direction:

```text
dPhase/dp = TAU * frequency(p)
```

The implementation uses the prefix/scan approach; it never evaluates `sin(p * localFrequency)`. The accumulated term is:

```text
fmPhase = carrierPhase
        + TAU * frequencyDeviation * modulationGain
        * prefixSum(centeredModulation) / 100
```

Consequently, the phase difference between adjacent scan-space pixels reflects their local frequency. Dry and wet prefix fields share an `RG32F` atlas and require `EXT_color_buffer_float` in WebGL2.

## Controls

- Video file, Play/Pause, or built-in test pattern
- Modulation source: Luma, Inverted Luma, Edges, Local Contrast, Luma + Edges
- Luma Gain/Bias, Edge Gain, Local Contrast Gain, hard/soft Threshold, and overall Modulation Gain
- OSC modal: Sine, Triangle, Saw, Square, Noise, Wavetable, and Audio carriers
- Line/Waveform rendering, Carrier Frequency/Phase, Scan Angle, PWM/Skew, and Noise Detail
- Live oscillator scope plus smoothed Level, Low, Mid, High, and Transient analysis with Attack/Release
- Two deterministic LFOs with Sine, Triangle, Saw, Square, Sample & Hold, and Smooth Noise
- Per-LFO Hz or BPM timing, musical divisions from two bars through 1/32, Timeline/Transport sync, retrigger, Phase, and bipolar/unipolar output
- Four modulation slots with LFO/audio Source, Destination, and bipolar Amount
- Phase Depth (turns)
- Mode: PM or integrated FM
- FM Frequency Deviation (cycles per 100 pixels at full-scale modulation)
- Instability, Phase Jitter, Signal Noise, Frequency Drift, horizontal/vertical signal drift, Drift Rate, Time Jitter, Line Jitter Scale/Speed, and Seed
- Signal Failure: Dropout, independent Dropout Angle, and Line Tear
- Feedback Model (Sequential Loop or 1–8 frame Finite Window)
- Feedback Injection (Phase or Modulation), Amount, Decay, two-component phase rotation, pixel displacement/direction, and Reset
- Dropout Stage (Modulator, Signal Loop, or Output)
- Color Mode and RGB Phase Offset
- Black Level, Signal Gamma, Brightness, and Contrast

Source loading, the combined Play/Pause action, test-pattern selection, preset selection/import/export, OSC, Setup, and the Debug View visibility toggle live in the header. Test Pattern is highlighted while active and pauses any loaded video. Play resumes the loaded video and makes it the active source; Pause freezes its current frame. The play control remains disabled until a video is loaded. Their icons use locally embedded Google Material Icons SVG paths, so the interface has no icon-font or CDN dependency. Debug View is initially off and opens as a translucent blur overlay in the lower-right corner of the video preview. Signal-route topology, deterministic Seed, audio loading, and wavetable import live in Setup. The Canvas2D oscillator scope is UI visualization only; all video processing remains in WebGL.

Audio files are decoded to mono. The same buffer can act as a spatial carrier, supplies deterministic Level/Low/Mid/High/Transient analysis at the explicit preview frame, and can be heard through the opt-in Monitor Audio control in Setup. Its level is independent of the effect. Monitoring, carrier sampling, analysis, and the oscillator scope share one playhead; video Play/Pause controls it, while Test Pattern lets it run independently. The internal demo signal is audible too, so audio presets remain self-contained. The modulation slots accept either LFO or audio-analysis sources and can drive carrier, feedback, failure, drift, jitter, noise, or persistence parameters. Imported wavetables are normalized, resampled to 2048 samples, and replace the custom table for the current session.

Timeline LFOs are evaluated directly from absolute preview/host time and Seed; no accumulated oscillator state is required. Transport LFOs subtract a session-only retrigger origin and restart when playback/source state is restarted or the Retrigger button is pressed. The retrigger timestamp is deliberately not stored in presets. In BPM mode, 1/4 equals one cycle per beat, 1/8 two cycles per beat, and one bar equals one cycle per four beats in 4/4. A matrix-modulated control shows `base → effective` while its value is changing.

Horizontal and Vertical Drift offset the generated signal coordinates in pixel-space; they do not resample or translate the source texture. Time Jitter perturbs the deterministic internal signal clock used by drift, instability, dropout, and tear events. It deliberately does not fetch a different video frame, so the browser prototype never disguises unavailable temporal source sampling as a real time-remap effect.

## Preset JSON

The fifty-six built-in presets live as individual JSON files in `presets/`. Their order and stable UI ids are defined by `presets/index.json`; the dropdown is generated from that manifest at startup. Built-in and manually loaded JSON presets use the same validator and migration path. Presets 19 and 20 are the user-authored Razorwire pair. Presets 21–45 cover carrier/audio, LFOs, feedback displacement, signal drift/time jitter, and phosphor persistence. Presets 46–51 cover phase-domain Signal Noise, wide/fine Line Jitter timing, quadrature feedback, and LFO-rotated Feedback Phase. Presets 52–56 cover hard/soft thresholding, transport-synced PWM and scan motion, and visible multi-destination modulation. Save JSON captures effect parameters only. It intentionally excludes source files, imported wavetable samples, audio-monitor state and level, playback position, LFO retrigger origin, Debug View, performance state, feedback buffers, and phosphor buffers. Loading any preset resets both temporal buffers and retriggers Transport LFOs.

```json
{
  "format": "broken-fm-preset",
  "version": 16,
  "name": "01 CLEAN PM",
  "parameters": {
    "mode": "pm",
    "modSource": "luma",
    "lumaGain": 1,
    "lumaBias": 0,
    "edgeGain": 2.5,
    "localContrastGain": 4,
    "modThreshold": 0,
    "modSoftness": 0.1,
    "modulationGain": 1,
    "frequency": 8,
    "carrierPhase": 0,
    "carrierShape": "sine",
    "signalRender": "line",
    "pwm": 0.5,
    "noiseDetail": 2,
    "wavetable": "harmonic",
    "audioAttack": 25,
    "audioRelease": 180,
    "phaseDepth": 0.8,
    "frequencyDeviation": 4,
    "scanAngle": 0,
    "lineWidth": 1.2,
    "lineSoftness": 0.75,
    "instability": 0,
    "phaseJitter": 0.18,
    "signalNoise": 0,
    "frequencyDrift": 1.5,
    "horizontalDrift": 0,
    "verticalDrift": 0,
    "driftRate": 0.22,
    "timeJitter": 0,
    "lineJitter": 5,
    "lineJitterScale": 2,
    "lineJitterSpeed": 7,
    "seed": 0,
    "dropout": 0,
    "dropoutAngle": 0,
    "lineTear": 0,
    "dropoutStage": "signal-loop",
    "feedbackAmount": 0,
    "feedbackDecay": 0.9,
    "feedbackDisplacement": 0,
    "feedbackDisplacementAngle": 0,
    "feedbackPhase": 0,
    "feedbackInjection": "phase",
    "feedbackModel": "sequential",
    "feedbackWindow": 4,
    "colorMode": "mono",
    "rgbPhaseOffset": 0.035,
    "blackLevel": 0,
    "signalGamma": 1,
    "brightness": 1,
    "contrast": 1,
    "phosphorPersistence": 0,
    "lfo1Shape": "sine",
    "lfo1RateMode": "hz",
    "lfo1Sync": "timeline",
    "lfo1RateHz": 0.25,
    "lfo1Bpm": 120,
    "lfo1Division": "1-4",
    "lfo1Phase": 0,
    "lfo1Polarity": "bipolar",
    "lfo2Shape": "sine",
    "lfo2RateMode": "hz",
    "lfo2Sync": "timeline",
    "lfo2RateHz": 0.1,
    "lfo2Bpm": 120,
    "lfo2Division": "1-bar",
    "lfo2Phase": 0.25,
    "lfo2Polarity": "bipolar",
    "audioSource1": "off",
    "audioDestination1": "off",
    "audioAmount1": 0,
    "audioSource2": "off",
    "audioDestination2": "off",
    "audioAmount2": 0,
    "audioSource3": "off",
    "audioDestination3": "off",
    "audioAmount3": 0,
    "audioSource4": "off",
    "audioDestination4": "off",
    "audioAmount4": 0
  }
}
```

Saved version-16 files contain every supported parameter. Version-1 through version-15 files migrate forward. Older files receive neutral defaults for features introduced after their version, including zero threshold, Feedback Displacement, axis/time drift, Phosphor Persistence, Signal Noise, and Feedback Phase plus legacy Line Jitter timing, preserving their existing output. Loading is limited to 64 KB, validates the format/version, rejects missing or invalid values, ignores unknown data, limits names to 80 characters, rounds integer parameters, and clamps finite numeric values to supported control ranges.
- Scan Angle (degrees in pixel space)
- Line Width and Line Softness (screen pixels)
- Debug views: Input, Luma, Edges, Local Contrast, Modulation, Carrier LINE/RAW, Phase Field, Feedback State, Output LINE/RAW

Scan Angle ranges from −180° to 180°. Normal slider dragging uses each parameter's fine step. Hold Ctrl while dragging to snap to meaningful coarse intervals: 15° angle, 1 cycle frequency/deviation, 0.25 modulation/phase depth, and 0.25 px line shaping.

## Native OFX / Tauri build

The frozen cross-surface contract is `contracts/parameters-v1.json`. `tools/generate-parameter-contract.mjs` derives it from the validated browser schema and generates the C++ descriptor table used by the OFX host adapter. Stable IDs, defaults, ranges, enum order, animation flags, preset persistence, and session-only exclusions therefore have one checked boundary.

The Windows build produces:

- `BrokenFM.ofx.bundle` — a native OpenFX 1.x filter with 82 host-animatable parameters, float RGBA input/output, CUDA rendering, and CPU fallback.
- `BrokenFmCompanion.exe` — the Tauri 2 editor that reuses this UI without an HTTP server. The OFX push button exchanges one version-16 preset atomically with the editor; cancel leaves the Resolve instance untouched.
- `manifest.json` — byte sizes and SHA-256 hashes for the staged binaries.

```powershell
./scripts/build-windows.ps1 -OpenFxRoot C:\src\openfx -NlohmannJsonRoot C:\src\json
```

Build intermediates stay under `dist/build/windows-x64`; distributable files are staged under `dist/windows-x64`. The build is offline-capable once the OpenFX headers, nlohmann/json, Cargo crates, CUDA 12 runtime, CMake, and Visual Studio 2022 Build Tools are present. It targets SM75, SM86, and SM89 and retains compute-89 PTX for newer NVIDIA devices.

For a machine-wide installation, run the elevated `scripts/install-windows.ps1`. For a no-installer, per-user installation, run `scripts/install-windows-user.ps1`; it copies the bundle to `%LOCALAPPDATA%\OFX\Plugins`, installs the Companion under `%LOCALAPPDATA%\Programs\BROKEN FM`, registers the Companion path, and adds the user plug-in directory to `OFX_PLUGIN_PATH`. Close Resolve and the Companion before updating, then restart Resolve so it rescans OpenFX plug-ins.

The native render path covers PM, scan-atlas prefix FM, source conditioning and thresholding, procedural/internal carriers, LFO matrix evaluation, drift, internal Time Jitter, phase/signal noise, line jitter and tear, dropout, color modes, and output shaping. OpenFX exposes no portable audio stream, so audio-derived modulation and the Audio carrier have no native source. Imported custom audio/wavetable payloads, finite temporal feedback/history, and phosphor history remain explicit parity gates. The Companion session disables unsupported choices where possible; shared Resolve enum and matrix controls can still expose unsupported combinations, which the native renderer rejects rather than approximating.

## Known limitations

- Edge extraction is intentionally minimal and operates at preview resolution.
- A loaded video keeps its native input dimensions throughout the render graph: video-size-in equals video-size-out, with no processing rescale or crop. The built-in test signal is 1920 × 1080.
- The controls and preview layout are designed for a 1920 × 1080 editing-software workspace. CSS may scale the canvas presentation to fit the available panel, without changing the underlying render dimensions.
- UI copy is resolved through stable translation keys in `js/i18n.js`. English is currently the only locale.
- LINE width is an antialiased screen-space approximation; extreme phase folds can still create dense, unresolved regions.
- Rotating into scan space introduces nearest-pixel discretization at oblique angles. It preserves a one-pixel integration step but can show slight stair-stepping.
- Browser FM costs one seed pass plus approximately 11–13 prefix passes at common video widths. Native CUDA computes modulation once, maps it into a scan-oriented atlas, and integrates each atlas row with a CUB segmented inclusive scan; the CPU fallback uses the same atlas geometry and linear row-prefix sums.
- Every OFX instance owns a thread-safe `CudaRenderContext` slot pool. Streams, device buffers, parameter storage, and CUB workspaces are reused after warm-up; pitched `cudaMemcpy2DAsync` transfers honor positive and negative host row strides. Release CUDA builds use fast math, so CPU/CUDA/WebGL parity is visual rather than bit exact.
- Color management is not implemented. Browser-decoded RGB is treated as display RGB and luminance uses Rec. 709 coefficients.
- Browser signal-failure timing uses the preview's fixed 60 fps timebase. OFX derives seconds from host time and frame rate.

## License

Original code uses [BSD-3-Clause with Commons Clause 1.0](../../LICENSE).
Paid video/VFX production is allowed. Software redistribution must retain the
copyright and license notices. Selling a product or service whose value derives
entirely or substantially from this software requires separate permission;
not every integration into a larger commercial product is prohibited.
See the [collection overview](../../README.md) and
[third-party notices](../../THIRD_PARTY_NOTICES.md).
