import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contract = JSON.parse(fs.readFileSync(path.join(root, "contracts", "parameters-v1.json"), "utf8"));
const outDir = path.join(root, "docs", "user-manual");

const groupOrder = ["modulation", "carrier", "line", "instability", "failure", "feedback", "color", "output", "audio", "lfo", "matrix", "other"];
const groupTitles = {
  modulation: "Modulation source",
  carrier: "Carrier and PM/FM",
  line: "Line shaping",
  instability: "Instability",
  failure: "Signal failure",
  feedback: "Feedback",
  color: "Color",
  output: "Output",
  audio: "Audio analysis",
  lfo: "Low-frequency oscillators",
  matrix: "Modulation matrix",
  other: "Setup"
};

const descriptions = {
  mode: "Selects the signal model. PM adds the source value directly to carrier phase. FM integrates source-driven frequency changes along the selected scan direction, producing folds and accumulated bends.",
  modSource: "Chooses the image feature that drives modulation: luminance, inverted luminance, edges, local contrast, or a luminance-plus-edge blend.",
  lumaGain: "Multiplies source luminance before centering it around the neutral midpoint. Higher values make tonal differences drive the carrier more strongly.",
  lumaBias: "Offsets luminance before it becomes a modulation signal. Use it to choose which tonal region sits near the neutral carrier state.",
  edgeGain: "Sets the strength of the extracted edge signal. It is most obvious with Edges or Luma + edges as Mod Source.",
  localContrastGain: "Sets the strength of local brightness differences. Higher values emphasize texture and small regional changes rather than overall exposure.",
  modThreshold: "Suppresses modulation below the selected level. A value of 0 is an exact bypass; higher values isolate progressively stronger source features.",
  modSoftness: "Controls the transition width around Mod Threshold. At 0 the threshold is hard; higher values create a smoother gate. It has no visible effect when Threshold is 0.",
  modulationGain: "Master gain for the conditioned image modulation before PM or FM. At 0 the source contributes no information to the generated signal.",
  frequency: "Base carrier density in cycles per 100 output pixels along Scan Angle. Higher values create more closely spaced lines or waveform cycles.",
  carrierPhase: "Offsets the carrier by whole turns without moving source pixels. Animate it to make the generated signal travel through the image.",
  carrierShape: "Selects Sine, Triangle, Saw, Square, Noise, Wavetable, or Audio as the carrier. Audio requires a loaded audio source in the Companion preview.",
  signalRender: "Line draws narrow contours at repeating carrier phases. Waveform displays the continuous bipolar signal as image intensity.",
  pwm: "Changes duty cycle for Square and skew/symmetry for Triangle and Saw-derived shapes. 0.5 is centered and symmetrical.",
  noiseDetail: "Controls spatial detail for the Noise carrier. Low values make broad variations; high values make finer, faster-changing structure.",
  wavetable: "Selects the internal Harmonic, Folded, or Formant table, or the session-only imported Custom table. Custom data is not embedded in preset JSON.",
  phaseDepth: "PM depth in full turns. It controls how far image modulation bends carrier phase; 0 removes PM influence even if Modulation Gain is non-zero.",
  frequencyDeviation: "FM deviation in cycles per 100 pixels at full-scale modulation. Positive and negative values reverse the direction of accumulated frequency bending. Active only in FM mode.",
  scanAngle: "Direction in which the carrier and FM integral travel, from -180 degrees to 180 degrees. It rotates the signal coordinate, not the source image.",
  lineWidth: "Approximate on-screen thickness of Line render contours in pixels.",
  lineSoftness: "Antialiasing and edge softness around Line render contours. 0 is crisp; larger values create broader, softer edges.",
  instability: "Master amount for drift and jitter contributions. At 0 the clean PM/FM path is restored even when the individual instability controls have non-zero setup values.",
  phaseJitter: "Adds smooth, deterministic disturbance directly to carrier phase. It roughens and wriggles the signal without adding a visible noise overlay.",
  signalNoise: "Injects deterministic broadband disturbance into signal phase. It produces RF-like breakup while remaining part of the carrier calculation.",
  frequencyDrift: "Maximum slow variation of carrier frequency in cycles per 100 pixels. Its motion rate is controlled by Drift Rate.",
  horizontalDrift: "Moves generated signal coordinates horizontally in pixel space. The source image is not resampled or translated.",
  verticalDrift: "Moves generated signal coordinates vertically in pixel space. Combine it with Horizontal Drift for wandering two-axis motion.",
  driftRate: "Speed in hertz of frequency and coordinate drift fields. Low values wander slowly; high values hunt rapidly.",
  timeJitter: "Perturbs the internal signal clock by an amount expressed in frames. It affects procedural motion and failure timing, but does not select a different source-video frame.",
  lineJitter: "Maximum displacement of scan-line bands in pixels. This is the amplitude of horizontal-sync-like line movement.",
  lineJitterScale: "Width of the bands affected by Line Jitter. Small values produce fine buzzing lines; large values shift broader blocks together.",
  lineJitterSpeed: "Temporal speed in hertz of the Line Jitter pattern. 0 freezes the pattern for a given frame state.",
  dropout: "Probability/intensity of deterministic missing-signal bands. The affected signal-domain location is selected by Dropout Stage.",
  dropoutAngle: "Orientation of dropout bands, independent of Scan Angle. Use a different angle to cross-cut the carrier structure.",
  lineTear: "Maximum discontinuous jump of the scan coordinate in pixels. It tears carrier phase and FM lookup together instead of shifting the finished image.",
  dropoutStage: "Chooses where dropout enters the route: Modulator removes source modulation, Signal loop removes carrier energy and weakens stored feedback, and Output blacks only the visible result.",
  feedbackAmount: "Coupling strength of the stored signal returned to the current frame. 0 disables feedback.",
  feedbackDecay: "Retention applied to older signal state. Values near 1 create longer, more persistent echoes.",
  feedbackDisplacement: "Moves stored signal by pixels per age step before reinjection. It creates trails, conveyors, and drifting memory rather than a simple overlay.",
  feedbackDisplacementAngle: "Direction of feedback displacement from -180 degrees to 180 degrees.",
  feedbackPhase: "Rotates the stored waveform and quadrature pair in turns before reinjection. This changes echo phase and polarity without disguising the operation as gain.",
  feedbackInjection: "Phase injects stored state after PM/FM integration. Modulation returns it before integration, so FM can accumulate and reshape the feedback.",
  feedbackModel: "Sequential loop recursively uses the previous wet state and depends on linear playback. Finite window combines a bounded set of previous dry frames for a deterministic history length.",
  feedbackWindow: "Number of previous dry frames, 1 through 8, used by Finite window. It is disabled for Sequential loop.",
  colorMode: "Mono outputs one signal in all channels. Input color applies normalized source chroma to signal energy. RGB phase evaluates red, green, and blue at different carrier phases.",
  rgbPhaseOffset: "Phase separation in turns between RGB channels. Active only in RGB phase mode; larger offsets create stronger color splitting.",
  blackLevel: "Adds or removes output pedestal before contrast, gamma, and brightness shaping. Negative values crush low signal; positive values lift black.",
  signalGamma: "Nonlinear response of the generated signal. Values below 1 brighten mid-levels; values above 1 darken them.",
  brightness: "Final output gain after black level, contrast, and gamma. At 0 the visible output is black.",
  contrast: "Expands or compresses output around mid-gray before gamma. 1 is neutral.",
  phosphorPersistence: "Peak-hold afterglow half-life in milliseconds. It stores bright RGB emission while decaying older light; it never feeds back into the carrier or modulation path.",
  audioAttack: "Rise time in milliseconds for Level, Low, Mid, High, and Transient analysis. Short attack follows hits quickly; long attack smooths their onset.",
  audioRelease: "Fall time in milliseconds for audio analysis. Long release holds energy after a sound; short release makes modulation drop quickly.",
  seed: "Changes all deterministic random fields used by noise, jitter, dropout, and related modulation. The same seed, frame, input, and parameters reproduce the same result."
};

