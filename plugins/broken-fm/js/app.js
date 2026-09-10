import { BrokenFmRenderer } from './renderer.js';
import { AudioSignalSource, encodeWave } from './audio-engine.js';
import { setLocale, t } from './i18n.js';
import { enableCtrlDragSnapping } from './controls.js';
import { initializeCompanion } from './companion-adapter.js';
import {
  PRESET_FIELDS, applyPreset, createPreset, loadBuiltInPresets, parsePreset, stringifyPreset,
} from './presets.js';

setLocale('en');

const photosensitivityWarning = document.querySelector('#photosensitivity-warning');
const photosensitivityForm = document.querySelector('#photosensitivity-form');
const photosensitivityDismiss = document.querySelector('#photosensitivity-dismiss');
const photosensitivityContinue = document.querySelector('#photosensitivity-continue');

function waitForPhotosensitivityAcknowledgement() {
  if (document.documentElement.dataset.photosensitivityAccepted === 'true') {
    photosensitivityWarning.hidden = true;
    return Promise.resolve();
  }
  const blockedSurfaces = [...document.body.children].filter((element) => (
    element !== photosensitivityWarning && element.tagName !== 'SCRIPT' && !element.classList.contains('icon-sprite')
  ));
  blockedSurfaces.forEach((element) => { element.inert = true; });
  photosensitivityContinue.focus();
  return new Promise((resolve) => {
    photosensitivityForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (photosensitivityDismiss.checked) {
        try {
          window.localStorage.setItem(window.BROKEN_FM_PHOTOSENSITIVITY_KEY, 'true');
        } catch {
          // Continue for this session even when persistent storage is unavailable.
        }
      }
      document.documentElement.dataset.photosensitivityAccepted = 'true';
      photosensitivityWarning.hidden = true;
      blockedSurfaces.forEach((element) => { element.inert = false; });
      resolve();
    }, { once: true });
  });
}

const canvas = document.querySelector('#preview');
const video = document.querySelector('#source-video');
const errorPanel = document.querySelector('#error-panel');
const status = document.querySelector('#status');
const playPause = document.querySelector('#play-pause');
const playPauseIcon = playPause.querySelector('use');
const sourceToggle = document.querySelector('#use-test');
const carrierAudio = document.querySelector('#carrier-audio');
const monitorAudio = document.querySelector('#monitor-audio');
const monitorLevel = document.querySelector('#monitor-level');
let objectUrl = null;
let audioObjectUrl = null;
let loadedVideoStatus = '';

function showError(error) {
  console.error(error);
  errorPanel.textContent = error instanceof Error ? error.message : String(error);
  errorPanel.hidden = false;
}

const renderer = new BrokenFmRenderer(canvas, showError);
const audioSource = new AudioSignalSource();
const wavetableSource = new AudioSignalSource();
let customWavetable = null;
const presetSelect = document.querySelector('#preset-select');
const presetStatus = document.querySelector('#preset-status');
const presetPrevious = document.querySelector('#preset-previous');
const presetNext = document.querySelector('#preset-next');
let currentPresetName = 'Untitled';
let applyingPreset = false;
const builtInPresets = new Map();

function setPlaybackButton(isPlaying) {
  playPauseIcon.setAttribute('href', isPlaying ? '#icon-pause' : '#icon-play');
  playPause.setAttribute('aria-label', t(isPlaying ? 'source.pause' : 'source.play'));
}

function setTestPatternActive(active) {
  sourceToggle.classList.toggle('active', active);
  sourceToggle.setAttribute('aria-pressed', String(active));
}

function visualTimeSeconds() {
  return renderer.useVideo ? video.currentTime : performance.now() / 1000;
}

function retriggerLfos() {
  renderer.params.lfoTriggerTime = visualTimeSeconds();
  renderer.resetFeedback();
  renderer.resetPersistence();
}

function syncMonitoredAudio() {
  if (!carrierAudio.duration || !Number.isFinite(carrierAudio.duration)) return;
  carrierAudio.currentTime = visualTimeSeconds() % carrierAudio.duration;
}

async function startAudioMonitor(sync = true) {
  if (!monitorAudio.checked || !carrierAudio.src) return;
  if (sync) syncMonitoredAudio();
  carrierAudio.volume = Number(monitorLevel.value);
  try { await carrierAudio.play(); } catch (error) {
    monitorAudio.checked = false;
    showError(new Error(t('audio.monitorError', { message: error.message })));
  }
}

monitorAudio.addEventListener('change', () => {
  if (monitorAudio.checked) startAudioMonitor(true);
  else carrierAudio.pause();
});
monitorLevel.addEventListener('input', () => {
  carrierAudio.volume = Number(monitorLevel.value);
  document.querySelector('#monitor-level-value').value = `${Math.round(Number(monitorLevel.value) * 100)}%`;
});

