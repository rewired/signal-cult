#version 300 es
precision highp float;

in vec2 vUv;
layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec2 feedbackSourceOut;

uniform sampler2D uPreprocessed;
uniform sampler2D uModulation;
uniform sampler2D uFmIntegral;
uniform sampler2D uFeedbackState;
uniform sampler2D uWavetable;
uniform sampler2D uAudioSignal;
uniform vec2 uResolution;
uniform vec2 uFmResolution;
uniform float uFrequency;
uniform float uCarrierPhase;
uniform float uFrequencyDeviation;
uniform float uPhaseDepth;
uniform float uScanAngle;
uniform float uModulationGain;
uniform float uLineWidth;
uniform float uLineSoftness;
uniform float uPwm;
uniform float uNoiseDetail;
uniform float uWavetableLength;
uniform vec2 uAudioTextureSize;
uniform float uAudioSampleCount;
uniform float uAudioSampleRate;
uniform float uFrameIndex;
uniform float uAudioFrameIndex;
uniform float uInstability;
uniform float uPhaseJitter;
uniform float uSignalNoise;
uniform float uFrequencyDrift;
uniform float uHorizontalDrift;
uniform float uVerticalDrift;
uniform float uDriftRate;
uniform float uLineJitter;
uniform float uLineJitterScale;
uniform float uLineJitterSpeed;
uniform float uSeed;
uniform float uDropout;
uniform float uDropoutAngle;
uniform float uLineTear;
uniform float uFeedbackAmount;
uniform float uFeedbackPhase;
uniform float uRgbPhaseOffset;
uniform float uBlackLevel;
uniform float uSignalGamma;
uniform float uBrightness;
uniform float uContrast;
uniform int uViewMode;
uniform int uMode;
uniform int uColorMode;
uniform int uDropoutStage;
uniform int uFeedbackInjection;
uniform int uFeedbackModel;
uniform int uCarrierShape;
uniform int uSignalRender;

const float TAU = 6.283185307179586;
const float PREVIEW_FRAME_RATE = 60.0;
const float DROPOUT_BAND_PX = 12.0;
const float DROPOUT_RATE_HZ = 5.0;
const float TEAR_BAND_PX = 28.0;
const float TEAR_RATE_HZ = 3.0;

float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 p) {
    vec2 cell = floor(p);
    vec2 local = fract(p);
    vec2 curve = local * local * (3.0 - 2.0 * local);
    float a = hash21(cell);
    float b = hash21(cell + vec2(1.0, 0.0));
    float c = hash21(cell + vec2(0.0, 1.0));
    float d = hash21(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, curve.x), mix(c, d, curve.x), curve.y);
}

float signedNoise(vec2 p) {
    return valueNoise(p) * 2.0 - 1.0;
}

float flatSignalSample(sampler2D signalTexture, float sampleIndex, vec2 textureSize, float sampleCount) {
    float wrapped = mod(mod(sampleIndex, sampleCount) + sampleCount, sampleCount);
    float first = floor(wrapped);
    float second = mod(first + 1.0, sampleCount);
    ivec2 firstCoord = ivec2(mod(first, textureSize.x), floor(first / textureSize.x));
    ivec2 secondCoord = ivec2(mod(second, textureSize.x), floor(second / textureSize.x));
    float a = texelFetch(signalTexture, firstCoord, 0).r * 2.0 - 1.0;
    float b = texelFetch(signalTexture, secondCoord, 0).r * 2.0 - 1.0;
    return mix(a, b, fract(wrapped));
}

float pwmPhase(float cycle) {
    float width = clamp(uPwm, 0.05, 0.95);
    return cycle < width
        ? 0.5 * cycle / width
        : 0.5 + 0.5 * (cycle - width) / (1.0 - width);
}

float polyBlep(float cycle, float width) {
    if (cycle < width) {
        float t = cycle / width;
        return t + t - t * t - 1.0;
    }
    if (cycle > 1.0 - width) {
        float t = (cycle - 1.0) / width;
        return t * t + t + t + 1.0;
    }
    return 0.0;
}