for (const n of [1, 2]) {
  descriptions[`lfo${n}Shape`] = `Waveform generated by LFO ${n}: Sine, Triangle, Saw, Square, stepped Sample & hold, or interpolated Smooth noise.`;
  descriptions[`lfo${n}RateMode`] = `Chooses free-running Hz or tempo-based BPM timing for LFO ${n}. Only the controls for the selected rate mode affect its speed.`;
  descriptions[`lfo${n}Sync`] = `Timeline evaluates LFO ${n} from absolute host time. Transport subtracts the most recent retrigger origin so playback/retrigger can restart its cycle.`;
  descriptions[`lfo${n}RateHz`] = `Free-running speed of LFO ${n} in cycles per second. Active when Rate mode is Hz.`;
  descriptions[`lfo${n}Bpm`] = `Tempo used by LFO ${n} for musical timing. Active when Rate mode is BPM.`;
  descriptions[`lfo${n}Division`] = `Musical cycle length for LFO ${n}, from two bars to 1/32. In 4/4, 1/4 produces one cycle per beat.`;
  descriptions[`lfo${n}Phase`] = `Starting phase of LFO ${n} in turns. 0.25 is a quarter-cycle offset and 0.5 is half a cycle.`;
  descriptions[`lfo${n}Polarity`] = `Bipolar maps LFO ${n} to -1...+1 for motion around the base value. Unipolar maps it to 0...+1 for one-direction modulation.`;
}