const viewModes = {
  'pm-line': 0, 'pm-raw': 1, input: 2, luma: 3, modulation: 4,
  'carrier-line': 5, 'carrier-raw': 6, phase: 7,
  feedback: 8, edges: 9, 'local-contrast': 10,
};
const modSources = { luma: 0, edges: 1, 'luma-edges': 2, 'inverted-luma': 3, 'local-contrast': 4 };
const signalModes = { pm: 0, fm: 1 };
const colorModes = { mono: 0, 'input-color': 1, 'rgb-phase': 2 };
const dropoutStages = { modulator: 0, 'signal-loop': 1, output: 2 };
const feedbackInjections = { phase: 0, modulation: 1 };
const feedbackModels = { sequential: 0, finite: 1 };
const carrierShapes = { sine: 0, triangle: 1, saw: 2, square: 3, noise: 4, wavetable: 5, audio: 6 };
const signalRenders = { line: 0, waveform: 1 };
const wavetables = { harmonic: 0, folded: 1, formant: 2, custom: 3 };
const lfoShapes = { sine: 0, triangle: 1, saw: 2, square: 3, 'sample-hold': 4, 'smooth-noise': 5 };
const lfoRateModes = { hz: 0, bpm: 1 };
const lfoSyncModes = { timeline: 0, transport: 1 };
const lfoDivisions = { '2-bars': 0, '1-bar': 1, '1-2': 2, '1-4': 3, '1-8': 4, '1-16': 5, '1-32': 6 };
const lfoPolarities = { bipolar: 0, unipolar: 1 };
const audioSources = { off: 0, level: 1, low: 2, mid: 3, high: 4, transient: 5, 'lfo-1': 6, 'lfo-2': 7 };
const audioDestinations = {
  off: 0, frequency: 1, pwm: 2, phase: 3, 'phase-depth': 4, feedback: 5,
  'scan-angle': 6, dropout: 7, 'phase-jitter': 8, 'frequency-drift': 9, 'line-jitter': 10,
  'feedback-displacement': 11, 'feedback-displacement-angle': 12,
  'horizontal-drift': 13, 'vertical-drift': 14, 'time-jitter': 15,
  'phosphor-persistence': 16,
  'signal-noise': 17, 'line-jitter-scale': 18, 'line-jitter-speed': 19, 'feedback-phase': 20,
};

const matrix = document.querySelector('#mod-matrix');
const sourceOptions = [['off', 'matrix.off'], ['lfo-1', 'matrix.lfo1'], ['lfo-2', 'matrix.lfo2'], ['level', 'matrix.level'], ['low', 'matrix.low'], ['mid', 'matrix.mid'], ['high', 'matrix.high'], ['transient', 'matrix.transient']];
const destinationOptions = [
  ['off', 'matrix.off'], ['frequency', 'matrix.frequency'], ['pwm', 'matrix.pwm'],
  ['phase', 'matrix.phase'], ['phase-depth', 'matrix.phaseDepth'], ['feedback', 'matrix.feedback'],
  ['scan-angle', 'matrix.scanAngle'], ['dropout', 'matrix.dropout'], ['phase-jitter', 'matrix.phaseJitter'],
  ['frequency-drift', 'matrix.frequencyDrift'], ['line-jitter', 'matrix.lineJitter'],
  ['feedback-displacement', 'matrix.feedbackDisplacement'], ['feedback-displacement-angle', 'matrix.feedbackDisplacementAngle'],
  ['horizontal-drift', 'matrix.horizontalDrift'], ['vertical-drift', 'matrix.verticalDrift'], ['time-jitter', 'matrix.timeJitter'],
  ['phosphor-persistence', 'matrix.phosphorPersistence'],
  ['signal-noise', 'matrix.signalNoise'], ['line-jitter-scale', 'matrix.lineJitterScale'],
  ['line-jitter-speed', 'matrix.lineJitterSpeed'], ['feedback-phase', 'matrix.feedbackPhase'],
];
for (let slot = 1; slot <= 4; slot += 1) {
  const row = document.createElement('div');
  row.className = 'matrix-row';
  row.innerHTML = `<span class="matrix-index">${slot}</span>
    <label>${t('matrix.source')}<select id="audio-source-${slot}">${sourceOptions.map(([value, key]) => `<option value="${value}">${t(key)}</option>`).join('')}</select></label>
    <label>${t('matrix.destination')}<select id="audio-destination-${slot}">${destinationOptions.map(([value, key]) => `<option value="${value}">${t(key)}</option>`).join('')}</select></label>
    <label>${t('matrix.amount')} <output id="audio-amount-${slot}-value"></output><input id="audio-amount-${slot}" type="range" min="-1" max="1" step="0.01" value="0" data-snap-step="0.1"></label>`;
  matrix.appendChild(row);
}

function bindSelect(id, target, mapping) {
  const element = document.querySelector(`#${id}`);
  const update = () => { renderer.params[target] = mapping[element.value]; };
  element.addEventListener('change', update);
  update();
}

