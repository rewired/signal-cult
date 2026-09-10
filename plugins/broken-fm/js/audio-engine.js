const DEMO_SAMPLE_RATE = 48000;
const DEMO_SECONDS = 4;

function makeDemoSignal() {
  const samples = new Float32Array(DEMO_SAMPLE_RATE * DEMO_SECONDS);
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / DEMO_SAMPLE_RATE;
    const sweep = 55 + 420 * (0.5 + 0.5 * Math.sin(t * Math.PI * 0.5));
    const pulse = Math.sin(t * Math.PI * 2 * 1.5) > 0.72 ? 0.35 : 0;
    samples[i] = 0.58 * Math.sin(Math.PI * 2 * sweep * t)
      + 0.22 * Math.sin(Math.PI * 2 * 97 * t)
      + pulse * Math.sin(Math.PI * 2 * 1800 * t);
  }
  return samples;
}

function mixToMono(buffer) {
  const length = buffer.length;
  const mono = new Float32Array(length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const source = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) mono[i] += source[i] / buffer.numberOfChannels;
  }
  return mono;
}

export function encodeWave(samples, sampleRate) {
  const bytesPerSample = 2;
  const dataLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const writeText = (offset, value) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeText(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, dataLength, true);
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * bytesPerSample, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export class AudioSignalSource {
  constructor() {
    this.samples = makeDemoSignal();
    this.sampleRate = DEMO_SAMPLE_RATE;
    this.name = 'Internal demo signal';
    this.smoothedAnalysis = [0, 0, 0, 0, 0];
    this.lastAnalysisFrame = null;
  }

  async decode(file) {
    const context = new AudioContext();
    try {
      const buffer = await context.decodeAudioData(await file.arrayBuffer());
      this.samples = mixToMono(buffer);
      this.sampleRate = buffer.sampleRate;
      this.name = file.name;
      this.lastAnalysisFrame = null;
      return { samples: this.samples, sampleRate: this.sampleRate, name: this.name };
    } finally {
      await context.close();
    }
  }

  createWavetable(length = 2048) {
    const table = new Float32Array(length);
    const sourceLength = this.samples.length;
    for (let i = 0; i < length; i += 1) {
      const position = i * sourceLength / length;
      const index = Math.floor(position) % sourceLength;
      const next = (index + 1) % sourceLength;
      const mix = position - Math.floor(position);
      table[i] = this.samples[index] * (1 - mix) + this.samples[next] * mix;
    }
    return table;
  }

  analyze(frameIndex, attackMs = 25, releaseMs = 180) {
    const length = Math.min(1024, this.samples.length);
    const center = Math.floor((frameIndex / 60) * this.sampleRate) % this.samples.length;
    let lowState = 0;
    let midState = 0;
    let levelEnergy = 0;
    let lowEnergy = 0;
    let midEnergy = 0;
    let highEnergy = 0;
    let firstHalf = 0;
    let secondHalf = 0;
    const lowAlpha = 1 - Math.exp(-2 * Math.PI * 180 / this.sampleRate);
    const midAlpha = 1 - Math.exp(-2 * Math.PI * 1800 / this.sampleRate);
    for (let i = 0; i < length; i += 1) {
      const index = (center + i - (length >> 1) + this.samples.length) % this.samples.length;
      const sample = this.samples[index];
      lowState += lowAlpha * (sample - lowState);
      midState += midAlpha * (sample - midState);
      const low = lowState;
      const mid = midState - lowState;
      const high = sample - midState;
      levelEnergy += sample * sample;
      lowEnergy += low * low;
      midEnergy += mid * mid;
      highEnergy += high * high;
      if (i < length / 2) firstHalf += sample * sample;
      else secondHalf += sample * sample;
    }
    const scale = (energy) => Math.min(1, Math.sqrt(energy / length) * 2.4);
    const transient = Math.min(1, Math.max(0, Math.sqrt(secondHalf / (length / 2)) - Math.sqrt(firstHalf / (length / 2))) * 6);
    const raw = [scale(levelEnergy), scale(lowEnergy), scale(midEnergy), scale(highEnergy), transient];
    const sequential = this.lastAnalysisFrame !== null && frameIndex === this.lastAnalysisFrame + 1;
    if (!sequential) this.smoothedAnalysis = [...raw];
    else {
      const frameSeconds = 1 / 60;
      this.smoothedAnalysis = raw.map((value, index) => {
        const previous = this.smoothedAnalysis[index];
        const timeMs = value > previous ? attackMs : releaseMs;
        const coefficient = timeMs <= 0 ? 1 : 1 - Math.exp(-frameSeconds / (timeMs / 1000));
        return previous + (value - previous) * coefficient;
      });
    }
    this.lastAnalysisFrame = frameIndex;
    return [...this.smoothedAnalysis];
  }
}
