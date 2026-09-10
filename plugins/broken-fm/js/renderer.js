const SHADER_PATHS = {
  vertex: 'shaders/fullscreen.vert',
  preprocess: 'shaders/preprocess.frag',
  modulation: 'shaders/modulation.frag',
  fmSeed: 'shaders/fm-seed.frag',
  fmPrefix: 'shaders/fm-prefix.frag',
  signal: 'shaders/signal.frag',
  feedback: 'shaders/feedback.frag',
  feedbackWindow: 'shaders/feedback-window.frag',
  historyWrite: 'shaders/history-write.frag',
  persistence: 'shaders/persistence.frag',
  display: 'shaders/display.frag',
};

const TEST_PATTERN_WIDTH = 1920;
const TEST_PATTERN_HEIGHT = 1080;
const BPM_DIVISION_FACTORS = [0.125, 0.25, 0.5, 1, 2, 4, 8];
const PROGRAM_UNIFORMS = new WeakMap();

export function cacheUniformLocations(gl, program, ...sources) {
  const uniforms = new Map();
  const declarations = sources.join('\n').matchAll(/\buniform\s+\w+\s+(\w+)\s*(?:\[[^\]]+\])?\s*;/g);
  for (const declaration of declarations) {
    const name = declaration[1];
    if (!uniforms.has(name)) uniforms.set(name, gl.getUniformLocation(program, name));
  }
  PROGRAM_UNIFORMS.set(program, uniforms);
  return uniforms;
}

function hashSigned(value) {
  const raw = Math.sin(value * 127.1) * 43758.5453123;
  return (raw - Math.floor(raw)) * 2 - 1;
}

function lfoWave(shape, phase, seed) {
  const cycle = phase - Math.floor(phase);
  if (shape === 1) return 1 - 4 * Math.abs(cycle - 0.5);
  if (shape === 2) return cycle * 2 - 1;
  if (shape === 3) return cycle < 0.5 ? 1 : -1;
  const cell = Math.floor(phase);
  if (shape === 4) return hashSigned(cell + seed);
  if (shape === 5) {
    const local = cycle * cycle * (3 - 2 * cycle);
    return hashSigned(cell + seed) * (1 - local) + hashSigned(cell + 1 + seed) * local;
  }
  return Math.sin(cycle * Math.PI * 2);
}