const rangeBindings = new Map();

function bindRange(id, target, format) {
  const input = document.querySelector(`#${id}`);
  const output = document.querySelector(`#${id}-value`);
  const update = () => {
    renderer.params[target] = Number(input.value);
    output.value = format(Number(input.value));
  };
  input.addEventListener('input', update);
  update();
  rangeBindings.set(target, { input, output, format });
}

bindSelect('view-mode', 'viewMode', viewModes);
bindSelect('mod-source', 'modSource', modSources);
bindSelect('signal-mode', 'mode', signalModes);
bindSelect('color-mode', 'colorMode', colorModes);
bindSelect('dropout-stage', 'dropoutStage', dropoutStages);
bindSelect('feedback-injection', 'feedbackInjection', feedbackInjections);
bindSelect('feedback-model', 'feedbackModel', feedbackModels);
bindSelect('carrier-shape', 'carrierShape', carrierShapes);
bindSelect('signal-render', 'signalRender', signalRenders);
bindSelect('wavetable', 'wavetable', wavetables);
for (let lfo = 1; lfo <= 2; lfo += 1) {
  bindSelect(`lfo-${lfo}-shape`, `lfo${lfo}Shape`, lfoShapes);
  bindSelect(`lfo-${lfo}-rate-mode`, `lfo${lfo}RateMode`, lfoRateModes);
  bindSelect(`lfo-${lfo}-sync`, `lfo${lfo}Sync`, lfoSyncModes);
  bindSelect(`lfo-${lfo}-division`, `lfo${lfo}Division`, lfoDivisions);
  bindSelect(`lfo-${lfo}-polarity`, `lfo${lfo}Polarity`, lfoPolarities);
}
for (let slot = 1; slot <= 4; slot += 1) {
  bindSelect(`audio-source-${slot}`, `audioSource${slot}`, audioSources);
  bindSelect(`audio-destination-${slot}`, `audioDestination${slot}`, audioDestinations);
}
bindRange('luma-gain', 'lumaGain', (v) => t('unit.multiplier', { value: v.toFixed(2) }));
bindRange('luma-bias', 'lumaBias', (v) => t('unit.scalar', { value: v.toFixed(2) }));
bindRange('edge-gain', 'edgeGain', (v) => t('unit.multiplier', { value: v.toFixed(2) }));
bindRange('local-contrast-gain', 'localContrastGain', (v) => t('unit.multiplier', { value: v.toFixed(2) }));
bindRange('mod-threshold', 'modThreshold', (v) => t('unit.scalar', { value: v.toFixed(2) }));
bindRange('mod-softness', 'modSoftness', (v) => t('unit.scalar', { value: v.toFixed(2) }));
bindRange('mod-gain', 'modulationGain', (v) => t('unit.multiplier', { value: v.toFixed(2) }));
bindRange('frequency', 'frequency', (v) => t('unit.cyclesPer100Pixels', { value: v.toFixed(1) }));
bindRange('carrier-phase', 'carrierPhase', (v) => t('unit.turns', { value: v.toFixed(3) }));
bindRange('pwm', 'pwm', (v) => t('unit.scalar', { value: v.toFixed(3) }));
bindRange('noise-detail', 'noiseDetail', (v) => t('unit.scalar', { value: v.toFixed(2) }));
bindRange('audio-attack', 'audioAttack', (v) => `${v.toFixed(0)} ms`);
bindRange('audio-release', 'audioRelease', (v) => `${v.toFixed(0)} ms`);
for (let lfo = 1; lfo <= 2; lfo += 1) {
  bindRange(`lfo-${lfo}-rate-hz`, `lfo${lfo}RateHz`, (v) => `${v.toFixed(2)} Hz`);
  bindRange(`lfo-${lfo}-bpm`, `lfo${lfo}Bpm`, (v) => `${v.toFixed(0)} BPM`);
  bindRange(`lfo-${lfo}-phase`, `lfo${lfo}Phase`, (v) => t('unit.turns', { value: v.toFixed(3) }));
}
bindRange('phase-depth', 'phaseDepth', (v) => t('unit.turns', { value: v.toFixed(2) }));
bindRange('frequency-deviation', 'frequencyDeviation', (v) => t('unit.cyclesPer100Pixels', { value: v.toFixed(1) }));
bindRange('scan-angle', 'scanAngle', (v) => t('unit.degrees', { value: v.toFixed(0) }));
bindRange('line-width', 'lineWidth', (v) => t('unit.pixels', { value: v.toFixed(2) }));
bindRange('line-softness', 'lineSoftness', (v) => t('unit.pixels', { value: v.toFixed(2) }));
bindRange('instability', 'instability', (v) => t('unit.multiplier', { value: v.toFixed(2) }));
bindRange('phase-jitter', 'phaseJitter', (v) => t('unit.turns', { value: v.toFixed(2) }));
bindRange('signal-noise', 'signalNoise', (v) => t('unit.scalar', { value: v.toFixed(2) }));
bindRange('frequency-drift', 'frequencyDrift', (v) => t('unit.cyclesPer100Pixels', { value: v.toFixed(1) }));
bindRange('horizontal-drift', 'horizontalDrift', (v) => t('unit.pixels', { value: v.toFixed(2) }));
bindRange('vertical-drift', 'verticalDrift', (v) => t('unit.pixels', { value: v.toFixed(2) }));
bindRange('drift-rate', 'driftRate', (v) => `${v.toFixed(2)} Hz`);
bindRange('time-jitter', 'timeJitter', (v) => t('unit.frames', { value: v.toFixed(1) }));
bindRange('line-jitter', 'lineJitter', (v) => t('unit.pixels', { value: v.toFixed(2) }));
bindRange('line-jitter-scale', 'lineJitterScale', (v) => t('unit.pixels', { value: v.toFixed(0) }));
bindRange('line-jitter-speed', 'lineJitterSpeed', (v) => `${v.toFixed(1)} Hz`);
bindRange('seed', 'seed', (v) => t('unit.integer', { value: v.toFixed(0) }));
bindRange('dropout', 'dropout', (v) => t('unit.scalar', { value: v.toFixed(2) }));
bindRange('dropout-angle', 'dropoutAngle', (v) => t('unit.degrees', { value: v.toFixed(0) }));
bindRange('line-tear', 'lineTear', (v) => t('unit.pixels', { value: v.toFixed(1) }));
bindRange('feedback-amount', 'feedbackAmount', (v) => t('unit.scalar', { value: v.toFixed(2) }));
bindRange('feedback-decay', 'feedbackDecay', (v) => t('unit.scalar', { value: v.toFixed(2) }));
bindRange('feedback-displacement', 'feedbackDisplacement', (v) => `${v.toFixed(2)} px/frame`);
bindRange('feedback-displacement-angle', 'feedbackDisplacementAngle', (v) => t('unit.degrees', { value: v.toFixed(0) }));
bindRange('feedback-phase', 'feedbackPhase', (v) => t('unit.turns', { value: v.toFixed(3) }));
bindRange('feedback-window', 'feedbackWindow', (v) => t('unit.frames', { value: v.toFixed(0) }));
bindRange('rgb-phase-offset', 'rgbPhaseOffset', (v) => t('unit.turns', { value: v.toFixed(3) }));
bindRange('black-level', 'blackLevel', (v) => t('unit.scalar', { value: v.toFixed(3) }));
bindRange('signal-gamma', 'signalGamma', (v) => t('unit.scalar', { value: v.toFixed(2) }));
bindRange('brightness', 'brightness', (v) => t('unit.multiplier', { value: v.toFixed(2) }));
bindRange('contrast', 'contrast', (v) => t('unit.multiplier', { value: v.toFixed(2) }));
bindRange('phosphor-persistence', 'phosphorPersistence', (v) => `${v.toFixed(0)} ms`);
for (let slot = 1; slot <= 4; slot += 1) {
  bindRange(`audio-amount-${slot}`, `audioAmount${slot}`, (v) => t('unit.scalar', { value: v.toFixed(2) }));
}
document.querySelectorAll('input[type="range"][data-snap-step]').forEach(enableCtrlDragSnapping);