for (const n of [1, 2, 3, 4]) {
  descriptions[`audioSource${n}`] = `Source for modulation slot ${n}: Off, audio Level/Low/Mid/High/Transient analysis, LFO 1, or LFO 2. Audio sources require audio in the Companion preview.`;
  descriptions[`audioDestination${n}`] = `Parameter controlled by modulation slot ${n}. Off disconnects the slot. A destination can receive multiple slots, which are summed before clamping.`;
  descriptions[`audioAmount${n}`] = `Signed depth of modulation slot ${n}. Positive values follow the source; negative values invert it. 0 disables the slot without changing its source/destination choices.`;
}

const missing = contract.parameters.filter((parameter) => !descriptions[parameter.id]);
if (missing.length) throw new Error(`Missing manual descriptions: ${missing.map((parameter) => parameter.id).join(", ")}`);

const units = {
  frequency: "cy/100px", carrierPhase: "turns", phaseDepth: "turns", frequencyDeviation: "cy/100px",
  scanAngle: "degrees", lineWidth: "px", lineSoftness: "px", phaseJitter: "turns",
  frequencyDrift: "cy/100px", horizontalDrift: "px", verticalDrift: "px", driftRate: "Hz",
  timeJitter: "frames", lineJitter: "px", lineJitterScale: "px", lineJitterSpeed: "Hz",
  dropoutAngle: "degrees", lineTear: "px", feedbackDisplacement: "px/frame",
  feedbackDisplacementAngle: "degrees", feedbackPhase: "turns", rgbPhaseOffset: "turns",
  phosphorPersistence: "ms", audioAttack: "ms", audioRelease: "ms", lfo1RateHz: "Hz",
  lfo2RateHz: "Hz", lfo1Bpm: "BPM", lfo2Bpm: "BPM", lfo1Phase: "turns", lfo2Phase: "turns"
};

function values(parameter) {
  if (parameter.choices) return parameter.choices.join(", ");
  const unit = units[parameter.id] ? ` ${units[parameter.id]}` : "";
  return `${parameter.min} to ${parameter.max}${unit}`;
}

function defaultValue(parameter) {
  const unit = units[parameter.id] && !parameter.choices ? ` ${units[parameter.id]}` : "";
  return `${parameter.default}${unit}`;
}

