export const PRESET_FORMAT = 'broken-fm-preset';
export const PRESET_VERSION = 16;

export const PRESET_FIELDS = [
  { key: 'mode', controlId: 'signal-mode', type: 'enum', values: ['pm', 'fm'] },
  { key: 'modSource', controlId: 'mod-source', type: 'enum', values: ['luma', 'inverted-luma', 'edges', 'local-contrast', 'luma-edges'] },
  { key: 'lumaGain', controlId: 'luma-gain', type: 'number', min: 0, max: 3 },
  { key: 'lumaBias', controlId: 'luma-bias', type: 'number', min: -1, max: 1 },
  { key: 'edgeGain', controlId: 'edge-gain', type: 'number', min: 0, max: 8 },
  { key: 'localContrastGain', controlId: 'local-contrast-gain', type: 'number', min: 0, max: 8 },
  { key: 'modThreshold', controlId: 'mod-threshold', type: 'number', min: 0, max: 1 },
  { key: 'modSoftness', controlId: 'mod-softness', type: 'number', min: 0, max: 1 },
  { key: 'modulationGain', controlId: 'mod-gain', type: 'number', min: 0, max: 3 },
  { key: 'frequency', controlId: 'frequency', type: 'number', min: 0.5, max: 30 },
  { key: 'carrierPhase', controlId: 'carrier-phase', type: 'number', min: -1, max: 1 },
  { key: 'carrierShape', controlId: 'carrier-shape', type: 'enum', values: ['sine', 'triangle', 'saw', 'square', 'noise', 'wavetable', 'audio'] },
  { key: 'signalRender', controlId: 'signal-render', type: 'enum', values: ['line', 'waveform'] },
  { key: 'pwm', controlId: 'pwm', type: 'number', min: 0.05, max: 0.95 },
  { key: 'noiseDetail', controlId: 'noise-detail', type: 'number', min: 0.25, max: 8 },
  { key: 'wavetable', controlId: 'wavetable', type: 'enum', values: ['harmonic', 'folded', 'formant', 'custom'] },
  { key: 'audioAttack', controlId: 'audio-attack', type: 'number', min: 0, max: 500 },
  { key: 'audioRelease', controlId: 'audio-release', type: 'number', min: 0, max: 2000 },
  { key: 'phaseDepth', controlId: 'phase-depth', type: 'number', min: 0, max: 4 },
  { key: 'frequencyDeviation', controlId: 'frequency-deviation', type: 'number', min: -12, max: 12 },
  { key: 'scanAngle', controlId: 'scan-angle', type: 'number', min: -180, max: 180 },
  { key: 'lineWidth', controlId: 'line-width', type: 'number', min: 0.25, max: 5 },
  { key: 'lineSoftness', controlId: 'line-softness', type: 'number', min: 0, max: 3 },
  { key: 'instability', controlId: 'instability', type: 'number', min: 0, max: 1 },
  { key: 'phaseJitter', controlId: 'phase-jitter', type: 'number', min: 0, max: 1 },
  { key: 'signalNoise', controlId: 'signal-noise', type: 'number', min: 0, max: 1 },
  { key: 'frequencyDrift', controlId: 'frequency-drift', type: 'number', min: 0, max: 8 },
  { key: 'horizontalDrift', controlId: 'horizontal-drift', type: 'number', min: 0, max: 120 },
  { key: 'verticalDrift', controlId: 'vertical-drift', type: 'number', min: 0, max: 120 },
  { key: 'driftRate', controlId: 'drift-rate', type: 'number', min: 0.01, max: 5 },
  { key: 'timeJitter', controlId: 'time-jitter', type: 'number', min: 0, max: 30 },
  { key: 'lineJitter', controlId: 'line-jitter', type: 'number', min: 0, max: 40 },
  { key: 'lineJitterScale', controlId: 'line-jitter-scale', type: 'number', min: 1, max: 128 },
  { key: 'lineJitterSpeed', controlId: 'line-jitter-speed', type: 'number', min: 0, max: 30 },
  { key: 'seed', controlId: 'seed', type: 'number', min: 0, max: 9999, integer: true },
  { key: 'dropout', controlId: 'dropout', type: 'number', min: 0, max: 1 },
  { key: 'dropoutAngle', controlId: 'dropout-angle', type: 'number', min: -180, max: 180 },
  { key: 'lineTear', controlId: 'line-tear', type: 'number', min: 0, max: 120 },
  { key: 'dropoutStage', controlId: 'dropout-stage', type: 'enum', values: ['modulator', 'signal-loop', 'output'] },
  { key: 'feedbackAmount', controlId: 'feedback-amount', type: 'number', min: 0, max: 1 },
  { key: 'feedbackDecay', controlId: 'feedback-decay', type: 'number', min: 0, max: 0.99 },
  { key: 'feedbackDisplacement', controlId: 'feedback-displacement', type: 'number', min: 0, max: 64 },
  { key: 'feedbackDisplacementAngle', controlId: 'feedback-displacement-angle', type: 'number', min: -180, max: 180 },
  { key: 'feedbackPhase', controlId: 'feedback-phase', type: 'number', min: -1, max: 1 },
  { key: 'feedbackInjection', controlId: 'feedback-injection', type: 'enum', values: ['phase', 'modulation'] },
  { key: 'feedbackModel', controlId: 'feedback-model', type: 'enum', values: ['sequential', 'finite'] },
  { key: 'feedbackWindow', controlId: 'feedback-window', type: 'number', min: 1, max: 8, integer: true },
  { key: 'colorMode', controlId: 'color-mode', type: 'enum', values: ['mono', 'input-color', 'rgb-phase'] },
  { key: 'rgbPhaseOffset', controlId: 'rgb-phase-offset', type: 'number', min: 0, max: 0.5 },
  { key: 'blackLevel', controlId: 'black-level', type: 'number', min: -0.5, max: 0.5 },
  { key: 'signalGamma', controlId: 'signal-gamma', type: 'number', min: 0.25, max: 4 },
  { key: 'brightness', controlId: 'brightness', type: 'number', min: 0, max: 3 },
  { key: 'contrast', controlId: 'contrast', type: 'number', min: 0.25, max: 4 },
  { key: 'phosphorPersistence', controlId: 'phosphor-persistence', type: 'number', min: 0, max: 3000 },
  ...Array.from({ length: 2 }, (_, index) => index + 1).flatMap((lfo) => [
    { key: `lfo${lfo}Shape`, controlId: `lfo-${lfo}-shape`, type: 'enum', values: ['sine', 'triangle', 'saw', 'square', 'sample-hold', 'smooth-noise'] },
    { key: `lfo${lfo}RateMode`, controlId: `lfo-${lfo}-rate-mode`, type: 'enum', values: ['hz', 'bpm'] },
    { key: `lfo${lfo}Sync`, controlId: `lfo-${lfo}-sync`, type: 'enum', values: ['timeline', 'transport'] },
    { key: `lfo${lfo}RateHz`, controlId: `lfo-${lfo}-rate-hz`, type: 'number', min: 0.01, max: 20 },
    { key: `lfo${lfo}Bpm`, controlId: `lfo-${lfo}-bpm`, type: 'number', min: 20, max: 300 },
    { key: `lfo${lfo}Division`, controlId: `lfo-${lfo}-division`, type: 'enum', values: ['2-bars', '1-bar', '1-2', '1-4', '1-8', '1-16', '1-32'] },
    { key: `lfo${lfo}Phase`, controlId: `lfo-${lfo}-phase`, type: 'number', min: 0, max: 1 },
    { key: `lfo${lfo}Polarity`, controlId: `lfo-${lfo}-polarity`, type: 'enum', values: ['bipolar', 'unipolar'] },
  ]),
  ...Array.from({ length: 4 }, (_, index) => index + 1).flatMap((slot) => [
    { key: `audioSource${slot}`, controlId: `audio-source-${slot}`, type: 'enum', values: ['off', 'level', 'low', 'mid', 'high', 'transient', 'lfo-1', 'lfo-2'] },
    { key: `audioDestination${slot}`, controlId: `audio-destination-${slot}`, type: 'enum', values: ['off', 'frequency', 'pwm', 'phase', 'phase-depth', 'feedback', 'scan-angle', 'dropout', 'phase-jitter', 'frequency-drift', 'line-jitter', 'feedback-displacement', 'feedback-displacement-angle', 'horizontal-drift', 'vertical-drift', 'time-jitter', 'phosphor-persistence', 'signal-noise', 'line-jitter-scale', 'line-jitter-speed', 'feedback-phase'] },
    { key: `audioAmount${slot}`, controlId: `audio-amount-${slot}`, type: 'number', min: -1, max: 1 },
  ]),
];