const carrierShape = document.querySelector('#carrier-shape');
const pwmControl = document.querySelector('#pwm-control');
const noiseDetailControl = document.querySelector('#noise-detail-control');
const wavetableControl = document.querySelector('#wavetable-control');
function updateCarrierControls() {
  const periodic = ['sine', 'triangle', 'saw', 'square'].includes(carrierShape.value);
  pwmControl.classList.toggle('inactive', !periodic);
  pwmControl.querySelector('input').disabled = !periodic;
  noiseDetailControl.classList.toggle('inactive', carrierShape.value !== 'noise');
  noiseDetailControl.querySelector('input').disabled = carrierShape.value !== 'noise';
  wavetableControl.classList.toggle('inactive', carrierShape.value !== 'wavetable');
  wavetableControl.querySelector('select').disabled = carrierShape.value !== 'wavetable';
}
carrierShape.addEventListener('change', updateCarrierControls);
updateCarrierControls();

function updateLfoRateControls(lfo) {
  const card = document.querySelector(`.lfo-card[data-lfo="${lfo}"]`);
  const isBpm = document.querySelector(`#lfo-${lfo}-rate-mode`).value === 'bpm';
  card.querySelectorAll('.lfo-hz-control').forEach((element) => element.classList.toggle('inactive', isBpm));
  card.querySelectorAll('.lfo-bpm-control').forEach((element) => element.classList.toggle('inactive', !isBpm));
}
for (let lfo = 1; lfo <= 2; lfo += 1) {
  document.querySelector(`#lfo-${lfo}-rate-mode`).addEventListener('change', () => updateLfoRateControls(lfo));
  updateLfoRateControls(lfo);
}