float carrierWave(float phase, float scanNormalPositionPx) {
    float cycles = phase / TAU;
    float cycle = fract(cycles);
    float warped = pwmPhase(cycle);
    if (uCarrierShape == 1) return 1.0 - 4.0 * abs(warped - 0.5);
    float sampleWidth = clamp(fwidth(cycles) * 0.5 / min(uPwm, 1.0 - uPwm), 1e-5, 0.25);
    if (uCarrierShape == 2) return warped * 2.0 - 1.0 - polyBlep(warped, sampleWidth);
    if (uCarrierShape == 3) {
        float value = cycle < uPwm ? 1.0 : -1.0;
        float cycleWidth = clamp(fwidth(cycles), 1e-5, 0.25);
        value += polyBlep(cycle, cycleWidth);
        value -= polyBlep(fract(cycle - uPwm), cycleWidth);
        return value;
    }
    if (uCarrierShape == 4) {
        return signedNoise(vec2(cycles * uNoiseDetail, scanNormalPositionPx / 96.0 + uSeed * 0.071));
    }
    if (uCarrierShape == 5) {
        return flatSignalSample(uWavetable, cycle * uWavetableLength, vec2(uWavetableLength, 1.0), uWavetableLength);
    }
    if (uCarrierShape == 6) {
        float timeSample = uAudioFrameIndex / PREVIEW_FRAME_RATE * uAudioSampleRate;
        float spatialSample = cycles * 100.0 / max(abs(uFrequency), 0.05);
        return flatSignalSample(uAudioSignal, timeSample + spatialSample, uAudioTextureSize, uAudioSampleCount);
    }
    return sin(phase);
}

float lineFromPhase(float phase) {
    // Shortest angular distance to a 2π phase line, converted to screen pixels.
    float angularDistance = abs(atan(sin(phase), cos(phase)));
    float phasePerPixel = max(length(vec2(dFdx(phase), dFdy(phase))), 1e-4);
    float distancePx = angularDistance / phasePerPixel;
    float halfWidth = uLineWidth * 0.5;
    float aa = max(uLineSoftness, 0.5 * fwidth(distancePx));
    return 1.0 - smoothstep(halfWidth, halfWidth + aa, distancePx);
}