async function loadText(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not load ${path}: HTTP ${response.status}`);
  return response.text();
}

function compileShader(gl, type, source, label) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`${label} shader compile error:\n${log}`);
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource, label) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource, `${label} vertex`);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource, `${label} fragment`);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`${label} program link error:\n${log}`);
  }
  cacheUniformLocations(gl, program, vertexSource, fragmentSource);
  return program;
}

function createTexture(gl, filter = gl.LINEAR) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

export class BrokenFmRenderer {
  constructor(canvas, onError) {
    this.canvas = canvas;
    this.onError = onError;
    this.gl = null;
    this.video = null;
    this.useVideo = false;
    this.videoWidth = 1;
    this.videoHeight = 1;
    this.targets = [];
    this.fmTargets = [];
    this.feedbackTargets = [];
    this.feedbackSourceTarget = null;
    this.finiteHistoryTargets = [];
    this.finiteHistoryWriteIndex = 0;
    this.finiteHistoryCount = 0;
    this.feedbackReadIndex = 0;
    this.feedbackInputIndex = 0;
    this.feedbackResetRequested = true;
    this.lastFeedbackFrameIndex = null;
    this.persistenceTargets = [];
    this.persistenceReadIndex = 0;
    this.persistenceResetRequested = true;
    this.lastPersistenceFrameIndex = null;
    this.params = {
      viewMode: 0,
      modSource: 0,
      lumaGain: 1,
      lumaBias: 0,
      edgeGain: 2.5,
      localContrastGain: 4,
      modThreshold: 0,
      modSoftness: 0.1,
      modulationGain: 1,
      frequency: 8,
      carrierPhase: 0,
      carrierShape: 0,
      signalRender: 0,
      pwm: 0.5,
      noiseDetail: 2,
      wavetable: 0,
      phaseDepth: 0.8,
      scanAngle: 0,
      lineWidth: 1.2,
      lineSoftness: 0.75,
      mode: 0,
      frequencyDeviation: 4,
      instability: 0,
      phaseJitter: 0.18,
      signalNoise: 0,
      frequencyDrift: 1.5,
      horizontalDrift: 0,
      verticalDrift: 0,
      driftRate: 0.22,
      timeJitter: 0,
      lineJitter: 5,
      lineJitterScale: 2,
      lineJitterSpeed: 7,
      seed: 0,
      dropout: 0,
      dropoutAngle: 0,
      lineTear: 0,
      dropoutStage: 1,
      feedbackAmount: 0,
      feedbackDecay: 0.9,
      feedbackDisplacement: 0,
      feedbackDisplacementAngle: 0,
      feedbackPhase: 0,
      feedbackInjection: 0,
      feedbackModel: 0,
      feedbackWindow: 4,
      colorMode: 0,
      rgbPhaseOffset: 0.035,
      blackLevel: 0,
      signalGamma: 1,
      brightness: 1,
      contrast: 1,
      phosphorPersistence: 0,
      audioAnalysis: [0, 0, 0, 0, 0],
      audioFrameIndex: 0,
      audioAttack: 25,
      audioRelease: 180,
      audioSource1: 0, audioDestination1: 0, audioAmount1: 0,
      audioSource2: 0, audioDestination2: 0, audioAmount2: 0,
      audioSource3: 0, audioDestination3: 0, audioAmount3: 0,
      audioSource4: 0, audioDestination4: 0, audioAmount4: 0,
      lfo1Shape: 0, lfo1RateMode: 0, lfo1Sync: 0, lfo1RateHz: 0.25, lfo1Bpm: 120,
      lfo1Division: 3, lfo1Phase: 0, lfo1Polarity: 0,
      lfo2Shape: 0, lfo2RateMode: 0, lfo2Sync: 0, lfo2RateHz: 0.1, lfo2Bpm: 120,
      lfo2Division: 1, lfo2Phase: 0.25, lfo2Polarity: 0,
      lfoTriggerTime: 0,
    };
    this.lastEffective = null;
    this.lastModulation = null;
  }

  async initialize() {
    const gl = this.canvas.getContext('webgl2', { alpha: false, antialias: false });
    if (!gl) throw new Error('WebGL2 is required but is not available in this browser.');
    this.gl = gl;

    if (!gl.getExtension('EXT_color_buffer_float')) {
      throw new Error('Integrated FM requires the WebGL2 EXT_color_buffer_float extension.');
    }

    const [vertex, preprocess, modulation, fmSeed, fmPrefix, signal, feedback, feedbackWindow, historyWrite, persistence, display] = await Promise.all([
      loadText(SHADER_PATHS.vertex), loadText(SHADER_PATHS.preprocess),
      loadText(SHADER_PATHS.modulation), loadText(SHADER_PATHS.fmSeed),
      loadText(SHADER_PATHS.fmPrefix), loadText(SHADER_PATHS.signal),
      loadText(SHADER_PATHS.feedback), loadText(SHADER_PATHS.feedbackWindow),
      loadText(SHADER_PATHS.historyWrite), loadText(SHADER_PATHS.persistence), loadText(SHADER_PATHS.display),
    ]);
    this.programs = {
      preprocess: createProgram(gl, vertex, preprocess, 'Preprocess'),
      modulation: createProgram(gl, vertex, modulation, 'Modulation'),
      fmSeed: createProgram(gl, vertex, fmSeed, 'FM seed'),
      fmPrefix: createProgram(gl, vertex, fmPrefix, 'FM prefix'),
      signal: createProgram(gl, vertex, signal, 'Signal'),
      feedback: createProgram(gl, vertex, feedback, 'Feedback'),
      feedbackWindow: createProgram(gl, vertex, feedbackWindow, 'Feedback window'),
      historyWrite: createProgram(gl, vertex, historyWrite, 'History write'),
      persistence: createProgram(gl, vertex, persistence, 'Phosphor persistence'),
      display: createProgram(gl, vertex, display, 'Display'),
    };

    this.vao = gl.createVertexArray();
    this.videoTexture = createTexture(gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    this.audioTexture = createTexture(gl, gl.NEAREST);
    this.wavetableTexture = createTexture(gl, gl.LINEAR);
    this.audioTextureSize = [1, 1];
    this.audioSampleCount = 1;
    this.audioSampleRate = 48000;
    this.wavetableLength = 1;
    this.setAudioData(new Float32Array([0]), 48000);
    this.setWavetable(new Float32Array([0]));
    this.targets = [this.createTarget(), this.createTarget()];
    this.signalTarget = this.createTarget();
    this.feedbackSourceTarget = this.createTarget({
      internalFormat: gl.RG16F, format: gl.RG, type: gl.HALF_FLOAT, filter: gl.NEAREST,
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.signalTarget.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.feedbackSourceTarget.texture, 0);
    this.signalTarget.drawBuffers = [gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1];
    this.fmTargets = [
      this.createTarget({ internalFormat: gl.RG32F, format: gl.RG, type: gl.FLOAT, filter: gl.NEAREST }),
      this.createTarget({ internalFormat: gl.RG32F, format: gl.RG, type: gl.FLOAT, filter: gl.NEAREST }),
    ];
    for (const target of this.fmTargets) this.allocateTarget(target, 1, 1);
    this.feedbackTargets = [
      this.createTarget({ internalFormat: gl.RG16F, format: gl.RG, type: gl.HALF_FLOAT, filter: gl.NEAREST }),
      this.createTarget({ internalFormat: gl.RG16F, format: gl.RG, type: gl.HALF_FLOAT, filter: gl.NEAREST }),
    ];
    this.finiteHistoryTargets = Array.from({ length: 8 }, () => (
      this.createTarget({ internalFormat: gl.RG16F, format: gl.RG, type: gl.HALF_FLOAT, filter: gl.NEAREST })
    ));
    this.finiteFeedbackTarget = this.createTarget({
      internalFormat: gl.RG16F, format: gl.RG, type: gl.HALF_FLOAT, filter: gl.NEAREST,
    });
    this.persistenceTargets = [
      this.createTarget({ internalFormat: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT }),
      this.createTarget({ internalFormat: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT }),
    ];

    this.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.onError(new Error('WebGL context lost. Reload the page to restart the signal lab.'));
    });
  }

  createTarget(options = {}) {
    const gl = this.gl;
    const texture = createTexture(gl, options.filter ?? gl.LINEAR);
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return {
      texture, framebuffer, width: 0, height: 0,
      internalFormat: options.internalFormat ?? gl.RGBA8,
      format: options.format ?? gl.RGBA,
      type: options.type ?? gl.UNSIGNED_BYTE,
    };
  }

  uploadSignalTexture(texture, samples, preferredWidth) {
    const gl = this.gl;
    const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const width = Math.min(preferredWidth, maxSize, Math.max(1, samples.length));
    const count = Math.min(samples.length, width * maxSize);
    const height = Math.max(1, Math.ceil(count / width));
    const bytes = new Uint8Array(width * height);
    for (let i = 0; i < count; i += 1) bytes[i] = Math.round((Math.max(-1, Math.min(1, samples[i])) * 0.5 + 0.5) * 255);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, bytes);
    return { size: [width, height], count };
  }

  setAudioData(samples, sampleRate) {
    if (!this.gl) return;
    const uploaded = this.uploadSignalTexture(this.audioTexture, samples, 4096);
    this.audioTextureSize = uploaded.size;
    this.audioSampleCount = uploaded.count;
    this.audioSampleRate = sampleRate;
  }

  setWavetable(samples) {
    if (!this.gl) return;
    const uploaded = this.uploadSignalTexture(this.wavetableTexture, samples, 2048);
    this.wavetableLength = uploaded.count;
  }

  setInternalWavetable(name) {
    if (!this.gl) return;
    const length = 2048;
    const samples = new Float32Array(length);
    for (let i = 0; i < length; i += 1) {
      const phase = i / length * Math.PI * 2;
      if (name === 'folded') samples[i] = Math.sin(phase + 1.15 * Math.sin(phase * 3));
      else if (name === 'formant') samples[i] = 0.55 * Math.sin(phase) + 0.3 * Math.sin(phase * 4) + 0.15 * Math.sin(phase * 9);
      else samples[i] = 0.72 * Math.sin(phase) + 0.2 * Math.sin(phase * 2) + 0.08 * Math.sin(phase * 5);
    }
    this.setWavetable(samples);
  }

  evaluateLfo(index, timeSeconds) {
    const prefix = `lfo${index}`;
    const rate = this.params[`${prefix}RateMode`] === 1
      ? this.params[`${prefix}Bpm`] / 60 * BPM_DIVISION_FACTORS[this.params[`${prefix}Division`]]
      : this.params[`${prefix}RateHz`];
    const clockTime = this.params[`${prefix}Sync`] === 1
      ? Math.max(0, timeSeconds - this.params.lfoTriggerTime)
      : timeSeconds;
    const phase = clockTime * rate + this.params[`${prefix}Phase`];
    const value = lfoWave(this.params[`${prefix}Shape`], phase, this.params.seed * 19.19 + index * 101.7);
    return this.params[`${prefix}Polarity`] === 1 ? value * 0.5 + 0.5 : value;
  }

  getModulation(timeSeconds) {
    const lfoValues = [this.evaluateLfo(1, timeSeconds), this.evaluateLfo(2, timeSeconds)];
    const values = [0, ...this.params.audioAnalysis, ...lfoValues];
    const result = {
      frequency: 0, pwm: 0, phase: 0, phaseDepth: 0, feedback: 0,
      scanAngle: 0, dropout: 0, phaseJitter: 0, frequencyDrift: 0, lineJitter: 0,
      feedbackDisplacement: 0, feedbackDisplacementAngle: 0,
      horizontalDrift: 0, verticalDrift: 0, timeJitter: 0,
      phosphorPersistence: 0,
      signalNoise: 0, lineJitterScale: 0, lineJitterSpeed: 0, feedbackPhase: 0,
      lfoValues,
    };
    const targetNames = [
      null, 'frequency', 'pwm', 'phase', 'phaseDepth', 'feedback',
      'scanAngle', 'dropout', 'phaseJitter', 'frequencyDrift', 'lineJitter',
      'feedbackDisplacement', 'feedbackDisplacementAngle',
      'horizontalDrift', 'verticalDrift', 'timeJitter',
      'phosphorPersistence',
      'signalNoise', 'lineJitterScale', 'lineJitterSpeed', 'feedbackPhase',
    ];
    const scales = {
      frequency: 12, pwm: 0.45, phase: 1, phaseDepth: 2, feedback: 0.5,
      scanAngle: 180, dropout: 1, phaseJitter: 1, frequencyDrift: 8, lineJitter: 40,
      feedbackDisplacement: 48, feedbackDisplacementAngle: 180,
      horizontalDrift: 120, verticalDrift: 120, timeJitter: 30,
      phosphorPersistence: 3000,
      signalNoise: 1, lineJitterScale: 127, lineJitterSpeed: 30, feedbackPhase: 1,
    };
    for (let slot = 1; slot <= 4; slot += 1) {
      const target = targetNames[this.params[`audioDestination${slot}`]];
      if (!target) continue;
      const source = values[this.params[`audioSource${slot}`]] ?? 0;
      result[target] += source * this.params[`audioAmount${slot}`] * scales[target];
    }
    return result;
  }

  getEffectiveParameters(timeSeconds) {
    const modulation = this.getModulation(timeSeconds);
    const effective = {
      frequency: Math.max(0.05, this.params.frequency + modulation.frequency),
      pwm: Math.max(0.05, Math.min(0.95, this.params.pwm + modulation.pwm)),
      phase: this.params.carrierPhase + modulation.phase,
      phaseDepth: Math.max(0, this.params.phaseDepth + modulation.phaseDepth),
      feedback: Math.max(0, Math.min(1, this.params.feedbackAmount + modulation.feedback)),
      scanAngle: Math.max(-180, Math.min(180, this.params.scanAngle + modulation.scanAngle)),
      dropout: Math.max(0, Math.min(1, this.params.dropout + modulation.dropout)),
      phaseJitter: Math.max(0, Math.min(1, this.params.phaseJitter + modulation.phaseJitter)),
      frequencyDrift: Math.max(0, Math.min(8, this.params.frequencyDrift + modulation.frequencyDrift)),
      lineJitter: Math.max(0, Math.min(40, this.params.lineJitter + modulation.lineJitter)),
      feedbackDisplacement: Math.max(0, Math.min(64, this.params.feedbackDisplacement + modulation.feedbackDisplacement)),
      feedbackDisplacementAngle: Math.max(-180, Math.min(180, this.params.feedbackDisplacementAngle + modulation.feedbackDisplacementAngle)),
      horizontalDrift: Math.max(0, Math.min(120, this.params.horizontalDrift + modulation.horizontalDrift)),
      verticalDrift: Math.max(0, Math.min(120, this.params.verticalDrift + modulation.verticalDrift)),
      timeJitter: Math.max(0, Math.min(30, this.params.timeJitter + modulation.timeJitter)),
      phosphorPersistence: Math.max(0, Math.min(3000, this.params.phosphorPersistence + modulation.phosphorPersistence)),
      signalNoise: Math.max(0, Math.min(1, this.params.signalNoise + modulation.signalNoise)),
      lineJitterScale: Math.max(1, Math.min(128, this.params.lineJitterScale + modulation.lineJitterScale)),
      lineJitterSpeed: Math.max(0, Math.min(30, this.params.lineJitterSpeed + modulation.lineJitterSpeed)),
      feedbackPhase: Math.max(-1, Math.min(1, this.params.feedbackPhase + modulation.feedbackPhase)),
    };
    this.lastModulation = modulation;
    this.lastEffective = effective;
    return { modulation, effective };
  }

  allocateTarget(target, width, height) {
    const gl = this.gl;
    if (target.width === width && target.height === height) return;
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, target.internalFormat, width, height, 0, target.format, target.type, null);
    target.width = width;
    target.height = height;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Framebuffer allocation failed at ${width} × ${height}.`);
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  clearTarget(target) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, target.width, target.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  resize() {
    const gl = this.gl;
    const width = this.useVideo ? this.videoWidth : TEST_PATTERN_WIDTH;
    const height = this.useVideo ? this.videoHeight : TEST_PATTERN_HEIGHT;
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    for (const target of this.targets) {
      this.allocateTarget(target, width, height);
    }
    this.allocateTarget(this.feedbackSourceTarget, width, height);
    this.allocateTarget(this.signalTarget, width, height);
    for (const target of this.feedbackTargets) this.allocateTarget(target, width, height);
    for (const target of this.finiteHistoryTargets) this.allocateTarget(target, width, height);
    this.allocateTarget(this.finiteFeedbackTarget, width, height);
    for (const target of this.persistenceTargets) this.allocateTarget(target, width, height);
    this.feedbackResetRequested = true;
    this.persistenceResetRequested = true;
  }

  prepareFmTargets(scanAngle = this.params.scanAngle, stableScanField = false) {
    const angle = scanAngle * Math.PI / 180;
    const c = Math.abs(Math.cos(angle));
    const s = Math.abs(Math.sin(angle));
    const diagonal = Math.ceil(Math.hypot(this.canvas.width, this.canvas.height)) + 2;
    const width = stableScanField ? diagonal : Math.ceil(this.canvas.width * c + this.canvas.height * s) + 2;
    const height = stableScanField ? diagonal : Math.ceil(this.canvas.width * s + this.canvas.height * c) + 2;
    const maxSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
    if (width > maxSize || height > maxSize) {
      throw new Error(`FM scan field ${width} × ${height} exceeds the GPU texture limit ${maxSize}.`);
    }
    for (const target of this.fmTargets) this.allocateTarget(target, width, height);
    return [width, height];
  }

  setVideo(video) {
    this.video = video;
    this.useVideo = true;
    this.resetFeedback();
    this.resetPersistence();
  }

  setImage(image) {
    this.video = image;
    this.videoWidth = image.naturalWidth || image.width || 1;
    this.videoHeight = image.naturalHeight || image.height || 1;
    this.useVideo = true;
    this.resetFeedback();
    this.resetPersistence();
  }

  useTestPattern() {
    this.useVideo = false;
    this.resetFeedback();
    this.resetPersistence();
  }

  resetFeedback() {
    this.feedbackResetRequested = true;
    this.lastFeedbackFrameIndex = null;
    this.feedbackInputIndex = 0;
    this.finiteHistoryWriteIndex = 0;
    this.finiteHistoryCount = 0;
  }

  resetPersistence() {
    this.persistenceResetRequested = true;
    this.persistenceReadIndex = 0;
    this.lastPersistenceFrameIndex = null;
  }

  setUniform(program, name, kind, ...values) {
    const location = PROGRAM_UNIFORMS.get(program)?.get(name) ?? null;
    if (location === null) return;
    this.gl[`uniform${kind}`](location, ...values);
  }

  bindTexture(program, name, texture, unit) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    this.setUniform(program, name, '1i', unit);
  }

  draw(program, target = null) {
    const gl = this.gl;
    gl.useProgram(program);
    gl.bindVertexArray(this.vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer ?? null);
    gl.drawBuffers(target ? (target.drawBuffers ?? [gl.COLOR_ATTACHMENT0]) : [gl.BACK]);
    gl.viewport(0, 0, target?.width ?? this.canvas.width, target?.height ?? this.canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  renderFmIntegration(resolution, frameIndex, feedbackTexture, effective, stableScanField) {
    const gl = this.gl;
    const scanResolution = this.prepareFmTargets(effective.scanAngle, stableScanField);
    const seed = this.programs.fmSeed;
    gl.useProgram(seed);
    this.bindTexture(seed, 'uModulation', this.targets[1].texture, 0);
    this.bindTexture(seed, 'uFeedbackState', feedbackTexture, 1);
    this.setUniform(seed, 'uOutputResolution', '2f', ...resolution);
    this.setUniform(seed, 'uScanResolution', '2f', ...scanResolution);
    this.setUniform(seed, 'uScanAngle', '1f', effective.scanAngle);
    this.setUniform(seed, 'uFrameIndex', '1f', frameIndex);
    this.setUniform(seed, 'uSeed', '1f', this.params.seed);
    this.setUniform(seed, 'uDropout', '1f', effective.dropout);
    this.setUniform(seed, 'uDropoutAngle', '1f', this.params.dropoutAngle);
    this.setUniform(seed, 'uFeedbackAmount', '1f', effective.feedback);
    this.setUniform(seed, 'uFeedbackPhase', '1f', effective.feedbackPhase);
    this.setUniform(seed, 'uDropoutStage', '1i', this.params.dropoutStage);
    this.setUniform(seed, 'uFeedbackInjection', '1i', this.params.feedbackInjection);
    this.draw(seed, this.fmTargets[0]);

    let sourceIndex = 0;
    let destinationIndex = 1;
    for (let offset = 1; offset < scanResolution[0]; offset *= 2) {
      const prefix = this.programs.fmPrefix;
      gl.useProgram(prefix);
      this.bindTexture(prefix, 'uPrevious', this.fmTargets[sourceIndex].texture, 0);
      this.setUniform(prefix, 'uScanResolution', '2f', ...scanResolution);
      this.setUniform(prefix, 'uOffset', '1f', offset);
      this.draw(prefix, this.fmTargets[destinationIndex]);
      [sourceIndex, destinationIndex] = [destinationIndex, sourceIndex];
    }
    return { target: this.fmTargets[sourceIndex], resolution: scanResolution };
  }

  updateFeedbackState(frameIndex, effective) {
    if (frameIndex === this.lastFeedbackFrameIndex) return;
    const gl = this.gl;
    const writeIndex = 1 - this.feedbackReadIndex;
    const feedback = this.programs.feedback;
    gl.useProgram(feedback);
    this.bindTexture(feedback, 'uCurrentSignal', this.feedbackSourceTarget.texture, 0);
    this.bindTexture(feedback, 'uPreviousState', this.feedbackTargets[this.feedbackReadIndex].texture, 1);
    this.setUniform(feedback, 'uFeedbackDecay', '1f', this.params.feedbackDecay);
    this.setUniform(feedback, 'uResolution', '2f', this.canvas.width, this.canvas.height);
    this.setUniform(feedback, 'uFeedbackDisplacement', '1f', effective.feedbackDisplacement);
    this.setUniform(feedback, 'uFeedbackDisplacementAngle', '1f', effective.feedbackDisplacementAngle);
    this.draw(feedback, this.feedbackTargets[writeIndex]);
    this.feedbackReadIndex = writeIndex;
    this.lastFeedbackFrameIndex = frameIndex;
  }

  prepareFiniteFeedback(effective) {
    const gl = this.gl;
    const program = this.programs.feedbackWindow;
    gl.useProgram(program);
    for (let tap = 0; tap < 8; tap += 1) {
      const historyIndex = (this.finiteHistoryWriteIndex - 1 - tap + 8) % 8;
      this.bindTexture(program, `uHistory${tap}`, this.finiteHistoryTargets[historyIndex].texture, tap);
    }
    this.setUniform(program, 'uWindowLength', '1i', this.params.feedbackWindow);
    this.setUniform(program, 'uAvailableFrames', '1i', this.finiteHistoryCount);
    this.setUniform(program, 'uDecay', '1f', this.params.feedbackDecay);
    this.setUniform(program, 'uResolution', '2f', this.canvas.width, this.canvas.height);
    this.setUniform(program, 'uFeedbackDisplacement', '1f', effective.feedbackDisplacement);
    this.setUniform(program, 'uFeedbackDisplacementAngle', '1f', effective.feedbackDisplacementAngle);
    this.draw(program, this.finiteFeedbackTarget);
  }

  writeFiniteHistory(frameIndex) {
    if (frameIndex === this.lastFeedbackFrameIndex) return;
    const program = this.programs.historyWrite;
    this.gl.useProgram(program);
    this.bindTexture(program, 'uCurrentSignal', this.feedbackSourceTarget.texture, 0);
    this.draw(program, this.finiteHistoryTargets[this.finiteHistoryWriteIndex]);
    this.finiteHistoryWriteIndex = (this.finiteHistoryWriteIndex + 1) % 8;
    this.finiteHistoryCount = Math.min(this.finiteHistoryCount + 1, 8);
    this.lastFeedbackFrameIndex = frameIndex;
  }

  updatePersistence(frameIndex, halfLifeMs) {
    if (this.persistenceResetRequested) {
      for (const target of this.persistenceTargets) this.clearTarget(target);
      this.persistenceReadIndex = 0;
      this.lastPersistenceFrameIndex = null;
      this.persistenceResetRequested = false;
    }
    if (frameIndex === this.lastPersistenceFrameIndex) return this.persistenceTargets[this.persistenceReadIndex];
    const frameDelta = this.lastPersistenceFrameIndex === null
      ? 1
      : Math.max(1, frameIndex - this.lastPersistenceFrameIndex);
    const writeIndex = 1 - this.persistenceReadIndex;
    const program = this.programs.persistence;
    this.gl.useProgram(program);
    this.bindTexture(program, 'uCurrentSignal', this.signalTarget.texture, 0);
    this.bindTexture(program, 'uPreviousPersistence', this.persistenceTargets[this.persistenceReadIndex].texture, 1);
    this.setUniform(program, 'uHalfLifeMs', '1f', halfLifeMs);
    this.setUniform(program, 'uFrameDelta', '1f', frameDelta);
    this.draw(program, this.persistenceTargets[writeIndex]);
    this.persistenceReadIndex = writeIndex;
    this.lastPersistenceFrameIndex = frameIndex;
    return this.persistenceTargets[this.persistenceReadIndex];
  }

  uploadVideo() {
    if (!this.useVideo || !this.video) return;
    const isVideo = this.video instanceof HTMLVideoElement;
    if ((isVideo && this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) || (!isVideo && !this.video.complete)) return;
    const gl = this.gl;
    this.videoWidth = (isVideo ? this.video.videoWidth : this.video.naturalWidth) || 1;
    this.videoHeight = (isVideo ? this.video.videoHeight : this.video.naturalHeight) || 1;
    gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  render(frameIndex = 0) {
    const gl = this.gl;
    this.uploadVideo();
    this.resize();
    const resolution = [this.canvas.width, this.canvas.height];

    const frameJump = this.lastFeedbackFrameIndex === null
      ? 0
      : frameIndex - this.lastFeedbackFrameIndex;
    if (frameJump < 0 || frameJump > 5) this.resetFeedback();
    const persistenceFrameJump = this.lastPersistenceFrameIndex === null
      ? 0
      : frameIndex - this.lastPersistenceFrameIndex;
    if (persistenceFrameJump < 0 || persistenceFrameJump > 5) this.resetPersistence();

    if (this.feedbackResetRequested) {
      for (const target of this.feedbackTargets) this.clearTarget(target);
      for (const target of this.finiteHistoryTargets) this.clearTarget(target);
      this.clearTarget(this.finiteFeedbackTarget);
      this.feedbackReadIndex = 0;
      this.feedbackInputIndex = 0;
      this.finiteHistoryWriteIndex = 0;
      this.finiteHistoryCount = 0;
      this.feedbackResetRequested = false;
    }
    if (frameIndex !== this.lastFeedbackFrameIndex) {
      this.feedbackInputIndex = this.feedbackReadIndex;
    }

    const preprocess = this.programs.preprocess;
    gl.useProgram(preprocess);
    this.bindTexture(preprocess, 'uSource', this.videoTexture, 0);
    this.setUniform(preprocess, 'uOutputResolution', '2f', ...resolution);
    this.setUniform(preprocess, 'uUseVideo', '1i', this.useVideo ? 1 : 0);
    this.draw(preprocess, this.targets[0]);

    const modulationProgram = this.programs.modulation;
    gl.useProgram(modulationProgram);
    this.bindTexture(modulationProgram, 'uPreprocessed', this.targets[0].texture, 0);
    this.setUniform(modulationProgram, 'uResolution', '2f', ...resolution);
    this.setUniform(modulationProgram, 'uModSource', '1i', this.params.modSource);
    this.setUniform(modulationProgram, 'uLumaGain', '1f', this.params.lumaGain);
    this.setUniform(modulationProgram, 'uLumaBias', '1f', this.params.lumaBias);
    this.setUniform(modulationProgram, 'uEdgeGain', '1f', this.params.edgeGain);
    this.setUniform(modulationProgram, 'uLocalContrastGain', '1f', this.params.localContrastGain);
    this.setUniform(modulationProgram, 'uThreshold', '1f', this.params.modThreshold);
    this.setUniform(modulationProgram, 'uThresholdSoftness', '1f', this.params.modSoftness);
    this.draw(modulationProgram, this.targets[1]);

    const { effective } = this.getEffectiveParameters(frameIndex / 60);
    const timeOffsetFrames = lfoWave(
      5,
      frameIndex / 60 * this.params.driftRate,
      this.params.seed * 37.31 + 911.7,
    ) * effective.timeJitter * this.params.instability;
    const signalFrameIndex = frameIndex + timeOffsetFrames;
    if (this.params.feedbackModel === 1) this.prepareFiniteFeedback(effective);
    const feedbackTexture = this.params.feedbackModel === 1
      ? this.finiteFeedbackTarget.texture
      : this.feedbackTargets[this.feedbackInputIndex].texture;
    const animatedFmScan = [1, 2, 3, 4].some((slot) => (
      this.params[`audioSource${slot}`] !== 0 && this.params[`audioDestination${slot}`] === 6
    ));

    const fm = this.params.mode === 1
      ? this.renderFmIntegration(resolution, signalFrameIndex, feedbackTexture, effective, animatedFmScan)
      : { target: this.fmTargets[0], resolution: [1, 1] };

    const signal = this.programs.signal;
    gl.useProgram(signal);
    this.bindTexture(signal, 'uPreprocessed', this.targets[0].texture, 0);
    this.bindTexture(signal, 'uModulation', this.targets[1].texture, 1);
    this.bindTexture(signal, 'uFmIntegral', fm.target.texture, 2);
    this.bindTexture(signal, 'uFeedbackState', feedbackTexture, 3);
    this.bindTexture(signal, 'uWavetable', this.wavetableTexture, 4);
    this.bindTexture(signal, 'uAudioSignal', this.audioTexture, 5);
    this.setUniform(signal, 'uResolution', '2f', ...resolution);
    this.setUniform(signal, 'uFmResolution', '2f', ...fm.resolution);
    this.setUniform(signal, 'uFrequency', '1f', effective.frequency);
    this.setUniform(signal, 'uCarrierPhase', '1f', effective.phase);
    this.setUniform(signal, 'uFrequencyDeviation', '1f', this.params.frequencyDeviation);
    this.setUniform(signal, 'uPhaseDepth', '1f', effective.phaseDepth);
    this.setUniform(signal, 'uScanAngle', '1f', effective.scanAngle);
    this.setUniform(signal, 'uModulationGain', '1f', this.params.modulationGain);
    this.setUniform(signal, 'uLineWidth', '1f', this.params.lineWidth);
    this.setUniform(signal, 'uLineSoftness', '1f', this.params.lineSoftness);
    this.setUniform(signal, 'uPwm', '1f', effective.pwm);
    this.setUniform(signal, 'uNoiseDetail', '1f', this.params.noiseDetail);
    this.setUniform(signal, 'uCarrierShape', '1i', this.params.carrierShape);
    this.setUniform(signal, 'uSignalRender', '1i', this.params.signalRender);
    this.setUniform(signal, 'uWavetableLength', '1f', this.wavetableLength);
    this.setUniform(signal, 'uAudioTextureSize', '2f', ...this.audioTextureSize);
    this.setUniform(signal, 'uAudioSampleCount', '1f', this.audioSampleCount);
    this.setUniform(signal, 'uAudioSampleRate', '1f', this.audioSampleRate);
    this.setUniform(signal, 'uViewMode', '1i', this.params.viewMode);
    this.setUniform(signal, 'uMode', '1i', this.params.mode);
    this.setUniform(signal, 'uFrameIndex', '1f', signalFrameIndex);
    this.setUniform(signal, 'uAudioFrameIndex', '1f', this.params.audioFrameIndex);
    this.setUniform(signal, 'uInstability', '1f', this.params.instability);
    this.setUniform(signal, 'uPhaseJitter', '1f', effective.phaseJitter);
    this.setUniform(signal, 'uSignalNoise', '1f', effective.signalNoise);
    this.setUniform(signal, 'uFrequencyDrift', '1f', effective.frequencyDrift);
    this.setUniform(signal, 'uHorizontalDrift', '1f', effective.horizontalDrift);
    this.setUniform(signal, 'uVerticalDrift', '1f', effective.verticalDrift);
    this.setUniform(signal, 'uDriftRate', '1f', this.params.driftRate);
    this.setUniform(signal, 'uLineJitter', '1f', effective.lineJitter);
    this.setUniform(signal, 'uLineJitterScale', '1f', effective.lineJitterScale);
    this.setUniform(signal, 'uLineJitterSpeed', '1f', effective.lineJitterSpeed);
    this.setUniform(signal, 'uSeed', '1f', this.params.seed);
    this.setUniform(signal, 'uDropout', '1f', effective.dropout);
    this.setUniform(signal, 'uDropoutAngle', '1f', this.params.dropoutAngle);
    this.setUniform(signal, 'uLineTear', '1f', this.params.lineTear);
    this.setUniform(signal, 'uDropoutStage', '1i', this.params.dropoutStage);
    this.setUniform(signal, 'uFeedbackAmount', '1f', effective.feedback);
    this.setUniform(signal, 'uFeedbackPhase', '1f', effective.feedbackPhase);
    this.setUniform(signal, 'uFeedbackInjection', '1i', this.params.feedbackInjection);
    this.setUniform(signal, 'uFeedbackModel', '1i', this.params.feedbackModel);
    this.setUniform(signal, 'uColorMode', '1i', this.params.colorMode);
    this.setUniform(signal, 'uRgbPhaseOffset', '1f', this.params.rgbPhaseOffset);
    this.setUniform(signal, 'uBlackLevel', '1f', this.params.blackLevel);
    this.setUniform(signal, 'uSignalGamma', '1f', this.params.signalGamma);
    this.setUniform(signal, 'uBrightness', '1f', this.params.brightness);
    this.setUniform(signal, 'uContrast', '1f', this.params.contrast);
    this.draw(signal, this.signalTarget);

    if (this.params.feedbackModel === 1) this.writeFiniteHistory(frameIndex);
    else this.updateFeedbackState(frameIndex, effective);

    const persistenceEnabled = effective.phosphorPersistence > 0 && this.params.viewMode <= 1;
    const persistenceTarget = persistenceEnabled
      ? this.updatePersistence(frameIndex, effective.phosphorPersistence)
      : null;
    if (!persistenceEnabled) this.resetPersistence();

    const display = this.programs.display;
    gl.useProgram(display);
    this.bindTexture(display, 'uSignal', persistenceEnabled ? persistenceTarget.texture : this.signalTarget.texture, 0);
    this.draw(display);
  }
}