function normalizeParameters(parameters) {
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
    throw new Error('Preset parameters must be an object.');
  }

  const normalized = {};
  for (const field of PRESET_FIELDS) {
    if (!(field.key in parameters)) throw new Error(`Missing preset parameter: ${field.key}`);
    const value = parameters[field.key];
    if (field.type === 'enum') {
      if (!field.values.includes(value)) throw new Error(`Invalid value for ${field.key}.`);
      normalized[field.key] = value;
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`Invalid number for ${field.key}.`);
    }
    const clamped = Math.min(field.max, Math.max(field.min, value));
    normalized[field.key] = field.integer ? Math.round(clamped) : clamped;
  }
  return normalized;
}

export function parsePreset(text) {
  let data;
  try { data = JSON.parse(text); } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }
  if (!data || data.format !== PRESET_FORMAT) throw new Error('This is not a BROKEN FM preset.');
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, PRESET_VERSION].includes(data.version)) {
    throw new Error(`Unsupported preset version: ${data.version}`);
  }
  let parameters = { ...data.parameters };
  if (data.version === 1) {
    parameters = { ...parameters, colorMode: 'mono', rgbPhaseOffset: 0.035, brightness: 1, contrast: 1 };
  }
  if (data.version <= 2) {
    parameters = { ...parameters, seed: 0, dropout: 0, lineTear: 0 };
  }
  if (data.version <= 3) {
    parameters = { ...parameters, dropoutStage: 'signal-loop', feedbackInjection: 'phase' };
  }
  if (data.version <= 4) {
    parameters = { ...parameters, dropoutAngle: parameters.scanAngle };
  }
  if (data.version <= 5) {
    parameters = { ...parameters, feedbackModel: 'sequential', feedbackWindow: 4 };
  }
  if (data.version <= 6) {
    parameters = { ...parameters, lumaGain: 1, lumaBias: 0, edgeGain: 2.5, localContrastGain: 4 };
  }
  if (data.version <= 7) {
    parameters = { ...parameters, carrierPhase: 0 };
  }
  if (data.version <= 8) {
    parameters = { ...parameters, blackLevel: 0, signalGamma: parameters.contrast, contrast: 1 };
  }
  if (data.version <= 9) {
    parameters = {
      ...parameters,
      carrierShape: 'sine', signalRender: 'line', pwm: 0.5, noiseDetail: 2, wavetable: 'harmonic',
      audioAttack: 25, audioRelease: 180,
      audioSource1: 'off', audioDestination1: 'off', audioAmount1: 0,
      audioSource2: 'off', audioDestination2: 'off', audioAmount2: 0,
      audioSource3: 'off', audioDestination3: 'off', audioAmount3: 0,
      audioSource4: 'off', audioDestination4: 'off', audioAmount4: 0,
    };
  }
  if (data.version <= 10) {
    parameters = {
      ...parameters,
      lfo1Shape: 'sine', lfo1RateMode: 'hz', lfo1RateHz: 0.25, lfo1Bpm: 120,
      lfo1Division: '1-4', lfo1Phase: 0, lfo1Polarity: 'bipolar',
      lfo2Shape: 'sine', lfo2RateMode: 'hz', lfo2RateHz: 0.1, lfo2Bpm: 120,
      lfo2Division: '1-bar', lfo2Phase: 0.25, lfo2Polarity: 'bipolar',
    };
  }
  if (data.version <= 11) {
    parameters = { ...parameters, feedbackDisplacement: 0, feedbackDisplacementAngle: 0 };
  }
  if (data.version <= 12) {
    parameters = { ...parameters, horizontalDrift: 0, verticalDrift: 0, driftRate: 0.22, timeJitter: 0 };
  }
  if (data.version <= 13) parameters = { ...parameters, phosphorPersistence: 0 };
  if (data.version <= 14) {
    parameters = { ...parameters, signalNoise: 0, lineJitterScale: 2, lineJitterSpeed: 7, feedbackPhase: 0 };
  }
  if (data.version <= 15) {
    parameters = { ...parameters, modThreshold: 0, modSoftness: 0.1, lfo1Sync: 'timeline', lfo2Sync: 'timeline' };
  }
  return {
    format: PRESET_FORMAT,
    version: PRESET_VERSION,
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim().slice(0, 80) : 'Untitled',
    parameters: normalizeParameters(parameters),
  };
}