document.querySelector('#wavetable').addEventListener('change', (event) => {
  if (event.target.value !== 'custom') renderer.setInternalWavetable(event.target.value);
});

const oscDialog = document.querySelector('#osc-dialog');
document.querySelector('#open-osc').addEventListener('click', () => oscDialog.showModal());
document.querySelector('#close-osc').addEventListener('click', () => oscDialog.close());
document.querySelector('#retrigger-lfos').addEventListener('click', retriggerLfos);
oscDialog.addEventListener('click', (event) => { if (event.target === oscDialog) oscDialog.close(); });

const effectiveTargets = {
  frequency: 'frequency', pwm: 'pwm', carrierPhase: 'phase', phaseDepth: 'phaseDepth',
  feedbackAmount: 'feedback', scanAngle: 'scanAngle', dropout: 'dropout',
  phaseJitter: 'phaseJitter', frequencyDrift: 'frequencyDrift', lineJitter: 'lineJitter',
  feedbackDisplacement: 'feedbackDisplacement', feedbackDisplacementAngle: 'feedbackDisplacementAngle',
  horizontalDrift: 'horizontalDrift', verticalDrift: 'verticalDrift', timeJitter: 'timeJitter',
  phosphorPersistence: 'phosphorPersistence', signalNoise: 'signalNoise',
  lineJitterScale: 'lineJitterScale', lineJitterSpeed: 'lineJitterSpeed', feedbackPhase: 'feedbackPhase',
};

function updateEffectiveValueDisplays() {
  if (!renderer.lastEffective) return;
  for (const [target, effectiveKey] of Object.entries(effectiveTargets)) {
    const binding = rangeBindings.get(target);
    if (!binding) continue;
    const base = Number(binding.input.value);
    const effective = renderer.lastEffective[effectiveKey];
    const modulated = Math.abs(effective - base) > 0.0005;
    binding.output.value = modulated
      ? `${binding.format(base)} → ${binding.format(effective)}`
      : binding.format(base);
    binding.output.classList.toggle('modulated-value', modulated);
  }
}