function esc(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

const intro = `BROKEN FM turns image structure into a generated electronic signal. It is not a displacement, crop, or scaling effect: source pixels are analyzed as modulation while the carrier is built in output pixel space. This manual describes the English Companion UI and the matching version-1 parameter contract for BROKEN FM 0.1.0.`;
const safetyNotice = `BROKEN FM can generate flashing, flickering, and high-contrast moving patterns. A photosensitivity warning appears before the renderer or test pattern starts. Select its checkbox to suppress future warnings on the same device; clear the application's local storage to show it again.`;
const nativeNotice = `PM/FM, procedural carriers, LFO routing, instability, dropout, color, and output shaping run natively. Audio carrier/analysis, imported custom wavetable payloads, feedback history, and phosphor history remain parity gates. The Companion session disables unsupported choices where possible; shared Resolve enum and matrix controls may still expose combinations that the native renderer rejects instead of approximating.`;

const workflows = [
  ["Start from a preset", "Choose a factory preset in the header and step through the library with the previous/next buttons. Presets are complete effect states and are the fastest way to learn the available range."],
  ["Choose the source", "After the safety warning is acknowledged, Test pattern is active and highlighted by default. Loading a video enables Play. Selecting Test pattern pauses the loaded video; pressing Play resumes the video and makes it the source."],
  ["Shape the modulation", "Choose Mod Source, then balance its gain/bias and optional threshold. Set Modulation Gain to 0 whenever you want to inspect the dry carrier."],
  ["Choose PM or FM", "PM is local and immediate. FM accumulates change along Scan Angle and is usually more folded, torn, and direction-dependent."],
  ["Add motion deliberately", "Use Instability for signal failure, or open OSC to route deterministic LFO/audio sources to explicit destinations. A changing destination shows base value -> effective value."],
  ["Save or apply", "Save JSON writes effect parameters only. In a Resolve OFX editing session, Apply to Resolve returns the current settings; Cancel leaves the plugin instance unchanged."]
];

const screenshots = [
  ["assets/01-main-interface.png", "Main interface at 1920 x 1080, using 20 COLORED RAZORWIRE."],
  ["assets/02-osc-lfo.png", "OSC/LFO modal with carrier preview, two LFOs, and the modulation matrix."],
  ["assets/03-setup-routing.png", "Setup modal showing the active dropout and feedback connection points."],
  ["assets/04-debug-overlay.png", "Optional lower-right Debug View overlay; it never replaces the main result."]
];

const parametersByGroup = Object.fromEntries(groupOrder.map((group) => [group, contract.parameters.filter((parameter) => parameter.group === group)]));

const markdown = [
  "# BROKEN FM User Manual",
  "",
  "**Version 0.1.0 | UI language: English | Preset schema: 16 | Parameter contract: 1**",
  "",
  intro,
  "",
  `> Native OFX v0.1 capability note: ${nativeNotice}`,
  "",
  "## Photosensitivity warning",
  "",
  safetyNotice,
  "",
  "## Interface tour",
  "",
  ...screenshots.flatMap(([src, caption]) => [`![${caption}](${src})`, "", `*${caption}*`, ""]),
  "## Quick start",
  "",
  ...workflows.flatMap(([title, body], index) => [`${index + 1}. **${title}.** ${body}`, ""]),
  "## Header and session controls",
  "",
  "- **Load video** opens a local video. BROKEN FM preserves its render dimensions; the UI does not crop or scale the source.",
  "- **Play/Pause** controls a loaded video and shared audio playhead. It is disabled until video is loaded.",
  "- **Test pattern** selects the built-in 1920 x 1080 pattern and pauses loaded video. The highlighted button always identifies the active source.",
  "- **Preset previous/current/next** steps through 56 factory presets. **Load JSON** and **Save JSON** exchange schema-16 preset files.",
  "- **OSC** opens carrier, LFO, audio-analysis, and four-slot modulation controls.",
  "- **Setup** opens audio/wavetable session assets, monitor controls, deterministic Seed, and the signal-routing diagram.",
  "- **Debug View** toggles the translucent diagnostic selector over the lower-right of the preview. It defaults to off.",
  "- **Apply to Resolve/Cancel** are shown during an OFX Companion session. Apply validates and returns the preset; Cancel makes no changes.",
  "",
  "## Reading and adjusting controls",
  "",
  "Normal dragging uses the fine slider step. Hold **Ctrl while dragging** for meaningful coarse snapping (for example 15-degree angles, whole carrier cycles, and quarter-turn depth). A gray control is inactive because another choice makes it irrelevant. Matrix-modulated values display **base -> effective** while the effective value differs.",
  "",
  "## Complete parameter reference",
  ""
];

for (const group of groupOrder) {
  markdown.push(`### ${groupTitles[group]}`, "", "| Parameter | Values | Default | What it does |", "|---|---|---:|---|");
  for (const parameter of parametersByGroup[group]) {
    markdown.push(`| **${parameter.label}** (\`${parameter.id}\`) | ${values(parameter)} | ${defaultValue(parameter)} | ${descriptions[parameter.id]} |`);
  }
  markdown.push("");
}

markdown.push(
  "## OSC, audio, and routing details",
  "",
  "The scope at the top of OSC is a visualization of the selected carrier and current LFO state. It does not add a render pass. Audio analysis exposes Level, Low, Mid, High, and Transient signals with shared Attack and Release. Monitor Audio is opt-in and its volume is session-only.",
  "",
  "The render order is fixed. Setup moves Dropout and Feedback between defined connection points rather than arbitrarily reordering all render steps. The diagram highlights the current choices. Reset Feedback clears browser history immediately.",
  "",
  "### Feedback behavior",
  "",
  "Sequential loop is useful for unstable realtime play because each wet frame feeds the next. Finite window uses only a bounded dry history of 1-8 frames, so the intended result can be made independent of host render order. Displacement is applied per history age; Feedback Phase rotates stored signal state before it is injected.",
  "",
  "### LFO timing",
  "",
  "Timeline sync is derived from absolute host time and is deterministic at any frame. Transport sync starts at a session retrigger origin. Press Retrigger LFOs to make all Transport LFOs restart together. In BPM mode, 1/4 is one cycle per beat in 4/4, 1/8 is two cycles per beat, and 1 bar is one cycle per four beats.",
  "",
  "## Debug views",
  "",
  "- **Output - Line / Raw sine:** final output before choosing line versus continuous waveform display.",
  "- **Input:** unprocessed source frame.",
  "- **Luma / Edges / Local contrast:** individual source-analysis stages.",
  "- **Modulation:** conditioned source after gain, bias, threshold, and master gain.",
  "- **Carrier - Line / Raw sine:** carrier without image modulation.",
  "- **Phase field:** wrapped phase used to construct the signal.",
  "- **Feedback state:** stored waveform/quadrature history where available.",
  "",
  "## Preset files",
  "",
  "Preset JSON stores all 82 effect parameters. It does not store video/audio files, custom wavetable samples, monitor state, playback position, Debug View, retrigger origin, or temporal buffers. Loading a preset resets feedback/phosphor history and retriggers Transport LFOs. Older schema versions 1-15 migrate forward with neutral defaults; invalid or oversized files are rejected.",
  "",
  "## Practical recipes",
  "",
  "- **Clean contour map:** PM, Sine, Line, low Frequency, moderate Phase Depth, Instability 0, Feedback 0.",
  "- **Dense cable texture:** raise Frequency and Phase Depth, use RGB phase, narrow Line Width, then add a small amount of Line Jitter.",
  "- **Directional melting:** FM, non-zero Frequency Deviation, diagonal Scan Angle, Local contrast modulation, slow Horizontal/Vertical Drift.",
  "- **Transmission failure:** add Dropout and Line Tear, then compare Modulator, Signal loop, and Output stages in Setup.",
  "- **Rhythmic animation:** route a BPM-synced Transport LFO to PWM, Scan angle, Feedback phase, or Dropout; retrigger on the desired beat.",
  "",
  "## Current native OFX limits",
  "",
  "BROKEN FM OFX 0.1.0 deliberately fails closed for features whose native behavior is not yet equivalent to the Companion preview: audio carrier/analysis, imported custom wavetable data, temporal feedback history, and phosphor persistence. Their settings remain valid preset data, but the OFX UI disables unsupported controls. Time Jitter changes internal signal time; it is not source-video time remapping.",
  "",
  "---",
  "",
  `Reference generated from \`contracts/parameters-v1.json\`: ${contract.parameters.length} parameters, contract version ${contract.version}, preset schema ${contract.preset_schema_version}.`
);

const mdText = `${markdown.join("\n")}\n`;
fs.writeFileSync(path.join(outDir, "BROKEN_FM_USER_MANUAL.md"), mdText);

const toc = groupOrder.map((group) => `<a href="#${group}">${esc(groupTitles[group])}</a>`).join("");
const parameterHtml = groupOrder.map((group) => `
  <section class="reference" id="${group}">
    <h2>${esc(groupTitles[group])}</h2>
    <div class="parameter-grid">
      ${parametersByGroup[group].map((parameter) => `<article class="parameter-card">
        <header><h3>${esc(parameter.label)}</h3><code>${esc(parameter.id)}</code></header>
        <dl><div><dt>Values</dt><dd>${esc(values(parameter))}</dd></div><div><dt>Default</dt><dd>${esc(defaultValue(parameter))}</dd></div></dl>
        <p>${esc(descriptions[parameter.id])}</p>
      </article>`).join("\n")}
    </div>
  </section>`).join("\n");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BROKEN FM User Manual 0.1.0</title>
<style>
:root{--ink:#dce9e5;--muted:#8ea09b;--accent:#78f5d2;--warning:#ffb14a;--panel:#111918;--line:#293734;--paper:#09100f}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.6 Inter,Segoe UI,Arial,sans-serif}a{color:var(--accent)}.cover{min-height:70vh;padding:9vw;display:grid;align-content:end;background:radial-gradient(circle at 80% 20%,#174238 0,transparent 38%),linear-gradient(135deg,#0c1513,#050808)}.eyebrow,dt{font:700 11px/1.2 Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}h1{font-size:clamp(54px,9vw,136px);line-height:.86;margin:.15em 0;letter-spacing:.08em}h2{font-size:32px;letter-spacing:.04em;margin:1.8em 0 .7em}h3{margin:0;font-size:17px}.cover p{max-width:780px;font-size:20px;color:#b8c9c4}.meta{font:12px Consolas,monospace;color:var(--muted);letter-spacing:.08em}.content{max-width:1380px;margin:auto;padding:56px}.notice{border-left:3px solid var(--accent);background:#10221d;padding:18px 22px;margin:30px 0;color:#bed1cc}.warning{border-color:var(--warning);background:#281b0d;color:#f5d5aa}.toc{position:sticky;top:0;z-index:5;background:#0b1211eF;border-block:1px solid var(--line);display:flex;gap:8px;overflow:auto;padding:12px 24px;backdrop-filter:blur(12px)}.toc a{white-space:nowrap;text-decoration:none;border:1px solid var(--line);padding:6px 10px;color:#b8c9c4}.shots{display:grid;grid-template-columns:1fr 1fr;gap:22px}.shot{margin:0;background:var(--panel);border:1px solid var(--line);padding:10px}.shot:first-child{grid-column:1/-1}.shot img{width:100%;display:block}.shot figcaption{padding:10px 4px 3px;color:var(--muted)}.steps{counter-reset:step;display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.step{background:var(--panel);border:1px solid var(--line);padding:20px}.step:before{counter-increment:step;content:counter(step,decimal-leading-zero);display:block;color:var(--accent);font:700 12px Consolas;margin-bottom:8px}.step h3{margin-bottom:6px}.parameter-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.parameter-card{background:var(--panel);border:1px solid var(--line);padding:18px;break-inside:avoid}.parameter-card header{display:flex;align-items:baseline;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding-bottom:10px}.parameter-card code{color:var(--accent);font-size:11px}.parameter-card dl{display:grid;grid-template-columns:2fr 1fr;margin:12px 0}.parameter-card dl div{padding-right:12px}.parameter-card dt{color:var(--muted)}.parameter-card dd{margin:3px 0;font:12px Consolas,monospace}.parameter-card p{margin:0;color:#b8c9c4}.prose{max-width:900px}.footer{margin-top:70px;border-top:1px solid var(--line);padding-top:20px;color:var(--muted)}
@media(max-width:800px){.content{padding:28px 18px}.shots,.steps,.parameter-grid{grid-template-columns:1fr}.shot:first-child{grid-column:auto}h1{font-size:52px}.cover{padding:50px 24px}.toc{position:static}}
@media print{body{background:white;color:#17201e;font-size:9.5pt}.cover{min-height:240mm;color:white;page-break-after:always;-webkit-print-color-adjust:exact;print-color-adjust:exact}.toc{display:none}.content{max-width:none;padding:12mm}.notice,.parameter-card,.step,.shot{background:#f5f8f7;border-color:#cad4d1;color:#17201e}.shots{display:block}.shot{margin:0 0 9mm;page-break-inside:avoid}.shot:first-child img{max-height:125mm;object-fit:contain}.shot img{max-height:105mm;object-fit:contain}.steps{display:block}.step{margin-bottom:4mm}.reference{page-break-before:always}.parameter-grid{display:block}.parameter-card{margin-bottom:4mm}.parameter-card p,.shot figcaption{color:#384743}h2{margin-top:0}.footer{page-break-before:always}}
</style></head><body>
<header class="cover"><div class="eyebrow">End-user documentation</div><h1>BROKEN<br>FM</h1><p>${esc(intro)}</p><div class="meta">VERSION 0.1.0 / EN / 82 PARAMETERS / 56 FACTORY PRESETS</div></header>
<nav class="toc"><a href="#safety">Safety</a><a href="#tour">Interface</a><a href="#quick">Quick start</a>${toc}<a href="#details">Details</a></nav>
<main class="content">
<section id="safety"><div class="notice warning"><strong>Photosensitivity warning.</strong> ${esc(safetyNotice)}</div></section>
<div class="notice"><strong>Native OFX v0.1 capability note.</strong> ${esc(nativeNotice)}</div>
<section id="tour"><h2>Interface tour</h2><div class="shots">${screenshots.map(([src,caption])=>`<figure class="shot"><img src="${src}" alt="${esc(caption)}"><figcaption>${esc(caption)}</figcaption></figure>`).join("")}</div></section>
<section id="quick"><h2>Quick start</h2><div class="steps">${workflows.map(([title,body])=>`<article class="step"><h3>${esc(title)}</h3><p>${esc(body)}</p></article>`).join("")}</div></section>
<section><h2>Header and control behavior</h2><div class="prose"><p><strong>Load video</strong> opens a local source. Test pattern is active and highlighted by default; selecting it pauses loaded video. Play resumes video and makes it active. The preset controls step through 56 factory presets or load/save schema-16 JSON. OSC contains carrier/LFO/matrix controls. Setup contains session assets, Seed, and signal routing. Debug View is an optional lower-right overlay.</p><p>Normal dragging is fine-grained. Hold <strong>Ctrl while dragging</strong> for meaningful coarse snapping. Gray controls are inactive in the current mode. A matrix-modulated control shows <strong>base -&gt; effective</strong> when its effective value differs.</p></div></section>
<section><h2>Signal path</h2><div class="prose"><p>Source analysis -&gt; threshold/gain -&gt; PM or scan-integrated FM -&gt; carrier rendering -&gt; color/output. Dropout can act at Modulator, Signal loop, or Output. Feedback can return into Modulation or Phase. Phosphor persistence is a display-only afterglow and never feeds the signal loop.</p></div></section>
${parameterHtml}
<section id="details" class="footer"><h2>Operational details</h2><div class="prose"><h3>Presets</h3><p>Preset JSON stores all 82 effect parameters, but no source files, imported samples, monitoring state, playback position, Debug View, retrigger origin, or temporal buffers. Loading a preset resets temporal history and retriggers Transport LFOs.</p><h3>LFO timing</h3><p>Timeline sync uses absolute host time. Transport sync uses a session retrigger origin. In 4/4, 1/4 is one cycle per beat, 1/8 is two cycles per beat, and 1 bar is one cycle per four beats.</p><h3>Current OFX limits</h3><p>${esc(nativeNotice)} Time Jitter changes internal signal time and is not video time remapping.</p><p class="meta">GENERATED FROM PARAMETERS-V1.JSON / CONTRACT ${contract.version} / PRESET SCHEMA ${contract.preset_schema_version}</p></div></section>
</main></body></html>`;

fs.writeFileSync(path.join(outDir, "index.html"), html);
console.log(`Generated HTML and Markdown manual for ${contract.parameters.length} parameters.`);