export function createPreset(root, name = 'Untitled') {
  const parameters = {};
  for (const field of PRESET_FIELDS) {
    const control = root.querySelector(`#${field.controlId}`);
    parameters[field.key] = field.type === 'enum' ? control.value : Number(control.value);
  }
  return parsePreset(JSON.stringify({ format: PRESET_FORMAT, version: PRESET_VERSION, name, parameters }));
}

export function applyPreset(root, preset) {
  const normalized = normalizeParameters(preset.parameters);
  for (const field of PRESET_FIELDS) {
    const control = root.querySelector(`#${field.controlId}`);
    control.value = String(normalized[field.key]);
    control.dispatchEvent(new Event(field.type === 'enum' ? 'change' : 'input', { bubbles: true }));
  }
}

export async function loadBuiltInPresets() {
  const manifestResponse = await fetch('presets/index.json', { cache: 'no-store' });
  if (!manifestResponse.ok) throw new Error(`HTTP ${manifestResponse.status} loading presets/index.json`);
  const manifest = await manifestResponse.json();
  if (!Array.isArray(manifest) || manifest.length === 0) throw new Error('Preset manifest must be a non-empty array.');

  const ids = new Set();
  return Promise.all(manifest.map(async (entry) => {
    if (!entry || typeof entry.id !== 'string' || !/^[a-z0-9-]+$/.test(entry.id)) {
      throw new Error('Preset manifest contains an invalid id.');
    }
    if (ids.has(entry.id)) throw new Error(`Duplicate preset id: ${entry.id}`);
    ids.add(entry.id);
    if (typeof entry.file !== 'string' || !/^[a-z0-9-]+\.json$/.test(entry.file)) {
      throw new Error(`Invalid preset filename for ${entry.id}.`);
    }
    const response = await fetch(`presets/${entry.file}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status} loading presets/${entry.file}`);
    return { id: entry.id, ...parsePreset(await response.text()) };
  }));
}

export function stringifyPreset(preset) {
  return `${JSON.stringify(parsePreset(JSON.stringify(preset)), null, 2)}\n`;
}