void main() {
    vec4 inputData = texture(uPreprocessed, vUv);
    vec4 modulationData = texture(uModulation, vUv);

    float angle = radians(uScanAngle);
    vec2 scanDirection = normalize(vec2(cos(angle), sin(angle)));
    vec2 scanNormal = vec2(-scanDirection.y, scanDirection.x);
    vec2 pixelPositionCentered = gl_FragCoord.xy - 0.5 * uResolution;
    float time = uFrameIndex / PREVIEW_FRAME_RATE;
    float amount = clamp(uInstability, 0.0, 1.0);
    vec2 seedOffset = vec2(uSeed * 0.754877666, uSeed * 0.569840296);
    float driftClock = time * max(uDriftRate, 0.001);
    vec2 driftOffset = vec2(
        signedNoise(vec2(driftClock, 41.73) + seedOffset) * uHorizontalDrift,
        signedNoise(vec2(driftClock, 83.19) + seedOffset) * uVerticalDrift
    ) * amount;
    vec2 signalPositionCentered = pixelPositionCentered - driftOffset;
    float scanPositionPx = dot(signalPositionCentered, scanDirection);
    float scanNormalPositionPx = dot(signalPositionCentered, scanNormal);

    float dropoutAngle = radians(uDropoutAngle);
    vec2 dropoutDirection = normalize(vec2(cos(dropoutAngle), sin(dropoutAngle)));
    vec2 dropoutNormal = vec2(-dropoutDirection.y, dropoutDirection.x);
    float dropoutPositionPx = dot(signalPositionCentered, dropoutNormal);
    float dropoutBand = floor(dropoutPositionPx / DROPOUT_BAND_PX);
    float dropoutTimeCell = floor(time * DROPOUT_RATE_HZ);
    float dropoutRandom = hash21(vec2(dropoutBand, dropoutTimeCell) + seedOffset + vec2(17.0, 53.0));
    float dropoutEvent = step(1.0 - clamp(uDropout, 0.0, 1.0) * 0.45, dropoutRandom);
    float carrierAvailable = 1.0 - dropoutEvent;
    vec2 previousState = texture(uFeedbackState, vUv).rg;
    float feedbackAngle = TAU * uFeedbackPhase;
    float previousSignal = dot(previousState, vec2(cos(feedbackAngle), sin(feedbackAngle)));
    float driftNoise = signedNoise(vec2(driftClock, 19.37) + seedOffset);
    float effectiveFrequency = uFrequency + driftNoise * uFrequencyDrift * amount;

    float lineIndex = floor(scanNormalPositionPx / max(uLineJitterScale, 1.0));
    float lineNoise = signedNoise(vec2(lineIndex, time * uLineJitterSpeed) + seedOffset);

    // A tear is a discontinuity in the scan coordinate, not a displaced image overlay.
    float tearBand = floor(scanNormalPositionPx / TEAR_BAND_PX);
    float tearTimeCell = floor(time * TEAR_RATE_HZ);
    float tearRandom = hash21(vec2(tearBand, tearTimeCell) + seedOffset + vec2(71.0, 13.0));
    float tearProbability = clamp(uLineTear / 120.0, 0.0, 1.0) * 0.35;
    float tearEvent = step(1.0 - tearProbability, tearRandom);
    float tearDirection = hash21(vec2(tearBand + 31.0, tearTimeCell) + seedOffset) * 2.0 - 1.0;
    float tearOffsetPx = tearEvent * tearDirection * uLineTear;
    float jitteredScanPositionPx = scanPositionPx
                                + lineNoise * uLineJitter * amount
                                + tearOffsetPx;

    float phaseNoise = signedNoise(vec2(
        scanPositionPx / 84.0 + time * 1.1,
        scanNormalPositionPx / 36.0 - time * 0.65
    ) + seedOffset);
    float broadbandNoise = signedNoise(
        signalPositionCentered / 3.5 + vec2(time * 17.0, -time * 11.0) + seedOffset * 31.0
    );
    float phaseJitter = TAU * (phaseNoise * uPhaseJitter + broadbandNoise * uSignalNoise) * amount;

    // Frequency is cycles per 100 screen pixels. PM depth is measured in turns.
    float carrierPhase = TAU * (effectiveFrequency * jitteredScanPositionPx / 100.0 + uCarrierPhase);
    float dryNormalizedModulation = modulationData.b - 0.5;
    float wetNormalizedModulation = dryNormalizedModulation;
    if (uFeedbackInjection == 1) wetNormalizedModulation += previousSignal * uFeedbackAmount;
    if (uDropoutStage == 0) {
        dryNormalizedModulation *= carrierAvailable;
        wetNormalizedModulation *= carrierAvailable;
    }
    float dryPmPhase = carrierPhase + TAU * uPhaseDepth * dryNormalizedModulation * uModulationGain + phaseJitter;
    float wetPmPhase = carrierPhase + TAU * uPhaseDepth * wetNormalizedModulation * uModulationGain + phaseJitter;

    vec2 fmPixel = vec2(jitteredScanPositionPx, scanNormalPositionPx) + 0.5 * uFmResolution;
    ivec2 fmCoord = clamp(ivec2(floor(fmPixel)), ivec2(0), ivec2(uFmResolution) - 1);
    vec2 integratedModulation = texelFetch(uFmIntegral, fmCoord, 0).rg;
    float dryFmPhase = carrierPhase
                     + TAU * uFrequencyDeviation * uModulationGain * integratedModulation.r / 100.0
                     + phaseJitter;
    float wetFmPhase = carrierPhase
                     + TAU * uFrequencyDeviation * uModulationGain * integratedModulation.g / 100.0
                     + phaseJitter;
    float drySourcePhase = uMode == 0 ? dryPmPhase : dryFmPhase;
    float wetSourcePhase = uMode == 0 ? wetPmPhase : wetFmPhase;
    float phaseFeedback = uFeedbackInjection == 0 ? TAU * previousSignal * uFeedbackAmount : 0.0;
    float modulatedPhase = wetSourcePhase + phaseFeedback;
    float dryRaw = carrierWave(drySourcePhase, scanNormalPositionPx) * 0.5 + 0.5;

    float unstableCarrierPhase = carrierPhase + phaseJitter;
    float rawPm = carrierWave(modulatedPhase, scanNormalPositionPx) * 0.5 + 0.5;
    float dryQuadrature = carrierWave(drySourcePhase + TAU * 0.25, scanNormalPositionPx);
    float wetQuadrature = carrierWave(modulatedPhase + TAU * 0.25, scanNormalPositionPx);

    vec3 result = vec3(0.0);
    if (uViewMode <= 1) {
        bool renderRaw = uSignalRender != 0 || uViewMode == 1;
        if (uColorMode == 2) {
            float rgbOffset = TAU * uRgbPhaseOffset;
            if (renderRaw) {
                result = vec3(
                    carrierWave(modulatedPhase + rgbOffset, scanNormalPositionPx) * 0.5 + 0.5,
                    rawPm,
                    carrierWave(modulatedPhase - rgbOffset, scanNormalPositionPx) * 0.5 + 0.5
                );
            } else {
                float pmLine = lineFromPhase(modulatedPhase);
                result = vec3(
                    lineFromPhase(modulatedPhase + rgbOffset),
                    pmLine,
                    lineFromPhase(modulatedPhase - rgbOffset)
                );
            }
        } else {
            float signalValue = renderRaw ? rawPm : lineFromPhase(modulatedPhase);
            result = vec3(signalValue);
            if (uColorMode == 1) {
                float inputPeak = max(max(inputData.r, inputData.g), inputData.b);
                vec3 inputChroma = inputPeak > 1e-4 ? inputData.rgb / inputPeak : vec3(1.0);
                result *= inputChroma;
            }
        }
    }
    if (uViewMode == 2) result = inputData.rgb;
    if (uViewMode == 3) result = vec3(inputData.a);
    if (uViewMode == 4) result = vec3(modulationData.b);
    if (uViewMode == 5) result = vec3(lineFromPhase(unstableCarrierPhase));
    if (uViewMode == 6) result = vec3(carrierWave(unstableCarrierPhase, scanNormalPositionPx) * 0.5 + 0.5);
    if (uViewMode == 7) result = vec3(fract(modulatedPhase / TAU));
    if (uViewMode == 8) result = vec3(previousSignal * 0.5 + 0.5);
    if (uViewMode == 9) result = vec3(modulationData.g);
    if (uViewMode == 10) result = vec3(modulationData.a);

    // Dropout removes generated carrier energy in scan bands. Diagnostic source,
    // modulation, phase, and feedback-state views remain available for diagnosis.
    bool outputDropout = uDropoutStage == 1 || uDropoutStage == 2;
    bool loopDiagnosticDropout = uDropoutStage == 1 && (uViewMode == 5 || uViewMode == 6);
    if ((outputDropout && uViewMode <= 1) || loopDiagnosticDropout) result *= carrierAvailable;

    if (uViewMode <= 1) {
        result = clamp(result + uBlackLevel, 0.0, 1.0);
        result = clamp((result - 0.5) * uContrast + 0.5, 0.0, 1.0);
        result = pow(result, vec3(1.0 / max(uSignalGamma, 0.05)));
        result = clamp(result * uBrightness, 0.0, 1.0);
    }

    // The second render target carries the waveform and its true quarter-cycle
    // companion. That pair can be phase-rotated later without treating phase as gain.
    vec2 dryFeedbackSource = vec2(dryRaw * 2.0 - 1.0, dryQuadrature);
    vec2 wetFeedbackSource = vec2(rawPm * 2.0 - 1.0, wetQuadrature);
    vec2 selectedHistorySource = uFeedbackModel == 1 ? dryFeedbackSource : wetFeedbackSource;
    feedbackSourceOut = uDropoutStage == 1
        ? selectedHistorySource * carrierAvailable
        : selectedHistorySource;
    fragColor = vec4(result, 1.0);
}