const oscPreview = document.querySelector('#osc-preview');
const oscPreviewContext = oscPreview.getContext('2d');
function previewHash(value) {
  const x = Math.sin(value * 127.1 + renderer.params.seed * 17.17) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function previewWaveSample(shape, cycles, sampleOffset, frameIndex, pwm, noiseDetail) {
  const cycle = ((cycles % 1) + 1) % 1;
  const warped = cycle < pwm
    ? 0.5 * cycle / pwm
    : 0.5 + 0.5 * (cycle - pwm) / (1 - pwm);
  if (shape === 'triangle') return 1 - 4 * Math.abs(warped - 0.5);
  if (shape === 'saw') return warped * 2 - 1;
  if (shape === 'square') return cycle < pwm ? 1 : -1;
  if (shape === 'noise') {
    const position = cycles * noiseDetail;
    const cell = Math.floor(position);
    const local = position - cell;
    const smooth = local * local * (3 - 2 * local);
    return previewHash(cell) * (1 - smooth) + previewHash(cell + 1) * smooth;
  }
  if (shape === 'wavetable') {
    const tableName = document.querySelector('#wavetable').value;
    const table = tableName === 'custom' ? customWavetable : null;
    if (table?.length) {
      const position = cycle * table.length;
      const index = Math.floor(position) % table.length;
      const next = (index + 1) % table.length;
      const mix = position - Math.floor(position);
      return table[index] * (1 - mix) + table[next] * mix;
    }
    const phase = cycle * Math.PI * 2;
    if (tableName === 'folded') return Math.sin(phase + 1.15 * Math.sin(phase * 3));
    if (tableName === 'formant') return 0.55 * Math.sin(phase) + 0.3 * Math.sin(phase * 4) + 0.15 * Math.sin(phase * 9);
    return 0.72 * Math.sin(phase) + 0.2 * Math.sin(phase * 2) + 0.08 * Math.sin(phase * 5);
  }
  if (shape === 'audio') {
    const center = Math.floor(frameIndex / 60 * audioSource.sampleRate);
    const index = ((center + sampleOffset) % audioSource.samples.length + audioSource.samples.length) % audioSource.samples.length;
    return audioSource.samples[index];
  }
  return Math.sin(warped * Math.PI * 2);
}

function drawOscPreview(frameIndex) {
  if (!oscDialog.open) return;
  const context = oscPreviewContext;
  const { width, height } = oscPreview;
  context.clearRect(0, 0, width, height);
  context.strokeStyle = '#1b2927';
  context.lineWidth = 1;
  for (let x = 0; x <= width; x += width / 8) {
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
  }
  for (let y = 0; y <= height; y += height / 4) {
    context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
  }
  const shape = carrierShape.value;
  const modulation = renderer.getModulation(frameIndex / 60);
  const pwm = Math.max(0.05, Math.min(0.95, renderer.params.pwm + modulation.pwm));
  const phaseOffset = renderer.params.carrierPhase + modulation.phase;
  context.strokeStyle = '#8dffd8';
  context.lineWidth = 1.5;
  context.beginPath();
  for (let x = 0; x < width; x += 1) {
    const cycles = x / width * 4 + phaseOffset;
    const value = previewWaveSample(shape, cycles, x - width / 2, frameIndex, pwm, renderer.params.noiseDetail);
    const y = height * 0.5 - Math.max(-1, Math.min(1, value)) * height * 0.4;
    if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.stroke();
  const sourceName = shape === 'audio' ? audioSource.name : shape;
  document.querySelector('#osc-preview-caption').textContent = `${sourceName} · LFO ${modulation.lfoValues[0].toFixed(2)} / ${modulation.lfoValues[1].toFixed(2)} · PWM ${pwm.toFixed(3)} · ${document.querySelector('#signal-render').value}`;
  modulation.lfoValues.forEach((value, index) => {
    document.querySelector(`#lfo-${index + 1}-meter`).style.marginLeft = `${(value * 0.5 + 0.5) * 100}%`;
  });
}

const signalMode = document.querySelector('#signal-mode');
const phaseDepth = document.querySelector('#phase-depth');
const frequencyDeviation = document.querySelector('#frequency-deviation');
const rgbPhaseOffset = document.querySelector('#rgb-phase-offset');
function updateModeControls() {
  const isFm = signalMode.value === 'fm';
  phaseDepth.disabled = isFm;
  frequencyDeviation.disabled = !isFm;
  phaseDepth.closest('label').classList.toggle('inactive', isFm);
  frequencyDeviation.closest('label').classList.toggle('inactive', !isFm);
}
signalMode.addEventListener('change', updateModeControls);
updateModeControls();

const colorMode = document.querySelector('#color-mode');
function updateColorControls() {
  const isRgbPhase = colorMode.value === 'rgb-phase';
  rgbPhaseOffset.disabled = !isRgbPhase;
  rgbPhaseOffset.closest('label').classList.toggle('inactive', !isRgbPhase);
}
colorMode.addEventListener('change', updateColorControls);
updateColorControls();

const routingDialog = document.querySelector('#routing-dialog');
const dropoutStage = document.querySelector('#dropout-stage');
const feedbackInjection = document.querySelector('#feedback-injection');
const feedbackModel = document.querySelector('#feedback-model');
const feedbackWindow = document.querySelector('#feedback-window');
const feedbackDisplacement = document.querySelector('#feedback-displacement');
const feedbackDisplacementAngle = document.querySelector('#feedback-displacement-angle');
const feedbackPhase = document.querySelector('#feedback-phase');
function updateRoutingDiagram() {
  routingDialog.querySelectorAll('[data-dropout-point]').forEach((badge) => {
    badge.classList.toggle('active', badge.dataset.dropoutPoint === dropoutStage.value);
  });
  routingDialog.querySelectorAll('[data-feedback-badge]').forEach((badge) => {
    badge.classList.toggle('active', badge.dataset.feedbackBadge === feedbackInjection.value);
  });
  const stageLabel = dropoutStage.selectedOptions[0].textContent;
  const injectionLabel = feedbackInjection.selectedOptions[0].textContent;
  const modelLabel = feedbackModel.selectedOptions[0].textContent;
  const isFinite = feedbackModel.value === 'finite';
  feedbackWindow.disabled = !isFinite;
  document.querySelector('#feedback-window-control').classList.toggle('inactive', !isFinite);
  document.querySelector('#feedback-model-note').textContent = t(isFinite ? 'feedback.finitePreview' : 'feedback.previewOnly');
  const displacement = Number(feedbackDisplacement.value);
  const historyKey = displacement > 0
    ? (isFinite ? 'routing.finiteHistoryDisplaced' : 'routing.previousStateDisplaced')
    : (isFinite ? 'routing.finiteHistory' : 'routing.previousState');
  document.querySelector('#routing-history-label').textContent = t(historyKey, {
    count: feedbackWindow.value,
    pixels: displacement.toFixed(2),
    angle: Number(feedbackDisplacementAngle.value).toFixed(0),
  });
  document.querySelector('#routing-feedback-target').textContent = Math.abs(Number(feedbackPhase.value)) > 0.0005
    ? t('routing.feedbackTargetPhase', { target: injectionLabel, phase: Number(feedbackPhase.value).toFixed(3) })
    : injectionLabel;
  document.querySelector('#routing-summary').textContent = t('routing.current', {
    model: modelLabel,
    stage: stageLabel,
    injection: injectionLabel,
  });
}
dropoutStage.addEventListener('change', updateRoutingDiagram);
feedbackInjection.addEventListener('change', updateRoutingDiagram);
feedbackModel.addEventListener('change', () => {
  renderer.resetFeedback();
  updateRoutingDiagram();
});
feedbackWindow.addEventListener('input', () => {
  renderer.resetFeedback();
  updateRoutingDiagram();
});
feedbackDisplacement.addEventListener('input', updateRoutingDiagram);
feedbackDisplacementAngle.addEventListener('input', updateRoutingDiagram);
feedbackPhase.addEventListener('input', updateRoutingDiagram);
document.querySelector('#open-routing').addEventListener('click', () => {
  updateRoutingDiagram();
  routingDialog.showModal();
});
document.querySelector('#close-routing').addEventListener('click', () => routingDialog.close());
routingDialog.addEventListener('click', (event) => {
  if (event.target === routingDialog) routingDialog.close();
});
updateRoutingDiagram();

function markPresetCustom() {
  if (applyingPreset) return;
  presetSelect.value = 'custom';
  currentPresetName = 'Untitled';
  presetStatus.textContent = t('preset.unsaved');
}

for (const field of PRESET_FIELDS) {
  const control = document.querySelector(`#${field.controlId}`);
  control.addEventListener(field.type === 'enum' ? 'change' : 'input', markPresetCustom);
}

function applyAndResetPreset(preset, statusKey) {
  applyingPreset = true;
  try {
    applyPreset(document, preset);
    currentPresetName = preset.name;
    presetStatus.textContent = t(statusKey, { name: preset.name });
    renderer.resetFeedback();
    renderer.resetPersistence();
    retriggerLfos();
  } finally {
    applyingPreset = false;
  }
}

presetSelect.addEventListener('change', () => {
  if (presetSelect.value === 'custom') return;
  const preset = builtInPresets.get(presetSelect.value);
  if (preset) applyAndResetPreset(preset, 'preset.applied');
});

function stepPreset(direction) {
  const presetIds = [...builtInPresets.keys()];
  if (!presetIds.length) return;
  const currentIndex = presetIds.indexOf(presetSelect.value);
  const nextIndex = currentIndex < 0
    ? (direction < 0 ? presetIds.length - 1 : 0)
    : (currentIndex + direction + presetIds.length) % presetIds.length;
  const presetId = presetIds[nextIndex];
  presetSelect.value = presetId;
  applyAndResetPreset(builtInPresets.get(presetId), 'preset.applied');
}

presetPrevious.addEventListener('click', () => stepPreset(-1));
presetNext.addEventListener('click', () => stepPreset(1));

loadBuiltInPresets()
  .then((presets) => {
    for (const preset of presets) {
      builtInPresets.set(preset.id, preset);
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.name;
      presetSelect.appendChild(option);
    }
    presetSelect.disabled = false;
    presetPrevious.disabled = false;
    presetNext.disabled = false;
  })
  .catch((error) => showError(new Error(t('preset.libraryError', { message: error.message }))));

document.querySelector('#preset-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 64 * 1024) throw new Error(t('preset.fileTooLarge'));
    const preset = parsePreset(await file.text());
    presetSelect.value = 'custom';
    applyAndResetPreset(preset, 'preset.loaded');
  } catch (error) {
    showError(new Error(t('preset.loadError', { message: error.message })));
  } finally {
    event.target.value = '';
  }
});

document.querySelector('#save-preset').addEventListener('click', () => {
  const preset = createPreset(document, currentPresetName);
  const blob = new Blob([stringifyPreset(preset)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = preset.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'broken-fm-preset';
  link.href = url;
  link.download = `${safeName}.json`;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  presetStatus.textContent = t('preset.saved', { name: preset.name });
});

document.querySelector('#reset-feedback').addEventListener('click', () => {
  renderer.resetFeedback();
});

document.querySelector('#audio-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const decoded = await audioSource.decode(file);
    renderer.setAudioData(decoded.samples, decoded.sampleRate);
    if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
    audioObjectUrl = URL.createObjectURL(file);
    carrierAudio.src = audioObjectUrl;
    carrierAudio.load();
    monitorAudio.disabled = false;
    document.querySelector('#audio-status').textContent = decoded.name;
    if (monitorAudio.checked) await startAudioMonitor(true);
  } catch (error) {
    showError(new Error(`Audio could not be decoded: ${error.message}`));
  } finally {
    event.target.value = '';
  }
});

document.querySelector('#wavetable-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await wavetableSource.decode(file);
    customWavetable = wavetableSource.createWavetable();
    renderer.setWavetable(customWavetable);
    const select = document.querySelector('#wavetable');
    select.value = 'custom';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  } catch (error) {
    showError(new Error(`Wavetable could not be decoded: ${error.message}`));
  } finally {
    event.target.value = '';
  }
});

document.querySelector('#video-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  video.src = objectUrl;
  video.load();
  try {
    await video.play();
    renderer.setVideo(video);
    retriggerLfos();
    playPause.disabled = false;
    setPlaybackButton(true);
    loadedVideoStatus = `${file.name.toUpperCase()} · ${video.videoWidth} × ${video.videoHeight}`;
    status.textContent = loadedVideoStatus;
    setTestPatternActive(false);
    if (monitorAudio.checked) await startAudioMonitor(true);
  } catch (error) {
    showError(new Error(t('error.videoStart', { message: error.message })));
  }
});

playPause.addEventListener('click', async () => {
  if (video.paused) {
    await video.play();
    renderer.setVideo(video);
    retriggerLfos();
    status.textContent = loadedVideoStatus;
    setTestPatternActive(false);
    setPlaybackButton(true);
    if (monitorAudio.checked) await startAudioMonitor(true);
  } else {
    video.pause();
    carrierAudio.pause();
    setPlaybackButton(false);
  }
});

sourceToggle.addEventListener('click', () => {
  if (!video.paused) video.pause();
  setPlaybackButton(false);
  renderer.useTestPattern();
  retriggerLfos();
  status.textContent = t('status.testPattern');
  setTestPatternActive(true);
  if (monitorAudio.checked) startAudioMonitor(true);
});

const debugOverlay = document.querySelector('#debug-overlay');
const toggleDebug = document.querySelector('#toggle-debug');
toggleDebug.addEventListener('click', () => {
  const visible = debugOverlay.hidden;
  debugOverlay.hidden = !visible;
  toggleDebug.classList.toggle('active', visible);
  toggleDebug.setAttribute('aria-pressed', String(visible));
  toggleDebug.setAttribute('aria-label', t(visible ? 'debug.hide' : 'debug.show'));
});

window.addEventListener('beforeunload', () => {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
});

let lastFrame = performance.now();
let accumulatedMs = 0;
let accumulatedFrames = 0;
let analysisFrame = -1;
const fpsLabel = document.querySelector('#fps');
const frameTimeLabel = document.querySelector('#frame-time');

function frame(now) {
  const frameIndex = renderer.useVideo
    ? Math.round(video.currentTime * 60)
    : Math.floor(now * 0.06);
  const audioFrameIndex = monitorAudio.checked && carrierAudio.src
    ? Math.round(carrierAudio.currentTime * 60)
    : frameIndex;
  renderer.params.audioFrameIndex = audioFrameIndex;
  if (audioFrameIndex !== analysisFrame) {
    analysisFrame = audioFrameIndex;
    renderer.params.audioAnalysis = audioSource.analyze(audioFrameIndex, renderer.params.audioAttack, renderer.params.audioRelease);
    const meterIds = ['audio-level', 'audio-low', 'audio-mid', 'audio-high', 'audio-transient'];
    meterIds.forEach((id, index) => { document.querySelector(`#${id}`).value = renderer.params.audioAnalysis[index].toFixed(2); });
  }
  drawOscPreview(frameIndex);
  try { renderer.render(frameIndex); } catch (error) { showError(error); return; }
  updateEffectiveValueDisplays();
  const delta = now - lastFrame;
  lastFrame = now;
  accumulatedMs += delta;
  accumulatedFrames += 1;
  if (accumulatedMs >= 500) {
    const average = accumulatedMs / accumulatedFrames;
    fpsLabel.textContent = t('unit.fps', { value: (1000 / average).toFixed(0) });
    frameTimeLabel.textContent = t('unit.frameTime', { value: average.toFixed(1) });
    accumulatedMs = 0;
    accumulatedFrames = 0;
  }
  requestAnimationFrame(frame);
}

async function startApplication() {
  await renderer.initialize();
  renderer.setAudioData(audioSource.samples, audioSource.sampleRate);
  renderer.setInternalWavetable('harmonic');
  audioObjectUrl = URL.createObjectURL(encodeWave(audioSource.samples, audioSource.sampleRate));
  carrierAudio.src = audioObjectUrl;
  carrierAudio.load();
  monitorAudio.disabled = false;
  retriggerLfos();
  lastFrame = performance.now();
  requestAnimationFrame(frame);

  initializeCompanion({
    applyPresetText(text) {
      applyAndResetPreset(parsePreset(text), 'preset.loaded');
    },
    currentPresetText() {
      return stringifyPreset(createPreset(document, currentPresetName));
    },
    applyPreview(image) {
      renderer.setImage(image);
      playPause.disabled = true;
      setPlaybackButton(false);
      setTestPatternActive(false);
      status.textContent = `RESOLVE FRAME · ${image.naturalWidth} × ${image.naturalHeight}`;
    },
  }).catch(showError);
}

waitForPhotosensitivityAcknowledgement().then(startApplication).catch(showError);
